/* THE FINAL WAIT — independent, deterministic right-to-left boarding pass printer.
   Use the browser animation timeline directly, never stylesheet keyframe timing.
   It always begins at a fully masked card so the final ticket cannot flash early. */
export const PRINT_DURATION=7200;
const frame=()=>new Promise(resolve=>{
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>resolve());
 else setTimeout(resolve,16);
});
export async function printBoardingPass({clip,scanner,card,duration=PRINT_DURATION,reducedMotion=false}){
 if(!clip||!scanner||!card)throw Error('Incomplete boarding-pass animation scene');
 clip.style.clipPath='inset(0 0 0 100%)';
 scanner.style.opacity='0';
 const width=Math.max(1,Math.round(clip.getBoundingClientRect().width));
 const distance=Math.max(0,width-5);
 scanner.style.transform='translate3d('+distance+'px,0,0)';
 // Two painted frames guarantee the initial mask is committed even when
 // the ticket DOM, image and styles were inserted during the same task.
 await frame();
 await frame();
 if(reducedMotion){
  // Accessible alternative: legible fade, no scanning or large lateral movement.
  if(typeof clip.animate==='function'){
   const anim=clip.animate([
    {clipPath:'inset(0 0 0 0)',opacity:0},
    {clipPath:'inset(0 0 0 0)',opacity:1}
   ],{duration:550,fill:'both',easing:'ease-out'});
   try{await anim.finished}catch{}
   clip.style.clipPath='inset(0 0 0 0)';
   clip.style.opacity='1';
   anim.cancel();
  }else{
   clip.style.clipPath='inset(0 0 0 0)';
   clip.style.opacity='1';
  }
  return;
 }
 if(typeof clip.animate==='function'&&typeof scanner.animate==='function'){
  const reveal=clip.animate([
   {clipPath:'inset(0 0 0 100%)',offset:0},
   {clipPath:'inset(0 0 0 89%)',offset:.12},
   {clipPath:'inset(0 0 0 66%)',offset:.32},
   {clipPath:'inset(0 0 0 34%)',offset:.64},
   {clipPath:'inset(0 0 0 0%)',offset:1}
  ],{duration,fill:'both',easing:'linear'});
  const sweep=scanner.animate([
   {transform:'translate3d('+distance+'px,0,0)',opacity:0,offset:0},
   {transform:'translate3d('+distance*.91+'px,0,0)',opacity:1,offset:.12},
   {transform:'translate3d('+distance*.66+'px,0,0)',opacity:1,offset:.32},
   {transform:'translate3d('+distance*.34+'px,0,0)',opacity:1,offset:.64},
   {transform:'translate3d(0,0,0)',opacity:.9,offset:.94},
   {transform:'translate3d(0,0,0)',opacity:0,offset:1}
  ],{duration,fill:'both',easing:'linear'});
  const settle=typeof card.animate==='function'?card.animate([
   {transform:'translate3d(32px,5px,0) scale(.97)',offset:0},
   {transform:'translate3d(0,0,0) scale(1)',offset:1}
  ],{duration,fill:'both',easing:'ease-out'}):null;
  try{
   await Promise.all([reveal.finished,sweep.finished,...(settle?[settle.finished]:[])]);
  }finally{
   clip.style.clipPath='inset(0 0 0 0)';
   scanner.style.opacity='0';
   reveal.cancel();sweep.cancel();settle?.cancel();
  }
 }else{
  // Browser fallback: explicitly transition from a painted mask, not an
  // author keyframe which might already have been applied when it loads.
  clip.style.transition='clip-path '+duration+'ms linear';
  scanner.style.transition='transform '+duration+'ms linear, opacity 180ms ease';
  scanner.style.opacity='1';
  await frame();
  clip.style.clipPath='inset(0 0 0 0)';
  scanner.style.transform='translate3d(0,0,0)';
  await new Promise(resolve=>setTimeout(resolve,duration));
  clip.style.transition='none';
  scanner.style.transition='none';
  scanner.style.opacity='0';
 }
}
