import { SITE_CONFIG, TIMELINE, INTEL } from './config.js?v=10';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const DAY = 86_400_000;
const waitStart = new Date(SITE_CONFIG.waitStartISO).getTime();
const phaseClasses = ['phase-final-month','phase-final-week','phase-final-day','phase-final-hour','phase-final-minute','phase-released'];
const storage = {
  get(k){ try { return localStorage.getItem(k); } catch { return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch {} },
  remove(k){ try { localStorage.removeItem(k); } catch {} }
};

const els = {
  days: $('#days'), hours: $('#hours'), minutes: $('#minutes'), seconds: $('#seconds'), ms: $('#milliseconds'),
  progressText: $('#progressText'), progressFill: $('#progressFill'), phasePill: $('#phasePill'), srCountdown: $('#srCountdown'),
  finalMinute: $('#finalMinuteCountdown'), sceneA: $('#sceneA'), sceneB: $('#sceneB'), hero: $('#hero'), heroContent: $('#heroContent'),
  sceneCounter: $('#sceneCounter'), toast: $('#toast'), shareModal: $('#shareModal'), timezoneModal: $('#timezoneModal'), modalBackdrop: $('#modalBackdrop'),
  releaseOverlay: $('#releaseOverlay'), topbar: $('#topbar'), mobileMenu: $('#mobileMenu'), menuButton: $('#menuButton'),
  cursorGlow: $('#cursorGlow'), analyticsConsent: $('#analyticsConsent'), zoneShort: $('#zoneShort'), timezoneNote: $('#timezoneNote'),
  timezoneList: $('#timezoneList'), timezoneSearch: $('#timezoneSearch'), timelineProgress: $('#timelineProgress')
};

let scenes = [];
let allScenes = [];
let currentIndex = 0;
let activeLayer = 0;
let recentScenes = [];
let sceneTimer = null;
let finaleSceneDeck = [];
let finaleSceneCursor = 0;
let finaleDeckPrimed = false;
let releaseTriggered = false;
let currentPhase = '';
let lastSlowUpdate = 0;
let lastSrSecond = -1;
let lastShareUpdate = 0;
let mobileState = matchMedia('(max-width:700px)').matches;
let currentTimeZone = storage.get('tfw_timezone') || SITE_CONFIG.defaultTimeZone;
let release = zonedTargetToUtc(currentTimeZone);
let shareContext = 'site';
let todayData = null;
let countdownRaf = 0;
let countdownBackup = 0;
let lastClockFrame = 0;

const pad = (n, len = 2) => String(Math.max(0, n)).padStart(len, '0');
const isMobile = () => matchMedia('(max-width:700px)').matches;

function partsInZone(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'
  });
  const out = {};
  for (const p of fmt.formatToParts(date)) if (p.type !== 'literal') out[p.type] = Number(p.value);
  return out;
}

function zonedTargetToUtc(timeZone) {
  const t = SITE_CONFIG.releaseDate;
  const targetWall = Date.UTC(t.year, t.month - 1, t.day, t.hour, t.minute, t.second);
  let guess = targetWall;
  try {
    for (let i = 0; i < 3; i++) {
      const p = partsInZone(new Date(guess), timeZone);
      const wallAtGuess = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
      guess -= wallAtGuess - targetWall;
    }
    return guess;
  } catch {
    currentTimeZone = SITE_CONFIG.defaultTimeZone;
    return new Date('2026-11-19T00:00:00+01:00').getTime();
  }
}

function zoneMeta(timeZone) {
  const d = new Date(release);
  try {
    const shortName = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName:'short' }).formatToParts(d).find(p => p.type === 'timeZoneName')?.value || timeZone;
    const p = partsInZone(d, timeZone);
    const localAsUtc = Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
    const offsetMin = Math.round((localAsUtc - d.getTime()) / 60000);
    const sign = offsetMin >= 0 ? '+' : '−';
    const abs = Math.abs(offsetMin);
    const hh = Math.floor(abs / 60);
    const mm = abs % 60;
    const offset = `UTC${sign}${hh}${mm ? `:${String(mm).padStart(2,'0')}` : ''}`;
    const short = timeZone === 'Europe/Rome' ? 'CET' : shortName.replace('GMT', 'UTC');
    return { short, offset };
  } catch { return { short: timeZone, offset:'' }; }
}

function splitRemaining(value) {
  let diff = Math.max(0, Number(value) || 0);
  const total = diff;
  const days = Math.floor(diff / DAY); diff %= DAY;
  const hours = Math.floor(diff / 3_600_000); diff %= 3_600_000;
  const minutes = Math.floor(diff / 60_000); diff %= 60_000;
  const seconds = Math.floor(diff / 1000);
  const milliseconds = Math.floor(diff % 1000);
  return { days, hours, minutes, seconds, milliseconds, total };
}

function splitTime(now = Date.now()) {
  return splitRemaining(release - now);
}

function phaseFor(ms) {
  if (ms <= 0) return { key:'released', label:'THE WAIT IS OVER' };
  if (ms <= 60_000) return { key:'final-minute', label:'THE FINAL MINUTE' };
  if (ms <= 3_600_000) return { key:'final-hour', label:'THE FINAL HOUR' };
  if (ms <= DAY) return { key:'final-day', label:'FINAL 24 HOURS' };
  if (ms <= 7 * DAY) return { key:'final-week', label:'THE FINAL WEEK' };
  if (ms <= 30 * DAY) return { key:'final-month', label:'THE FINAL MONTH' };
  return { key:'normal', label:'THE FINAL WAIT' };
}

