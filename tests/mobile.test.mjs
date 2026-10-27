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

test('V32 phase two keeps finale crossfades but limits phone decode pressure',()=>{
  const js=read('js/app.js'),finale=read('js/milestones.js');
  assert.match(js,/finaleScenePending/);
  assert.match(js,/sceneDecodeCache\.size>\(isMobile\(\)\?10:16\)/);
  assert.match(js,/finaleSceneDeck\.slice\(0,isMobile\(\)\?9/);
  assert.match(finale,/Math\.max\(matchMedia\('\(max-width:700px\)'\)\.matches\?110:38,sceneIntervalFor\(remaining\)\)/);
});
test('V32 phase two uses a reusable FFT gradient and bounded full-duration fireworks',()=>{
  const finale=read('js/milestones.js');
  assert.match(finale,/cachedGradient=ctx\.createLinearGradient/);
  assert.match(finale,/ctx\.fillStyle=cachedGradient/);
  assert.match(finale,/maxParticles=matchMedia/);
  assert.match(finale,/lastFireworkPhysics/);
  assert.match(finale,/if\(releaseShown\|\|fireworks\.length\)fireworksRaf=requestAnimationFrame\(loop\)/);
  assert.ok(read('css/mobile-performance.css').includes('canvas#finaleFireworks'));
});
