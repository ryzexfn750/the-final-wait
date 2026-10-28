/* Seamless navigation keeps the original document and its audio stream alive.
   Same-origin pages are loaded into an overlay only after they are ready.
   Normal links, new tabs, direct URLs and the browser Back button still work. */
(()=>{
 'use strict';
 if(new URLSearchParams(location.search).has('tfw_embed'))return;
 const origin=new URL(location.href);
 const originalBase=origin.pathname+origin.search;
 const rootPrefix=origin.pathname.slice(0,origin.pathname.lastIndexOf('/')+1);
 const allowed=new Set(['','index.html','today.html','timeline.html','intel.html','intel-archive.html']);
 let activeFrame=null,seq=0,loading=false,rememberedTitle=document.title;
 const shell=document.createElement('div');
 shell.id='tfwSeamlessShell';
 shell.hidden=true;
 shell.setAttribute('aria-label','Page navigation');
 shell.innerHTML=[
  '<div class="tfw-seamless-progress" aria-live="polite">',
  '<img src="assets/gta-vi-logo.webp" alt="" aria-hidden="true">',
  '<p>ENTERING LEONIDA</p><span>Preparing the page and images…</span>',
  '<a class="tfw-seamless-direct" hidden>OPEN PAGE DIRECTLY</a>',
  '</div>'
 ].join('');
 document.body.appendChild(shell);
 const status=shell.querySelector('.tfw-seamless-progress');
 const label=status.querySelector('span'),direct=status.querySelector('.tfw-seamless-direct');
 function isOurs(url){
   if(url.origin!==origin.origin||!url.pathname.startsWith(rootPrefix))return false;
   const part=url.pathname.slice(rootPrefix.length);
   return allowed.has(part);
 }
 function canonical(url){
   const out=new URL(url.href);out.searchParams.delete('tfw_embed');return out;
 }
 function sameDocument(a,b){
   return a.pathname===b.pathname&&a.search===b.search;
 }
 function isOriginal(url){
   return url.pathname+url.search===originalBase;
 }
 function closeFrames(){
   seq++;loading=false;
   if(activeFrame)activeFrame.remove();
   activeFrame=null;
   shell.querySelectorAll('iframe').forEach(node=>node.remove());
   shell.hidden=true;
   document.body.classList.remove('tfw-route-overlay-open');
   document.title=rememberedTitle;
 }
 function scrollOriginal(target){
   if(!target.hash){scrollTo({top:0,behavior:'instant'});return}
   const id=decodeURIComponent(target.hash.slice(1));
   requestAnimationFrame(()=>{
     const section=document.getElementById(id);
     if(section)section.scrollIntoView({block:'start',behavior:'instant'});
   });
 }
 function onClick(event,sourceDoc){
   if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey)return;
   const anchor=event.target?.closest?.('a[href]');
   if(!anchor||anchor.download||anchor.target&&anchor.target!=='_self')return;
   let to;
   try{to=canonical(new URL(anchor.href,sourceDoc.location?.href||location.href))}catch{return}
   if(!isOurs(to))return;
   const current=canonical(new URL(location.href));
   if(sameDocument(to,current)&&to.hash===current.hash)return;
   if(sameDocument(to,current)&&to.hash&&activeFrame)return; // native in-frame anchor
   if(sameDocument(to,current)&&!activeFrame)return; // homepage scrolling
   event.preventDefault();event.stopImmediatePropagation();
   navigate(to,true);
 }
 function hook(frame){
   try{
     const child=frame.contentWindow,doc=child.document;
     doc.addEventListener('click',event=>onClick(event,doc),true);
     // Prevent the duplicate embedded audio owners from resuming after
     // the iframe is focused. The host remains the sole active player.
   }catch(error){console.warn('Navigation could not attach:',error)}
 }
 async function waitForPage(frame){
   const child=frame.contentWindow;
   if(!child||!child.document)throw Error('Page unavailable');
   hook(frame);
   const ready=child.__tfwWhenReady;
   if(ready&&typeof ready.then==='function'){
     await ready;
   }else{
     // Homepage boots via its own async module. Wait for initial content
     // and scene background rather than showing a blank intermediate page.
     if(child.document.body?.classList.contains('home-page')){
       if(!child.__tfwContentReady){
         await new Promise((resolve,reject)=>{
           let checks=0;
           const id=setInterval(()=>{
             if(!frame.isConnected){clearInterval(id);reject(Error('Navigation cancelled'));return}
             if(child.__tfwContentReady){clearInterval(id);resolve()}
             else if(++checks>240){clearInterval(id);reject(Error('Page timeout'))}
           },50);
         });
       }
     }
     await child.document.fonts?.ready;
   }
   if(child.document.documentElement.classList.contains('tfw-page-load-error')){
     throw Error('Page content unavailable');
   }
 }
 function navigate(url,push){
   if(!isOurs(url)){location.href=url.href;return}
   if(push)history.pushState({tfwSeamless:true},'',url.pathname+url.search+url.hash);
   if(isOriginal(url)){
     closeFrames();scrollOriginal(url);return;
   }
   const ticket=++seq;
   loading=true;shell.hidden=false;
   document.body.classList.add('tfw-route-overlay-open');
   status.hidden=false;
   direct.hidden=true;label.textContent='Preparing the page and images…';
   const frame=document.createElement('iframe');
   frame.className='tfw-seamless-frame tfw-frame-preloading';
   frame.title='The Final Wait — '+url.pathname.split('/').pop();
   frame.setAttribute('allowfullscreen','');
   frame.setAttribute('allow','fullscreen');
   frame.setAttribute('aria-label','Loaded page');
   frame.referrerPolicy='same-origin';
   const next=new URL(url.href);
   next.searchParams.set('tfw_embed','1');
   shell.appendChild(frame);
   frame.addEventListener('load',async()=>{
     if(ticket!==seq){frame.remove();return}
     try{
       await waitForPage(frame);
       if(ticket!==seq){frame.remove();return}
       const old=activeFrame;
       activeFrame=frame;
       frame.classList.remove('tfw-frame-preloading');
       frame.classList.add('tfw-frame-visible');
       status.hidden=true;
       document.title=frame.contentDocument?.title||rememberedTitle;
       loading=false;
       if(old&&old!==frame)old.remove();
     }catch(error){
       if(ticket!==seq)return;
       console.warn('Seamless page failed:',error);
       loading=false;
       label.textContent='This page could not finish loading.';
       direct.href=url.href;direct.hidden=false;
       // Retain the previously readable document below the error card.
       frame.remove();
     }
   },{once:true});
   frame.src=next.href;
 }
 document.addEventListener('click',event=>onClick(event,document),true);
 window.addEventListener('popstate',()=>navigate(canonical(new URL(location.href)),false));
 // Keep the host page's audio on the original document. If a link has
 // been opened in another tab, ordinary navigation works as before.
 window.__tfwSeamlessNavigation={open:href=>navigate(canonical(new URL(href,location.href)),true),get active(){return Boolean(activeFrame)},get loading(){return loading}};
})();