function applyPhase(phase) {
  if (phase.key === currentPhase) return;
  phaseClasses.forEach(c => document.body.classList.remove(c));
  if (phase.key !== 'normal') document.body.classList.add(`phase-${phase.key}`);
  currentPhase = phase.key;
  els.phasePill.innerHTML = `<span class="phase-dot"></span> ${phase.label}`;
  if (phase.key === 'final-minute') { window.scrollTo({top:0,behavior:'smooth'}); stopSceneRotation(); }
  else if (phase.key !== 'released') scheduleSceneRotation();
}

function setUnit(el, value, animate = true) {
  if (!el || el.textContent === value) return;
  el.textContent = value;
  if (!animate) return;
  el.classList.remove('tick');
  void el.offsetWidth;
  el.classList.add('tick');
}

function updateCountdown() {
  const realNow = Date.now();
  const previewValue = Number(window.__tfwPreviewRemainingMs);
  const previewActive = Number.isFinite(previewValue);
  const t = previewActive ? splitRemaining(previewValue) : splitTime(realNow);
  const simulatedNow = previewActive ? release - t.total : realNow;

  // Keep the visible clock independent from every non-essential effect below.
  // During Experience Preview the same production clock is driven by the simulated
  // remaining time, so the timer, milliseconds and percentage are all genuine.
  setUnit(els.days, String(t.days), false);
  setUnit(els.hours, pad(t.hours));
  setUnit(els.minutes, pad(t.minutes));
  setUnit(els.seconds, pad(t.seconds));
  setUnit(els.ms, pad(t.milliseconds, 3), false);
  if (els.finalMinute) els.finalMinute.textContent = `${pad(t.hours)}:${pad(t.minutes)}:${pad(t.seconds)}.${pad(t.milliseconds,3)}`;

  try { applyPhase(phaseFor(t.total)); } catch (error) { console.warn('Phase update skipped', error); }

  try {
    const denominator = Math.max(1, release - waitStart);
    const progress = Math.min(1, Math.max(0, (simulatedNow - waitStart) / denominator));
    if (els.progressText) els.progressText.textContent = `${(progress * 100).toFixed(8)}%`;
    if (els.progressFill) els.progressFill.style.width = `${progress * 100}%`;
  } catch (error) { console.warn('Progress update skipped', error); }

  if (t.seconds !== lastSrSecond) {
    try {
      const meta = zoneMeta(currentTimeZone);
      if (els.srCountdown) els.srCountdown.textContent = `${t.days} days, ${t.hours} hours, ${t.minutes} minutes and ${t.seconds} seconds until November 19, 2026 at midnight in ${currentTimeZone}, ${meta.short}.`;
    } catch {}
    lastSrSecond = t.seconds;
  }

  if (realNow - lastShareUpdate > 10_000) {
    const shareCounter = $('#shareCountdownText');
    if (shareCounter) shareCounter.textContent = siteShareText();
    lastShareUpdate = realNow;
  }
  window.__tfwLastRealRemaining = Math.max(0, release - realNow);
  window.__tfwLastRemaining = t.total;
  try { window.dispatchEvent(new CustomEvent('tfw:countdown',{detail:{remaining:t.total,days:t.days,hours:t.hours,minutes:t.minutes,seconds:t.seconds,milliseconds:t.milliseconds,preview:previewActive}})); } catch {}
  if (!previewActive && t.total <= 0 && !releaseTriggered) triggerRelease();
}

function safeCountdownTick(){
  try { updateCountdown(); window.__tfwClockHeartbeat=Date.now(); }
  catch (error) { console.error('Countdown tick failed', error); }
}

window.__tfwRefreshCountdown = safeCountdownTick;

function startCountdownClock(){
  if (countdownRaf) cancelAnimationFrame(countdownRaf);
  if (countdownBackup) clearInterval(countdownBackup);
  if (window.__tfwTimer) clearInterval(window.__tfwTimer);
  const loop = timestamp => {
    const frameBudget = Number(window.__tfwLastRemaining ?? Infinity) <= 1000 ? 14 : 32;
    if (!document.hidden && (!lastClockFrame || timestamp - lastClockFrame >= frameBudget)) {
      safeCountdownTick();
      lastClockFrame = timestamp;
    }
    countdownRaf = requestAnimationFrame(loop);
  };
  safeCountdownTick();
  countdownRaf = requestAnimationFrame(loop);
  // Backup pulse keeps the clock alive if animation frames are throttled or interrupted.
  countdownBackup = setInterval(()=>{if(!document.hidden && Date.now()-Number(window.__tfwClockHeartbeat||0)>250)safeCountdownTick()}, 300);
  window.__tfwTimer = countdownBackup;
  window.__tfwClockHealthy = true;
}


function updateZoneUI() {
  const meta = zoneMeta(currentTimeZone);
  els.zoneShort.textContent = `${meta.short} · ${meta.offset}`;
  if (els.timezoneNote) els.timezoneNote.textContent = `THIS COUNTDOWN REFERS TO ${meta.short}${meta.offset ? ` (${meta.offset})` : ''}.`;
  $$('.timezone-option').forEach(el => el.classList.toggle('active', el.dataset.zone === currentTimeZone));
}

