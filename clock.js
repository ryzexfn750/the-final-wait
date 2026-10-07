(function(){
  'use strict';

  /* ------------------------------------------------------------------
     Independent countdown watchdog. Kept deliberately tiny: app.js is
     the primary clock; this only writes when that clock is unhealthy.
     ------------------------------------------------------------------ */
  const DAY=86400000;
  const waitStart=new Date('2025-11-06T00:00:00+01:00').getTime();
  let timeZone='Europe/Rome';
  try{timeZone=localStorage.getItem('tfw_timezone')||timeZone}catch{}
  let release=zonedTargetToUtc(timeZone);
  let timer=0;
  const byId=id=>document.getElementById(id);
  const pad=(n,len=2)=>String(Math.max(0,n)).padStart(len,'0');

  function partsInZone(date,zone){
    const fmt=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    const out={};
    for(const p of fmt.formatToParts(date)) if(p.type!=='literal') out[p.type]=Number(p.value);
    return out;
  }
  function zonedTargetToUtc(zone){
    const wall=Date.UTC(2026,10,19,0,0,0);
    let guess=wall;
    try{
      for(let i=0;i<4;i++){
        const p=partsInZone(new Date(guess),zone);
        const localAsUtc=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
        guess-=localAsUtc-wall;
      }
      return guess;
    }catch{
      timeZone='Europe/Rome';
      return new Date('2026-11-19T00:00:00+01:00').getTime();
    }
  }
  function setText(id,value){const el=byId(id);if(el&&el.textContent!==value)el.textContent=value}
  function tick(){
    const now=Date.now();
    const appHeartbeat=Number(window.__tfwClockHeartbeat||0);
    const appClockHealthy=appHeartbeat>0 && now-appHeartbeat<250;
    if(!document.hidden && !appClockHealthy){
      const previewValue=Number(window.__tfwPreviewRemainingMs);
      const previewActive=Number.isFinite(previewValue);
      let diff=previewActive?Math.max(0,previewValue):Math.max(0,release-now);
      const total=diff;
      const days=Math.floor(diff/DAY); diff%=DAY;
      const hours=Math.floor(diff/3600000); diff%=3600000;
      const minutes=Math.floor(diff/60000); diff%=60000;
      const seconds=Math.floor(diff/1000);
      const ms=Math.floor(diff%1000);
      setText('days',String(days));
      setText('hours',pad(hours));
      setText('minutes',pad(minutes));
      setText('seconds',pad(seconds));
      setText('milliseconds',pad(ms,3));
      const denominator=Math.max(1,release-waitStart);
      const simulatedNow=previewActive?release-total:now;
      const progress=Math.min(1,Math.max(0,(simulatedNow-waitStart)/denominator));
      setText('progressText',(progress*100).toFixed(8)+'%');
      const fill=byId('progressFill'); if(fill) fill.style.width=(progress*100)+'%';
    }
    timer=setTimeout(tick,appClockHealthy||document.hidden?500:33);
  }
  function restart(zone){
    if(zone) timeZone=zone;
    release=zonedTargetToUtc(timeZone);
    window.__tfwReleaseEpoch=release;
    clearTimeout(timer);
    tick();
  }
  window.addEventListener('tfw:timezone-change',e=>restart(e.detail&&e.detail.zone));
  window.addEventListener('pageshow',()=>restart(timeZone));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)restart(timeZone)});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>restart(timeZone),{once:true});
  else restart(timeZone);
  window.__tfwIndependentClock=true;

  /* ------------------------------------------------------------------
     V20 live runtime: mobile/desktop performance governor, synchronized
     background soundtrack, in-layout milestone moments, and release clock.
     ------------------------------------------------------------------ */
  const RELEASE_CET=Date.parse('2026-11-18T23:00:00Z');
  const SECOND=1000, MINUTE=60000, HOUR=3600000;
  const root=document.documentElement;
  const storage={
    get(k){try{return localStorage.getItem(k)}catch{return null}},
    set(k,v){try{localStorage.setItem(k,v)}catch{}}
  };

  /* Stop only the old procedural pad and the old synthetic milestone hit.
     The finale tick/visualizer AudioContexts remain untouched. */
  (function installAudioContextGate(){
    const patch=name=>{
      const Real=window[name];
      if(!Real||Real.__tfwWrapped)return;
      function WrappedAudioContext(...args){
        const stack=String((new Error()).stack||'');
        if(/startSoundtrack|cardAudioHit/.test(stack)) throw new Error('TFW external soundtrack active');
        return Reflect.construct(Real,args,Real);
      }
      try{Object.setPrototypeOf(WrappedAudioContext,Real)}catch{}
      WrappedAudioContext.prototype=Real.prototype;
      WrappedAudioContext.__tfwWrapped=true;
      WrappedAudioContext.__tfwOriginal=Real;
      try{window[name]=WrappedAudioContext}catch{}
    };
    patch('AudioContext');
    patch('webkitAudioContext');
  })();

  function detectPerformanceTier(){
    const coarse=matchMedia('(pointer:coarse)').matches;
    const narrow=matchMedia('(max-width:900px)').matches;
    const mobile=narrow||(coarse&&innerWidth<1180);
    const memory=Number(navigator.deviceMemory||8);
    const cores=Number(navigator.hardwareConcurrency||8);
    const saveData=Boolean(navigator.connection&&navigator.connection.saveData);
    const lite=mobile||saveData||memory<=4||cores<=4;
    root.classList.toggle('tfw-perf-mobile',mobile);
    root.classList.toggle('tfw-perf-lite',lite);
    root.classList.toggle('tfw-perf-full',!lite);
  }
  detectPerformanceTier();
  let perfResizeTimer=0;
  addEventListener('resize',()=>{clearTimeout(perfResizeTimer);perfResizeTimer=setTimeout(detectPerformanceTier,180)},{passive:true});
  try{navigator.connection&&navigator.connection.addEventListener('change',detectPerformanceTier)}catch{}

  function installVisibilityGovernor(){
    const hero=byId('hero');
    if('IntersectionObserver' in window&&hero){
      new IntersectionObserver(([entry])=>root.classList.toggle('tfw-hero-offscreen',!entry.isIntersecting),{threshold:.02}).observe(hero);
      const io=new IntersectionObserver(entries=>{
        for(const entry of entries) entry.target.classList.toggle('tfw-in-view',entry.isIntersecting);
      },{rootMargin:'150px 0px',threshold:.01});
      document.querySelectorAll('.scene-section,.share-section').forEach(el=>io.observe(el));
    }
    document.addEventListener('visibilitychange',()=>root.classList.toggle('tfw-page-hidden',document.hidden));
    root.classList.toggle('tfw-page-hidden',document.hidden);
  }

  /* ----- synchronized background audio -------------------------------- */
  const BG_SRC='assets/audio/background-live.mp3';
  const BG_VOLUME=.22;
  const BG_DUCK_VOLUME=.095;
  let bgAudio=null;
  let bgMetadataPromise=null;
  let bgWanted=storage.get('tfw_sound')!=='off';
  let bgResyncTimer=0;
  let bgVolumeTarget=BG_VOLUME;
  let bgVolumeRaf=0;
  let currentMilestone=null;
  let milestoneAudio=null;
  let audioGestureArmed=false;

  function normalizeTime(seconds,duration){
    if(!Number.isFinite(duration)||duration<=0)return 0;
    return ((seconds%duration)+duration)%duration;
  }
  function liveAudioPosition(){
    if(!bgAudio||!Number.isFinite(bgAudio.duration)||bgAudio.duration<=0)return 0;
    return normalizeTime((Date.now()-RELEASE_CET)/1000,bgAudio.duration);
  }
  function ensureBackgroundAudio(){
    if(bgAudio)return bgAudio;
    bgAudio=new Audio();
    bgAudio.src=BG_SRC;
    bgAudio.preload='metadata';
    bgAudio.loop=true;
    bgAudio.playsInline=true;
    bgAudio.volume=BG_VOLUME;
    bgMetadataPromise=new Promise(resolve=>{
      if(bgAudio.readyState>=1)resolve();
      else{
        bgAudio.addEventListener('loadedmetadata',resolve,{once:true});
        bgAudio.addEventListener('error',resolve,{once:true});
      }
    });
    return bgAudio;
  }
  function soundButtons(){return [byId('soundButton'),byId('mobileSoundButton')].filter(Boolean)}
  function syncSoundUi(){
    const playing=Boolean(bgAudio&&!bgAudio.paused&&!bgAudio.ended);
    soundButtons().forEach(button=>{
      button.setAttribute('aria-pressed',String(bgWanted));
      const label=button.querySelector('.sound-label');
      if(label)label.textContent=bgWanted?(playing?'SOUND':'SOUND ARMED'):'MUTED';
    });
  }
  function desiredBgVolume(){
    const finale=document.body.classList.contains('final-five-active')&&!document.body.classList.contains('finale-released');
    return currentMilestone||finale?BG_DUCK_VOLUME:BG_VOLUME;
  }
  function setBgVolume(value,duration=240){
    const a=ensureBackgroundAudio();
    const to=Math.max(0,Math.min(1,value));
    if(Math.abs(bgVolumeTarget-to)<.001&&Math.abs(a.volume-to)<.008)return;
    bgVolumeTarget=to;
    if(bgVolumeRaf)cancelAnimationFrame(bgVolumeRaf);
    const from=Number(a.volume||0);
    if(!duration||Math.abs(from-to)<.004){a.volume=to;bgVolumeRaf=0;return}
    const start=performance.now();
    const step=now=>{
      const p=Math.min(1,(now-start)/duration);
      a.volume=from+(to-from)*(1-Math.pow(1-p,3));
      if(p<1)bgVolumeRaf=requestAnimationFrame(step);else bgVolumeRaf=0;
    };
    bgVolumeRaf=requestAnimationFrame(step);
  }
  async function playBackground({hardSync=true}={}){
    if(!bgWanted)return false;
    const a=ensureBackgroundAudio();
    try{await bgMetadataPromise}catch{}
    if(hardSync&&Number.isFinite(a.duration)&&a.duration>0){
      const target=liveAudioPosition();
      try{if(Math.abs(a.currentTime-target)>.18)a.currentTime=target}catch{}
    }
    setBgVolume(desiredBgVolume(),0);
    try{await a.play();audioGestureArmed=false;syncSoundUi();return true}
    catch{audioGestureArmed=true;syncSoundUi();return false}
  }
  function pauseBackground(){
    if(bgAudio&&!bgAudio.paused)bgAudio.pause();
    syncSoundUi();
  }
  function resyncBackground(){
    if(!bgWanted||!bgAudio||bgAudio.paused||!Number.isFinite(bgAudio.duration)||bgAudio.duration<=0)return;
    const target=liveAudioPosition();
    const duration=bgAudio.duration;
    let drift=Math.abs(bgAudio.currentTime-target);
    drift=Math.min(drift,Math.abs(duration-drift));
    if(drift>.55){try{bgAudio.currentTime=target}catch{}}
  }
  function armAudioGesture(){
    const retry=()=>{
      if(bgWanted)playBackground({hardSync:true});
      setTimeout(syncSoundUi,40);
    };
    ['pointerdown','touchstart','keydown'].forEach(type=>addEventListener(type,retry,{capture:true,passive:true}));
  }
  armAudioGesture();
  bgResyncTimer=setInterval(()=>{if(!document.hidden)resyncBackground()},15000);

  /* Prevent the old finale tracks from jumping back to a fixed timestamp
     when sound is re-enabled after release. */
  addEventListener('tfw:finale-audio-enable',event=>{
    if(document.body.classList.contains('finale-released')||Date.now()>=RELEASE_CET) event.stopImmediatePropagation();
  },true);

  addEventListener('tfw:sound-change',event=>{
    const enabled=Boolean(event.detail&&event.detail.enabled);
    bgWanted=enabled;
    storage.set('tfw_sound',enabled?'on':'off');
    if(enabled) playBackground({hardSync:true});
    else{
      pauseBackground();
      if(milestoneAudio){try{milestoneAudio.pause()}catch{}}
    }
    setTimeout(syncSoundUi,0);
  });
  addEventListener('pageshow',()=>{if(bgWanted)playBackground({hardSync:true})});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&bgWanted)playBackground({hardSync:true});
  });

  /* ----- synchronized in-layout milestones ----------------------------- */
  const MILESTONE_WINDOW=10000;
  const milestones=[
    {id:'month',at:31*DAY,kicker:'ONE MONTH',title:'THE FINAL MONTH BEGINS',accent:'FINAL MONTH',sfx:'1-month.mp3'},
    {id:'two-weeks',at:14*DAY,kicker:'TWO WEEKS',title:'LEONIDA IS GETTING CLOSE',accent:'14 DAYS',sfx:'2-weeks.mp3'},
    {id:'week',at:7*DAY,kicker:'ONE WEEK',title:'THE FINAL WEEK',accent:'7 DAYS',sfx:'1-week.mp3'},
    {id:'day',at:DAY,kicker:'24 HOURS',title:'TOMORROW, THE WAIT ENDS',accent:'FINAL DAY',sfx:'24-hours.mp3'},
    {id:'12h',at:12*HOUR,kicker:'12 HOURS',title:'HALFWAY THROUGH THE FINAL DAY',accent:'12:00:00',sfx:'12-hours.mp3'},
    {id:'6h',at:6*HOUR,kicker:'6 HOURS',title:'THE WAIT IS ALMOST OVER',accent:'06:00:00',sfx:'6-hours.mp3'},
    {id:'hour',at:HOUR,kicker:'ONE HOUR',title:'THE FINAL HOUR',accent:'60 MINUTES',sfx:'1-hour.mp3'},
    {id:'30m',at:30*MINUTE,kicker:'30 MINUTES',title:'NO MORE YEARS. NO MORE MONTHS.',accent:'00:30:00',sfx:'30-minutes.mp3'},
    {id:'15m',at:15*MINUTE,kicker:'15 MINUTES',title:'THE LAST QUARTER HOUR',accent:'00:15:00',sfx:'15-minutes.mp3'}
  ];
  let liveTitleBase='ROAD TO LEONIDA';
  let lastMilestoneCheck=0;

  function ensureMilestoneTag(){
    let tag=byId('tfwLiveMilestoneTag');
    const titleWrap=document.querySelector('.hero-title-wrap');
    if(!tag&&titleWrap){
      tag=document.createElement('div');
      tag.id='tfwLiveMilestoneTag';
      tag.className='tfw-live-milestone-tag';
      tag.innerHTML='<span></span><strong></strong>';
      titleWrap.insertAdjacentElement('afterend',tag);
    }
    return tag;
  }
  function findMilestone(remaining){
    return milestones.find(m=>remaining<=m.at&&remaining>m.at-MILESTONE_WINDOW)||null;
  }
  async function playMilestoneSfx(m,elapsedMs){
    if(!bgWanted||!m)return;
    if(milestoneAudio){try{milestoneAudio.pause()}catch{}}
    const audio=new Audio(`assets/audio/milestones/${m.sfx}`);
    milestoneAudio=audio;
    audio.preload='auto';audio.playsInline=true;audio.volume=.98;
    const seekAndPlay=()=>{
      if(milestoneAudio!==audio||!bgWanted)return;
      const duration=Number(audio.duration||0);
      const offset=Math.max(0,elapsedMs/1000);
      if(duration>0&&offset>=duration-.03)return;
      try{audio.currentTime=duration>0?Math.min(offset,Math.max(0,duration-.04)):offset}catch{}
      audio.play().catch(()=>{});
    };
    if(audio.readyState>=1)seekAndPlay();
    else audio.addEventListener('loadedmetadata',seekAndPlay,{once:true});
  }
  function activateMilestone(m,remaining){
    if(currentMilestone&&currentMilestone.id===m.id)return;
    deactivateMilestone(false);
    currentMilestone=m;
    const title=byId('heroTitle');
    if(title){liveTitleBase=title.textContent||'ROAD TO LEONIDA';title.textContent=m.title}
    const tag=ensureMilestoneTag();
    if(tag){tag.querySelector('span').textContent=m.kicker;tag.querySelector('strong').textContent=m.accent}
    document.body.classList.add('tfw-milestone-live');
    document.body.dataset.tfwMilestone=m.id;
    setBgVolume(BG_DUCK_VOLUME,280);
    playMilestoneSfx(m,m.at-remaining);
  }
  function deactivateMilestone(restoreTitle=true){
    if(!currentMilestone)return;
    if(milestoneAudio){try{milestoneAudio.pause()}catch{};milestoneAudio=null}
    currentMilestone=null;
    document.body.classList.remove('tfw-milestone-live');
    delete document.body.dataset.tfwMilestone;
    const tag=byId('tfwLiveMilestoneTag'); if(tag)tag.classList.remove('active');
    if(restoreTitle){
      const title=byId('heroTitle');
      if(title&&!document.body.classList.contains('final-five-active')&&!document.body.classList.contains('finale-released')) title.textContent='ROAD TO LEONIDA';
    }
    setBgVolume(desiredBgVolume(),360);
  }
  function updateLiveMilestone(remaining){
    if(!Number.isFinite(remaining)||remaining<=0||remaining<=5*MINUTE){deactivateMilestone();return}
    const m=findMilestone(remaining);
    if(m){
      activateMilestone(m,remaining);
      if(m.id==='6h')normalizeLegacyCopy();
      const tag=ensureMilestoneTag();if(tag)tag.classList.add('active');
    }else deactivateMilestone();
  }
  addEventListener('tfw:countdown',event=>{
    const now=performance.now();
    if(now-lastMilestoneCheck<80)return;
    lastMilestoneCheck=now;
    const remaining=Number(event.detail&&event.detail.remaining);
    updateLiveMilestone(remaining);
    if(remaining<=5*MINUTE&&remaining>0)setBgVolume(BG_DUCK_VOLUME,300);
    else if(remaining>5*MINUTE&&!currentMilestone)setBgVolume(BG_VOLUME,350);
  });


  function installMilestonePreviewBridge(){
    if(!document.body||!('MutationObserver' in window))return;
    let previewTimeout=0;
    const observer=new MutationObserver(()=>{
      if(!document.body.classList.contains('milestone-playing'))return;
      const label=(byId('milestoneNumber')?.textContent||'').trim();
      const m=milestones.find(item=>item.kicker===label);
      if(!m)return;
      const liveRemaining=Number(window.__tfwLastRemaining);
      if(findMilestone(liveRemaining))return;
      activateMilestone(m,m.at);
      const tag=ensureMilestoneTag();if(tag)tag.classList.add('active');
      clearTimeout(previewTimeout);
      previewTimeout=setTimeout(()=>{
        const remaining=Number(window.__tfwLastRemaining);
        if(currentMilestone?.id===m.id&&!findMilestone(remaining))deactivateMilestone();
      },MILESTONE_WINDOW);
    });
    observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  }

  /* Old milestone window is intentionally suppressed visually; patch the
     legacy six-hour copy too so preview/debug never shows the old wording. */
  function normalizeLegacyCopy(){
    const sub=byId('milestoneSubtitle');
    if(sub&&sub.textContent.trim()==='THE NIGHT IS ALMOST OVER')sub.textContent='THE WAIT IS ALMOST OVER';
  }

  /* ----- post-release live timer --------------------------------------- */
  let releaseUiTimer=0;
  function ensureReleaseUi(){
    const releaseBox=byId('finaleRelease');
    if(!releaseBox)return false;
    const kicker=releaseBox.querySelector('.finale-release-kicker');
    if(kicker&&kicker.textContent!=='THE WAIT IS OVER!')kicker.textContent='THE WAIT IS OVER!';
    const legacy=byId('releaseOverlay');
    if(legacy){const p=legacy.querySelector('p');if(p)p.textContent='THE WAIT IS OVER!'}
    if(!byId('releaseElapsed')){
      const date=releaseBox.querySelector('.finale-release-date');
      const elapsed=document.createElement('div');
      elapsed.id='releaseElapsed';
      elapsed.className='release-elapsed';
      elapsed.innerHTML=`
        <span class="release-elapsed-label">TIME SINCE GTA VI RELEASE</span>
        <div class="release-elapsed-clock" aria-live="off">
          <div><strong data-release-unit="days">0</strong><small>DAYS</small></div><i>:</i>
          <div><strong data-release-unit="hours">00</strong><small>HOURS</small></div><i>:</i>
          <div><strong data-release-unit="minutes">00</strong><small>MINUTES</small></div><i>:</i>
          <div><strong data-release-unit="seconds">00</strong><small>SECONDS</small></div>
        </div>`;
      if(date)releaseBox.insertBefore(elapsed,date);else releaseBox.appendChild(elapsed);
    }
    return true;
  }
  function updateReleaseElapsed(){
    ensureReleaseUi();
    const elapsed=Math.max(0,Date.now()-RELEASE_CET);
    const days=Math.floor(elapsed/DAY);
    const hours=Math.floor((elapsed%DAY)/HOUR);
    const minutes=Math.floor((elapsed%HOUR)/MINUTE);
    const seconds=Math.floor((elapsed%MINUTE)/SECOND);
    const map={days:String(days),hours:pad(hours),minutes:pad(minutes),seconds:pad(seconds)};
    for(const [unit,value] of Object.entries(map)){
      const el=document.querySelector(`[data-release-unit="${unit}"]`);if(el&&el.textContent!==value)el.textContent=value;
    }
    const released=Date.now()>=RELEASE_CET||document.body.classList.contains('finale-released');
    document.body.classList.toggle('tfw-release-clock-live',released);
    if(released&&elapsed>30000)document.body.classList.add('tfw-release-settled');
    if(released&&bgWanted&&!bgAudio?.paused)resyncBackground();
  }

  function bootRuntime(){
    installVisibilityGovernor();
    ensureMilestoneTag();
    installMilestonePreviewBridge();
    ensureReleaseUi();
    normalizeLegacyCopy();
    const releaseLoop=()=>{
      updateReleaseElapsed();
      const released=Date.now()>=RELEASE_CET||document.body.classList.contains('finale-released');
      releaseUiTimer=setTimeout(releaseLoop,released?250:2000);
    };
    releaseLoop();
    // Try autoplay once. If the browser blocks it, the next user gesture resumes at
    // the globally synchronized position instead of starting from 0.
    if(bgWanted)playBackground({hardSync:true});
    setTimeout(syncSoundUi,0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootRuntime,{once:true});
  else bootRuntime();
})();
