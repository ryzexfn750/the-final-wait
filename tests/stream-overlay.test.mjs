import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {bundleOverlayHtml} from '../js/stream-overlay-export.js';
import {DEFAULTS,isValidZone,normalizeOptions,parseOptions,buildOverlayUrl,
 releaseInstant,remaining,waitProgress,WAIT_START,overlayGeometry,CANVAS,formatWaitPercent} from '../js/stream-overlay-core.js';
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
  tz:'Asia/Tokyo',theme:'neon',position:'top-right',size:'small',progress:false,x:38,y:920,w:420
 });
 const url=buildOverlayUrl('https://thefinalwait.com/streamer-overlay.html',parseOptions('?theme=minimal&ms=1'));
 assert.equal(new URL(url).pathname,'/stream-overlay.html');
 assert.equal(new URL(url).searchParams.has('ms'),false);
 assert.equal(new URL(url).searchParams.get('v'),'4');
 assert.equal(new URL(url).searchParams.has('brand'),false);
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
 assert.match(page,/class="stream-domain">thefinalwait\.com<\/span>/);
 assert.match(page,/ROAD TO LEONIDA/);
 assert.doesNotMatch(page,/ryze-gtavi-logo|id="streamBrand"|<img|stream-live/);
 assert.doesNotMatch(js,/config\.brand|logo\.hidden/);
 assert.match(page,/id="streamCelebration"/);
 assert.match(css,/stream-orbit-a|stream-cube-rotate|stream-hud-levitate|stream-title-unfold/);
 assert.match(page,/stream-cube/);
 assert.match(page,/stream-orbit-a/);
 assert.match(page,/stream-orbit-b/);
 assert.match(page,/stream-orbit-c/);
 assert.match(page,/stream-face front/);
 assert.match(css,/font:900 14px\/1/);
 assert.doesNotMatch(css,/streamWhiteFlash|stream-final-one[^}]*:after/);
 assert.doesNotMatch(page,/streamMs|MILLISECONDS|msValue|<audio|community\.js|analytics|iframe/);
 assert.doesNotMatch(js,/localStorage|fetch\(|Audio\(|eval\(/);
 assert.match(js,/tfw:overlay-settings/);
 assert.match(js,/tfw:overlay-demo/);
 assert.match(js,/Date\.now\(\)/);
 assert.match(js,/formatWaitPercent\(target,simulatedTime\)/);
 assert.match(css,/background:transparent!important/);
 assert.match(css,/width:420px;height:120px/);
 assert.match(css,/pointer-events:none/);
});
test('Protected creator uses the site header/footer, timezone dialog and live drag handles',()=>{
 const page=read('streamer-overlay.html'),js=read('js/streamer-overlay-builder.js'),
 auth=read('js/streamer-overlay-auth.js'),settings=read('settings.html');
 assert.match(page,/class="topbar article-topbar tfw-secondary-topbar"/);
 assert.match(page,/class="legal-copy"/);
 assert.match(page,/id="timezoneModal"/);
 assert.match(page,/id="builderPreview"/);
 assert.match(page,/js\/streamer-overlay-auth\.js\?v=5/);
 assert.match(page,/id="builderDragBox"/);
 assert.match(page,/data-corner="nw"/);
 assert.match(page,/data-corner="se"/);
 assert.match(page,/id="overlayDemo"/);
 assert.doesNotMatch(page,/Show RyzeGTAVI logo|id="overlayBrand"/);
 assert.match(page,/id="overlayDownload"/);
 assert.match(page,/id="overlayCode"/);
 assert.match(page,/Local file/);
 assert.doesNotMatch(page,/↻ REPLAY LAST 5 SECONDS/);
 assert.doesNotMatch(page,/Custom · drag to move|Custom · drag a corner|Preview the release moment without changing the real countdown/);
 assert.doesNotMatch(js,/PREVIEW MODE — THE REAL STREAM COUNTDOWN IS UNAFFECTED/);
 assert.match(read('css/streamer-overlay-builder.css'),/#timezoneModal\{z-index:2147482800\}/);
 assert.doesNotMatch(settings,/tfw-settings-feature-chips|LIVE PREVIEW<\/span><span>TRANSPARENT/);
 assert.doesNotMatch(page,/overlayMs|No account required|THE FINAL WAIT · CREATOR TOOLS|Each link includes only/);
 assert.match(js,/setPointerCapture/);
 assert.match(js,/tfw:overlay-demo/);
 assert.match(auth,/client\.auth\.getSession\(\)/);
 assert.match(auth,/client\.auth\.getUser\(\)/);
 assert.match(auth,/data\.profile\?\.nickname/);
 assert.match(auth,/data\.profile\.terms_version!==config\.termsVersion/);
 assert.match(settings,/href="streamer-overlay\.html"/);
});

test('Final-five-seconds progress preserves sub-second accuracy and never prints 100 early',()=>{
 const epoch=releaseInstant('Europe/Rome');
 const five=formatWaitPercent(epoch,epoch-5000);
 const three=formatWaitPercent(epoch,epoch-3000);
 const one=formatWaitPercent(epoch,epoch-1000);
 assert.match(five,/^99\.\d{8}%$/);
 assert.notEqual(five,three);
 assert.notEqual(three,one);
 assert.notEqual(one,'100.00000000%');
 assert.notEqual(formatWaitPercent(epoch,epoch-1),'100.00000000%');
 assert.equal(formatWaitPercent(epoch,epoch),'100.00%');
});
test('All presets use the redesigned compact footprint and stay in canvas bounds',()=>{
 assert.deepEqual([CANVAS.widgetWidth,CANVAS.widgetHeight],[420,120]);
 const regular=overlayGeometry({size:'medium',position:'bottom-left'});
 assert.deepEqual({w:regular.w,h:regular.h},{w:420,h:120});
 for(const position of ['top-left','top-right','bottom-left','bottom-right','bottom-center','custom']){
  for(const size of ['small','medium','large','custom']){
   const g=overlayGeometry({position,size,x:1143,y:980,w:680});
   assert.ok(g.x>=0&&g.y>=0&&g.x+g.w<=1920&&g.y+g.h<=1080,position+' '+size);
  }
 }
});

test('Standalone OBS download embeds current configuration, scripts, CSS, and no Cloudflare URLs',()=>{
 const inputs={template:read('stream-overlay.html'),css:read('css/stream-overlay.css'),
  core:read('js/stream-overlay-core.js'),runner:read('js/stream-overlay.js')};
 const first=bundleOverlayHtml({...inputs,options:{tz:'Europe/Rome',theme:'neon',position:'custom',size:'custom',x:600,y:400,w:640}});
 const second=bundleOverlayHtml({...inputs,options:{tz:'Asia/Tokyo',theme:'minimal',position:'bottom-right',size:'small'}});
 assert.notEqual(first,second,'Changing settings must regenerate the exported source');
 assert.match(first,/<style>/);
 assert.match(first,/<script>/);
 assert.match(first,/let config=normalizeOptions\(\{"tz":"Europe\/Rome","theme":"neon"/);
 assert.match(first,/"x":600,"y":400,"w":640/);
 assert.match(second,/"tz":"Asia\/Tokyo","theme":"minimal"/);
 assert.doesNotMatch(first,/src="(?:js\/|assets\/)|href="css\/|<script type="module"|cloudflare|ryze-gtavi-logo/i);
 assert.match(first,/ROAD TO LEONIDA/);
 assert.match(first,/stream-orbit-a/);
 assert.match(first,/stream-cube-rotate/);
 assert.match(first,/stream-title-unfold/);
 assert.match(first,/thefinalwait\.com/);
 const inline=first.match(/<script>\n([\s\S]*?)\n<\/script>/);
 assert.ok(inline,'Export should contain a standalone inline script');
 assert.doesNotThrow(()=>new Script(inline[1]),'Bundled script must compile without module imports');
 const editor=read('js/streamer-overlay-builder.js');
 assert.match(editor,/refs\.code\.value=bundleOverlayHtml/);
 assert.match(editor,/refs\.download\.addEventListener\('click'/);
 assert.match(editor,/URL\.createObjectURL/);
});

test('Visual choreography preserves 3D transform stages without full-screen flashes',()=>{
 const css=read('css/stream-overlay.css'),html=read('stream-overlay.html'),
  runner=read('js/stream-overlay.js'),builder=read('js/streamer-overlay-builder.js');
 assert.match(css,/transform-style:preserve-3d/);
 assert.match(css,/transform:rotateY\(90deg\) translateZ\(13px\)/);
 assert.match(css,/animation:stream-orbit-a 8s linear infinite/);
 assert.match(css,/animation:stream-cube-rotate 8s linear infinite/);
 assert.match(css,/stream-title-unfold/);
 assert.match(css,/stream-prism-shards/);
 assert.match(css,/stream-digit-turn/);
 assert.match(runner,/stream-number-swap/);
 assert.match(runner,/stream-final-five/);
 assert.match(runner,/stream-final-one/);
 assert.match(html,/class="stream-subtitle">ROAD TO LEONIDA/);
 assert.doesNotMatch(html,/stream-vfx-scan|stream-vfx-shimmer|stream-release-halo/);
 assert.doesNotMatch(css,/streamWhiteFlash|stream-final-one\s+\.stream-widget:after/);
 assert.match(builder,/stream-overlay\.html\?v=5/);
 assert.match(builder,/js\/stream-overlay\.js\?v=5/);
});