function setTimeZone(zone) {
  currentTimeZone = zone;
  storage.set('tfw_timezone', zone);
  release = zonedTargetToUtc(zone);
  releaseTriggered = false;
  document.body.classList.remove('phase-released');
  updateZoneUI();
  closeModals();
  showToast(`COUNTDOWN SET TO ${zone.replaceAll('_',' ')}`);
  window.dispatchEvent(new CustomEvent('tfw:timezone-change',{detail:{zone}}));
  safeCountdownTick();
  track('timezone_change', { zone });
}

function triggerRelease() {
  releaseTriggered = true;
  stopSceneRotation();
  document.body.classList.add('phase-released');
  // V9: the release reveal is rendered in-place by milestones.js where the timer lived.
  // Keep the legacy overlay dormant so the site never becomes a separate full-screen release page.
  if (els.releaseOverlay) {
    els.releaseOverlay.classList.remove('active','sequence');
    els.releaseOverlay.setAttribute('aria-hidden','true');
  }
  window.dispatchEvent(new CustomEvent('tfw:release'));
  track('release_sequence_shown');
}

async function loadScenes() {
  const response = await fetch('./assets/scenes.json', { cache:'no-cache' });
  if (!response.ok) throw new Error(`Unable to load scenes.json (${response.status})`);
  allScenes = (await response.json()).filter(s => s.desktop && s.mobile);
  scenes = allScenes.filter(s => s.category !== 'artwork' && s.mediaType !== 'artwork');
  if (!scenes.length) throw new Error('No scenes configured');
  const preferred = scenes.findIndex(s => s.id === 'scene-02');
  currentIndex = preferred >= 0 ? preferred : 0;
  recentScenes = [currentIndex];
  applyScene(els.sceneA, scenes[currentIndex], true);
  updateSceneCounter();
  preloadChoice(pickNextScene());
  scheduleSceneRotation();
}

function srcFor(scene){ return isMobile() ? scene.mobile : scene.desktop; }
function positionFor(scene){ return isMobile() ? (scene.mobilePosition || scene.position || '50% 50%') : (scene.desktopPosition || scene.position || '50% 50%'); }
function sceneById(id){ return allScenes.find(s => s.id === id) || scenes[0]; }
function applyScene(layer, scene, immediate=false){
  if (!scene) return;
  layer.style.backgroundImage = `url("${srcFor(scene)}")`;
  layer.style.backgroundPosition = positionFor(scene);
  document.documentElement.style.setProperty('--scene-accent', scene.accent || 'var(--accent)');
  if (immediate) layer.classList.add('active');
}
function pickNextScene(){
  if (scenes.length < 2) return null;
  const current = scenes[currentIndex];
  const recentSet = new Set(recentScenes.slice(-5));
  let pool = scenes.map((scene,index)=>({scene,index})).filter(({index})=>index!==currentIndex&&!recentSet.has(index));
  const diverse = pool.filter(({scene}) => (!current?.tone || scene.tone !== current.tone) && (!current?.category || scene.category !== current.category));
  if (diverse.length) pool = diverse;
  if (!pool.length) pool = scenes.map((scene,index)=>({scene,index})).filter(({index})=>index!==currentIndex);
  return pool[Math.floor(Math.random()*pool.length)];
}
function preloadChoice(choice){ if (!choice) return; const img = new Image(); img.decoding='async'; img.src=srcFor(choice.scene); }
function changeScene(forceChoice=null, allowFinale=false){
  if (!scenes.length || currentPhase==='released' || (currentPhase==='final-minute' && !allowFinale)) return;
  const choice = forceChoice || pickNextScene(); if (!choice) return;
  const incoming = activeLayer === 0 ? els.sceneB : els.sceneA;
  const outgoing = activeLayer === 0 ? els.sceneA : els.sceneB;
  applyScene(incoming, choice.scene);
  els.hero.classList.remove('scene-changing'); void els.hero.offsetWidth; els.hero.classList.add('scene-changing');
  requestAnimationFrame(()=>{ incoming.classList.add('active'); outgoing.classList.remove('active'); });
  activeLayer = 1-activeLayer; currentIndex=choice.index; recentScenes.push(currentIndex); if (recentScenes.length>8) recentScenes.shift();
  updateSceneCounter(); preloadChoice(pickNextScene()); track('scene_change',{scene:choice.scene.id});
}
function updateSceneCounter(){ if (scenes.length) els.sceneCounter.textContent=`SCENE: ${currentIndex+1} / ${scenes.length}`; }
function scheduleSceneRotation(){
  if (sceneTimer || !scenes.length || ['final-minute','released'].includes(currentPhase)) return;
  sceneTimer=setTimeout(function rotate(){ sceneTimer=null; if(!document.hidden) changeScene(); scheduleSceneRotation(); }, SITE_CONFIG.backgroundIntervalMs);
}
function stopSceneRotation(){ if(sceneTimer) clearTimeout(sceneTimer); sceneTimer=null; }

