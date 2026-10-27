import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,root),'utf8');
test('V32 mobile layout is loaded after legacy styles',()=>{
  const html=read('index.html');
  assert.ok(html.includes('css/experience.css?v=33'));
  assert.ok(!html.includes('css/mobile-layout.css'));
  const css=read('css/experience.css').split('/* === EXPERIENCE: mobile-v32-phase1.css === */')[1].split('/* === EXPERIENCE: mobile-v32-phase2.css === */')[0];
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
  assert.ok(read('css/experience.css').split('/* === EXPERIENCE: mobile-v32-phase2.css === */')[1].includes('canvas#finaleFireworks'));
});

test('V32 follow-up uses phone-sized artwork without removing the finale',()=>{
 const html=read('index.html'),css=read('css/experience.css');
 const finale=read('js/milestones.js'),app=read('js/app.js'),motion=read('js/motion.js');
 assert.match(html,/css\/experience\.css\?v=33/);
 assert.match(css,/mobile-v32-followup-media\.css/);
 for(const id of ['149','161','163','147'])assert.ok(css.includes('screenshots/mobile/scene-'+id+'.webp'));
 assert.match(motion,/const artSource=scene=>matchMedia/);
 assert.match(app,/rootMargin:'460px 0px'/);
 assert.match(app,/intelImageObserver\?\.disconnect\(\)/);
 assert.match(finale,/if\(nextStage===previousStageClass\)return/);
});
test('V32 follow-up does not invalidate DOM classes every frame',()=>{
 const js=read('js/milestones.js');
 const a=js.indexOf("  let previousStageClass='';"),b=js.indexOf('  function particles(',a);
 assert.ok(a>=0&&b>a);
 const changes=[];
 const cls={add(c){changes.push('+'+c)},remove(c){changes.push('-'+c)}};
 const stage=new Function('document','DAY','HOUR','MIN','SECOND',
   js.slice(a,b)+'\nreturn stageFor;')({body:{classList:cls}},86400000,3600000,60000,1000);
 for(let i=0;i<200;i++)stage(900000);
 assert.deepEqual(changes,['+countdown-stage-15m']);
 stage(300000);
 assert.deepEqual(changes.slice(1),['-countdown-stage-15m','+countdown-stage-5m']);
});
