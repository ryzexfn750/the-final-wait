import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const source=readFileSync(new URL('../js/timezone-init.js',import.meta.url),'utf8');
function launch({initial={},zone='Europe/Rome'}={}){
  const data=new Map(Object.entries(initial));
  const localStorage={
    getItem:k=>data.has(k)?data.get(k):null,
    setItem:(k,v)=>data.set(k,String(v))
  };
  const BrowserIntl={
    DateTimeFormat: function(locale,options){
      if(!arguments.length)return {resolvedOptions:()=>({timeZone:zone})};
      return new Intl.DateTimeFormat(locale,options);
    }
  };
  const window={};
  vm.runInNewContext(source,{window,localStorage,Intl:BrowserIntl});
  return {window,data};
}
test('first visit auto-selects device time zone',()=>{
  const {window,data}=launch({zone:'America/New_York'});
  assert.equal(window.__tfwTimeZone,'America/New_York');
  assert.equal(data.get('tfw_timezone'),'America/New_York');
  assert.equal(data.get('tfw_timezone_source'),'auto');
});
test('auto-selected zone follows device changes on a new visit',()=>{
  const {data}=launch({initial:{tfw_timezone:'Asia/Tokyo',tfw_timezone_source:'auto'},zone:'Europe/London'});
  assert.equal(data.get('tfw_timezone'),'Europe/London');
  assert.equal(data.get('tfw_timezone_source'),'auto');
});
test('explicit manual zone survives a device zone change',()=>{
  const {data}=launch({initial:{tfw_timezone:'Asia/Tokyo',tfw_timezone_source:'manual'},zone:'Europe/London'});
  assert.equal(data.get('tfw_timezone'),'Asia/Tokyo');
  assert.equal(data.get('tfw_timezone_source'),'manual');
});
test('legacy zone is respected as manual selection',()=>{
  const {data}=launch({initial:{tfw_timezone:'Pacific/Auckland'},zone:'Europe/London'});
  assert.equal(data.get('tfw_timezone'),'Pacific/Auckland');
  assert.equal(data.get('tfw_timezone_source'),'manual');
});
test('invalid device zone falls back to Europe/Rome',()=>{
  const {data}=launch({zone:'Invalid/Zone'});
  assert.equal(data.get('tfw_timezone'),'Europe/Rome');
});
test('visitor can return to automatically detected zone',()=>{
  const {window,data}=launch({initial:{tfw_timezone:'Asia/Tokyo',tfw_timezone_source:'manual'},zone:'America/Chicago'});
  const returned=window.__tfwUseDeviceTimeZone();
  assert.equal(returned,'America/Chicago');
  assert.equal(data.get('tfw_timezone_source'),'auto');
  assert.equal(data.get('tfw_timezone'),'America/Chicago');
});
test('timezone bootstrap loads before countdown scripts on every page',()=>{
  for(const file of ['index.html','today.html','timeline.html','intel.html','intel-archive.html']){
    const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');
    assert.match(html,/js\/timezone-init\.js\?v=1/);
    assert.ok(html.indexOf('js/timezone-init.js?v=1')<html.indexOf('<\/head>'));
  }
});
