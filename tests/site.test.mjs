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


test('V27 stage pill updates exactly at -5, -4, -3 and -2 minutes',()=>{
  const js=read('milestones.js');
  const a=js.indexOf('function updateFinaleCopy(remaining){');
  const b=js.indexOf('function musicIsPlaying()',a);
  assert.ok(a>=0&&b>a);
  const pill={
    html:'<span class="phase-dot"></span> THE FINAL WAIT',
    get textContent(){return this.html.replace(/<[^>]*>/g,'').trim()},
    set innerHTML(v){this.html=v}
  };
  const document={body:{classList:{toggle(){}}}};
  const make=new Function('$','document','MIN','FINAL_FIVE','HOUR','TICK_START','startTitleColorFlow','stopTitleColorFlow',
    js.slice(a,b)+'\nreturn updateFinaleCopy;');
  const update=make(sel=>sel==='#phasePill'?pill:null,document,60000,300000,3600000,43000,()=>{},()=>{});
  for(const [remaining,label] of [
    [300000,'5 MINUTES LEFT. STAY HERE.'],
    [240001,'5 MINUTES LEFT. STAY HERE.'],
    [240000,'4 MINUTES LEFT. STAY HERE.'],
    [180000,'3 MINUTES LEFT. STAY HERE.'],
    [120000,'2 MINUTES LEFT. STAY HERE.'],
    [60001,'2 MINUTES LEFT. STAY HERE.'],
    [60000,'THE FINAL MINUTE']
  ]){
    update(remaining);
    assert.equal(pill.textContent,label,'remaining='+remaining);
  }
});

test('V27 final glow is progressive and peaks only at -100ms',()=>{
  const js=read('milestones.js');
  const a=js.indexOf('function setFinaleScale(remaining){');
  const b=js.indexOf('function startTitleColorFlow()',a);
  assert.ok(a>=0&&b>a);
  const vars=new Map();
  const document={documentElement:{style:{setProperty(k,v){vars.set(k,v)}}}};
  const create=new Function('clamp','document','window','FINAL_FIVE','MIN','LAST_FIFTEEN',
    js.slice(a,b)+'\nreturn setFinaleScale;');
  const setScale=create((v,low,high)=>Math.max(low,Math.min(high,v)),document,{innerWidth:1440},300000,60000,6500);
  const at=ms=>{setScale(ms);return Number(vars.get('--tfw-approach-glow'))};
  assert.equal(at(6500),0);
  const early=at(5000),mid=at(3200),near=at(600);
  assert.ok(early>0&&early<.2,'early glow too bright '+early);
  assert.ok(mid>early&&mid<.55,'mid glow too bright '+mid);
  assert.ok(near>mid&&near<1);
  assert.equal(at(100),1);
  assert.equal(at(0),1);
  const css=read('v27.css');
  assert.match(css,/var\(--tfw-approach-glow,0\)/);
  assert.match(css,/body\.final-five-active\.finale-last-15 #countdown/);
});

test('V27 simulated release elapsed clock advances independently of wall clock',()=>{
  const js=read('clock.js');
  const a=js.indexOf('function updateReleaseElapsed(){');
  const b=js.indexOf('function bootRuntime()',a);
  assert.ok(a>=0&&b>a);
  const parts={};
  const classes={contains:c=>c==='finale-previewing'||c==='finale-released',toggle(){}};
  const doc={body:{classList:classes},querySelector(sel){
    const k=sel.match(/data-release-unit="([^"]+)"/)?.[1];
    if(!k)return null;
    return parts[k]??(parts[k]={textContent:''});
  }};
  const now={value:1000};
  const create=new Function('ensureReleaseUi','document','Date','performance','window',
    'releaseEpoch','DAY','HOUR','MINUTE','SECOND','pad','previewFinalFive','pauseBackground',
    js.slice(a,b)+'\nreturn updateReleaseElapsed;');
  const run=create(()=>true,doc,{now:()=>0},{now:()=>now.value},{__tfwPreviewReleasedAt:1000},
    ()=>10000000,86400000,3600000,60000,1000,
    (n,len=2)=>String(Math.floor(n)).padStart(len,'0'),false,()=>{});
  run();
  assert.equal(parts.seconds.textContent,'00');
  now.value=3250;
  run();
  assert.equal(parts.seconds.textContent,'02');
  assert.equal(parts.milliseconds.textContent,'250');
});

test('V27 audio bars are rendered from FFT and release layout uses real dimensions',()=>{
  const js=read('milestones.js'),css=read('v27.css'),html=read('index.html');
  assert.match(js,/musicAnalyser\.getByteFrequencyData\(musicData\)/);
  assert.match(js,/const hasSignal=Boolean\(soundEnabled\(\)/);
  assert.match(js,/startVisualizer\(\);\s*\['pointerdown','keydown','touchstart'\]/);
  assert.doesNotMatch(js,/const waveA=\(Math\.sin/);
  assert.match(css,/body\.tfw-visualizer-ready \.finale-visualizer-wrap/);
  assert.match(css,/body\.finale-released \.finale-release,\s*body\.finale-released \.finale-release\.active/);
  assert.match(css,/translate:0 0!important/);
  assert.match(css,/body\.finale-released \.release-elapsed-clock\.countdown/);
  assert.match(css,/transform:none!important/);
  assert.match(css,/max-height 1200ms/);
  assert.match(html,/v27\.css\?v=27/);
  assert.match(html,/clock\.js\?v=27/);
  assert.match(html,/milestones\.js\?v=27/);
});
