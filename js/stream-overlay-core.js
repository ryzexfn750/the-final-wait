/* Shared, side-effect-free calculations for the public OBS browser source. */
export const RELEASE={year:2026,month:11,day:19,hour:0,minute:0,second:0};
export const DEFAULTS=Object.freeze({
 tz:'Europe/Rome',theme:'glass',position:'bottom-left',size:'medium',
 brand:true,progress:true,ms:false
});
export const OPTIONS=Object.freeze({
 theme:['glass','neon','minimal'],
 position:['top-left','top-right','bottom-left','bottom-right','bottom-center'],
 size:['small','medium','large']
});
export const WAIT_START=new Date('2025-11-06T00:00:00+01:00').getTime();
const validChoice=(key,value)=>OPTIONS[key].includes(value)?value:DEFAULTS[key];
export function isValidZone(zone){
 if(typeof zone!=='string'||zone.length>100||!(/^[A-Za-z0-9_+\-/]+$/.test(zone)))return false;
 try{new Intl.DateTimeFormat('en-US',{timeZone:zone});return true}catch{return false}
}
export function normalizeOptions(input={}){
 return {
  tz:isValidZone(input.tz)?input.tz:DEFAULTS.tz,
  theme:validChoice('theme',input.theme),
  position:validChoice('position',input.position),
  size:validChoice('size',input.size),
  brand:input.brand===false||input.brand==='0'?false:true,
  progress:input.progress===false||input.progress==='0'?false:true,
  ms:input.ms===true||input.ms==='1'
 };
}
export function parseOptions(search){
 const p=search instanceof URLSearchParams?search:new URLSearchParams(search||'');
 return normalizeOptions({
  tz:p.get('tz'),theme:p.get('theme'),position:p.get('position'),size:p.get('size'),
  brand:p.get('brand'),progress:p.get('progress'),ms:p.get('ms')
 });
}
export function buildOverlayUrl(base,options){
 const o=normalizeOptions(options);
 const url=new URL('stream-overlay.html',base);
 url.search=new URLSearchParams({
  tz:o.tz,theme:o.theme,position:o.position,size:o.size,
  brand:o.brand?'1':'0',progress:o.progress?'1':'0',ms:o.ms?'1':'0'
 }).toString();
 url.hash='';
 return url.href;
}
function zoneParts(epoch,zone){
 const fields=new Intl.DateTimeFormat('en-US',{
  timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
 }).formatToParts(new Date(epoch));
 const out={};
 for(const item of fields)if(item.type!=='literal')out[item.type]=Number(item.value);
 return out;
}
export function releaseInstant(zone){
 const tz=isValidZone(zone)?zone:DEFAULTS.tz;
 const wall=Date.UTC(RELEASE.year,RELEASE.month-1,RELEASE.day,0,0,0);
 let guess=wall;
 for(let i=0;i<4;i++){
  const p=zoneParts(guess,tz);
  const inUtc=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
  guess+=wall-inUtc;
 }
 return guess;
}
export function remaining(epoch,now){
 let diff=Math.max(0,epoch-now);
 const total=diff;
 const days=Math.floor(diff/86400000);diff%=86400000;
 const hours=Math.floor(diff/3600000);diff%=3600000;
 const minutes=Math.floor(diff/60000);diff%=60000;
 const seconds=Math.floor(diff/1000);
 const milliseconds=Math.floor(diff%1000);
 return {total,days,hours,minutes,seconds,milliseconds,released:now>=epoch};
}
export function waitProgress(epoch,now){
 return Math.min(1,Math.max(0,(now-WAIT_START)/Math.max(1,epoch-WAIT_START)));
}
