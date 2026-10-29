/**
 * Private LIVE HYPE Preview WebSocket smoke/load test.
 * Uses the already authenticated user's Supabase session.
 * 20 or 50 genuine WSS connections, two per room; never bypasses the
 * service's two-sockets-per-account-per-room limit.
 *
 * No admin token, test API endpoint, synthetic accounts, or production changes.
 * Results exclude credentials. Must be run only on the Access-protected
 * community-qa branch URL after the user has signed into LIVE HYPE.
 *
 * IMPORTANT: Because one user is limited to 2 sockets per room, this tests
 * handshake throughput across multiple distinct time zones, not 50 clients
 * broadcasting in ONE room. It is NOT a capacity or billing guarantee.
 */
const QA_HOST='community-qa.the-final-wait.pages.dev';
const ZONES=[
  'Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid',
  'Europe/Amsterdam','Europe/Stockholm','Europe/Warsaw',
  'Europe/Athens','Europe/Helsinki','Europe/Bucharest',
  'Europe/Vienna','Europe/Zurich','Europe/Prague','Europe/Lisbon',
  'Europe/Dublin','Europe/Oslo','Europe/Copenhagen','Europe/Brussels',
  'Europe/Budapest','America/New_York','America/Chicago',
  'America/Denver','America/Los_Angeles','America/Toronto',
  'America/Mexico_City'
];
const CONNECT_TIMEOUT_MS=10_000;
const BROADCAST_TIMEOUT_MS=7_000;
const MAX_CONCURRENT_ROOMS=3;
let running=false;

