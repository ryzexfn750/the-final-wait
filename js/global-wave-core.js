/* The Global Midnight Wave — deterministic geography/time state.
   November 19, 2026 at 00:00 in each IANA region, not a claim about
   any platform's actual official unlock time. No network/browser side effects. */
import {releaseInstant,isValidZone} from './stream-overlay-core.js?v=4';
export const WAVE_DATE='2026-11-19';
export const EARLIEST=Date.parse('2026-11-18T10:00:00Z'); // UTC+14
export const LATEST=Date.parse('2026-11-19T12:00:00Z'); // UTC-12
export const DURATION=LATEST-EARLIEST;
export const MAX_TIMELINE=1000;
const memo=new Map();
export function midnight(zone){
 if(!isValidZone(zone))return null;
 if(!memo.has(zone))memo.set(zone,releaseInstant(zone));
 return memo.get(zone);
}
export function clamp(n,a,b){return Math.min(b,Math.max(a,Number.isFinite(n)?n:a))}
export function timelineAt(value){return EARLIEST+clamp(Number(value),0,MAX_TIMELINE)/MAX_TIMELINE*DURATION}
export function timelinePosition(at){return clamp((at-EARLIEST)/DURATION*MAX_TIMELINE,0,MAX_TIMELINE)}
export function zoneStatus(zone,at){const when=midnight(zone);return when===null?'unknown':at>=when?'reached':'waiting'}
export function buildZones(features){
 if(!Array.isArray(features))return [];
 return features.filter(f=>f?.geometry&&['Polygon','MultiPolygon'].includes(f.geometry.type)&&isValidZone(f?.properties?.tzid))
  .map(f=>({...f,release:midnight(f.properties.tzid),tzid:f.properties.tzid}));
}
export function milestones(zones){
 const groups=new Map();
 for(const z of zones){
  const t=z.release;
  if(!Number.isFinite(t))continue;
  let group=groups.get(t);
  if(!group){group={instant:t,zones:[]};groups.set(t,group)}
  group.zones.push(z.tzid);
 }
 return [...groups.values()].sort((a,b)=>a.instant-b.instant);
}
export function waveSnapshot(zones,at){
 let reached=0,approaching=0;
 for(const z of zones){
  if(at>=z.release)reached++;
  else if(z.release-at<=3600000)approaching++;
 }
 const next=milestones(zones).find(m=>m.instant>at)||null;
 return {at,reached,waiting:zones.length-reached,approaching,total:zones.length,next,
  percent:zones.length?100*reached/zones.length:0};
}
export function remainingText(diff){
 const total=Math.max(0,Math.ceil(diff/1000));
 const d=Math.floor(total/86400),h=Math.floor(total%86400/3600),
  m=Math.floor(total%3600/60),s=total%60;
 return (d?d+'d ':'')+[h,m,s].map(n=>String(n).padStart(2,'0')).join(':');
}
export function fullZoneLabel(zone){return String(zone||'').replaceAll('_',' ').replace(/\//g,' / ')}
export function cityState(city,at){
 const release=midnight(city.tz);
 return {...city,release,reached:release!==null&&at>=release,
  countdown:release===null?'Unavailable':at>=release?'MIDNIGHT REACHED':remainingText(release-at)};
}
export function offsetLabel(zone,at){
 try{
  const v=new Intl.DateTimeFormat('en',{timeZone:zone,timeZoneName:'shortOffset'})
    .formatToParts(new Date(at)).find(p=>p.type==='timeZoneName')?.value||'GMT';
  return v.replace('GMT','UTC');
 }catch{return 'UTC'}
}
export function localClock(zone,at){
 try{return new Intl.DateTimeFormat('en-GB',{timeZone:zone,weekday:'short',day:'2-digit',
  month:'short',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(at))}
 catch{return '—'}
}
