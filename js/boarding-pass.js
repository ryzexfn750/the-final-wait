import {mountTicketQR} from './ticket-qr.js?v=1';
/* THE FINAL WAIT AIRWAYS — collectible digital boarding pass.
 * Ticket metadata is always sourced from the authenticated/public API.
 * Screenshot paths are a fixed allowlist from this repository.
 */
export const EDITIONS=Object.freeze({
  founders:{name:'FOUNDERS EDITION',short:'FOUNDERS',flight:'TFW-001',
    image:'/assets/screenshots/desktop/scene-17.webp',accent:'#fbd19c',accent2:'#f08bd8'},
  early:{name:'EARLY ARRIVALS',short:'EARLY ARRIVALS',flight:'TFW-002',
    image:'/assets/screenshots/desktop/scene-19.webp',accent:'#ffc59d',accent2:'#fa83bc'},
  final:{name:'FINAL BOARDING',short:'FINAL BOARDING',flight:'TFW-003',
    image:'/assets/screenshots/desktop/scene-03.webp',accent:'#d2b2ff',accent2:'#f07dcf'},
  welcome:{name:'WELCOME TO LEONIDA',short:'WELCOME',flight:'TFW-006',
    image:'/assets/screenshots/desktop/scene-06.webp',accent:'#ffe4ae',accent2:'#fc9acb'}
});
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validBoardingPass(pass){
 return Boolean(pass&&Object.hasOwn(EDITIONS,pass.edition)&&
  UUID.test(pass.publicId||'')&&/^[FEBW]-\d{5,}$/.test(pass.ticketCode||'')&&
  /^[A-Za-z0-9_]{3,20}$/.test(pass.nickname||'')&&
  Number.isFinite(Date.parse(pass.registeredAt))&&
  pass.ticketCode[0]===({founders:'F',early:'E',final:'B',welcome:'W'}[pass.edition]));
}
export const publicTicketUrl=(pass,origin=location.origin)=>
 new URL('/ticket/'+pass.publicId,origin).href;
