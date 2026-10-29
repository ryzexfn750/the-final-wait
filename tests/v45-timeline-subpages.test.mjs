import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');

test('V45 timeline has Rockstar October 15 launch trailer and correct scene mappings',()=>{
 const js=read('js/config.js');
 const match=js.match(/export const TIMELINE\s*=\s*(\[[\s\S]*?\]);/);
 assert.ok(match,'JSON-compatible milestone list');
 const events=JSON.parse(match[1]);
 const items=JSON.parse(read('content/timeline.json'));
 const screenshots=JSON.parse(read('assets/scenes.json'));
 const byId=new Map(items.map(item=>[item.id,item]));
 assert.equal(events.length,items.length,'All timeline cards have detailed articles');
 assert.equal(new Set(events.map(e=>e.articleId)).size,events.length);
 for(const item of events){
   assert.ok(byId.has(item.articleId),'Missing story '+item.articleId);
   assert.ok(screenshots.some(s=>s.id===item.sceneId),'Missing image '+item.sceneId);
 }
 const album=events.find(e=>e.articleId==='the-album');
 const launch=events.find(e=>e.articleId==='launch-trailer');
 const welcome=events.find(e=>e.articleId==='welcome-to-leonida');
 assert.equal(album.sceneId,'scene-164');
 assert.equal(welcome.sceneId,'scene-148');
 assert.equal(launch.date,'OCT 15, 2026');
 assert.equal(launch.primaryUrl,'https://www.rockstargames.com/VI/launch-trailer');
 assert.ok(events.findIndex(e=>e.articleId==='game-informer-cover-story')<
   events.findIndex(e=>e.articleId==='launch-trailer'));
 assert.ok(events.findIndex(e=>e.articleId==='launch-trailer')<
   events.findIndex(e=>e.articleId==='preload'));
 assert.equal(byId.get('the-album').heroSceneId,'scene-164');
 assert.equal(byId.get('welcome-to-leonida').heroSceneId,'scene-148');
 const story=byId.get('launch-trailer');
 assert.ok(story);
 assert.equal(story.date,'OCT 15, 2026');
 assert.ok(story.blocks.some(b=>b.type==='sources'&&b.items.some(s=>s.url.includes('rockstargames.com'))));
});

test('V45 compact home archive CTA and creator credit',()=>{
 const html=read('index.html'),css=read('css/site-polish.css');
 assert.ok(html.includes('EXPLORE ALL DOSSIERS'));
 assert.match(html,/href="intel-archive\.html"[^>]*>EXPLORE ALL DOSSIERS/);
 assert.ok(!html.includes('in the complete Leonida archive.'));
 assert.match(html,/<strong>RYZEGTAVI<\/strong>/);
 assert.match(css,/#intel \.intel-archive-cta/);
 assert.match(css,/margin:6px auto 12px!important/);
});

test('V45 archive and story pages keep the complete controls and dark language menu',()=>{
 const css=read('css/secondary-controls.css');
 const audioJs=read('js/secondary-controls.js');
 const volumeJs=read('js/audio-controls.js');
 assert.match(css,/background-color:#171020!important/);
 assert.match(css,/color-scheme:dark/);
 assert.match(css,/\.gt_selector/);
 for(const path of ['today.html','timeline.html','intel.html','intel-archive.html']){
   const html=read(path);
   for(const id of ['tfwPageShare','tfwPageFullscreen','soundButton','mobileSoundButton','tfwPageMenu','tfwPageDrawer']){
     assert.ok(html.includes('id="'+id+'"'),path+' '+id);
   }
   assert.doesNotMatch(html,/<a[^>]*>TIME ZONE<\/a>/);
   assert.ok(html.includes('gtranslate_wrapper'),path);
   assert.ok(html.includes('css/secondary-controls.css?v=48'),path);
   assert.ok(html.includes('css/audio-controls.css?v=39'),path);
   assert.ok(html.includes('js/secondary-controls.js?v=48'),path);
   assert.ok(html.includes('js/audio-controls.js?v=46'),path);
   assert.ok(html.includes('RYZEGTAVI')||path==='intel-archive.html',path+' creator credit');
 }
 assert.ok(volumeJs.includes('tfw_volume'));
 assert.ok(audioJs.includes("__tfwMasterVolume"));
 for(const src of ['background-v26.mp3','final-call-29m55s.mp3','final-5-minutes.mp3'])
   assert.ok(audioJs.includes(src),'missing soundtrack '+src);
 assert.match(audioJs,/tfw:sound-change/);
 assert.match(audioJs,/tfw:volume-change/);
 assert.match(audioJs,/if\(event\.detail\?\.enabled\)syncSound\(true\)/);
 assert.match(audioJs,/pointerdown','keydown','touchstart/);
});

test('V45 browser cache busts preserve the changed timeline data',()=>{
 const home=read('index.html'),archive=read('intel-archive.html');
 assert.ok(home.includes('js/app.js?v=52'));
 assert.ok(read('js/app.js').includes("'./config.js?v=45'"));
 assert.ok(archive.includes('js/intel-archive.js?v=47'));
 assert.ok(read('js/intel-archive.js').includes("'./config.js?v=45'"));
});
