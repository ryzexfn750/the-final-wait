/**
 * LIVE HYPE local microbenchmark: no Cloudflare traffic, account or API keys.
 * Runs the real Worker class against lightweight mock Durable Object/WebSocket
 * interfaces. It does NOT reproduce network, backpressure, hibernation, billing,
 * edge runtime scheduling, or concurrent browser connections.
 * Run: node tools/benchmark-hype-local.mjs
 */
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {performance} from 'node:perf_hooks';
import assert from 'node:assert/strict';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const filename=resolve(root,'workers/hype-worker/src/index.js');
const workerSource=readFileSync(filename,'utf8')
  .replace(/^import\s+.*?;\s*/m,'')
  .replace('export default {','const entrypoint = {')
  .replace('export class HypeRoom','class HypeRoom');

let socketSerial=0;
class MockSocket {
  constructor(){
    this.id=++socketSerial;
    this.metadata=null;
    this.messages=0;
    this.bytes=0;
    this.closed=false;
    this.last=null;
  }
  send(payload){
    assert.equal(this.closed,false,'Tried to send on closed socket');
    this.messages++;
    this.bytes+=Buffer.byteLength(payload);
    this.last=payload.length<240?payload:null;
  }
  serializeAttachment(value){this.metadata=structuredClone(value)}
  deserializeAttachment(){return this.metadata}
  close(){this.closed=true}
}
class MockPair {
  constructor(){return {0:new MockSocket(),1:new MockSocket()}}
}
class MockResponse {
  constructor(body,{status,webSocket}){
    this.body=body;this.status=status;this.webSocket=webSocket;
  }
}
class MockDurableObject {
  constructor(ctx,env){this.ctx=ctx;this.env=env}
}
const loadWorker=new Function(
  'DurableObject','WebSocketPair','Response','setTimeout',
  workerSource+'\nreturn {HypeRoom,sessionDeadline};'
);
const {HypeRoom,sessionDeadline}=loadWorker(
  MockDurableObject,MockPair,MockResponse,()=>1
);

function mockState(){
  const sockets=[];
  const tags=new Map();
  let nextAlarm=null;
  let writes=0;
  return {
    sockets,
    get alarmWrites(){return writes},
    getWebSockets(tag){return tag?tags.get(tag)||[]:sockets},
    acceptWebSocket(socket,socketTags=[]){
      sockets.push(socket);
      for(const tag of socketTags){
        let set=tags.get(tag);
        if(!set){set=[];tags.set(tag,set)}
        set.push(socket);
      }
    },
    storage:{
      async getAlarm(){return nextAlarm},
      async setAlarm(time){nextAlarm=time;writes++}
    }
  };
}
const validUuid=i=>'00000000-0000-4000-8000-'+i.toString(16).padStart(12,'0');
function mockHandshake(i){
  const values={
    upgrade:'websocket',
    'x-hype-user':validUuid(i),
    'x-hype-nickname':'Fan_'+i,
    'x-hype-zone':'Europe/Rome'
  };
  return {
    url:'https://hype.internal/connect',
    headers:{get:name=>values[name.toLowerCase()]??null}
  };
}
async function scenario(size){
  const ctx=mockState();
  const room=new HypeRoom(ctx,{});
  const before=process.memoryUsage().heapUsed;
  const joinStart=performance.now();
  for(let i=1;i<=size;i++){
    const response=await room.fetch(mockHandshake(i));
    assert.equal(response.status,101,'Failed to connect socket '+i);
  }
  const joinMs=performance.now()-joinStart;
  assert.equal(ctx.sockets.length,size);
  const reaction='{"type":"reaction","emoji":"🔥"}';
  const reactionStart=performance.now();
  for(const socket of ctx.sockets){
    await room.webSocketMessage(socket,reaction);
  }
  const reactionMs=performance.now()-reactionStart;
  assert.equal(room.pending.get('🔥'),size,'Not all reactions counted');
  const fanoutStart=performance.now();
  room.flush();
  const fanoutMs=performance.now()-fanoutStart;
  const totalMessages=ctx.sockets.reduce((sum,s)=>sum+s.messages,0);
  assert.equal(totalMessages,size*2,'Expected welcome + fanout per socket');
  const after=process.memoryUsage().heapUsed;
  return {size,joinMs,reactionMs,fanoutMs,
    totalMessages,alarmWrites:ctx.alarmWrites,
    heapDeltaMb:(after-before)/1048576};
}

console.log('LIVE HYPE local microbenchmark (no network requests)');
console.log('Real Worker algorithm + mocked sockets; Node results are NOT Cloudflare latency.');
console.log('Target users | Join ms | Reactions ms | Broadcast ms | Outgoing | Alarm writes | Heap delta MB');
for(const size of [100,1000,5000]){
  const r=await scenario(size);
  console.log([
    String(r.size).padStart(12),
    r.joinMs.toFixed(1).padStart(7),
    r.reactionMs.toFixed(1).padStart(12),
    r.fanoutMs.toFixed(1).padStart(12),
    String(r.totalMessages).padStart(8),
    String(r.alarmWrites).padStart(12),
    r.heapDeltaMb.toFixed(2).padStart(13)
  ].join(' | '));
}
console.log('All scenarios passed. Still require controlled Cloudflare Preview load testing before public launch.');