function primeFinaleSceneDeck(){
  if(finaleDeckPrimed||!scenes.length)return;
  finaleDeckPrimed=true;
  const candidates=scenes.map((scene,index)=>({scene,index})).filter(({index})=>index!==currentIndex);
  for(let i=candidates.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]]}
  finaleSceneDeck=candidates.slice(0,Math.min(20,candidates.length));
  finaleSceneCursor=0;
  // Prime a smaller deck during the five-minute lead-in so the final-second rush stays smooth without overloading decoding.
  finaleSceneDeck.forEach((choice,i)=>setTimeout(()=>preloadChoice(choice),i*120));
}

window.addEventListener('tfw:finale-start',primeFinaleSceneDeck);
// The finale controller can request scene changes faster than the normal 10s rotation.
// This path intentionally bypasses the final-minute lock while preserving the normal lock elsewhere.
window.addEventListener('tfw:finale-scene-step',()=>{
  if(document.hidden || !scenes.length || currentPhase==='released')return;
  primeFinaleSceneDeck();
  const choice=finaleSceneDeck.length?finaleSceneDeck[finaleSceneCursor++%finaleSceneDeck.length]:null;
  changeScene(choice,true);
});

async function loadToday(){
  const r = await fetch('./content/today.json',{cache:'no-cache'}); if(!r.ok) throw new Error('today.json failed'); todayData=await r.json();
  const scene = sceneById(todayData.cardSceneId || todayData.heroSceneId);
  $('#dailyImage').style.backgroundImage=`url("${srcFor(scene)}")`; $('#dailyImage').style.backgroundPosition=positionFor(scene);
  $('#dailyIssue').textContent=todayData.issue; $('#dailyDate').textContent=todayData.date; $('#dailyTag').textContent=todayData.category;
  $('#dailyTitle').textContent=todayData.headline; $('#dailyText').textContent=todayData.dek; $('#dailyReadTime').textContent=todayData.readingTime;
}

function escapeHtml(v){ return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function renderTimeline(){
  $('#timelineList').innerHTML = TIMELINE.map((item,i)=>{
    const scene = sceneById(item.sceneId);
    const articleHref=`timeline.html?story=${encodeURIComponent(item.articleId || '')}`;
    const sourceLinks=[
      item.primaryUrl ? `<a class="timeline-source magnetic" href="${escapeHtml(item.primaryUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.primaryLabel || 'SOURCE')} ↗</a>` : '',
      item.secondaryUrl ? `<a class="timeline-source secondary magnetic" href="${escapeHtml(item.secondaryUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.secondaryLabel || 'MORE')} ↗</a>` : ''
    ].filter(Boolean).join('');
    return `<article class="timeline-item" data-timeline-index="${i}">
      <div class="timeline-visual reveal"><img class="cinematic-media" src="${escapeHtml(srcFor(scene))}" alt="" loading="lazy" style="object-position:${escapeHtml(positionFor(scene))}"><span>${escapeHtml(item.type)}</span></div>
      <div class="timeline-node"><i></i><time>${escapeHtml(item.date)}</time></div>
      <div class="timeline-copy reveal"><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p><div class="timeline-actions"><a class="timeline-link magnetic" href="${articleHref}">READ STORY <span>↗</span></a>${sourceLinks}</div></div>
    </article>`;
  }).join('');
}

function renderIntel(filter='ALL'){
  const visible = filter==='ALL' ? INTEL : INTEL.filter(x=>x.category===filter);
  $('#intelGrid').innerHTML = visible.map(item=>{
    const scene=sceneById(item.sceneId);
    const href=`intel.html?article=${encodeURIComponent(item.articleId || '')}`;
    return `<a class="intel-card reveal tilt-card" data-category="${item.category}" href="${href}" aria-label="Read ${escapeHtml(item.kicker)} dossier">
      <div class="intel-image" style="background-image:url('${srcFor(scene)}');background-position:${positionFor(scene)}"></div>
      <div class="intel-copy"><span class="intel-badge">${escapeHtml(item.category)}</span><br><span>${escapeHtml(item.kicker)}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p><span class="intel-read">READ THE FULL DOSSIER <b>↗</b></span></div>
    </a>`;
  }).join('');
  observeReveals(); bindTilts(); bindNavigationTransitions();
}

function observeReveals(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){ $$('.reveal').forEach(el=>el.classList.add('visible')); return; }
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{ if(entry.isIntersecting){ entry.target.classList.add('visible'); io.unobserve(entry.target); } }),{threshold:.1});
  $$('.reveal:not(.visible)').forEach(el=>io.observe(el));
}

