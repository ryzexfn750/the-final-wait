/* THE FINAL WAIT — GLOBAL MIDNIGHT WAVE
 * 3D Globe.GL + 2D Canvas fallback share identical IANA release timestamps.
 * The UTC timeline is historical/simulated, not an official unlock schedule.
 */
import {CITIES} from './global-wave-cities.js?v=1';
import {EARLIEST,LATEST,DURATION,midnight,buildZones,milestones,waveSnapshot,
 timelineAt,timelinePosition,remainingText,fullZoneLabel,cityState,offsetLabel,localClock,clamp}
 from './global-wave-core.js?v=1';

const $=id=>document.getElementById(id);
const ui={
 panel:$('waveGlobePanel'),stage:$('waveMapStage'),globe:$('waveGlobe3D'),
 canvas:$('waveMap2D'),message:$('waveMapMessage'),view3d:$('waveView3D'),view2d:$('waveView2D'),
 spin:$('waveSpin'),hint:$('waveGestureHint'),modeLive:$('waveModeLive'),
 modeSim:$('waveModeSim'),modeLabel:$('waveModeLabel'),headerUTC:$('waveHeaderUTC'),
 slider:$('waveTimeline'),play:$('wavePlay'),reset:$('waveReset'),moment:$('waveMoment'),
 progressText:$('waveProgressText'),timelineInfo:$('waveTimelineInfo'),
 reached:$('waveReached'),waiting:$('waveWaiting'),ratio:$('waveRatioFill'),
 total:$('waveZoneTotal'),nextName:$('waveNextName'),nextIn:$('waveNextIn'),nextUTC:$('waveNextUTC'),
 selectedName:$('waveSelectedName'),selectedRegion:$('waveSelectedRegion'),
 selectedZone:$('waveSelectedZone'),selectedClock:$('waveSelectedClock'),
 selectedCountdown:$('waveSelectedCountdown'),selectedStatus:$('waveSelectedStatus'),
 search:$('waveCitySearch'),cities:$('waveCityList')
};
let features=[],orderedMilestones=[],nowForWave=Date.now();
let mode='live',simulationAt=EARLIEST,playing=false,playStartedAt=0,playStartedTime=EARLIEST;
let selected=CITIES.find(city=>city.name==='Miami')||CITIES[0];
let globe=null,view='2d',autoSpin=true,requested3d=false,haveLoaded=false;
let mapPaths=[],lastStatusKey='',lastListRefresh=0,last2dKey='',lastGlobeKey='';
const loadingMessage=(text,show=true)=>{ui.message.textContent=text;ui.message.hidden=!show};
const releaseLabel=at=>new Date(at).toLocaleString('en-GB',{timeZone:'UTC',day:'2-digit',month:'short',year:'numeric',
 hour:'2-digit',minute:'2-digit',hour12:false})+' UTC';
const sampleAt=()=>mode==='live'?Date.now():simulationAt;
const isApproaching=(f,at)=>f.release>at&&f.release-at<=3600000;
const colorOf=(f,at)=>{
 if(f.tzid===selected.tz)return 'rgba(255,204,241,0.91)';
 if(at>=f.release)return 'rgba(245,100,182,0.72)';
 if(isApproaching(f,at))return 'rgba(245,175,112,0.65)';
 return 'rgba(77,67,118,0.25)';
};
const strokeOf=(f,at)=>f.tzid===selected.tz?'rgba(255,233,251,0.95)':
 at>=f.release?'rgba(249,155,219,0.54)':'rgba(166,135,202,0.25)';
