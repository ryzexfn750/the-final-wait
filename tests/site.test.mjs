import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const section=oldName=>{
  const path=['v6.css','v8.css','styles.css'].includes(oldName)?'css/base.css':'css/experience.css';
  const all=read(path);
  const prefix=path==='css/base.css'?'SHARED':'EXPERIENCE';
  const mark=`/* === ${prefix}: ${oldName} === */`;
  const start=all.indexOf(mark);
  if(start<0)throw new Error('Missing CSS section: '+oldName);
  const next=all.indexOf('/* === ',start+mark.length);
  return all.slice(start,next<0?undefined:next);
};


test('all JavaScript sources parse',()=>{
  for(const path of ['js/app.js','js/clock.js','js/milestones.js','js/article.js','js/timeline-article.js','js/intel-article.js','js/language.js','js/motion.js']){
    const source=read(path).replace(/^import\s+.*\n/,'');
    assert.doesNotThrow(()=>new Function(source),path);
  }
});

test('release midnight is correct in five IANA time zones',()=>{
  const source=read('js/app.js');
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
  const clock=read('js/clock.js');
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
  const clock=read('js/clock.js');
  assert.match(clock,/const BG_SRC='assets\/audio\/background-v26.mp3'/);
  assert.match(clock,/const BG_FALLBACK_SRC='assets\/audio\/background-live.mp3'/);
  assert.match(clock,/if\(audioGestureArmed\)return Promise.resolve\(false\)/);
  assert.match(clock,/started=a\.play\(\)/);
  assert.doesNotMatch(clock,/await bgMetadataPromise/);
});

