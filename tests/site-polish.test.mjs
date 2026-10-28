import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Dossier covers load as a collection and timeline survives isolated content failures',()=>{
 const app=read('js/app.js');
 assert.match(app,/const images=\$\$\('#intelGrid \.intel-image\[data-bg\]'\)/);
 assert.match(app,/images\.forEach\(node=>intelImageObserver\.observe\(node\)\)/);
 assert.match(app,/bindTimeline\(\)/);
 assert.match(app,/function syncSectionHash\(\)/);
 assert.match(app,/history\.replaceState\(null,'',location\.pathname\+location\.search\+hash\)/);
 assert.match(app,/const edge=Math\.max\(16,\(viewport\.clientWidth-first\.offsetWidth\)\/2\)/);
 assert.match(app,/viewport\.scrollTo\(\{left:offset,/);
});

test('Release call-to-action stays inside the rounded box; effects are anchored to hero',()=>{
 const finale=read('js/milestones.js'),styles=read('css/site-polish.css');
 assert.match(finale,/WELCOME TO<br>LEONIDA!<\/em><span class="finale-release-date">GO LAUNCH/);
 assert.match(finale,/if\(hero&&canvas\.parentElement!==hero\)hero\.appendChild\(canvas\)/);
 assert.doesNotMatch(finale,/document\.body\.appendChild\(canvas\)/);
 assert.doesNotMatch(finale,/document\.body\.appendChild\(wave\)/);
 assert.match(styles,/body\.finale-released #hero canvas#finaleFireworks\{/);
 assert.match(styles,/position:absolute!important/);
 assert.match(styles,/body\.tfw-visualizer-ready\.finale-released #hero \.finale-visualizer-wrap/);
 assert.match(styles,/body\.finale-released #hero \.release-elapsed-clock \.digit-glow/);
});

test('Volume popup is persistent, local and controls all soundtrack owners',()=>{
 const html=read('index.html'),controls=read('js/audio-controls.js');
 assert.match(html,/js\/audio-controls\.js\?v=39/);
 assert.match(html,/css\/audio-controls\.css\?v=39/);
 for(const part of ['tfw_volume','tfw_sound','tfw:volume-change','tfw:sound-change','tfwVolumeSlider','tfwMuteToggle'])assert.ok(controls.includes(part),part);
 for(const p of ['js/clock.js','js/milestones.js','js/final-call.js']){
   assert.match(read(p),/__tfwMasterVolume/);
 }
 assert.match(read('js/milestones.js'),/masterVolume\(\)/);
 assert.match(read('js/app.js'),/tfwOpenVolumePopover|SOUND buttons open the shared mute\/volume popover/);
});

test('GTA-style pointer illumination runs on home and every article page',()=>{
 const style=read('css/site-polish.css'),script=read('js/site-polish.js');
 assert.match(style,/#tfwGlobalCursor/);
 assert.match(script,/pointermove/);
 for(const p of ['index.html','today.html','intel.html','timeline.html']){
   const html=read(p);
   assert.ok(html.includes('css/site-polish.css?v=46'),p);
   assert.ok(html.includes('js/site-polish.js?v=43'),p);
 }
});
