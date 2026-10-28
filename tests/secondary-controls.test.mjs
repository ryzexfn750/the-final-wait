import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('All inner pages have desktop + mobile sound, fullscreen, share, and translation controls',()=>{
 const pages=['today.html','timeline.html','intel.html','intel-archive.html'];
 for(const name of pages){
  const html=read(name);
  for(const id of ['soundButton','mobileSoundButton','tfwPageShare','tfwPageFullscreen','tfwPageMenu','tfwPageDrawer'])
   assert.ok(html.includes('id="'+id+'"'),name+' '+id);
  assert.match(html,/css\/audio-controls\.css\?v=39/);
  assert.match(html,/css\/secondary-controls\.css\?v=44/);
  assert.match(html,/js\/audio-controls\.js\?v=39/);
  assert.match(html,/js\/secondary-controls\.js\?v=44/);
  assert.match(html,/gtranslate_wrapper language-widget/);
  assert.match(html,/css\/site-polish\.css\?v=44/);
 }
 const css=read('css/secondary-controls.css');
 assert.match(css,/background-color:#171020!important/);
 assert.match(css,/color-scheme:dark/);
 assert.match(css,/option\{/);
 assert.match(css,/@media\(max-width:890px\)/);
});

test('Secondary music respects shared master volume and browser-autoplay restrictions',()=>{
 const js=read('js/secondary-controls.js');
 assert.match(js,/new Audio\('assets\/audio\/background-v26\.mp3'\)/);
 assert.match(js,/window\.__tfwMasterVolume/);
 assert.match(js,/tfw:volume-change/);
 assert.match(js,/tfw:sound-change/);
 assert.match(js,/audio\.play\(\)/);
 assert.match(js,/audio\.pause\(\)/);
 assert.match(js,/pointerdown/);
 assert.match(js,/requestFullscreen/);
 assert.match(js,/navigator\.share/);
 assert.match(js,/navigator\.clipboard/);
});

test('Archive call-to-action, footer credit and launch trailer remain correct',()=>{
 const html=read('index.html'),css=read('css/site-polish.css');
 assert.match(html,/Discover every character, location and feature in our Leonida archive\./);
 assert.match(html,/CREATED BY<\/small><strong>RYZEGTAVI<\/strong>/);
 assert.match(css,/#intel \.intel-archive-cta\{\s*margin:2px auto 0!important/);
 assert.match(css,/margin:6px auto 12px!important/);
 assert.match(html,/css\/site-polish\.css\?v=44/);
 const config=read('js/config.js');
 const match=config.match(/export const TIMELINE = ([\s\S]*?);\s*export const INTEL =/);
 assert.ok(match);
 const timeline=JSON.parse(match[1]);
 const album=timeline.find(x=>x.title==='THE ALBUM');
 const release=timeline.find(x=>x.title==='WELCOME TO LEONIDA');
 const trailer=timeline.find(x=>x.title==='THE LAUNCH TRAILER');
 assert.equal(album.sceneId,'scene-164');
 assert.equal(release.sceneId,'scene-148');
 assert.equal(trailer.date,'OCT 15, 2026');
 assert.equal(trailer.articleId,'launch-trailer');
 assert.ok(JSON.parse(read('content/timeline.json')).some(x=>x.id==='launch-trailer'));
});
