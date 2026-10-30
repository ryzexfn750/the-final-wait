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
 // Deterministic decorative code inspired by traditional aviation BCBP strips.
 let seed=2166136261;
 for(const ch of code)seed=Math.imul(seed^ch.charCodeAt(0),16777619)>>>0;
 const bars=[3,1,2,1,3];
 for(let i=0;i<78;i++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  bars.push((seed>>>30)+1);
 }
 return [...bars,3,1,2,1,3];
}
function renderBarcode(host,code){
 host.replaceChildren();
 const ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');
 svg.setAttribute('viewBox','0 0 320 96');
 svg.setAttribute('preserveAspectRatio','none');
 svg.setAttribute('aria-hidden','true');
 const rect=(x,y,w,h,fill)=>{
  const r=document.createElementNS(ns,'rect');
  r.setAttribute('x',x);r.setAttribute('y',y);
  r.setAttribute('width',w);r.setAttribute('height',h);
  r.setAttribute('fill',fill);svg.appendChild(r);
 };
 rect(0,0,320,96,'#140b2180');
 rect(12,9,296,1,'#ffd4ee55');
 rect(12,86,296,1,'#ffd4ee55');
 const bars=barcodePattern(code),units=bars.reduce((a,b)=>a+b+1,0),u=282/units;
 let x=19;
 for(let i=0;i<bars.length;i++){
  const guard=i<5||i>=bars.length-5;
  const height=guard?65:(i%7===0?61:57);
  rect(x,16+(65-height)/2,bars[i]*u,height,guard?'#fff8ff':'#fbd5ed');
  x+=(bars[i]+1)*u;
 }
 host.appendChild(svg);
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
 if(Number.isFinite(maxWidth))ctx.fillText(String(str),x,y,maxWidth);
 else ctx.fillText(String(str),x,y);
}
function textBlock(ctx,label,value,x,y,width,scale=1){
 text(ctx,label,x,y,15*scale,'#f8c7e6',800);
 text(ctx,value,x,y+43*scale,33*scale,'#fffafc',900,width);
}
function drawBarcode(ctx,code,x,y,width,height){
 // Matching high-contrast barcode with breathing room, guard bars and
 // subtle scan-line framing. Decorative only, not a real travel barcode.
 ctx.fillStyle='#140b21cc';roundRect(ctx,x,y,width,height,14,true);
 ctx.fillStyle='#eeb5dd66';
 ctx.fillRect(x+16,y+12,width-32,2);
 ctx.fillRect(x+16,y+height-15,width-32,2);
 const bars=barcodePattern(code);
 const units=bars.reduce((sum,n)=>sum+n+1,0),u=(width-52)/units;
 let px=x+26;
 for(let i=0;i<bars.length;i++){
  const guard=i<5||i>=bars.length-5;
  const h=(height-41)*(guard?1:i%7===0?.95:.86);
  ctx.fillStyle=guard?'#fff8ff':'#fbd6ec';
  ctx.fillRect(px,y+19+((height-41)-h)/2,bars[i]*u,h);
  px+=(bars[i]+1)*u;
 }
}
function ticketFrame(ctx,w,h,e,portrait){
 // Keep the actual GTA VI screenshot visible in both exported formats.
 ctx.save();ctx.globalAlpha=.42;
 const x=ctx.createRadialGradient(w*.65,h*.22,5,w*.65,h*.22,w*.8);
 x.addColorStop(0,e.accent2+'a1');x.addColorStop(1,'#100a2100');
 ctx.fillStyle=x;ctx.fillRect(0,0,w,h);
 ctx.restore();
 const m=portrait?45:44;
 ctx.strokeStyle=e.accent+'99';ctx.lineWidth=3;
 roundRect(ctx,m,m,w-m*2,h-m*2,portrait?38:38,false);
 const inner=portrait?65:72;
 const grad=ctx.createLinearGradient(inner,inner,w-inner,h-inner);
 grad.addColorStop(0,'#170e28a1');grad.addColorStop(.66,'#110b2085');
 grad.addColorStop(1,'#290f319e');
 ctx.fillStyle=grad;roundRect(ctx,inner,inner,w-2*inner,h-2*inner,29,true);
}
function drawTicketWide(ctx,pass,e){
 const pad=117;
 text(ctx,'THE FINAL WAIT',pad,149,31,'#fff',900);
 text(ctx,'AIRWAYS',pad+310,149,25,e.accent,900);
 text(ctx,'✦ LEONIDA INTERNATIONAL ✦',pad,188,16,'#f0c5dd',800);
 text(ctx,'YOUR TICKET',pad,279,75,'#fff3fc',900,930);
 text(ctx,'TO LEONIDA.',pad,361,82,e.accent,900,970);
 ctx.fillStyle=e.accent2+'80';roundRect(ctx,pad,388,410,43,20,true);
 text(ctx,e.name,pad+17,417,22,'#fffafc',900,380);
 // Airport route motif fills the central whitespace with a flight line.
 ctx.lineWidth=2;ctx.strokeStyle=e.accent+'a9';ctx.beginPath();
 ctx.moveTo(155,473);ctx.lineTo(948,473);ctx.stroke();
 ctx.fillStyle=e.accent;roundRect(ctx,150,467,12,12,6,true);roundRect(ctx,942,467,12,12,6,true);
 text(ctx,'✈',540,462,29,e.accent,900);
 ctx.lineWidth=2;ctx.strokeStyle=e.accent2+'a0';ctx.beginPath();
 ctx.moveTo(1105,123);ctx.lineTo(1105,783);ctx.stroke();
 textBlock(ctx,'PASSENGER',pass.nickname,pad,547,465,1.05);
 textBlock(ctx,'DESTINATION','LEONIDA',615,547,425,1.05);
 textBlock(ctx,'DEPARTURE','19 NOV 2026',pad,671,475,1.02);
 textBlock(ctx,'REGISTERED ON',dateString(pass.registeredAt),615,671,428,1.02);
 text(ctx,'ONE WAY · NO RETURN',pad,775,17,'#e9bcd9',800);
 text(ctx,'19 NOVEMBER 2026',705,775,15,e.accent,800);
 text(ctx,'BOARDING PASS',1150,189,20,'#ffe2f3',900);
 text(ctx,'LEONIDA',1150,249,34,e.accent,900);
 text(ctx,e.flight+'  ·  GATE VI',1150,292,20,'#fff',900);
 text(ctx,'SEAT 06A',1150,343,19,'#f3c6e5',900);
 drawBarcode(ctx,pass.ticketCode,1137,420,345,167);
 text(ctx,pass.ticketCode,1150,643,31,'#fff',900);
 text(ctx,'✓ VERIFIED PASSENGER',1150,696,16,e.accent,900);
}
function drawTicketTall(ctx,pass,e){
 const pad=107;
 text(ctx,'THE FINAL WAIT',pad,181,36,'#fff',900);
 text(ctx,'AIRWAYS',pad,227,30,e.accent,900);
 text(ctx,'✦ LEONIDA INTERNATIONAL ✦',pad,280,19,'#f0c5dd',800);
 text(ctx,'YOUR TICKET',pad,407,82,'#fff3fc',900,875);
 text(ctx,'TO LEONIDA.',pad,506,90,e.accent,900,875);
 ctx.fillStyle=e.accent2+'80';roundRect(ctx,pad,551,675,57,25,true);
 text(ctx,e.name,pad+22,589,26,'#fffafc',900,636);
 ctx.lineWidth=3;ctx.strokeStyle=e.accent+'a9';ctx.beginPath();
 ctx.moveTo(pad,666);ctx.lineTo(1080-pad,666);ctx.stroke();
 text(ctx,'✈',500,652,39,e.accent,900);
 textBlock(ctx,'PASSENGER',pass.nickname,pad,751,850,1.38);
 textBlock(ctx,'DESTINATION','LEONIDA',pad,915,850,1.38);
 textBlock(ctx,'DEPARTURE','19 NOV 2026',pad,1078,850,1.31);
 textBlock(ctx,'REGISTERED ON',dateString(pass.registeredAt),pad,1241,850,1.31);
 ctx.strokeStyle=e.accent+'77';ctx.beginPath();
 ctx.moveTo(pad,1341);ctx.lineTo(1080-pad,1341);ctx.stroke();
 text(ctx,'FLIGHT '+e.flight+'   ·   GATE VI   ·   SEAT 06A',pad,1428,26,e.accent,900,870);
 text(ctx,'ONE WAY · NO RETURN',pad,1476,21,'#f3c4df',800);
 drawBarcode(ctx,pass.ticketCode,pad,1524,866,182);
 text(ctx,pass.ticketCode,pad,1766,37,'#fff',900);
 text(ctx,'✓ VERIFIED PASSENGER',510,1762,19,e.accent,900,460);
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
 overlay.addColorStop(0,'#160b24b4');
 overlay.addColorStop(.52,'#160b2560');
 overlay.addColorStop(1,'#140b20b0');
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
 if(!validBoardingPass(pass))throw Error('Invalid boarding pass');
 const url=publicTicketUrl(pass);
 host.replaceChildren();
 host.classList.add('tfw-ticket-actions');
 const makePanel=(name,description)=>{
  const panel=document.createElement('section');
  panel.className='tfw-ticket-action-panel';
  const title=document.createElement('h2');title.textContent=name;
  const detail=document.createElement('p');detail.textContent=description;
  const contents=document.createElement('div');
  panel.append(title,detail,contents);
  host.appendChild(panel);
  return contents;
 };
 const downloads=makePanel('DOWNLOAD YOUR TICKET',
  'Save your collectible in full resolution or as a vertical Story.');
 const socials=makePanel('SHARE THE EXPERIENCE',
  'Show your boarding pass to friends and the community.');
 let destination=downloads;
 const status=document.createElement('p');
 status.className='tfw-ticket-action-status';status.setAttribute('role','status');
 const button=(label,callback)=>{
  const btn=document.createElement('button');btn.type='button';btn.textContent=label;
  btn.className='tfw-ticket-action';btn.addEventListener('click',async()=>{
   if(btn.disabled)return;
   btn.disabled=true;
   try{await callback()}catch(error){status.textContent=error.message||'Action unavailable'}
   finally{btn.disabled=false}
  });destination.appendChild(btn);
  return btn;
 };
 const link=(label,href)=>{
  const a=document.createElement('a');a.className='tfw-ticket-action';
  a.textContent=label;a.href=href;a.target='_blank';a.rel='noopener noreferrer';
  destination.appendChild(a);
 };
 button('↓ DOWNLOAD TICKET PNG',()=>downloadBoardingPass(pass,false));
 button('↓ DOWNLOAD STORY PNG',()=>downloadBoardingPass(pass,true));
 destination=socials;
 link('𝕏 SHARE ON X','https://twitter.com/intent/tweet?'+new URLSearchParams({
   text:'My boarding pass to Leonida is ready. '+EDITIONS[pass.edition].name+' · '+pass.ticketCode,
   url
 }).toString());
 link('↗ SHARE ON REDDIT','https://www.reddit.com/submit?'+new URLSearchParams({
   url,title:'My ticket to Leonida | The Final Wait'
 }).toString());
 // No trustworthy web endpoint can force-upload an image into Instagram or
 // TikTok. Share the actual PNG via OS sheet where supported; otherwise save
 // the Story PNG so the visitor can attach it manually in either app.
 const shareStory=async platform=>{
  const blob=await renderBoardingPassPNG(pass,true);
  if(typeof File==='function'&&navigator.share&&navigator.canShare){
   const file=new File([blob],'The-Final-Wait-'+pass.ticketCode+'-story.png',
    {type:'image/png'});
   if(navigator.canShare({files:[file]})){
    try{
     await navigator.share({files:[file],title:'My Ticket to Leonida',
       text:'My The Final Wait Airways boarding pass · '+url});
     return;
    }catch(error){if(error?.name==='AbortError')return}
   }
  }
  saveBoardingPassBlob(blob,pass,true);
  status.textContent='Story PNG saved. Post it using '+platform+'.';
 };
 button('▣ INSTAGRAM',()=>shareStory('Instagram'));
 button('♪ TIKTOK',()=>shareStory('TikTok'));
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
