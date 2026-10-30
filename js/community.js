import {nicknameVerdict} from './nickname-policy.js?v=2';
/* LIVE HYPE v2 — private QA identity gate, countdown reactions.
   Protected API routes remain enforced server-side. */
const PUBLIC_COMMUNITY_ENABLED=false;
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
    <img class="tfw-gate-logo" src="assets/gta-vi-logo.webp" alt="Grand Theft Auto VI">
    <p class="tfw-gate-kicker">THE FINAL WAIT</p>
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
    <div class="tfw-gate-bottom">
      
      <a href="community-terms.html">TERMS</a>
      <a href="support.html">SUPPORT</a>
    </div>
   </div>`;
  document.body.appendChild(gate);
  gate.insertAdjacentHTML('beforeend',
    '<div id="tfwGateLegal" class="tfw-gate-legal" role="dialog" aria-modal="true" aria-label="Information" hidden>'+
    '<section class="tfw-gate-legal-panel"><div class="tfw-gate-legal-top">'+
    '<strong id="tfwGateLegalTitle">INFORMATION</strong><button type="button" id="tfwGateLegalClose">BACK TO REGISTRATION</button></div>'+
    '<div id="tfwGateLegalBody" class="tfw-gate-legal-body" tabindex="-1"></div></section></div>');

  const $=selector=>gate.querySelector(selector);
  const status=(message,error=false)=>{
    const el=$('#tfwGateStatus');
    el.textContent=message;el.classList.toggle('error',error);
  };
  const legalPages=new Set(['community-privacy.html','community-terms.html','support.html']);
  const legalModal=$('#tfwGateLegal'),legalBody=$('#tfwGateLegalBody');
  let legalTicket=0,legalOpener=null;
  function closeLegal(){
    const wasOpen=!legalModal.hidden;
    legalTicket++;legalModal.hidden=true;legalBody.replaceChildren();
    if(wasOpen&&legalOpener?.isConnected&&!gate.hidden)legalOpener.focus();
    legalOpener=null;
  }
  async function openLegal(page){
    if(!legalPages.has(page))return;
    const ticket=++legalTicket;
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
      const response=await fetch(page,{cache:'no-store'});
      if(!response.ok)throw Error('The document could not be loaded.');
      const main=new DOMParser().parseFromString(await response.text(),'text/html').querySelector('main');
      if(!main)throw Error('The document is unavailable.');
      main.querySelector('a[href="./"]')?.remove();
      if(page==='community-terms.html')main.querySelector('footer')?.remove();
      main.querySelectorAll('script,style,iframe,form').forEach(node=>node.remove());
      if(ticket===legalTicket)legalBody.replaceChildren(...Array.from(main.childNodes));
    }catch(error){if(ticket===legalTicket)legalBody.textContent=error.message}
  }
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
  // Choose safe visual space in the hero, rather than placing reactions
  // over the clock, copy, controls, final call, or release information.
  const avoidedSelectors=[
    '.hero-title-wrap','#countdown','#finalMinuteCountdown',
    '.phase-pill','.release-hud','.progress-block','.hero-status',
    '.next-scene','.scroll-cue','.tfw-final-call-headline',
    '.finale-release','.release-elapsed-clock','#finaleVisualizerWrap',
    '.tfw-hype-rail','.tfw-hype-intensity'
  ];
  function randomSafePosition(){
    const box=hero.getBoundingClientRect();
    const w=Math.min(112,Math.max(78,box.width*.25));
    const h=93;
    const pad=12;
    const taken=avoidedSelectors.flatMap(s=>[...hero.querySelectorAll(s)])
      .filter(el=>getComputedStyle(el).visibility!=='hidden'&&
        getComputedStyle(el).display!=='none'&&
        Number(getComputedStyle(el).opacity||1)>.08)
      .map(el=>el.getBoundingClientRect());
    for(const node of layer.children)if(node.isConnected)taken.push(node.getBoundingClientRect());
    const collision=(x,y)=>{
      const left=box.left+x-pad,right=box.left+x+w+pad;
      const top=box.top+y-pad,bottom=box.top+y+h+pad;
      return taken.reduce((score,rect)=>{
        const intersection=Math.max(0,Math.min(right,rect.right+pad)-Math.max(left,rect.left-pad))*
          Math.max(0,Math.min(bottom,rect.bottom+pad)-Math.max(top,rect.top-pad));
        return score+intersection;
      },0);
    };
    let best=null,bestScore=Infinity;
    for(let i=0;i<60;i++){
      const x=pad+Math.random()*Math.max(0,box.width-w-pad*2);
      const y=Math.max(100,box.height*.15)+Math.random()*
        Math.max(0,box.height-Math.max(100,box.height*.15)-h-72);
      const score=collision(x,y);
      if(score<bestScore){best={x,y};bestScore=score}
      if(score===0)break;
    }
    return best||{x:20,y:120};
  }
  const emojiMotion={
    '🔥':'flame','🚀':'launch','🥳':'party','🎉':'party',
    '🌴':'sway','🩷':'heartbeat','💜':'heartbeat'
  };
  // Run each reaction through the Web Animations API, independently of
  // legacy stylesheet animation declarations that previously competed.
  // CSS keyframes remain the fallback for engines without Element.animate().
  const REACTION_DURATION=1750;
  const reactionMotionFrames={
    flame:[
      {transform:'translate3d(0,12px,0) rotate(-18deg) scale(.55)',offset:0},
      {transform:'translate3d(0,-12px,0) rotate(16deg) scale(1.34)',offset:.23},
      {transform:'translate3d(0,1px,0) rotate(-14deg) scale(.96)',offset:.48},
      {transform:'translate3d(0,-11px,0) rotate(13deg) scale(1.15)',offset:.74},
      {transform:'translate3d(0,-18px,0) rotate(-7deg) scale(.82)',offset:1}
    ],
    launch:[
      {transform:'translate3d(-25px,29px,0) rotate(-38deg) scale(.4)',offset:0},
      {transform:'translate3d(5px,-9px,0) rotate(17deg) scale(1.35)',offset:.27},
      {transform:'translate3d(-4px,0,0) rotate(-12deg) scale(1)',offset:.53},
      {transform:'translate3d(30px,-32px,0) rotate(30deg) scale(.82)',offset:1}
    ],
    party:[
      {transform:'rotate(-43deg) scale(.4)',offset:0},
      {transform:'rotate(34deg) scale(1.35)',offset:.22},
      {transform:'rotate(-26deg) scale(.91)',offset:.45},
      {transform:'rotate(23deg) scale(1.15)',offset:.71},
      {transform:'rotate(-8deg) scale(.82)',offset:1}
    ],
    sway:[
      {transform:'rotate(-32deg) scale(.5)',offset:0},
      {transform:'rotate(23deg) scale(1.2)',offset:.25},
      {transform:'rotate(-19deg) scale(.97)',offset:.51},
      {transform:'rotate(17deg) scale(1.09)',offset:.76},
      {transform:'rotate(-10deg) scale(.86)',offset:1}
    ],
    heartbeat:[
      {transform:'rotate(-10deg) scale(.5)',offset:0},
      {transform:'rotate(8deg) scale(1.39)',offset:.20},
      {transform:'rotate(0) scale(.91)',offset:.35},
      {transform:'rotate(-8deg) scale(1.28)',offset:.51},
      {transform:'rotate(5deg) scale(.99)',offset:.66},
      {transform:'rotate(0) scale(.82)',offset:1}
    ]
  };
  function animateReaction(node,glyph,kind){
    if(typeof node.animate!=='function'||typeof glyph.animate!=='function')return false;
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return false;
    const drift=node.style.getPropertyValue('--drift')||'0px';
    const frames=[
      {opacity:0,transform:'translate3d(0,38px,0) scale(.45)',offset:0},
      {opacity:1,transform:'translate3d(0,0,0) scale(1.14)',offset:.17},
      {opacity:1,transform:'translate3d(0,-20px,0) scale(1)',offset:.42},
      {opacity:1,transform:'translate3d('+drift+',-49px,0) scale(1)',offset:.78},
      {opacity:0,transform:'translate3d('+drift+',-92px,0) scale(.75)',offset:1}
    ];
    // Disable only the old CSS animations on this particular live node;
    // WAAPI animations retain control of opacity/transform without conflicts.
    node.classList.add('tfw-reaction-waapi');
    try{
      node.animate(frames,{duration:REACTION_DURATION,fill:'both',
        easing:'cubic-bezier(.2,.65,.28,1)'});
      glyph.animate(reactionMotionFrames[kind]||reactionMotionFrames.party,{
        duration:REACTION_DURATION,fill:'both',easing:'ease-in-out'
      });
      return true;
    }catch(error){
      node.classList.remove('tfw-reaction-waapi');
      console.warn('Reaction animation fallback:',error);
      return false;
    }
  }
  function animate(entries){
    if(!layer||document.hidden)return;
    for(const item of entries.slice(-6)){
      if(!EMOJIS.includes(item.emoji)||typeof item.nickname!=='string'||
         !/^[A-Za-z0-9_]{3,20}$/.test(item.nickname))continue;
      const pos=randomSafePosition();
      const node=document.createElement('div');node.className='tfw-hype-float';
      node.style.setProperty('--hx',pos.x.toFixed(1)+'px');
      node.style.setProperty('--hy',pos.y.toFixed(1)+'px');
      node.style.setProperty('--drift',(Math.random()*96-48).toFixed(0)+'px');
      node.style.setProperty('--spin',(Math.random()*22-11).toFixed(0)+'deg');
      const e=document.createElement('span');
      e.className='tfw-hype-float-emoji tfw-emoji-motion-'+emojiMotion[item.emoji];
      e.textContent=item.emoji;
      const name=document.createElement('span');name.className='tfw-hype-float-name';
      name.textContent=item.nickname;
      node.appendChild(e);
      if(!document.documentElement.classList.contains('tfw-streamer-mode'))node.appendChild(name);
      layer.appendChild(node);
      animateReaction(node,e,emojiMotion[item.emoji]);
      while(layer.children.length>14)layer.firstElementChild.remove();
      setTimeout(()=>node.remove(),REACTION_DURATION+60);
    }
  }
  // Local-only QA diagnostic. Never sends a reaction or bypasses server cooldown.
  // Example in the preview's developer console: __tfwPreviewHypeReaction('🥳')
  if(communityPreview){
    window.__tfwPreviewHypeReaction=emoji=>{
      if(!member()||!EMOJIS.includes(emoji)||!layer)return false;
      animate([{emoji,nickname:state.profile.nickname}]);
      return true;
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
        if(msg.type==='hype'){
          animate(Array.isArray(msg.latest)?msg.latest:[]);
          updateHype(msg.counts);
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
        try{
          const {showTicketReveal}=await import('./ticket-reveal.js?v=2');
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
    for(const node of [layer,meter,rail]){
      if(node&&!node.isConnected)hero.appendChild(node);
      if(node?.hidden)node.hidden=false;
    }
    updateStatus();tick();
  };
  window.addEventListener('tfw:seamless-return',()=>{
    restoreHype();requestAnimationFrame(restoreHype);
    if(member()&&!state.ws)void connectSocket();
  });
  window.addEventListener('pageshow',restoreHype);
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