test('milestone headlines remain visible until the final five',()=>{
  const finale=read('js/milestones.js');
  const clock=read('js/clock.js');
  assert.match(finale,/if\(title&&remaining<=FINAL_FIVE\)/);
  assert.match(clock,/const stage=previewStageFor\(remaining\)/);
  assert.match(clock,/if\(stage\)\{activatePreviewStage\(stage\)/);
  assert.match(clock,/\{id:'hour',at:HOUR,.*THE FINAL HOUR/);
  assert.match(clock,/\{id:'30m',at:30\*MINUTE,.*NO MORE YEARS/);
  assert.match(clock,/\{id:'15m',at:15\*MINUTE,.*LAST QUARTER HOUR/);
  const css=section('v8.css');
  assert.doesNotMatch(css,/\.countdown-stage-hour \.hero-shade/);
});

test('visualizer includes ambient stream without suppressing normal playback',()=>{
  const clock=read('js/clock.js'),finale=read('js/milestones.js');
  assert.match(clock,/window\.__tfwAmbientAudio=bgAudio/);
  assert.match(finale,/tfw:ambient-play/);
  assert.match(finale,/tfw:ambient-pause/);
  assert.match(finale,/ambientMusicSource=musicCtx\.createMediaElementSource\(ambient\)/);
  assert.match(finale,/if\(finaleActive\)leaveFinalFive\(\);/);
  assert.match(read('index.html'),/css\/experience\.css\?v=33/);
  assert.match(section('v26.css'),/body\.tfw-ambient-playing/);
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
  assert.match(read('js/app.js'),/s\.category !== 'artwork' && s\.mediaType !== 'artwork'/);
});

test('timeline and intel cards link to existing articles',()=>{
  const conf=read('js/config.js');
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
  const finale=read('js/milestones.js'),html=read('index.html');
  assert.match(finale,/VOICE_TRACK_START=MIN/);
  assert.match(finale,/audio\.preload='none'/);
  assert.match(finale,/if\(playAudio&&remaining<=10\*MIN&&remaining>0\)primeFinaleTracks\(\)/);
  assert.doesNotMatch(html,/<link rel="preload" href="assets\/audio/);
  assert.match(finale,/if\(!soundEnabled\(\)\)\{\s*pauseFinaleAudio\(false\);/);
});


test('V27 stage pill updates exactly at -5, -4, -3 and -2 minutes',()=>{
  const js=read('js/milestones.js');
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

test('V28 glow is monotonic from -6 seconds to full at -200ms',()=>{
  const js=read('js/milestones.js');
  const a=js.indexOf('function setFinaleScale(remaining){');
  const b=js.indexOf('function startTitleColorFlow()',a);
  assert.ok(a>=0&&b>a);
  const vars=new Map();
  const document={documentElement:{style:{setProperty(k,v){vars.set(k,v)}}}};
  const create=new Function('clamp','document','window','FINAL_FIVE','MIN','LAST_FIFTEEN',
    js.slice(a,b)+'\nreturn setFinaleScale;');
  const setScale=create((v,low,high)=>Math.max(low,Math.min(high,v)),document,{innerWidth:1440},300000,60000,6500);
  const at=ms=>{
    setScale(ms);
    return {strength:Number(vars.get('--tfw-glow-strength')),
      radius:parseFloat(vars.get('--tfw-glow-radius')),
      pink:Number(vars.get('--tfw-glow-pink'))};
  };
  const times=[6500,6000,5000,4000,3000,1000,500,201,200,0];
  const levels=times.map(ms=>at(ms));
  assert.equal(levels[0].strength,0);
  assert.equal(levels[1].strength,0);
  assert.ok(levels[2].strength<.10);
  for(let i=2;i<levels.length;i++){
    assert.ok(levels[i].strength>=levels[i-1].strength,'non-monotonic at '+times[i]);
    assert.ok(levels[i].radius>=levels[i-1].radius);
    assert.ok(levels[i].pink>=levels[i-1].pink);
  }
  assert.ok(levels[7].strength<1,'-201ms should not be max');
  assert.equal(levels[8].strength,1);
  assert.equal(levels[9].strength,1);
  const css=section('v28.css');
  assert.match(css,/var\(--tfw-glow-radius,0px\)/);
  assert.match(css,/body\.final-five-active\.finale-last-second #countdown/);
  assert.match(css,/body\.final-five-active #hero\.finale-rapid-pulse #countdown/);
});

test('V27 simulated release elapsed clock advances independently of wall clock',()=>{
  const js=read('js/clock.js');
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
  const js=read('js/milestones.js'),css=section('v27.css'),html=read('index.html');
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
  assert.match(html,/css\/experience\.css\?v=33/);
  assert.match(html,/js\/clock\.js\?v=39/);
  assert.match(html,/js\/milestones\.js\?v=39/);
});

test('V28 starts the release clock without waiting for the next polling cycle',()=>{
  const js=read('js/clock.js');
  assert.match(js,/addEventListener\('tfw:finale-release',\(\)=>\{/);
  assert.match(js,/if\(releaseUiTimer\)clearTimeout\(releaseUiTimer\);\s*releaseLoop\(\);/);
});

test('V28 restores fireworks at release with an immediate opening volley',()=>{
  const js=read('js/milestones.js'),css=section('v28.css');
  assert.match(js,/startFireworks\(\)/);
  assert.match(js,/makeBurst\(opening\.width\*\.24,opening\.height\*\.37,76,1\.22\)/);
  assert.match(js,/makeBurst\(opening\.width\*\.76,opening\.height\*\.32,76,1\.22\)/);
  assert.match(css,/body\.finale-released \.finale-fireworks/);
  assert.match(css,/z-index:17!important/);
  assert.match(js,/tfw-release-entering/);
  assert.match(css,/body\.finale-released\.tfw-release-entering #countdown/);
});

test('V28 keeps the milestone title footprint stable without moving the timer',()=>{
  const css=section('v28.css');
  assert.match(css,/body\.tfw-milestone-live \.countdown-shell/);
  assert.match(css,/body\.tfw-preview-stage-title \.countdown-shell/);
  assert.match(css,/translate:0 0!important/);
  assert.match(css,/hero-title-wrap\{\s*height:clamp\(92px,8\.1vw,132px\)/);
});

test('V28 audio graph retries suspended playback on a real user gesture',async()=>{
  const js=read('js/milestones.js');
  const a=js.indexOf('function ensureMusicGraph({userGesture=false}={})');
  const b=js.indexOf('function startVisualizer()',a);
  assert.ok(a>0&&b>a);
  let resumeCalls=0,sourceCount=0;
  const context={
    state:'suspended',destination:{},
    createAnalyser(){return {fftSize:256,frequencyBinCount:128,connect(){}};},
    createMediaElementSource(){sourceCount++;return {connect(){}};},
    resume(){resumeCalls++;this.state='running';return Promise.resolve();}
  };
  const window={AudioContext:function AudioContext(){return context},__tfwAmbientAudio:{}};
  const tracks=[{},{},{}];
  const factory=new Function('soundEnabled','window','finalSong','voiceSong','sequenceSong',
    "let musicCtx=null,musicAnalyser=null,musicData=null,finalMusicSource=null,"+
    "voiceMusicSource=null,sequenceMusicSource=null,ambientMusicSource=null,musicResumePending=false;\n"+
    js.slice(a,b)+'\nreturn ensureMusicGraph;');
  const graph=factory(()=>true,window,...tracks);
  graph();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(context.state,'running');
  assert.ok(resumeCalls>=1);
  assert.equal(sourceCount,4);
  assert.match(js,/ensureMusicGraph\(\{userGesture:true\}\)/);
  assert.match(js,/getByteFrequencyData\(musicData\)/);
  assert.match(js,/Math\.pow\(sample\/255,\.70\)\*1\.32/);
});

test('V28 release message and secondary-scale elapsed layout are present',()=>{
  const js=read('js/milestones.js'),css=section('v28.css'),html=read('index.html');
  assert.match(js,/GO LAUNCH THAT FUCKING GTA VI RIGHT NOW!/);
  assert.doesNotMatch(js,/AFTER MORE THAN A DECADE, HERE WE ARE/);
  assert.match(css,/width:min\(740px,77vw\)!important/);
  assert.match(css,/height:clamp\(72px,7\.8vw,105px\)!important/);
  assert.match(html,/css\/experience\.css\?v=33/);
  assert.match(html,/js\/clock\.js\?v=39/);
  assert.match(html,/js\/milestones\.js\?v=39/);
});


test('V29 phase-one neon backlights use the same -6s to -200ms envelope',()=>{
  const css=section('v29-phase1.css'),js=read('js/milestones.js');
  assert.match(css,/body\.final-five-active\.finale-scene-rush \.hero-content::after/);
  assert.match(css,/opacity:var\(--tfw-glow-strength,0\)!important/);
  assert.match(css,/body\.final-five-active\.finale-music-live \.finale-beat-halo/);
  assert.match(css,/opacity:calc\(\.54 \* var\(--tfw-glow-strength,0\)\)!important/);
  assert.match(css,/body\.final-five-active\.finale-music-live \.finale-edge-glow/);
  assert.match(js,/const glowLinear=clamp\(\(6000-remaining\)\/5800,0,1\)/);
});
test('V29 elapsed status is small and legible',()=>{
  const css=section('v29-phase1.css');
  assert.match(css,/width:min\(455px,84vw\)!important/);
  assert.match(css,/height:clamp\(53px,5\.8vw,69px\)!important/);
  assert.match(css,/body\.finale-released \.release-elapsed-label/);
  assert.match(css,/color:#fff!important/);
});
test('V29 visualizer resizes its initially hidden bitmap and receives FFT',()=>{
  const js=read('js/milestones.js');
  const a=js.indexOf('function startVisualizer(){'),b=js.indexOf('function stopVisualizer(',a);
  assert.ok(a>=0&&b>a);
  let height=0,samples=0,draws=0,nextFrame=null;
  const ctx={setTransform(){},clearRect(){},save(){},restore(){},createLinearGradient(){return {addColorStop(){}};},fillRect(){draws++}};
  const canvas={width:1,height:1,getContext:()=>ctx,getBoundingClientRect:()=>({width:480,height})};
  const fakeDocument={body:{classList:{add(){},contains:()=>true}},documentElement:{style:{setProperty(){}}}};
  const frame=fn=>{nextFrame=fn;return 1};
  const data=new Uint8Array(256);
  const analyser={getByteFrequencyData(x){samples++;x.fill(110);}};
  const source="let visualizerRaf=0,visualizerResize=null;"+
    "const musicCtx={state:'running'},ambientMusicSource={},finalMusicSource=null;"+
    "const $=sel=>sel==='#finaleVisualizer'?canvas:null;"+
    js.slice(a,b)+";return startVisualizer;";
  const create=new Function('canvas','document','window','matchMedia','devicePixelRatio',
    'requestAnimationFrame','soundEnabled','musicIsPlaying','clamp','musicAnalyser','musicData',source);
  const start=create(canvas,fakeDocument,{addEventListener(){}},()=>({matches:false}),1,frame,
    ()=>true,()=>true,(n,min,max)=>Math.max(min,Math.min(max,n)),analyser,data);
  start();
  assert.equal(canvas.height,1,'starts with zero CSS height');
  height=44;assert.ok(nextFrame);
  nextFrame(400);
  assert.equal(canvas.height,44,'bitmap updates after CSS reveal');
  assert.ok(samples>0,'FFT read');
  assert.ok(draws>0,'bars drawn');
});
test('V29 release heading, fireworks and visualizer are brought forward',()=>{
  const js=read('js/milestones.js'),css=section('v29-phase1.css');
  assert.match(js,/<h2><span class="finale-release-kicker">THE WAIT IS OVER!<\/span>/);
  assert.match(js,/WELCOME TO<br>LEONIDA!/);
  assert.match(js,/if\(hero&&canvas\.parentElement!==hero\)hero\.appendChild\(canvas\)/);
  assert.match(js,/const wave=\$\('#finaleVisualizerWrap'\)/);
  assert.match(css,/body\.finale-released canvas#finaleFireworks/);
  assert.match(css,/body\.tfw-visualizer-ready\.finale-released \.finale-visualizer-wrap/);
});


test('V29 ambient fade is slow before -30m and reaches zero at cutoff',()=>{
  const js=read('js/clock.js');
  const a=js.indexOf('function bgFadeFactor(');
  const b=js.indexOf('function setBgVolume(',a);
  assert.ok(a>=0&&b>a);
  const make=new Function('BG_CUTOFF','BG_FADE_WINDOW','remainingForAudio',
    'BG_VOLUME','BG_DUCK_VOLUME','currentMilestone',
    js.slice(a,b)+'\nreturn {bgFadeFactor,desiredBgVolume};');
  const cutoff=1800000,fade=20000;
  const obj=make(cutoff,fade,()=>cutoff+fade,.22,.095,null);
  const levels=[cutoff+fade+1,cutoff+fade,cutoff+fade*.75,cutoff+fade*.5,cutoff+fade*.25,cutoff+1,cutoff].map(obj.bgFadeFactor);
  assert.equal(levels[0],1);assert.equal(levels[1],1);
  for(let i=1;i<levels.length;i++)assert.ok(levels[i]<=levels[i-1]);
  assert.equal(levels.at(-1),0);
  assert.ok(Math.abs(levels[3]-.5)<.001);
  assert.ok(obj.desiredBgVolume()===.22);
  assert.match(js,/setBgVolume\(desiredBgVolume\(\),fadeActive\?0:350\)/);
  assert.match(js,/return remainingForAudio\(\)>BG_CUTOFF&&!previewFinalFive/);
});

test('V30 decoded scene reaches the viewport only in the animation frame',async()=>{
 const js=read('js/app.js');const a=js.indexOf('function changeScene(forceChoice=null, allowFinale=false){');
 const b=js.indexOf('function updateSceneCounter()',a);assert.ok(a>0&&b>a);
 let decode;const frames=[],log=[];
 const fakeLayer=name=>({classList:{add(k){log.push(name+'.'+k+'.on')},remove(k){log.push(name+'.'+k+'.off')}}});
 const sceneA=fakeLayer('A'),sceneB=fakeLayer('B'),hero=fakeLayer('hero');hero.offsetWidth=1;
 const factory=new Function('scenes','currentPhase','document','nextReleaseSceneChoice','pickNextScene',
 'readySceneImage','els','applyScene','requestAnimationFrame','preloadChoice','updateSceneCounter','track',
 "let activeLayer=0,currentIndex=0,sceneSwapToken=0,recentScenes=[];\n"+js.slice(a,b)+"\nreturn {changeScene,index:()=>currentIndex};");
 const scene=factory([{},{}],'normal',{body:{classList:{contains:()=>false}}},()=>null,()=>null,
 ()=>new Promise(resolve=>decode=resolve),{sceneA,sceneB,hero},
 ()=>log.push('apply'),fn=>frames.push(fn),()=>null,()=>{},()=>{});
 const pending=scene.changeScene({scene:{id:'scene-2'},index:1},true);
 assert.deepEqual(log,[]);assert.equal(scene.index(),0);
 decode();await Promise.resolve();await Promise.resolve();
 assert.equal(log[0],'apply');assert.equal(scene.index(),0);
 assert.equal(frames.length,1);frames[0]();
 assert.equal(await pending,true);assert.equal(scene.index(),1);
 assert.ok(log.includes('B.active.on')&&log.includes('A.active.off'));
 assert.match(js,/img\.decode\(\)\.then\(\(\)=>img\)/);
});

test('V29 phase pill first appears at 24h and tracks milestones',()=>{
  const js=read('js/app.js');
  const a=js.indexOf('function phaseFor(ms) {');
  const b=js.indexOf('function setUnit(',a);
  assert.ok(a>=0&&b>a);
  const state={dormant:null,label:''};
  const pill={
    classList:{toggle(cls,on){if(cls==='tfw-phase-pill-dormant')state.dormant=on}},
    set innerHTML(html){state.label=html.replace(/<[^>]*>/g,'').trim()}
  };
  const create=new Function('DAY','phaseClasses','document','els','window',
    'stopSceneRotation','scheduleSceneRotation',
    "let currentPhase='',lastPhaseLabel='';\n"+
    js.slice(a,b)+'\nreturn {phaseFor,applyPhase};');
  const p=create(86400000,[],{body:{classList:{remove(){},add(){}}}},
    {phasePill:pill},{scrollTo(){}},()=>{},()=>{});
  const H=3600000,MIN=60000;
  for(const [ms,label,visible] of [
    [86400001,'THE FINAL WEEK',false],
    [86400000,'THE LAST 24 HOURS',true],
    [12*H,'FINAL 12 HOURS',true],
    [6*H,'THE FINAL SIX HOURS',true],
    [H,'THE FINAL HOUR',true],
    [30*MIN,'FINAL 30 MINUTES',true],
    [15*MIN,'THE LAST QUARTER HOUR',true],
    [5*MIN,'5 MINUTES LEFT. STAY HERE.',true],
    [MIN,'THE FINAL MINUTE',true]
  ]){
    const phase=p.phaseFor(ms);
    p.applyPhase(phase);
    assert.equal(state.label,label,'remaining '+ms);
    assert.equal(state.dormant,!visible,'capsule visibility at '+ms);
  }
  assert.match(read('index.html'),/class="phase-pill glass tfw-phase-pill-dormant"/);
});

test('V29 phase-two typography uses one fixed title footprint',()=>{
  const css=section('v29-phase2.css'),html=read('index.html'),js=read('js/milestones.js');
  assert.match(css,/height:clamp\(144px,13vw,190px\)!important/);
  assert.match(css,/font-size:clamp\(44px,6\.30vw,91px\)!important/);
  assert.match(css,/#phasePill\.tfw-phase-pill-dormant/);
  assert.match(css,/margin-top:clamp\(24px,3svh,40px\)!important/);
  assert.match(html,/css\/experience\.css\?v=33/);
  assert.match(html,/css\/experience\.css\?v=33/);
  assert.match(html,/js\/app\.js\?v=40/);
  assert.match(html,/js\/clock\.js\?v=39/);
  assert.match(html,/js\/milestones\.js\?v=39/);
  assert.match(js,/if\(pill&&remaining>0&&remaining<=FINAL_FIVE\)/);
});


test('V30 phase one: elapsed status shifts alone and gets persistent neon/white glow',()=>{
  const css=section('v29-phase1.css');
  const elapsed=css.slice(css.indexOf('body.finale-released .release-elapsed{'),css.indexOf('body.finale-released .release-elapsed-label{'));
  assert.match(elapsed,/position:relative!important/);
  assert.match(elapsed,/top:clamp\(13px,2svh,23px\)!important/);
  assert.match(elapsed,/width:min\(455px,84vw\)!important/);
  const card=css.slice(css.indexOf('body.finale-released .release-elapsed-clock .time-unit{'),css.indexOf('body.finale-released .release-elapsed-clock .time-value{'));
  assert.match(card,/0 0 21px rgba\(242,63,178,\.28\)/);
  assert.match(card,/0 0 43px rgba\(119,96,255,\.19\)/);
  const value=css.slice(css.indexOf('body.finale-released .release-elapsed-clock .time-value{'),css.indexOf('body.finale-released .release-elapsed-clock .time-label{'));
  assert.match(value,/0 0 23px rgba\(242,63,178,\.43\)/);
  assert.match(css,/body.finale-released .release-elapsed-clock .digit-glow\{\s*opacity:\.52!important/);
});

test('V30 phase one: release FFT preserves pre-release dimensions and clears CTA',()=>{
  const css=section('v29-phase1.css');
  const rule=css.slice(css.indexOf('body.tfw-visualizer-ready.finale-released .finale-visualizer-wrap{'));
  assert.match(rule,/bottom:clamp\(88px,11\.5svh,126px\)!important/);
  assert.match(rule,/width:min\(720px,58vw\)!important/);
  assert.match(rule,/height:44px!important/);
  assert.match(rule,/width:min\(78vw,540px\)!important/);
  assert.match(rule,/width:86vw!important/);
  assert.match(rule,/bottom:clamp\(84px,11\.5svh,103px\)!important/);
  assert.match(rule,/height:36px!important/);
});

test('V30 phase one: heading is compact and gradient animates directly on unclipped text',()=>{
  const css=section('v29-phase1.css');
  const h=css.slice(css.indexOf('body.finale-released .finale-release h2{'),css.indexOf('body.finale-released .finale-release h2::before{'));
  assert.match(h,/gap:clamp\(8px,1\.15svh,13px\)!important/);
  assert.match(h,/padding:clamp\(14px,2svh,23px\)/);
  assert.match(h,/animation:none!important/);
  assert.match(h,/background:none!important/);
  const em=css.slice(css.indexOf('body.finale-released .finale-release h2 .finale-release-main{'),css.indexOf('@keyframes tfwV30ReleaseTextFlow'));
  assert.match(em,/padding:0 \.11em \.07em!important/);
  assert.match(em,/letter-spacing:-\.045em!important/);
  assert.match(em,/background-clip:text!important/);
  assert.match(em,/animation:tfwV30ReleaseTextFlow 4\.7s linear infinite!important/);
  assert.match(css,/@keyframes tfwV30ReleaseTextFlow/);
});

test('V30 phase one: larger white glowing release instruction remains above the line',()=>{
  const css=section('v29-phase1.css'),html=read('index.html');
  const phrase=css.slice(css.indexOf('body.finale-released .finale-release-date{'),css.indexOf('body.finale-released .release-line{'));
  assert.match(phrase,/font:900 clamp\(12px,1\.2vw,19px\)\/1\.4/);
  assert.match(phrase,/0 0 17px rgba\(255,255,255,\.61\)/);
  assert.match(phrase,/margin:clamp\(30px,4svh,44px\) auto 0!important/);
  assert.match(css,/body.finale-released .release-line\{\s*margin-top:clamp\(13px,1\.7svh,19px\)!important/);
  assert.match(html,/css\/experience\.css\?v=33/);
  assert.match(html,/css\/experience\.css\?v=33/);
});

test('V30 fireworks continue beyond one minute with regular and reduced motion',()=>{
 const js=read('js/milestones.js');
 const a=js.indexOf('function makeBurst('),b=js.indexOf('function stopFireworks(',a);
 assert.ok(a>0&&b>a);
 for(const reduced of [false,true]){
   let callback=null,dead=false,empty=0,maxEmpty=0;
   const ctx={setTransform(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},arc(){}};
   const body={},canvas={parentElement:body,appendChild(){},getContext:()=>ctx,
     getBoundingClientRect:()=>({width:1280,height:720})};
   const factory=new Function('document','window','canvas','requestAnimationFrame',
     'matchMedia','devicePixelRatio',
     "const $=()=>canvas;let fireworks=[],fireworksRaf=0,fireworkNext=0,releaseShown=true;"+
     js.slice(a,b)+"function stopFireworks(){fireworksRaf=0}\n"+
     "return {startFireworks,particleCount:()=>fireworks.length};");
   const unit=factory({body},{addEventListener(){}},canvas,
     f=>(callback=f,1),()=>({matches:reduced}),1);
   unit.startFireworks();
   for(let frame=0;frame<3600;frame++){
     const fn=callback;callback=null;
     if(!fn){dead=true;break}
     fn(frame*1000/60);
     const count=unit.particleCount();
     if(count===0){empty++;maxEmpty=Math.max(maxEmpty,empty)}
     else empty=0;
     if(frame%600===0)assert.ok(count>0,'zero fireworks at second '+frame/60);
   }
   assert.equal(dead,false,'fireworks loop stopped with reduced='+reduced);
   assert.ok(maxEmpty<40,'fireworks disappeared for too long');
 }
 assert.match(js,/if\(releaseShown\|\|fireworks\.length\)fireworksRaf=requestAnimationFrame\(loop\)/);
});

test('V30 manual scene control prevents spam during decode and fade',async()=>{
 const js=read('js/app.js'),a=js.indexOf('function sceneOpacityTransitionMs(layer){'),
   b=js.indexOf('function scheduleSceneRotation(){',a);
 assert.ok(a>0&&b>a);
 let resolveImage,numberOfRequests=0,stops=0,restarts=0,finishFade=null;
 const audio={};
 const el={addEventListener(kind,fn){if(kind==='transitionend')finishFade=fn},removeEventListener(){}};
 const button={disabled:false,setAttribute(k,v){this[k]=v}};
 const factory=new Function('getComputedStyle','changeScene','els','$',
 'stopSceneRotation','scheduleSceneRotation','setTimeout','clearTimeout',
 "let sceneUserBusy=false,activeLayer=0;"+
 js.slice(a,b)+"\nreturn {changeSceneFromButton,busy:()=>sceneUserBusy};");
 const ui=factory(()=>({transitionDuration:'2.4s',transitionDelay:'0s',transitionProperty:'opacity'}),
   ()=>{numberOfRequests++;return new Promise(resolve=>resolveImage=resolve)},
   {sceneA:el,sceneB:el},()=>button,()=>stops++,()=>restarts++,()=>1,()=>{});
 const first=ui.changeSceneFromButton();
 assert.equal(button.disabled,true);assert.equal(button['aria-busy'],'true');
 assert.equal(await ui.changeSceneFromButton(),false,'second click ignored');
 assert.equal(numberOfRequests,1);
 resolveImage(true);
 await Promise.resolve();await Promise.resolve();
 assert.equal(button.disabled,true,'locked during crossfade');
 assert.ok(finishFade,'fade completion handler attached');
 finishFade({target:el,propertyName:'opacity'});
 assert.equal(await first,true);
 assert.equal(button.disabled,false);assert.equal(button['aria-busy'],'false');
 assert.equal(stops,1);assert.equal(restarts,1);
 assert.match(section('v29-phase2.css'),/#nextScene:disabled/);
});

test('V30 headline wraps at 24h and 6h and does not rewrite a stable stage',()=>{
 const js=read('js/clock.js'),css=section('v29-phase2.css');
 const a=js.indexOf('function renderMilestoneHeadline(title,m){'),
   b=js.indexOf('function deactivatePreviewStage(){',a);
 assert.ok(a>0&&b>a);
 let writes=0;
 const title={dataset:{},set innerHTML(s){this.html=s;writes++},
   set textContent(s){this.text=s;writes++},
   setAttribute(){},removeAttribute(){}};
 const mk=new Function('byId','document',
   "let previewStage=null;function deactivatePreviewStage(){}\n"+
   js.slice(a,b)+"\nreturn activatePreviewStage;");
 const activate=mk(()=>title,{body:{classList:{add(){}},dataset:{}}});
 for(let n=0;n<120;n++)activate({id:'day',title:'TOMORROW, THE WAIT ENDS'});
 assert.equal(writes,1,'same stage overwritten repeatedly');
 assert.match(title.html,/TOMORROW,<\/span><span class="tfw-headline-line">THE WAIT ENDS/);
 activate({id:'6h',title:'THE WAIT IS ALMOST OVER'});
 assert.equal(writes,2);
 assert.match(title.html,/THE WAIT IS<\/span><span class="tfw-headline-line">ALMOST OVER/);
 assert.match(css,/font-size:clamp\(44px,6\.30vw,91px\)!important/);
 assert.match(css,/margin:0 0 clamp\(2px,\.48svh,6px\)!important/);
 assert.match(css,/height:152px!important/);
 assert.match(js,/renderMilestoneHeadline\(byId\('heroTitle'\),null\)/);
});
