/**
 * 1,000-real-WebSocket local soak test. Requires Node 22.4+ and the loopback
 * Wrangler-only HypeRoom harness. NEVER connects to Cloudflare or Production.
 * Examples:
 * node tools/soak-hype-ws-local.mjs --minutes 20
 * node tools/soak-hype-ws-local.mjs --minutes 35
 */
import {randomBytes} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';
import process from 'node:process';

const URL_BASE='http://127.0.0.1:8787/';
const WS_BASE='ws://127.0.0.1:8787/connect';
const SIZE=1000;
const PARALLEL=16;
const MAX_RSS_MB=600;
const MAX_RETRY_PER_SLOT=6;
const PROBE_MS=60_000;
const PROBE_TIMEOUT_MS=9_000;
const MAX_HANDSHAKE_MS=15_000;
const DURATION_OPTIONS=new Set([20,35]);
const round=n=>Math.round(n*10)/10;
const memMB=()=>round(process.memoryUsage().rss/1048576);
function percentile(items,p){
  if(!items.length)return null;
  const sorted=[...items].sort((a,b)=>a-b);
  return round(sorted[Math.ceil(items.length*p)-1]);
}
const raw=process.argv.slice(2);
if(raw.length!==2||raw[0]!=='--minutes'||!DURATION_OPTIONS.has(Number(raw[1]))){
  console.error('Usage: node tools/soak-hype-ws-local.mjs --minutes 20|35');
  process.exit(2);
}
const minutes=Number(raw[1]);
if(typeof WebSocket!=='function'||Number(process.versions.node.split('.')[0])<22){
  console.error('Node.js 22.4+ with native WebSocket required');
  process.exit(2);
}
const response=await fetch(URL_BASE,{signal:AbortSignal.timeout(4000)}).catch(()=>null);
if(!response||!response.ok||
   !(await response.text()).includes('name="tfw-loadtest-version" content="2"')){
  console.error('Local Wrangler test harness not found on 127.0.0.1:8787. No test started.');
  process.exit(2);
}

const runId=randomBytes(6).toString('hex');
const nickname='QA'+runId;
const socketUrl=WS_BASE+'?run='+runId;
const slots=new Array(SIZE).fill(null);
const queued=new Set();
const waiting=[];
const handshakeTimes=[];
const reconnectTimes=[];
const closeCodes={};
const probes=[];
const samples=[];
const failures=[];
const initialMemory=memMB();
let peakMemory=initialMemory, maxEventLoopLag=0, lastTick=performance.now();
let inFlight=0, reconnectCount=0, totalConnects=0, totalFailures=0;
let stops=false, stopReason=null, currentProbe=null;
const started=performance.now();
const initialCpu=process.cpuUsage();

