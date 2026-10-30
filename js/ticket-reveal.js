/* One-time post-registration boarding pass ceremony.
   Loaded only after a first successful community registration. */
import {mountBoardingPass,validBoardingPass} from './boarding-pass.js?v=4';
function injectStyles(){
 for(const path of ['css/boarding-pass.css?v=4','css/ticket-reveal.css?v=2']){
  if(document.querySelector('link[data-tfw-ticket-reveal="'+path+'"]'))continue;
  const link=document.createElement('link');
  link.rel='stylesheet';link.href=path;
  link.dataset.tfwTicketReveal=path;document.head.appendChild(link);
 }
}
export async function showTicketReveal(loadTicket){
 if(typeof loadTicket!=='function')return;
 injectStyles();
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
   '<button type="button" class="tfw-reveal-skip">SKIP INTRO ↗</button>'+
  '</div>';
 document.body.appendChild(overlay);
 window.__tfwTicketRevealActive=true;
 const focusBefore=document.activeElement;
 const track=overlay.querySelector('.tfw-reveal-track');
 const status=overlay.querySelector('.tfw-reveal-status');
 const choices=overlay.querySelector('.tfw-reveal-choices');
 const holder=overlay.querySelector('#tfwRevealTicket');
 const skip=overlay.querySelector('.tfw-reveal-skip');
 let pass=null,closed=false;
 let release;
 const completed=new Promise(resolve=>release=resolve);
 function close(){
  if(closed)return;
  closed=true;
  window.__tfwTicketRevealActive=false;
  window.__tfwTicketRevealFinished=true;
  document.removeEventListener('keydown',onKeydown,true);
  overlay.classList.add('tfw-reveal-leaving');
  if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});
  const reduced=window.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
  setTimeout(()=>overlay.remove(),reduced?0:260);
  release();
 }
 function onKeydown(event){
  if(event.key==='Escape'){event.preventDefault();close()}
  if(event.key==='Tab'){
   const elements=[...overlay.querySelectorAll('button:not([disabled])')].filter(el=>!el.hidden&&el.getClientRects().length>0);
   if(!elements.length)return;
   const first=elements[0],last=elements.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
 }
 document.addEventListener('keydown',onKeydown,true);
 skip.addEventListener('click',close);
 overlay.querySelector('.tfw-reveal-continue').addEventListener('click',close);
 skip.focus({preventScroll:true});
 const update=(step,label)=>{
  if(closed)return;
  overlay.dataset.step=String(step);
  track.setAttribute('aria-valuenow',String(Math.min(step*25,100)));
  status.textContent=label;
 };
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 (async()=>{
  try{
   update(1,'CONFIRMING YOUR SEAT');
   const result=await loadTicket();
   if(closed)return;
   if(!validBoardingPass(result))throw Error('Ticket cannot be verified');
   pass=result;
   await pause(1150);if(closed)return;
   update(2,'ASSIGNING YOUR FLIGHT TO LEONIDA');
   await pause(1250);if(closed)return;
   mountBoardingPass(holder,pass);
   update(3,'PRINTING YOUR PERSONAL BOARDING PASS');
   overlay.classList.add('tfw-reveal-printing');
   await pause(6400);if(closed)return;
   update(4,'BOARDING PASS ISSUED');
   overlay.classList.add('tfw-reveal-complete');
   choices.hidden=false;skip.hidden=true;
   overlay.querySelector('.tfw-reveal-continue').focus({preventScroll:true});
  }catch(error){
   if(closed)return;
   status.textContent='YOUR PASS WILL BE AVAILABLE IN YOUR PROFILE';
   holder.replaceChildren();
   const message=document.createElement('p');
   message.className='tfw-reveal-error';
   message.textContent='The boarding pass could not be loaded. Your account is ready.';
   holder.appendChild(message);
   choices.hidden=false;
   skip.hidden=true;
   overlay.querySelector('.tfw-reveal-continue').focus({preventScroll:true});
  }
 })();
 return completed;
}
