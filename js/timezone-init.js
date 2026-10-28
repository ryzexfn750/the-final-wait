/* The Final Wait — automatic time-zone selection.
   Prefer the visitor's device; use Cloudflare's IP zone only for comparison
   or when the device provides no valid IANA time zone. No GPS permission. */
(()=>{
  'use strict';
  const KEY='tfw_timezone';
  const SOURCE='tfw_timezone_source';
  const MODE='tfw_timezone_mode_v2';
  const DEFAULT='Europe/Rome';
  const RELEASE=Date.UTC(2026,10,19,12,0,0);
  const get=k=>{try{return localStorage.getItem(k)}catch{return null}};
  const set=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
  const valid=z=>{
    if(typeof z!=='string'||!z)return false;
    try{new Intl.DateTimeFormat('en-US',{timeZone:z});return true}catch{return false}
  };
  const deviceZone=()=>{
    try{
      const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
      return valid(zone)?zone:null;
    }catch{return null}
  };
  // Compare offsets at both the current date and the release date. Different
  // IANA names can denote the same local rules (e.g. Rome and Paris).
  const offsetAt=(zone,time)=>{
    const date=new Date(Math.floor(time/1000)*1000);
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
    }).formatToParts(date);
    const p=Object.fromEntries(parts.filter(item=>item.type!=='literal')
      .map(item=>[item.type,Number(item.value)]));
    return Math.round((Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-date.getTime())/60000);
  };
  const matchZones=(device,network)=>{
    if(!valid(device)||!valid(network))return null;
    if(device===network)return true;
    try{
      return offsetAt(device,Date.now())===offsetAt(network,Date.now()) &&
        offsetAt(device,RELEASE)===offsetAt(network,RELEASE);
    }catch{return null}
  };
  const saved=get(KEY),legacy=get(SOURCE),priorMode=get(MODE);
  // Migrate old default-CET choices while respecting real manual selections.
  const legacyManual=valid(saved)&&saved!==DEFAULT&&(legacy==='manual'||legacy===null);
  let mode=priorMode==='manual'&&valid(saved)?'manual':
    priorMode==='auto'?'auto':legacyManual?'manual':'auto';
  let networkZone=null;
  let lookupFinished=false;
  let lookupPromise=null;
  const selected=()=>deviceZone()||networkZone||DEFAULT;
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
  const resolution=()=>{
    const device=deviceZone(),network=networkZone;
    const matches=matchZones(device,network);
    const status=device&&network?
      (matches===true?'matched':matches===false?'different':'unverified'):
      device?(lookupFinished?'device-only':'checking'):
      network?'network-only':lookupFinished?'default':'checking';
    return {device,network,matches,status,selected:selected()};
  };
  setMode(mode);
  setZone(mode==='manual'?saved:selected());
  window.__tfwDetectTimeZone=selected;
  window.__tfwGetTimeZoneComparison=resolution;
  window.__tfwAutoTimeZoneProvider=()=>deviceZone()?'device':networkZone?'ip':'default';
  window.__tfwUseAutomaticTimeZone=()=>{
    setMode('auto');
    const zone=selected();
    setZone(zone);
    if(!lookupFinished)void lookupNetworkZone();
    return zone;
  };
  // Compatibility with older site scripts.
  window.__tfwUseDeviceTimeZone=window.__tfwUseAutomaticTimeZone;
  function lookupNetworkZone(){
    if(lookupPromise)return lookupPromise;
    if(typeof location==='undefined'||typeof fetch!=='function')return Promise.resolve(null);
    const hostname=location.hostname.toLowerCase();
    if(!(hostname==='thefinalwait.com'||hostname==='www.thefinalwait.com'||
         hostname.endsWith('.pages.dev')))return Promise.resolve(null);
    if(new URLSearchParams(location.search).has('tfw_embed'))return Promise.resolve(null);
    lookupPromise=fetch('/api/timezone',{cache:'no-store',credentials:'omit'})
      .then(response=>{
        if(!response.ok)throw new Error('Time zone lookup unavailable');
        return response.json();
      })
      .then(data=>{
        if(valid(data?.timezone))networkZone=data.timezone;
        lookupFinished=true;
        if(mode==='auto'&&get(MODE)==='auto')setZone(selected(),true);
        window.dispatchEvent(new CustomEvent('tfw:timezone-detected',{
          detail:resolution()
        }));
        return networkZone;
      })
      .catch(()=>{
        lookupFinished=true;
        window.dispatchEvent(new CustomEvent('tfw:timezone-detected',{
          detail:resolution()
        }));
        return null;
      });
    return lookupPromise;
  }
  if(typeof location!=='undefined'&&typeof fetch==='function')void lookupNetworkZone();
})();
