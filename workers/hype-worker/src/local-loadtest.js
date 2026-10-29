/**
 * Local-only test harness for the exact production HypeRoom Durable Object.
 * NEVER deploy this file. Only start via wrangler dev --local --ip 127.0.0.1.
 * This bypasses normal auth exclusively within a loopback-only local instance.
 */
import {HypeRoom} from './index.js';
export {HypeRoom};

const HOME = `<!doctype html><html lang="en"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>LOCAL ONLY — LIVE HYPE Same-Room Load Test</title>
<style>
body{font:16px/1.55 system-ui;background:#12131c;color:#f1f1fa;max-width:800px;margin:42px auto;padding:0 24px}
button{background:#ca78e6;border:0;border-radius:10px;padding:12px 18px;color:#151022;cursor:pointer;font-weight:700;margin:6px 6px 6px 0}
button:disabled{opacity:.4;cursor:wait}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#202331;padding:18px;border-radius:10px}
small{color:#afadbd}
</style>
<h1>LIVE HYPE — Local Same-Room Load Test</h1>
<p>Runs the actual HypeRoom Worker on your own computer, not on Cloudflare's deployed infrastructure.</p>
<p>All connections share the <b>Europe/Rome</b> room. Synthetic users are created only inside this locally running process.</p>
<p><button data-n="20">Test 20 sockets</button><button data-n="50">Test 50 sockets</button><button data-n="100">Test 100 sockets</button></p>
<small>Maximum 100 concurrent test sockets. Close this tab or press Ctrl+C in PowerShell to end the local test. This is not a production capacity guarantee.</small>
<pre id="result">Ready.</pre>
<script type="module" src="/client.js"></script></html>`;

const CLIENT = `
const output=document.querySelector('#result');
const buttons=[...document.querySelectorAll('[data-n]')];
let running=false;
const fmt=n=>Number.isFinite(n)?Math.round(n*10)/10:null;
const p95=a=>a.length?fmt([...a].sort((x,y)=>x-y)[Math.ceil(.95*a.length)-1]):null;
const p50=a=>a.length?fmt([...a].sort((x,y)=>x-y)[Math.ceil(.5*a.length)-1]):null;
function openSocket(){
  return new Promise((resolve,reject)=>{
    const t=performance.now();
    const socket=new WebSocket('ws://127.0.0.1:8787/connect');
    let complete=false;
    const timer=setTimeout(()=>end(new Error('Handshake timeout')),8000);
    function end(error){
      if(complete)return;
      complete=true;clearTimeout(timer);
      socket.removeEventListener('open',onOpen);
      socket.removeEventListener('error',onError);
      socket.removeEventListener('close',onClose);
      if(error){try{socket.close()}catch{};reject(error)}
      else resolve({socket,ms:performance.now()-t});
    }
    function onOpen(){end(null)}
    function onError(){end(new Error('WebSocket handshake error'))}
    function onClose(){end(new Error('WebSocket closed before open'))}
    socket.addEventListener('open',onOpen);
    socket.addEventListener('error',onError);
    socket.addEventListener('close',onClose);
  });
}
async function run(n){
  if(running)return;
  running=true;buttons.forEach(b=>b.disabled=true);
  const open=[],errors=[];
  output.textContent='Opening '+n+' WebSockets in tz:Europe/Rome ...';
  const start=performance.now();
  try{
    const results=await Promise.allSettled(Array.from({length:n},()=>openSocket()));
    for(const item of results){
      if(item.status==='fulfilled')open.push(item.value);
      else errors.push(String(item.reason?.message||item.reason));
    }
    if(!open.length)throw Error('All handshakes failed');
    output.textContent='Opened '+open.length+'/'+n+'; sending one emoji to same-room peers...';
    // Install the message listeners only after all handshakes complete.
    const received=new Map();
    const sent=performance.now();
    const complete=await new Promise(resolve=>{
      const timeout=setTimeout(()=>resolve(false),7000);
      for(const {socket} of open){
        socket.addEventListener('message',event=>{
          let message;
          try{message=JSON.parse(event.data)}catch{return}
          if(message.type==='hype' && message.latest?.some(x=>x.emoji==='🔥')){
            received.set(socket,performance.now()-sent);
            if(received.size===open.length){clearTimeout(timeout);resolve(true)}
          }
        });
      }
      open[0].socket.send(JSON.stringify({type:'reaction',emoji:'🔥'}));
    });
    const handshakes=open.map(p=>p.ms);
    const delivery=[...received.values()];
    const report={
      environment:'LOCAL workerd, no Cloudflare requests',
      room:'Europe/Rome',
      targetConnections:n,
      connected:open.length,
      failedHandshakes:errors.length,
      handshakesP50ms:p50(handshakes),
      handshakesP95ms:p95(handshakes),
      recipients:received.size,
      expectedRecipients:open.length,
      fullBroadcast:complete,
      broadcastP50ms:p50(delivery),
      broadcastP95ms:p95(delivery),
      wallSeconds:fmt((performance.now()-start)/1000)
    };
    output.textContent=JSON.stringify(report,null,2)+(errors.length?'\\n'+errors.slice(0,5).join('\\n'):'');
    console.table(report);
  }catch(error){output.textContent='TEST FAILED: '+(error?.message||error)}
  finally{
    for(const item of open){try{item.socket.close(1000,'Local test complete')}catch{}}
    running=false;buttons.forEach(b=>b.disabled=false);
  }
}
for(const button of buttons)button.addEventListener('click',()=>run(Number(button.dataset.n)));
`;

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(!['127.0.0.1','localhost'].includes(url.hostname))
      return new Response('Loopback only',{status:403});
    if(url.pathname==='/')
      return new Response(HOME,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
    if(url.pathname==='/client.js')
      return new Response(CLIENT,{headers:{'content-type':'text/javascript; charset=utf-8','cache-control':'no-store'}});
    if(url.pathname!=='/connect'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')
      return new Response('Not found',{status:404});
    // Browser requests have Origin; native Node WebSocket clients may omit it.
    // Reject cross-origin browser connections, accept non-browser loopback only.
    const origin=request.headers.get('Origin');
    if(origin&&origin!==url.origin)
      return new Response('Origin mismatch',{status:403});
    // Optional per-run marker identifies a benchmark's reactions unambiguously.
    const run=url.searchParams.get('run');
    if(run!==null&&!/^[a-f0-9]{12}$/.test(run))
      return new Response('Invalid local benchmark run',{status:400});
    // Every browser socket gets its own synthetic locally scoped test identity.
    const id=env.HYPE_ROOMS.idFromName('tz:Europe/Rome');
    const stub=env.HYPE_ROOMS.get(id);
    const userId=crypto.randomUUID();
    const upstream=new Request('https://hype.internal/connect',{
      headers:{
        Upgrade:'websocket',
        'X-Hype-User':userId,
        'X-Hype-Nickname':run?'QA'+run:'LoadTest',
        'X-Hype-Zone':'Europe/Rome'
      }
    });
    return stub.fetch(upstream);
  }
};
