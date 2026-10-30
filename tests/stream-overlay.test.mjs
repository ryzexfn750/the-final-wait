import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULTS,isValidZone,normalizeOptions,parseOptions,buildOverlayUrl,
 releaseInstant,remaining,waitProgress,WAIT_START} from '../js/stream-overlay-core.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Overlay midnight matches main countdown in representative time zones',()=>{
 const expected={
  'Europe/Rome':'2026-11-18T23:00:00.000Z',
  'Europe/London':'2026-11-19T00:00:00.000Z',
  'Asia/Tokyo':'2026-11-18T15:00:00.000Z',
  'America/Los_Angeles':'2026-11-19T08:00:00.000Z',
  'Pacific/Auckland':'2026-11-18T11:00:00.000Z',
  'Asia/Kolkata':'2026-11-18T18:30:00.000Z'
 };
 for(const [zone,iso] of Object.entries(expected))assert.equal(new Date(releaseInstant(zone)).toISOString(),iso,zone);
 assert.equal(releaseInstant('not-a-real-zone'),releaseInstant(DEFAULTS.tz));
});
test('Query params use safe enum options and reject malicious or invalid zones',()=>{
 assert.equal(isValidZone('<img onerror=alert(1)>'),false);
 assert.equal(normalizeOptions({theme:'evil',position:'elsewhere',size:'xxl',tz:'../../etc/passwd'}).tz,'Europe/Rome');
 assert.deepEqual(parseOptions('?theme=neon&position=top-right&size=small&tz=Asia%2FTokyo&brand=0&progress=0&ms=1'),{
  tz:'Asia/Tokyo',theme:'neon',position:'top-right',size:'small',brand:false,progress:false,ms:true
 });
 const url=buildOverlayUrl('https://thefinalwait.com/streamer-overlay.html',parseOptions('?theme=minimal&ms=1'));
 assert.equal(new URL(url).pathname,'/stream-overlay.html');
 assert.equal(parseOptions(new URL(url).search).theme,'minimal');
 const nested=buildOverlayUrl('https://example.com/the-final-wait/streamer-overlay.html',{tz:'Europe/Rome'});
 assert.equal(new URL(nested).pathname,'/the-final-wait/stream-overlay.html');
});
test('Absolute clock is clamped and the waiting progress is bounded',()=>{
 const epoch=releaseInstant('Europe/Rome');
 assert.deepEqual(remaining(epoch,epoch+1200),{
  total:0,days:0,hours:0,minutes:0,seconds:0,milliseconds:0,released:true
 });
 assert.equal(remaining(epoch,epoch-86400999).days,1);
 assert.equal(waitProgress(epoch,WAIT_START-10000),0);
 assert.equal(waitProgress(epoch,epoch+10000),1);
});
test('OBS output is transparent, isolated and cannot start audio or tracking',()=>{
 const page=read('stream-overlay.html'),script=read('js/stream-overlay.js'),css=read('css/stream-overlay.css');
 assert.match(page,/meta name="robots" content="noindex,nofollow"/);
 assert.match(css,/background:transparent!important/);
 assert.match(css,/pointer-events:none/);
 assert.doesNotMatch(page,/community\.js|clock\.js|audio-controls|analytics|<audio|iframe/);
 assert.doesNotMatch(script,/Audio\(|fetch\(|localStorage|eval\(/);
 assert.match(script,/Date\.now\(\)/);
 assert.match(script,/visibilitychange/);
});
test('Builder exposes OBS instructions, previews and links from site',()=>{
 const builder=read('streamer-overlay.html');
 const index=read('index.html');
 for(const path of ['css/streamer-overlay-builder.css','js/streamer-overlay-builder.js',
  'css/stream-overlay.css','js/stream-overlay.js','js/stream-overlay-core.js']){
  assert.ok(read(path).length>0,path);
 }
 assert.match(builder,/1920 × 1080/);
 assert.match(builder,/Browser Source/);
 assert.match(builder,/overlayCopy/);
 assert.match(read('settings.html'),/href="streamer-overlay\.html"/);
 assert.match(index,/js\/community-header\.js/);
});
