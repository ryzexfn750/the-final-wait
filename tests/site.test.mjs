import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');

test('all JavaScript sources parse',()=>{
  for(const path of ['app.js','clock.js','milestones.js','article.js','timeline-article.js','intel-article.js','language.js','motion.js']){
    const source=read(path).replace(/^import\s+.*\n/,'');
    assert.doesNotThrow(()=>new Function(source),path);
  }
});

test('release midnight is correct in five IANA time zones',()=>{
  const source=read('app.js');
  const a=source.indexOf('function partsInZone('),b=source.indexOf('function zoneMeta(',a);
  assert.ok(a>=0&&b>a);
  const factory=new Function('SITE_CONFIG','currentTimeZone',source.slice(a,b)+'\nreturn zonedTargetToUtc;');
  const toUtc=factory({releaseDate:{year:2026,month:11,day:19,hour:0,minute:0,second:0}},'Europe/Rome');
  const expected={
    'Europe/Rome':'2026-11-18T23:00:00.000Z',
    'Europe/London':'2026-11-19T00:00:00.000Z',
    'Asia/Tokyo':'2026-11-18T15:00:00.000Z',
    'America/Los_Angeles':'2026-11-19T08:00:00.000Z',
    'Pacific/Auckland':'2026-11-18T11:00:00.000Z'
  };
  for(const [zone,date] of Object.entries(expected))
    assert.equal(new Date(toUtc(zone)).toISOString(),date,zone);
});

test('ambient soundtrack stops precisely at -30 minutes',()=>{
  const clock=read('clock.js');
  assert.match(clock,/const releaseEpoch=\(\)=>release;/);
  assert.doesNotMatch(clock,/RELEASE_CET|backgroundStoppedForLaunch/);
  assert.match(clock,/const BG_CUTOFF=30\*MINUTE;/);
  assert.match(clock,/return remainingForAudio\(\)>BG_CUTOFF&&!previewFinalFive;/);
  const start=clock.indexOf('function backgroundAllowed()');
  const end=clock.indexOf('function syncSoundUi()',start);
  assert.ok(start>=0&&end>start);
  const factory=new Function('remainingForAudio','document','BG_CUTOFF','previewFinalFive',
    clock.slice(start,end)+'\nreturn backgroundAllowed;');
  const document={body:{classList:{contains:()=>false}}};
  assert.equal(factory(()=>30*60000+1,document,30*60000,false)(),true);
  assert.equal(factory(()=>30*60000,document,30*60000,false)(),false);
  assert.equal(factory(()=>29*60000,document,30*60000,false)(),false);
  assert.equal(factory(()=>60*60000,document,30*60000,true)(),false);
});

test('background audio retry preserves gesture and has a valid fallback',()=>{
  const clock=read('clock.js');
  assert.match(clock,/const BG_SRC='assets\/audio\/background-v26.mp3'/);
  assert.match(clock,/const BG_FALLBACK_SRC='assets\/audio\/background-live.mp3'/);
  assert.match(clock,/if\(audioGestureArmed\)return Promise.resolve\(false\)/);
  assert.match(clock,/started=a\.play\(\)/);
  assert.doesNotMatch(clock,/await bgMetadataPromise/);
});

test('milestone headlines remain visible until the final five',()=>{
  const finale=read('milestones.js');
  const clock=read('clock.js');
  assert.match(finale,/if\(title&&remaining<=FINAL_FIVE\)/);
  assert.match(clock,/const stage=previewStageFor\(remaining\)/);
  assert.match(clock,/if\(stage\)\{activatePreviewStage\(stage\)/);
  assert.match(clock,/\{id:'hour',at:HOUR,.*THE FINAL HOUR/);
  assert.match(clock,/\{id:'30m',at:30\*MINUTE,.*NO MORE YEARS/);
  assert.match(clock,/\{id:'15m',at:15\*MINUTE,.*LAST QUARTER HOUR/);
  const css=read('v8.css');
  assert.doesNotMatch(css,/\.countdown-stage-hour \.hero-shade/);
});

test('visualizer includes ambient stream without suppressing normal playback',()=>{
  const clock=read('clock.js'),finale=read('milestones.js');
  assert.match(clock,/window\.__tfwAmbientAudio=bgAudio/);
  assert.match(finale,/tfw:ambient-play/);
  assert.match(finale,/tfw:ambient-pause/);
  assert.match(finale,/ambientMusicSource=musicCtx\.createMediaElementSource\(ambient\)/);
  assert.match(finale,/if\(finaleActive\)leaveFinalFive\(\);/);
  assert.match(read('index.html'),/v26\.css\?v=26/);
  assert.match(read('v26.css'),/body\.tfw-ambient-playing/);
});

test('all scenes and content image references resolve',()=>{
  const scenes=JSON.parse(read('assets/scenes.json'));
  const ids=new Set(scenes.map(scene=>scene.id));
  assert.equal(ids.size,scenes.length);
  assert.ok(scenes.some(s=>s.category==='artwork'));
  for(const scene of scenes){
    for(const size of ['desktop','mobile']){
      assert.ok(scene[size],scene.id+' '+size);
      assert.ok(existsSync(new URL(scene[size],root)),scene.id+' missing '+size);
    }
  }
  for(const file of ['content/today.json','content/timeline.json','content/intel.json']){
    const data=JSON.parse(read(file));
    for(const article of (Array.isArray(data)?data:[data])){
      for(const key of ['heroSceneId','cardSceneId'])if(article[key])
        assert.ok(ids.has(article[key]),file+' '+article[key]);
      for(const block of article.blocks||[])if(block.sceneId)
        assert.ok(ids.has(block.sceneId),file+' '+block.sceneId);
    }
  }
  assert.match(read('app.js'),/s\.category !== 'artwork' && s\.mediaType !== 'artwork'/);
});

test('timeline and intel cards link to existing articles',()=>{
  const conf=read('config.js');
  const timeline=JSON.parse(conf.match(/export const TIMELINE\s*=\s*(\[[\s\S]*?\]);/)[1]);
  const timelineIDs=new Set(JSON.parse(read('content/timeline.json')).map(a=>a.id));
  for(const item of timeline)assert.ok(timelineIDs.has(item.articleId),item.articleId);
  const intelIDs=new Set(JSON.parse(read('content/intel.json')).map(a=>a.id));
  const configIntel=conf.split('export const INTEL = ')[1];
  for(const [,id] of configIntel.matchAll(/articleId:\s*'([^']+)'/g))
    assert.ok(intelIDs.has(id),id);
});

test('home page anchor navigation points to real elements',()=>{
  const html=read('index.html');
  const ids=new Set([...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match=>match[1]));
  for(const [,fragment] of html.matchAll(/href="#([^"]+)"/g))
    assert.ok(ids.has(fragment),fragment);
});

test('finale soundtrack is lazy and voice cue is enabled',()=>{
  const finale=read('milestones.js'),html=read('index.html');
  assert.match(finale,/VOICE_TRACK_START=MIN/);
  assert.match(finale,/audio\.preload='none'/);
  assert.match(finale,/if\(playAudio&&remaining<=10\*MIN&&remaining>0\)primeFinaleTracks\(\)/);
  assert.doesNotMatch(html,/<link rel="preload" href="assets\/audio/);
  assert.match(finale,/if\(!soundEnabled\(\)\)\{\s*pauseFinaleAudio\(false\);/);
});
