import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../js/timezone-init.js',import.meta.url),'utf8');
const pause=()=>new Promise(resolve=>setImmediate(resolve));
function launch({initial={},device='Europe/Rome',network='America/New_York',
  host='thefinalwait.com',deferNetwork=false}={}){
  const data=new Map(Object.entries(initial));
  const listeners=[];
  const window={dispatchEvent:evt=>listeners.push(evt)};
  const localStorage={
    getItem:k=>data.has(k)?data.get(k):null,
    setItem:(k,v)=>data.set(k,String(v))
  };
  const IntlShim={
    DateTimeFormat:function(locale,options){
      if(!arguments.length)return {resolvedOptions:()=>({timeZone:device})};
      return new Intl.DateTimeFormat(locale,options);
    }
  };
  const requests=[];
  let resolveNetwork;
  const fetch=path=>{
    requests.push(path);
    return deferNetwork?new Promise(resolve=>{resolveNetwork=resolve}):
      Promise.resolve({ok:true,json:async()=>({timezone:network})});
  };
  const CustomEvent=class{constructor(type,init){this.type=type;this.detail=init?.detail}};
  vm.runInNewContext(source,{window,localStorage,Intl:IntlShim,
    location:{hostname:host,search:''},URLSearchParams,fetch,CustomEvent,Promise,Date});
  return {window,data,listeners,requests,resolveNetwork};
}
test('New York VPN does not override the visitor device zone',async()=>{
  const x=launch({device:'Europe/Rome',network:'America/New_York'});
  assert.equal(x.window.__tfwTimeZone,'Europe/Rome');
  await pause();
  assert.equal(x.window.__tfwTimeZone,'Europe/Rome');
  assert.equal(x.window.__tfwGetTimeZoneComparison().status,'different');
  assert.equal(x.data.get('tfw_timezone'),'Europe/Rome');
});
test('equivalent device and IP zones count as matching',async()=>{
  const x=launch({device:'Europe/Rome',network:'Europe/Paris'});
  await pause();
  assert.equal(x.window.__tfwGetTimeZoneComparison().status,'matched');
  assert.equal(x.window.__tfwTimeZone,'Europe/Rome');
});
test('same zone on device and IP is verified',async()=>{
  const x=launch({device:'America/New_York',network:'America/New_York'});
  await pause();
  assert.equal(x.window.__tfwGetTimeZoneComparison().status,'matched');
});
test('when device zone is invalid, Cloudflare network zone is used',async()=>{
  const x=launch({device:'Invalid/Zone',network:'America/Los_Angeles'});
  await pause();
  assert.equal(x.window.__tfwTimeZone,'America/Los_Angeles');
  assert.equal(x.window.__tfwGetTimeZoneComparison().status,'network-only');
  assert.ok(x.listeners.some(e=>e.type==='tfw:timezone-change'));
});
test('when IP lookup has no zone, prefer the device',async()=>{
  const x=launch({device:'Asia/Tokyo',network:null});
  await pause();
  assert.equal(x.window.__tfwTimeZone,'Asia/Tokyo');
  assert.equal(x.window.__tfwGetTimeZoneComparison().status,'device-only');
});
test('old CET fallback changes into auto but does not change to VPN zone',async()=>{
  const x=launch({initial:{tfw_timezone:'Europe/Rome',tfw_timezone_source:'manual'},network:'America/New_York'});
  await pause();
  assert.equal(x.window.__tfwTimeZone,'Europe/Rome');
  assert.equal(x.data.get('tfw_timezone_mode_v2'),'auto');
});
test('manual selection survives disagreeing network location',async()=>{
  const x=launch({initial:{tfw_timezone:'Asia/Tokyo',tfw_timezone_mode_v2:'manual',
    tfw_timezone_source:'manual'},network:'America/Chicago'});
  await pause();
  assert.equal(x.window.__tfwTimeZone,'Asia/Tokyo');
  assert.equal(x.data.get('tfw_timezone_mode_v2'),'manual');
});
test('manual mode wins pending IP lookup race',async()=>{
  const x=launch({deferNetwork:true});
  x.data.set('tfw_timezone_mode_v2','manual');
  x.data.set('tfw_timezone','Asia/Tokyo');
  x.resolveNetwork({ok:true,json:async()=>({timezone:'America/Chicago'})});
  await pause();
  assert.equal(x.data.get('tfw_timezone'),'Asia/Tokyo');
});
test('auto reset uses device even after IP was cached',async()=>{
  const x=launch({initial:{tfw_timezone:'Asia/Tokyo',tfw_timezone_mode_v2:'manual'},
    device:'Europe/Rome',network:'America/Chicago'});
  await pause();
  assert.equal(x.window.__tfwUseAutomaticTimeZone(),'Europe/Rome');
  assert.equal(x.data.get('tfw_timezone_mode_v2'),'auto');
});
test('GitHub Pages does not call unavailable Pages Function',async()=>{
  const x=launch({host:'ryzexfn750.github.io',device:'Europe/London'});
  await pause();
  assert.equal(x.window.__tfwTimeZone,'Europe/London');
  assert.equal(x.requests.length,0);
});
test('timezone bootstrap loads before main scripts on every route',()=>{
  for(const page of ['index.html','today.html','timeline.html','intel.html','intel-archive.html']){
    const html=readFileSync(new URL('../'+page,import.meta.url),'utf8');
    assert.ok(html.indexOf('js/timezone-init.js?v=4')>=0);
    assert.ok(html.indexOf('js/timezone-init.js?v=4')<html.indexOf('</head>'));
  }
});
test('time zone picker updates all option buttons',()=>{
  const app=readFileSync(new URL('../js/app.js',import.meta.url),'utf8');
  assert.match(app,/\$\$\('\.timezone-option\[data-zone\]'\)\.forEach/);
});
