import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
test('V32 mobile layout is loaded after legacy styles',()=>{
  const html=read('index.html');
  assert.ok(html.indexOf('css/mobile-layout.css')>html.indexOf('css/experience.css'));
  const css=read('css/mobile-layout.css');
  for(const required of ['.mobile-menu[hidden]','body:not(.final-five-active):not(.finale-released) #heroTitle','.timeline-controls','.timeline:before','tfw-visualizer-ready'])assert.ok(css.includes(required),required);
});
test('V32 timeline toolbar uses an untruncated mobile counter',()=>{
  const js=read('js/app.js');
  assert.match(js,/matchMedia\('\(max-width:700px\)'\)\.matches\?\x60/);
  assert.match(js,/document\.addEventListener\('pointerdown',e=>\{/);
});