let timelineTarget = 0;
function updateTimelineProgress(){
  const viewport=$('#timelineViewport'), items=$$('.timeline-item');
  if(!viewport || !items.length) return;
  const max=Math.max(0,viewport.scrollWidth-viewport.clientWidth);
  const center=viewport.getBoundingClientRect().left+viewport.clientWidth/2;
  let index=0, distance=Infinity;
  items.forEach((item,i)=>{const r=item.getBoundingClientRect(),d=Math.abs(r.left+r.width/2-center);if(d<distance){distance=d;index=i}});
  if(viewport.scrollLeft<=2)index=0;
  if(max>0 && viewport.scrollLeft>=max-2)index=items.length-1;
  items.forEach((item,i)=>{item.classList.toggle('active',i===index);item.classList.toggle('visited',i<index);if(i===index)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current')});
  els.timelineProgress.style.width=`${(index+1)/items.length*100}%`;
  $('#timelinePrev').disabled=index===0;
  $('#timelineNext').disabled=index===items.length-1;
  const label=$('#timelinePosition');if(label)label.textContent=`${String(index+1).padStart(2,'0')} / ${items.length} · ${TIMELINE[index].date}`;
  timelineTarget=index;
}
function syncTimelineEdge(){
  const viewport=$('#timelineViewport'),list=$('#timelineList'),first=$('.timeline-item');
  if(!viewport||!list||!first)return;
  list.style.setProperty('--timeline-edge',`${Math.max(0,(viewport.clientWidth-first.offsetWidth)/2)}px`);
}
function scrollTimelineTo(index,instant=false){
  const viewport=$('#timelineViewport'),items=$$('.timeline-item');if(!viewport||!items.length)return;
  timelineTarget=Math.max(0,Math.min(items.length-1,index));
  const target=items[timelineTarget];
  const left=target.getBoundingClientRect().left-viewport.getBoundingClientRect().left+viewport.scrollLeft+(target.offsetWidth-viewport.clientWidth)/2;
  viewport.scrollTo({left:Math.max(0,Math.min(viewport.scrollWidth-viewport.clientWidth,left)),behavior:instant||matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
}
function bindTimeline(){
  const viewport=$('#timelineViewport');if(!viewport)return;
  syncTimelineEdge();
  $('#timelinePrev').addEventListener('click',()=>scrollTimelineTo(timelineTarget-1));
  $('#timelineNext').addEventListener('click',()=>scrollTimelineTo(timelineTarget+1));
  let frame=0;
  viewport.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;updateTimelineProgress()})},{passive:true});
  viewport.addEventListener('keydown',e=>{const keys={ArrowLeft:timelineTarget-1,ArrowRight:timelineTarget+1,Home:0,End:TIMELINE.length-1};if(e.key in keys){e.preventDefault();scrollTimelineTo(keys[e.key],e.key==='Home'||e.key==='End')}});
  if(matchMedia('(pointer:fine)').matches){
    let drag=null;
    viewport.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('a,button'))return;drag={x:e.clientX,left:viewport.scrollLeft};viewport.setPointerCapture(e.pointerId);viewport.classList.add('dragging')});
    viewport.addEventListener('pointermove',e=>{if(drag)viewport.scrollLeft=drag.left+drag.x-e.clientX});
    const end=()=>{if(!drag)return;drag=null;viewport.classList.remove('dragging');updateTimelineProgress();scrollTimelineTo(timelineTarget)};
    viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);
  }
  new ResizeObserver(()=>{syncTimelineEdge();scrollTimelineTo(timelineTarget,true)}).observe(viewport);
  viewport.scrollLeft=0;updateTimelineProgress();
}

