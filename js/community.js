/* LIVE HYPE v2 — private QA identity gate, countdown reactions.
   Protected API routes remain enforced server-side. */
const PUBLIC_COMMUNITY_ENABLED=false;
let communityPreview=false;
try{communityPreview=localStorage.getItem('tfw_community_preview')==='yes'}catch{}
const embedded=new URLSearchParams(location.search).has('tfw_embed');
const active=!embedded&&(PUBLIC_COMMUNITY_ENABLED||communityPreview);
const EMOJIS=['🔥','🚀','🥳','🎉','🌴','🩷','💜'];
if(active)void initCommunity().catch(error=>{
  console.error('Community boot failed',error);
  document.documentElement.classList.add('tfw-auth-pending');
  const status=document.querySelector('#tfwGateStatus');
  if(status)status.textContent='Account service temporarily unavailable. Reload to retry.';
});
async function initCommunity(){
  document.documentElement.classList.add('tfw-auth-pending');
  const gate=document.createElement('section');
  gate.id='tfwCommunityGate';gate.className='tfw-auth-gate';
  gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');
  gate.setAttribute('aria-label','The Final Wait account');
  gate.innerHTML=`
   <div class="tfw-gate-aurora" aria-hidden="true"></div>
   <div class="tfw-gate-card">
    <img class="tfw-gate-logo" src="assets/gta-vi-logo.webp" alt="Grand Theft Auto VI">
    <p class="tfw-gate-kicker">THE FINAL WAIT · COMMUNITY ACCESS</p>
    <h1 id="tfwGateHeading">WELCOME TO LEONIDA.</h1>
    <p class="tfw-gate-lede">Create your account to enter the countdown and join fans in your time zone.</p>
    <p class="tfw-gate-status" id="tfwGateStatus" role="status" aria-live="polite">CHECKING SESSION…</p>
    <div id="tfwGateGuest" hidden>
      <button class="tfw-gate-primary" type="button" id="hypeGoogle">CONTINUE WITH GOOGLE</button>
      <p class="tfw-gate-note">Your email is private. Other fans see only your nickname and reactions.</p>
    </div>
    <form id="tfwGateRegister" hidden>
      <label class="tfw-gate-field" for="hypeNickname">PUBLIC NICKNAME
       <input id="hypeNickname" name="nickname" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}"
        autocomplete="nickname" placeholder="LeonidaFan" required>
      </label>
      <p class="tfw-gate-note">Your nickname cannot be changed after registration.</p>
      <label class="tfw-gate-check"><input id="hypeTerms" type="checkbox" required>
       <span>I accept the <a href="community-terms.html" target="_blank" rel="noopener">Terms & Conditions</a>
       and have read the <a href="community-privacy.html" target="_blank" rel="noopener">Privacy Notice</a>.</span>
      </label>
      <label class="tfw-gate-check"><input id="hypeNewsletter" type="checkbox">
       <span>Optional newsletter: email me launch news and reminders. I can unsubscribe any time.</span>
      </label>
      <div id="hypeTurnstile"></div>
      <button id="hypeSubmit" class="tfw-gate-primary" type="submit">CREATE MY ACCOUNT</button>
      <button id="hypeSignOut" class="tfw-gate-secondary" type="button">USE ANOTHER GOOGLE ACCOUNT</button>
    </form>
    <div class="tfw-gate-bottom">
      <a href="community-privacy.html" target="_blank" rel="noopener">PRIVACY</a>
      <a href="community-terms.html" target="_blank" rel="noopener">TERMS</a>
      <a href="mailto:support@thefinalwait.com">SUPPORT</a>
    </div>
   </div>`;
  document.body.appendChild(gate);
  const $=selector=>gate.querySelector(selector);
  const status=(message,error=false)=>{
    const el=$('#tfwGateStatus');
    el.textContent=message;el.classList.toggle('error',error);
  };
  let settings;
  try{
    const response=await fetch('/api/community/config',{cache:'no-store'});
    if(!response.ok)throw Error('Community configuration unavailable');
    settings=await response.json();
    if(!settings.enabled)throw Error('Community preview is not enabled');
  }catch(error){status(error.message+'. Reload to try again.',true);return}
  const state={user:null,profile:null,ws:null,connecting:false,retry:null,attempt:0,
    cooldown:10000,nextAllowed:0,challengeId:null,challengeToken:'',busy:false,
    connected:false,online:0,hype:0};
  let client=null;
  async function loadAuth(){
    if(client)return client;
    const lib=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    client=lib.createClient(settings.supabaseUrl,settings.supabaseAnonKey,{
      auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}
    });
    return client;
  }
  async function token(){
    const session=(await (await loadAuth()).auth.getSession()).data?.session;
    if(!session?.access_token)throw Error('Session expired, please sign in again');
    return session.access_token;
  }
  async function api(method,path,body){
    const response=await fetch('/api/community/'+path,{
      method,cache:'no-store',
      headers:{'content-type':'application/json',Authorization:'Bearer '+await token()},
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    });
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw Error(data.error||'Community temporarily unavailable');
    return data;
  }
  const zone=()=>{
    try{return localStorage.getItem('tfw_timezone')||
      Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Rome'}
    catch{return 'Europe/Rome'}
  };
  const member=()=>Boolean(state.user&&state.profile?.nickname&&
    state.profile.terms_version===settings.termsVersion);
  const showGate=which=>{
    gate.hidden=false;document.documentElement.classList.add('tfw-auth-pending');
    $('#tfwGateGuest').hidden=which!=='guest';
    $('#tfwGateRegister').hidden=which!=='register';
    $('#tfwGateHeading').textContent=which==='register'?'ONE LAST STEP.':'WELCOME TO LEONIDA.';
    if(which==='register')void ensureTurnstile();
  };
  const hideGate=()=>{
    gate.hidden=true;document.documentElement.classList.remove('tfw-auth-pending');
  };
  async function ensureTurnstile(){
    if(state.challengeId!==null)return;
    try{
      if(!window.turnstile){
        await new Promise((resolve,reject)=>{
          const script=document.createElement('script');
          script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
          script.onload=resolve;script.onerror=()=>reject(Error('Security challenge unavailable'));
          document.head.appendChild(script);
        });
      }
      if(!$('#hypeTurnstile').isConnected)return;
      state.challengeId=window.turnstile.render($('#hypeTurnstile'),{
        sitekey:settings.turnstileSiteKey,theme:'dark',
        callback:token=>{state.challengeToken=token},
        'expired-callback':()=>{state.challengeToken=''}
      });
    }catch(error){status(error.message,true)}
  }
  const hero=document.getElementById('hero');
  let layer=null,rail=null,meter=null,buttons=[],lock=null,fill=null,pct=null;
  if(hero){
    layer=document.createElement('div');
    layer.className='tfw-hype-stage';layer.setAttribute('aria-live','off');
    layer.setAttribute('aria-label','Live countdown reactions');
    hero.appendChild(layer);
    rail=document.createElement('aside');
    rail.className='tfw-hype-rail';
    rail.setAttribute('aria-label','Send live emoji reactions');
    rail.innerHTML=`
     <div id="tfwHypeButtons" role="group" aria-label="Live emojis"></div>
     <div id="tfwHypeLock" aria-live="off">READY</div>`;
    hero.appendChild(rail);
    meter=document.createElement('div');
    meter.className='tfw-hype-intensity';
    meter.innerHTML=`
      <div class="tfw-hype-meter-caption"><span>LIVE HYPE LEVEL</span><b id="tfwHypePct">0%</b></div>
      <div class="tfw-hype-meter" role="meter" aria-label="Live hype intensity"
        aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="tfwHypeFill"></i></div>`;
    hero.appendChild(meter);
    lock=rail.querySelector('#tfwHypeLock');
    fill=meter.querySelector('#tfwHypeFill');
    pct=meter.querySelector('#tfwHypePct');
    for(const emoji of settings.emojis||EMOJIS){
      if(!EMOJIS.includes(emoji))continue;
      const btn=document.createElement('button');
      btn.type='button';btn.className='tfw-hype-emoji';
      btn.textContent=emoji;btn.setAttribute('aria-label','Send '+emoji);
      btn.title='Send '+emoji;btn.addEventListener('click',()=>send(emoji));
      rail.querySelector('#tfwHypeButtons').appendChild(btn);
      buttons.push(btn);
    }
  }
  function updateStatus(){
    if(!rail)return;
    rail.classList.toggle('tfw-hype-disconnected',!state.connected);
  }
  function animate(entries){
    if(!layer||document.hidden)return;
    for(const item of entries.slice(-6)){
      if(!EMOJIS.includes(item.emoji)||typeof item.nickname!=='string'||
         !/^[A-Za-z0-9_]{3,20}$/.test(item.nickname))continue;
      const node=document.createElement('div');node.className='tfw-hype-float';
      node.style.setProperty('--hx',(15+Math.random()*65).toFixed(1)+'%');
      node.style.setProperty('--hy',(25+Math.random()*44).toFixed(1)+'%');
      node.style.setProperty('--drift',(Math.random()*100-50).toFixed(0)+'px');
      const e=document.createElement('span');e.className='tfw-hype-float-emoji';
      e.textContent=item.emoji;
      const name=document.createElement('span');name.className='tfw-hype-float-name';
      name.textContent=item.nickname;node.append(e,name);layer.appendChild(node);
      while(layer.children.length>18)layer.firstElementChild.remove();
      setTimeout(()=>node.remove(),4500);
    }
  }
  function updateHype(counts){
    if(!rail)return;
    const total=Object.values(counts||{}).reduce((s,v)=>s+
      (Number.isFinite(Number(v))?Math.max(0,Math.min(1e5,Number(v))):0),0);
    const target=100*(1-Math.exp(-total/Math.max(3,state.online*.025)));
    state.hype=Math.max(0,Math.min(100,state.hype*.55+target*.45));
    paintHype();
  }
  function paintHype(){
    if(!fill)return;
    fill.style.width=state.hype.toFixed(1)+'%';
    pct.textContent=Math.round(state.hype)+'%';
    meter.querySelector('.tfw-hype-meter').setAttribute('aria-valuenow',String(Math.round(state.hype)));
  }
  function tick(){
    if(!rail)return;
    const remaining=Math.ceil(Math.max(0,state.nextAllowed-Date.now())/1000);
    lock.textContent=remaining?remaining+'s':'✓';
    lock.setAttribute('aria-label',remaining?remaining+' seconds until next reaction':'Ready to react');
    for(const btn of buttons)btn.disabled=!state.connected||remaining>0;
    if(state.hype>.1){state.hype*=.98;paintHype()}
  }
  setInterval(tick,1000);
  function send(emoji){
    if(!state.ws||state.ws.readyState!==WebSocket.OPEN)return;
    if(Date.now()<state.nextAllowed)return;
    state.ws.send(JSON.stringify({type:'reaction',emoji}));
    state.nextAllowed=Date.now()+state.cooldown;tick();
  }
  function closeSocket(){
    clearTimeout(state.retry);state.retry=null;
    if(state.ws){
      const ws=state.ws;state.ws=null;
      ws.onopen=null;ws.onmessage=null;ws.onclose=null;ws.onerror=null;
      try{ws.close(1000,'Session changed')}catch{}
    }
    state.connected=false;state.connecting=false;
    updateStatus();tick();
  }
  async function connectSocket(){
    if(!member()||state.ws||state.connecting)return;
    state.connecting=true;updateStatus();
    const requested=zone();
    try{
      const result=await api('POST','ticket',{zone:requested});
      if(!member()||requested!==zone()){state.connecting=false;return}
      const ws=new WebSocket((location.protocol==='https:'?'wss:':'ws:')+
        '//'+location.host+'/api/community/live?ticket='+encodeURIComponent(result.ticket));
      state.ws=ws;
      ws.onopen=()=>{
        if(state.ws!==ws)return;
        state.connected=true;state.connecting=false;state.attempt=0;updateStatus();tick();
      };
      ws.onmessage=event=>{
        let msg;try{msg=JSON.parse(event.data)}catch{return}
        if(msg.type==='welcome'||msg.type==='hype'){
          state.online=Math.max(0,Number(msg.online)||0);
          if(Number(msg.cooldown)>0)state.cooldown=Number(msg.cooldown);
          updateStatus();
        }
        if(msg.type==='hype'){
          animate(Array.isArray(msg.latest)?msg.latest:[]);
          updateHype(msg.counts);
        }
        if(msg.type==='slow_down'&&Number(msg.wait)>0){
          state.nextAllowed=Math.max(state.nextAllowed,Date.now()+Number(msg.wait)*1000);
          tick();
        }
      };
      ws.onerror=()=>{state.connected=false;updateStatus()};
      ws.onclose=()=>{
        if(state.ws!==ws)return;
        state.ws=null;state.connected=false;state.connecting=false;
        updateStatus();tick();
        if(!member())return;
        const delay=Math.min(20000,1200*2**Math.min(++state.attempt,5));
        state.retry=setTimeout(()=>{void connectSocket()},delay);
      };
    }catch{
      state.connecting=false;state.connected=false;updateStatus();
      if(member())state.retry=setTimeout(()=>{void connectSocket()},15000);
    }
  }
  async function refresh(){
    status('Checking your account…');
    try{
      const auth=await loadAuth();
      const {data:sessionData,error:sessionError}=await auth.auth.getSession();
      if(sessionError)throw sessionError;
      // A first-time anonymous visitor normally has NO Supabase session.
      // getUser() would report AuthSessionMissingError; treat this as
      // the expected login state rather than a service failure.
      if(!sessionData?.session){
        state.user=null;state.profile=null;closeSocket();
        status('Sign in with Google to enter the site.');
        showGate('guest');return;
      }
      const {data,error}=await auth.auth.getUser();
      if(error)throw error;
      state.user=data?.user||null;
      if(!state.user){
        state.profile=null;closeSocket();
        status('Sign in with Google to enter the site.');
        showGate('guest');return;
      }
      const result=await api('GET','profile');
      state.profile=result.profile;
      if(!member()){
        closeSocket();
        $('#hypeNickname').value=state.profile?.nickname||
          state.user?.user_metadata?.preferred_username||'';
        $('#hypeNickname').readOnly=Boolean(state.profile?.nickname);
        $('#hypeTerms').checked=false;
        $('#hypeNewsletter').checked=Boolean(state.profile?.marketing_opt_in);
        status('Choose your permanent nickname and finish registration.');
        showGate('register');return;
      }
      hideGate();status('');
      void connectSocket();
      window.dispatchEvent(new Event('tfw:community-ready'));
    }catch(error){
      closeSocket();showGate('guest');
      status('Account service error: '+error.message,true);
    }
  }
  $('#hypeGoogle').addEventListener('click',async()=>{
    try{
      const auth=await loadAuth();
      const {error}=await auth.auth.signInWithOAuth({
        provider:'google',options:{redirectTo:location.origin+'/'}
      });
      if(error)throw error;
    }catch(error){status('Google sign in failed: '+error.message,true)}
  });
  $('#hypeSignOut').addEventListener('click',async()=>{
    closeSocket();try{await (await loadAuth()).auth.signOut()}catch{}
    state.user=null;state.profile=null;
    status('Sign in with Google to enter the site.');showGate('guest');
  });
  $('#tfwGateRegister').addEventListener('submit',async event=>{
    event.preventDefault();if(state.busy)return;
    state.busy=true;$('#hypeSubmit').disabled=true;
    try{
      if(!state.challengeToken)throw Error('Complete the security check first.');
      const result=await api('POST','profile',{
        nickname:$('#hypeNickname').value.trim(),
        acceptedTerms:$('#hypeTerms').checked,termsVersion:settings.termsVersion,
        newsletter:$('#hypeNewsletter').checked,turnstileToken:state.challengeToken
      });
      state.profile=result.profile;
      if(!member())throw Error('Registration incomplete');
      hideGate();void connectSocket();
      window.dispatchEvent(new Event('tfw:community-ready'));
    }catch(error){status(error.message,true)}
    finally{
      state.busy=false;$('#hypeSubmit').disabled=false;state.challengeToken='';
      if(state.challengeId!==null)window.turnstile?.reset(state.challengeId);
    }
  });
  window.addEventListener('tfw:timezone-change',()=>{
    if(member()){closeSocket();void connectSocket()}
  });
  window.addEventListener('storage',event=>{
    if(event.key==='tfw_timezone'&&member()){closeSocket();void connectSocket()}
    if(event.key?.startsWith('sb-')&&event.key.endsWith('-auth-token'))void refresh();
  });
  window.addEventListener('tfw:community-signout',()=>{
    closeSocket();state.user=null;state.profile=null;
    status('Sign in with Google to enter the site.');showGate('guest');
  });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&member()&&!state.ws)void connectSocket();
  });
  await refresh();
}
