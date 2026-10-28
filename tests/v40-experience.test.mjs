import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V40 section shortcuts bind every anchor, and wheel scrolling owns the URL',()=>{
  const app=read('js/app.js');
  assert.match(app,/function bindNavigationTransitions\(\)\{\s*\$\$\('a\[href\]'\)\.forEach/);
  assert.doesNotMatch(app,/function bindNavigationTransitions\(\)\{\s*\$\('a\[href\]'\)\.forEach/);
  assert.match(app,/let navigationGlobalHandlersBound=false/);
  assert.match(app,/if\(navigationGlobalHandlersBound\)return/);
  assert.match(app,/window\.addEventListener\('wheel',refreshHash,\{passive:true\}\)/);
  assert.match(app,/getBoundingClientRect\(\)/);
  assert.match(app,/history\.replaceState\(null,'',location\.pathname\+location\.search\+hash\)/);
});

test('V40 release slideshow advances continuously through original curated pictures',()=>{
  const app=read('js/app.js');
  const scenes=JSON.parse(read('assets/scenes.json'));
  const ids=app.match(/const releaseSceneIds = (\[[^\]]+\]);/);
  assert.ok(ids,'Release scene playlist should remain explicit');
  const playlist=JSON.parse(ids[1].replaceAll("'",'"'));
  assert.equal(playlist.length,8);
  for(const id of playlist){
    const scene=scenes.find(item=>item.id===id);
    assert.ok(scene,id);
    assert.ok(scene.desktop&&scene.mobile,id);
    assert.notEqual(scene.category,'artwork');
  }
  assert.match(app,/releaseSceneCursor=\(releaseSceneCursor\+1\)%releaseSceneIds\.length/);
  assert.match(app,/releaseRotationTimer=setTimeout/);
  assert.match(app,/scheduleReleaseRotation\(\)/);
  assert.match(app,/window\.addEventListener\('tfw:finale-release'/);
  assert.match(app,/function stopReleaseSceneSequence/);
});

test('V40 home has two featured dossiers while archive retains full categories',()=>{
  const app=read('js/app.js'),html=read('index.html');
  const archive=read('intel-archive.html'),archiveJS=read('js/intel-archive.js');
  assert.match(app,/const visible=\[INTEL\[0\],INTEL\[1\]\]\.filter\(Boolean\)/);
  assert.ok(html.includes('href="intel-archive.html"'));
  for(const category of ['PEOPLE','PLACES','SYSTEMS']){
    assert.ok(html.includes('intel-archive.html?category='+category));
    assert.ok(archive.includes('data-filter="'+category+'"'));
  }
  assert.match(archiveJS,/selected==='ALL'\?INTEL:INTEL\.filter/);
  assert.match(archiveJS,/IntersectionObserver/);
  assert.match(archiveJS,/intel\.html\?article=/);
});

test('V40 below-the-fold media hydrates on approach without delaying countdown',()=>{
  const app=read('js/app.js'),motion=read('js/motion.js');
  assert.match(app,/function deferSections\(\)/);
  assert.match(app,/rootMargin:'420px 0px'/);
  assert.match(app,/const ids=\['today','timeline','intel'\]/);
  assert.match(app,/deferSections\(\)/);
  assert.match(app,/startCountdownClock\(\)/);
  assert.match(motion,/Don't request or decode footer artwork while the visitor remains on/);
  assert.match(motion,/preloadObserver\.observe\(host\)/);
  assert.ok(read('index.html').includes('class="share-logo" loading="lazy"'));
});

test('V40 global cursor has guaranteed viewport alignment; small logo appears in share dialog',()=>{
  const cursor=read('js/site-polish.js'),css=read('css/site-polish.css'),html=read('index.html');
  assert.match(cursor,/document\.addEventListener\('pointermove'/);
  assert.match(cursor,/dot\.style\.left=x\+'px'/);
  assert.match(css,/transform:translate\(-50%,-50%\)!important/);
  assert.match(css,/body\.tfw-custom-cursor\.tfw-pointer-active/);
  assert.match(css,/#shareModal \.tfw-share-brand/);
  assert.ok(html.includes('class="tfw-share-brand"'));
  for(const path of ['index.html','today.html','intel.html','timeline.html','intel-archive.html']){
    assert.ok(read(path).includes('js/site-polish.js?v=40'),path);
  }
});
