/* Select the visitor's device time zone before any countdown script runs.
   No GPS, IP geolocation, external service or permission is needed. */
(()=>{
  'use strict';
  const ZONE_KEY='tfw_timezone';
  const SOURCE_KEY='tfw_timezone_source';
  const DEFAULT_ZONE='Europe/Rome';
  const get=key=>{try{return localStorage.getItem(key)}catch{return null}};
  const set=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
  const valid=zone=>{
    if(typeof zone!=='string'||!zone)return false;
    try{new Intl.DateTimeFormat('en-US',{timeZone:zone});return true}catch{return false}
  };
  const detect=()=>{
    try{
      const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
      if(valid(zone))return zone;
    }catch{}
    return DEFAULT_ZONE;
  };
  const saved=get(ZONE_KEY);
  const source=get(SOURCE_KEY);
  // Keep timezone choices made before automatic detection was introduced.
  const manual=valid(saved)&&(source==='manual'||source===null);
  const zone=manual?saved:detect();
  const mode=manual?'manual':'auto';
  set(ZONE_KEY,zone);
  set(SOURCE_KEY,mode);
  window.__tfwTimeZone=zone;
  window.__tfwTimeZoneSource=mode;
  window.__tfwDetectTimeZone=detect;
  window.__tfwUseDeviceTimeZone=()=>{
    const detected=detect();
    set(ZONE_KEY,detected);
    set(SOURCE_KEY,'auto');
    window.__tfwTimeZone=detected;
    window.__tfwTimeZoneSource='auto';
    return detected;
  };
})();
