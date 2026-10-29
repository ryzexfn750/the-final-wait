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
  assert.match(cursor,/halo\.style\.transform=translate/);
  assert.match(cursor,/reticle\.style\.transform='translate3d\('/);
  assert.match(css,/transform:translate\(-50%,-50%\)!important/);
  assert.match(css,/#tfwGlobalCursor\.tfw-global-cursor-layer/);
  assert.match(css,/#shareModal \.tfw-share-brand/);
  assert.ok(html.includes('class="tfw-share-brand"'));
  for(const path of ['index.html','today.html','intel.html','timeline.html','intel-archive.html']){
    assert.ok(read(path).includes('js/site-polish.js?v=45'),path);
  }
});


test('V40 section hash follows actual viewport transitions on repeated wheel scrolling',()=>{
  const app=read('js/app.js');
  const begin=app.indexOf('function syncSectionHash(){');
  const end=app.indexOf('let navigationGlobalHandlersBound',begin);
  assert.ok(begin>=0&&end>begin);
  const spans={hero:[0,1020],today:[1020,2100],timeline:[2100,3120],intel:[3120,4200],share:[4200,5100]};
  let wheelY=0,current='#timeline';
  const document={
    body:{classList:{contains:()=>false}},
    documentElement:{classList:{contains:()=>false}},
    getElementById(id){
      const p=spans[id];
      return p?{id,getBoundingClientRect(){return {top:p[0]-wheelY,bottom:p[1]-wheelY}}}:null;
    }
  };
  const location={pathname:'/the-final-wait/',search:'',get hash(){return current}};
  const history={replaceState(_state,_title,url){current=url.includes('#')?url.slice(url.indexOf('#')):''}};
  const sync=new Function('document','window','location','history',
    app.slice(begin,end)+'return syncSectionHash')(document,{innerHeight:900},location,history);
  for(const [offset,expected] of [
    [0,''],[800,'#today'],[1750,'#timeline'],
    [2650,'#intel'],[3850,'#share'],[0,'']
  ]){
    wheelY=offset;
    sync();
    assert.equal(current,expected,'URL should follow section at scrollY '+offset);
  }
});

test('V40 release playlist loops deterministically instead of stopping or randomizing',()=>{
  const app=read('js/app.js');
  const begin=app.indexOf('function nextReleaseSceneChoice(){');
  const end=app.indexOf('function changeScene(',begin);
  assert.ok(begin>=0&&end>begin);
  const ids=['scene-64','scene-69','scene-68','scene-25','scene-134','scene-43','scene-104','scene-123'];
  const select=new Function('releaseSceneIds','releaseChoiceForCursor',
    'releaseSequenceActive','releaseSceneCursor',
    app.slice(begin,end)+'return nextReleaseSceneChoice;')(
      ids,index=>ids[index],true,0);
  for(let i=1;i<=24;i++)assert.equal(select(),ids[i%ids.length]);
});
