import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const all=['index.html','today.html','timeline.html','intel.html','intel-archive.html','profile.html','newsletter.html','support.html'];
test('The QA site exposes Profile, Settings and Language in the correct order',()=>{
 const header=read('js/community-header.js');
 assert.match(header,/header\.insertBefore\(settings,languages\)/);
 assert.match(header,/settingsRight\+settings\.getBoundingClientRect\(\)\.width\+8/);
 assert.match(header,/aria-current/);
 assert.match(header,/addMobile\(document\.querySelector\('#mobileMenu'\)\)/);
 assert.match(header,/addMobile\(document\.querySelector\('#tfwPageDrawer'\)\)/);
 for(const path of all){
  const html=read(path);
  assert.match(html,/js\/community-header\.js\?v=4/,path);
  assert.match(html,/css\/community\.css\?v=11/,path);
  assert.match(html,/js\/seamless-navigation\.js\?v=57/,path);
 }
});
test('Settings hub is accessible through seamless navigation and links to a live editor',()=>{
 const settings=read('settings.html'),nav=read('js/seamless-navigation.js'),
  builder=read('streamer-overlay.html'),css=read('css/settings.css');
 assert.match(nav,/'settings\.html','streamer-overlay\.html'/);
 assert.match(settings,/href="streamer-overlay\.html"/);
 assert.match(settings,/CUSTOMIZE OVERLAY/);
 assert.match(settings,/js\/community-header\.js\?v=4/);
 assert.match(builder,/id="builderPreview"/);
 assert.match(builder,/src="stream-overlay\.html\?v=4&amp;tz=Europe%2FRome"/);
 assert.match(css,/tfw-settings-feature/);
});
test('Every new HTML page is packaged into the Cloudflare Pages output',()=>{
 const build=read('tools/build-cloudflare-pages.mjs');
 for(const path of ['settings.html','streamer-overlay.html','stream-overlay.html']){
  assert.ok(build.includes("'"+path+"'"),path+' absent from publicEntries');
  assert.ok(read(path).startsWith('<!doctype html>'),path+' HTML missing');
 }
});
