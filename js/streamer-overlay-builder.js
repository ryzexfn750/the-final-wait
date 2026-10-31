import {DEFAULTS,isValidZone,normalizeOptions,buildOverlayUrl,
 overlayGeometry,releaseInstant,CANVAS} from './stream-overlay-core.js?v=6';
import {bundleOverlayHtml} from './stream-overlay-export.js?v=3';
const $=id=>document.getElementById(id);
const refs={
 form:$('overlaySettings'),theme:$('overlayTheme'),position:$('overlayPosition'),
 size:$('overlaySize'),tzButton:$('overlayTimezoneOpen'),tzValue:$('overlayTimezoneValue'),
 progress:$('overlayProgress'),
 stage:$('builderPreviewStage'),frame:$('builderPreview'),box:$('builderDragBox'),
 url:$('overlayUrl'),open:$('overlayOpen'),copy:$('overlayCopy'),
 code:$('overlayCode'),download:$('overlayDownload'),
 reset:$('overlayReset'),demo:$('overlayDemo'),feedback:$('overlayFeedback'),
 modal:$('timezoneModal'),backdrop:$('modalBackdrop'),search:$('timezoneSearch'),
 list:$('timezoneList'),auto:$('timezoneAuto')
};
const KEY='tfw_stream_overlay_settings_v2';
const getSaved=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
function inferZone(){
 try{const zone=localStorage.getItem('tfw_timezone');if(isValidZone(zone))return zone}catch{}
 try{const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;if(isValidZone(zone))return zone}catch{}
 return DEFAULTS.tz;
}
const getSiteLang=()=>{
 try{return window.__tfwPreferredSiteLanguage?.()||localStorage.getItem('tfw_site_language_v1')||'en'}catch{return 'en'}
};
let state=normalizeOptions({...DEFAULTS,tz:inferZone(),...getSaved(),lang:getSiteLang()});
let geometry=overlayGeometry(state);
let pointer=null,modalReturnFocus=null,zoneCache=new Map(),generation=0;
let templates=null;
function syncInputs(){
 refs.theme.value=state.theme;refs.position.value=state.position;
 refs.size.value=state.size;refs.tzValue.textContent=state.tz.replaceAll('_',' ');
 refs.progress.checked=state.progress;
}
function syncFrame(){
 if(refs.frame.contentWindow)
  refs.frame.contentWindow.postMessage({type:'tfw:overlay-settings',options:state},location.origin);
}
function scalePreview(){
 const width=refs.stage.getBoundingClientRect().width;
 refs.frame.style.transform='scale('+Math.max(.01,width/CANVAS.width)+')';
 drawBox();
}
function drawBox(){
 geometry=overlayGeometry(state);
 const g=geometry;
 refs.box.style.left=g.x/CANVAS.width*100+'%';
 refs.box.style.top=g.y/CANVAS.height*100+'%';
 refs.box.style.width=g.w/CANVAS.width*100+'%';
 refs.box.style.height=g.h/CANVAS.height*100+'%';
}
function render(){
 state=normalizeOptions(state);
 geometry=overlayGeometry(state);
 const url=buildOverlayUrl(location.href,state);
 refs.url.value=url;refs.open.href=url;
 if(templates)refs.code.value=bundleOverlayHtml({...templates,options:state});
 syncInputs();drawBox();syncFrame();
 try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}
 refs.feedback.textContent='';
}
function updateControls(event){
 if(event.target===refs.position){
  const next=refs.position.value;
  if(next==='custom'&&state.position!=='custom'){
   state.x=geometry.x;state.y=geometry.y;
  }
  state.position=next;
 }else if(event.target===refs.size){
  const next=refs.size.value;
  if(next==='custom'&&state.size!=='custom')state.w=geometry.w;
  state.size=next;
 }else{
  state.theme=refs.theme.value;state.progress=refs.progress.checked;
 }
 render();
}
refs.form.addEventListener('change',updateControls);
document.addEventListener('change',event=>{
 if(event.target?.matches?.('.gtranslate_wrapper select,.tfw-gate-language-widget select'))
  setTimeout(()=>{state.lang=getSiteLang();render()},0);
});
refs.frame.addEventListener('load',syncFrame);
if(typeof ResizeObserver==='function')new ResizeObserver(scalePreview).observe(refs.stage);
else window.addEventListener('resize',scalePreview);
function clamp(n,min,max){return Math.max(min,Math.min(max,n))}
refs.box.addEventListener('pointerdown',event=>{
 if(event.button!==0)return;
 const handle=event.target.closest('[data-corner]');
 pointer={id:event.pointerId,corner:handle?.dataset.corner||null,x:event.clientX,y:event.clientY,
  geom:{...geometry},state:{...state}};
 refs.box.setPointerCapture(event.pointerId);
 refs.box.classList.add('moving');
 event.preventDefault();
});
refs.box.addEventListener('pointermove',event=>{
 if(!pointer||event.pointerId!==pointer.id)return;
 const ratio=CANVAS.widgetHeight/CANVAS.widgetWidth;
 const scale=Math.max(1,refs.stage.getBoundingClientRect().width)/CANVAS.width;
 const dx=(event.clientX-pointer.x)/scale,dy=(event.clientY-pointer.y)/scale;
 const start=pointer.geom;
 if(!pointer.corner){
  state.position='custom';
  state.x=clamp(Math.round(start.x+dx),0,CANVAS.width-start.w);
  state.y=clamp(Math.round(start.y+dy),0,CANVAS.height-start.h);
 }else{
  const west=pointer.corner.includes('w'),north=pointer.corner.includes('n');
  const hSign=north?-1:1,wSign=west?-1:1;
  const horizontal=wSign*dx,vertical=hSign*dy/ratio;
  const delta=Math.abs(horizontal)>Math.abs(vertical)?horizontal:vertical;
  let width=clamp(Math.round(start.w+delta),220,850);
  if(west)width=Math.min(width,start.x+start.w);
  else width=Math.min(width,CANVAS.width-start.x);
  if(north)width=Math.min(width,(start.y+start.h)/ratio);
  else width=Math.min(width,(CANVAS.height-start.y)/ratio);
  width=clamp(Math.round(width),220,850);
  const height=width*ratio;
  state.position='custom';state.size='custom';state.w=width;
  state.x=Math.round(west?start.x+start.w-width:start.x);
  state.y=Math.round(north?start.y+start.h-height:start.y);
 }
 render();
});
function stopPointer(event){
 if(!pointer||event.pointerId!==pointer.id)return;
 pointer=null;refs.box.classList.remove('moving');
 if(refs.box.hasPointerCapture(event.pointerId))refs.box.releasePointerCapture(event.pointerId);
}
refs.box.addEventListener('pointerup',stopPointer);
refs.box.addEventListener('pointercancel',stopPointer);
refs.box.tabIndex=0;
refs.box.addEventListener('keydown',event=>{
 const vectors={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};
 const delta=vectors[event.key];
 if(!delta)return;
 event.preventDefault();
 state.position='custom';
 state.x=clamp(geometry.x+delta[0],0,CANVAS.width-geometry.w);
 state.y=clamp(geometry.y+delta[1],0,CANVAS.height-geometry.h);
 render();
});
async function copyHtml(){
 if(!templates)return;
 try{
  await navigator.clipboard.writeText(refs.code.value);
  refs.feedback.textContent='HTML CODE COPIED.';
 }catch{
  refs.code.focus();refs.code.select();
  try{
   if(!document.execCommand('copy'))throw Error('Clipboard unavailable');
   refs.feedback.textContent='HTML CODE COPIED.';
  }catch{refs.feedback.textContent='SELECT THE GENERATED HTML ABOVE AND COPY IT MANUALLY.'}
 }
}
refs.copy.addEventListener('click',copyHtml);
refs.download.addEventListener('click',()=>{
 if(!templates)return;
 const html=bundleOverlayHtml({...templates,options:state});
 const object=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));
 try{
  const anchor=document.createElement('a');
  anchor.href=object;anchor.download='TheFinalWait-OBS-Overlay.html';
  document.body.append(anchor);anchor.click();anchor.remove();
  refs.feedback.textContent='OBS HTML DOWNLOADED. SELECT IT AS A LOCAL BROWSER SOURCE.';
 }finally{setTimeout(()=>URL.revokeObjectURL(object),30000)}
});
async function loadSourceTemplates(){
 try{
  const names=['stream-overlay.html?v=8','css/stream-overlay.css?v=7',
   'js/stream-overlay-core.js?v=6','js/stream-overlay.js?v=8','js/stream-overlay-locales.js?v=2'];
  const texts=await Promise.all(names.map(async name=>{
   const response=await fetch(new URL(name,location.href),{cache:'force-cache'});
   if(!response.ok)throw Error('Overlay source unavailable ('+response.status+')');
   return response.text();
  }));
  templates={template:texts[0],css:texts[1],core:texts[2],runner:texts[3],locales:texts[4]};
  refs.download.disabled=false;refs.copy.disabled=false;
  render();
 }catch(error){
  refs.feedback.textContent='COULD NOT PREPARE THE OBS FILE: '+(error?.message||'Please reload.');
 }
}
void loadSourceTemplates();
refs.reset.addEventListener('click',()=>{state=normalizeOptions({...DEFAULTS,tz:inferZone(),lang:getSiteLang()});render()});
window.addEventListener('storage',event=>{
 if(event.key==='tfw_site_language_v1'){state.lang=getSiteLang();render()}
});
window.addEventListener('tfw:site-language-changed',event=>{
 state.lang=event.detail?.language||getSiteLang();render();
});
refs.demo.addEventListener('click',()=>{
 if(!refs.frame.contentWindow)return;
 refs.frame.contentWindow.postMessage({type:'tfw:overlay-demo'},location.origin);
 refs.demo.textContent='REPLAY LAST 5 SECONDS';
});
function allZones(){
 let zones=['Europe/Rome','UTC','Europe/London','America/New_York','America/Los_Angeles',
  'Asia/Tokyo','Asia/Kolkata','Australia/Sydney','Pacific/Auckland'];
 if(typeof Intl.supportedValuesOf==='function'){
  try{zones=[...new Set([...zones,...Intl.supportedValuesOf('timeZone')])]}catch{}
 }
 if(!zones.includes(state.tz))zones.unshift(state.tz);
 return zones.filter(isValidZone);
}
function zoneMeta(zone){
 if(zoneCache.has(zone))return zoneCache.get(zone);
 let result='';
 try{
  const at=releaseInstant(zone),d=new Date(at);
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(d);
  const f=Object.fromEntries(parts.filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
  const offset=Math.round((Date.UTC(f.year,f.month-1,f.day,f.hour,f.minute,f.second)-at)/60000);
  const sign=offset>=0?'+':'−',abs=Math.abs(offset);
  const abbr=new Intl.DateTimeFormat('en-US',{timeZone:zone,timeZoneName:'short'}).formatToParts(d).find(p=>p.type==='timeZoneName')?.value||'';
  result=abbr.replace('GMT','UTC')+' · UTC'+sign+Math.floor(abs/60)+(abs%60?':'+String(abs%60).padStart(2,'0'):'');
 }catch{}
 zoneCache.set(zone,result);return result;
}
function renderZones(query=''){
 const id=++generation;
 const needle=query.trim().toLowerCase();
 const zones=allZones().filter(z=>z.toLowerCase().replaceAll('_',' ').includes(needle));
 refs.list.replaceChildren();
 const batch=start=>{
  if(id!==generation||refs.modal.hidden)return;
  const fragment=document.createDocumentFragment();
  for(const z of zones.slice(start,start+35)){
   const button=document.createElement('button');
   button.type='button';button.className='timezone-option'+(z===state.tz?' active':'');
   button.dataset.zone=z;
   const strong=document.createElement('strong');strong.textContent=z.replaceAll('_',' ');
   const span=document.createElement('span');span.textContent=zoneMeta(z);
   button.append(strong,span);fragment.append(button);
  }
  refs.list.appendChild(fragment);
  if(start+35<zones.length)setTimeout(()=>batch(start+35),0);
 };
 batch(0);
}
function openZoneModal(){
 modalReturnFocus=document.activeElement;
 refs.modal.hidden=false;refs.backdrop.hidden=false;
 document.body.style.overflow='hidden';renderZones();
 refs.search.value='';
 refs.search.focus();
}
function closeZoneModal(){
 generation++;
 refs.modal.hidden=true;refs.backdrop.hidden=true;
 document.body.style.overflow='';
 modalReturnFocus?.focus?.({preventScroll:true});
}
refs.tzButton.addEventListener('click',openZoneModal);
$('closeTimezone').addEventListener('click',closeZoneModal);
refs.backdrop.addEventListener('click',closeZoneModal);
refs.list.addEventListener('click',event=>{
 const button=event.target.closest('button[data-zone]');
 if(!button||!isValidZone(button.dataset.zone))return;
 state.tz=button.dataset.zone;closeZoneModal();render();
});
refs.search.addEventListener('input',()=>renderZones(refs.search.value));
refs.auto.addEventListener('click',()=>{
 try{
  const z=Intl.DateTimeFormat().resolvedOptions().timeZone;
  state.tz=isValidZone(z)?z:DEFAULTS.tz;
 }catch{state.tz=DEFAULTS.tz}
 closeZoneModal();render();
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&!refs.modal.hidden){event.preventDefault();closeZoneModal()}
});
render();scalePreview();
