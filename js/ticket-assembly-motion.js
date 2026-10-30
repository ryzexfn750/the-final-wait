/* Paint-driven pass printer, independent of WAAPI/CSS keyframe support. */
export const PRINT_DURATION=7200;
const paint=()=>new Promise(resolve=>{
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(resolve);
 else setTimeout(()=>resolve(typeof performance!=='undefined'?performance.now():Date.now()),16);
});
const clamp=value=>Math.max(0,Math.min(1,value));
export async function printBoardingPass({
 clip,scanner,card,duration=PRINT_DURATION,reducedMotion=false,
 requestFrame=paint,onProgress=()=>{}
}){
 if(!clip||!scanner||!card)throw Error('Incomplete boarding-pass animation scene');
 const width=Math.max(1,Math.round(clip.getBoundingClientRect().width));
 const distance=Math.max(0,width-5);
 const update=p=>{
  p=clamp(p);
  clip.style.clipPath='inset(0 0 0 '+(100-100*p).toFixed(3)+'%)';
  scanner.style.transform='translate3d('+(distance*(1-p)).toFixed(2)+'px,0,0)';
  scanner.style.opacity=p>0&&p<.995?'1':'0';
  onProgress(p);
 };
 clip.style.opacity=reducedMotion?'0':'1';
 update(0);
 // Guarantee a painted, fully masked frame before starting to reveal.
 await requestFrame();
 await requestFrame();
 const start=await requestFrame();
 const total=reducedMotion?Math.min(650,Math.max(300,duration)):Math.max(1,duration);
 let progress=0;
 try{
  if(reducedMotion){
   clip.style.clipPath='inset(0 0 0 0%)';
   scanner.style.opacity='0';
  }
  while(progress<1){
   const stamp=await requestFrame();
   progress=clamp(Math.max(0,stamp-start)/total);
   if(reducedMotion){
    clip.style.opacity=String(progress);
    onProgress(progress);
   }else update(progress);
  }
 }finally{
  clip.style.clipPath='inset(0 0 0 0%)';
  clip.style.opacity='1';
  scanner.style.opacity='0';
  scanner.style.transform='translate3d(0,0,0)';
  onProgress(1);
 }
}
