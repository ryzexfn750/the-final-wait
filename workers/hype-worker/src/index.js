import { DurableObject } from 'cloudflare:workers';
const ALLOWED=new Set(['🔥','🚀','💜','🎉','❤️']);
// Reduce requests under heavy load: the free plan has finite daily quotas.
function cooldownFor(count){
  return count>8000?180_000:count>3000?90_000:
    count>1000?40_000:count>250?20_000:10_000;
}
const MAX_PER_USER=2;
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
  fetch(request){
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
    server.serializeAttachment({uid:userId,nick:nickname,zone,last:0});
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
