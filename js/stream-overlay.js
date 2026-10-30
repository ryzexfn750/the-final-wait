import {parseOptions,normalizeOptions,overlayGeometry,releaseInstant,remaining,waitProgress}
 from './stream-overlay-core.js?v=2';
let config=parseOptions(location.search);
const surface=document.getElementById('streamSurface');
const widget=document.getElementById('streamWidget');
const nodes={
 days:document.getElementById('streamDays'),hours:document.getElementById('streamHours'),
 minutes:document.getElementById('streamMinutes'),seconds:document.getElementById('streamSeconds'),
 percent:document.getElementById('streamPercent'),fill:document.getElementById('streamProgressFill')
};
const brand=document.getElementById('streamBrand');
const progressBar=document.getElementById('streamProgress');
const numbers=document.getElementById('streamNumbers');
const kicker=document.getElementById('streamKicker');
const released=document.getElementById('streamReleased');
const zone=document.getElementById('streamZone');
let target=0,demoStarted=-1,wasReleased=false,lastSecond=null;
const pad=(n)=>String(n).padStart(2,'0');
const write=(node,text)=>{if(node.textContent!==text)node.textContent=text};
function applyOptions(options){
 config=normalizeOptions(options);
 target=releaseInstant(config.tz);
 surface.dataset.theme=config.theme;
 surface.dataset.position=config.position;
 surface.dataset.size=config.size;
 const g=overlayGeometry(config);
 widget.style.left=g.x+'px';
 widget.style.top=g.y+'px';
 widget.style.setProperty('--overlay-scale',String(g.w/460));
 brand.hidden=!config.brand;
 zone.textContent=config.tz.replaceAll('_',' ').toUpperCase();
 tick();
}
function tick(){
 const now=Date.now();
 const demonstration=demoStarted>=0&&now-demoStarted<8200;
 if(!demonstration&&demoStarted>=0)demoStarted=-1;
 const demoRemaining=demonstration?Math.max(0,5000-(now-demoStarted)):null;
 const r=demonstration?remaining(5000,demoRemaining===null?0:5000-demoRemaining):remaining(target,now);
 const isOut=demonstration?demoRemaining<=0:r.released;
 if(isOut!==wasReleased){
  wasReleased=isOut;
  numbers.hidden=isOut;
  kicker.hidden=isOut;
  released.hidden=!isOut;
  surface.classList.toggle('stream-finished',isOut);
  if(isOut){
   widget.classList.remove('stream-release-hit');void widget.offsetWidth;
   widget.classList.add('stream-release-hit');
  }else widget.classList.remove('stream-release-hit');
 }
 progressBar.hidden=isOut||!config.progress;
 if(!isOut){
  let second=r.seconds;
  if(demonstration){
   second=Math.ceil(demoRemaining/1000);
  }
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
   const value=demonstration?1:waitProgress(target,now);
   nodes.fill.style.width=(value*100).toFixed(3)+'%';
   write(nodes.percent,(value*100).toFixed(2)+'%');
  }
 }
 surface.classList.toggle('stream-final-five',demonstration&&demoRemaining>0);
}
applyOptions(config);
// Messages accepted only from a same-origin configurator frame parent;
// this never trusts arbitrary cross-origin player pages.
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
