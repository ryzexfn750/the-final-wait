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
 card.innerHTML=
  '<div class="tfw-ticket-noise" aria-hidden="true"></div>'+
  '<div class="tfw-ticket-layout">'+
    '<div class="tfw-ticket-main">'+
      '<div class="tfw-ticket-topline"><span class="tfw-ticket-brand">THE FINAL WAIT <b>AIRWAYS</b></span>'+
      '<span class="tfw-ticket-top-mark">✦ LEONIDA INTERNATIONAL ✦</span></div>'+
      '<div class="tfw-ticket-intro"><span class="tfw-ticket-kicker">OFFICIAL COMMUNITY COLLECTIBLE</span>'+
      '<h3>YOUR TICKET <em>TO LEONIDA.</em></h3>'+
      '<span class="tfw-ticket-edition"></span></div>'+
      '<div class="tfw-ticket-fields"></div>'+
      '<div class="tfw-ticket-bottomline"><span>✦ VERIFIED PASSENGER</span>'+
        '<span>ONE WAY · NO RETURN</span></div>'+
    '</div>'+
    '<div class="tfw-ticket-stub">'+
      '<span class="tfw-ticket-stub-label">BOARDING PASS</span>'+
      '<span class="tfw-ticket-destination">LEONIDA</span>'+
      '<span class="tfw-ticket-flight"></span>'+
      '<div class="tfw-ticket-mini"><span>GATE <b>VI</b></span><span>SEAT <b>06A</b></span></div>'+
      '<div class="tfw-ticket-barcode" aria-hidden="true"></div>'+
      '<span class="tfw-ticket-code"></span>'+
      '<span class="tfw-ticket-verified">✓ VERIFIED PASSENGER</span>'+
    '</div>'+
  '</div>';
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
 renderBarcode(card.querySelector('.tfw-ticket-barcode'),pass.ticketCode);
 host.appendChild(card);
 return card;
}
function barcodePattern(code){
 let seed=2166136261;
 for(const char of code)seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
 const bars=[];
 for(let i=0;i<86;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  bars.push((seed>>>30)+1);
 }
 return bars;
}
function renderBarcode(host,code){
 host.replaceChildren();
 for(const width of barcodePattern(code)){
  const bar=document.createElement('i');
  bar.style.width=width+'px';host.appendChild(bar);
 }
}
function drawCover(ctx,img,w,h){
 const scale=Math.max(w/img.width,h/img.height);
 const sw=w/scale,sh=h/scale;
 ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,0,0,w,h);
}
async function loadScene(src){
 return new Promise(resolve=>{
  const img=new Image();
  img.onload=()=>resolve(img);
  img.onerror=()=>resolve(null);
  img.src=src;
 });
}
function roundRect(ctx,x,y,w,h,r,fill){
 ctx.beginPath();ctx.roundRect(x,y,w,h,r);
 if(fill)ctx.fill();else ctx.stroke();
}
function text(ctx,str,x,y,size,color='#fff',weight=700,maxWidth=Infinity){
 ctx.fillStyle=color;
 ctx.font=weight+' '+size+'px "Arial Black",Arial,sans-serif';
 ctx.textBaseline='alphabetic';
 ctx.fillText(String(str),x,y,maxWidth);
}
function textBlock(ctx,label,value,x,y,width,scale=1){
 text(ctx,label,x,y,15*scale,'#f8c7e6',800);
 text(ctx,value,x,y+43*scale,33*scale,'#fffafc',900,width);
}
function drawBarcode(ctx,code,x,y,width,height){
 const bars=barcodePattern(code);
 const units=bars.reduce((a,b)=>a+b+1,0);
 const u=width/units;
 ctx.fillStyle='#ffe9f5';
 let px=x;
 for(const b of bars){
  ctx.fillRect(px,y,b*u,height*(b===4?.92:1));
  px+=(b+1)*u;
 }
}
function ticketFrame(ctx,w,h,e,portrait){
 const glow=ctx.createLinearGradient(0,0,w,h);
 glow.addColorStop(0,'#2b102c');glow.addColorStop(.52,'#0d0a1d');glow.addColorStop(1,'#29102e');
 ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 ctx.save();ctx.globalAlpha=.75;
 const x=ctx.createRadialGradient(w*.65,h*.22,5,w*.65,h*.22,w*.8);
 x.addColorStop(0,e.accent2+'a1');x.addColorStop(1,'#100a2100');
 ctx.fillStyle=x;ctx.fillRect(0,0,w,h);
 ctx.restore();
 const m=portrait?45:44;
 ctx.strokeStyle=e.accent+'99';ctx.lineWidth=3;
 roundRect(ctx,m,m,w-m*2,h-m*2,portrait?38:38,false);
 const inner=portrait?65:72;
 const grad=ctx.createLinearGradient(inner,inner,w-inner,h-inner);
 grad.addColorStop(0,'#170e28dc');grad.addColorStop(.66,'#110b20dd');
 grad.addColorStop(1,'#290f31d9');
 ctx.fillStyle=grad;roundRect(ctx,inner,inner,w-2*inner,h-2*inner,29,true);
}
function drawTicketWide(ctx,pass,e){
 const w=1600,h=900;
 const pad=116;
 text(ctx,'THE FINAL WAIT',pad,153,28,'#ffffff',900);
 text(ctx,'AIRWAYS',pad+292,153,23,e.accent,900);
 text(ctx,'✦ LEONIDA INTERNATIONAL ✦',pad,195,15,'#e2b3d9',800);
 text(ctx,'YOUR TICKET',pad,304,82,'#fff3fc',900,940);
 text(ctx,'TO LEONIDA.',pad,389,82,e.accent,900,960);
 ctx.fillStyle=e.accent2+'5c';roundRect(ctx,pad,422,320,38,19,true);
 text(ctx,e.name,pad+18,447,18,'#fff4fd',900,300);
 ctx.strokeStyle=e.accent2+'8b';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(1102,125);ctx.lineTo(1102,780);ctx.stroke();
 textBlock(ctx,'PASSENGER',pass.nickname,pad,537,480);
 textBlock(ctx,'DESTINATION','LEONIDA',590,537,420);
 textBlock(ctx,'DEPARTURE','19 NOV 2026',pad,663,480,.92);
 textBlock(ctx,'REGISTERED ON',dateString(pass.registeredAt),590,663,425,.92);
 text(ctx,'✓ VERIFIED PASSENGER',pad,785,18,e.accent,900);
 text(ctx,'ONE WAY · NO RETURN',592,785,16,'#dbc2da',800);
 text(ctx,'BOARDING PASS',1162,206,19,'#ffe2f3',900);
 text(ctx,e.flight,1162,275,26,'#ffffff',900);
 text(ctx,'GATE VI     SEAT 06A',1162,330,18,e.accent,900);
 drawBarcode(ctx,pass.ticketCode,1162,450,308,160);
 text(ctx,pass.ticketCode,1162,658,34,'#fff',900);
 text(ctx,'TFW COMMUNITY',1162,708,16,'#e0bad6',800);
}
function drawTicketTall(ctx,pass,e){
 const w=1080,pad=107;
 text(ctx,'THE FINAL WAIT',pad,189,34,'#fff',900);
 text(ctx,'AIRWAYS',pad,237,28,e.accent,900);
 text(ctx,'✦ LEONIDA INTERNATIONAL ✦',pad,286,17,'#f0c8df',800);
 text(ctx,'YOUR TICKET',pad,458,80,'#fff3fa',900,890);
 text(ctx,'TO LEONIDA.',pad,549,86,e.accent,900,890);
 ctx.fillStyle=e.accent2+'68';roundRect(ctx,pad,598,590,52,25,true);
 text(ctx,e.name,pad+22,631,24,'#fff',900,560);
 ctx.strokeStyle=e.accent+'55';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(pad,701);ctx.lineTo(1080-pad,701);ctx.stroke();
 textBlock(ctx,'PASSENGER',pass.nickname,pad,779,850,1.38);
 textBlock(ctx,'DESTINATION','LEONIDA',pad,948,850,1.38);
 textBlock(ctx,'DEPARTURE','19 NOV 2026',pad,1117,850,1.3);
 textBlock(ctx,'REGISTERED ON',dateString(pass.registeredAt),pad,1286,850,1.3);
 ctx.strokeStyle=e.accent+'66';ctx.beginPath();
 ctx.moveTo(pad,1401);ctx.lineTo(1080-pad,1401);ctx.stroke();
 text(ctx,e.flight+'    ·    GATE VI',pad,1480,27,e.accent,900,850);
 text(ctx,'BOARDING PASS · VERIFIED PASSENGER',pad,1555,21,'#ffe1f2',900,870);
 drawBarcode(ctx,pass.ticketCode,pad,1602,865,118);
 text(ctx,pass.ticketCode,pad,1777,38,'#ffffff',900);
 text(ctx,'ONE WAY · NO RETURN',pad,1815,17,'#d7bbd2',800);
}
export async function renderBoardingPassPNG(pass,portrait=false){
 if(!validBoardingPass(pass))throw Error('Invalid boarding pass');
 const w=portrait?1080:1600,h=portrait?1920:900;
 const canvas=document.createElement('canvas');
 canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)throw Error('Canvas unavailable');
 const edition=EDITIONS[pass.edition];
 // Keep the actual repository screenshot in the exported image, not a
 // CSS-only background or external hotlink. Export remains fully offline.
 const shot=await loadScene(edition.image);
 if(shot)drawCover(ctx,shot,w,h);
 const overlay=ctx.createLinearGradient(0,0,w,h);
 overlay.addColorStop(0,'#160b24e8');
 overlay.addColorStop(.52,'#160b2596');
 overlay.addColorStop(1,'#140b20ee');
 ctx.fillStyle=overlay;ctx.fillRect(0,0,w,h);
 ticketFrame(ctx,w,h,edition,portrait);
 if(portrait)drawTicketTall(ctx,pass,edition);
 else drawTicketWide(ctx,pass,edition);
 text(ctx,'UNOFFICIAL FAN PROJECT · NOT AFFILIATED WITH ROCKSTAR GAMES',
  portrait?107:116,portrait?1860:839,portrait?12:13,'#e6cbdf',700,w-220);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
  if(blob)resolve(blob);else reject(Error('PNG export unavailable'));
 },'image/png'));
}
export async function downloadBoardingPass(pass,portrait=false){
 const blob=await renderBoardingPassPNG(pass,portrait);
 const href=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=href;
 a.download='The-Final-Wait-'+pass.ticketCode+(portrait?'-story':'-boarding-pass')+'.png';
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(href),1500);
}
export function attachBoardingPassActions(host,pass){
 if(!validBoardingPass(pass))throw Error('Invalid boarding pass');
 const url=publicTicketUrl(pass);
 host.replaceChildren();
 host.classList.add('tfw-ticket-actions');
 const status=document.createElement('p');
 status.className='tfw-ticket-action-status';status.setAttribute('role','status');
 const button=(label,callback)=>{
  const btn=document.createElement('button');btn.type='button';btn.textContent=label;
  btn.className='tfw-ticket-action';btn.addEventListener('click',async()=>{
   if(btn.disabled)return;
   btn.disabled=true;
   try{await callback()}catch(error){status.textContent=error.message||'Action unavailable'}
   finally{btn.disabled=false}
  });host.appendChild(btn);
  return btn;
 };
 const link=(label,href)=>{
  const a=document.createElement('a');a.className='tfw-ticket-action';
  a.textContent=label;a.href=href;a.target='_blank';a.rel='noopener noreferrer';
  host.appendChild(a);
 };
 button('↓ DOWNLOAD TICKET PNG',()=>downloadBoardingPass(pass,false));
 button('↓ DOWNLOAD STORY PNG',()=>downloadBoardingPass(pass,true));
 link('𝕏 SHARE ON X','https://twitter.com/intent/tweet?'+new URLSearchParams({
   text:'My boarding pass to Leonida is ready. '+EDITIONS[pass.edition].name+' · '+pass.ticketCode,
   url
 }).toString());
 link('↗ SHARE ON REDDIT','https://www.reddit.com/submit?'+new URLSearchParams({
   url,title:'My ticket to Leonida | The Final Wait'
 }).toString());
 // Instagram/TikTok do not offer reliable third-party web photo upload intents.
 // Native share sheet is supported on eligible phones, otherwise give the
 // user a ready-to-post PNG instead of pretending a direct upload happened.
 button('▣ INSTAGRAM / TIKTOK',async()=>{
  if(navigator.share){
   try{await navigator.share({title:'My Ticket to Leonida',
    text:'My The Final Wait Airways boarding pass',url});return}
   catch(e){if(e.name==='AbortError')return}
  }
  await downloadBoardingPass(pass,true);
  status.textContent='Story PNG saved. Upload it in Instagram or TikTok.';
 });
 button('↗ COPY VERIFIED LINK',async()=>{
  try{await navigator.clipboard.writeText(url);status.textContent='Verified link copied'}
  catch{
   const selection=document.createElement('textarea');
   selection.value=url;selection.style.position='fixed';selection.style.opacity='0';
   document.body.appendChild(selection);selection.select();
   const ok=document.execCommand('copy');selection.remove();
   if(!ok)throw Error('Copy unavailable: '+url);
   status.textContent='Verified link copied';
  }
 });
 host.appendChild(status);
}