function setView(next){
 if(next==='3d'&&!globe)return;
 view=next;
 ui.globe.hidden=next!=='3d';ui.canvas.hidden=next!=='2d';
 ui.view3d.classList.toggle('active',next==='3d');
 ui.view2d.classList.toggle('active',next==='2d');
 ui.view3d.setAttribute('aria-pressed',String(next==='3d'));
 ui.view2d.setAttribute('aria-pressed',String(next==='2d'));
 ui.hint.textContent=next==='3d'?'DRAG TO ROTATE · SCROLL TO ZOOM · CLICK A TERRITORY':
  'SELECT A TERRITORY OR CITY · USE 3D TO ROTATE THE EARTH';
 ui.spin.hidden=next!=='3d';
 if(globe){if(next==='3d'&&!document.hidden){globe.resumeAnimation();resizeGlobe()}
  else globe.pauseAnimation();}
 if(next==='2d')render2D(sampleAt());
}
function enterSimulation(at){
 mode='simulation';playing=false;
 simulationAt=clamp(at,EARLIEST,LATEST);
 ui.play.textContent='▶ PLAY THE WAVE';
 update();
}
function setLive(){
 mode='live';playing=false;ui.play.textContent='▶ PLAY THE WAVE';update();
}
function drawSnapshot(at){
 const snap=waveSnapshot(features,at);
 ui.reached.textContent=String(snap.reached).padStart(2,'0');
 ui.waiting.textContent=String(snap.waiting).padStart(2,'0');
 ui.total.textContent=snap.total+' SIMPLIFIED TIME ZONE REGIONS · NOT POPULATION';
 ui.ratio.style.width=snap.percent.toFixed(2)+'%';
 ui.progressText.textContent=snap.reached+'/'+snap.total+' ZONES';
 ui.modeLabel.textContent=mode==='live'?'LIVE WORLD CLOCK':'TIME TRAVEL SIMULATION';
 ui.headerUTC.textContent=releaseLabel(at);
 ui.moment.textContent=releaseLabel(at);
 ui.modeLive.classList.toggle('active',mode==='live');
 ui.modeSim.classList.toggle('active',mode==='simulation');
 ui.modeLive.setAttribute('aria-pressed',String(mode==='live'));
 ui.modeSim.setAttribute('aria-pressed',String(mode==='simulation'));
 ui.slider.value=String(Math.round(timelinePosition(at)));
 ui.timelineInfo.textContent=mode==='live'?'FOLLOWING THE REAL WORLD CLOCK':
  playing?'PLAYING THE 26-HOUR WAVE — '+releaseLabel(at):
  'SIMULATION ACTIVE · '+releaseLabel(at);
 if(snap.next){
  const exemplar=CITIES.find(city=>midnight(city.tz)===snap.next.instant);
  ui.nextName.textContent=exemplar?exemplar.name.toUpperCase():
   fullZoneLabel(snap.next.zones[0]).toUpperCase();
  ui.nextIn.textContent=remainingText(snap.next.instant-at);
  ui.nextUTC.textContent=snap.next.zones.length+' REGION(S) · '+releaseLabel(snap.next.instant);
 }else{
  ui.nextName.textContent='EVERY MIDNIGHT REACHED';
  ui.nextIn.textContent='THE WAVE IS COMPLETE';
  ui.nextUTC.textContent='ALL MAPPED TIME ZONE REGIONS';
 }
 const city=cityState(selected,at);
 ui.selectedName.textContent=city.name.toUpperCase();
 ui.selectedRegion.textContent=city.region;
 ui.selectedZone.textContent=fullZoneLabel(city.tz)+' · '+offsetLabel(city.tz,at);
 ui.selectedClock.textContent=localClock(city.tz,at);
 ui.selectedCountdown.textContent=city.countdown;
 ui.selectedStatus.textContent=city.reached?'MIDNIGHT REACHED':'WAITING';
 ui.selectedStatus.classList.toggle('done',city.reached);
 return snap;
}
function redrawIfChanged(at){
 const milestoneIndex=orderedMilestones.findIndex(m=>m.instant>at);
 const key=(milestoneIndex===-1?orderedMilestones.length:milestoneIndex)+'/'+selected.tz;
 if(key!==lastStatusKey){
  lastStatusKey=key;
  if(view==='3d')refreshGlobe(at);
  else render2D(at);
 }else if(view==='2d'&&last2dKey!==key){render2D(at)}
}
function update(){
 if(!haveLoaded)return;
 nowForWave=sampleAt();
 drawSnapshot(nowForWave);
 redrawIfChanged(nowForWave);
 if(Date.now()-lastListRefresh>3000){renderCityList();lastListRefresh=Date.now()}
}
function chooseCity(city,goTo=true){
 selected=city;lastStatusKey='';last2dKey='';
 if(globe&&goTo){globe.pointOfView({lat:city.lat,lng:city.lng,altitude:2.1},1100);
  globe.controls().autoRotate=false;autoSpin=false;refreshSpinLabel();}
 update();
}
function renderCityList(){
 const term=ui.search.value.trim().toLocaleLowerCase();
 const items=CITIES.filter(c=>(c.name+' '+c.region+' '+c.tz).toLocaleLowerCase().includes(term))
  .sort((a,b)=>midnight(a.tz)-midnight(b.tz)||a.name.localeCompare(b.name));
 ui.cities.replaceChildren();
 const fragment=document.createDocumentFragment();
 for(const city of items){
  const s=cityState(city,nowForWave),btn=document.createElement('button');
  btn.type='button';btn.className=city.name===selected.name?'selected':'';
  btn.setAttribute('aria-label','Select '+city.name+' ('+city.tz+')');
  const name=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small'),
   status=document.createElement('span');
  strong.textContent=city.name;small.textContent=city.region;
  name.append(strong,small);
  status.textContent=s.reached?'REACHED':remainingText(s.release-nowForWave);
  btn.append(name,status);btn.addEventListener('click',()=>chooseCity(city));
  fragment.append(btn);
 }
 if(!items.length){const empty=document.createElement('p');empty.textContent='No matching cities';fragment.append(empty)}
 ui.cities.append(fragment);
}
function makePath(feature){
 const p=new Path2D(),geometry=feature.geometry;
 const polys=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
 for(const poly of polys){
  for(const ring of poly){
   if(!ring.length)continue;
   let prevLng=null,active=false;
   for(const pair of ring){
    const [lng,lat]=pair;
    if(!Number.isFinite(lng)||!Number.isFinite(lat))continue;
    const x=(lng+180)/360*960,y=(90-lat)/180*480;
    if(!active||prevLng!==null&&Math.abs(lng-prevLng)>180){p.moveTo(x,y);active=true}
    else p.lineTo(x,y);
    prevLng=lng;
   }
   if(active)p.closePath();
  }
 }
 return p;
}
function prepare2D(){
 mapPaths=features.map(f=>({feature:f,path:makePath(f)}));
}
function render2D(at){
 if(!haveLoaded||!mapPaths.length)return;
 const canvas=ui.canvas,ctx=canvas.getContext('2d',{alpha:true});
 if(!ctx)return;
 const w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);
 ctx.save();
 ctx.strokeStyle='rgba(163,112,206,.10)';ctx.lineWidth=.75;
 for(let lon=0;lon<=360;lon+=30){ctx.beginPath();ctx.moveTo(lon/360*w,0);ctx.lineTo(lon/360*w,h);ctx.stroke()}
 for(let lat=0;lat<=180;lat+=30){ctx.beginPath();ctx.moveTo(0,lat/180*h);ctx.lineTo(w,lat/180*h);ctx.stroke()}
 for(const {feature:f,path} of mapPaths){
  ctx.fillStyle=colorOf(f,at);ctx.strokeStyle=strokeOf(f,at);
  ctx.lineWidth=f.tzid===selected.tz?1.8:.48;
  ctx.fill(path,'evenodd');ctx.stroke(path);
 }
 for(const city of CITIES){
  const x=(city.lng+180)/360*w,y=(90-city.lat)/180*h,hit=at>=midnight(city.tz);
  ctx.beginPath();ctx.arc(x,y,city.name===selected.name?4.3:2.4,0,Math.PI*2);
  ctx.fillStyle=hit?'#ffc0eb':'#e3b9ff';ctx.shadowColor=hit?'#f868c3':'#bf9dff';
  ctx.shadowBlur=city.name===selected.name?14:6;ctx.fill();
 }
 ctx.restore();last2dKey=lastStatusKey;
}
function canvasCoord(e){
 const rect=ui.canvas.getBoundingClientRect(),scale=Math.min(rect.width/960,rect.height/480);
 const offsetX=(rect.width-960*scale)/2,offsetY=(rect.height-480*scale)/2;
 return {x:(e.clientX-rect.left-offsetX)/scale,y:(e.clientY-rect.top-offsetY)/scale};
}
ui.canvas.addEventListener('click',event=>{
 const {x,y}=canvasCoord(event),ctx=ui.canvas.getContext('2d');
 if(!ctx||x<0||x>960||y<0||y>480)return;
 const nearest=CITIES.map(c=>({city:c,dist:Math.hypot((c.lng+180)/360*960-x,(90-c.lat)/180*480-y)}))
  .sort((a,b)=>a.dist-b.dist)[0];
 if(nearest?.dist<10){chooseCity(nearest.city,false);return}
 for(let i=mapPaths.length-1;i>=0;i--){
  const {feature:f,path}=mapPaths[i];
  if(ctx.isPointInPath(path,x,y,'evenodd')){
   const closeCity=CITIES.find(c=>c.tz===f.tzid);
   chooseCity(closeCity||{name:f.tzid.split('/').pop().replaceAll('_',' '),
    region:'IANA TIME ZONE REGION',tz:f.tzid,lat:90-y/480*180,lng:x/960*360-180},false);
   return;
  }
 }
});
function refreshSpinLabel(){
 ui.spin.textContent='AUTO ROTATE: '+(autoSpin?'ON':'OFF');
 ui.spin.setAttribute('aria-pressed',String(autoSpin));
 if(globe)globe.controls().autoRotate=autoSpin;
}
function refreshGlobe(at){
 if(!globe)return;
 globe.polygonCapColor(f=>colorOf(f,at));
 globe.polygonStrokeColor(f=>strokeOf(f,at));
 globe.pointColor(city=>at>=midnight(city.tz)?'#fa8bcf':'#d1a7ef');
 // City-level ripple markers travel with the world wave for one local hour.
 // Rendering stays cheap: at most a handful of active cities in any offset.
 globe.ringsData(CITIES.filter(city=>{
  const delta=at-midnight(city.tz);
  return delta>=0&&delta<3600000;
 }));
}
function resizeGlobe(){
 if(!globe||view!=='3d')return;
 const {width,height}=ui.stage.getBoundingClientRect();
 globe.width(Math.max(240,Math.round(width))).height(Math.max(240,Math.round(height)));
}
function canWebGL(){
 try{const c=document.createElement('canvas');return Boolean(c.getContext('webgl2')||c.getContext('webgl'))}
 catch{return false}
}
function lowPower(){
 const nav=navigator;
 return Boolean(nav.connection?.saveData)||Boolean(nav.deviceMemory&&nav.deviceMemory<=3)||
  Boolean(nav.hardwareConcurrency&&nav.hardwareConcurrency<=2)||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function loadScript(src){
 return new Promise((resolve,reject)=>{
  if(window.Globe){resolve();return}
  const sc=document.createElement('script');
  sc.src=src;sc.async=true;sc.crossOrigin='anonymous';
  sc.onload=()=>window.Globe?resolve():reject(Error('Globe library unavailable'));
  sc.onerror=()=>reject(Error('3D library could not be loaded'));
  document.head.append(sc);
 });
}
async function initialize3D(force=false){
 if(globe){setView('3d');return}
 if(requested3d)return;
 if(!canWebGL()){loadingMessage('WEBGL UNAVAILABLE · USING 2D MAP',true);
  setTimeout(()=>loadingMessage('',false),3000);return}
 if(!force&&lowPower())return;
 requested3d=true;
 try{
  await loadScript('https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js');
  const create=window.Globe;
  globe=new create(ui.globe,{rendererConfig:{antialias:!lowPower(),alpha:true},animateIn:false,
   waitForGlobeReady:false})
   .backgroundColor('rgba(0,0,0,0)')
   .globeImageUrl('https://cdn.jsdelivr.net/npm/three-globe@2.45.0/example/img/earth-night.jpg')
   .showAtmosphere(true).atmosphereColor('#ae6ae9').atmosphereAltitude(.2)
   .showGraticules(false).polygonAltitude(.006)
   .polygonCapCurvatureResolution(lowPower()?10:7)
   .polygonsTransitionDuration(0)
   .polygonsData(features)
   .polygonCapColor(f=>colorOf(f,sampleAt()))
   .polygonStrokeColor(f=>strokeOf(f,sampleAt()))
   .polygonSideColor('rgba(119,81,160,.08)')
   .onPolygonClick((f,event,where)=>{
     const city=CITIES.find(c=>c.tz===f.tzid);
     chooseCity(city||{name:f.tzid.split('/').pop().replaceAll('_',' '),
      region:'IANA TIME ZONE REGION',tz:f.tzid,lat:where?.lat??0,lng:where?.lng??0});
   })
   .pointsData(CITIES)
   .pointLat('lat').pointLng('lng').pointRadius(.23)
   .pointAltitude(.011).pointResolution(6).pointsTransitionDuration(0)
   .pointColor(c=>sampleAt()>=midnight(c.tz)?'#fa8bcf':'#c9a9ee')
   .pointLabel(c=>c.name+' · '+c.tz)
   .onPointClick(c=>chooseCity(c))
   .ringsData([]).ringLat('lat').ringLng('lng')
   .ringColor(()=>['rgba(253,166,219,.75)','rgba(240,132,214,0)'])
   .ringAltitude(.009).ringMaxRadius(2.9).ringPropagationSpeed(2)
   .ringRepeatPeriod(1300).ringResolution(18)
   .pointOfView({lat:22,lng:17,altitude:2.25},0);
  const controls=globe.controls();
  controls.enablePan=false;
  controls.enableDamping=true;
  controls.dampingFactor=.055;
  controls.minDistance=135;controls.maxDistance=600;
  controls.autoRotateSpeed=.32;
  controls.autoRotate=autoSpin;
  ui.globe.addEventListener('pointerdown',()=>{autoSpin=false;refreshSpinLabel()},{passive:true});
  setView('3d');refreshGlobe(sampleAt());loadingMessage('',false);
 }catch(err){
  try{globe?.pauseAnimation()}catch{}
  globe=null;
  ui.globe.replaceChildren();
  setView('2d');
  loadingMessage('3D UNAVAILABLE · 2D MAP ACTIVE',true);
  setTimeout(()=>loadingMessage('',false),3600);
  console.warn('Midnight Wave 3D fallback:',err);
 }finally{requested3d=false}
}
ui.view2d.addEventListener('click',()=>setView('2d'));
ui.view3d.addEventListener('click',()=>{if(globe)setView('3d');else void initialize3D(true)});
ui.spin.addEventListener('click',()=>{autoSpin=!autoSpin;refreshSpinLabel()});
ui.modeLive.addEventListener('click',setLive);
ui.modeSim.addEventListener('click',()=>enterSimulation(mode==='simulation'?simulationAt:EARLIEST));
ui.reset.addEventListener('click',setLive);
ui.slider.addEventListener('input',()=>enterSimulation(timelineAt(ui.slider.value)));
ui.play.addEventListener('click',()=>{
 if(!haveLoaded)return;
 if(playing){playing=false;ui.play.textContent='▶ RESUME THE WAVE';return}
 if(mode==='live'){mode='simulation';simulationAt=EARLIEST}
 if(simulationAt>=LATEST)simulationAt=EARLIEST;
 playing=true;playStartedAt=performance.now();playStartedTime=simulationAt;
 ui.play.textContent='Ⅱ PAUSE THE WAVE';
 update();
});
ui.search.addEventListener('input',renderCityList);
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){if(globe)globe.pauseAnimation();if(playing){playing=false;ui.play.textContent='▶ RESUME THE WAVE'}}
 else if(globe&&view==='3d')globe.resumeAnimation();
});
window.addEventListener('pagehide',()=>{playing=false;globe?.pauseAnimation()});
if(typeof ResizeObserver==='function'){
 new ResizeObserver(()=>{if(globe)resizeGlobe()}).observe(ui.stage);
}
let lastPaint=0;
function frame(now){
 if(playing&&mode==='simulation'&&!document.hidden){
  simulationAt=Math.min(LATEST,playStartedTime+(now-playStartedAt)*DURATION/46000);
  if(simulationAt>=LATEST){playing=false;ui.play.textContent='▶ REPLAY THE WAVE'}
 }
 // Do not recalculate Intl clocks, city rows and 406 zone states at 60 FPS.
 // Interactive globe rendering is independent of these inexpensive UI ticks.
 const period=playing?110:1000;
 if(!document.hidden&&haveLoaded&&now-lastPaint>=period){lastPaint=now;update()}
 requestAnimationFrame(frame);
}
async function start(){
 try{
  const response=await fetch('content/geo/timezones-simplified.geojson',{cache:'force-cache'});
  if(!response.ok)throw Error('Timezone polygons returned '+response.status);
  const data=await response.json();
  features=buildZones(data.features);
  if(features.length<300)throw Error('Timezone dataset incomplete');
  orderedMilestones=milestones(features);
  prepare2D();haveLoaded=true;
  loadingMessage('',false);
  setView('2d');update();renderCityList();
  requestAnimationFrame(frame);
  if(!lowPower())void initialize3D();
 }catch(error){
  loadingMessage('WORLD MAP DATA UNAVAILABLE · TRY RELOADING',true);
  ui.total.textContent='Unable to load geographical data';
  console.error('Global Midnight Wave:',error);
 }
}
void start();
