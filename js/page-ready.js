/* Only reveal article/archive documents when their initial data and
   visible hero/cover media are decoded. The remaining images stay lazy. */
(()=>{
 'use strict';
 const page=document.body;
 const overlay=document.getElementById('tfwPageLoader');
 const title=overlay?.querySelector('.tfw-page-loader-caption');
 const meter=overlay?.querySelector('.route-loader-track');
 const fill=meter?.querySelector('i');
 const updateProgress=value=>{
   const n=Math.max(0,Math.min(100,Math.round(value)));
   window.__tfwPageLoadProgress=n;
   if(meter)meter.setAttribute('aria-valuenow',String(n));
   if(fill)fill.style.transform='scaleX('+(n/100)+')';
 };
 updateProgress(5);
 const finish=(error)=>{
   if(error){
     if(title)title.textContent='COULD NOT LOAD THIS PAGE';
     if(overlay){
       const retry=overlay.querySelector('.tfw-page-loader-retry');
       if(retry)retry.hidden=false;
     }
     document.documentElement.classList.remove('tfw-page-booting');
     document.documentElement.classList.add('tfw-page-load-error');
   }else{
     if(overlay)overlay.hidden=true;
     document.documentElement.classList.remove('tfw-page-booting');
     document.documentElement.classList.add('tfw-page-loaded');
   }
 };
 const waitForContent=()=>new Promise((resolve,reject)=>{
   if(window.__tfwContentError){reject(window.__tfwContentError);return}
   if(window.__tfwContentReady){resolve();return}
   let timer=0;
   const cleanup=()=>{clearTimeout(timer);document.removeEventListener('tfw:content-ready',onReady);
     document.removeEventListener('tfw:page-content-failed',onFail)};
   const onReady=()=>{cleanup();resolve()};
   const onFail=event=>{cleanup();reject(event.detail?.error||new Error('Content unavailable'))};
   document.addEventListener('tfw:content-ready',onReady);
   document.addEventListener('tfw:page-content-failed',onFail);
   // A failed network should lead to explicit retry, not a half-loaded page.
   timer=setTimeout(()=>{cleanup();reject(new Error('Content load timed out'))},20000);
 });
 const preloadImage=src=>new Promise((resolve,reject)=>{
   if(!src){resolve();return}
   const image=new Image();
   image.onload=()=>resolve();
   image.onerror=()=>reject(new Error('Could not load image: '+src));
   image.src=src;
   if(image.complete&&image.naturalWidth)resolve();
 });
 const firstViewportReady=async()=>{
   updateProgress(62);
   if(document.fonts?.ready)await document.fonts.ready;
   updateProgress(73);
   const candidates=[];
   const bg=document.querySelector('#articleHeroBg');
   if(bg){
     const style=bg.style.backgroundImage||getComputedStyle(bg).backgroundImage;
     const m=style.match(/url\(["']?(.+?)["']?\)/);
     if(m)candidates.push(m[1]);
   }
   const cover=document.querySelector('.newspaper-image');
   if(cover){
     const style=getComputedStyle(cover).backgroundImage;
     const m=style.match(/url\(["']?(.+?)["']?\)/);
     if(m)candidates.push(m[1]);
   }
   const images=[...document.querySelectorAll('.archive-grid .intel-image')].slice(0,2);
   for(const item of images){
     // Archive IntersectionObserver may already have consumed data-bg.
     const style=item.style.backgroundImage||getComputedStyle(item).backgroundImage;
     const match=style.match(/url\(["']?(.+?)["']?\)/);
     const src=item.dataset.bg||match?.[1];
     if(src){
       candidates.push(src);
       if(item.dataset.bg){item.style.backgroundImage='url("'+src+'")';delete item.dataset.bg}
     }
   }
   // Above-the-fold article images are awaited; downstream images remain lazy.
   document.querySelectorAll('.article-body img').forEach(img=>{
     if(img.getBoundingClientRect().top<innerHeight*1.45){
       img.loading='eager';
       if(img.currentSrc||img.src)candidates.push(img.currentSrc||img.src);
     }
   });
   const logo=document.querySelector('.tfw-secondary-topbar .brand img');
   if(logo?.src)candidates.push(logo.src);
   const sources=[...new Set(candidates)];
   if(!sources.length){updateProgress(98);return}
   let loaded=0;
   await Promise.all(sources.map(async src=>{
     await preloadImage(src);
     loaded++;
     updateProgress(73+25*loaded/sources.length);
   }));
 };
 const promise=waitForContent().then(firstViewportReady).then(async()=>{
   updateProgress(100);
   // The original filling bar reaches its end before the scene appears.
   await new Promise(resolve=>setTimeout(resolve,200));
   finish();return true;
 }).catch(error=>{
   console.warn('Article content not ready:',error);
   finish(error);throw error;
 });
 window.__tfwWhenReady=promise;
 promise.catch(()=>{});
 overlay?.querySelector('.tfw-page-loader-retry')?.addEventListener('click',()=>location.reload());
})();
