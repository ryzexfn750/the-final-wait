(()=>{
  'use strict';
  const DAY=86400000,HOUR=3600000,MIN=60000,SECOND=1000;
  const SCRUB_MAX=31*DAY+5*SECOND;
  const WINDOW=10000;
  const $=s=>document.querySelector(s);
  const pad=(n,l=2)=>String(Math.max(0,Math.floor(n))).padStart(l,'0');
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const milestones=[
    {id:'month',at:31*DAY,kicker:'ONE MONTH',title:'THE FINAL MONTH BEGINS',sfx:'1-month.mp3'},
    {id:'two-weeks',at:14*DAY,kicker:'TWO WEEKS',title:'LEONIDA IS GETTING CLOSE',sfx:'2-weeks.mp3'},
    {id:'week',at:7*DAY,kicker:'ONE WEEK',title:'THE FINAL WEEK',sfx:'1-week.mp3'},
    {id:'day',at:DAY,kicker:'24 HOURS',title:'TOMORROW, THE WAIT ENDS',sfx:'24-hours.mp3'},
    {id:'12h',at:12*HOUR,kicker:'12 HOURS',title:'HALFWAY THROUGH THE FINAL DAY',sfx:'12-hours.mp3'},
    {id:'6h',at:6*HOUR,kicker:'6 HOURS',title:'THE WAIT IS ALMOST OVER',sfx:'6-hours.mp3'},
    {id:'hour',at:HOUR,kicker:'ONE HOUR',title:'THE FINAL HOUR',sfx:'1-hour.mp3'},
    {id:'30m',at:30*MIN,kicker:'30 MINUTES',title:'NO MORE YEARS. NO MORE MONTHS.',sfx:'30-minutes.mp3'},
    {id:'15m',at:15*MIN,kicker:'15 MINUTES',title:'THE LAST QUARTER HOUR',sfx:'15-minutes.mp3'}
  ];
  let preview=false,playing=false,previewRaf=0,playStartPerf=0,playStartRemaining=SCRUB_MAX,currentRemaining=SCRUB_MAX;
  let activeMilestone=null,milestoneAudio=null,lastEventId='';
  let releaseActive=false,releaseTimer=0;
  const finalSong=new Audio('assets/audio/final-5-minutes.mp3');
  const sequenceSong=new Audio('assets/audio/final-30-sequence.mp4');
  for(const a of [finalSong,sequenceSong]){a.preload='metadata';a.playsInline=true}
  finalSong.volume=.72;sequenceSong.volume=.68;

  function fmt(ms,withMs=true){
    ms=Math.max(0,ms);const d=Math.floor(ms/DAY);ms%=DAY;const h=Math.floor(ms/HOUR);ms%=HOUR;const m=Math.floor(ms/MIN);ms%=MIN;const s=Math.floor(ms/SECOND);const x=Math.floor(ms%SECOND);
    if(d>0)return `-${d}d ${pad(h)}:${pad(m)}:${pad(s)}${withMs?'.'+pad(x,3):''}`;
    if(h>0)return `-${pad(h)}:${pad(m)}:${pad(s)}${withMs?'.'+pad(x,3):''}`;
    return `-${pad(m)}:${pad(s)}${withMs?'.'+pad(x,3):''}`;
  }
  function inject(){
    if(!$('#milestonePreviewPanel')){
      document.body.insertAdjacentHTML('beforeend',`
        <button class="milestone-preview-toggle" id="milestonePreviewToggle" type="button" hidden>EXPERIENCE PREVIEW</button>
        <aside class="milestone-preview-panel" id="milestonePreviewPanel" hidden>
          <div class="preview-panel-head"><strong>COUNTDOWN EXPERIENCE</strong><button id="milestonePreviewClose" type="button" aria-label="Close">×</button></div>
          <p>Simulate any moment from one month before release to 00:00.</p>
          <div class="finale-scrubber">
            <div class="finale-scrub-head"><span>SIMULATED TIME</span><strong id="finaleScrubReadout">${fmt(SCRUB_MAX)}</strong></div>
            <div class="finale-scrub-track-shell" id="finaleScrubTrack"><span class="finale-scrub-fill"></span><input id="finaleScrubber" type="range" min="0" max="${SCRUB_MAX}" value="0" step="100" aria-label="Simulated time before release"></div>
            <div class="finale-scrub-scale"><span>-31 DAYS</span><span>-15 DAYS</span><span>00:00</span></div>
            <div class="precise-time-row"><input id="preciseTimeInput" type="text" inputmode="text" spellcheck="false" placeholder="e.g. 01:00:04 or 14d 00:00:00"><button id="preciseTimeGo" type="button">GO</button></div>
            <small class="precise-time-help">Use HH:MM:SS or 14d HH:MM:SS</small>
            <div class="finale-scrub-actions"><button id="finaleScrubPlay" type="button">PLAY FROM HERE</button><button id="finaleScrubPause" type="button">PAUSE</button><button id="finaleScrubReset" type="button">RESET -31 DAYS</button></div>
          </div>
          <div class="preview-quick-label">QUICK JUMPS</div><div class="milestone-preview-grid" id="milestonePreviewGrid"></div>
        </aside>
        <button class="finale-preview-exit" id="finalePreviewExit" type="button" hidden>EXIT SIMULATION</button>`);
    }
    const shell=$('.countdown-shell');
    if(shell&&!$('#finaleRelease')){
      shell.insertAdjacentHTML('beforeend',`<div class="finale-release" id="finaleRelease" aria-hidden="true"><span class="release-radiance"></span><span class="finale-release-kicker">THE WAIT IS OVER!</span><h2>WELCOME TO<br>LEONIDA.</h2><div class="release-elapsed" id="releaseElapsed"><span class="release-elapsed-label">TIME SINCE GTA VI RELEASE</span><div class="release-elapsed-clock"><div class="elapsed-unit"><strong data-elapsed="days">0</strong><small>DAYS</small></div><i>:</i><div class="elapsed-unit"><strong data-elapsed="hours">00</strong><small>HOURS</small></div><i>:</i><div class="elapsed-unit"><strong data-elapsed="minutes">00</strong><small>MINUTES</small></div><i>:</i><div class="elapsed-unit"><strong data-elapsed="seconds">00</strong><small>SECONDS</small></div><i>:</i><div class="elapsed-unit elapsed-ms"><strong data-elapsed="ms">000</strong><small>MILLISECONDS</small></div></div></div><span class="finale-release-date">AFTER MORE THAN A DECADE, HERE WE ARE.</span><span class="release-line"></span></div>`);
    }
    const grid=$('#milestonePreviewGrid');
    if(grid&&!grid.dataset.ready){grid.dataset.ready='1';grid.innerHTML=[...milestones.map(m=>`<button type="button" data-jump="${m.at}">${m.kicker}</button>`),'<button type="button" data-jump="300000">-05:00</button>','<button type="button" data-jump="60000">-01:00</button>','<button type="button" data-jump="10000">-00:10</button>','<button type="button" data-jump="0">00:00</button>'].join('');grid.addEventListener('click',e=>{const b=e.target.closest('[data-jump]');if(!b)return;jumpTo(Number(b.dataset.jump),true)})}
    bind();
  }
  let bound=false;
  function bind(){if(bound)return;bound=true;
    $('#milestonePreviewToggle')?.addEventListener('click',()=>{$('#milestonePreviewPanel').hidden=false});$('#milestonePreviewClose')?.addEventListener('click',()=>{$('#milestonePreviewPanel').hidden=true});$('#finalePreviewExit')?.addEventListener('click',exitPreview);
    const scrub=$('#finaleScrubber');if(scrub){const apply=()=>{pause();const r=SCRUB_MAX-Number(scrub.value);jumpTo(r,false)};scrub.addEventListener('input',apply);scrub.addEventListener('change',apply)}
    $('#finaleScrubPlay')?.addEventListener('click',play);$('#finaleScrubPause')?.addEventListener('click',pause);$('#finaleScrubReset')?.addEventListener('click',()=>jumpTo(SCRUB_MAX,false));
    const go=()=>{const v=parsePrecise($('#preciseTimeInput')?.value||'');if(v==null){flashInvalid();return}jumpTo(v,true)};$('#preciseTimeGo')?.addEventListener('click',go);$('#preciseTimeInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')go()});
  }
  function parsePrecise(raw){let v=String(raw).trim().toLowerCase().replace(/^-/,'');let m=v.match(/^(?:(\d+)d\s*)?(\d{1,3}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/);if(!m)return null;const d=Number(m[1]||0),h=Number(m[2]),mi=Number(m[3]),s=Number(m[4]),ms=Number((m[5]||'0').padEnd(3,'0'));if(mi>59||s>59)return null;return clamp(d*DAY+h*HOUR+mi*MIN+s*SECOND+ms,0,SCRUB_MAX)}
  function flashInvalid(){const i=$('#preciseTimeInput');if(!i)return;i.classList.remove('invalid');void i.offsetWidth;i.classList.add('invalid')}
  function syncSlider(r){const s=$('#finaleScrubber');if(s)s.value=String(SCRUB_MAX-clamp(r,0,SCRUB_MAX));const o=$('#finaleScrubReadout');if(o)o.textContent=r<=0?'00:00.000':fmt(r,true);document.documentElement.style.setProperty('--scrub-progress',`${((SCRUB_MAX-clamp(r,0,SCRUB_MAX))/SCRUB_MAX*100).toFixed(4)}%`)}
  function enter(){if(!preview){preview=true;document.body.classList.add('finale-previewing');$('#finalePreviewExit')?.removeAttribute('hidden')}}
  function setRemaining(r){currentRemaining=r;window.__tfwPreviewRemainingMs=r;syncSlider(r);window.__tfwRefreshCountdown?.();syncVisualState(r)}
  function jumpTo(r,playSfx){enter();pause(false);r=clamp(r,0,SCRUB_MAX);lastEventId='';setRemaining(r);const m=findMilestone(r);if(m){activateMilestone(m,r,playSfx)}else deactivateMilestone(false);if(r<=0)showRelease(0);else hideRelease()}
  function play(){enter();if(playing)return;playing=true;playStartRemaining=currentRemaining;playStartPerf=performance.now();$('#milestonePreviewPanel')?.setAttribute('data-playing','true');const step=now=>{if(!playing)return;const r=playStartRemaining-(now-playStartPerf);setRemaining(r);if(r<=-7*DAY){playing=false;return}previewRaf=requestAnimationFrame(step)};previewRaf=requestAnimationFrame(step)}
  function pause(update=true){if(previewRaf)cancelAnimationFrame(previewRaf);previewRaf=0;playing=false;$('#milestonePreviewPanel')?.removeAttribute('data-playing');if(update&&preview)syncVisualState(currentRemaining)}
  function exitPreview(){pause(false);preview=false;delete window.__tfwPreviewRemainingMs;document.body.classList.remove('finale-previewing','tfw-preview-stage-title','tfw-milestone-live','finale-released');$('#finalePreviewExit')?.setAttribute('hidden','');deactivateMilestone(false);hideRelease();const t=$('#heroTitle');if(t)t.textContent='ROAD TO LEONIDA';window.__tfwRefreshCountdown?.()}
  function findMilestone(r){return milestones.find(m=>r<=m.at&&r>m.at-WINDOW)||null}
  function titleFor(r){if(r<=0)return '';if(r<=1000)return'ONE SECOND TO LEONIDA';if(r<=2000)return'TWO SECONDS TO LEONIDA';if(r<=3000)return'THREE SECONDS TO LEONIDA';if(r<=4000)return'FOUR SECONDS TO LEONIDA';if(r<=5000)return'FIVE SECONDS TO LEONIDA';if(r<=10000)return'TEN SECONDS TO LEONIDA';if(r<=15000)return'FIFTEEN SECONDS TO LEONIDA';if(r<=30000)return'30 SECONDS TO LEONIDA';if(r<=MIN)return'ONE MINUTE TO LEONIDA';if(r<=2*MIN)return'TWO MINUTES TO LEONIDA';if(r<=3*MIN)return'THREE MINUTES TO LEONIDA';if(r<=4*MIN)return'FOUR MINUTES TO LEONIDA';if(r<=5*MIN)return'FIVE MINUTES TO LEONIDA';const m=findMilestone(r);return m?m.title:'ROAD TO LEONIDA'}
  function soundOn(){return localStorage.getItem('tfw_sound')!=='off'}
  function playSfx(m,r){if(!soundOn())return;stopSfx();const a=new Audio(`assets/audio/milestones/${m.sfx}`);milestoneAudio=a;a.preload='auto';a.volume=.98;const offset=Math.max(0,(m.at-r)/1000);const go=()=>{if(milestoneAudio!==a)return;try{if(Number.isFinite(a.duration)&&offset<a.duration)a.currentTime=Math.min(offset,Math.max(0,a.duration-.03));a.play().catch(()=>{})}catch{}};if(a.readyState>=1)go();else a.addEventListener('loadedmetadata',go,{once:true})}
  function stopFinaleAudio(reset=false){for(const a of [finalSong,sequenceSong]){try{a.pause();if(reset)a.currentTime=0}catch{}}}
  function syncFinaleAudio(r){
    if(!soundOn()){stopFinaleAudio(false);return}
    if(r>5*MIN){stopFinaleAudio(true);return}
    if(r>0){
      const target=(5*MIN-r)/1000;
      if(r>30000){try{if(Math.abs(finalSong.currentTime-target)>.55||finalSong.paused)finalSong.currentTime=Math.max(0,target);if(finalSong.paused)finalSong.play().catch(()=>{})}catch{};try{sequenceSong.pause();sequenceSong.currentTime=0}catch{}}
      else{try{finalSong.pause()}catch{};const st=Math.max(0,(30000-r)/1000);try{if(Math.abs(sequenceSong.currentTime-st)>.45||sequenceSong.paused)sequenceSong.currentTime=st;if(sequenceSong.paused)sequenceSong.play().catch(()=>{})}catch{}}
    }else{try{finalSong.pause()}catch{};const st=Math.max(0,(30000-r)/1000);try{if(Math.abs(sequenceSong.currentTime-st)>.55||sequenceSong.paused)sequenceSong.currentTime=st;if(sequenceSong.paused)sequenceSong.play().catch(()=>{})}catch{}}
  }
  function stopSfx(){if(milestoneAudio){try{milestoneAudio.pause();milestoneAudio.currentTime=0}catch{}milestoneAudio=null}}
  function activateMilestone(m,r,audio=true){if(activeMilestone?.id!==m.id){activeMilestone=m;if(audio)playSfx(m,r)}document.body.classList.add('tfw-milestone-live','tfw-preview-stage-title');document.body.dataset.tfwMilestone=m.id;const t=$('#heroTitle');if(t)t.textContent=m.title;lastEventId=m.id}
  function deactivateMilestone(restore=true){activeMilestone=null;stopSfx();document.body.classList.remove('tfw-milestone-live');delete document.body.dataset.tfwMilestone;if(restore){const t=$('#heroTitle');if(t)t.textContent=titleFor(currentRemaining)}}
  function syncVisualState(r){
    syncFinaleAudio(r);
    if(r<=0){deactivateMilestone(false);showRelease(-r);return}hideRelease();
    const m=findMilestone(r);if(m){activateMilestone(m,r,lastEventId!==m.id)}else{if(activeMilestone)deactivateMilestone(false);const t=$('#heroTitle');const text=titleFor(r);if(t&&t.textContent!==text)t.textContent=text;document.body.classList.toggle('tfw-preview-stage-title',r<=5*MIN);if(r>5*MIN)document.body.classList.remove('tfw-preview-stage-title');lastEventId=''}
  }
  function ensureReleaseTimer(){if(releaseTimer)return;const tick=()=>{if(!releaseActive){releaseTimer=0;return}const r=Number(window.__tfwPreviewRemainingMs);let elapsed=Number.isFinite(r)?Math.max(0,-r):Math.max(0,Date.now()-Number(window.__tfwReleaseEpoch||Date.now()));updateElapsed(elapsed);releaseTimer=requestAnimationFrame(tick)};releaseTimer=requestAnimationFrame(tick)}
  function updateElapsed(ms){const d=Math.floor(ms/DAY);ms%=DAY;const h=Math.floor(ms/HOUR);ms%=HOUR;const m=Math.floor(ms/MIN);ms%=MIN;const s=Math.floor(ms/SECOND),x=Math.floor(ms%SECOND);const map={days:String(d),hours:pad(h),minutes:pad(m),seconds:pad(s),ms:pad(x,3)};for(const [k,v] of Object.entries(map)){const e=document.querySelector(`[data-elapsed="${k}"]`);if(e&&e.textContent!==v)e.textContent=v}}
  function showRelease(elapsed=0){if(!releaseActive){releaseActive=true;document.body.classList.add('finale-released');document.body.classList.remove('tfw-preview-stage-title','tfw-milestone-live');const box=$('#finaleRelease');if(box){box.classList.add('active');box.setAttribute('aria-hidden','false')}const old=$('#releaseOverlay');if(old){old.classList.remove('active','sequence');old.setAttribute('aria-hidden','true')}}updateElapsed(elapsed);ensureReleaseTimer()}
  function hideRelease(){if(!releaseActive&&!document.body.classList.contains('finale-released'))return;releaseActive=false;document.body.classList.remove('finale-released');const box=$('#finaleRelease');if(box){box.classList.remove('active');box.setAttribute('aria-hidden','true')}}

  addEventListener('tfw:countdown',e=>{const r=Number(e.detail?.remaining);if(!Number.isFinite(r))return;currentRemaining=r;if(preview)syncVisualState(r);else{syncFinaleAudio(r);if(r<=0)showRelease(Math.max(0,-r));else{hideRelease();const m=findMilestone(r);if(m)activateMilestone(m,r,true);else{if(activeMilestone)deactivateMilestone(false);const t=$('#heroTitle');const tx=titleFor(r);if(t&&t.textContent!==tx)t.textContent=tx;document.body.classList.toggle('tfw-preview-stage-title',r<=5*MIN);if(r>5*MIN)document.body.classList.remove('tfw-preview-stage-title');lastEventId=''}}}});
  addEventListener('tfw:release-reached',()=>showRelease(0));
  addEventListener('tfw:sound-change',e=>{if(!e.detail?.enabled){stopSfx();stopFinaleAudio(false)}else syncFinaleAudio(currentRemaining)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&preview)exitPreview()});
  inject();
  if(new URLSearchParams(location.search).get('preview')==='1'){$('#milestonePreviewToggle').hidden=false;$('#milestonePreviewPanel').hidden=false;setTimeout(()=>jumpTo(SCRUB_MAX,false),0)}
})();
