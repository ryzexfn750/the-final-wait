/* Shared, side-effect-free calculations for the public OBS browser source. */
export const RELEASE={year:2026,month:11,day:19,hour:0,minute:0,second:0};
export const DEFAULTS=Object.freeze({
 tz:'Europe/Rome',theme:'glass',position:'bottom-left',size:'medium',
 progress:true,x:38,y:920,w:420
});
export const OPTIONS=Object.freeze({
 theme:['glass','neon','minimal'],
 position:['top-left','top-right','bottom-left','bottom-right','bottom-center','custom'],
 size:['small','medium','large','custom']
});
export const WAIT_START=new Date('2025-11-06T00:00:00+01:00').getTime();
const validChoice=(key,value)=>OPTIONS[key].includes(value)?value:DEFAULTS[key];
const bound=(v,min,max,fallback)=>{const n=Number(v);return v!==null&&v!==undefined&&v!==''&&Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback};
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
  progress:input.progress===false||input.progress==='0'?false:true,
  x:bound(input.x,0,1920-220,38),y:bound(input.y,0,1080-69,920),w:bound(input.w,220,850,420)
 };
}
export function parseOptions(search){
 const p=search instanceof URLSearchParams?search:new URLSearchParams(search||'');
 return normalizeOptions({
  tz:p.get('tz'),theme:p.get('theme'),position:p.get('position'),size:p.get('size'),
  progress:p.get('progress'),x:p.get('x'),y:p.get('y'),w:p.get('w')
 });
}
export function buildOverlayUrl(base,options){
 const o=normalizeOptions(options);
 const url=new URL('stream-overlay.html',base);
 url.search=new URLSearchParams({
  v:'4',tz:o.tz,theme:o.theme,position:o.position,size:o.size,
  progress:o.progress?'1':'0',
  ...(o.position==='custom'?{x:String(Math.round(o.x)),y:String(Math.round(o.y))}:{}),
  ...(o.size==='custom'?{w:String(Math.round(o.w))}:{})
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

export const CANVAS={width:1920,height:1080,widgetWidth:420,widgetHeight:120};
export const PRESET_WIDTH=Object.freeze({small:294,medium:420,large:546});
export function overlayGeometry(input={}){
 const o=normalizeOptions(input);
 const w=o.size==='custom'?o.w:PRESET_WIDTH[o.size];
 const h=CANVAS.widgetHeight*w/CANVAS.widgetWidth;
 const margin=40;
 let x=margin,y=CANVAS.height-margin-h;
 if(o.position==='bottom-right')x=CANVAS.width-margin-w;
 if(o.position==='top-left'){x=margin;y=margin}
 if(o.position==='top-right'){x=CANVAS.width-margin-w;y=margin}
 if(o.position==='bottom-center')x=(CANVAS.width-w)/2;
 if(o.position==='custom'){x=o.x;y=o.y}
 return {
  x:Math.max(0,Math.min(CANVAS.width-w,Math.round(x))),
  y:Math.max(0,Math.min(CANVAS.height-h,Math.round(y))),
  w:Math.round(w),h:Math.round(h)
 };
}

/* The final seconds are a tiny fraction of a year: two decimals falsely
   round to 100%. Switch to enough precision to visibly track the last 5 s. */
export function formatWaitPercent(epoch, now){
 const percent=waitProgress(epoch,now)*100;
 const remainingMs=epoch-now;
 if(remainingMs>0&&remainingMs<=10000)
  return Math.min(99.99999999,percent).toFixed(8)+'%';
 return percent.toFixed(2)+'%';
}