function recordMessage(id,event){
  if(!currentProbe||!currentProbe.targets.has(id)||currentProbe.received.has(id))return;
  let message;
  try{message=JSON.parse(event.data)}catch{return}
  if(message.type!=='hype'||!Array.isArray(message.latest))return;
  if(!message.latest.some(x=>x.nickname===nickname&&x.emoji===currentProbe.emoji))return;
  currentProbe.received.set(id,performance.now()-currentProbe.sent);
  if(currentProbe.received.size===currentProbe.targets.size)currentProbe.finish();
}
function queueSlot(id,delay=0){
  if(stops||queued.has(id)||slots[id])return;
  queued.add(id);
  setTimeout(()=>{
    if(stops||!queued.has(id))return;
    waiting.push(id);
    pump();
  },delay);
}
function connect(id){
  return new Promise((resolve,reject)=>{
    const begin=performance.now();
    const socket=new WebSocket(socketUrl);
    let done=false;
    const timeout=setTimeout(()=>settle(Error('Handshake timeout')),MAX_HANDSHAKE_MS);
    function settle(error){
      if(done)return;
      done=true;
      clearTimeout(timeout);
      socket.removeEventListener('open',onOpen);
      socket.removeEventListener('error',onError);
      socket.removeEventListener('close',onCloseEarly);
      if(error){
        try{socket.close()}catch{}
        reject(error);
      }else resolve({socket,handshakeMs:performance.now()-begin});
    }
    function onOpen(){settle(null)}
    function onError(){settle(Error('Handshake error'))}
    function onCloseEarly(){settle(Error('Closed before OPEN'))}
    socket.addEventListener('open',onOpen);
    socket.addEventListener('error',onError);
    socket.addEventListener('close',onCloseEarly);
  });
}
const retries=new Array(SIZE).fill(0);
function pump(){
  while(!stops&&inFlight<PARALLEL&&waiting.length){
    const id=waiting.shift();
    queued.delete(id);
    if(slots[id])continue;
    inFlight++;
    connect(id).then(item=>{
      if(stops){
        item.socket.close(1000,'Test stopping');
        return;
      }
      const renewal=totalConnects>=SIZE;
      slots[id]=item.socket;
      totalConnects++;
      if(renewal){reconnectCount++;reconnectTimes.push(item.handshakeMs)}
      else handshakeTimes.push(item.handshakeMs);
      retries[id]=0;
      item.socket.addEventListener('message',event=>recordMessage(id,event));
      item.socket.addEventListener('close',event=>{
        if(slots[id]!==item.socket)return;
        slots[id]=null;
        const code=String(event.code);
        closeCodes[code]=(closeCodes[code]||0)+1;
        if(!stops)queueSlot(id,code==='4001'?200+Math.random()*800:2000+Math.random()*1000);
      });
    }).catch(error=>{
      totalFailures++;
      if(failures.length<20)failures.push({index:id,error:String(error?.message||error)});
      retries[id]++;
      if(retries[id]>=MAX_RETRY_PER_SLOT){
        stopReason='Repeated connection failures, index '+id;
        stops=true;
      }else{
        queueSlot(id,Math.min(10_000,1500*retries[id]));
      }
    }).finally(()=>{
      inFlight--;
      if(!stops)pump();
    });
  }
}
function connectedIds(){
  const ids=[];
  for(let i=0;i<SIZE;i++)if(slots[i]?.readyState===WebSocket.OPEN)ids.push(i);
  return ids;
}
async function probe(){
  if(stops||currentProbe)return;
  const ids=connectedIds();
  if(!ids.length){
    probes.push({atSeconds:round((performance.now()-started)/1000),expected:0,received:0,error:'No connections'});
    return;
  }
  const emoji=probes.length%2===0?'🔥':'🚀';
  const state={
    targets:new Set(ids),received:new Map(),emoji,
    sent:performance.now(),finish:null
  };
  currentProbe=state;
  await new Promise(resolve=>{
    let done=false;
    const timeout=setTimeout(complete,PROBE_TIMEOUT_MS);
    function complete(){
      if(done)return;
      done=true;clearTimeout(timeout);resolve();
    }
    state.finish=complete;
    try{slots[ids[0]].send(JSON.stringify({type:'reaction',emoji}))}
    catch{complete()}
  });
  probes.push({
    atSeconds:round((performance.now()-started)/1000),
    expected:ids.length,
    received:state.received.size,
    broadcastP95ms:percentile([...state.received.values()],.95),
    complete:state.received.size===ids.length
  });
  currentProbe=null;
}
const watchdog=setInterval(()=>{
  const now=performance.now();
  maxEventLoopLag=Math.max(maxEventLoopLag,Math.max(0,now-lastTick-1000));
  lastTick=now;
  peakMemory=Math.max(peakMemory,memMB());
  if(peakMemory>MAX_RSS_MB){
    stopReason='Node RSS over '+MAX_RSS_MB+' MB';
    stops=true;
  }
},1000);
const ticker=setInterval(()=>{
  const snapshot={
    atMinutes:round((performance.now()-started)/60000),
    live:connectedIds().length,
    reconnects:reconnectCount,
    handshakeFailures:totalFailures,
    nodeRssMB:memMB(),
    eventLoopLagMaxMs:round(maxEventLoopLag)
  };
  samples.push(snapshot);
  console.log('SAMPLE '+JSON.stringify(snapshot));
},PROBE_MS);
const probeTimer=setInterval(()=>{void probe()},PROBE_MS);
process.once('SIGINT',()=>{
  stopReason='Interrupted (Ctrl+C)';
  stops=true;
});
process.once('SIGTERM',()=>{
  stopReason='Terminated';
  stops=true;
});
console.log('LOCAL HYPE SOAK TEST — '+SIZE+' WebSockets, Europe/Rome, '+minutes+' min');
console.log('Target 127.0.0.1 only; memory limit '+MAX_RSS_MB+' MB; Ctrl+C stops safely.');
for(let id=0;id<SIZE;id++)queueSlot(id);
while(!stops&&performance.now()-started<minutes*60_000){
  await new Promise(resolve=>setTimeout(resolve,1000));
}
stops=true;
clearInterval(watchdog);clearInterval(ticker);clearInterval(probeTimer);
const finalConnected=connectedIds().length;
for(const socket of slots){
  try{socket?.close(1000,'Local soak complete')}catch{}
}
const cpu=process.cpuUsage(initialCpu);
const report={
  environment:'LOCAL workerd (not Cloudflare), Node native WebSocket',
  room:'Europe/Rome',target:SIZE,minutes,
  elapsedMinutes:round((performance.now()-started)/60000),
  stopReason,
  finalConnected,
  totalConnectionsOpened:totalConnects,
  renewals:reconnectCount,
  totalHandshakeFailures:totalFailures,
  initialHandshakeP95ms:percentile(handshakeTimes,.95),
  renewalHandshakeP95ms:percentile(reconnectTimes,.95),
  closeCodes,
  initialNodeRssMB:initialMemory,
  peakNodeRssMB:peakMemory,
  nodeCpuTimeMs:round((cpu.user+cpu.system)/1000),
  maxEventLoopLagMs:round(maxEventLoopLag),
  probes,
  samples,
  failures
};
await mkdir('reports',{recursive:true});
const output='reports/hype-soak-'+minutes+'min-'+Date.now()+'.json';
await writeFile(output,JSON.stringify(report,null,2)+'\n','utf8');
console.log('FINAL '+JSON.stringify({
  target:report.target,finalConnected,renewals:report.renewals,
  peakNodeRssMB:report.peakNodeRssMB,
  closeCodes:report.closeCodes,
  probes:probes.length,failedProbes:probes.filter(p=>!p.complete).length,
  report:output
},null,2));
if(stopReason||totalFailures>0||probes.some(p=>!p.complete)||finalConnected!==SIZE){
  console.error('CHECK REQUIRED: soak found a disconnect, resource limit or incomplete broadcast.');
  process.exitCode=1;
}else{
  console.log('PASS: all scheduled broadcasts delivered while the soak stayed at target at the end.');
}
