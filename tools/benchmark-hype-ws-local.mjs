/**
 * Real local WebSocket load testing via Node's native client (Node >=22.4).
 * This script NEVER connects to public or preview Cloudflare infrastructure.
 * It requires local wrangler dev --local --ip 127.0.0.1 --port 8787.
 *
 * Usage: node tools/benchmark-hype-ws-local.mjs --connections 250 --concurrency 16
 *        node tools/benchmark-hype-ws-local.mjs --connections 500 --concurrency 16
 *        node tools/benchmark-hype-ws-local.mjs --connections 1000 --concurrency 16
 */
import {randomBytes} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import process from 'node:process';

const HOST='127.0.0.1';
const PORT=8787;
const HTTP=`http://${HOST}:${PORT}/`;
const WS=`ws://${HOST}:${PORT}/connect`;
const ALLOWED_SIZES=new Set([250,500,1000]);
const ALLOWED_CONCURRENCY=new Set([8,16,32]);
const SOCKET_TIMEOUT_MS=15_000;
const BROADCAST_TIMEOUT_MS=10_000;
const MAX_TOTAL_MS=120_000;
const MAX_CLIENT_RSS_MB=600;

function parseArgs(){
  const args=process.argv.slice(2);
  if(args.includes('--help')||args.includes('-h')){
    console.log('Usage: node tools/benchmark-hype-ws-local.mjs --connections 250|500|1000 --concurrency 8|16|32');
    process.exit(0);
  }
  let connections=250,concurrency=16;
  for(let i=0;i<args.length;i+=2){
    if(i+1>=args.length)throw Error('Missing value after '+args[i]);
    if(!/^\d+$/.test(args[i+1]))throw Error('Expected an integer after '+args[i]);
    const value=Number(args[i+1]);
    if(args[i]==='--connections')connections=value;
    else if(args[i]==='--concurrency')concurrency=value;
    else throw Error('Unknown argument '+args[i]);
  }
  if(!ALLOWED_SIZES.has(connections))throw Error('Connections must be 250, 500 or 1000');
  if(!ALLOWED_CONCURRENCY.has(concurrency))throw Error('Concurrency must be 8, 16 or 32');
  return {connections,concurrency};
}
const round=n=>Math.round(n*10)/10;
function percentile(values,p){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  return round(sorted[Math.max(0,Math.ceil(sorted.length*p)-1)]);
}
const mb=bytes=>round(bytes/1024/1024);

async function requireLocalHarness(){
  let response;
  try{
    response=await fetch(HTTP,{signal:AbortSignal.timeout(4000)});
  }catch{
    throw Error('Local Wrangler not responding at '+HTTP+' — start wrangler dev --local first.');
  }
  const body=await response.text();
  if(response.status!==200||!body.includes('LOCAL ONLY — LIVE HYPE Same-Room Load Test'))
    throw Error('Port 8787 is not running our local-only HypeRoom test harness. Stopping.');
}

function connectSocket(url){
  return new Promise((resolve,reject)=>{
    const start=performance.now();
    let socket;
    try{socket=new WebSocket(url)}catch(e){reject(e);return}
    let settled=false;
    const timeout=setTimeout(()=>end(Error('Handshake timeout')),SOCKET_TIMEOUT_MS);
    function end(error){
      if(settled)return;
      settled=true;clearTimeout(timeout);
      socket.removeEventListener('open',onOpen);
      socket.removeEventListener('error',onError);
      socket.removeEventListener('close',onClose);
      if(error){
        try{socket.close()}catch{}
        reject(error);
      }else resolve({socket,handshakeMs:performance.now()-start});
    }
    function onOpen(){end(null)}
    function onError(){end(Error('WebSocket handshake rejected'))}
    function onClose(){end(Error('WebSocket closed before OPEN'))}
    socket.addEventListener('open',onOpen);
    socket.addEventListener('error',onError);
    socket.addEventListener('close',onClose);
  });
}

async function sendAndMeasure(peers,nickname){
  return new Promise(resolve=>{
    const delivered=new Map();
    let done=false;
    const start=performance.now();
    const handlers=[];
    const timeout=setTimeout(()=>finish(false),BROADCAST_TIMEOUT_MS);
    function finish(allDelivered){
      if(done)return;
      done=true;clearTimeout(timeout);
      for(const [socket,handler] of handlers)socket.removeEventListener('message',handler);
      resolve({
        delivered:delivered.size,
        expected:peers.length,
        broadcastComplete:allDelivered,
        broadcastP50ms:percentile([...delivered.values()],.5),
        broadcastP95ms:percentile([...delivered.values()],.95),
        broadcastMaxMs:delivered.size?round(Math.max(...delivered.values())):null
      });
    }
    for(const {socket} of peers){
      const handler=event=>{
        if(delivered.has(socket))return;
        let payload;
        try{payload=JSON.parse(event.data)}catch{return}
        if(payload?.type!=='hype'||!Array.isArray(payload.latest))return;
        if(!payload.latest.some(item=>item.emoji==='🔥'&&item.nickname===nickname))return;
        delivered.set(socket,performance.now()-start);
        if(delivered.size===peers.length)finish(true);
      };
      handlers.push([socket,handler]);
      socket.addEventListener('message',handler);
    }
    try{
      if(peers[0].socket.readyState!==WebSocket.OPEN)throw Error('Sender disconnected');
      peers[0].socket.send(JSON.stringify({type:'reaction',emoji:'🔥'}));
    }catch{finish(false)}
  });
}

