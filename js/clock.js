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
  const releaseEpoch=()=>release;
  const SECOND=1000, MINUTE=60000, HOUR=3600000;
  const root=document.documentElement;
  const storage={
    get(k){try{return localStorage.getItem(k)}catch{return null}},
    set(k,v){try{localStorage.setItem(k,v)}catch{}}
  };

  // Ambient playback is managed here without overriding native AudioContext.
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
  // A new audio-only soundtrack takes priority; retain old audio as fallback.
  const BG_SRC='assets/audio/background-v26.mp3';
  const BG_FALLBACK_SRC='assets/audio/background-live.mp3';
  const BG_CUTOFF=30*MINUTE;
  const BG_FADE_WINDOW=20000; // fade out smoothly during the final 20s before -30:00
  const BG_VOLUME=.22;
  const BG_DUCK_VOLUME=.095;
  let bgAudio=null;
  let bgPlayPromise=null;
  let bgWanted=storage.get('tfw_sound')!=='off';
  let bgResyncTimer=0;
  let bgVolumeTarget=BG_VOLUME;
  let bgVolumeRaf=0;
  let currentMilestone=null;
  let milestoneAudio=null;
  let audioGestureArmed=false;
  let previewStage=null;
  let previewFinalFive=false;
  let previewCardHoldUntil=0;

  function normalizeTime(seconds,duration){
    if(!Number.isFinite(duration)||duration<=0)return 0;
    return ((seconds%duration)+duration)%duration;
  }
  function remainingForAudio(){
    const preview=window.__tfwPreviewRemainingMs;
    return Number.isFinite(preview)?preview:Math.max(0,releaseEpoch()-Date.now());
  }
  function liveAudioPosition(){
    if(!bgAudio||!Number.isFinite(bgAudio.duration)||bgAudio.duration<=0)return 0;
    // The soundtrack is synchronized to its cutoff at -30 minutes.
    return normalizeTime((Date.now()-(releaseEpoch()-BG_CUTOFF))/1000,bgAudio.duration);
  }
  function ensureBackgroundAudio(){
    if(bgAudio)return bgAudio;
    bgAudio=new Audio();
    bgAudio.src=BG_SRC;
    bgAudio.preload='metadata';
    bgAudio.loop=true;
    bgAudio.playsInline=true;
    bgAudio.volume=BG_VOLUME;
    window.__tfwAmbientAudio=bgAudio;
    bgAudio.addEventListener('loadedmetadata',()=>{if(bgWanted&&backgroundAllowed())resyncBackground()});
    bgAudio.addEventListener('play',()=>{
      document.body.classList.add('tfw-ambient-playing');
      dispatchEvent(new CustomEvent('tfw:ambient-play',{detail:{audio:bgAudio}}));
    });
    bgAudio.addEventListener('pause',()=>{
      document.body.classList.remove('tfw-ambient-playing');
      dispatchEvent(new CustomEvent('tfw:ambient-pause'));
    });
    bgAudio.addEventListener('error',()=>{
      if(bgAudio.dataset.fallback==='1')return;
      bgAudio.dataset.fallback='1';
      bgAudio.src=BG_FALLBACK_SRC;
      bgAudio.load();
      if(bgWanted&&backgroundAllowed())setTimeout(()=>{
        audioGestureArmed=false;playBackground({hardSync:true});
      },0);
    });
    return bgAudio;
  }
  function soundButtons(){return [byId('soundButton'),byId('mobileSoundButton')].filter(Boolean)}
  function backgroundAllowed(){
    if(document.body.classList.contains('final-five-active')||document.body.classList.contains('finale-released'))return false;
    return remainingForAudio()>BG_CUTOFF&&!previewFinalFive;
  }
  function syncSoundUi(){
    soundButtons().forEach(button=>{
      button.setAttribute('aria-pressed',String(bgWanted));
      const label=button.querySelector('.sound-label');
      if(label)label.textContent=bgWanted?'SOUND':'MUTED';
    });
  }
  function bgFadeFactor(remaining=remainingForAudio()){
    // From -30:20 to -30:00: cubic ease-in decrease to exactly zero.
    const p=Math.max(0,Math.min(1,(remaining-BG_CUTOFF)/BG_FADE_WINDOW));
    return p*p*(3-2*p);
  }
  function desiredBgVolume(){
    return (currentMilestone?BG_DUCK_VOLUME:BG_VOLUME)*bgFadeFactor();
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
  function playBackground({hardSync=true}={}){
    if(!bgWanted||!backgroundAllowed()){pauseBackground();return Promise.resolve(false)}
    if(audioGestureArmed)return Promise.resolve(false);
    if(bgPlayPromise)return bgPlayPromise;
    const a=ensureBackgroundAudio();
    if(hardSync&&a.readyState>=1&&Number.isFinite(a.duration)&&a.duration>0){
      const target=liveAudioPosition();
      try{if(Math.abs(a.currentTime-target)>.18)a.currentTime=target}catch{}
    }
    setBgVolume(desiredBgVolume(),0);
    // Invoke play synchronously during the interaction; never await metadata first.
    let started;
    try{started=a.play()}catch(error){started=Promise.reject(error)}
    bgPlayPromise=Promise.resolve(started).then(()=>{
      if(!bgWanted||!backgroundAllowed()){pauseBackground();return false}
      audioGestureArmed=false;syncSoundUi();return true;
    }).catch(()=>{
      audioGestureArmed=true;syncSoundUi();return false;
    }).finally(()=>{bgPlayPromise=null});
    return bgPlayPromise;
  }
  function pauseBackground(){
    if(bgAudio&&!bgAudio.paused)bgAudio.pause();
    syncSoundUi();
  }
  function resyncBackground(){
    if(!bgWanted||!backgroundAllowed()||!bgAudio||bgAudio.paused||!Number.isFinite(bgAudio.duration)||bgAudio.duration<=0)return;
    const target=liveAudioPosition();
    const duration=bgAudio.duration;
    let drift=Math.abs(bgAudio.currentTime-target);
    drift=Math.min(drift,Math.abs(duration-drift));
    if(drift>.55){try{bgAudio.currentTime=target}catch{}}
  }
  function armAudioGesture(){
    const retry=event=>{
      if(event?.target?.closest?.('#soundButton,#mobileSoundButton'))return;
      if(bgWanted&&backgroundAllowed()&&(!bgAudio||bgAudio.paused)){
        audioGestureArmed=false;
        playBackground({hardSync:true});
      }
    };
    ['pointerdown','touchstart','keydown'].forEach(type=>
      addEventListener(type,retry,{capture:true,passive:true}));
  }
  armAudioGesture();
  bgResyncTimer=setInterval(()=>{if(!document.hidden)resyncBackground()},15000);

  /* Prevent the old finale tracks from jumping back to a fixed timestamp
     when sound is re-enabled after release. */
  addEventListener('tfw:finale-audio-enable',event=>{
    if(document.body.classList.contains('finale-released')||Date.now()>=releaseEpoch()) event.stopImmediatePropagation();
  },true);

  addEventListener('tfw:sound-change',event=>{
    const enabled=Boolean(event.detail&&event.detail.enabled);
    bgWanted=enabled;
    storage.set('tfw_sound',enabled?'on':'off');
    if(enabled&&backgroundAllowed()){
      audioGestureArmed=false;
      playBackground({hardSync:true});
    }
    else{
      pauseBackground();
      if(milestoneAudio){try{milestoneAudio.pause()}catch{}}
    }
    // Forward mute changes to the finale owner, even after release.
    setTimeout(syncSoundUi,0);
  });
  addEventListener('pageshow',()=>{if(bgWanted&&backgroundAllowed())playBackground({hardSync:true})});
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden&&bgWanted&&backgroundAllowed())playBackground({hardSync:true});
  });
  addEventListener('tfw:finale-start',event=>{
    const remaining=Number(event.detail&&event.detail.remaining);
    if(Number.isFinite(remaining)&&remaining<=5*MINUTE){

      previewFinalFive=true;
      pauseBackground();
    }
  });
  addEventListener('tfw:finale-release',()=>{

    previewFinalFive=true;
    pauseBackground();
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

  function ensureMilestoneTag(){return null}
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
  function previewStageFor(remaining){
    if(!Number.isFinite(remaining)||remaining>24*HOUR||remaining<=5*MINUTE)return null;
    if(remaining<=15*MINUTE)return milestones.find(m=>m.id==='15m')||null;
    if(remaining<=30*MINUTE)return milestones.find(m=>m.id==='30m')||null;
    if(remaining<=HOUR)return milestones.find(m=>m.id==='hour')||null;
    if(remaining<=6*HOUR)return milestones.find(m=>m.id==='6h')||null;
    if(remaining<=12*HOUR)return milestones.find(m=>m.id==='12h')||null;
    return milestones.find(m=>m.id==='day')||null;
  }
  function renderMilestoneHeadline(title,m){
    if(!title)return;
    const id=m?.id||'default';
    if(title.dataset.tfwHeadlineStage===id)return;
    title.dataset.tfwHeadlineStage=id;
    // Explicit two-line layout without reflowing the countdown.
    if(id==='day'){
      title.innerHTML='<span class="tfw-headline-line">TOMORROW,</span><span class="tfw-headline-line">THE WAIT ENDS</span>';
    }else if(id==='6h'){
      title.innerHTML='<span class="tfw-headline-line">THE WAIT IS</span><span class="tfw-headline-line">ALMOST OVER</span>';
    }else{
      title.textContent=m?m.title:'ROAD TO LEONIDA';
    }
    if(m)title.setAttribute('aria-label',m.title);
    else title.removeAttribute('aria-label');
  }
  function activatePreviewStage(m){
    if(!m)return deactivatePreviewStage();
    // Do not rewrite the same title on every countdown animation frame.
    if(previewStage?.id===m.id&&byId('heroTitle')?.dataset.tfwHeadlineStage===m.id)return;
    previewStage=m;
    renderMilestoneHeadline(byId('heroTitle'),m);
    document.body.classList.add('tfw-preview-stage-title');
    document.body.dataset.tfwPreviewStage=m.id;
  }
  function deactivatePreviewStage(){
    if(!previewStage&&!document.body.classList.contains('tfw-preview-stage-title'))return;
    previewStage=null;
    document.body.classList.remove('tfw-preview-stage-title');
    delete document.body.dataset.tfwPreviewStage;
    const title=byId('heroTitle');
    if(title&&!document.body.classList.contains('tfw-milestone-live')&&!document.body.classList.contains('final-five-active')&&!document.body.classList.contains('finale-released'))renderMilestoneHeadline(title,null);
  }

  function activateMilestone(m,remaining){
    if(currentMilestone&&currentMilestone.id===m.id)return;
    deactivateMilestone(false);
    currentMilestone=m;
    const title=byId('heroTitle');
    if(title){liveTitleBase=title.textContent||'ROAD TO LEONIDA';renderMilestoneHeadline(title,m)}
    document.body.classList.add('tfw-milestone-live');
    document.body.dataset.tfwMilestone=m.id;
    setBgVolume(desiredBgVolume(),280);
    playMilestoneSfx(m,m.at-remaining);
  }
  function deactivateMilestone(restoreTitle=true){
    if(!currentMilestone)return;
    if(milestoneAudio){try{milestoneAudio.pause()}catch{};milestoneAudio=null}
    currentMilestone=null;
    document.body.classList.remove('tfw-milestone-live');
    delete document.body.dataset.tfwMilestone;
    if(restoreTitle){
      const title=byId('heroTitle');
      if(title&&!document.body.classList.contains('final-five-active')&&!document.body.classList.contains('finale-released'))renderMilestoneHeadline(title,null);
    }
    setBgVolume(desiredBgVolume(),360);
  }
  function updateLiveMilestone(remaining,preview=false){
    if(!Number.isFinite(remaining)||remaining<=0){
      deactivateMilestone();deactivatePreviewStage();return;
    }
    if(remaining<=5*MINUTE){
      deactivateMilestone();deactivatePreviewStage();return;
    }
    const exact=findMilestone(remaining);
    if(exact){
      deactivatePreviewStage();
      activateMilestone(exact,remaining);
      if(exact.id==='6h')normalizeLegacyCopy();
      return;
    }
    // Milestone headlines persist until the next threshold, in preview and live mode.
    // Audio cues are still limited to their short scheduled windows.
    deactivateMilestone(false);
    const stage=previewStageFor(remaining);
    if(stage){activatePreviewStage(stage);if(stage.id==='6h')normalizeLegacyCopy()}
    else{
      deactivatePreviewStage();
      // No persistent milestone before -24h: restore the normal headline
      // after transient milestone sound/title cues have finished.
      if(!document.body.classList.contains('final-five-active')&&
         !document.body.classList.contains('finale-released'))
        renderMilestoneHeadline(byId('heroTitle'),null);
    }
  }
  addEventListener('tfw:countdown',event=>{
    const now=performance.now();
    if(now-lastMilestoneCheck<55)return;
    lastMilestoneCheck=now;
    const remaining=Number(event.detail&&event.detail.remaining);
    const preview=Boolean(event.detail&&event.detail.preview);
    if(preview){
      previewFinalFive=remaining<=5*MINUTE&&remaining>0;
      if(previewFinalFive){

        pauseBackground();
      }else if(bgWanted&&backgroundAllowed()&&(!bgAudio||bgAudio.paused)){
        playBackground({hardSync:true});
      }
    }else{
      previewFinalFive=false;
      if(remaining<=5*MINUTE&&remaining>0){

        pauseBackground();
      }else if(remaining>BG_CUTOFF&&bgWanted&&backgroundAllowed()&&(!bgAudio||bgAudio.paused)){
        playBackground({hardSync:true});
      }
    }
    updateLiveMilestone(remaining,preview);
    if(!backgroundAllowed())pauseBackground();
    else if(!currentMilestone){
      const fadeActive=remaining<=BG_CUTOFF+BG_FADE_WINDOW;
      // A deterministic cutoff-tied envelope, without restarting the
      // short volume ramp every 55ms while approaching -30:00.
      setBgVolume(desiredBgVolume(),fadeActive?0:350);
    }
  });


  function installMilestonePreviewBridge(){
    /* V22: quick jumps drive the simulator clock directly.
       The legacy popup bridge is disabled to avoid title/audio races. */
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
      const elapsed=document.createElement('div');
      elapsed.id='releaseElapsed';
      elapsed.className='release-elapsed';
      elapsed.innerHTML=`
        <span class="release-elapsed-label">TIME SINCE GTA VI RELEASE</span>
        <div class="release-elapsed-clock countdown" aria-live="off">
          <div class="time-unit days"><span class="digit-glow"></span><span class="time-value" data-release-unit="days">0</span><span class="time-label">DAYS</span></div>
          <div class="time-separator">:</div>
          <div class="time-unit"><span class="digit-glow"></span><span class="time-value" data-release-unit="hours">00</span><span class="time-label">HOURS</span></div>
          <div class="time-separator">:</div>
          <div class="time-unit"><span class="digit-glow"></span><span class="time-value" data-release-unit="minutes">00</span><span class="time-label">MINUTES</span></div>
          <div class="time-separator">:</div>
          <div class="time-unit"><span class="digit-glow"></span><span class="time-value" data-release-unit="seconds">00</span><span class="time-label">SECONDS</span></div>
          <div class="time-separator milliseconds-separator">:</div>
          <div class="time-unit milliseconds"><span class="digit-glow"></span><span class="time-value" data-release-unit="milliseconds">000</span><span class="time-label">MILLISECONDS</span></div>
        </div>`;
      const line=releaseBox.querySelector('.release-line');
      if(line)line.insertAdjacentElement('afterend',elapsed);
      else releaseBox.appendChild(elapsed);
    }
    return true;
  }
  function updateReleaseElapsed(){
    ensureReleaseUi();
    const simulatedRelease=document.body.classList.contains('finale-previewing')&&document.body.classList.contains('finale-released');
    const epoch=Number(window.__tfwPreviewReleasedAt);
    const elapsed=simulatedRelease&&Number.isFinite(epoch)?Math.max(0,performance.now()-epoch):Math.max(0,Date.now()-releaseEpoch());
    const days=Math.floor(elapsed/DAY);
    const hours=Math.floor((elapsed%DAY)/HOUR);
    const minutes=Math.floor((elapsed%HOUR)/MINUTE);
    const seconds=Math.floor((elapsed%MINUTE)/SECOND);
    const milliseconds=Math.floor(elapsed%SECOND);
    const map={days:String(days),hours:pad(hours),minutes:pad(minutes),seconds:pad(seconds),milliseconds:pad(milliseconds,3)};
    for(const [unit,value] of Object.entries(map)){
      const el=document.querySelector(`[data-release-unit="${unit}"]`);if(el&&el.textContent!==value)el.textContent=value;
    }
    const released=Date.now()>=releaseEpoch()||document.body.classList.contains('finale-released');
    document.body.classList.toggle('tfw-release-clock-live',released);
    if(released){

      previewFinalFive=true;
      pauseBackground();
    }
    document.body.classList.toggle('tfw-release-settled',released&&elapsed>30000);
  }

  function bootRuntime(){
    installVisibilityGovernor();
    ensureMilestoneTag();
    installMilestonePreviewBridge();
    ensureReleaseUi();
    normalizeLegacyCopy();
    const releaseLoop=()=>{
      updateReleaseElapsed();
      const released=Date.now()>=releaseEpoch()||document.body.classList.contains('finale-released');
      releaseUiTimer=setTimeout(releaseLoop,released?(document.hidden?500:(root.classList.contains('tfw-perf-mobile')?50:33)):1500);
    };
    releaseLoop();
    // Do not wait for the old 1.5s poll when 00:00 is reached.
    // This also starts the simulated elapsed clock on the release frame.
    addEventListener('tfw:finale-release',()=>{
      if(releaseUiTimer)clearTimeout(releaseUiTimer);
      releaseLoop();
    });
    // Try autoplay once. If the browser blocks it, the next user gesture resumes at
    // the globally synchronized position instead of starting from 0.
    if(bgWanted&&backgroundAllowed())playBackground({hardSync:true});
    setTimeout(syncSoundUi,0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootRuntime,{once:true});
  else bootRuntime();
})();
