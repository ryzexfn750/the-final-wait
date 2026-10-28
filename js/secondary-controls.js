/* The Final Wait — functional secondary-page controls and synchronized
   soundtrack. Browser autoplay policies still require a user gesture when
   navigating to a new document; never claim guaranteed seamless playback. */
(()=>{
 'use strict';
 const $=selector=>document.querySelector(selector);
 const get=key=>{try{return localStorage.getItem(key)}catch{return null}};
 const root=$('#topbar');
 if(!root)return;
 const embedded=new URLSearchParams(location.search).has('tfw_embed');
 const MINUTE=60000, RELEASE_FALLBACK=Date.parse('2026-11-19T00:00:00+01:00');
 function releaseEpoch(){
   const zone=get('tfw_timezone')||'Europe/Rome';
   if(zone==='Europe/Rome')return RELEASE_FALLBACK;
   try{
     const wall=Date.UTC(2026,10,19,0,0,0);
     const formatter=new Intl.DateTimeFormat('en-US',{
       timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',
       hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
     });
     let guess=wall;
     for(let i=0;i<4;i++){
       const components=Object.fromEntries(formatter.formatToParts(new Date(guess))
         .filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
       guess-=Date.UTC(components.year,components.month-1,components.day,
         components.hour,components.minute,components.second)-wall;
     }
     return guess;
   }catch{return RELEASE_FALLBACK}
 }
 const TRACKS={
   ambient:{src:'assets/audio/background-v26.mp3',base:.22,loop:true},
   call:{src:'assets/audio/final-call-29m55s.mp3',base:.72,loop:false},
   finale:{src:'assets/audio/final-5-minutes.mp3',base:.72,loop:false}
 };
 const isEnabled=()=>get('tfw_sound')!=='off';
 const gain=()=>window.__tfwMasterVolume?.()??(isEnabled()?1:0);
 let audio=null,activeTrack=null,playPending=null,autoplayBlocked=false,lastSyncAt=0;
 function selection(){
   const remaining=releaseEpoch()-Date.now();
   if(remaining<=0)return null;
   if(remaining<=5*MINUTE)return {
     id:'finale',at:(5*MINUTE-remaining)/1000
   };
   const callStart=29*MINUTE+55500;
   if(remaining<=callStart)return {id:'call',at:(callStart-remaining)/1000};
   return {id:'ambient',at:(Date.now()-(releaseEpoch()-30*MINUTE))/1000};
 }
 function seek(where){
   if(!audio||!Number.isFinite(audio.duration)||audio.duration<=0)return;
   const d=audio.duration;
   const position=audio.loop?((where%d)+d)%d:
     Math.max(0,Math.min(Math.max(0,d-.09),where));
   if(!Number.isFinite(position))return;
   let distance=Math.abs(audio.currentTime-position);
   if(audio.loop)distance=Math.min(distance,Math.abs(d-distance));
   if(distance>.65){try{audio.currentTime=position}catch{}}
 }
 function setVolume(){
   if(audio&&activeTrack){
     audio.volume=Math.max(0,Math.min(1,TRACKS[activeTrack].base*gain()));
   }
 }
 function play(){
   if(embedded||!audio||!activeTrack||!isEnabled()||!audio.paused||playPending)return;
   const instance=audio;
   let request;
   try{request=instance.play()}catch(error){request=Promise.reject(error)}
   playPending=Promise.resolve(request).then(()=>{
     if(audio===instance)autoplayBlocked=false;
   }).catch(()=>{
     if(audio===instance)autoplayBlocked=true;
   }).finally(()=>{if(audio===instance)playPending=null});
 }
 function changeTrack(next){
   if(audio){try{audio.pause()}catch{}}
   activeTrack=next;
   autoplayBlocked=false;
   playPending=null;
   if(!next){audio=null;return}
   const track=TRACKS[next];
   audio=new Audio(track.src);
   audio.preload='metadata';
   audio.loop=track.loop;
   audio.playsInline=true;
   audio.addEventListener('loadedmetadata',()=>{
     const current=selection();
     if(audio&&current?.id===activeTrack)seek(current.at);
   });
   audio.addEventListener('error',()=>{
     if(activeTrack!=='ambient'||audio?.dataset.fallback==='1')return;
     audio.dataset.fallback='1';
     audio.src='assets/audio/background-live.mp3';
     audio.load();
   });
 }
 function syncSound(forceGesture=false){
   if(embedded)return;
   const current=selection();
   if(!isEnabled()||!current){
     if(audio&&!audio.paused)audio.pause();
     if(!current&&activeTrack)changeTrack(null);
     return;
   }
   if(activeTrack!==current.id||!audio)changeTrack(current.id);
   setVolume();
   seek(current.at);
   if(forceGesture||!autoplayBlocked)play();
 }
 // Shared on-page Share dialog is initialized by secondary-share.js.
 $('#tfwPageFullscreen')?.addEventListener('click',async()=>{
   try{
     if(document.fullscreenElement)await document.exitFullscreen();
     else await document.documentElement.requestFullscreen();
   }catch{}
 });
 if(!document.documentElement.requestFullscreen){
   $('#tfwPageFullscreen')?.setAttribute('hidden','');
 }
 const menu=$('#tfwPageMenu'),drawer=$('#tfwPageDrawer');
 menu?.addEventListener('click',()=>{
   const open=drawer.hidden;
   drawer.hidden=!open;menu.setAttribute('aria-expanded',String(open));
 });
 drawer?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
   drawer.hidden=true;menu?.setAttribute('aria-expanded','false');
 }));
 document.addEventListener('pointerdown',e=>{
   if(drawer&&!drawer.hidden&&!drawer.contains(e.target)&&e.target!==menu){
     drawer.hidden=true;menu?.setAttribute('aria-expanded','false');
   }
 });
 window.addEventListener('tfw:volume-change',event=>{
   setVolume();
   if(event.detail?.enabled)syncSound(true);
   else if(audio)audio.pause();
 });
 window.addEventListener('tfw:sound-change',event=>{
   if(event.detail?.enabled)syncSound(true);
   else if(audio)audio.pause();
 });
 document.addEventListener('visibilitychange',()=>{
   // Background audio must continue in minimized or background tabs.
   // Only visual rendering is throttled by document.hidden.
   if(!embedded&&isEnabled())syncSound();
 });
 for(const eventName of ['pointerdown','keydown','touchstart']){
   document.addEventListener(eventName,()=>{if(isEnabled())syncSound(true)},{passive:true,capture:true});
 }
 window.addEventListener('pageshow',()=>syncSound());
 if(isEnabled())syncSound();
 setInterval(()=>syncSound(),3000);
})();
