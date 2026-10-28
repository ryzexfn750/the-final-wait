/* Consistent The Final Wait controls and soundtrack for internal pages.
   Runs only on archive / article routes, not on the homepage.
   Autoplay is attempted, but a real gesture is required when blocked by
   browser policy. Always retains the user's master-volume preference. */
(()=>{
 'use strict';
 const $=s=>document.querySelector(s);
 const store={
   get:k=>{try{return localStorage.getItem(k)}catch{return null}},
   set:(k,v)=>{try{localStorage.setItem(k,v)}catch{}}
 };
 const minute=60000;
 const standardRelease=new Date('2026-11-19T00:00:00+01:00').getTime();
 function releaseEpoch(){
   const zone=store.get('tfw_timezone')||'Europe/Rome';
   if(zone==='Europe/Rome')return standardRelease;
   try{
     const target=Date.UTC(2026,10,19,0,0,0);
     const dtf=new Intl.DateTimeFormat('en-US',{
       timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',
       hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
     });
     let guess=target;
     for(let i=0;i<4;i++){
       const parts=Object.fromEntries(dtf.formatToParts(new Date(guess))
         .filter(part=>part.type!=='literal').map(part=>[part.type,Number(part.value)]));
       guess-=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute,parts.second)-target;
     }
     return guess;
   }catch{return standardRelease}
 }
 const TRACKS={
   ambient:{src:'assets/audio/background-v26.mp3',base:.22,loop:true},
   call:{src:'assets/audio/final-call-29m55s.mp3',base:.72,loop:false},
   finale:{src:'assets/audio/final-5-minutes.mp3',base:.72,loop:false}
 };
 const callStart=29*minute+55500;
 let activeId=null,player=null,playPending=null,blocked=false,lastResync=0;
 let enabled=store.get('tfw_sound')!=='off';
 function master(){return window.__tfwMasterVolume?.()??1}
 function phase(){
   const remaining=releaseEpoch()-Date.now();
   if(remaining<=0)return null;
   if(remaining<=5*minute)return {
     id:'finale',position:(5*minute-remaining)/1000
   };
   if(remaining<=callStart)return {
     id:'call',position:(callStart-remaining)/1000
   };
   // Use the same synchronized ambient loop as on the countdown.
   return {id:'ambient',position:(Date.now()-(releaseEpoch()-30*minute))/1000};
 }
 function tearDown(){
   if(player){try{player.pause()}catch{}}
   player=null;activeId=null;playPending=null;blocked=false;
 }
 function syncVolume(){
   if(player&&activeId)player.volume=Math.max(0,Math.min(1,TRACKS[activeId].base*master()));
 }
 function seek(audio,at){
   if(!Number.isFinite(audio.duration)||audio.duration<=0)return;
   const d=audio.duration;
   let target=at;
   if(audio.loop)target=((at%d)+d)%d;
   else target=Math.max(0,Math.min(Math.max(0,d-.08),at));
   if(!Number.isFinite(target))return;
   let drift=Math.abs(audio.currentTime-target);
   if(audio.loop)drift=Math.min(drift,Math.abs(d-drift));
   if(drift>.65)try{audio.currentTime=target}catch{}
 }
 function attempt(){
   if(!enabled||!player||!activeId)return;
   if(!player.paused)return;
   if(playPending)return;
   const current=player;
   let task;
   try{task=current.play()}catch(error){task=Promise.reject(error)}
   playPending=Promise.resolve(task).then(()=>{
     if(player!==current)return;
     blocked=false;
   }).catch(()=>{
     if(player!==current)return;
     blocked=true;
     $('#soundButton')?.setAttribute('title','Click SOUND to enable soundtrack');
   }).finally(()=>{
     if(player===current)playPending=null;
   });
 }
 function sync({gesture=false}={}){
   const selection=phase();
   if(!enabled||!selection){
     if(player&&!player.paused)player.pause();
     if(!selection)tearDown();
     return;
   }
   if(!player||activeId!==selection.id){
     tearDown();
     activeId=selection.id;
     const track=TRACKS[activeId];
     player=new Audio(track.src);
     player.preload='metadata';
     player.loop=track.loop;
     player.playsInline=true;
     player.addEventListener('loadedmetadata',()=>{
       if(player&&selection.id===activeId){const latest=phase();if(latest&&latest.id===activeId)seek(player,latest.position)}
     });
     player.addEventListener('error',()=>{
       if(activeId==='ambient'&&player?.dataset.fallback!=='1'){
         player.dataset.fallback='1';
         player.src='assets/audio/background-live.mp3';
         player.load();
         if(enabled)attempt();
       }
     });
   }
   syncVolume();
   seek(player,selection.position);
   if(!blocked||gesture)attempt();
 }
 function boot(){
   const nav=$('.tfw-subpage-topbar');
   if(!nav)return;
   const menu=$('#mobileMenu'),button=$('#menuButton');
   const closeMenu=()=>{
     if(!menu||!button)return;
     menu.hidden=true;
     button.setAttribute('aria-expanded','false');
   };
   button?.addEventListener('click',event=>{
     event.stopPropagation();
     menu.hidden=!menu.hidden;
     button.setAttribute('aria-expanded',String(!menu.hidden));
   });
   menu?.addEventListener('click',event=>{
     if(event.target.closest('a,button'))closeMenu();
   });
   document.addEventListener('pointerdown',event=>{
     if(menu&&!menu.hidden&&!menu.contains(event.target)&&!button?.contains(event.target))closeMenu();
   },{passive:true});
   document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu()});
   const fullscreen=async()=>{
     try{
       if(document.fullscreenElement)await document.exitFullscreen();
       else await document.documentElement.requestFullscreen?.();
     }catch(error){console.warn('Fullscreen unavailable:',error)}
   };
   for(const id of ['fullscreenButton','mobileFullscreenButton']){
     $('#'+id)?.addEventListener('click',fullscreen);
   }
   function showShare(){
     closeMenu();
     const modal=$('#tfwSubpageShare');
     if(!modal)return;
     modal.hidden=false;
     modal.querySelector('[data-share-action="copy"]')?.focus();
   }
   async function copyLink(){
     try{
       await navigator.clipboard.writeText(location.href);
       const value=$('#tfwSubpageShareStatus');
       if(value)value.textContent='LINK COPIED';
     }catch{
       const value=$('#tfwSubpageShareStatus');
       if(value)value.textContent='COPY THE ADDRESS FROM YOUR BROWSER';
     }
   }
   for(const id of ['shareButton','mobileShareButton']){
     $('#'+id)?.addEventListener('click',showShare);
   }
   $('#tfwSubpageShareClose')?.addEventListener('click',()=>{$('#tfwSubpageShare').hidden=true});
   $('#tfwSubpageShare')?.addEventListener('click',event=>{
     if(event.target.id==='tfwSubpageShare')event.target.hidden=true;
     const action=event.target.closest('[data-share-action]')?.dataset.shareAction;
     if(action==='copy')copyLink();
     if(action==='native'){
       if(navigator.share)navigator.share({title:document.title,url:location.href}).catch(()=>{});
       else copyLink();
     }
     if(action==='x')window.open(
       'https://x.com/intent/post?url='+encodeURIComponent(location.href),
       '_blank','noopener,noreferrer');
     if(action==='whatsapp')window.open(
       'https://wa.me/?text='+encodeURIComponent(document.title+' '+location.href),
       '_blank','noopener,noreferrer');
   });
   document.addEventListener('keydown',event=>{
     if(event.key==='Escape'&&$('#tfwSubpageShare'))$('#tfwSubpageShare').hidden=true;
   });
   // Keep the same music volume and mute on all pages.
   window.addEventListener('tfw:sound-change',event=>{
     enabled=Boolean(event.detail?.enabled);
     sync({gesture:enabled});
   });
   window.addEventListener('tfw:volume-change',event=>{
     enabled=Boolean(event.detail?.enabled);
     if(enabled&&(!player||player.paused))sync({gesture:true});
     else if(!enabled&&player)player.pause();
     syncVolume();
   });
   // A navigation click cannot guarantee autoplay on the next document.
   // A new real gesture permits resuming if the browser rejected autoplay.
   const gesture=event=>{
     if(event?.target?.closest?.('#soundButton,#mobileSoundButton'))return;
     if(enabled)sync({gesture:true});
   };
   for(const eventName of ['pointerdown','keydown','touchstart']){
     document.addEventListener(eventName,gesture,{capture:true,passive:true});
   }
   window.addEventListener('pageshow',()=>{if(enabled)sync()});
   document.addEventListener('visibilitychange',()=>{
     if(!document.hidden&&enabled)sync();
   });
   sync();
   setInterval(()=>{
     if(document.hidden)return;
     sync();
   },2500);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
})();
