import {parseOptions,normalizeOptions,overlayGeometry,releaseInstant,remaining,waitProgress,formatWaitPercent}
 from './stream-overlay-core.js?v=4';
let config=parseOptions(location.search);
const surface=document.getElementById('streamSurface');
const widget=document.getElementById('streamWidget');
const nodes={
 days:document.getElementById('streamDays'),hours:document.getElementById('streamHours'),
 minutes:document.getElementById('streamMinutes'),seconds:document.getElementById('streamSeconds'),
 percent:document.getElementById('streamPercent'),fill:document.getElementById('streamProgressFill')
};
const progressBar=document.getElementById('streamProgress');
const numbers=document.getElementById('streamNumbers');
const released=document.getElementById('streamReleased');
const celebration=document.getElementById('streamCelebration');
const zone=document.getElementById('streamZone');
let target=0,demoStarted=-1,wasReleased=false,lastSecond=null;
let celebrationAt=0;
const pad=n=>String(n).padStart(2,'0');
const write=(node,value)=>{if(node.textContent!==value)node.textContent=value};
function applyOptions(options){
 config=normalizeOptions(options);
 target=releaseInstant(config.tz);
 surface.dataset.theme=config.theme;
 surface.dataset.position=config.position;
 surface.dataset.size=config.size;
 const g=overlayGeometry(config);
 widget.style.left=g.x+'px';
 widget.style.top=g.y+'px';
 widget.style.setProperty('--overlay-scale',String(g.w/420));
 zone.textContent=config.tz.replaceAll('_',' ').toUpperCase();
 tick();
}
function tick(){
 const now=Date.now();
 const demonstration=demoStarted>=0&&now-demoStarted<8200;
 if(!demonstration&&demoStarted>=0)demoStarted=-1;
 const demoRemaining=demonstration?Math.max(0,5000-(now-demoStarted)):null;
 const r=demonstration?remaining(5000,5000-demoRemaining):remaining(target,now);
 const isOut=demonstration?demoRemaining<=0:r.released;
 if(isOut!==wasReleased){
  wasReleased=isOut;
  numbers.hidden=isOut;
  released.hidden=!isOut;
  celebration.hidden=!isOut;
  surface.classList.toggle('stream-finished',isOut);
  if(isOut){celebrationAt=now;celebration.classList.remove('burst');void celebration.offsetWidth;celebration.classList.add('burst')}
  else celebration.classList.remove('burst');
  if(isOut){
   widget.classList.remove('stream-release-hit');void widget.offsetWidth;
   widget.classList.add('stream-release-hit');
  }else widget.classList.remove('stream-release-hit');
 }
 progressBar.hidden=isOut||!config.progress;
 if(!isOut){
  let second=r.seconds;
  if(demonstration)second=Math.ceil(demoRemaining/1000);
  if(lastSecond!==second&&demonstration){
   lastSecond=second;
   widget.classList.remove('stream-second-hit');void widget.offsetWidth;
   widget.classList.add('stream-second-hit');
  }
  write(nodes.days,pad(r.days));
  write(nodes.hours,pad(r.hours));
  write(nodes.minutes,pad(r.minutes));
  write(nodes.seconds,pad(second));
  if(config.progress){
   // Use the actual wait duration in preview instead of hard-coding 100%.
   const simulatedTime=demonstration?target-demoRemaining:now;
   const pct=100*waitProgress(target,simulatedTime);
   nodes.fill.style.width=pct.toFixed(6)+'%';
   write(nodes.percent,formatWaitPercent(target,simulatedTime));
  }
 }
 const left=demonstration?demoRemaining:target-now;
 surface.classList.toggle('stream-final-ten',left>0&&left<=10000);
 surface.classList.toggle('stream-final-five',left>0&&left<=5000);
 surface.classList.toggle('stream-final-one',left>0&&left<=1000);
 if(isOut&&now-celebrationAt>4800)celebration.classList.remove('burst');
}
applyOptions(config);
// Preview messages are accepted only from the same-origin parent builder.
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==window.parent||window===window.parent)return;
 const data=event.data;
 if(data?.type==='tfw:overlay-settings'&&data.options&&typeof data.options==='object'){
  applyOptions(data.options);
 }else if(data?.type==='tfw:overlay-demo'){
  demoStarted=Date.now();lastSecond=null;wasReleased=false;tick();
 }
});
setInterval(tick,100);
window.addEventListener('pageshow',tick);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
