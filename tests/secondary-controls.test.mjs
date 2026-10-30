import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

const subpages=['today.html','timeline.html','intel.html','intel-archive.html'];

test('Secondary pages share centered navigation, volume, Share modal and dark language control',()=>{
 const css=read('css/secondary-controls.css');
 for(const name of subpages){
   const html=read(name);
   for(const id of ['soundButton','mobileSoundButton','tfwPageShare','tfwPageFullscreen','tfwPageMenu','tfwPageDrawer']){
     assert.ok(html.includes('id="'+id+'"'),name+' '+id);
   }
   for(const asset of [
    'css/audio-controls.css?v=39',
    'css/secondary-controls.css?v=48',
    'js/audio-controls.js?v=46',
    'js/secondary-controls.js?v=49',
    'js/secondary-share.js?v=46',
    'js/page-ready.js?v=47',
    'js/seamless-navigation.js?v=60',
    'css/site-polish.css?v=56'
   ])assert.ok(html.includes(asset),name+' '+asset);
   assert.ok(html.includes('gtranslate_wrapper language-widget'));
   assert.doesNotMatch(html,/id="(?:topbarZoneButton|zoneButton)"/);
   assert.match(html,/class="tfw-footer-creator-actions"/);
   assert.match(html,/class="footer-ryze-logo"/);
   assert.match(html,/CREATED BY<\/small><strong>RYZEGTAVI<\/strong>/);
   assert.match(html,/tfw-page-booting/);
   assert.doesNotMatch(html,/>TIME ZONE<\/a>/);
   assert.match(html,/class="route-loader-track" role="progressbar"/);
   assert.match(html,/class="tfw-page-loader-caption">LOADING<\/strong>/);
 }
 assert.match(css,/left:50%!important/);
 assert.match(css,/transform:translate\(-50%,-50%\)!important/);
 assert.match(css,/background-color:#171020!important/);
 assert.match(css,/color-scheme:dark/);
 const archive=read('intel-archive.html');
 const topbar=archive.slice(archive.indexOf('<header '),archive.indexOf('</header>')+9);
 assert.doesNotMatch(topbar,/LEONIDA INTEL|TIME ZONE|BACK TO SECTION/);
 assert.match(css,/\.tfw-footer-logo\{/);
 assert.match(css,/#tfwSecondaryShareModal/);
});

test('Background audio stays active on minimized tabs and never duplicates inside embedded pages',()=>{
 const secondary=read('js/secondary-controls.js'),clock=read('js/clock.js');
 const milestones=read('js/milestones.js'),call=read('js/final-call.js');
 const controller=secondary.slice(secondary.indexOf('function play(){'),secondary.indexOf('function changeTrack('));
 assert.doesNotMatch(controller,/document\.hidden/);
 assert.match(secondary,/if\(embedded\)return/);
 assert.match(secondary,/document\.addEventListener\('visibilitychange'/);
 assert.doesNotMatch(secondary,/if\(document\.hidden\)\{if\(audio\)audio\.pause\(\)\}/);
 assert.match(secondary,/setInterval\(\(\)=>syncSound\(\),3000\)/);
 assert.match(clock,/if\(new URLSearchParams\(location\.search\)\.has\('tfw_embed'\)\)return false/);
 assert.match(milestones,/function soundEnabled\(\)\{return !new URLSearchParams/);
 assert.match(call,/function canPlayAudio\(\)\{\s*return !new URLSearchParams/);
 assert.match(read('js/audio-controls.js'),/window\.addEventListener\('storage'/);
});

test('Archive CTA is just the button, moved higher with small gap',()=>{
 const html=read('index.html'),css=read('css/site-polish.css');
 const start=html.indexOf('<div class="intel-archive-cta reveal">');
 const end=html.indexOf('</div>',start);
 assert.ok(start>=0&&end>start);
 const block=html.slice(start,end);
 assert.match(block,/EXPLORE ALL DOSSIERS/);
 assert.doesNotMatch(block,/MORE TO EXPLORE|Discover every character/);
 assert.match(css,/\/\* V47 — the archive CTA sits in normal flow/);
 assert.match(css,/#intel \.intel-archive-cta\{[\s\S]*?margin:0 auto!important/);
 assert.match(html,/CREATED BY<\/small><strong>RYZEGTAVI<\/strong>/);
});

test('Share opens the on-site modal; native share only occurs after choosing SHARE WEBSITE',()=>{
 const html=read('today.html'),js=read('js/secondary-share.js');
 assert.ok(html.includes('js/secondary-share.js?v=46'));
 assert.match(js,/modal\.className='share-modal glass'/);
 assert.match(js,/trigger\.addEventListener\('click',open\)/);
 assert.match(js,/data-tfw-share="x"/);
 assert.match(js,/data-tfw-share="whatsapp"/);
 assert.match(js,/data-tfw-share="native"/);
 assert.match(js,/modal\.querySelectorAll\('\[data-tfw-share\]'\)/);
 assert.match(js,/if\(navigator\.share\)/);
 assert.doesNotMatch(read('js/secondary-controls.js'),/share\?\.addEventListener\('click'/);
});
