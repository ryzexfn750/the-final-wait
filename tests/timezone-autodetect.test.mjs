import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../js/timezone-init.js',import.meta.url),'utf8');
const sleep=()=>new Promise(resolve=>setImmediate(resolve));
function launch({initial={},device='Europe/Rome',network='America/New_York',host='thefinalwait.com',deferNetwork=false}={}){
  const data=new Map(Object.entries(initial));
  const listeners=[];
  const window={dispatchEvent:evt=>listeners.push(evt)};
  const localStorage={
    getItem:k=>data.has(k)?data.get(k):null,
    setItem:(k,v)=>data.set(k,String(v))
  };
  const BrowserIntl={
    DateTimeFormat: function(locale,options){
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
  const CustomEvent=class {constructor(type,init){this.type=type;this.detail=init?.detail}};
  vm.runInNewContext(source,{window,localStorage,Intl:BrowserIntl,
    location:{hostname:host,search:''},URLSearchParams,fetch,CustomEvent,Promise});
  return {window,data,listeners,requests,resolveNetwork};
}
test('network IP zone replaces device zone without manual choice',async()=>{
  const x=launch({device:'Europe/Rome',network:'America/New_York'});
  assert.equal(x.window.__tfwTimeZone,'Europe/Rome');
  await sleep();await sleep();
  assert.equal(x.window.__tfwTimeZone,'America/New_York');
  assert.equal(x.data.get('tfw_timezone'),'America/New_York');
  assert.equal(x.data.get('tfw_timezone_source'),'auto');
  assert.ok(x.listeners.some(e=>e.type==='tfw:timezone-change'&&e.detail.zone==='America/New_York'));
});
test('legacy saved CET automatically migrates to IP detection',async()=>{
  const x=launch({initial:{tfw_timezone:'Europe/Rome',tfw_timezone_source:'manual'},
    device:'Europe/Rome',network:'America/Los_Angeles'});
  await sleep();await sleep();
  assert.equal(x.window.__tfwTimeZone,'America/Los_Angeles');
  assert.equal(x.data.get('tfw_timezone_mode_v2'),'auto');
});
test('genuine manual selection is not overwritten by geolocation',async()=>{
  const x=launch({initial:{tfw_timezone:'Asia/Tokyo',tfw_timezone_mode_v2:'manual',
    tfw_timezone_source:'manual'},network:'America/Chicago'});
  await sleep();await sleep();
  assert.equal(x.window.__tfwTimeZone,'Asia/Tokyo');
  assert.equal(x.data.get('tfw_timezone_mode_v2'),'manual');
});
test('manual selection before response wins the IP lookup race',async()=>{
  const x=launch({network:'America/Los_Angeles',deferNetwork:true});
  x.data.set('tfw_timezone_mode_v2','manual');
  x.data.set('tfw_timezone','Europe/London');
  x.window.__tfwTimeZoneSource='manual';
  x.resolveNetwork({ok:true,json:async()=>({timezone:'America/Los_Angeles'})});
  await sleep();await sleep();
  assert.equal(x.data.get('tfw_timezone'),'Europe/London');
});
test('reset automatic uses the cached IP zone',async()=>{
  const x=launch({initial:{tfw_timezone:'Asia/Tokyo',tfw_timezone_mode_v2:'manual'},
    network:'America/Chicago'});
  await sleep();await sleep();
  assert.equal(x.window.__tfwUseAutomaticTimeZone(),'America/Chicago');
  assert.equal(x.data.get('tfw_timezone_mode_v2'),'auto');
});
test('GitHub Pages falls back to browser zone without an API call',async()=>{
  const x=launch({host:'ryzexfn750.github.io',device:'Europe/London'});
  await sleep();
  assert.equal(x.window.__tfwTimeZone,'Europe/London');
  assert.equal(x.requests.length,0);
});
test('time zone Function is limited to its one route',()=>{
  const build=readFileSync(new URL('../tools/build-cloudflare-pages.mjs',import.meta.url),'utf8');
  assert.match(build,/include:\['\/api\/timezone'\]/);
});
test('timezone bootstrap loads before countdown scripts on every page',()=>{
  for(const file of ['index.html','today.html','timeline.html','intel.html','intel-archive.html']){
    const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');
    assert.match(html,/js\/timezone-init\.js\?v=2/);
    assert.ok(html.indexOf('js/timezone-init.js?v=2')<html.indexOf('<\/head>'));
  }
});
