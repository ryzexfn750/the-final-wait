import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('All site routes retain stable assets and support 14 languages',()=>{
 const home=read('index.html');
 for(const asset of ['js/clock.js?v=49','js/milestones.js?v=52',
   'js/reviewed-i18n.js?v=12','js/language.js?v=54','js/final-call-locales.js?v=49',
   'js/seamless-navigation.js?v=60','js/inpage-scroll.js?v=48',
   'css/site-polish.css?v=56']){
    assert.ok(home.includes(asset),asset);
 }
 const language=read('js/language.js');
 const locales=read('js/final-call-locales.js');
 assert.match(language,/languages:\['en','fr','es','de','it','pt','ru','pl','ja','tr','nl','ko','zh-CN','ar'\]/);
 assert.match(language,/ru:\['RU'/);
 assert.doesNotMatch(locales,/"ru"\s*:/);
 for(const page of ['today.html','timeline.html','intel.html','intel-archive.html']){
   const html=read(page);
   assert.ok(html.includes('js/language.js?v=54'),page);
   assert.ok(html.includes('js/secondary-controls.js?v=49'),page);
   assert.ok(html.includes('css/site-polish.css?v=56'),page);
 }
});

test('Full fan disclaimer appears in archive and article footers',()=>{
 const disclaimer='This is not an official Rockstar Games project. Grand Theft Auto, Grand Theft Auto VI, Rockstar Games, related trademarks, names and official imagery belong to their respective owners. This fan-made website is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.';
 for(const page of ['index.html','intel-archive.html','today.html','timeline.html','intel.html']){
   const html=read(page);
   assert.ok(html.includes(disclaimer),page+' full disclaimer');
 }
 assert.doesNotMatch(read('intel-archive.html'),/UNOFFICIAL FAN PROJECT · ROCKSTAR GAMES OWNS THE ORIGINAL MATERIAL/);
});

test('Share has larger Ryze logo and removes hairline beneath the final banner',()=>{
 const css=read('css/site-polish.css');
 assert.match(css,/#shareModal \.tfw-share-brand\{\s*width:clamp\(150px,17vw,192px\)!important/);
 assert.match(css,/body\.home-page>footer\{\s*border-top:0!important/);
 assert.match(css,/body\.home-page #share \.share-backdrop:after\{\s*display:none!important/);
 assert.match(read('css/secondary-controls.css'),/#tfwSecondaryShareModal \.tfw-share-brand\{/);
});

test('Scrollbar thumb is inside page so it inherits custom mouse pointer',()=>{
 const script=read('js/inpage-scroll.js'),css=read('css/site-polish.css');
 assert.match(script,/getElementById\('timezoneList'\)/);
 assert.match(script,/setPointerCapture\(event\.pointerId\)/);
 assert.match(script,/list\.scrollTop=dragScroll/);
 assert.match(script,/className='tfw-inpage-scrollbar'/);
 assert.match(css,/html\.tfw-global-cursor-ready \.timezone-list/);
 assert.match(css,/\.tfw-inpage-scrollbar-thumb/);
 assert.ok(read('index.html').includes('js/inpage-scroll.js?v=48'));
});

test('Soundtrack is persistent, does not periodically jump, and the home visualizer receives external music',()=>{
 const clock=read('js/clock.js'),secondary=read('js/secondary-controls.js');
 const finale=read('js/milestones.js'),navigation=read('js/seamless-navigation.js');
 assert.match(clock,/BG_RESUME_KEY='tfw_ambient_resume_v48'/);
 assert.match(clock,/function restoreBgPosition\(\)/);
 assert.match(clock,/sessionStorage\.setItem\(BG_RESUME_KEY,snapshot\)/);
 assert.match(clock,/localStorage\.setItem\(BG_RESUME_KEY,snapshot\)/);
 const resync=clock.slice(clock.indexOf('function resyncBackground(){'),clock.indexOf('function armAudioGesture()',clock.indexOf('function resyncBackground(){')));
 assert.doesNotMatch(resync,/currentTime\s*=/);
 assert.match(secondary,/if\(current\.id!=='ambient'\)seek\(current\.at\)/);
 assert.match(secondary,/__tfwExternalVisualizerSpectrum/);
 assert.match(secondary,/captureStream/);
 assert.match(finale,/external\?\.playing/);
 assert.match(finale,/ambientMusicSource=musicCtx\.createMediaStreamSource\(stream\)/);
 assert.doesNotMatch(finale,/createMediaElementSource\(ambient\)/);
 assert.match(finale,/tfw:seamless-return/);
 assert.match(navigation,/tfw:seamless-return/);
 assert.match(navigation,/tfw:seamless-gesture/);
 assert.match(navigation,/path\.endsWith\('\/index\.html'\)/);
 assert.match(navigation,/normalize\(url\.pathname\)===normalize\(initial\.pathname\)/);
});
