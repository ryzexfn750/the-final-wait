import {nicknameVerdict} from './nickname-policy.js?v=2';
import {mountRegistrationSoundControls} from './registration-sound.js?v=1';
/* LIVE HYPE v2 — private QA identity gate, countdown reactions.
   Protected API routes remain enforced server-side. */
// QA branch only: enable registration and Hype across devices.
const PUBLIC_COMMUNITY_ENABLED=true;
let communityPreview=false;
try{communityPreview=localStorage.getItem('tfw_community_preview')==='yes'}catch{}
// Only trust an iframe created by the same-origin navigation host.
// A direct URL ending in ?tfw_embed=1 must never bypass the account gate.
const embedded=(()=>{if(!new URLSearchParams(location.search).has('tfw_embed')||window.self===window.top)return false;try{return window.parent.location.origin===location.origin&&!!window.parent.__tfwSeamlessNavigation}catch{return false}})();
const active=!embedded&&(PUBLIC_COMMUNITY_ENABLED||communityPreview);
const EMOJIS=['🔥','🚀','🥳','🎉','🌴','🩷','💜'];
// Older deployed Workers may still accept only the original four reactions.
const LEGACY_EMOJIS=['🔥','🚀','🎉','💜'];
// Streamer Mode is device-local: suppress nickname rendering on livestreams.
const STREAMER_MODE_KEY='tfw_streamer_mode_v1';
function updateStreamerMode(){
  let enabled=false;
  try{enabled=localStorage.getItem(STREAMER_MODE_KEY)==='on'}catch{}
  document.documentElement.classList.toggle('tfw-streamer-mode',enabled);
}
updateStreamerMode();
window.addEventListener('storage',event=>{
  if(event.key===STREAMER_MODE_KEY)updateStreamerMode();
});
window.addEventListener('tfw:streamer-mode-change',updateStreamerMode);
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
    <div id="tfwGateLanguage" class="language-widget tfw-gate-language-widget" aria-label="Registration language">
      <select class="tfw-lang-native" aria-label="Registration language">
       <option value="en">English</option><option value="fr">Français</option>
       <option value="es">Español</option><option value="de">Deutsch</option>
       <option value="it">Italiano</option><option value="pt">Português</option>
       <option value="ru">Русский</option><option value="pl">Polski</option>
       <option value="ja">日本語</option><option value="tr">Türkçe</option>
       <option value="nl">Nederlands</option><option value="ko">한국어</option>
       <option value="zh-CN">简体中文</option><option value="ar">العربية</option>
      </select>
    </div>
    <img class="tfw-gate-logo" src="assets/gta-vi-logo.webp" alt="Grand Theft Auto VI">
    <p class="tfw-gate-kicker notranslate" translate="no">THE FINAL WAIT</p>
    <h1 id="tfwGateHeading">WELCOME TO LEONIDA.</h1>
    <p class="tfw-gate-lede">Create your account to enter the countdown and join fans in your time zone.</p>
    <p class="tfw-gate-status" id="tfwGateStatus" role="status" aria-live="polite">CHECKING SESSION…</p>
    <div id="tfwGateGuest" hidden>
      <button class="tfw-gate-primary" type="button" id="hypeGoogle">CONTINUE WITH GOOGLE</button>
    </div>
    <form id="tfwGateRegister" hidden novalidate>
      <label class="tfw-gate-field" for="hypeNickname">PUBLIC NICKNAME
       <input id="hypeNickname" name="nickname" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}"
        autocomplete="nickname" placeholder="LeonidaFan" aria-describedby="tfwNicknameError" required>
      </label>
      <p class="tfw-gate-field-error" id="tfwNicknameError" role="alert" hidden></p>
      <p class="tfw-gate-note">Your nickname cannot be changed after registration.</p>
      <label class="tfw-gate-check"><input id="hypeTerms" type="checkbox" required>
       <span>I accept the <a href="community-terms.html" >Terms & Conditions</a>
       and have read the <a href="community-privacy.html" >Privacy Notice</a>.</span>
      </label>
      <label class="tfw-gate-check"><input id="hypeNewsletter" type="checkbox">
       <span>Optional newsletter: email me launch news and reminders. I can unsubscribe any time.</span>
      </label>
      <div id="hypeTurnstile"></div><div id="tfwGateAnalytics" aria-label="Optional analytics cookies"></div>
      <button id="hypeSubmit" class="tfw-gate-primary" type="submit">CREATE MY ACCOUNT</button>
      <button id="hypeSignOut" class="tfw-gate-secondary" type="button">USE ANOTHER GOOGLE ACCOUNT</button>
    </form>
    <div id="tfwGateSound" aria-label="Registration soundtrack controls"></div>
    <div class="tfw-gate-bottom">
      
      <a href="community-terms.html">TERMS</a>
      <a href="support.html">SUPPORT</a>
    </div>
   </div>`;
  document.body.appendChild(gate);
  window.dispatchEvent(new Event('tfw:registration-gate-mounted'));
   gate.appendChild(gate.querySelector('#tfwGateSound'));
  gate.insertAdjacentHTML('beforeend',
    '<div id="tfwGateLegal" class="tfw-gate-legal" role="dialog" aria-modal="true" aria-label="Information" hidden>'+
    '<section class="tfw-gate-legal-panel"><div class="tfw-gate-legal-top">'+
    '<strong id="tfwGateLegalTitle">INFORMATION</strong><button type="button" id="tfwGateLegalClose">BACK TO REGISTRATION</button></div>'+
    '<div id="tfwGateLegalBody" class="tfw-gate-legal-body" tabindex="-1"></div></section></div>');

  const $=selector=>gate.querySelector(selector);
  mountRegistrationSoundControls($('#tfwGateSound'));
  const status=(message,error=false)=>{
    const el=$('#tfwGateStatus');
    el.textContent=message;el.classList.toggle('error',error);
  };
  // Load legal localization on demand; the registration gate may run on pages
  // that do not include the standalone legal-page scripts.
  let legalReady=null;
  const ensureLegalLocalization=()=>legalReady??=(async()=>{
    if(window.__tfwLocalizeLegalMain)return;
    for(const src of ['js/legal-locales.js?v=3','js/legal-localize.js?v=3']){
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.src=src;
        script.onload=resolve;script.onerror=()=>reject(Error('Legal translations unavailable.'));
        document.head.appendChild(script);
      });
    }
  })();
  const legalPages=new Set(['community-privacy.html','community-terms.html','support.html']);
  const legalModal=$('#tfwGateLegal'),legalBody=$('#tfwGateLegalBody');
  let legalTicket=0,legalOpener=null,legalCurrentPage=null;
  function closeLegal(){
    const wasOpen=!legalModal.hidden;
    legalTicket++;legalModal.hidden=true;legalCurrentPage=null;legalBody.replaceChildren();
    if(wasOpen&&legalOpener?.isConnected&&!gate.hidden)legalOpener.focus();
    legalOpener=null;
  }
  async function openLegal(page){
    if(!legalPages.has(page))return;
    const ticket=++legalTicket;
    legalCurrentPage=page;
    legalModal.hidden=false;
    $('#tfwGateLegalTitle').textContent=page==='support.html'?'SUPPORT':
      page==='community-terms.html'?'TERMS & CONDITIONS':'PRIVACY NOTICE';
    legalBody.textContent='LOADING…';
    $('#tfwGateLegalClose').focus();
    if(page==='support.html'){
      legalBody.innerHTML='<section class="tfw-gate-support">'+
        '<span class="tfw-gate-support-kicker">THE FINAL WAIT · HELP CENTER</span>'+
        '<h2>HOW CAN WE HELP?</h2>'+
        '<p>Questions about your account, privacy, or the website? Contact our support team directly.</p>'+
        '<div class="tfw-gate-support-card"><div class="tfw-gate-support-icon" aria-hidden="true">✉</div>'+
        '<div class="tfw-gate-support-contact"><small>OFFICIAL SUPPORT EMAIL</small>'+
        '<strong>support@thefinalwait.com</strong></div></div>'+
        '<button class="tfw-gate-support-copy" type="button" id="tfwGateCopySupport">COPY EMAIL ADDRESS</button>'+
        '<p id="tfwGateSupportFeedback" role="status" aria-live="polite"></p>'+
        '</section>';
      return;
    }
    try{
      await ensureLegalLocalization();
      const response=await fetch(page,{cache:'no-store'});
      if(!response.ok)throw Error('The document could not be loaded.');
      const main=new DOMParser().parseFromString(await response.text(),'text/html').querySelector('main');
      if(!main)throw Error('The document is unavailable.');
      main.querySelector('a[href="./"]')?.remove();
      window.__tfwLocalizeLegalMain?.(main,page==='community-terms.html'?'terms':'privacy',window.__tfwPreferredSiteLanguage?.());
      if(page==='community-terms.html')main.querySelector('footer')?.remove();
      main.querySelectorAll('script,style,iframe,form').forEach(node=>node.remove());
      if(ticket===legalTicket)legalBody.replaceChildren(...Array.from(main.childNodes));
    }catch(error){if(ticket===legalTicket)legalBody.textContent=error.message}
  }
  window.addEventListener('tfw:site-language-changed',()=>{if(!legalModal.hidden&&legalCurrentPage&&legalCurrentPage!=='support.html')void openLegal(legalCurrentPage)});
  $('#tfwGateLegalClose').addEventListener('click',closeLegal);
  gate.addEventListener('keydown',event=>{
    if(legalModal.hidden)return;
    if(event.key==='Escape'){
      event.preventDefault();event.stopPropagation();closeLegal();return;
    }
    if(event.key==='Tab'){
      const controls=[...legalModal.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')]
        .filter(el=>el.getClientRects().length>0);
      if(!controls.length)return;
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
  });
  gate.addEventListener('click',event=>{
    if(event.target.closest('[data-tfw-analytics-preferences]')){
      event.preventDefault();event.stopPropagation();
      const destination=!legalModal.hidden?legalBody:$('#tfwGateAnalytics');
      window.__tfwAnalyticsConsent?.mount(destination);
      window.__tfwAnalyticsConsent?.open();return;
    }
    if(event.target.closest('#tfwGateCopySupport')){
      const output=$('#tfwGateSupportFeedback'),task=navigator.clipboard?.writeText('support@thefinalwait.com');
      if(task)task.then(()=>{if(output)output.textContent='EMAIL COPIED'})
        .catch(()=>{if(output)output.textContent='Select and copy the address above.'});
      else if(output)output.textContent='Select and copy the address above.';
      return;
    }
    const anchor=event.target.closest('a[href]');if(!anchor)return;
    const target=new URL(anchor.href,location.href),page=target.pathname.split('/').pop();
    if(target.origin===location.origin&&legalPages.has(page)){
      event.preventDefault();event.stopPropagation();legalOpener=anchor;void openLegal(page);
    }else if(target.origin===location.origin){
      event.preventDefault();event.stopPropagation();
      if((!page||page==='index.html')&&!legalModal.hidden)closeLegal();
    }else if(target.protocol==='http:'||target.protocol==='https:'){
      anchor.target='_blank';anchor.rel='noopener noreferrer';
    }
  },true);
  window.addEventListener('tfw:analytics-ready',()=>{
    if(!gate.hidden&&!$('#tfwGateRegister').hidden)
      window.__tfwAnalyticsConsent?.mount($('#tfwGateAnalytics'));
  });
  let settings;
  try{
    const response=await fetch('/api/community/config',{cache:'no-store'});
    if(!response.ok)throw Error('Community configuration unavailable');
    settings=await response.json();
    if(!settings.enabled)throw Error('Community preview is not enabled');
  }catch(error){status(error.message+'. Reload to try again.',true);return}
  const state={user:null,profile:null,ws:null,connecting:false,retry:null,attempt:0,
    cooldown:10000,nextAllowed:0,challengeId:null,challengeToken:'',busy:false,
    connected:false,online:0,hype:0,serverEmojis:LEGACY_EMOJIS,
    reactionProtocol:0,pendingReaction:null};
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
    window.__tfwSetAmbientOnly?.('registration',true);
    $('#tfwGateGuest').hidden=which!=='guest';
    $('#tfwGateRegister').hidden=which!=='register';
    $('#tfwGateHeading').textContent=which==='register'?'ONE LAST STEP.':'WELCOME TO LEONIDA.';
    if(which==='register'){
      window.__tfwAnalyticsConsent?.mount($('#tfwGateAnalytics'));
      void ensureTurnstile();
    }else window.__tfwAnalyticsConsent?.mount();
  };
  const hideGate=()=>{
    closeLegal();window.__tfwAnalyticsConsent?.mount();
    gate.hidden=true;document.documentElement.classList.remove('tfw-auth-pending');
    window.__tfwSetAmbientOnly?.('registration',false);
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
  let layer=null,rail=null,meter=null,buttons=[],lock=null,fill=null;
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
      <div class="tfw-hype-meter-caption"><span>HYPE LEVEL</span></div>
      <div class="tfw-hype-meter" role="meter" aria-label="Live hype intensity"
        aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="tfwHypeFill"></i></div>`;
    hero.appendChild(meter);
    lock=rail.querySelector('#tfwHypeLock');
    fill=meter.querySelector('#tfwHypeFill');
    
    for(const emoji of settings.emojis||EMOJIS){
      if(!EMOJIS.includes(emoji))continue;
      const btn=document.createElement('button');
      btn.type='button';btn.className='tfw-hype-emoji';
      btn.dataset.emoji=emoji;
      const glyph=document.createElement('span');
      glyph.className='tfw-hype-emoji-glyph';
      glyph.textContent=emoji;btn.appendChild(glyph);
      btn.setAttribute('aria-label','Send '+emoji);
      btn.title='Send '+emoji;btn.addEventListener('click',()=>send(emoji));
      rail.querySelector('#tfwHypeButtons').appendChild(btn);
      buttons.push(btn);
    }
  }
  function updateStatus(){
    if(!rail)return;
    rail.classList.toggle('tfw-hype-disconnected',!state.connected);
  }
  // Every accepted emoji is queued and displayed. A strict *concurrency*
  // budget protects the countdown, without discarding incoming reactions.
  // Under load the flight becomes ultra-short and several emojis launch per
  // frame, directly into the HYPE meter instead of across the whole screen.
  const REACTION_NORMAL_MS=340;
  const REACTION_BURST_MS=165;
  const MAX_VISIBLE_REACTIONS=26;
  const MAX_REACTIONS_PER_FRAME=5;
  const reactionQueue=[];
  const inFlight=new Set();
  let reactionFrame=0,spawnSequence=0;
  let totalQueued=0,totalDisplayed=0;
  function safeLanePosition(){
    const box=hero.getBoundingClientRect();
    const bar=meter?.getBoundingClientRect();
    const right=bar?.width?bar.right-box.left+4:Math.max(26,box.width*.065);
    const start=bar?.height?bar.top-box.top+bar.height*.23:box.height*.31;
    const range=bar?.height?bar.height*.67:Math.min(220,box.height*.4);
    // Golden-ratio staggering keeps bursts spread along the meter.
    const frac=(spawnSequence*.61803398875)%1;
    return {
      x:Math.max(8,Math.min(right,box.width*.20)),
      y:Math.max(65,Math.min(start+frac*range,box.height-55)),
      distance:Math.min(55,Math.max(28,(bar?.width||44)+8))
    };
  }
  function reactionLayerAvailable(){
    return Boolean(layer?.isConnected&&!document.hidden&&
      !document.documentElement.classList.contains('tfw-auth-pending')&&
      !document.documentElement.classList.contains('tfw-ticket-reveal-open')&&
      !document.body.classList.contains('tfw-route-overlay-open'));
  }
  function spawnReaction(item,burst){
    const pos=safeLanePosition();
    const node=document.createElement('div');
    node.className='tfw-hype-float tfw-hype-float-quiet tfw-hype-float-stream'+
      (burst?' tfw-hype-float-burst':'');
    node.style.setProperty('--hx',pos.x.toFixed(1)+'px');
    node.style.setProperty('--hy',pos.y.toFixed(1)+'px');
    node.style.setProperty('--stream-x',(-pos.distance).toFixed(1)+'px');
    node.style.setProperty('--stream-y',(-44-spawnSequence%4*10)+'px');
    node.style.setProperty('--stream-spin',(spawnSequence%2===0?22:-18)+'deg');
    const duration=burst?REACTION_BURST_MS:REACTION_NORMAL_MS;
    node.style.setProperty('--reaction-duration',duration+'ms');
    const glyph=document.createElement('span');
    glyph.className='tfw-hype-float-emoji';
    glyph.textContent=item.emoji;
    node.appendChild(glyph);
    // Nicknames are shown only for isolated events. Floods remain discreet;
    // Streamer Mode never reveals sender names.
    const finale=document.body.classList.contains('final-five-active')||
      document.body.classList.contains('tfw-final-call-active')||
      document.body.classList.contains('finale-released');
    if(!burst&&!finale&&
      !document.documentElement.classList.contains('tfw-streamer-mode')){
      const name=document.createElement('span');
      name.className='tfw-hype-float-name';
      name.textContent=item.nickname;
      node.appendChild(name);
    }
    layer.appendChild(node);
    inFlight.add(node);
    spawnSequence++;
    totalDisplayed++;
    setTimeout(()=>{
      node.remove();inFlight.delete(node);
      if(reactionQueue.length&&reactionFrame===0&&reactionLayerAvailable())
        reactionFrame=requestAnimationFrame(drainReactions);
    },duration+12);
  }
  function drainReactions(){
    reactionFrame=0;
    if(!reactionLayerAvailable()){
      // Do not show or hold reactions under full-screen dialogs.
      reactionQueue.length=0;
      return;
    }
    const burst=reactionQueue.length>=12;
    const available=Math.max(0,MAX_VISIBLE_REACTIONS-inFlight.size);
    const count=Math.min(reactionQueue.length,MAX_REACTIONS_PER_FRAME,available);
    for(let i=0;i<count;i++)spawnReaction(reactionQueue.shift(),burst);
    if(reactionQueue.length)reactionFrame=requestAnimationFrame(drainReactions);
  }
  function animate(entries){
    if(document.documentElement.classList.contains('tfw-disable-live-reactions'))return;
    if(!reactionLayerAvailable()||!Array.isArray(entries))return;
    for(const item of entries){
      if(!EMOJIS.includes(item?.emoji)||
         typeof item.nickname!=='string'||
         !/^[A-Za-z0-9_]{3,20}$/.test(item.nickname))continue;
      reactionQueue.push({emoji:item.emoji,nickname:item.nickname});
      totalQueued++;
    }
    if(reactionQueue.length&&!reactionFrame)
      reactionFrame=requestAnimationFrame(drainReactions);
  }
  // Console helpers are limited to the private QA preview. They never send
  // WebSocket messages, influence HYPE percentage, or bypass server limits.
  if(communityPreview){
    window.__tfwHypeStats=()=>({
      queued:totalQueued,displayed:totalDisplayed,
      pending:reactionQueue.length,active:inFlight.size
    });
    window.__tfwPreviewHypeReaction=emoji=>{
      if(!EMOJIS.includes(emoji)||!layer?.isConnected)return false;
      animate([{emoji,nickname:state.profile?.nickname||'PreviewFan'}]);
      return true;
    };
    let stressTimer=0;
    window.__tfwStressTestHype=(total=300)=>{
      if(!layer?.isConnected)return 'HYPE layer is not ready.';
      clearInterval(stressTimer);
      const max=Math.min(1500,Math.max(1,Math.floor(Number(total)||300)));
      let sent=0;
      // Send in quick packets as a realistic broadcast would; no packet is
      // collapsed to one reaction. Every emoji enters the visual queue.
      stressTimer=setInterval(()=>{
        const count=Math.min(20,max-sent);
        const packet=Array.from({length:count},(_,i)=>({
          emoji:EMOJIS[(sent+i)%EMOJIS.length],nickname:'LoadTestFan'
        }));
        animate(packet);
        sent+=count;
        if(sent>=max){clearInterval(stressTimer);stressTimer=0}
      },45);
      return 'Queued '+max+' LOCAL emoji events. No network traffic. Check __tfwHypeStats().';
    };
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
    fill.style.height=state.hype.toFixed(1)+'%';
    
    meter.querySelector('.tfw-hype-meter').setAttribute('aria-valuenow',String(Math.round(state.hype)));
  }
  function tick(){
    if(!rail)return;
    const remaining=Math.ceil(Math.max(0,state.nextAllowed-Date.now())/1000);
    lock.textContent=remaining?remaining+'s':'✓';
    lock.setAttribute('aria-label',remaining?remaining+' seconds until next reaction':'Ready to react');
    for(const btn of buttons){
      const supported=state.serverEmojis.includes(btn.dataset.emoji);
      btn.disabled=!state.connected||remaining>0||!!state.pendingReaction||!supported;
      btn.title=supported?'Send '+btn.dataset.emoji:
        'This reaction needs a live server update';
      btn.setAttribute('aria-label',btn.title);
    }
    if(state.hype>.1){state.hype*=.98;paintHype()}
  }
  setInterval(tick,1000);
  function send(emoji){
    if(!state.ws||state.ws.readyState!==WebSocket.OPEN)return;
    if(Date.now()<state.nextAllowed||state.pendingReaction||
       !state.serverEmojis.includes(emoji))return;
    try{
      state.ws.send(JSON.stringify({type:'reaction',emoji}));
      if(state.reactionProtocol>=2){
        state.pendingReaction=emoji;tick();
        setTimeout(()=>{
          if(state.pendingReaction===emoji){state.pendingReaction=null;tick()}
        },4000);
      }else{
        // Legacy protocol has no ack; only its known emojis use cooldown.
        state.nextAllowed=Date.now()+state.cooldown;tick();
      }
    }catch{state.pendingReaction=null;tick()}

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
        if(msg.type==='welcome'){
          state.reactionProtocol=msg.protocol===2?2:0;
          state.serverEmojis=Array.isArray(msg.emojis)?
            msg.emojis.filter(emoji=>EMOJIS.includes(emoji)):LEGACY_EMOJIS;
          tick();
        }
        if(msg.type==='reaction_ack'){
          if(state.pendingReaction===msg.emoji){
            state.pendingReaction=null;
            state.nextAllowed=Date.now()+(Number(msg.cooldown)||state.cooldown);
            tick();
          }
        }
        if(msg.type==='reaction_error'){
          state.pendingReaction=null;tick();
          console.warn('Reaction rejected by the live server:',msg.reason);
        }
        if(msg.type==='welcome'||msg.type==='hype'){
          state.online=Math.max(0,Number(msg.online)||0);
          if(Number(msg.cooldown)>0)state.cooldown=Number(msg.cooldown);
          updateStatus();
        }
        if(msg.type==='hype'||msg.type==='hype_reactions'){
          animate(Array.isArray(msg.latest)?msg.latest:[]);
          if(msg.type==='hype')updateHype(msg.counts);
        }
        if(msg.type==='slow_down'&&Number(msg.wait)>0){
          state.pendingReaction=null;
          state.nextAllowed=Math.max(state.nextAllowed,Date.now()+Number(msg.wait)*1000);
          tick();
        }
      };
      ws.onerror=()=>{state.connected=false;updateStatus()};
      ws.onclose=()=>{
        if(state.ws!==ws)return;
        state.ws=null;state.connected=false;state.connecting=false;
        state.pendingReaction=null;state.serverEmojis=LEGACY_EMOJIS;
        state.reactionProtocol=0;
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
        status('');
        showGate('guest');return;
      }
      const {data,error}=await auth.auth.getUser();
      if(error)throw error;
      state.user=data?.user||null;
      if(!state.user){
        state.profile=null;closeSocket();
        status('');
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
        status('');
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
    status('');showGate('guest');
  });
  const nicknameInput=$('#hypeNickname');
  const nicknameError=$('#tfwNicknameError');
  function clearNicknameError(){
    nicknameError.textContent='';nicknameError.hidden=true;
    nicknameInput.removeAttribute('aria-invalid');
  }
  nicknameInput.addEventListener('input',clearNicknameError);
  $('#tfwGateRegister').addEventListener('submit',async event=>{
    event.preventDefault();if(state.busy)return;
    state.busy=true;$('#hypeSubmit').disabled=true;
    try{
      const nickname=nicknameInput.value;
      const verdict=nicknameVerdict(nickname);
      if(!verdict.ok){
        nicknameError.textContent=verdict.reason==='blocked'?
          'This nickname contains prohibited language. Choose another one.':
          verdict.reason==='reserved'?'This nickname is reserved. Choose another one.':
          'Use 3–20 letters, numbers or underscores. Spaces are not allowed.';
        nicknameError.hidden=false;nicknameInput.setAttribute('aria-invalid','true');
        nicknameInput.focus();
        throw Error('Please correct your nickname above.');
      }
      clearNicknameError();
      if(!$('#hypeTerms').checked)throw Error('Please accept the Terms & Conditions.');
      if(!state.challengeToken)throw Error('Complete the security check first.');
      const firstRegistration=!state.profile?.nickname;
      const result=await api('POST','profile',{
        nickname,
        acceptedTerms:$('#hypeTerms').checked,termsVersion:settings.termsVersion,
        newsletter:$('#hypeNewsletter').checked,turnstileToken:state.challengeToken
      });
      state.profile=result.profile;
      if(!member())throw Error('Registration incomplete');
      // Do not reveal the underlying countdown between registration and the
      // ceremony. Keep the gate up until the dialog has been mounted.
      if(firstRegistration){
        // Account-specific tour runs only after the device reminder choice.
        try{sessionStorage.setItem('tfw_tour_pending_user_v1',String(state.user.id))}catch{}
        try{
          const {showTicketReveal}=await import('./ticket-reveal.js?v=6');
          const ceremony=showTicketReveal(async()=>{
            const issued=await api('GET','boarding-pass');
            return issued.ticket;
          });
          hideGate();void connectSocket();
          void ceremony.catch(error=>console.warn('Ticket welcome unavailable:',error))
            .finally(()=>window.dispatchEvent(new Event('tfw:community-ready')));
        }catch(error){
          hideGate();void connectSocket();
          console.warn('Ticket welcome unavailable:',error);
          window.dispatchEvent(new Event('tfw:community-ready'));
        }
      }else{
        hideGate();void connectSocket();
        window.dispatchEvent(new Event('tfw:community-ready'));
      }
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
    status('');showGate('guest');
  });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&member()&&!state.ws)void connectSocket();
  });
  // The homepage is kept alive beneath seamless pages so audio never resets.
  // Recover the HYPE components after the first profile visit and Back.
  const restoreHype=()=>{
    if(!member()||!hero)return;
     const shell=document.getElementById('tfwSeamlessShell');
     if((!shell||shell.hidden)&&document.body.classList.contains('tfw-route-overlay-open')){
       document.body.classList.remove('tfw-route-overlay-open');
       document.documentElement.classList.remove('tfw-route-overlay-open');
     }
     for(const node of [layer,meter,rail]){
       if(node&&node.parentElement!==hero)hero.appendChild(node);
       if(node?.hidden)node.hidden=false;
       if(node){node.style.removeProperty('display');node.style.removeProperty('visibility')}
     }
    updateStatus();tick();
  };
  window.addEventListener('tfw:seamless-return',()=>{
    restoreHype();requestAnimationFrame(restoreHype);
    if(member()&&!state.ws)void connectSocket();
  });
  window.addEventListener('pageshow',restoreHype);
   window.addEventListener('focus',restoreHype);
   window.addEventListener('tfw:content-ready',restoreHype);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)restoreHype()});
  if(hero&&typeof MutationObserver!=='undefined'){
    let scheduled=false;
    new MutationObserver(()=>{
      if(scheduled||!member())return;
      if([layer,meter,rail].every(node=>node?.isConnected))return;
      scheduled=true;
      requestAnimationFrame(()=>{scheduled=false;restoreHype()});
    }).observe(hero,{childList:true});
  }
  await refresh();
}
