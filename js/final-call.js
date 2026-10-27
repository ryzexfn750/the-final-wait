/* THE FINAL WAIT — Final Call cinematic sequence.
 * Every threshold is expressed in milliseconds REMAINING, not wall-clock
 * time since the last animation frame. Supports both live and preview clocks.
 */
(()=>{
  'use strict';
  const SECOND=1000,MINUTE=60*SECOND;
  const AUDIO_START=29*MINUTE+55_500;      // -29:55.500
  const IMAGE_START=6*MINUTE+24_050;       // -06:24.050 nominal takeover marker
  const ENTER_START=6*MINUTE+27_000;       // -06:27.000: begin both dissolves
  const ENTER_END=6*MINUTE+23_700;         // -06:23.700: enter dissolve complete
  const RETURN_START=5*MINUTE+6_500;       // -05:06.500
  const RETURN_END=5*MINUTE+4_000;         // -05:04.000
  const BEEP_FIRST=5*MINUTE+6_000;         // -05:06.000, first whole-second beep
  const BEEP_LAST=5*MINUTE+1_000;          // -05:01.000, last beep (-05:00 excluded)
  const PRELOAD_IMAGES=7*MINUTE;
  const PRELOAD_AUDIO=30*MINUTE+15_000;
  // BG_06, BG_07, BG_10 and BG_13 stay in assets but are never selected.
  const IMAGE_IDS=Object.freeze([1,2,3,4,5,8,9,11,12,14]);
  const COUNT=IMAGE_IDS.length, IMAGE_DURATION=(ENTER_START-RETURN_START)/COUNT;
  const AUDIO_PATH='assets/audio/final-call-29m55s.mp3';
  const root=document.documentElement, body=document.body;
  const hero=document.getElementById('hero');
  if(!hero)return;
  const progress=clamp=>Math.min(1,Math.max(0,clamp));
  const mobile=()=>matchMedia('(max-width:700px)').matches;
  const pathFor=n=>`assets/final-call/${mobile()?'mobile':'desktop'}/final-call-${String(n).padStart(2,'0')}.webp`;
  const audio=new Audio();
  audio.preload='none'; audio.playsInline=true; audio.loop=false; audio.volume=.72*(window.__tfwMasterVolume?.()??1);
  window.__tfwFinalCallAudio=audio;
  let audioPrimed=false,audioStartPending=false,playPromise=null;
  let soundRetryAt=0,lastAudioCheck=-Infinity;
  let lastBeepSecond=null;
  let lastRemaining=Infinity,preview=false;
  let imagesPrimed=false,shuffle=null,imageJobs=[];
  const slotResolvers=[];
  const slotReady=Array.from({length:COUNT},(_,i)=>new Promise(resolve=>{slotResolvers[i]=resolve}));
  let currentSlot=-1,pendingImageToken=0;
  let inWindow=false,restoring=false;
  let front=0;
  const layers=[];
  // One common opacity envelope preserves exact countdown-driven fades
  // while the two children retain independent smooth photo crossfades.
  const sceneStack=document.createElement('div');
  sceneStack.className='final-call-layer-stack';
  sceneStack.setAttribute('aria-hidden','true');
  hero.insertBefore(sceneStack,document.querySelector('#hero .hero-shade'));
  for(let i=0;i<2;i++){
    const layer=document.createElement('div');
    layer.className='scene final-call-scene';
    layer.setAttribute('aria-hidden','true');
    layer.id='finalCallScene'+(i?'B':'A');
    sceneStack.appendChild(layer);
    layers.push(layer);
  }

  function soundEnabled(){
    try{return localStorage.getItem('tfw_sound')!=='off'}catch{return true}
  }
  function canPlayAudio(){
    return soundEnabled()&&(!preview||window.__tfwPreviewPlaying===true);
  }
  function randomOrder(){
    const order=IMAGE_IDS.slice();
    for(let i=order.length-1;i>0;i--){
      let r;
      if(window.crypto?.getRandomValues){const a=new Uint32Array(1);window.crypto.getRandomValues(a);r=a[0]/4294967296}
      else r=Math.random();
      const j=Math.floor(r*(i+1));[order[i],order[j]]=[order[j],order[i]];
    }
    return order;
  }
  function preloadImages(){
    if(imagesPrimed)return;
    imagesPrimed=true;
    shuffle=randomOrder();
    // Lazy decode, capped concurrency. The actual sequence is already
    // randomized and contains every image exactly once.
    let next=0;
    const worker=async()=>{
      while(next<COUNT){
        const slot=next++,img=new Image();
        img.decoding='async';img.src=pathFor(shuffle[slot]);
        const task=typeof img.decode==='function'?img.decode():new Promise((resolve,reject)=>{
          if(img.complete){img.naturalWidth?resolve():reject(new Error('Image unavailable'))}
          else {img.addEventListener('load',resolve,{once:true});img.addEventListener('error',reject,{once:true})}
        });
        imageJobs[slot]=task.then(()=>img).catch(error=>{
          console.warn('Final Call image could not be decoded:',shuffle[slot],error);
          return null;
        });
        // Even if the user jumps to a late slot, it waits for the bounded
        // decode queue instead of dropping that screenshot permanently.
        slotResolvers[slot](imageJobs[slot]);
        await imageJobs[slot];
      }
    };
    for(let i=0;i<Math.min(3,COUNT);i++)worker();
  }
  function selectImage(slot){
    if(!shuffle)preloadImages();
    if(slot===currentSlot)return;
    currentSlot=slot;
    const token=++pendingImageToken;
    const id=shuffle[slot];
    const src=pathFor(id);
    const incoming=layers[1-front],outgoing=layers[front];
    const job=slotReady[slot].then(promise=>promise);
    job.then(img=>{
      if(token!==pendingImageToken||!inWindow||!img)return;
      incoming.style.backgroundImage=`url("${src}")`;
      // Move the photograph downward to retain faces near the top edge.
      // background-size:cover guarantees there can be no uncovered bands.
      incoming.style.backgroundPosition=mobile()?'center 10%':'center 18%';
      incoming.classList.add('active');
      outgoing.classList.remove('active');
      front=1-front;
      body.dataset.tfwFinalCallImage=String(id);
    });
  }
  function resetImages(){
    ++pendingImageToken;
    currentSlot=-1;
    layers.forEach(layer=>layer.classList.remove('active'));
    body.removeAttribute('data-tfw-final-call-image');
  }
  function smoothstep(value){
    const p=progress(value);
    return p*p*(3-2*p);
  }
  function updateImages(remaining){
    if(remaining>ENTER_START||remaining<=RETURN_END){
      if(inWindow){
        inWindow=false;restoring=false;
        body.classList.remove('tfw-final-call-active','tfw-final-call-restoring');
        body.style.removeProperty('--tfw-final-call-visible');
        resetImages();
      }
      return;
    }
    if(!imagesPrimed)preloadImages();
    if(!inWindow){
      inWindow=true;
      body.style.setProperty('--tfw-final-call-visible','0');
      body.classList.add('tfw-final-call-active');
    }
    // Exact entry envelope (-06:27.000 through -06:23.700) for every UI
    // element and the entire photo stack, including while preview scrubbing.
    const enter=smoothstep((ENTER_START-remaining)/(ENTER_START-ENTER_END));
    const restore=remaining<=RETURN_START
      ?smoothstep((RETURN_START-remaining)/(RETURN_START-RETURN_END)):0;
    const visibility=enter*(1-restore);
    body.style.setProperty('--tfw-final-call-visible',visibility.toFixed(5));
    if(remaining<=RETURN_START){
      if(!restoring){restoring=true;body.classList.add('tfw-final-call-restoring')}
      // Keep the last temporary image while it dissolves into normal scenery.
    }else{
      if(restoring){restoring=false;body.classList.remove('tfw-final-call-restoring')}
      const slot=Math.min(COUNT-1,Math.floor((ENTER_START-remaining)/IMAGE_DURATION));
      selectImage(Math.max(0,slot));
    }
  }

  function playBeep(){
    window.__tfwPlayCountdownTick?.();
  }
  function updateBeep(remaining,previous){
    if(remaining>previous+1000)lastBeepSecond=null; // backward preview seek
    if(!canPlayAudio()||!Number.isFinite(previous))return;
    // Never emit catch-up bursts during seeks, tab stalls or long frame gaps.
    if(remaining>=previous||previous-remaining>250)return;
    const boundary=Math.ceil(remaining/SECOND)*SECOND;
    if(boundary<BEEP_LAST||boundary>BEEP_FIRST)return;
    if(previous>=boundary&&remaining<=boundary&&lastBeepSecond!==boundary){
      lastBeepSecond=boundary;
      playBeep();
    }
  }

  function primeAudio(){
    if(audioPrimed)return;
    audioPrimed=true;
    audio.src=AUDIO_PATH;
    audio.preload='metadata';
    audio.load();
  }
  function pauseAudio(){
    if(!audio.paused)audio.pause();
    audioStartPending=false;
  }
  function audioOffset(remaining){return (AUDIO_START-remaining)/1000}
  function audioWindow(remaining){
    if(remaining>AUDIO_START)return false;
    // The audio stops at its actual end; never overlap the final-five track.
    const duration=Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:1488.1333333333;
    return audioOffset(remaining)<Math.min(duration, (AUDIO_START-5*MINUTE)/1000);
  }
  function tryStartAudio(remaining,force=false){
    if(!canPlayAudio()||!audioWindow(remaining)){pauseAudio();return}
    primeAudio();
    const target=Math.max(0,audioOffset(remaining));
    if(audio.readyState>=1 && Math.abs(audio.currentTime-target)>.15){
      try{audio.currentTime=target}catch{}
    }else if(audio.readyState<1){
      // HTMLMediaElement retains a pending seek if metadata is not ready.
      try{audio.currentTime=target}catch{}
    }
    if(audio.paused&&!playPromise&&(force||performance.now()>=soundRetryAt)){
      audioStartPending=true;
      try{
        playPromise=Promise.resolve(audio.play()).then(()=>{
          audioStartPending=false;
          if(!canPlayAudio()||!audioWindow(lastRemaining)){pauseAudio();return;}
          // Synchronize even if the first play promise took time to resolve.
          const actual=audioOffset(lastRemaining);
          if(Number.isFinite(actual)&&Math.abs(audio.currentTime-actual)>.18)audio.currentTime=actual;
          window.dispatchEvent(new CustomEvent('tfw:final-call-audio-play'));
        }).catch(()=>{audioStartPending=false;soundRetryAt=performance.now()+4500})
          .finally(()=>{playPromise=null});
      }catch{
        audioStartPending=false;playPromise=null;soundRetryAt=performance.now()+4500;
      }
    }
  }
  function updateAudio(remaining,force=false){
    if(remaining>PRELOAD_AUDIO){pauseAudio();return}
    primeAudio();
    if(!audioWindow(remaining)||!canPlayAudio()){pauseAudio();return}
    const t=performance.now();
    if(!force&&t-lastAudioCheck<220)return;
    lastAudioCheck=t;
    const target=Math.max(0,audioOffset(remaining));
    if(!audio.paused&&audio.readyState>=1&&Math.abs(audio.currentTime-target)>.27){
      try{audio.currentTime=target}catch{}
    }
    if(audio.paused)tryStartAudio(remaining,force);
  }
  function synchronize(remaining,previewClock=false,force=false){
    if(!Number.isFinite(remaining))return;
    const previous=lastRemaining;
    lastRemaining=remaining;preview=previewClock;
    if(remaining<=PRELOAD_IMAGES && remaining>RETURN_END)preloadImages();
    updateImages(remaining);
    updateBeep(remaining,previous);
    updateAudio(remaining,force);
  }
  window.addEventListener('tfw:countdown',e=>{
    const v=Number(e.detail?.remaining);
    if(Number.isFinite(v))synchronize(v,Boolean(e.detail?.preview));
  });
  window.addEventListener('tfw:volume-change',()=>{
    audio.volume=.72*(window.__tfwMasterVolume?.()??1);
  });
  window.addEventListener('tfw:sound-change',e=>{
    if(e.detail?.enabled===false){pauseAudio();return}
    synchronize(lastRemaining,preview,true);
  });
  audio.addEventListener('loadedmetadata',()=>{
    if(audioWindow(lastRemaining)&&canPlayAudio())tryStartAudio(lastRemaining,true);
  });
  audio.addEventListener('ended',()=>pauseAudio());
  ['pointerdown','keydown','touchstart'].forEach(name=>{
    window.addEventListener(name,()=>{
      if(audioWindow(lastRemaining)&&canPlayAudio()&&audio.paused){
        soundRetryAt=0;tryStartAudio(lastRemaining,true);
      }
    },{capture:true,passive:true});
  });
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)synchronize(lastRemaining,preview,true);
  });
  window.addEventListener('resize',()=>{
    // Orientation changes load the matching rasterization for the active card.
    if(inWindow&&currentSlot>=0){const slot=currentSlot;currentSlot=-1;selectImage(slot)}
  },{passive:true});
  const initial=Number(window.__tfwPreviewRemainingMs??window.__tfwLastRemaining);
  if(Number.isFinite(initial))synchronize(initial,Number.isFinite(Number(window.__tfwPreviewRemainingMs)));
  window.__tfwFinalCallDebug={
    AUDIO_START,IMAGE_START,ENTER_START,ENTER_END,RETURN_START,RETURN_END,
    BEEP_FIRST,BEEP_LAST,IMAGE_DURATION,COUNT,
    getOrder:()=>shuffle?.slice()||[],getSlot:()=>currentSlot,getAudio:()=>audio,
    sync:synchronize
  };
})();
