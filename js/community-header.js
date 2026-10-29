/* Preserve the pre-community topbar geometry. Account is overlaid directly
   left of the language selector, without entering the flex distribution. */
(()=>{
 'use strict';
 const header=document.querySelector('.topbar');
 const profile=header?.querySelector('.tfw-account-link');
 const languages=header?.querySelector('.language-widget');
 if(!header||!profile||!languages)return;
 let scheduled=false;
 const reposition=()=>{
   scheduled=false;
   const rect=languages.getBoundingClientRect();
   if(rect.width<=0)return;
   // Use actual screen position: translation widget width varies by locale.
   const right=Math.max(8,window.innerWidth-rect.left+9);
   profile.style.right=right+'px';
 };
 const schedule=()=>{
   if(scheduled)return;
   scheduled=true;requestAnimationFrame(reposition);
 };
 profile.style.position='absolute';
 schedule();
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('pageshow',schedule,{passive:true});
 if(typeof ResizeObserver==='function'){
   const observer=new ResizeObserver(schedule);
   observer.observe(languages);
   observer.observe(header);
 }
 const mutations=new MutationObserver(schedule);
 mutations.observe(languages,{subtree:true,childList:true,attributes:true,
   attributeFilter:['class','style']});
 document.addEventListener('tfw:content-ready',schedule);
 setTimeout(schedule,800);
 setTimeout(schedule,2500);
})();
