/* Shared header controls for all secondary pages of The Final Wait.
   Uses the same sound state, audio asset and persistent master volume as home.
   Browser autoplay restrictions are respected: a user gesture resumes playback. */
(()=>{
 'use strict';
 const $=s=>document.querySelector(s);
 const get=k=>{try{return localStorage.getItem(k)}catch{return null}};
 const target=$('#topbar');
 if(!target)return;
 const audio=new Audio('assets/audio/background-v26.mp3');
 audio.preload='none';audio.loop=true;audio.playsInline=true;
 const FADE_MS=160;
 let playing=false;
 const isEnabled=()=>get('tfw_sound')!=='off';
 function syncSound(){
   const factor=window.__tfwMasterVolume?.()??(isEnabled()?1:0);
   audio.volume=Math.max(0,Math.min(1,.22*factor));
   if(!isEnabled()){audio.pause();return}
   if(!document.hidden)play();
 }
 async function play(){
   if(!isEnabled()||document.hidden||playing)return;
   // The homepage soundtrack follows wall time; resume from that same
   // timeline when navigating between full-page routes.
   const release=Date.parse('2026-11-19T00:00:00+01:00');
   if(Date.now()>=release-30*60*1000){audio.pause();return}
   try{
     if(audio.readyState>=1&&Number.isFinite(audio.duration)&&audio.duration>0){
       const seconds=(Date.now()-(release-30*60*1000))/1000;
       const offset=((seconds%audio.duration)+audio.duration)%audio.duration;
       if(Math.abs(audio.currentTime-offset)>2)audio.currentTime=offset;
     }
     playing=true;await audio.play();
   }catch{playing=false}
 }
 audio.addEventListener('pause',()=>{playing=false});
 audio.addEventListener('loadedmetadata',()=>{if(isEnabled())play()});
 audio.addEventListener('error',()=>{
   if(audio.dataset.fallback)return;
   audio.dataset.fallback='1';audio.src='assets/audio/background-live.mp3';
   audio.load();play();
 });
 const headerNav=$('.tfw-secondary-nav');
 if(headerNav){
   const share=$('#tfwPageShare');
   share?.addEventListener('click',()=>{
     const url=location.href,title=document.title;
     if(navigator.share){navigator.share({title,url}).catch(()=>{});return}
     if(navigator.clipboard?.writeText){
       navigator.clipboard.writeText(url).then(()=>{
         const label=share.textContent;share.textContent='LINK COPIED';
         setTimeout(()=>share.textContent=label,1600);
       }).catch(()=>window.open('https://x.com/intent/post?url='+encodeURIComponent(url),'_blank','noopener'));
     }else window.open('https://x.com/intent/post?url='+encodeURIComponent(url),'_blank','noopener');
   });
 }
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
 window.addEventListener('tfw:volume-change',syncSound);
 window.addEventListener('tfw:sound-change',syncSound);
 document.addEventListener('visibilitychange',()=>document.hidden?audio.pause():syncSound());
 for(const type of ['pointerdown','keydown','touchstart']){
   document.addEventListener(type,()=>{if(isEnabled())syncSound()},{passive:true});
 }
 audio.volume=.22*(window.__tfwMasterVolume?.()??1);
 // Defer playback until metadata is available or the first gesture;
 // autoplay may be rejected by the browser, and that is expected.
 if(isEnabled()){audio.load();play()}
})();
