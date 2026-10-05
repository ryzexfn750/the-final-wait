(function(){
  'use strict';
  const DAY=86400000;
  const waitStart=new Date('2025-11-06T00:00:00+01:00').getTime();
  let timeZone='Europe/Rome';
  try{timeZone=localStorage.getItem('tfw_timezone')||timeZone}catch{}
  let release=zonedTargetToUtc(timeZone);
  let timer=0;
  const byId=id=>document.getElementById(id);
  const pad=(n,len=2)=>String(Math.max(0,n)).padStart(len,'0');

  function partsInZone(date,zone){
    const fmt=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    const out={};
    for(const p of fmt.formatToParts(date)) if(p.type!=='literal') out[p.type]=Number(p.value);
    return out;
  }
  function zonedTargetToUtc(zone){
    const wall=Date.UTC(2026,10,19,0,0,0);
    let guess=wall;
    try{
      for(let i=0;i<4;i++){
        const p=partsInZone(new Date(guess),zone);
        const localAsUtc=Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second);
        guess-=localAsUtc-wall;
      }
      return guess;
    }catch{
      timeZone='Europe/Rome';
      return new Date('2026-11-19T00:00:00+01:00').getTime();
    }
  }
  function setText(id,value){const el=byId(id);if(el&&el.textContent!==value)el.textContent=value}
  function tick(){
    const now=Date.now();
    const appHeartbeat=Number(window.__tfwClockHeartbeat||0);
    const appClockHealthy=appHeartbeat>0 && now-appHeartbeat<250;
    if(!document.hidden && !appClockHealthy){
      const previewValue=Number(window.__tfwPreviewRemainingMs);
      const previewActive=Number.isFinite(previewValue);
      let diff=previewActive?Math.max(0,previewValue):Math.max(0,release-now);
      const total=diff;
      const days=Math.floor(diff/DAY); diff%=DAY;
      const hours=Math.floor(diff/3600000); diff%=3600000;
      const minutes=Math.floor(diff/60000); diff%=60000;
      const seconds=Math.floor(diff/1000);
      const ms=Math.floor(diff%1000);
      setText('days',String(days));
      setText('hours',pad(hours));
      setText('minutes',pad(minutes));
      setText('seconds',pad(seconds));
      setText('milliseconds',pad(ms,3));
      const denominator=Math.max(1,release-waitStart);
      const simulatedNow=previewActive?release-total:now;
      const progress=Math.min(1,Math.max(0,(simulatedNow-waitStart)/denominator));
      setText('progressText',(progress*100).toFixed(8)+'%');
      const fill=byId('progressFill'); if(fill) fill.style.width=(progress*100)+'%';
    }
    timer=setTimeout(tick,appClockHealthy||document.hidden?500:33);
  }
  function restart(zone){
    if(zone) timeZone=zone;
    release=zonedTargetToUtc(timeZone);
    clearTimeout(timer);
    tick();
  }
  window.addEventListener('tfw:timezone-change',e=>restart(e.detail&&e.detail.zone));
  window.addEventListener('pageshow',()=>restart(timeZone));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)restart(timeZone)});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>restart(timeZone),{once:true});
  else restart(timeZone);
  window.__tfwIndependentClock=true;
})();