function percentile(values,p){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  return Number(sorted[Math.ceil(p*sorted.length)-1].toFixed(1));
}
async function requestJSON(path,accessToken,body){
  const response=await fetch(path,{
    method:body===undefined?'GET':'POST',
    cache:'no-store',
    headers:{
      Authorization:'Bearer '+accessToken,
      ...(body===undefined?{}:{'content-type':'application/json'})
    },
    ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  const json=await response.json().catch(()=>({}));
  if(!response.ok)throw Error((json.error||'HTTP '+response.status).slice(0,150));
  return json;
}
async function openSocket(ticket){
  const started=performance.now();
  const url='wss://'+location.host+
    '/api/community/live?ticket='+encodeURIComponent(ticket);
  return new Promise((resolve,reject)=>{
    const socket=new WebSocket(url);
    let finished=false;
    const timeout=setTimeout(()=>finish(Error('WebSocket connection timeout')),CONNECT_TIMEOUT_MS);
    function finish(error){
      if(finished)return;
      finished=true;clearTimeout(timeout);
      socket.removeEventListener('open',onOpen);
      socket.removeEventListener('error',onError);
      socket.removeEventListener('close',onClose);
      if(error){
        try{socket.close()}catch{}
        reject(error);
      }else resolve({socket,connectMs:performance.now()-started});
    }
    function onOpen(){finish(null)}
    function onError(){finish(Error('WebSocket handshake failed'))}
    function onClose(){finish(Error('WebSocket closed before OPEN'))}
    socket.addEventListener('open',onOpen);
    socket.addEventListener('error',onError);
    socket.addEventListener('close',onClose);
  });
}
async function openRoom(zone,accessToken){
  const [ticketA,ticketB]=await Promise.all([
    requestJSON('/api/community/ticket',accessToken,{zone}),
    requestJSON('/api/community/ticket',accessToken,{zone})
  ]);
  const attempts=await Promise.allSettled([
    openSocket(ticketA.ticket),openSocket(ticketB.ticket)
  ]);
  const successful=attempts.filter(x=>x.status==='fulfilled').map(x=>x.value);
  if(successful.length!==2){
    for(const item of successful){try{item.socket.close(1000,'Test cleanup')}catch{}}
    const failure=attempts.find(x=>x.status==='rejected');
    throw Error(failure?.reason?.message||'Could not open both room sockets');
  }
  return {zone,peers:successful};
}
function checkBroadcast(room,nickname){
  const receiver=room.peers[1].socket;
  const sender=room.peers[0].socket;
  return new Promise(resolve=>{
    let finished=false;
    const timeout=setTimeout(()=>finish(false),BROADCAST_TIMEOUT_MS);
    const started=performance.now();
    function finish(ok){
      if(finished)return;
      finished=true;
      clearTimeout(timeout);
      receiver.removeEventListener('message',onMessage);
      resolve(ok?Number((performance.now()-started).toFixed(1)):null);
    }
    function onMessage(event){
      let payload;
      try{payload=JSON.parse(event.data)}catch{return}
      if(payload?.type==='hype'&&Array.isArray(payload.latest)&&
         payload.latest.some(x=>x.nickname===nickname&&x.emoji==='🔥')){
        finish(true);
      }
    }
    receiver.addEventListener('message',onMessage);
    try{
      if(sender.readyState!==WebSocket.OPEN)throw Error('Sender closed early');
      sender.send(JSON.stringify({type:'reaction',emoji:'🔥'}));
    }catch{finish(false)}
  });
}

export async function run({connections=20}={}){
  if(running)throw Error('A load test is already running in this tab');
  if(location.hostname!==QA_HOST)
    throw Error('Refusing to run outside the Access-protected community-qa Preview');
  if(!Number.isInteger(connections)||![20,50].includes(connections))
    throw Error('Only 20 or 50 connections are allowed');
  if(!window.confirm('Start a short, controlled test with '+connections+
     ' real WebSockets (max. 2 per time-zone room)? This uses Cloudflare Free quota.'))
    return {cancelled:true};
  running=true;
  const active=[];
  const failures=[];
  const start=performance.now();
  try{
    const cfg=await fetch('/api/community/config',{cache:'no-store'}).then(r=>r.json());
    if(cfg.enabled!==true)throw Error('Community Preview is not enabled');
    const projectRef=new URL(cfg.supabaseUrl).hostname.split('.')[0];
    const sessionKey='sb-'+projectRef+'-auth-token';
    const session=JSON.parse(localStorage.getItem(sessionKey)||'null');
    // The session is used only for same-origin requests to /api/community;
    // never print, return, persist, or send it to any other destination.
    const accessToken=session?.access_token;
    if(typeof accessToken!=='string'||accessToken.length<20)
      throw Error('Sign in to LIVE HYPE first, then retry. No Supabase session found.');
    if(Number(session.expires_at||0)*1000 < Date.now()+60_000)
      throw Error('Supabase session expired; reopen LIVE HYPE and sign in again.');
    const profile=await requestJSON('/api/community/profile',accessToken);
    if(!profile?.profile?.nickname||profile.profile.terms_version!==cfg.termsVersion)
      throw Error('Complete your LIVE HYPE profile and current terms before testing.');
    const nickname=profile.profile.nickname;
    const zoneList=ZONES.slice(0,connections/2);
    for(const zone of zoneList){
      if(!Intl.DateTimeFormat('en-US',{timeZone:zone}))
        throw Error('Unsupported time zone '+zone);
    }
    let cursor=0;
    console.info('LIVE HYPE: opening '+connections+' real WSS connections across '+
      zoneList.length+' different time-zone rooms (2 per room).');
    async function worker(){
      while(cursor<zoneList.length){
        const zone=zoneList[cursor++];
        try{active.push(await openRoom(zone,accessToken))}
        catch(e){failures.push({zone,reason:String(e.message||e).slice(0,150)})}
      }
    }
    await Promise.all(Array.from(
      {length:Math.min(MAX_CONCURRENT_ROOMS,zoneList.length)},worker));
    const handshakeMs=active.flatMap(room=>room.peers.map(p=>p.connectMs));
    console.info('LIVE HYPE: '+handshakeMs.length+'/'+connections+
      ' sockets OPEN; checking live emoji fan-out...');
    const broadcastMs=(await Promise.all(active.map(r=>checkBroadcast(r,nickname))))
      .filter(ms=>ms!==null);
    const result={
      plannedConnections:connections,
      openedConnections:handshakeMs.length,
      activeRooms:active.length,
      handshakeP50ms:percentile(handshakeMs,.5),
      handshakeP95ms:percentile(handshakeMs,.95),
      broadcastReceivedRooms:broadcastMs.length,
      broadcastP50ms:percentile(broadcastMs,.5),
      broadcastP95ms:percentile(broadcastMs,.95),
      roomFailures:failures.length,
      elapsedSeconds:Number(((performance.now()-start)/1000).toFixed(2))
    };
    console.table(result);
    if(failures.length)console.table(failures);
    console.info('No credentials in this report. Re-test after at least 15 seconds.');
    return result;
  }finally{
    for(const room of active){
      for(const item of room.peers){
        try{item.socket.close(1000,'Load test complete')}catch{}
      }
    }
    running=false;
  }
}
