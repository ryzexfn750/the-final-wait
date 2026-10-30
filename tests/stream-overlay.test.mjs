import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULTS,isValidZone,normalizeOptions,parseOptions,buildOverlayUrl,
 releaseInstant,remaining,waitProgress,WAIT_START,overlayGeometry,CANVAS} from '../js/stream-overlay-core.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Overlay midnight matches the main countdown in six time zones',()=>{
 const expected={
  'Europe/Rome':'2026-11-18T23:00:00.000Z','Europe/London':'2026-11-19T00:00:00.000Z',
  'Asia/Tokyo':'2026-11-18T15:00:00.000Z','America/Los_Angeles':'2026-11-19T08:00:00.000Z',
  'Pacific/Auckland':'2026-11-18T11:00:00.000Z','Asia/Kolkata':'2026-11-18T18:30:00.000Z'
 };
 for(const [zone,iso] of Object.entries(expected))assert.equal(new Date(releaseInstant(zone)).toISOString(),iso,zone);
 assert.equal(releaseInstant('not-a-real-zone'),releaseInstant(DEFAULTS.tz));
});
test('Only safe settings get into a URL; there is no millisecond option',()=>{
 assert.equal(isValidZone('<img onerror=alert(1)>'),false);
 assert.equal(normalizeOptions({theme:'evil',position:'elsewhere',size:'xxl',tz:'../../etc/passwd'}).tz,'Europe/Rome');
 assert.deepEqual(parseOptions('?theme=neon&position=top-right&size=small&tz=Asia%2FTokyo&brand=0&progress=0&ms=1'),{
  tz:'Asia/Tokyo',theme:'neon',position:'top-right',size:'small',brand:false,progress:false,x:38,y:862,w:460
 });
 const url=buildOverlayUrl('https://thefinalwait.com/streamer-overlay.html',parseOptions('?theme=minimal&ms=1'));
 assert.equal(new URL(url).pathname,'/stream-overlay.html');
 assert.equal(new URL(url).searchParams.has('ms'),false);
 const nested=buildOverlayUrl('https://example.com/the-final-wait/streamer-overlay.html',{tz:'Europe/Rome'});
 assert.equal(new URL(nested).pathname,'/the-final-wait/stream-overlay.html');
});
test('Custom placement/size round trips through the shared browser source',()=>{
 const opt={tz:'Europe/Rome',position:'custom',size:'custom',x:371,y:444,w:688,theme:'neon'};
 const url=buildOverlayUrl('https://community-qa.the-final-wait.pages.dev/streamer-overlay.html',opt);
 const parsed=parseOptions(new URL(url).search);
 assert.deepEqual({x:parsed.x,y:parsed.y,w:parsed.w},{x:371,y:444,w:688});
 const g=overlayGeometry(parsed);
 assert.deepEqual({x:g.x,y:g.y,w:g.w},{x:371,y:444,w:688});
 for(const val of [{x:-200,y:-22,w:999999},{x:50000,y:50000,w:90}]){
  const r=overlayGeometry({...opt,...val});
  assert.ok(r.x>=0&&r.y>=0&&r.x+r.w<=CANVAS.width&&r.y+r.h<=CANVAS.height);
 }
});
test('Absolute time and wait progress remain bounded',()=>{
 const epoch=releaseInstant('Europe/Rome');
 assert.deepEqual(remaining(epoch,epoch+1000),{
  total:0,days:0,hours:0,minutes:0,seconds:0,milliseconds:0,released:true
 });
 assert.equal(waitProgress(epoch,WAIT_START-100),0);
 assert.equal(waitProgress(epoch,epoch+1000),1);
});
test('Browser source is transparent, compact, audio-free, and ends with GTA VI IS OUT',()=>{
 const page=read('stream-overlay.html'),js=read('js/stream-overlay.js'),css=read('css/stream-overlay.css');
 assert.match(page,/GTA VI IS OUT!/);
 assert.doesNotMatch(page,/streamMs|MILLISECONDS|msValue|<audio|community\.js|analytics|iframe/);
 assert.doesNotMatch(js,/localStorage|fetch\(|Audio\(|eval\(/);
 assert.match(js,/tfw:overlay-settings/);
 assert.match(js,/tfw:overlay-demo/);
 assert.match(js,/Date\.now\(\)/);
 assert.match(css,/background:transparent!important/);
 assert.match(css,/width:460px;height:184px/);
 assert.match(css,/pointer-events:none/);
});
test('Protected creator uses the site header/footer, timezone dialog and live drag handles',()=>{
 const page=read('streamer-overlay.html'),js=read('js/streamer-overlay-builder.js'),
 auth=read('js/streamer-overlay-auth.js'),settings=read('settings.html');
 assert.match(page,/class="topbar article-topbar tfw-secondary-topbar"/);
 assert.match(page,/class="legal-copy"/);
 assert.match(page,/id="timezoneModal"/);
 assert.match(page,/id="builderPreview"/);
 assert.match(page,/id="builderDragBox"/);
 assert.match(page,/data-corner="nw"/);
 assert.match(page,/data-corner="se"/);
 assert.match(page,/id="overlayDemo"/);
 assert.doesNotMatch(page,/overlayMs|No account required|THE FINAL WAIT · CREATOR TOOLS|Each link includes only/);
 assert.match(js,/setPointerCapture/);
 assert.match(js,/tfw:overlay-demo/);
 assert.match(auth,/client\.auth\.getSession\(\)/);
 assert.match(auth,/client\.auth\.getUser\(\)/);
 assert.match(auth,/data\.profile\?\.nickname/);
 assert.match(auth,/data\.profile\.terms_version!==config\.termsVersion/);
 assert.match(settings,/href="streamer-overlay\.html"/);
});
