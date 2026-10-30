import {DEFAULTS,isValidZone,normalizeOptions,buildOverlayUrl} from './stream-overlay-core.js?v=1';
const $=id=>document.getElementById(id);
const refs={
 form:$('overlaySettings'),theme:$('overlayTheme'),position:$('overlayPosition'),
 size:$('overlaySize'),tz:$('overlayTimezone'),brand:$('overlayBrand'),
 progress:$('overlayProgress'),ms:$('overlayMs'),stage:$('builderPreviewStage'),
 frame:$('builderPreview'),url:$('overlayUrl'),open:$('overlayOpen'),
 copy:$('overlayCopy'),reset:$('overlayReset'),feedback:$('overlayFeedback')
};
const KEY='tfw_stream_overlay_settings_v1';
function getSaved(){
 try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null}catch{return null}
}
function inferZone(){
 try{
  const saved=localStorage.getItem('tfw_timezone');
  if(isValidZone(saved))return saved;
 }catch{}
 try{
  const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
  if(isValidZone(zone))return zone;
 }catch{}
 return DEFAULTS.tz;
}
function addZones(){
 let zones=['UTC','Europe/Rome','Europe/London','Europe/Paris','America/New_York',
  'America/Los_Angeles','America/Chicago','America/Sao_Paulo','Asia/Tokyo',
  'Asia/Kolkata','Australia/Sydney','Pacific/Auckland'];
 if(typeof Intl.supportedValuesOf==='function'){
  try{zones=[...new Set([...zones,...Intl.supportedValuesOf('timeZone')])]}catch{}
 }
 zones=zones.filter(isValidZone).sort((a,b)=>a.localeCompare(b));
 refs.tz.replaceChildren();
 for(const z of zones){
  const opt=document.createElement('option');opt.value=z;opt.textContent=z.replaceAll('_',' ');
  refs.tz.appendChild(opt);
 }
}
function read(){
 return normalizeOptions({
  tz:refs.tz.value,theme:refs.theme.value,position:refs.position.value,
  size:refs.size.value,brand:refs.brand.checked,progress:refs.progress.checked,ms:refs.ms.checked
 });
}
function apply(state){
 const value=normalizeOptions(state);
 refs.theme.value=value.theme;refs.position.value=value.position;refs.size.value=value.size;
 if(![...refs.tz.options].some(opt=>opt.value===value.tz)){
  const opt=document.createElement('option');opt.value=value.tz;opt.textContent=value.tz;
  refs.tz.add(opt);
 }
 refs.tz.value=value.tz;
 refs.brand.checked=value.brand;refs.progress.checked=value.progress;refs.ms.checked=value.ms;
}
function scalePreview(){
 const width=refs.stage.getBoundingClientRect().width;
 refs.frame.style.transform='scale('+Math.max(.05,width/1920)+')';
}
function render(){
 const state=read();
 const url=buildOverlayUrl(location.href,state);
 refs.url.value=url;refs.open.href=url;
 const relative=new URL(url).pathname+new URL(url).search;
 // Relative navigation keeps the editor preview working on GitHub Pages subpaths.
 if(refs.frame.getAttribute('src')!==relative)refs.frame.setAttribute('src',relative);
 try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}
 refs.feedback.textContent='';
 scalePreview();
}
async function copyLink(){
 const value=refs.url.value;
 try{
  if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
  await navigator.clipboard.writeText(value);
  refs.feedback.textContent='Overlay link copied. Paste it in OBS Browser Source.';
 }catch{
  refs.url.focus();refs.url.select();
  try{
   if(!document.execCommand('copy'))throw Error('Manual copy needed');
   refs.feedback.textContent='Overlay link copied.';
  }catch{refs.feedback.textContent='Select the link above and copy it manually.'}
 }
}
addZones();
apply({...DEFAULTS,tz:inferZone(),...getSaved()});
render();
refs.form.addEventListener('change',render);
refs.copy.addEventListener('click',copyLink);
refs.reset.addEventListener('click',()=>{
 apply({...DEFAULTS,tz:inferZone()});render();
});
if(typeof ResizeObserver==='function')new ResizeObserver(scalePreview).observe(refs.stage);
else window.addEventListener('resize',scalePreview);
refs.frame.addEventListener('load',scalePreview);