function dateString(iso){
 return new Intl.DateTimeFormat('en-GB',{
  day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'
 }).format(new Date(iso)).toUpperCase();
}
const fields=pass=>[
 ['PASSENGER',pass.nickname],['DESTINATION','LEONIDA'],
 ['DEPARTURE','19 NOV 2026'],['REGISTERED ON',dateString(pass.registeredAt)],
 ['FLIGHT',EDITIONS[pass.edition].flight],['GATE','VI'],
 ['TERMINAL','01'],['CLASS','COLLECTOR']
];
export function mountBoardingPass(host,pass){
 if(!host||!validBoardingPass(pass))throw Error('Invalid boarding pass');
 const e=EDITIONS[pass.edition];
 host.replaceChildren();
 const card=document.createElement('article');
 card.className='tfw-ticket tfw-ticket--'+pass.edition;
 card.setAttribute('aria-label',e.name+' for '+pass.nickname);
 card.dataset.ticketId=pass.publicId;
 card.innerHTML=
  '<img class="tfw-ticket-scene" alt="" aria-hidden="true" crossorigin="anonymous">'+
  '<div class="tfw-ticket-scene-tint" aria-hidden="true"></div>'+
  '<div class="tfw-ticket-noise" aria-hidden="true"></div>'+
  '<div class="tfw-ticket-layout">'+
    '<div class="tfw-ticket-main">'+
      '<div class="tfw-ticket-topline"><span class="tfw-ticket-brand">THE FINAL WAIT <b>AIRWAYS</b></span>'+
      '<span class="tfw-ticket-top-mark">✦ LEONIDA INTERNATIONAL ✦</span></div>'+
      '<div class="tfw-ticket-intro"><h3>YOUR TICKET <em>TO LEONIDA.</em></h3>'+
      '<span class="tfw-ticket-edition"></span></div>'+
      '<div class="tfw-ticket-fields"></div>'+
      '<div class="tfw-ticket-bottomline"><span>ONE WAY · NO RETURN</span>'+
        '<span>19 NOVEMBER 2026</span></div>'+
    '</div>'+
    '<div class="tfw-ticket-stub">'+
      '<span class="tfw-ticket-stub-label">BOARDING PASS</span>'+
      '<span class="tfw-ticket-destination">LEONIDA</span>'+
      '<span class="tfw-ticket-flight"></span>'+
      '<div class="tfw-ticket-mini"><span>GATE <b>VI</b></span><span>SEAT <b>06A</b></span></div>'+
      '<div class="tfw-ticket-qr" aria-label="QR code for The Final Wait"></div>'+
      '<span class="tfw-ticket-code"></span>'+
    '</div>'+
  '</div>';
 card.querySelector('.tfw-ticket-scene').src=e.image;
 card.querySelector('.tfw-ticket-edition').textContent=e.name;
 card.querySelector('.tfw-ticket-flight').textContent=e.flight+'  ·  19 NOV 2026';
 card.querySelector('.tfw-ticket-code').textContent=pass.ticketCode;
 const grid=card.querySelector('.tfw-ticket-fields');
 for(const [label,value] of fields(pass)){
  const cell=document.createElement('div');cell.className='tfw-ticket-field';
  const caption=document.createElement('span');caption.textContent=label;
  const strong=document.createElement('strong');strong.textContent=value;
  cell.append(caption,strong);grid.appendChild(cell);
 }
 mountTicketQR(card.querySelector('.tfw-ticket-qr'));
 host.appendChild(card);
 return card;
}
// Exact screenshot export: rasterize the same DOM, CSS, official screenshot,
// font metrics and QR code that the user sees, rather than redrawing a second
// approximation via independent Canvas text positions.
let htmlImageModule;
async function captureLibrary(){
 if(!htmlImageModule){
  htmlImageModule=import('https://cdn.jsdelivr.net/npm/html-to-image@1.11.13/+esm')
    .catch(error=>{htmlImageModule=null;throw Error('Image exporter could not load. Check your connection.')});
 }
 return htmlImageModule;
}
async function prepareTicketMedia(root){
 await document.fonts?.ready;
 const images=[...root.querySelectorAll('img')];
 await Promise.all(images.map(async image=>{
  if(!image.complete)await new Promise(resolve=>{
   image.addEventListener('load',resolve,{once:true});
   image.addEventListener('error',resolve,{once:true});
  });
  if(image.naturalWidth===0)throw Error('Official GTA VI artwork has not loaded');
  if(image.decode)await image.decode();
 }));
}
export async function renderBoardingPassPNG(pass,portrait=false){
 if(!validBoardingPass(pass))throw Error('Invalid boarding pass');
 if(typeof document==='undefined')throw Error('Browser required for PNG export');
 const {toBlob}=await captureLibrary();
 const selector='.tfw-ticket[data-ticket-id="'+pass.publicId+'"]';
 const visible=document.querySelector(selector);
 let source=visible,stage=null;
 try{
  if(portrait){
   stage=document.createElement('div');
   stage.className='tfw-ticket-story-stage';
   stage.style.cssText='position:fixed;left:-20000px;top:0;width:540px;height:960px;pointer-events:none;z-index:-1';
   document.body.appendChild(stage);
   // Reuse exactly the same ticket component, only with portrait layout.
   source=mountBoardingPass(stage,pass);
   source.classList.add('tfw-ticket--portrait');
  }else if(!visible){
   throw Error('Open your boarding pass page to download the original image.');
  }
  await prepareTicketMedia(source);
  const rect=source.getBoundingClientRect();
  if(rect.width<=0||rect.height<=0)throw Error('Boarding pass is not ready to export');
  // Capture the ticket element itself, not the story staging container.
  // No opaque canvas fill: rounded corners retain real transparent pixels.
  const blob=await toBlob(source,{
   pixelRatio:portrait?2:1,
   cacheBust:false,
   skipAutoScale:true,
   style:{
    boxShadow:'none',
    transform:'none',
    transition:'none',
    animation:'none'
   }
  });
  if(!blob||blob.type!=='image/png')throw Error('Unable to capture the ticket');
  return blob;
 }finally{stage?.remove()}
}
function saveBoardingPassBlob(blob,pass,portrait){
 const href=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=href;
 a.download='The-Final-Wait-'+pass.ticketCode+(portrait?'-story':'-boarding-pass')+'.png';
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(href),1500);
}
export async function downloadBoardingPass(pass,portrait=false){
 const blob=await renderBoardingPassPNG(pass,portrait);
 saveBoardingPassBlob(blob,pass,portrait);
}
export function attachBoardingPassActions(host,pass){
 if(!validBoardingPass(pass)||!host)throw Error('Invalid boarding pass');
 const url=publicTicketUrl(pass);
 host.replaceChildren();
 host.className='tfw-ticket-quick-actions';
 // Two actions only, like the site's existing Share modal.
 const download=document.createElement('button');
 download.type='button';download.className='tfw-ticket-quick-button';
 download.textContent='DOWNLOAD';
 const share=document.createElement('button');
 share.type='button';share.className='tfw-ticket-quick-button';
 share.textContent='SHARE';
 host.append(download,share);

 const backdrop=document.createElement('div');
 backdrop.className='modal-backdrop tfw-ticket-modal-backdrop';backdrop.hidden=true;
 const modal=document.createElement('section');
 modal.className='share-modal glass tfw-ticket-modal';modal.hidden=true;
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 modal.setAttribute('aria-labelledby','tfwTicketModalTitle');
 modal.innerHTML='<button type="button" class="modal-close" aria-label="Close dialog">×</button>'+
  '<p class="eyebrow bright">THE FINAL WAIT AIRWAYS</p>'+
  '<h2 id="tfwTicketModalTitle"></h2>'+
  '<p class="tfw-ticket-modal-description"></p>'+
  '<div class="tfw-ticket-modal-actions"></div>'+
  '<p class="tfw-ticket-action-status" role="status" aria-live="polite"></p>';
 document.body.append(backdrop,modal);
 const title=modal.querySelector('h2'),description=modal.querySelector('.tfw-ticket-modal-description');
 const actions=modal.querySelector('.tfw-ticket-modal-actions');
 const status=modal.querySelector('.tfw-ticket-action-status');
 let prevFocus=null,open=false;
 const close=()=>{
  if(!open)return;
  open=false;modal.hidden=true;backdrop.hidden=true;
  document.body.classList.remove('tfw-ticket-modal-open');
  prevFocus?.focus({preventScroll:true});
 };
 const openModal=kind=>{
  prevFocus=document.activeElement;open=true;
  status.textContent='';actions.replaceChildren();
  const isDownload=kind==='download';
  title.textContent=isDownload?'DOWNLOAD YOUR TICKET.':'SHARE YOUR BOARDING PASS.';
  description.textContent=isDownload?
   'Download your ticket in your preferred format.':
   'Share your ticket with the Leonida community.';
  const button=(label,fn)=>{
   const b=document.createElement('button');
   b.type='button';b.className='fx-button';b.textContent=label;
   b.addEventListener('click',async()=>{
    if(b.disabled)return;
    b.disabled=true;status.textContent='';
    try{await fn()}
    catch(e){status.textContent=e?.message||'Action unavailable'}
    finally{b.disabled=false}
   });
   actions.appendChild(b);
  };
  const link=(label,href)=>{
   const a=document.createElement('a');
   a.className='fx-button';a.textContent=label;
   a.href=href;a.target='_blank';a.rel='noopener noreferrer';actions.appendChild(a);
  };
  if(isDownload){
   button('DOWNLOAD TICKET',async()=>{await downloadBoardingPass(pass,false);status.textContent='Original ticket PNG saved.'});
   button('DOWNLOAD STORY VERSION',async()=>{await downloadBoardingPass(pass,true);status.textContent='Story PNG saved.'});
  }else{
   link('SHARE ON X','https://twitter.com/intent/tweet?'+new URLSearchParams({
     text:'My boarding pass to Leonida is ready. '+EDITIONS[pass.edition].name+' · '+pass.ticketCode,url
   }));
   link('SHARE ON REDDIT','https://www.reddit.com/submit?'+new URLSearchParams({
     url,title:'My ticket to Leonida | The Final Wait'
   }));
   const shareStory=async platform=>{
    const blob=await renderBoardingPassPNG(pass,true);
    if(typeof File==='function'&&navigator.share&&navigator.canShare){
     const file=new File([blob],'The-Final-Wait-'+pass.ticketCode+'-story.png',{type:'image/png'});
     if(navigator.canShare({files:[file]})){
      try{await navigator.share({files:[file],title:'My Ticket to Leonida',text:url});return}
      catch(e){if(e.name==='AbortError')return}
     }
    }
    saveBoardingPassBlob(blob,pass,true);
    status.textContent='Story PNG saved. Open '+platform+' to upload it.';
   };
   button('INSTAGRAM',()=>shareStory('Instagram'));
   button('TIKTOK',()=>shareStory('TikTok'));
   button('COPY VERIFIED LINK',async()=>{
    try{await navigator.clipboard.writeText(url)}
    catch{
     const area=document.createElement('textarea');area.value=url;
     area.style.cssText='position:fixed;opacity:0';
     document.body.appendChild(area);area.select();
     const copied=document.execCommand('copy');area.remove();
     if(!copied)throw Error('Copy failed');
    }
    status.textContent='Verified link copied.';
   });
  }
  backdrop.hidden=false;modal.hidden=false;
  document.body.classList.add('tfw-ticket-modal-open');
  modal.querySelector('.modal-close').focus({preventScroll:true});
 };
 download.addEventListener('click',()=>openModal('download'));
 share.addEventListener('click',()=>openModal('share'));
 modal.querySelector('.modal-close').addEventListener('click',close);
 backdrop.addEventListener('click',close);
 modal.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();close();return}
  if(event.key!=='Tab')return;
  const focusable=[...modal.querySelectorAll('button:not([disabled]),a[href]')];
  if(!focusable.length)return;
  const first=focusable[0],last=focusable.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 });
 // Remove both auxiliary nodes when switching between ticket records.
 const obs=new MutationObserver(()=>{
  if(host.isConnected)return;
  close();modal.remove();backdrop.remove();obs.disconnect();
 });
 obs.observe(document.body,{childList:true,subtree:true});
 return {close};
}
