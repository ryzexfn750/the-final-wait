/* One-time post-registration ceremony. No skip: the first account ticket must
   visibly assemble before the visitor can continue into the countdown. */
import {mountBoardingPass,validBoardingPass} from './boarding-pass.js?v=5';
import {printBoardingPass} from './ticket-assembly-motion.js?v=2';
import {mountRegistrationSoundControls} from './registration-sound.js?v=1';
function loadStyles(){
 for(const path of ['css/boarding-pass.css?v=5','css/ticket-reveal.css?v=5']){
  if(document.querySelector('link[href="'+path+'"]')||
     document.querySelector('link[data-tfw-ticket-reveal="'+path+'"]'))continue;
  const link=document.createElement('link');
  link.rel='stylesheet';link.href=path;link.dataset.tfwTicketReveal=path;
  document.head.appendChild(link);
 }
}
function nextFrame(){
 return new Promise(resolve=>requestAnimationFrame(()=>resolve()));
}
async function waitForArtwork(card){
 await document.fonts?.ready;
 const pictures=[...card.querySelectorAll('img')];
 await Promise.all(pictures.map(async image=>{
  if(!image.complete){
   await new Promise(resolve=>{
    image.addEventListener('load',resolve,{once:true});
    image.addEventListener('error',resolve,{once:true});
   });
  }
  if(image.complete&&image.naturalWidth>0&&image.decode)
   await image.decode().catch(()=>{});
 }));
}
export async function showTicketReveal(loadTicket){
 if(typeof loadTicket!=='function')return;
 loadStyles();
 const overlay=document.createElement('section');
 overlay.id='tfwTicketReveal';
 overlay.className='tfw-ticket-reveal';
 overlay.setAttribute('role','dialog');
 overlay.setAttribute('aria-modal','true');
 overlay.setAttribute('aria-label','Your boarding pass to Leonida');
 overlay.innerHTML=
  '<div class="tfw-reveal-aura" aria-hidden="true"></div>'+
  '<div class="tfw-reveal-grid" aria-hidden="true"></div>'+
  '<div class="tfw-reveal-beam" aria-hidden="true"></div>'+
  '<div class="tfw-reveal-inner">'+
   '<div id="tfwRevealSound" class="tfw-reveal-sound"></div>'+
   '<div class="tfw-reveal-heading">'+
    '<p class="tfw-reveal-eyebrow">THE FINAL WAIT AIRWAYS</p>'+
    '<h2>WELCOME ABOARD<span>.</span></h2>'+
    '<p class="tfw-reveal-subtitle">YOUR JOURNEY TO LEONIDA BEGINS HERE</p>'+
   '</div>'+
   '<div class="tfw-reveal-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Ticket printing progress"><i></i></div>'+
   '<p class="tfw-reveal-status" role="status" aria-live="polite">CHECKING PASSENGER MANIFEST</p>'+
   '<div class="tfw-reveal-ticket" id="tfwRevealTicket" aria-live="off">'+
    '<div class="tfw-reveal-placeholder" aria-hidden="true"><span>✦</span><strong>TFW AIRWAYS</strong></div>'+
   '</div>'+
   '<div class="tfw-reveal-choices" hidden>'+
    '<button type="button" class="tfw-reveal-continue">EXPLORE THE COUNTDOWN</button>'+
   '</div>'+
  '</div>';
 document.body.appendChild(overlay);
 overlay.appendChild(overlay.querySelector('#tfwRevealSound'));
 document.documentElement.classList.add('tfw-ticket-reveal-open');
 window.__tfwTicketRevealActive=true;
 window.__tfwSetAmbientOnly?.('ticket-reveal',true);
 const stopSound=mountRegistrationSoundControls(overlay.querySelector('#tfwRevealSound'));
 const previousFocus=document.activeElement;
 const track=overlay.querySelector('.tfw-reveal-track');
 const status=overlay.querySelector('.tfw-reveal-status');
 const choices=overlay.querySelector('.tfw-reveal-choices');
 const holder=overlay.querySelector('#tfwRevealTicket');
 const continueButton=overlay.querySelector('.tfw-reveal-continue');
 let closed=false;
 let finish;
 const done=new Promise(resolve=>{finish=resolve});
 const blockScroll=event=>{
  if(closed)return;
  event.preventDefault();event.stopImmediatePropagation();
 };
 const blockKeys=event=>{
  if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)){
   if(event.target?.matches?.('input,textarea,[contenteditable="true"]'))return;
   blockScroll(event);
  }
 };
 // Wheel-driven section navigation is installed on the window: capture it first.
 window.addEventListener('wheel',blockScroll,{capture:true,passive:false});
 window.addEventListener('touchmove',blockScroll,{capture:true,passive:false});
 window.addEventListener('keydown',blockKeys,{capture:true});
 function onKeydown(event){
  // Escape must not dismiss this first-registration sequence.
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();return}
  if(event.key!=='Tab')return;
  const elements=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled])')]
    .filter(el=>!el.hidden&&el.getClientRects().length>0);
  if(!elements.length)return;
  if(event.shiftKey&&document.activeElement===elements[0]){
   event.preventDefault();elements.at(-1).focus();
  }else if(!event.shiftKey&&document.activeElement===elements.at(-1)){
   event.preventDefault();elements[0].focus();
  }
 }
 document.addEventListener('keydown',onKeydown,true);
 const close=()=>{
  if(closed||choices.hidden)return;
  closed=true;
  document.removeEventListener('keydown',onKeydown,true);
  overlay.classList.add('tfw-reveal-leaving');
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  setTimeout(()=>{
   overlay.remove();
   stopSound();
   document.documentElement.classList.remove('tfw-ticket-reveal-open');
   window.__tfwSetAmbientOnly?.('ticket-reveal',false);
   window.removeEventListener('wheel',blockScroll,true);
   window.removeEventListener('touchmove',blockScroll,true);
   window.removeEventListener('keydown',blockKeys,true);
   window.__tfwTicketRevealActive=false;
   if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
   // Purpose-specific event, after teardown. A new registration always gets
   // the device notice even if an earlier account used this browser session.
   window.dispatchEvent(new CustomEvent('tfw:ticket-reveal-closed',{
    detail:{postRegistration:true}
   }));
   finish();
  },reduced?0:260);
 };
 continueButton.addEventListener('click',close);
 const update=(step,message)=>{
  if(closed)return;
  overlay.dataset.step=String(step);
  track.setAttribute('aria-valuenow',String(Math.min(step*25,100)));
  status.textContent=message;
 };
 overlay.querySelector('.tfw-onboarding-mute')?.focus({preventScroll:true});
 void (async()=>{
  try{
   update(1,'CONFIRMING YOUR SEAT');
   const pass=await loadTicket();
   if(closed)return;
   if(!validBoardingPass(pass))throw Error('Invalid ticket');
   await new Promise(resolve=>setTimeout(resolve,850));
   update(2,'ASSIGNING YOUR FLIGHT TO LEONIDA');
   await new Promise(resolve=>setTimeout(resolve,850));
   if(closed)return;
   // Build with the IDENTICAL public-ticket DOM component, but start with a
   // full inset mask: the final ticket must never be visible before printing.
   const clip=document.createElement('div');
   clip.className='tfw-reveal-print-window';
   clip.style.clipPath='inset(0 0 0 100%)';
   const card=mountBoardingPass(clip,pass);
   const scanner=document.createElement('div');
   scanner.className='tfw-reveal-scanner';
   scanner.setAttribute('aria-hidden','true');
   scanner.style.opacity='0';
   holder.replaceChildren(clip,scanner);
   await waitForArtwork(card);
   await nextFrame();
   if(closed)return;
   update(3,'PRINTING YOUR PERSONAL BOARDING PASS');
   overlay.classList.add('tfw-reveal-printing');
   await printBoardingPass({
    clip,scanner,card,
    onProgress:progress=>{
     track.setAttribute('aria-valuenow',String(Math.round(75+25*progress)));
     track.querySelector('i').style.transform='scaleX('+(0.75+0.25*progress)+')';
    },
    reducedMotion:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false
   });
   if(closed)return;
   update(4,'BOARDING PASS ISSUED');
   overlay.classList.add('tfw-reveal-complete');
   choices.hidden=false;
   continueButton.focus({preventScroll:true});
  }catch(error){
   if(closed)return;
   console.warn('Ticket onboarding display unavailable:',error);
   status.textContent='YOUR PASS IS AVAILABLE IN YOUR PROFILE';
   holder.replaceChildren();
   const note=document.createElement('p');
   note.className='tfw-reveal-error';
   note.textContent='The boarding pass could not be displayed, but your account is ready.';
   holder.appendChild(note);
   choices.hidden=false;
   continueButton.focus({preventScroll:true});
  }
 })();
 return done;
}
