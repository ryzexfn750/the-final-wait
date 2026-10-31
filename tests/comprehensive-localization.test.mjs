import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const langs=['it','fr','es','de','pt','ru','pl','ja','tr','nl','ko','zh-CN','ar'];
const files=[
 ['js/home-timeline-locales.js','__tfwHomeTimelineEnglish','__tfwHomeTimelineLocales',23],
 ['js/remaining-ui-locales.js','__tfwRemainingUiEnglish','__tfwRemainingUiLocales',81],
 ['js/long-interaction-locales.js','__tfwLongInteractionEnglish','__tfwLongInteractionLocales',19],
 ['js/status-ui-locales.js','__tfwStatusUiEnglish','__tfwStatusUiLocales',56],
 ['js/editorial-metadata-locales.js','__tfwEditorialMetadataEnglish','__tfwEditorialMetadataLocales',52],
 ['js/additional-ui-locales.js','__tfwAdditionalUiEnglish','__tfwAdditionalUiLocales',240],
 ['js/today-locales.js','__tfwTodaySource','__tfwTodayLocales',26],
 ['js/source-reference-locales.js','__tfwSourceReferenceEnglish','__tfwSourceReferenceLocales',57]
];
test('All 13 languages have complete non-empty reviewed catalogues',()=>{
 for(const [file,key,translations,total] of files){
  const ctx={window:{}};
  runInNewContext(read(file),ctx,{filename:file});
  const eng=ctx.window[key],out=ctx.window[translations];
  assert.equal(eng.length,total,file);
  assert.deepEqual(Object.keys(out).sort(),langs.slice().sort(),file);
  assert.equal(new Set(eng).size,eng.length,file+' duplicate source keys');
  for(const language of langs){
   assert.equal(out[language].length,eng.length,file+' '+language);
   assert.ok(out[language].every(v=>typeof v==='string'&&v.trim()),file+' '+language);
  }
 }
});
test('Home article descriptions and translation packages load before the language selector',()=>{
 const config=read('js/config.js');
 const source=JSON.parse(config.match(/export const TIMELINE = (\[[\s\S]*?\]);/)[1]);
 const home={window:{}};
 runInNewContext(read('js/home-timeline-locales.js'),home);
 assert.deepEqual([...home.window.__tfwHomeTimelineEnglish],source.map(x=>x.text));
 const html=read('index.html');
 const refs=['js/today-locales.js?v=2','js/home-timeline-locales.js?v=1',
  'js/reviewed-i18n.js?v=20','js/language.js?v=54'].map(x=>html.indexOf(x));
 assert.ok(refs.every((v,i)=>v>=0&&(!i||v>refs[i-1])));
 for(const page of ['index','today','timeline','intel','intel-archive','global-wave',
  'streamer-overlay','profile','settings','support','newsletter','ticket'])
  assert.ok(read(page+'.html').includes('js/reviewed-i18n.js?v=20'),page);
});
test('Reviewed engine translates variable labels, long notices and changes language reversibly',()=>{
 const scripts=[],textSources=['SOURCE ↗','READ STORY','Send 🔥','OF 38 TIME ZONES',
  'AUTO ROTATE: ON','PLAYING THE 26-HOUR WAVE — 19 Nov 2026 UTC',
  'OCTOBER 5, 2026','MASTER VOLUME','TIME SINCE GTA VI RELEASE',
  'May Google Analytics use optional cookies to measure visits? This is independent of your account and newsletter preferences.'];
 const parent=()=>({childElementCount:0,dataset:{},classList:{add(){},remove(){}},
  setAttribute(){},removeAttribute(){},getAttribute(){return null},closest(){return null}});
 const nodes=textSources.map(nodeValue=>({nodeValue,parentElement:parent()}));
 const document={body:{},title:'The Final Wait',readyState:'loading',
  head:{appendChild(script){scripts.push(script)}},
  createElement(){return{}},addEventListener(){},
  createTreeWalker(){let i=0;return{nextNode(){return nodes[i++]||null}}},
  querySelectorAll(){return[]},querySelector(){return null},getElementById(){return null}};
 const window={addEventListener(){}};
 const ctx={window,document,location:{pathname:'/index.html'},NodeFilter:{SHOW_TEXT:4},Promise};
 for(const p of ['js/today-locales.js','js/home-timeline-locales.js'])runInNewContext(read(p),ctx);
 runInNewContext(read('js/reviewed-i18n.js'),ctx);
 for(const script of scripts){
  runInNewContext(read(script.src.split('?')[0]),ctx);
  script.onload();
 }
 window.__tfwReviewedI18nApply('es');
 assert.equal(nodes[0].nodeValue,'FUENTE ↗');
 assert.equal(nodes[2].nodeValue,'Enviar 🔥');
 assert.equal(nodes[4].nodeValue,'ROTACIÓN AUTOMÁTICA: ACTIVADA');
 assert.equal(nodes[7].nodeValue,'VOLUMEN GENERAL');
 assert.notEqual(nodes[9].nodeValue,textSources[9]);
 window.__tfwReviewedI18nApply('ar');
 assert.equal(nodes[0].nodeValue,'المصدر ↗');
 window.__tfwReviewedI18nApply('en');
 assert.deepEqual(nodes.map(x=>x.nodeValue),textSources);
});
