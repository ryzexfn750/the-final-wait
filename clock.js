(()=>{
  'use strict';
  const DAY=86400000,HOUR=3600000,MINUTE=60000,SECOND=1000;
  const waitStart=Date.parse('2025-11-05T23:00:00Z');
  let zone='Europe/Rome';
  try{zone=localStorage.getItem('tfw_timezone')||zone}catch{}
  const $=id=>document.getElementById(id);
  const pad=(n,l=2)=>String(Math.max(0,Math.floor(n))).padStart(l,'0');
  const storage={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};

  function partsInZone(date,z){
    const fmt=new Intl.DateTimeFormat('en-US',{timeZone:z,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    const out={};for(const p of fmt.formatToParts(date))if(p.type!=='literal')out[p.type]=Number(p.value);return out;
  }
  function targetInZone(z){
    const wall=Date.UTC(2026,10,19,0,0,0);let guess=wall;
    try{for(let i=0;i<4;i++){const p=partsInZone(new Date(guess),z);const localAsUtc=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);guess-=localAsUtc-wall}return guess}catch{return Date.parse('2026-11-18T23:00:00Z')}
  }
  let release=targetInZone(zone);window.__tfwReleaseEpoch=release;
  function effectiveRemaining(){const p=Number(window.__tfwPreviewRemainingMs);return Number.isFinite(p)?p:release-Date.now()}
  function setText(id,v){const e=$(id);if(e&&e.textContent!==v)e.textContent=v}
  function render(){
    let total=effectiveRemaining();
    const preview=Number.isFinite(Number(window.__tfwPreviewRemainingMs));
    const released=total<=0;
    let diff=Math.max(0,total);const days=Math.floor(diff/DAY);diff%=DAY;const hours=Math.floor(diff/HOUR);diff%=HOUR;const minutes=Math.floor(diff/MINUTE);diff%=MINUTE;const seconds=Math.floor(diff/SECOND);const ms=Math.floor(diff%SECOND);
    setText('days',String(days));setText('hours',pad(hours));setText('minutes',pad(minutes));setText('seconds',pad(seconds));setText('milliseconds',pad(ms,3));
    const simulatedNow=preview?release-total:Date.now();const progress=Math.min(1,Math.max(0,(simulatedNow-waitStart)/Math.max(1,release-waitStart)));
    setText('progressText',(progress*100).toFixed(8)+'%');const fill=$('progressFill');if(fill)fill.style.width=(progress*100)+'%';
    window.__tfwLastRemaining=total;window.__tfwLastRealRemaining=Math.max(0,release-Date.now());window.__tfwClockHeartbeat=Date.now();
    try{dispatchEvent(new CustomEvent('tfw:countdown',{detail:{remaining:total,preview,released}}))}catch{}
  }
  let raf=0,last=0,backup=0;
  function loop(ts){if(!document.hidden&&(!last||ts-last>=32)){last=ts;render()}raf=requestAnimationFrame(loop)}
  function start(){cancelAnimationFrame(raf);clearInterval(backup);render();raf=requestAnimationFrame(loop);backup=setInterval(()=>{if(!document.hidden&&Date.now()-Number(window.__tfwClockHeartbeat||0)>250)render()},300)}
  window.__tfwRefreshCountdown=render;
  addEventListener('tfw:timezone-change',e=>{zone=e.detail?.zone||zone;release=targetInZone(zone);window.__tfwReleaseEpoch=release;render()});
  addEventListener('pageshow',start);document.addEventListener('visibilitychange',()=>{if(!document.hidden)start()});

  /* Long-form live background soundtrack. It is permanently killed for the launch flow at T-05:00. */
  const BG='assets/audio/background-live.mp3';
  let bg=null,bgWanted=storage.get('tfw_sound')!=='off',bgKilled=false;
  window.__tfwExternalAudioActive=true;
  function ensureBg(){if(bg)return bg;bg=new Audio(BG);bg.loop=true;bg.preload='metadata';bg.playsInline=true;bg.volume=.22;return bg}
  function syncButtons(){document.querySelectorAll('#soundButton,#mobileSoundButton').forEach(b=>{b.setAttribute('aria-pressed',String(bgWanted));const l=b.querySelector('.sound-label');if(l)l.textContent=bgWanted?'SOUND':'MUTED'})}
  function globalBgPosition(){const a=ensureBg();if(!Number.isFinite(a.duration)||a.duration<=0)return 0;return ((Date.now()/1000)%a.duration+a.duration)%a.duration}
  async function playBg(){if(!bgWanted||bgKilled||effectiveRemaining()<=5*MINUTE)return;const a=ensureBg();try{if(a.readyState<1)await new Promise(r=>{a.addEventListener('loadedmetadata',r,{once:true});a.addEventListener('error',r,{once:true})});const t=globalBgPosition();if(Number.isFinite(a.duration)&&Math.abs(a.currentTime-t)>.35)a.currentTime=t;await a.play()}catch{}syncButtons()}
  function killBg(){bgKilled=true;if(bg){try{bg.pause();bg.currentTime=0}catch{}}syncButtons()}
  function pauseBg(){if(bg&&!bg.paused)bg.pause();syncButtons()}
  addEventListener('tfw:countdown',e=>{const r=Number(e.detail?.remaining);if(Number.isFinite(r)&&r<=5*MINUTE)killBg()});
  addEventListener('tfw:sound-change',e=>{bgWanted=Boolean(e.detail?.enabled);storage.set('tfw_sound',bgWanted?'on':'off');if(bgWanted&&!bgKilled)playBg();else pauseBg();syncButtons()});
  ['pointerdown','touchstart','keydown'].forEach(ev=>addEventListener(ev,()=>{if(bgWanted&&!bgKilled)playBg()},{once:true,capture:true,passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&bgWanted&&!bgKilled)playBg()});

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{start();syncButtons();if(bgWanted)playBg()},{once:true});else{start();syncButtons();if(bgWanted)playBg()}
})();
