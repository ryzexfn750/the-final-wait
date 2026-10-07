(() => {
  const DAY=86400000, HOUR=3600000, MIN=60000, SECOND=1000;
  const FINAL_FIVE=5*MIN;
  // The first song is 258.115918s long, so from -05:00 it naturally ends at ~-00:41.884.
  // loadedmetadata below refreshes this value from the actual media file, keeping the handoff gapless.
  let FINAL_SONG_END=41884;
  let TICK_START=43000;
  const PROGRESS_FOCUS_START=FINAL_FIVE;
  const VOICE_TRACK_START=-1;
  const SEQUENCE_TRACK_START=30000;
  const LAST_FIFTEEN=6500;
  const SCRUB_MAX=24*HOUR+5*SECOND;
  const storage={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
  const $=s=>document.querySelector(s);

  const milestones=[
    {id:'month',ms:31*DAY,label:'ONE MONTH',sub:'THE FINAL MONTH BEGINS',accent:'FINAL MONTH',duration:6800},
    {id:'two-weeks',ms:14*DAY,label:'TWO WEEKS',sub:'LEONIDA IS GETTING CLOSE',accent:'14 DAYS',duration:6500},
    {id:'week',ms:7*DAY,label:'ONE WEEK',sub:'THE FINAL WEEK',accent:'7 DAYS',duration:7000},
    {id:'day',ms:DAY,label:'24 HOURS',sub:'TOMORROW, THE WAIT ENDS',accent:'FINAL DAY',duration:7600},
    {id:'12h',ms:12*HOUR,label:'12 HOURS',sub:'HALFWAY THROUGH THE FINAL DAY',accent:'12:00:00',duration:6200},
    {id:'6h',ms:6*HOUR,label:'6 HOURS',sub:'THE WAIT IS ALMOST OVER',accent:'06:00:00',duration:6200},
    {id:'hour',ms:HOUR,label:'ONE HOUR',sub:'THE FINAL HOUR',accent:'60 MINUTES',duration:7800},
    {id:'30m',ms:30*MIN,label:'30 MINUTES',sub:'NO MORE YEARS. NO MORE MONTHS.',accent:'00:30:00',duration:6200},
    {id:'15m',ms:15*MIN,label:'15 MINUTES',sub:'THE LAST QUARTER HOUR',accent:'00:15:00',duration:6200}
  ];

  let lastRemaining=null;
  let currentTimer=0;
  let previewCard=false;
  let finaleActive=false;
  let releaseShown=false;
  let lastSecondTick=null;
  let lastRapidBucket=null;
  let finalePreview=false;
  let previewPlaying=false;
  let previewRaf=0;
  let previewStartedAt=0;
  let previewStartRemaining=5*MIN;
  let previewPausedRemaining=5*MIN;
  let fireworksRaf=0;
  let fireworks=[];
  let fireworkNext=0;
  let tickCtx=null;
  let musicCtx=null;
  let musicAnalyser=null;
  let finalMusicSource=null;
  let sequenceMusicSource=null;
  let musicData=null;
  let visualizerRaf=0;
  let visualizerResize=null;
  let scrubPointerId=null;
  let lastSceneStepAt=0;
  let sceneRushPrimed=false;
  let titleFlowRaf=0;
  let titleFlowStartedAt=0;

  const finalSong=new Audio('assets/audio/final-5-minutes.mp3');
  const voiceSong=new Audio('assets/audio/final-1-minute-voice.mp4');
  const sequenceSong=new Audio('assets/audio/final-30-sequence.mp4');
  for(const audio of [finalSong,voiceSong,sequenceSong]){audio.preload='auto';audio.playsInline=true}
  finalSong.volume=.72;
  voiceSong.volume=1;
  sequenceSong.volume=.68;
  finalSong.addEventListener('loadedmetadata',()=>{
    if(Number.isFinite(finalSong.duration)&&finalSong.duration>1){
      FINAL_SONG_END=Math.max(0,FINAL_FIVE-finalSong.duration*1000);
    }
  });

  function soundEnabled(){return storage.get('tfw_sound')!=='off'}
  function clamp(v,min,max){return Math.min(max,Math.max(min,v))}
  function pad(n,len=2){return String(Math.max(0,Math.floor(n))).padStart(len,'0')}
  function formatRemaining(ms,withMs=true){
    ms=Math.max(0,ms);
    const h=Math.floor(ms/HOUR);
    const m=Math.floor((ms%HOUR)/MIN);
    const s=Math.floor((ms%MIN)/1000);
    const milli=Math.floor(ms%1000);
    if(h>0)return `-${pad(h)}:${pad(m)}:${pad(s)}${withMs?`.${pad(milli,3)}`:''}`;
    return `-${pad(m)}:${pad(s)}${withMs?`.${pad(milli,3)}`:''}`;
  }

  function inject(){
    if(!$('#milestoneExperience')){
      document.body.insertAdjacentHTML('beforeend',`
        <div class="milestone-experience" id="milestoneExperience" aria-hidden="true">
          <div class="milestone-film"></div><div class="milestone-vignette"></div><div class="milestone-beam beam-a"></div><div class="milestone-beam beam-b"></div>
          <div class="milestone-particles" id="milestoneParticles"></div>
          <div class="milestone-card">
            <span class="milestone-kicker" id="milestoneKicker">THE FINAL WAIT</span>
            <strong class="milestone-number" id="milestoneNumber">ONE MONTH</strong>
            <h2 id="milestoneSubtitle">THE FINAL MONTH BEGINS</h2>
            <div class="milestone-line"><i></i><span id="milestoneAccent">FINAL MONTH</span><i></i></div>
            <button class="milestone-close" id="milestoneClose" type="button">CLOSE PREVIEW</button>
          </div>
        </div>
        <button class="milestone-preview-toggle" id="milestonePreviewToggle" type="button" hidden>EXPERIENCE PREVIEW</button>
        <aside class="milestone-preview-panel" id="milestonePreviewPanel" hidden>
          <div class="preview-panel-head"><strong>COUNTDOWN EXPERIENCE</strong><button type="button" id="milestonePreviewClose" aria-label="Close preview controls">×</button></div>
          <p>Use the timeline below to simulate any point inside the final 24 hours. The production countdown, percentage and finale effects all follow the simulated time.</p>
          <div class="finale-scrubber">
            <div class="finale-scrub-head"><span>SIMULATED TIME</span><strong id="finaleScrubReadout">-05:00.000</strong></div>
            <div class="finale-scrub-track-shell" id="finaleScrubTrack">
              <span class="finale-scrub-fill" aria-hidden="true"></span>
              <input id="finaleScrubber" type="range" min="0" max="${SCRUB_MAX}" value="${SCRUB_MAX-5*MIN}" step="1" aria-label="Simulated time before release">
            </div>
            <div class="finale-scrub-scale"><span>-24:00:05</span><span>-12:00:00</span><span>00:00</span></div>
            <div class="finale-scrub-actions">
              <button type="button" id="finaleScrubPlay">PLAY FROM HERE</button>
              <button type="button" id="finaleScrubPause">PAUSE</button>
              <button type="button" id="finaleScrubReset">RESET −05:00</button>
            </div>
          </div>
          <div class="preview-quick-label">QUICK JUMPS</div>
          <div class="milestone-preview-grid" id="milestonePreviewGrid"></div>
        </aside>`);
    }

    const shell=$('.countdown-shell');
    if(shell && !$('#finaleRelease')){
      shell.insertAdjacentHTML('beforeend',`
        <div class="finale-release" id="finaleRelease" aria-hidden="true">
          <span class="release-radiance" aria-hidden="true"></span>
          <span class="finale-release-kicker">THE WAIT IS OVER.</span>
          <h2>WELCOME TO<br>LEONIDA.</h2>
          <span class="finale-release-date">AFTER MORE THAN A DECADE, HERE WE ARE.</span>
          <span class="release-line" aria-hidden="true"></span>
          <i class="release-spark spark-a"></i><i class="release-spark spark-b"></i><i class="release-spark spark-c"></i><i class="release-spark spark-d"></i>
        </div>`);
    }
    const scrollCue=$('.scroll-cue');
    if(scrollCue && !$('#finaleVisualizer')){
      scrollCue.insertAdjacentHTML('beforebegin',`<div class="finale-visualizer-wrap" id="finaleVisualizerWrap" aria-hidden="true"><canvas class="finale-visualizer" id="finaleVisualizer"></canvas><div class="finale-beat-halo" id="finaleBeatHalo"></div></div>`);
    }
    const hero=$('#hero');
    if(hero && !$('#finaleFireworks')){
      hero.insertAdjacentHTML('beforeend',`<canvas class="finale-fireworks" id="finaleFireworks" aria-hidden="true"></canvas><div class="finale-flash" id="finaleFlash" aria-hidden="true"></div><div class="finale-edge-glow" aria-hidden="true"></div>`);
    }
    if(!$('#finalePreviewExit')) document.body.insertAdjacentHTML('beforeend','<button class="finale-preview-exit" id="finalePreviewExit" type="button" hidden>EXIT SIMULATION</button>');

    const grid=$('#milestonePreviewGrid');
    if(grid && !grid.dataset.ready){
      grid.dataset.ready='1';
      grid.innerHTML=[
        ...milestones.map(m=>`<button type="button" data-preview-milestone="${m.id}">${m.label}</button>`),
        '<button type="button" data-scrub-jump="300000">−05:00</button>',
        '<button type="button" data-scrub-jump="45000">−00:45</button>',
        '<button type="button" data-scrub-jump="10000">−00:10</button>',
        '<button type="button" data-scrub-jump="1000">−00:01</button>',
        '<button type="button" data-scrub-jump="0">00:00</button>'
      ].join('');
      grid.addEventListener('click',e=>{
        const b=e.target.closest('button');if(!b)return;
        if(b.dataset.previewMilestone){const m=milestones.find(x=>x.id===b.dataset.previewMilestone);if(m)playCard(m,true);return}
        if(b.dataset.scrubJump!==undefined){setStaticPreview(Number(b.dataset.scrubJump));return}
      });
    }

    const scrub=$('#finaleScrubber');
    const scrubTrack=$('#finaleScrubTrack');
    if(scrub && !scrub.dataset.ready){
      scrub.dataset.ready='1';
      let scrubFrame=0;
      let scrubPending=SCRUB_MAX-Number(scrub.value||0);
      const commitScrub=()=>{
        scrubFrame=0;
        pausePreviewPlayback();
        const remaining=clamp(scrubPending,0,SCRUB_MAX);
        setStaticPreview(remaining,{syncSlider:false});
        updateScrubVisual(remaining);
      };
      const applyScrubValue=()=>{
        scrubPending=SCRUB_MAX-Number(scrub.value);
        if(scrubFrame)return;
        scrubFrame=requestAnimationFrame(commitScrub);
      };
      scrub.addEventListener('input',applyScrubValue);
      scrub.addEventListener('change',applyScrubValue);
      scrub.addEventListener('keydown',()=>requestAnimationFrame(applyScrubValue));
      scrub.addEventListener('pointerdown',()=>scrub.focus({preventScroll:true}));
      if(scrubTrack){
        const seekFromPointer=e=>{
          const rect=scrubTrack.getBoundingClientRect();
          const fraction=clamp((e.clientX-rect.left)/Math.max(1,rect.width),0,1);
          scrub.value=String(Math.round(fraction*SCRUB_MAX));
          applyScrubValue();
        };
        scrubTrack.addEventListener('pointerdown',e=>{
          scrubPointerId=e.pointerId;
          try{scrubTrack.setPointerCapture(e.pointerId)}catch{}
          seekFromPointer(e);
          e.preventDefault();
        });
        scrubTrack.addEventListener('pointermove',e=>{
          if(scrubPointerId!==e.pointerId)return;
          seekFromPointer(e);
          e.preventDefault();
        });
        const releasePointer=e=>{
          if(scrubPointerId!==e.pointerId)return;
          scrubPointerId=null;
          try{scrubTrack.releasePointerCapture(e.pointerId)}catch{}
        };
        scrubTrack.addEventListener('pointerup',releasePointer);
        scrubTrack.addEventListener('pointercancel',releasePointer);
      }
      $('#finaleScrubPlay')?.addEventListener('click',()=>startFinalePreview(previewPausedRemaining,{keepPanel:true}));
      $('#finaleScrubPause')?.addEventListener('click',()=>pausePreviewPlayback());
      $('#finaleScrubReset')?.addEventListener('click',()=>setStaticPreview(5*MIN));
    }

    $('#milestoneClose')?.addEventListener('click',()=>previewCard&&hideCard());
    $('#milestonePreviewToggle')?.addEventListener('click',()=>{$('#milestonePreviewPanel').hidden=false});
    $('#milestonePreviewClose')?.addEventListener('click',()=>{$('#milestonePreviewPanel').hidden=true});
    $('#finalePreviewExit')?.addEventListener('click',()=>stopFinalePreview(true));
    if(new URLSearchParams(location.search).get('preview')==='1'){
      $('#milestonePreviewToggle').hidden=false;
      $('#milestonePreviewPanel').hidden=false;
      if(!document.body.dataset.previewAutoStarted){
        document.body.dataset.previewAutoStarted='1';
        setTimeout(()=>setStaticPreview(5*MIN),0);
      }
    }
  }

  function stageFor(ms){
    const ids=['month','two-weeks','week','day','12h','6h','hour','30m','15m','5m','minute','30s','release'];
    document.body.classList.remove(...ids.map(x=>'countdown-stage-'+x));
    let id='month';
    if(ms<=0)id='release'; else if(ms<=30*SECOND)id='30s'; else if(ms<=MIN)id='minute'; else if(ms<=5*MIN)id='5m';
    else if(ms<=15*MIN)id='15m'; else if(ms<=30*MIN)id='30m'; else if(ms<=HOUR)id='hour'; else if(ms<=6*HOUR)id='6h'; else if(ms<=12*HOUR)id='12h'; else if(ms<=DAY)id='day'; else if(ms<=7*DAY)id='week'; else if(ms<=14*DAY)id='two-weeks';
    if(ms<=31*DAY)document.body.classList.add('countdown-stage-'+id);
  }

  function particles(count=32){
    const host=$('#milestoneParticles');if(!host)return;host.innerHTML='';
    for(let i=0;i<count;i++){
      const p=document.createElement('i');
      p.style.setProperty('--x',`${Math.random()*100}%`);p.style.setProperty('--delay',`${Math.random()*1.8}s`);p.style.setProperty('--dur',`${3.8+Math.random()*4.5}s`);p.style.setProperty('--size',`${1+Math.random()*4}px`);host.appendChild(p);
    }
  }

  function cardAudioHit(level=1){
    if(!soundEnabled())return;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
    try{const ctx=new AC(),now=ctx.currentTime,master=ctx.createGain();master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(.1*level,now+.05);master.gain.exponentialRampToValueAtTime(.0001,now+2.2);master.connect(ctx.destination);[55,82.41,110].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=i===0?'sine':'triangle';o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(f*1.12,now+1.8);g.gain.value=i===0?.72:.34;o.connect(g);g.connect(master);o.start(now+i*.03);o.stop(now+2.4)});setTimeout(()=>ctx.close().catch(()=>{}),3000)}catch{}
  }

  function hideCard(){
    clearTimeout(currentTimer);currentTimer=0;
    const el=$('#milestoneExperience');if(!el)return;el.classList.remove('active','release','live');el.setAttribute('aria-hidden','true');document.body.classList.remove('milestone-playing');previewCard=false;
  }

  function playCard(m,preview=false){
    inject();clearTimeout(currentTimer);previewCard=preview;
    const el=$('#milestoneExperience');
    $('#milestoneKicker').textContent=preview?'MILESTONE PREVIEW · THE FINAL WAIT':'THE FINAL WAIT';
    $('#milestoneNumber').textContent=m.label;$('#milestoneSubtitle').textContent=m.sub;$('#milestoneAccent').textContent=m.accent;
    $('#milestoneClose').style.display=preview?'inline-flex':'none';
    el.className=`milestone-experience active milestone-${m.id}`;el.setAttribute('aria-hidden','false');document.body.classList.add('milestone-playing');particles(36);cardAudioHit(1);
    if(m.duration)currentTimer=setTimeout(hideCard,m.duration);
  }

  async function ensureTickContext(){
    if(!soundEnabled())return null;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
    try{
      if(!tickCtx||tickCtx.state==='closed')tickCtx=new AC();
      if(tickCtx.state==='suspended')await tickCtx.resume();
      return tickCtx;
    }catch{return null}
  }

  async function tickSound(progress=0,rapid=false){
    const ctx=await ensureTickContext();if(!ctx)return;
    const now=ctx.currentTime;
    const master=ctx.createGain();
    const compressor=ctx.createDynamicsCompressor();
    compressor.threshold.value=-14;compressor.knee.value=8;compressor.ratio.value=5;compressor.attack.value=.002;compressor.release.value=.08;
    const base=rapid?1040+progress*980:920;
    const length=rapid?.032:.09;
    master.gain.setValueAtTime(.0001,now);
    master.gain.exponentialRampToValueAtTime(rapid?.48:.9,now+.002);
    master.gain.exponentialRampToValueAtTime(.0001,now+length);
    master.connect(compressor);compressor.connect(ctx.destination);
    [1,2.02].forEach((mul,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type=i?'triangle':'square';o.frequency.setValueAtTime(base*mul,now);o.frequency.exponentialRampToValueAtTime(base*mul*(rapid?1.11:.91),now+length);g.gain.value=i?.20:.68;o.connect(g);g.connect(master);o.start(now);o.stop(now+length+.01)});
    const noise=ctx.createBufferSource(),buffer=ctx.createBuffer(1,Math.max(1,Math.floor(ctx.sampleRate*.018)),ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);noise.buffer=buffer;const ng=ctx.createGain();ng.gain.setValueAtTime(rapid?.28:.44,now);ng.gain.exponentialRampToValueAtTime(.0001,now+.018);noise.connect(ng);ng.connect(compressor);noise.start(now);
  }

  function visualPulse(rapid=false){
    const hero=$('#hero');if(!hero)return;
    const cls=rapid?'finale-rapid-pulse':'finale-second-pulse';hero.classList.remove(cls);void hero.offsetWidth;hero.classList.add(cls);
  }

  function setFinaleScale(remaining){
    let scale=1;
    if(remaining<=FINAL_FIVE){
      if(remaining>MIN){
        const p=(FINAL_FIVE-remaining)/(FINAL_FIVE-MIN);
        scale=1+.085*clamp(p,0,1);
      }else if(remaining>15000){
        const p=(MIN-remaining)/45000;
        scale=1.085+.065*clamp(p,0,1);
      }else if(remaining>1000){
        const p=(15000-remaining)/14000;
        scale=1.15+.055*clamp(p,0,1);
      }else{
        const p=(1000-remaining)/1000;
        scale=1.205+.025*clamp(p,0,1);
      }
    }
    const vw=window.innerWidth||1920;
    const maxScale=vw<=700?1.075:vw<=900?1.105:1.23;
    scale=Math.min(scale,maxScale);
    const intensity=clamp((FINAL_FIVE-remaining)/FINAL_FIVE,0,1);
    let progressScale=1;
    if(remaining<=FINAL_FIVE){
      if(remaining>MIN){
        const p=(FINAL_FIVE-remaining)/(FINAL_FIVE-MIN);
        progressScale=1+.07*clamp(p,0,1);
      }else{
        const p=(MIN-remaining)/MIN;
        progressScale=1.07+.09*clamp(p,0,1);
      }
    }
    const progressMax=vw<=700?1.055:vw<=900?1.09:1.16;
    progressScale=Math.min(progressScale,progressMax);
    document.documentElement.style.setProperty('--finale-scale',String(scale));
    document.documentElement.style.setProperty('--finale-progress-scale',String(progressScale));
    document.documentElement.style.setProperty('--finale-intensity',String(intensity));
    document.documentElement.style.setProperty('--finale-glow',`${14+70*intensity}px`);
    document.documentElement.style.setProperty('--finale-gap',`${10+34*intensity}px`);
    document.documentElement.style.setProperty('--finale-title-opacity','1');
  }

  function startTitleColorFlow(){
    if(titleFlowRaf)return;
    titleFlowStartedAt=performance.now();
    const step=now=>{
      const title=$('#heroTitle');
      const active=Boolean(title&&document.body.classList.contains('final-five-active')&&document.body.classList.contains('finale-dynamic-copy')&&!document.body.classList.contains('finale-released'));
      if(!active){
        titleFlowRaf=0;
        if(title)title.style.removeProperty('background-position');
        return;
      }
      const cycle=3800;
      const phase=((now-titleFlowStartedAt)%cycle)/cycle;
      // Match the release-title motion exactly, but drive it inline so later CSS cannot freeze it.
      title.style.setProperty('background-position',`${(phase*220).toFixed(3)}% 50%`,'important');
      titleFlowRaf=requestAnimationFrame(step);
    };
    titleFlowRaf=requestAnimationFrame(step);
  }

  function stopTitleColorFlow(){
    if(titleFlowRaf)cancelAnimationFrame(titleFlowRaf);
    titleFlowRaf=0;
    const title=$('#heroTitle');
    if(title)title.style.removeProperty('background-position');
  }

  function updateFinaleCopy(remaining){
    const title=$('#heroTitle');
    const pill=$('#phasePill');
    const songEnded=remaining<=TICK_START;
    document.body.classList.toggle('finale-song-ended',songEnded&&remaining>0);
    const dynamicTitle=remaining<=FINAL_FIVE&&remaining>0;
    document.body.classList.toggle('finale-dynamic-copy',dynamicTitle);
    if(dynamicTitle)startTitleColorFlow();else stopTitleColorFlow();

    if(title){
      let text='ROAD TO LEONIDA';
      let forceBreak=false;
      if(remaining<=1000&&remaining>0)text='ONE SECOND TO LEONIDA';
      else if(remaining<=2000&&remaining>0)text='TWO SECONDS TO LEONIDA';
      else if(remaining<=3000&&remaining>0)text='THREE SECONDS TO LEONIDA';
      else if(remaining<=4000&&remaining>0)text='FOUR SECONDS TO LEONIDA';
      else if(remaining<=5000&&remaining>0)text='FIVE SECONDS TO LEONIDA';
      else if(remaining<=10000&&remaining>0){text='TEN SECONDS TO LEONIDA';forceBreak=true;}
      else if(remaining<=15000&&remaining>0)text='FIFTEEN SECONDS TO LEONIDA';
      else if(remaining<=30000&&remaining>0)text='30 SECONDS TO LEONIDA';
      else if(remaining<=MIN&&remaining>0)text='ONE MINUTE TO LEONIDA';
      else if(remaining<=2*MIN&&remaining>0)text='TWO MINUTES TO LEONIDA';
      else if(remaining<=3*MIN&&remaining>0)text='THREE MINUTES TO LEONIDA';
      else if(remaining<=4*MIN&&remaining>0)text='FOUR MINUTES TO LEONIDA';
      else if(remaining<=FINAL_FIVE&&remaining>0)text='FIVE MINUTES TO LEONIDA';
      if(forceBreak)title.innerHTML='TEN SECONDS TO<br>LEONIDA';else title.textContent=text;
    }
    if(pill){
      let label='THE FINAL WAIT';
      if(remaining<=MIN&&remaining>0)label='THE FINAL MINUTE';
      else if(remaining<=FINAL_FIVE&&remaining>0)label='5 MINUTES LEFT. STAY HERE.';
      else if(remaining<=15*MIN)label='THE LAST QUARTER HOUR';
      else if(remaining<=30*MIN)label='FINAL 30 MINUTES';
      else if(remaining<=HOUR)label='THE FINAL HOUR';
      pill.innerHTML=`<span class="phase-dot"></span> ${label}`;
    }
  }

  async function ensureMusicGraph(){
    if(!soundEnabled())return null;
    const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
    try{
      if(!musicCtx||musicCtx.state==='closed')musicCtx=new AC();
      if(!musicAnalyser){
        musicAnalyser=musicCtx.createAnalyser();
        musicAnalyser.fftSize=256;musicAnalyser.smoothingTimeConstant=.78;
        musicData=new Uint8Array(musicAnalyser.frequencyBinCount);
        finalMusicSource=musicCtx.createMediaElementSource(finalSong);
        sequenceMusicSource=musicCtx.createMediaElementSource(sequenceSong);
        finalMusicSource.connect(musicAnalyser);
        sequenceMusicSource.connect(musicAnalyser);
        musicAnalyser.connect(musicCtx.destination);
      }
      if(musicCtx.state==='suspended')await musicCtx.resume();
      return musicCtx;
    }catch(error){console.warn('Finale music analyser unavailable',error);return null}
  }

  function musicIsPlaying(){return !finalSong.paused||!sequenceSong.paused}

  function startVisualizer(){
    const canvas=$('#finaleVisualizer');if(!canvas||visualizerRaf)return;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    document.body.classList.add('finale-music-live');
    const resize=()=>{const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));ctx.setTransform(d,0,0,d,0,0)};
    visualizerResize=resize;resize();window.addEventListener('resize',resize,{passive:true});
    const loop=t=>{
      const r=canvas.getBoundingClientRect();ctx.clearRect(0,0,r.width,r.height);
      let energy=.045;
      if(musicAnalyser&&musicData&&musicCtx?.state==='running'&&musicIsPlaying()){
        musicAnalyser.getByteFrequencyData(musicData);
        let sum=0;const take=Math.min(52,musicData.length);for(let i=0;i<take;i++)sum+=musicData[i];energy=clamp(sum/(take*255),.025,1);
      }else if(document.body.classList.contains('finale-music-live')){
        energy=.16+Math.sin(t*.007)*.045+Math.sin(t*.013)*.025;
      }
      document.documentElement.style.setProperty('--music-energy',energy.toFixed(3));
      document.documentElement.style.setProperty('--music-scale',(1+energy*.06).toFixed(3));
      const bars=58,centerY=r.height*.52,maxH=Math.max(9,r.height*.43),gap=2,barW=Math.max(1.5,(r.width*.92/bars)-gap),startX=r.width*.04;
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<bars;i++){
        let amp=energy;
        if(musicData&&musicAnalyser&&musicIsPlaying()){
          const idx=Math.min(musicData.length-1,Math.floor(i/bars*musicData.length*.74));amp=musicData[idx]/255;
        }else{
          const waveA=(Math.sin(t*.009+i*.34)+1)*.5;
          const waveB=(Math.sin(t*.015-i*.21)+1)*.5;
          amp=clamp(.08+waveA*.28+waveB*.18,0,1);
        }
        const curve=Math.sin((i+1)/(bars+1)*Math.PI);const h=2+amp*maxH*(.28+.72*curve);const x=startX+i*((r.width*.92)/bars);
        const g=ctx.createLinearGradient(0,centerY-h,0,centerY+h);g.addColorStop(0,'rgba(119,96,255,.18)');g.addColorStop(.42,`rgba(119,96,255,${.32+amp*.5})`);g.addColorStop(.58,`rgba(242,63,178,${.36+amp*.56})`);g.addColorStop(1,'rgba(255,156,67,.16)');ctx.fillStyle=g;ctx.fillRect(x,centerY-h,barW,h*2);
      }
      ctx.restore();
      if(document.body.classList.contains('finale-music-live'))visualizerRaf=requestAnimationFrame(loop);else stopVisualizer();
    };
    visualizerRaf=requestAnimationFrame(loop);
  }

  function stopVisualizer(clear=true){
    if(visualizerRaf)cancelAnimationFrame(visualizerRaf);visualizerRaf=0;
    if(visualizerResize)window.removeEventListener('resize',visualizerResize);visualizerResize=null;
    document.body.classList.remove('finale-music-live');
    document.documentElement.style.removeProperty('--music-energy');document.documentElement.style.removeProperty('--music-scale');
    if(clear){const canvas=$('#finaleVisualizer'),ctx=canvas?.getContext('2d');if(canvas&&ctx)ctx.clearRect(0,0,canvas.width,canvas.height)}
  }

  async function unlockFinaleAudio(){
    await ensureMusicGraph();
    for(const audio of [finalSong,voiceSong,sequenceSong]){
      try{const old=audio.volume;audio.volume=0;await audio.play();audio.pause();audio.currentTime=0;audio.volume=old}catch{}
    }
    ensureTickContext();
  }

  async function syncFinalSong(remaining){
    if(!soundEnabled()){if(!finalSong.paused)finalSong.pause();return}
    if(remaining>FINAL_FIVE){if(!finalSong.paused)finalSong.pause();try{finalSong.currentTime=0}catch{};return}
    if(!document.body.classList.contains('finale-released')){await ensureMusicGraph();startVisualizer();}
    const duration=Number.isFinite(finalSong.duration)&&finalSong.duration>0?finalSong.duration:258.115918;
    const target=clamp((FINAL_FIVE-remaining)/1000,0,duration);
    if(remaining<=FINAL_SONG_END){return}
    const voiceDuration=Number.isFinite(voiceSong.duration)&&voiceSong.duration>0?voiceSong.duration:3.114667;
    const voiceActive=remaining<=VOICE_TRACK_START&&remaining>VOICE_TRACK_START-voiceDuration*1000;
    finalSong.volume=voiceActive?.44:.72;
    try{
      if(finalSong.paused){
        finalSong.currentTime=target;
        await finalSong.play();
      }
      // Deliberately no continuous currentTime correction: repeated seeking caused the old -01:34 glitch.
    }catch{}
  }

  async function syncVoiceSong(remaining){
    try{voiceSong.pause();voiceSong.currentTime=0}catch{}
    return;
  }

  async function syncSequenceSong(remaining){
    if(!soundEnabled()){if(!sequenceSong.paused)sequenceSong.pause();return}
    if(remaining>SEQUENCE_TRACK_START){if(!sequenceSong.paused)sequenceSong.pause();try{sequenceSong.currentTime=0}catch{};return}
    if(!document.body.classList.contains('finale-released')){await ensureMusicGraph();startVisualizer();}
    const target=Math.max(0,(SEQUENCE_TRACK_START-Math.max(0,remaining))/1000);
    try{
      if(sequenceSong.paused){sequenceSong.currentTime=target;await sequenceSong.play()}
      // Keep continuous playback untouched after the initial seek so the embedded -30/-15/-10 cues stay sample-aligned.
    }catch{}
  }

  function pauseFinaleAudio(reset=false,keepVisualizer=false){
    try{finalSong.pause();if(reset)finalSong.currentTime=0;finalSong.volume=.72}catch{}
    try{voiceSong.pause();if(reset)voiceSong.currentTime=0}catch{}
    try{sequenceSong.pause();if(reset)sequenceSong.currentTime=0}catch{}
    if(!keepVisualizer)stopVisualizer();
  }

  function enterFinalFive(remaining){
    if(finaleActive)return;
    finaleActive=true;document.body.classList.add('final-five-active');
    startVisualizer();
    window.dispatchEvent(new CustomEvent('tfw:finale-start',{detail:{remaining,preview:finalePreview}}));
  }

  function leaveFinalFive(){
    stopTitleColorFlow();
    finaleActive=false;
    document.body.classList.remove('final-five-active','finale-last-45','finale-last-40','finale-last-15','finale-last-10','finale-last-second','finale-scene-rush','finale-song-ended','finale-dynamic-copy');
    const title=$('#heroTitle');if(title)title.textContent='ROAD TO LEONIDA';
    ['--finale-scale','--finale-progress-scale','--finale-intensity','--finale-glow','--finale-gap','--finale-title-opacity'].forEach(v=>document.documentElement.style.removeProperty(v));
    pauseFinaleAudio(true);lastSecondTick=null;lastRapidBucket=null;lastSceneStepAt=0;sceneRushPrimed=false;document.documentElement.style.removeProperty('--finale-scene-transition');
  }

  function rapidIntervalFor(remaining){
    if(remaining>700)return 95;
    if(remaining>420)return 68;
    if(remaining>220)return 46;
    if(remaining>90)return 28;
    return 18;
  }

  function sceneIntervalFor(remaining){
    if(remaining>6500)return Infinity;
    if(remaining>5000)return 620-(6500-remaining)/1500*120;
    if(remaining>3000)return 500-(5000-remaining)/2000*190;
    if(remaining>1000)return 310-(3000-remaining)/2000*175;
    return 135-(1000-remaining)/1000*97;
  }

  function updateSceneRush(remaining,enabled){
    const active=enabled&&remaining<=6500&&remaining>0;
    document.body.classList.toggle('finale-scene-rush',active);
    if(!active){lastSceneStepAt=0;sceneRushPrimed=false;document.documentElement.style.removeProperty('--finale-scene-transition');return}
    const interval=Math.max(38,sceneIntervalFor(remaining));
    const transition=Math.max(32,Math.min(620,interval*.72));
    document.documentElement.style.setProperty('--finale-scene-transition',`${Math.round(transition)}ms`);
    const now=performance.now();
    if(!sceneRushPrimed){sceneRushPrimed=true;lastSceneStepAt=now;return}
    if(now-lastSceneStepAt>=interval){
      lastSceneStepAt=now;
      window.dispatchEvent(new CustomEvent('tfw:finale-scene-step',{detail:{remaining,interval}}));
    }
  }

  function showRelease(playAudio=true){
    stopTitleColorFlow();
    if(!releaseShown){
      releaseShown=true;finaleActive=false;
      document.body.classList.remove('final-five-active','finale-last-45','finale-last-40','finale-last-15','finale-last-10','finale-last-second','finale-scene-rush','finale-song-ended','finale-dynamic-copy');
      document.body.classList.add('finale-released');
      try{finalSong.pause()}catch{}
      const release=$('#finaleRelease');if(release){release.setAttribute('aria-hidden','false');release.classList.add('active')}
      $('#countdown')?.setAttribute('aria-hidden','true');$('#finaleFlash')?.classList.add('fire');startFireworks();
      window.dispatchEvent(new CustomEvent('tfw:finale-release'));
    }
    startVisualizer();
    if(playAudio){syncSequenceSong(0);}else pauseFinaleAudio(false,true);
  }

  function resetRelease({pauseAudio=true}={}){
    if(!releaseShown&&!document.body.classList.contains('finale-released'))return;
    releaseShown=false;document.body.classList.remove('finale-released');
    const release=$('#finaleRelease');if(release){release.classList.remove('active');release.setAttribute('aria-hidden','true')}
    $('#countdown')?.setAttribute('aria-hidden','false');$('#finaleFlash')?.classList.remove('fire');stopFireworks();
    if(pauseAudio)pauseFinaleAudio(false);
  }

  function updateFinale(remaining,{playAudio=true,playTicks=true}={}){
    remaining=Math.max(0,remaining);stageFor(remaining);updateFinaleCopy(remaining);
    if(remaining<=0){setFinaleScale(0);showRelease(playAudio);return}
    $('#countdown')?.setAttribute('aria-hidden','false');
    if(releaseShown)resetRelease({pauseAudio:true});
    if(remaining>FINAL_FIVE){if(finaleActive)leaveFinalFive();else pauseFinaleAudio(true);return}
    enterFinalFive(remaining);setFinaleScale(remaining);
    if(playAudio){syncFinalSong(remaining);syncVoiceSong(remaining);syncSequenceSong(remaining)}else pauseFinaleAudio(false);

    document.body.classList.toggle('finale-last-45',remaining<=PROGRESS_FOCUS_START);
    document.body.classList.toggle('finale-last-40',remaining<=TICK_START);
    document.body.classList.toggle('finale-last-15',remaining<=LAST_FIFTEEN);
    document.body.classList.toggle('finale-last-10',remaining<=10000);
    document.body.classList.toggle('finale-last-second',remaining<=1000);
    updateSceneRush(remaining,playTicks);

    if(playTicks&&remaining<=TICK_START&&remaining>1000){
      // First click fires exactly when song one ends, then every 1000ms from that handoff.
      const tickIndex=Math.floor(Math.max(0,TICK_START-remaining)/1000);
      if(tickIndex!==lastSecondTick){lastSecondTick=tickIndex;tickSound(clamp((TICK_START-remaining)/TICK_START,0,1),false);visualPulse(false)}
    }
    if(playTicks&&remaining<=1000){
      const interval=rapidIntervalFor(remaining);const bucket=Math.floor(remaining/interval);const key=`${interval}:${bucket}`;
      if(key!==lastRapidBucket){lastRapidBucket=key;const progress=1-clamp(remaining/1000,0,1);tickSound(progress,true);visualPulse(true)}
    }
  }

  function makeBurst(x,y,count=42,power=1){
    const palette=['#ffffff','#ff9c43','#f23fb2','#7760ff','#6fffe9'];
    for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2,s=(1.5+Math.random()*4.5)*power;
      fireworks.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,decay:.010+Math.random()*.014,size:.8+Math.random()*2.4,color:palette[(Math.random()*palette.length)|0],trail:[]});
    }
    if(fireworks.length>850)fireworks.splice(0,fireworks.length-850);
  }

  function startFireworks(){
    const canvas=$('#finaleFireworks');if(!canvas||fireworksRaf)return;const ctx=canvas.getContext('2d');if(!ctx)return;
    fireworks=[];fireworkNext=0;
    const resize=()=>{const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));ctx.setTransform(d,0,0,d,0,0)};
    resize();window.addEventListener('resize',resize,{passive:true});canvas._tfwResize=resize;
    const loop=t=>{
      const r=canvas.getBoundingClientRect();ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(4,3,8,.15)';ctx.fillRect(0,0,r.width,r.height);ctx.globalCompositeOperation='lighter';
      if(releaseShown&&t>=fireworkNext){
        const firstRush=fireworks.length<40;const side=Math.random()<.5?.25:.75;makeBurst(r.width*(side+(Math.random()-.5)*.24),r.height*(.18+Math.random()*.42),firstRush?58:34,firstRush?1.18:.94);fireworkNext=t+(firstRush?260+Math.random()*360:650+Math.random()*1050);
      }
      fireworks=fireworks.filter(p=>p.life>0.02);
      for(const p of fireworks){p.trail.push([p.x,p.y]);if(p.trail.length>6)p.trail.shift();p.x+=p.vx;p.y+=p.vy;p.vy+=.035;p.vx*=.992;p.life-=p.decay;ctx.globalAlpha=Math.max(0,p.life);ctx.strokeStyle=p.color;ctx.lineWidth=Math.max(.5,p.size*.5);ctx.beginPath();if(p.trail.length){ctx.moveTo(p.trail[0][0],p.trail[0][1]);for(const q of p.trail)ctx.lineTo(q[0],q[1]);ctx.lineTo(p.x,p.y);ctx.stroke()}ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill()}
      ctx.globalAlpha=1;
      if(releaseShown||fireworks.length)fireworksRaf=requestAnimationFrame(loop);else stopFireworks(false);
    };
    fireworksRaf=requestAnimationFrame(loop);
  }

  function stopFireworks(clear=true){
    if(fireworksRaf)cancelAnimationFrame(fireworksRaf);fireworksRaf=0;fireworks=[];
    const canvas=$('#finaleFireworks');if(canvas){if(canvas._tfwResize)window.removeEventListener('resize',canvas._tfwResize);canvas._tfwResize=null;if(clear){const c=canvas.getContext('2d');c?.clearRect(0,0,canvas.width,canvas.height)}}
  }

  function updateScrubVisual(remaining){
    const fraction=(SCRUB_MAX-clamp(remaining,0,SCRUB_MAX))/SCRUB_MAX;
    document.documentElement.style.setProperty('--scrub-progress',`${(fraction*100).toFixed(4)}%`);
    const readout=$('#finaleScrubReadout');
    if(readout)readout.textContent=remaining<=0?'00:00.000':formatRemaining(remaining,true);
  }

  function syncScrubber(remaining){
    previewPausedRemaining=Math.max(0,remaining);
    const scrub=$('#finaleScrubber');
    if(scrub)scrub.value=String(SCRUB_MAX-clamp(previewPausedRemaining,0,SCRUB_MAX));
    updateScrubVisual(previewPausedRemaining);
  }

  function setPreviewClock(remaining){
    window.__tfwPreviewRemainingMs=Math.max(0,remaining);
    syncScrubber(remaining);
    try{window.__tfwRefreshCountdown?.()}catch{}
  }

  function enterPreviewMode(remaining){
    finalePreview=true;document.body.classList.add('finale-previewing');$('#finalePreviewExit')?.removeAttribute('hidden');
    window.dispatchEvent(new CustomEvent('tfw:finale-start',{detail:{remaining,preview:true}}));
  }

  function clearPreviewRaf(){if(previewRaf)cancelAnimationFrame(previewRaf);previewRaf=0;previewPlaying=false}

  function setStaticPreview(remaining,{syncSlider=true}={}){
    inject();hideCard();clearPreviewRaf();enterPreviewMode(remaining);lastSecondTick=null;lastRapidBucket=null;
    previewPausedRemaining=clamp(remaining,0,SCRUB_MAX);window.__tfwPreviewRemainingMs=previewPausedRemaining;
    if(syncSlider)syncScrubber(previewPausedRemaining);else{const readout=$('#finaleScrubReadout');if(readout)readout.textContent=previewPausedRemaining<=0?'00:00.000':formatRemaining(previewPausedRemaining,true)}
    try{window.__tfwRefreshCountdown?.()}catch{}
    updateFinale(previewPausedRemaining,{playAudio:false,playTicks:false});
  }

  function startFinalePreview(startRemaining,{keepPanel=false}={}){
    inject();hideCard();clearPreviewRaf();
    if(!keepPanel)$('#milestonePreviewPanel').hidden=true;
    const start=clamp(startRemaining,0,SCRUB_MAX);enterPreviewMode(start);previewPlaying=true;previewStartRemaining=start;previewStartedAt=performance.now();lastSecondTick=null;lastRapidBucket=null;
    resetRelease({pauseAudio:true});pauseFinaleAudio(true);setPreviewClock(start);updateFinale(start,{playAudio:true,playTicks:true});
    const step=now=>{
      if(!finalePreview||!previewPlaying)return;
      const remaining=Math.max(0,previewStartRemaining-(now-previewStartedAt));setPreviewClock(remaining);updateFinale(remaining,{playAudio:true,playTicks:true});
      if(remaining>0)previewRaf=requestAnimationFrame(step);else{previewPlaying=false;previewPausedRemaining=0;}
    };
    if(start>0)previewRaf=requestAnimationFrame(step);else{showRelease(true);previewPlaying=false}
  }

  function pausePreviewPlayback(){
    if(!finalePreview)return;clearPreviewRaf();const current=Number(window.__tfwPreviewRemainingMs);if(Number.isFinite(current))previewPausedRemaining=current;pauseFinaleAudio(false);updateFinale(previewPausedRemaining,{playAudio:false,playTicks:false});syncScrubber(previewPausedRemaining);
  }

  function stopFinalePreview(restore=true){
    clearPreviewRaf();finalePreview=false;delete window.__tfwPreviewRemainingMs;
    $('#finalePreviewExit')?.setAttribute('hidden','');document.body.classList.remove('finale-previewing');pauseFinaleAudio(true);resetRelease({pauseAudio:true});leaveFinalFive();
    if(restore){try{window.__tfwRefreshCountdown?.()}catch{}}
  }

  function maybeTrigger(remaining,preview=false){
    stageFor(remaining);
    if(finalePreview||preview)return;
    updateFinale(remaining,{playAudio:true,playTicks:true});
    if(lastRemaining===null){lastRemaining=remaining;return}
    for(const m of milestones){
      if(lastRemaining>m.ms&&remaining<=m.ms){const key=`tfw_milestone_${m.id}_2026`;if(!storage.get(key)){storage.set(key,'1');playCard(m,false)}}
    }
    lastRemaining=remaining;
  }

  sequenceSong.addEventListener('ended',()=>{if(document.body.classList.contains('final-five-active')||document.body.classList.contains('finale-released'))startVisualizer();else stopVisualizer()});
  inject();
  ['pointerdown','keydown','touchstart'].forEach(ev=>window.addEventListener(ev,unlockFinaleAudio,{once:true,capture:true,passive:true}));
  window.addEventListener('tfw:countdown',e=>{const ms=Number(e.detail?.remaining);if(Number.isFinite(ms))maybeTrigger(ms,Boolean(e.detail?.preview))});
  window.addEventListener('tfw:sound-change',()=>{
    if(!soundEnabled()){
      document.body.classList.add('finale-music-live');
      startVisualizer();
      pauseFinaleAudio(false,true);
      return;
    }
    const remaining=finalePreview?Number(window.__tfwPreviewRemainingMs):lastRemaining;
    if(Number.isFinite(remaining)&&remaining<=FINAL_FIVE){startVisualizer();syncFinalSong(remaining);syncVoiceSong(remaining);syncSequenceSong(remaining)}
  });
  window.addEventListener('tfw:finale-audio-enable',()=>{
    const remaining=finalePreview?Number(window.__tfwPreviewRemainingMs):lastRemaining;
    if(Number.isFinite(remaining)&&remaining<=FINAL_FIVE){syncFinalSong(remaining);syncVoiceSong(remaining);syncSequenceSong(remaining)}
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!finalePreview&&Number.isFinite(lastRemaining)&&lastRemaining<=FINAL_FIVE){syncFinalSong(lastRemaining);syncVoiceSong(lastRemaining);syncSequenceSong(lastRemaining)}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(finalePreview)stopFinalePreview();else if(previewCard)hideCard()}});
  if(Number.isFinite(window.__tfwLastRemaining))maybeTrigger(window.__tfwLastRemaining,false);
})();
