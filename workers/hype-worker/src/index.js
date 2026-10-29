import { DurableObject } from 'cloudflare:workers';
const ALLOWED=new Set(['🔥','🚀','💜','🎉','❤️']);
const INTERVAL_MS=10_000;
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
    if(!userId||!nickname||!zone||nickname.length>20)return new Response('Unauthorized',{status:401});
    const peers=this.ctx.getWebSockets();
    if(peers.length>=25_000)return new Response('Room busy',{status:503});
    const userConnections=peers.reduce((n,s)=>n+(s.deserializeAttachment()?.uid===userId?1:0),0);
    if(userConnections>=MAX_PER_USER)return new Response('Two tabs maximum',{status:429});
    const [client,server]=Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({uid:userId,nick:nickname,zone,last:0});
    server.send(JSON.stringify({type:'welcome',zone,online:peers.length+1,cooldown:INTERVAL_MS}));
    this.scheduleFlush();
    return new Response(null,{status:101,webSocket:client});
  }
  async webSocketMessage(ws,message){
    if(typeof message!=='string'||message.length>160)return;
    let input;
    try{input=JSON.parse(message)}catch{return}
    if(input?.type==='ping'){ws.send(JSON.stringify({type:'pong'}));return}
    if(input?.type!=='reaction'||!ALLOWED.has(input.emoji))return;
    const session=ws.deserializeAttachment();
    if(!session?.uid)return;
    const now=Date.now();
    const last=Math.max(session.last||0,this.lastByUser.get(session.uid)||0);
    if(now-last<INTERVAL_MS){
      ws.send(JSON.stringify({type:'slow_down',wait:Math.ceil((INTERVAL_MS-(now-last))/1000)}));
      return;
    }
    session.last=now;
    ws.serializeAttachment(session); // Persists per-socket cooldown through hibernation.
    this.lastByUser.set(session.uid,now);
    // Avoid an unbounded per-user cache during large events.
    if(this.lastByUser.size>12_000)this.lastByUser.clear();
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
    const packet=JSON.stringify({type:'hype',counts,latest,online:clients.length,
      at:Date.now()});
    for(const client of clients){
      try{client.send(packet)}catch{}
    }
    this.lastBroadcast=Date.now();
  }
}
