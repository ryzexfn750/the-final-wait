/* Seamless navigation keeps the original document and its audio stream alive.
   Same-origin pages are loaded into an overlay only after they are ready.
   Normal links, new tabs, direct URLs and the browser Back button still work. */
(()=>{
 'use strict';
 const trustedEmbed=(()=>{if(!new URLSearchParams(location.search).has('tfw_embed')||window.self===window.top)return false;try{return window.parent.location.origin===location.origin&&!!window.parent.__tfwSeamlessNavigation}catch{return false}})();
 if(trustedEmbed)return;
 const origin=new URL(location.href);
 // The public support page has no account gate. In QA, avoid loading the
 // protected countdown through an unguarded iframe from this entry point.
 let preview=false;
 try{preview=localStorage.getItem('tfw_community_preview')==='yes'}catch{}
 if(preview&&origin.pathname.endsWith('/support.html'))return;
 const originalBase=origin.pathname+origin.search;
 const rootPrefix=origin.pathname.slice(0,origin.pathname.lastIndexOf('/')+1);
 const allowed=new Set(['','index.html','today.html','timeline.html','intel.html','intel-archive.html','profile.html','newsletter.html','community-privacy.html','community-terms.html','support.html']);
 let activeFrame=null,seq=0,loading=false,pendingRoute='',rememberedTitle=document.title;
 const shell=document.createElement('div');
 shell.id='tfwSeamlessShell';
 shell.hidden=true;
 shell.setAttribute('aria-label','Page navigation');
 shell.innerHTML=[
  '<div class="tfw-seamless-progress" aria-live="polite">',
  '<div class="route-loader-inner">',
  '<img src="assets/gta-vi-logo.webp" alt="" aria-hidden="true">',
  '<span class="route-loader-kicker">THE FINAL WAIT</span>',
  '<strong class="tfw-seamless-caption">LOADING</strong>',
  '<div class="route-loader-track" role="progressbar" aria-label="Page loading progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>',
  '<a class="tfw-seamless-direct" hidden>OPEN PAGE DIRECTLY</a>',
  '</div></div>'
 ].join('');
 document.body.appendChild(shell);
 const status=shell.querySelector('.tfw-seamless-progress');
 const label=status.querySelector('.tfw-seamless-caption'),
       direct=status.querySelector('.tfw-seamless-direct'),
       progressTrack=status.querySelector('.route-loader-track'),
       progressFill=progressTrack?.querySelector('i');
 function setLoadingProgress(value){
   const n=Math.max(0,Math.min(100,Math.round(value)));
   if(progressTrack)progressTrack.setAttribute('aria-valuenow',String(n));
   if(progressFill)progressFill.style.transform='scaleX('+(n/100)+')';
 }
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
   // GitHub Pages serves /the-final-wait/ and /the-final-wait/index.html
   // as the SAME document. Without this normalization, returning from a
   // dossier would open a second embedded homepage instead of restoring
   // the real, already-playing countdown and its music visualizer.
   const normalize=path=>path.endsWith('/index.html')?path.slice(0,-10):path;
   const initial=new URL(originalBase,origin.origin);
   return normalize(url.pathname)===normalize(initial.pathname)&&url.search===initial.search;
 }
 function closeFrames(){
   seq++;loading=false;pendingRoute='';
   if(activeFrame)activeFrame.remove();
   activeFrame=null;
   shell.querySelectorAll('iframe').forEach(node=>node.remove());
   shell.hidden=true;
   document.body.classList.remove('tfw-route-overlay-open');
   document.documentElement.classList.remove('tfw-route-overlay-open');
   document.title=rememberedTitle;
   window.dispatchEvent(new Event('tfw:seamless-return'));
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
   if(!anchor||anchor.download)return;
   // Gate links are handled inside their modal; hidden site links cannot be
   // activated while the user's registration is incomplete.
   if(document.documentElement.classList.contains('tfw-auth-pending')){
     if(!anchor.closest('#tfwCommunityGate')){
       event.preventDefault();event.stopImmediatePropagation();
     }
     return;
   }
   if(anchor.target&&anchor.target!=='_self')return;
   let to;
   try{to=canonical(new URL(anchor.href,sourceDoc.location?.href||location.href))}catch{return}
   if(!isOurs(to))return;
   const current=activeFrame
     ? canonical(new URL(activeFrame.dataset.tfwRoute,origin.origin))
     : canonical(new URL(originalBase,origin.origin));
   if(sameDocument(to,current)){
     if(!activeFrame){
       // On a standalone profile/legal page, clicking its current route must
       // be a strict no-op. Keep homepage anchors under the existing scroll UX.
       if(!document.body.classList.contains('home-page')&&to.hash===current.hash){
         event.preventDefault();event.stopImmediatePropagation();
       }
       return;
     }
     // Do not reload a current iframe without tfw_embed or start its audio.
     event.preventDefault();event.stopImmediatePropagation();
     if(to.hash&&to.hash!==current.hash){
       history.pushState({tfwSeamless:true},'',to.pathname+to.search+to.hash);
       try{activeFrame.contentWindow.location.hash=to.hash}catch{}
     }
     return;
   }
   event.preventDefault();event.stopImmediatePropagation();
   navigate(to,true);
 }
 function hook(frame){
   try{
     const child=frame.contentWindow,doc=child.document;
     doc.addEventListener('click',event=>onClick(event,doc),true);
     // Pointer activation inside the iframe must wake the persistent
     // top-level audio analyser. iframe gestures never bubble to the host.
     for(const kind of ['pointerdown','keydown','touchstart']){
       doc.addEventListener(kind,()=>{
         window.dispatchEvent(new Event('tfw:seamless-gesture'));
       },{capture:true,passive:true});
     }
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
   if(document.documentElement.classList.contains('tfw-auth-pending'))return;
   if(!isOurs(url)){location.href=url.href;return}
   // Standalone secondary pages cannot initialize Hype inside a home iframe.
   // Full navigation lets the homepage initialize authentication, rails and meter.
   const targetIsHome=url.pathname===rootPrefix||url.pathname===rootPrefix+'index.html';
   if(targetIsHome&&!document.body.classList.contains('home-page')){
     location.assign(url.href);return;
   }
   const route=url.pathname+url.search+url.hash;
   const shown=activeFrame
     ? canonical(new URL(activeFrame.dataset.tfwRoute,origin.origin))
     : canonical(new URL(originalBase,origin.origin));
   if(loading&&pendingRoute===route)return;
   if(activeFrame&&sameDocument(url,shown)){
     // Popstate changes location before we receive the event: compare visible content.
     if(loading){seq++;loading=false;pendingRoute='';
       shell.querySelectorAll('iframe.tfw-frame-preloading').forEach(f=>f.remove());
       status.hidden=true;
     }
     if(push&&location.pathname+location.search+location.hash!==route)
       history.pushState({tfwSeamless:true},'',route);
     activeFrame.dataset.tfwRoute=route;
     try{activeFrame.contentWindow.location.hash=url.hash||''}catch{}
     return;
   }
   if(push)history.pushState({tfwSeamless:true},'',route);
   if(isOriginal(url)){
     closeFrames();scrollOriginal(url);return;
   }
   const ticket=++seq;
   // Interrupted preloads must not remain mounted or compete for resources.
   shell.querySelectorAll('iframe.tfw-frame-preloading').forEach(f=>{
     if(f!==activeFrame)f.remove();
   });
   loading=true;pendingRoute=route;shell.hidden=false;
   document.body.classList.add('tfw-route-overlay-open');
   document.documentElement.classList.add('tfw-route-overlay-open');
   status.hidden=false;
   direct.hidden=true;label.textContent='LOADING';
   setLoadingProgress(5);
   const frame=document.createElement('iframe');
   frame.dataset.tfwRoute=route;
   frame.className='tfw-seamless-frame tfw-frame-preloading';
   frame.title='The Final Wait — '+url.pathname.split('/').pop();
   frame.setAttribute('allowfullscreen','');
   frame.setAttribute('allow','fullscreen');
   frame.setAttribute('aria-label','Loaded page');
   frame.referrerPolicy='same-origin';
   const next=new URL(url.href);
   next.searchParams.set('tfw_embed','1');
   shell.appendChild(frame);
   let finished=false;
   const failNavigation=error=>{
     if(finished||ticket!==seq)return;
     finished=true;clearTimeout(watchdog);seq++;
     console.warn('Seamless page failed:',error);
     loading=false;pendingRoute='';frame.remove();
     if(activeFrame){
       status.hidden=true;
       history.replaceState({tfwSeamless:true},'',activeFrame.dataset.tfwRoute||originalBase);
       document.title=activeFrame.contentDocument?.title||rememberedTitle;
     }else{
       history.replaceState(null,'',originalBase);closeFrames();
     }
   };
   const watchdog=setTimeout(()=>failNavigation(Error('Page loading timed out')),26000);
   frame.addEventListener('error',()=>failNavigation(Error('Page navigation failed')),{once:true});
   frame.addEventListener('load',async()=>{
     if(ticket!==seq){frame.remove();return}
     const progressTimer=setInterval(()=>{
       if(ticket!==seq){clearInterval(progressTimer);return}
       try{
         const childProgress=Number(frame.contentWindow.__tfwPageLoadProgress)||0;
         setLoadingProgress(Math.max(12,Math.min(98,childProgress)));
       }catch{}
     },85);
     try{
       await waitForPage(frame);
       clearInterval(progressTimer);
       setLoadingProgress(100);
       await new Promise(resolve=>setTimeout(resolve,180));
       if(ticket!==seq){frame.remove();return}
       const old=activeFrame;
       activeFrame=frame;
       frame.classList.remove('tfw-frame-preloading');
       frame.classList.add('tfw-frame-visible');
       status.hidden=true;
       document.title=frame.contentDocument?.title||rememberedTitle;
       loading=false;pendingRoute='';finished=true;clearTimeout(watchdog);
       if(old&&old!==frame)old.remove();
     }catch(error){
       clearInterval(progressTimer);
       failNavigation(error);
     }
   },{once:true});
   frame.src=next.href;
 }
 // Block wheel/keyboard scrolling of the audio-owning root while its
 // full-screen iframe owns focus. Events from inside a cross-document iframe
 // do not bubble to this parent, so article/profile scrolling remains native.
 const parentScrollGuard=event=>{
   if(!document.body.classList.contains('tfw-route-overlay-open'))return;
   const element=event.target;
   if(element?.closest?.('#tfwSeamlessShell'))return;
   event.preventDefault();
   event.stopImmediatePropagation();
 };
 window.addEventListener('wheel',parentScrollGuard,{capture:true,passive:false});
 window.addEventListener('touchmove',parentScrollGuard,{capture:true,passive:false});
 document.addEventListener('click',event=>onClick(event,document),true);
 window.addEventListener('popstate',()=>navigate(canonical(new URL(location.href)),false));
 window.addEventListener('pageshow',()=>{
   if(!activeFrame&&document.body.classList.contains('tfw-route-overlay-open'))closeFrames();
 });
 // Keep the host page's audio on the original document. If a link has
 // been opened in another tab, ordinary navigation works as before.
 window.__tfwSeamlessNavigation={open:href=>navigate(canonical(new URL(href,location.href)),true),get active(){return Boolean(activeFrame)},get loading(){return loading}};
})();
