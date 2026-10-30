import {parseOptions,releaseInstant,remaining,waitProgress} from './stream-overlay-core.js?v=1';
const config=parseOptions(location.search);
const surface=document.getElementById('streamSurface');
surface.dataset.theme=config.theme;
surface.dataset.size=config.size;
surface.dataset.position=config.position;
document.getElementById('streamBrand').hidden=!config.brand;
document.getElementById('streamProgress').hidden=!config.progress;
document.getElementById('streamMillis').hidden=!config.ms;
document.getElementById('streamZone').textContent=config.tz.replaceAll('_',' ').toUpperCase();
const target=releaseInstant(config.tz);
const nodes={
 days:document.getElementById('streamDays'),hours:document.getElementById('streamHours'),
 minutes:document.getElementById('streamMinutes'),seconds:document.getElementById('streamSeconds'),
 ms:document.getElementById('streamMsValue'),percent:document.getElementById('streamPercent'),
 fill:document.getElementById('streamProgressFill')
};
const pad=(x,n=2)=>String(x).padStart(n,'0');
const updateText=(node,text)=>{if(node.textContent!==text)node.textContent=text};
let hadReleased=false;
function tick(){
 const now=Date.now();
 const t=remaining(target,now);
 if(t.released!==hadReleased){
  hadReleased=t.released;
  document.getElementById('streamNumbers').hidden=t.released;
  document.getElementById('streamKicker').hidden=t.released;
  document.getElementById('streamProgress').hidden=t.released||!config.progress;
  document.getElementById('streamReleased').hidden=!t.released;
 }
 if(!t.released){
  updateText(nodes.days,String(t.days).padStart(2,'0'));
  updateText(nodes.hours,pad(t.hours));
  updateText(nodes.minutes,pad(t.minutes));
  updateText(nodes.seconds,pad(t.seconds));
  if(config.ms)updateText(nodes.ms,pad(t.milliseconds,3));
  if(config.progress){
   const percent=waitProgress(target,now)*100;
   nodes.fill.style.width=percent.toFixed(3)+'%';
   updateText(nodes.percent,percent.toFixed(2)+'%');
  }
 }
}
tick();
// Absolute clock: browser-source suspension/reload cannot accumulate drift.
setInterval(tick,config.ms?50:200);
window.addEventListener('pageshow',tick);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