async function main(){
  const [nodeMajor,nodeMinor]=process.versions.node.split('.').map(Number);
  if(nodeMajor<22||(nodeMajor===22&&nodeMinor<4)||typeof WebSocket!=='function')
    throw Error('Node.js 22.4 or newer is required (native WebSocket client).');
  const {connections,concurrency}=parseArgs();
  await requireLocalHarness();
  console.log('LIVE HYPE — SAME ROOM LOCAL WORKER TEST');
  console.log('Target: '+connections+' sockets; max in-flight handshakes: '+concurrency);
  console.log('Network destination: '+HTTP+' (loopback only; no Cloudflare traffic)');
  console.log('Stop with Ctrl+C; never use --remote or the Production Worker.');

  const runId=randomBytes(6).toString('hex');
  const nickname='QA'+runId;
  const url=WS+'?run='+runId;
  const peers=[],failures=[];
  const started=performance.now(),cpuStart=process.cpuUsage();
  const before=process.memoryUsage();
  let peakRss=before.rss;
  let cursor=0,aborted=false;
  const lag=[],sampleStart={last:performance.now()};
  const measure=setInterval(()=>{
    const now=performance.now();
    lag.push(Math.max(0,now-sampleStart.last-250));
    sampleStart.last=now;
    const rss=process.memoryUsage().rss;
    if(rss>peakRss)peakRss=rss;
    if(mb(rss)>MAX_CLIENT_RSS_MB)aborted=true;
    if(now-started>MAX_TOTAL_MS)aborted=true;
  },250);
  try{
    async function ramp(){
      while(!aborted&&cursor<connections){
        const index=cursor++;
        try{
          const peer=await connectSocket(url);
          peers.push(peer);
        }catch(error){
          if(failures.length<12)failures.push({index,reason:String(error?.message||error)});
          aborted=true;
        }
        if(peers.length&&peers.length%100===0)
          console.log('Connected '+peers.length+'/'+connections+' ...');
      }
    }
    await Promise.all(Array.from({length:concurrency},()=>ramp()));
    const rampMs=performance.now()-started;
    const timings=peers.map(x=>x.handshakeMs);
    let broadcast={delivered:0,expected:peers.length,broadcastComplete:false,
      broadcastP50ms:null,broadcastP95ms:null,broadcastMaxMs:null};
    if(!aborted&&peers.length===connections){
      console.log('Opened '+peers.length+' sockets; broadcasting one 🔥 to all in Europe/Rome.');
      broadcast=await sendAndMeasure(peers,nickname);
    }
    const cpu=process.cpuUsage(cpuStart);
    const report={
      environment:'LOCAL workerd + native Node WebSocket client',
      room:'Europe/Rome',
      targetConnections:connections,
      concurrency,
      connected:peers.length,
      failedHandshakes:connections-peers.length,
      connectionRampMs:round(rampMs),
      handshakeP50ms:percentile(timings,.5),
      handshakeP95ms:percentile(timings,.95),
      handshakeMaxMs:timings.length?round(Math.max(...timings)):null,
      ...broadcast,
      clientRssStartMB:mb(before.rss),
      clientRssPeakMB:mb(Math.max(peakRss,process.memoryUsage().rss)),
      clientHeapUsedMB:mb(process.memoryUsage().heapUsed),
      nodeCpuTimeMs:round((cpu.user+cpu.system)/1000),
      clientEventLoopLagP95ms:percentile(lag,.95),
      elapsedSeconds:round((performance.now()-started)/1000),
      failures:failures.slice(0,5)
    };
    console.log(JSON.stringify(report,null,2));
    if(report.failedHandshakes!==0||!report.broadcastComplete||
       report.delivered!==report.expected){
      process.exitCode=1;
      console.error('TEST FAILED — stop here; do not increase the connection count.');
    }else{
      console.log('PASS: all '+connections+' sockets opened and received the same-room emoji.');
    }
  }finally{
    clearInterval(measure);
    for(const {socket} of peers){
      try{socket.close(1000,'Local benchmark finished')}catch{}
    }
    // Free local resources before exiting; no sockets intentionally left running.
  }
}

main().catch(error=>{
  console.error('LOCAL BENCHMARK STOPPED: '+String(error?.message||error));
  process.exitCode=1;
});
