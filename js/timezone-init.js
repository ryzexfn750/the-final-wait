/* Resolve the countdown to November 19 at midnight in the visitor's region.
   Start with the device zone, then refine using Cloudflare's IP-based time zone.
   No GPS prompt, external geolocation vendor, or IP storage is required. */
(()=>{
  'use strict';
  const KEY='tfw_timezone';
  const SOURCE='tfw_timezone_source';
  const MODE='tfw_timezone_mode_v2';
  const DEFAULT='Europe/Rome';
  const get=k=>{try{return localStorage.getItem(k)}catch{return null}};
  const set=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
  const valid=z=>{
    if(typeof z!=='string'||!z)return false;
    try{new Intl.DateTimeFormat('en-US',{timeZone:z});return true}catch{return false}
  };
  const deviceZone=()=>{
    try{
      const z=Intl.DateTimeFormat().resolvedOptions().timeZone;
      if(valid(z))return z;
    }catch{}
    return DEFAULT;
  };
  const saved=get(KEY),legacy=get(SOURCE),priorMode=get(MODE);
  // Older installs may have silently saved the default CET as "manual".
  // Migrate that default to automatic, but preserve actual non-default picks.
  const legacyManual=valid(saved)&&saved!==DEFAULT&&(legacy==='manual'||legacy===null);
  let mode=priorMode==='manual'&&valid(saved)?'manual':
    priorMode==='auto'?'auto':legacyManual?'manual':'auto';
  let networkZone=null;
  let lookupPromise=null;
  const selected=()=>networkZone||deviceZone();
  const setZone=(zone,notify=false)=>{
    if(!valid(zone))return;
    const previous=window.__tfwTimeZone||get(KEY);
    set(KEY,zone);
    window.__tfwTimeZone=zone;
    if(notify&&previous!==zone){
      window.dispatchEvent(new CustomEvent('tfw:timezone-change',{
        detail:{zone,automatic:true}
      }));
    }
  };
  const setMode=value=>{
    mode=value;
    set(MODE,value);
    set(SOURCE,value);
    window.__tfwTimeZoneSource=value;
  };
  setMode(mode);
  setZone(mode==='manual'?saved:deviceZone());
  window.__tfwDetectTimeZone=selected;
  window.__tfwAutoTimeZoneProvider=()=>networkZone?'ip':'device';
  window.__tfwUseAutomaticTimeZone=()=>{
    setMode('auto');
    const next=selected();
    setZone(next);
    if(!networkZone)void lookupNetworkZone();
    return next;
  };
  // Compatibility with older UI code.
  window.__tfwUseDeviceTimeZone=window.__tfwUseAutomaticTimeZone;
  function lookupNetworkZone(){
    if(lookupPromise)return lookupPromise;
    const hostname=location.hostname.toLowerCase();
    if(!(hostname==='thefinalwait.com'||hostname==='www.thefinalwait.com'||
         hostname.endsWith('.pages.dev')))return Promise.resolve(null);
    // Same-origin iframe pages receive the parent selection via localStorage.
    if(new URLSearchParams(location.search).has('tfw_embed'))return Promise.resolve(null);
    lookupPromise=fetch('/api/timezone',{cache:'no-store',credentials:'omit'})
      .then(response=>{if(!response.ok)throw new Error('Geolocation unavailable');return response.json()})
      .then(data=>{
        if(!valid(data?.timezone))return null;
        networkZone=data.timezone;
        window.dispatchEvent(new CustomEvent('tfw:timezone-detected',{detail:{zone:networkZone}}));
        if(mode==='auto'&&get(MODE)==='auto')setZone(networkZone,true);
        return networkZone;
      })
      .catch(()=>null);
    return lookupPromise;
  }
  if(typeof location!=='undefined'&&typeof fetch==='function')void lookupNetworkZone();
})();
