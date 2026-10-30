import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const pages=['index.html','today.html','timeline.html','intel.html',
  'intel-archive.html','profile.html','newsletter.html','support.html'];

test('Standard footer is identical on all eight routes and coffee is below X',()=>{
  const canonical=read('index.html').match(/<footer>[\s\S]*?<\/footer>/)?.[0];
  assert.ok(canonical&&canonical.includes('tfw-footer-creator-actions'));
  for(const page of pages){
    const html=read(page),footer=html.match(/<footer>[\s\S]*?<\/footer>/)?.[0];
    assert.equal(footer,canonical,page+' must use the same footer markup');
    assert.match(html,/js\/support-experience\.js\?v=5/);
    assert.match(footer,/class="footer-ryze-logo"/);
    assert.match(footer,/class="creator-chip magnetic"/);
    assert.match(footer,/href="newsletter\.html"/);
  }
  const popup=read('js/support-experience.js');
  assert.match(popup,/footer \.tfw-footer-creator-actions/);
  const css=read('css/site-polish.css');
  assert.match(css,/body>footer \.tfw-footer-creator-actions\{/);
  assert.match(css,/flex-direction:column;align-items:stretch/);
});

test('Streamer Mode lives in Settings and hides nickname reactions',()=>{
 const settings=read('settings.html'),profile=read('profile.html');
 const handler=read('js/streamer-mode-settings.js'),shared=read('js/community.js');
 assert.match(settings,/id="settingsStreamerMode" type="checkbox" role="switch"/);
 assert.match(settings,/id="settingsStreamerModeState"/);
 assert.doesNotMatch(profile,/profileStreamerMode/);
 assert.match(handler,/localStorage\.setItem\(key,input\.checked\?'on':'off'\)/);
 assert.match(handler,/window\.parent\.dispatchEvent\(new Event\('tfw:streamer-mode-change'\)\)/);
 assert.match(shared,/window\.addEventListener\('tfw:streamer-mode-change',updateStreamerMode\)/);
 assert.match(shared,/!document\.documentElement\.classList\.contains\('tfw-streamer-mode'\)/);
 assert.match(read('css/community.css'),/html\.tfw-streamer-mode \.tfw-hype-float-name\{display:none!important\}/);
});
test('Text selection uses custom I-beam and the system I-beam stays suppressed',()=>{
  const js=read('js/site-polish.js'),css=read('css/site-polish.css');
  assert.match(js,/tfw-global-cursor-ibeam/);
  assert.match(js,/layer\.classList\.toggle\('text-selecting',selectingText\)/);
  assert.match(js,/layer\.classList\.toggle\('text-caret',textCaret\)/);
  assert.match(css,/svg\.tfw-global-cursor-ibeam\{/);
  assert.match(css,/html\.tfw-global-cursor-ready\.tfw-text-selection-active body \*/);
  assert.match(css,/#tfwGlobalCursor\.text-selecting \.tfw-global-cursor-reticle\{opacity:1!important\}/);
});

test('QA Worker supports all seven reactions and versioned WebSocket protocol',()=>{
  const worker=read('workers/hype-worker/src/index.js');
  const config=read('workers/hype-worker/wrangler.qa.jsonc');
  for(const emoji of ['🔥','🚀','🥳','🎉','🌴','🩷','💜'])assert.ok(worker.includes(emoji));
  assert.match(worker,/protocol:2/);
  assert.match(worker,/reaction_ack/);
  assert.match(config,/"name": "the-final-wait-hype-qa"/);
});

test('Compact custom I-beam persists after selection and profile text is concise',()=>{
 const js=read('js/site-polish.js'),css=read('css/site-polish.css');
 assert.match(js,/viewBox="0 0 12 22"/);
 assert.match(js,/window\.addEventListener\('pointerup'/);
 assert.match(css,/width:12px!important;height:22px!important/);
 assert.match(css,/tfw-text-selection-active body \*\{cursor:none!important\}/);
 assert.doesNotMatch(read('profile.html'),/Saved on this device\. Other visitors can still see nicknames normally/);
});
test('Live HYPE reactions are subtle, limited and use an accessible reduced-motion fallback',()=>{
 const js=read('js/community.js'),css=read('css/community.css');
 assert.match(js,/const REACTION_DURATION=780/);
 assert.match(js,/const MAX_VISIBLE_REACTIONS=2/);
 assert.match(js,/const REACTION_THROTTLE=145/);
 assert.match(js,/setTimeout\(\(\)=>node\.remove\(\),REACTION_DURATION\+20\)/);
 assert.match(js,/function animatedLayerAvailable\(\)/);
 assert.match(css,/tfwHypeQuietRise 780ms/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/tfwHypeQuietReduced 780ms/);
});
