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

test('secondary clock follows selected release without sticky preview flag',()=>{
  const source=read('clock.js');
  assert.match(source,/const releaseEpoch=\(\)=>release;/);
  assert.doesNotMatch(source,/RELEASE_CET|backgroundStoppedForLaunch/);
  assert.match(source,/return Date\.now\(\)<releaseEpoch\(\)-5\*MINUTE&&!previewFinalFive;/);
  const start=source.indexOf('function backgroundAllowed()'),end=source.indexOf('function syncSoundUi()',start);
  assert.ok(start>0&&end>start);
  const factory=new Function('releaseEpoch','previewFinalFive','document','Date','MINUTE',source.slice(start,end)+'\nreturn backgroundAllowed;');
  const now=Date.parse('2026-11-18T14:00:00Z');
  const body={body:{classList:{contains:()=>false}}};
  const time={now:()=>now};
  assert.equal(factory(()=>now+600000,false,body,time,60000)(),true);
  assert.equal(factory(()=>now+600000,true,body,time,60000)(),false);
  assert.equal(factory(()=>now+240000,false,body,time,60000)(),false);
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