function bindParallax(){
  if(!matchMedia('(pointer:fine)').matches || matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  document.body.classList.add('has-pointer');
  window.addEventListener('pointermove',e=>{
    els.cursorGlow.style.left=`${e.clientX}px`; els.cursorGlow.style.top=`${e.clientY}px`;
    if(e.clientY<=innerHeight && scrollY<innerHeight){ const x=(e.clientX/innerWidth-.5)*11; const y=(e.clientY/innerHeight-.5)*8; document.documentElement.style.setProperty('--scene-x',`${-x}px`); document.documentElement.style.setProperty('--scene-y',`${-y}px`); els.heroContent.style.transform=`translate3d(${x*.1}px,${y*.1}px,0)`; }
  },{passive:true});
  els.hero.addEventListener('pointerleave',()=>{ document.documentElement.style.setProperty('--scene-x','0px'); document.documentElement.style.setProperty('--scene-y','0px'); els.heroContent.style.transform=''; });
}

function bindMagnetic(){
  if(!matchMedia('(pointer:fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $$('.magnetic').forEach(el=>{
    if(el.dataset.magneticBound) return; el.dataset.magneticBound='1';
    el.addEventListener('pointermove',e=>{ const r=el.getBoundingClientRect(); const x=(e.clientX-r.left-r.width/2)*.09; const y=(e.clientY-r.top-r.height/2)*.12; el.style.transform=`translate3d(${x}px,${y}px,0)`; });
    el.addEventListener('pointerleave',()=>{ el.style.transform=''; });
  });
}
function bindTilts(){
  if(!matchMedia('(pointer:fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $$('.tilt-card').forEach(el=>{
    if(el.dataset.tiltBound) return; el.dataset.tiltBound='1';
    el.addEventListener('pointermove',e=>{ const r=el.getBoundingClientRect(); const rx=((e.clientY-r.top)/r.height-.5)*-1.6; const ry=((e.clientX-r.left)/r.width-.5)*2; el.style.transform=`perspective(1100px) rotateX(${rx}deg) rotateY(${ry}deg)`; });
    el.addEventListener('pointerleave',()=>{ el.style.transform=''; });
  });
}

function remainingShareParts(){ const t=splitTime(); if(t.days>0)return `${t.days} day${t.days===1?'':'s'}`; if(t.hours>0)return `${t.hours} hour${t.hours===1?'':'s'}`; if(t.minutes>0)return `${t.minutes} minute${t.minutes===1?'':'s'}`; return `${t.seconds} second${t.seconds===1?'':'s'}`; }
function siteShareText(){ return release<=Date.now() ? 'The wait is over. Welcome to Leonida.' : `${remainingShareParts()} until Grand Theft Auto VI. The Final Wait: Road to Leonida.`; }
function articleShareText(){ return todayData ? `${todayData.headline} — Today in Leonida.` : 'Today in Leonida — The Final Wait.'; }
function sharePayload(){
  const article=shareContext==='article'; return { text:article?articleShareText():siteShareText(), url:new URL(article?'today.html':'./',location.href).href };
}
async function copyText(text,msg){ try{await navigator.clipboard.writeText(text);}catch{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}showToast(msg); }
async function doShare(kind){
  const {text,url}=sharePayload(); track('share',{channel:kind,context:shareContext});
  if(kind==='x') window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,'_blank','noopener');
  else if(kind==='whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,'_blank','noopener');
  else if(kind==='native') {
    if(navigator.share){ try{await navigator.share({title:shareContext==='article'?'Today in Leonida':'The Final Wait',text,url}); return;}catch(e){if(e.name==='AbortError')return;} }
    await copyText(url, shareContext==='article'?'ARTICLE LINK COPIED':'WEBSITE LINK COPIED');
  }
}
function openShare(context='site'){ shareContext=context; closeMobileMenu(); const p=sharePayload(); $('#modalShareText').textContent=p.text; $('#modalShareTitle').textContent=context==='article'?'SHARE TODAY IN LEONIDA.':'THE WAIT IS GETTING SHORTER.'; openModal(els.shareModal); }
function openModal(modal){ closeModals(false); modal.hidden=false; els.modalBackdrop.hidden=false; document.body.style.overflow='hidden'; requestAnimationFrame(()=>modal.focus()); }
function closeModals(clearOverflow=true){ if(els.shareModal)els.shareModal.hidden=true; if(els.timezoneModal)els.timezoneModal.hidden=true; els.modalBackdrop.hidden=true; if(clearOverflow && currentPhase!=='final-minute')document.body.style.overflow=''; }
function showToast(message){ els.toast.textContent=message; els.toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer=setTimeout(()=>els.toast.classList.remove('show'),1900); }

function allTimeZones(){
  try { if(Intl.supportedValuesOf) return Intl.supportedValuesOf('timeZone'); } catch {}
  return ['Europe/Rome','Europe/London','Europe/Paris','Europe/Berlin','Europe/Madrid','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Sao_Paulo','America/Mexico_City','Asia/Tokyo','Asia/Seoul','Asia/Shanghai','Asia/Hong_Kong','Asia/Singapore','Asia/Dubai','Asia/Kolkata','Australia/Sydney','Pacific/Auckland','Africa/Johannesburg'];
}
function renderTimeZones(query=''){
  const q=query.trim().toLowerCase(); const zones=allTimeZones().filter(z=>!q||z.toLowerCase().replaceAll('_',' ').includes(q));
  els.timezoneList.innerHTML=zones.map(z=>{ const oldRelease=release; const zoneRelease=zonedTargetToUtc(z); const d=new Date(zoneRelease); let meta; try{const shortName=new Intl.DateTimeFormat('en-US',{timeZone:z,timeZoneName:'short'}).formatToParts(d).find(p=>p.type==='timeZoneName')?.value||'';const p=partsInZone(d,z);const off=Math.round((Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-d.getTime())/60000);const sign=off>=0?'+':'−';const abs=Math.abs(off);meta={short:z==='Europe/Rome'?'CET':shortName.replace('GMT','UTC'),offset:`UTC${sign}${Math.floor(abs/60)}${abs%60?`:${String(abs%60).padStart(2,'0')}`:''}`};}catch{meta={short:'',offset:''}} release=oldRelease; return `<button class="timezone-option ${z===currentTimeZone?'active':''}" type="button" data-zone="${z}"><strong>${escapeHtml(z.replaceAll('_',' '))}</strong><span>${escapeHtml(`${meta.short} · ${meta.offset}`)}</span></button>`; }).join('');
  $$('.timezone-option').forEach(b=>b.addEventListener('click',()=>setTimeZone(b.dataset.zone)));
}

async function toggleFullscreen(){ try{ if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.(); else await document.exitFullscreen?.(); closeMobileMenu(); track('fullscreen_toggle',{enabled:!!document.fullscreenElement}); }catch{showToast('FULLSCREEN IS NOT AVAILABLE HERE');} }
function openMobileMenu(){els.mobileMenu.hidden=false;els.menuButton.setAttribute('aria-expanded','true');els.menuButton.textContent='CLOSE'}
function closeMobileMenu(){els.mobileMenu.hidden=true;els.menuButton.setAttribute('aria-expanded','false');els.menuButton.textContent='MENU'}
function toggleMobileMenu(){els.mobileMenu.hidden?openMobileMenu():closeMobileMenu()}


function smoothScrollToTarget(target, duration=900){
  if(!target) return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){ target.scrollIntoView({block:'start'}); return; }
  const topbarOffset=Math.max(0,(els.topbar?.offsetHeight || 0)-2);
  const start=window.scrollY;
  const end=Math.max(0,target.getBoundingClientRect().top+window.scrollY-topbarOffset);
  const distance=end-start;
  if(Math.abs(distance)<2) return;
  const started=performance.now();
  const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const frame=now=>{
    const t=Math.min(1,(now-started)/duration);
    window.scrollTo(0,start+distance*ease(t));
    if(t<1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function showRouteLoader(label='LOADING'){ 
  const loader=$('#routeLoader'); if(!loader) return;
  const text=$('#routeLoaderLabel'); if(text) text.textContent=label;
  loader.setAttribute('aria-hidden','false');
  loader.classList.remove('active'); void loader.offsetWidth; loader.classList.add('active');
}
function hideRouteLoader(){ const loader=$('#routeLoader'); if(!loader)return; loader.classList.remove('active'); loader.setAttribute('aria-hidden','true'); }
function routeLabelFor(href){
  if(href.includes('today.html')) return 'OPENING TODAY IN LEONIDA';
  if(href.includes('intel.html')) return 'OPENING LEONIDA DOSSIER';
  if(href.includes('timeline.html')) return 'OPENING TIMELINE STORY';
  return 'LOADING THE FINAL WAIT';
}

function bindNavigationTransitions(){
  $$('a[href]').forEach(a=>{
    if(a.dataset.transitionBound) return;
    const href=a.getAttribute('href')||'';
    if(href.startsWith('#')){
      a.dataset.transitionBound='1';
      a.addEventListener('click',e=>{
        const target=$(href); if(!target)return;
        e.preventDefault(); closeMobileMenu();
        history.replaceState(null,'',href);
        smoothScrollToTarget(target, href==='#hero' ? 760 : 920);
      });
    } else if(!a.target && !href.startsWith('http') && !href.startsWith('mailto:')){
      a.dataset.transitionBound='1';
      a.addEventListener('click',e=>{
        if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;
        e.preventDefault();
        showRouteLoader(routeLabelFor(href));
        setTimeout(()=>{ location.href=a.href; },900);
      });
    }
  });
  window.addEventListener('pageshow',hideRouteLoader);
}

// Lightweight original procedural ambient pad; no copyrighted audio file is included.
let audioCtx=null,soundtrackTimer=null,soundWanted=storage.get('tfw_sound')!=='off',soundStarted=false,chordIndex=0;
const chords=[[110,164.81,220],[87.31,130.81,174.61],[130.81,164.81,196],[98,146.83,196]];
function schedulePadChord(startAt){if(!audioCtx||!soundWanted)return;const chord=chords[chordIndex++%chords.length],master=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(820,startAt);master.gain.setValueAtTime(.0001,startAt);master.gain.exponentialRampToValueAtTime(.022,startAt+1.8);master.gain.setValueAtTime(.022,startAt+5.8);master.gain.exponentialRampToValueAtTime(.0001,startAt+8.2);filter.connect(master);master.connect(audioCtx.destination);chord.forEach((f,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=i===1?'triangle':'sine';o.frequency.setValueAtTime(f,startAt);o.detune.setValueAtTime(i===0?-5:i===2?5:0,startAt);g.gain.value=i===0?.42:.26;o.connect(g);g.connect(filter);o.start(startAt);o.stop(startAt+8.4)})}
async function startSoundtrack(){if(!soundWanted||soundStarted||document.body.classList.contains('final-five-active')||document.body.classList.contains('finale-released'))return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;try{audioCtx=new AC();await audioCtx.resume();if(audioCtx.state!=='running')throw new Error();soundStarted=true;chordIndex=0;schedulePadChord(audioCtx.currentTime+.05);soundtrackTimer=setInterval(()=>{if(audioCtx?.state==='running')schedulePadChord(audioCtx.currentTime+.05)},8000);updateSoundUI();track('sound_started')}catch{soundStarted=false;try{await audioCtx?.close()}catch{}audioCtx=null}}
async function stopSoundtrack(){if(soundtrackTimer)clearInterval(soundtrackTimer);soundtrackTimer=null;try{await audioCtx?.close()}catch{}audioCtx=null;soundStarted=false;updateSoundUI()}
function updateSoundUI(){[$('#soundButton'),$('#mobileSoundButton')].forEach(b=>{if(!b)return;b.setAttribute('aria-pressed',String(soundWanted));const l=$('.sound-label',b);if(l)l.textContent=soundWanted?(soundStarted?'SOUND':'SOUND ARMED'):'MUTED'})}
async function toggleSound(){soundWanted=!soundWanted;storage.set('tfw_sound',soundWanted?'on':'off');const finale=document.body.classList.contains('final-five-active')||document.body.classList.contains('finale-released')||document.body.classList.contains('finale-previewing');if(soundWanted){if(finale)window.dispatchEvent(new CustomEvent('tfw:finale-audio-enable'));else await startSoundtrack()}else await stopSoundtrack();window.dispatchEvent(new CustomEvent('tfw:sound-change',{detail:{enabled:soundWanted}}));updateSoundUI();track('sound_toggle',{enabled:soundWanted})}
function armAutoplay(){startSoundtrack();const g=()=>{if(soundWanted&&!document.body.classList.contains('final-five-active')&&!document.body.classList.contains('finale-released'))startSoundtrack()};['pointerdown','keydown','touchstart'].forEach(e=>window.addEventListener(e,g,{once:true,capture:true,passive:true}))}
window.addEventListener('tfw:finale-start',()=>{if(soundStarted)stopSoundtrack()});

function initAnalytics(){const id=SITE_CONFIG.gaMeasurementId?.trim();if(!id)return;$('#privacyButton').hidden=false;const saved=storage.get('tfw_analytics');if(!SITE_CONFIG.analyticsConsentRequired)return loadAnalytics(id);if(saved==='yes')return loadAnalytics(id);if(saved==='no')return;els.analyticsConsent.hidden=false}
function loadAnalytics(id){if(window.gtag)return;const s=document.createElement('script');s.async=true;s.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;document.head.appendChild(s);window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};window.gtag('js',new Date());window.gtag('config',id,{anonymize_ip:true})}
function track(name,params={}){if(window.gtag)window.gtag('event',name,params)}

function bindUi(){
  $('#nextScene').addEventListener('click',()=>{changeScene();stopSceneRotation();scheduleSceneRotation()});
  $('#shareButton').addEventListener('click',()=>openShare('site')); $('#mobileShareButton').addEventListener('click',()=>openShare('site')); $('#dailyShare').addEventListener('click',()=>openShare('article'));
  $('#closeShare').addEventListener('click',()=>closeModals()); $('#closeTimezone').addEventListener('click',()=>closeModals()); els.modalBackdrop.addEventListener('click',()=>closeModals());
  $$('[data-share]').forEach(b=>b.addEventListener('click',()=>doShare(b.dataset.share)));
  $('#zoneButton').addEventListener('click',()=>{renderTimeZones();openModal(els.timezoneModal);setTimeout(()=>els.timezoneSearch.focus(),50)}); els.timezoneSearch.addEventListener('input',()=>renderTimeZones(els.timezoneSearch.value));
  $('#fullscreenButton').addEventListener('click',toggleFullscreen); $('#mobileFullscreenButton').addEventListener('click',toggleFullscreen); if(!document.documentElement.requestFullscreen){$('#fullscreenButton').hidden=true;$('#mobileFullscreenButton').hidden=true}
  $('#soundButton').addEventListener('click',e=>{e.stopPropagation();toggleSound()}); $('#mobileSoundButton').addEventListener('click',e=>{e.stopPropagation();toggleSound()}); els.menuButton.addEventListener('click',toggleMobileMenu); $$('#mobileMenu a').forEach(a=>a.addEventListener('click',closeMobileMenu));
  $$('#intelFilter button').forEach(b=>b.addEventListener('click',()=>{$$('#intelFilter button').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderIntel(b.dataset.filter);track('intel_filter',{filter:b.dataset.filter})}));
  $('#analyticsAccept').addEventListener('click',()=>{storage.set('tfw_analytics','yes');els.analyticsConsent.hidden=true;loadAnalytics(SITE_CONFIG.gaMeasurementId.trim())}); $('#analyticsDecline').addEventListener('click',()=>{storage.set('tfw_analytics','no');els.analyticsConsent.hidden=true}); $('#privacyButton').addEventListener('click',()=>{storage.remove('tfw_analytics');els.analyticsConsent.hidden=false});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModals();closeMobileMenu()}}); document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSceneRotation();else scheduleSceneRotation()});
  let idleTimer; const wake=()=>{els.topbar.classList.remove('idle');clearTimeout(idleTimer);if(scrollY<innerHeight*.7&&matchMedia('(pointer:fine)').matches)idleTimer=setTimeout(()=>els.topbar.classList.add('idle'),4800)};
  window.addEventListener('scroll',()=>{els.topbar.classList.toggle('scrolled',scrollY>30);$('#returnCountdown')?.classList.toggle('visible',scrollY>innerHeight*.72);updateTimelineProgress();wake()},{passive:true}); ['pointermove','keydown'].forEach(e=>window.addEventListener(e,wake,{passive:true})); wake();
  window.addEventListener('resize',()=>{syncTimelineEdge();const next=isMobile();if(next!==mobileState&&scenes.length){mobileState=next;const current=scenes[currentIndex],active=activeLayer===0?els.sceneA:els.sceneB;active.style.backgroundImage=`url("${srcFor(current)}")`;active.style.backgroundPosition=positionFor(current);loadToday();renderIntel($('#intelFilter .active')?.dataset.filter||'ALL')}updateTimelineProgress()},{passive:true});
}

async function init(){
  updateSoundUI(); bindUi(); bindParallax(); initAnalytics(); updateZoneUI();
  try{await loadScenes();await loadToday();renderTimeline();renderIntel();observeReveals();bindMagnetic();bindTilts();bindTimeline();bindNavigationTransitions();updateTimelineProgress()}catch(error){console.error(error);showToast('SOME VISUAL ASSETS COULD NOT LOAD')}
  armAutoplay(); startCountdownClock();
  document.addEventListener('visibilitychange',()=>{ if(!document.hidden) safeCountdownTick(); });
  const initialHash=window.__tfwInitialHash;
  if(initialHash){
    const target=document.getElementById(initialHash.slice(1));
    if(target){
      history.replaceState(null,'',initialHash);
      target.querySelectorAll('.reveal').forEach(el=>el.classList.add('visible'));
      const top=target.getBoundingClientRect().top+scrollY-(els.topbar?.offsetHeight||0);
      window.scrollTo({top:Math.max(0,top),behavior:'instant'});
    }
    requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.classList.remove('anchor-loading')));
  }
  document.dispatchEvent(new Event('tfw:content-ready'));

}
init();
