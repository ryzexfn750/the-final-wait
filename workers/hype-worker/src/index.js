import { DurableObject } from 'cloudflare:workers';
const ALLOWED=new Set(['🔥','🚀','💜','🎉','❤️']);
// Reduce requests under heavy load: the free plan has finite daily quotas.
function cooldownFor(count){
  return count>8000?180_000:count>3000?90_000:
    count>1000?40_000:count>250?20_000:10_000;
}
const MAX_PER_USER=2;
// Group connection expirations into 15-minute buckets to avoid one alarm
// per socket. A connection lasts at least 15 and less than 30 minutes.
const MIN_SESSION_MS=15*60_000;
const EXPIRY_BUCKET_MS=15*60_000;
function sessionDeadline(now){
  return Math.ceil((now+MIN_SESSION_MS)/EXPIRY_BUCKET_MS)*EXPIRY_BUCKET_MS;
}
// The worker has no public endpoints. Cloudflare Pages reaches its DO
// only through the HYPE_ROOMS binding after authenticating the visitor.
export default {
  fetch(){return new Response('Not found',{status:404})}
};
export class HypeRoom extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);
    this.pending=new Map();
    this.latest=[];
    this.lastByUser=new Map();
    this.flushTimer=null;
    this.lastBroadcast=0;
  }
  async fetch(request){
    if(new URL(request.url).pathname!=='/connect'||
       (request.headers.get('upgrade')||'').toLowerCase()!=='websocket')
      return new Response('Not found',{status:404});
    const userId=request.headers.get('X-Hype-User');
    const nickname=request.headers.get('X-Hype-Nickname');
    const zone=request.headers.get('X-Hype-Zone');
    if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(userId||'')||
       !/^[A-Za-z0-9_]{3,20}$/.test(nickname||'')||!zone||zone.length>70)
      return new Response('Unauthorized',{status:401});
    const peers=this.ctx.getWebSockets();
    if(peers.length>=25_000)return new Response('Room busy',{status:503});
    // Tagged lookups avoid scanning thousands of unrelated sockets on each join.
    const userConnections=this.ctx.getWebSockets('uid:'+userId).length;
    if(userConnections>=MAX_PER_USER)return new Response('Two tabs maximum',{status:429});
    const [client,server]=Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server,['uid:'+userId]);
    const expiresAt=sessionDeadline(Date.now());
    server.serializeAttachment({uid:userId,nick:nickname,zone,last:0,expiresAt});
    // The single room alarm wakes the hibernated object and closes old sockets.
    // A newly joined socket never replaces an earlier scheduled expiry.
    const alarm=await this.ctx.storage.getAlarm();
    if(alarm===null||alarm>expiresAt)await this.ctx.storage.setAlarm(expiresAt);
    server.send(JSON.stringify({type:'welcome',zone,online:peers.length+1,cooldown:cooldownFor(peers.length+1)}));
    this.scheduleFlush();
    return new Response(null,{status:101,webSocket:client});
  }
  async webSocketMessage(ws,message){
    if(typeof message!=='string'||message.length>160)return;
    let input;
    try{input=JSON.parse(message)}catch{return}
    // No application-level ping reply: native WebSocket control frames are handled by Cloudflare.
    if(input?.type!=='reaction'||!ALLOWED.has(input.emoji))return;
    const session=ws.deserializeAttachment();
    if(!session?.uid)return;
    const now=Date.now();
    // Deleted accounts cannot renew their access token on the next handshake.
    // Expired sockets also cannot send during a delayed alarm.
    if(!Number.isFinite(session.expiresAt)||now>=session.expiresAt){
      ws.close(4001,'Renew session');return;
    }
    const interval=cooldownFor(this.ctx.getWebSockets().length);
    // Recover cooldown shared by two active tabs after Durable Object hibernation.
    const peers=this.ctx.getWebSockets('uid:'+session.uid);
    const latestPeer=Math.max(0,...peers.map(s=>Number(s.deserializeAttachment()?.last)||0));
    const last=Math.max(session.last||0,this.lastByUser.get(session.uid)||0,latestPeer);
    if(now-last<interval){
      ws.send(JSON.stringify({type:'slow_down',wait:Math.ceil((interval-(now-last))/1000),cooldown:interval}));
      return;
    }
    session.last=now;
    ws.serializeAttachment(session); // Persists per-socket cooldown through hibernation.
    // Evict the oldest entry instead of clearing every user's cooldown at once.
    // Connected tabs also preserve timestamps in their WebSocket attachments.
    this.lastByUser.delete(session.uid);
    this.lastByUser.set(session.uid,now);
    if(this.lastByUser.size>12_000)
      this.lastByUser.delete(this.lastByUser.keys().next().value);
    this.pending.set(input.emoji,(this.pending.get(input.emoji)||0)+1);
    this.latest.push({emoji:input.emoji,nickname:session.nick});
    if(this.latest.length>6)this.latest.shift();
    this.scheduleFlush();
  }
  async alarm(){
    const now=Date.now();
    let next=Infinity;
    for(const ws of this.ctx.getWebSockets()){
      const deadline=Number(ws.deserializeAttachment()?.expiresAt)||0;
      if(!Number.isFinite(deadline)||deadline<=now){
        try{ws.close(4001,'Renew session')}catch{}
      }else if(deadline<next)next=deadline;
    }
    if(Number.isFinite(next))await this.ctx.storage.setAlarm(next);
    this.scheduleFlush();
  }
  webSocketClose(){this.scheduleFlush()}
  webSocketError(){this.scheduleFlush()}
  scheduleFlush(){
    if(this.flushTimer)return;
    const connections=this.ctx.getWebSockets().length;
    const delay=connections>8000?5000:connections>3000?3000:1400;
    this.flushTimer=setTimeout(()=>{
      this.flushTimer=null;
      this.flush();
    },delay);
  }
  flush(){
    const clients=this.ctx.getWebSockets();
    const counts=Object.fromEntries(this.pending);
    const latest=this.latest.slice(-6);
    this.pending.clear();this.latest=[];
    const packet=JSON.stringify({type:'hype',counts,latest,online:clients.length,cooldown:cooldownFor(clients.length),
      at:Date.now()});
    for(const client of clients){
      try{client.send(packet)}catch{}
    }
    this.lastBroadcast=Date.now();
  }
}
