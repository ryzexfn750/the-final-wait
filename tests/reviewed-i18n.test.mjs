import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('js/reviewed-i18n.js');
const keys=JSON.parse(source.match(/const english=(\[[^\n]+\]);/)[1]);
const locales=JSON.parse(source.match(/const data=(\{[^\n]+\});/)[1]);
const supported=['it','fr','es','de','pt','ru','pl','ja','tr','nl','ko','zh-CN','ar'];
test('All thirteen translated catalogues have exactly one reviewed entry per English source',()=>{
 assert.equal(keys.length,72);
 assert.equal(new Set(keys).size,keys.length);
 assert.deepEqual(Object.keys(locales).sort(),supported.sort());
 for(const [locale,values] of Object.entries(locales)){
  assert.equal(values.length,keys.length,locale);
  assert.ok(values.every(v=>typeof v==='string'&&v.trim()),locale);
 }
});
test('Reviewed UI copy translates real text nodes without modifying the DOM structure',()=>{
 const parents=Array.from({length:3},()=>({
  childElementCount:0,attrs:{},dataset:{},classList:{add(){}},
  getAttribute(k){return this.attrs[k]||null},
  setAttribute(k,v){this.attrs[k]=v},
  closest(){return false}
 }));
 const nodes=['HOME','DAYS','support@thefinalwait.com'].map((value,i)=>({
  nodeValue:value,parentElement:parents[i]
 }));
 const document={
  body:{},head:{appendChild(){}},readyState:'loading',
  title:'The Final Wait',createElement(){return{}},querySelectorAll(){return[]},querySelector(){return null},getElementById(){return null},
  addEventListener(){},
  createTreeWalker(){let i=0;return{nextNode:()=>nodes[i++]||null}}
 };
 const window={addEventListener(){}};
 runInNewContext(source,{document,window,location:{pathname:'/index.html'},NodeFilter:{SHOW_TEXT:4},Promise});
 const apply=window.__tfwReviewedI18nApply;
 apply('it');
 assert.equal(nodes[0].nodeValue,'HOME'); // official navigation stays an idiomatic Home label
 assert.equal(nodes[1].nodeValue,'GIORNI');
 assert.equal(nodes[2].nodeValue,'support@thefinalwait.com');
 assert.equal(parents[1].attrs.translate,'no','prevent double-translation by GTranslate');
 apply('fr');
 assert.equal(nodes[0].nodeValue,'ACCUEIL');
 assert.equal(nodes[1].nodeValue,'JOURS');
 apply('ar');
 assert.equal(nodes[1].nodeValue,'الأيام');
 apply('en');
 assert.equal(nodes[0].nodeValue,'HOME');
 assert.equal(nodes[1].nodeValue,'DAYS');
 assert.equal(nodes.length,3,'no extra markup or wrappers introduced');
});
test('All translated routes load curated copy before GTranslate language control',()=>{
 for(const path of ['index.html','today.html','timeline.html','intel.html','intel-archive.html',
  'profile.html','settings.html','support.html','newsletter.html','global-wave.html',
  'streamer-overlay.html','ticket.html']){
  const html=read(path);
  const reviewed=html.indexOf('js/reviewed-i18n.js?v=10');
  const language=html.indexOf('js/language.js?v=54');
  assert.ok(reviewed>=0&&language>reviewed,path);
 }
 assert.match(read('js/language.js'),/window\.__tfwReviewedI18nApply\?\.\(current\)/);
 assert.match(source,/parent\.setAttribute\('translate','no'\)/);
});
