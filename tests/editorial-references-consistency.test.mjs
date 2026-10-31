import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const lang=['it','fr','es','de','pt','ru','pl','ja','tr','nl','ko','zh-CN','ar'];
function literal(text,name){
 const at=text.indexOf(name);assert.ok(at>=0,name);
 let i=text.indexOf('=',at)+1;while(!'[{'.includes(text[i]))i++;
 const start=i;let depth=0,quote='',escape=false;
 for(;i<text.length;i++){
  const c=text[i];
  if(quote){if(escape)escape=false;else if(c==='\\')escape=true;else if(c===quote)quote='';continue}
  if(c==='"'||c==="'"){quote=c;continue}
  if(c==='['||c==='{')depth++;
  if(c===']'||c==='}')if(!--depth)return JSON.parse(text.slice(start,i+1));
 }
 throw Error('Unterminated '+name);
}
const packs=[
 ['js/reviewed-i18n.js','const english=','const data='],
 ['js/reviewed-i18n.js','const extraEnglish=','const extraLocales='],
 ['js/reviewed-i18n.js','const longEnglish=','const longLocales='],
 ['js/reviewed-i18n.js','const archiveUiEnglish=','const archiveUiLocales='],
 ['js/additional-ui-locales.js','window.__tfwAdditionalUiEnglish=','window.__tfwAdditionalUiLocales='],
 ['js/remaining-ui-locales.js','window.__tfwRemainingUiEnglish=','window.__tfwRemainingUiLocales='],
 ['js/long-interaction-locales.js','window.__tfwLongInteractionEnglish=','window.__tfwLongInteractionLocales='],
 ['js/status-ui-locales.js','window.__tfwStatusUiEnglish=','window.__tfwStatusUiLocales='],
 ['js/source-reference-locales.js','window.__tfwSourceReferenceEnglish=','window.__tfwSourceReferenceLocales=']
];
test('Every article reference has 13 reviewed labels preserving publication names',()=>{
 const labels=[];
 for(const p of ['content/intel.json','content/timeline.json','content/today.json']){
  const data=JSON.parse(read(p));
  for(const a of (Array.isArray(data)?data:[data]))
   for(const b of (a.blocks||[]))
    if(b.type==='sources')for(const item of (b.items||[]))labels.push(item.label);
 }
 const unique=[...new Set(labels)],context={window:{}};
 runInNewContext(read('js/source-reference-locales.js'),context);
 const english=Array.from(context.window.__tfwSourceReferenceEnglish);
 const translations=context.window.__tfwSourceReferenceLocales;
 assert.equal(english.length,57);
 assert.deepEqual(english,unique);
 assert.deepEqual(Object.keys(translations).sort(),lang.slice().sort());
 for(const l of lang){
  assert.equal(translations[l].length,57,l);
  let changed=0;
  english.forEach((key,i)=>{
   const translated=translations[l][i];
   assert.ok(translated?.trim(),l+' '+i);
   assert.equal(translated.split(' — ')[0],key.split(' — ')[0],l+' '+key);
   if(translated!==key)changed++;
  });
  assert.ok(changed>=45,l+' translated only '+changed+' references');
 }
});
test('Repeated source labels have identical translations in all dictionaries',()=>{
 const seen=new Map();
 for(const [file,k,t] of packs){
  const content=read(file),keys=literal(content,k),locales=literal(content,t);
  assert.equal(new Set(keys).size,keys.length,file);
  assert.deepEqual(Object.keys(locales).sort(),lang.slice().sort(),file);
  for(const l of lang){
   assert.equal(locales[l].length,keys.length,file+' '+l);
   keys.forEach((key,i)=>{
    const translated=locales[l][i],id=l+'|'+key;
    assert.ok(translated?.trim(),id);
    if(seen.has(id))assert.equal(translated,seen.get(id),'Conflict: '+file+' '+id);
    seen.set(id,translated);
   });
  }
 }
});
test('Source references are ready before the locale engine and GTranslate',()=>{
 for(const page of ['index','today','timeline','intel']){
  const html=read(page+'.html');
  const s=html.indexOf('js/source-reference-locales.js?v=1');
  const r=html.indexOf('js/reviewed-i18n.js?v=20');
  const l=html.indexOf('js/language.js?v=54');
  assert.ok(s>=0&&r>s&&l>r,page);
 }
});
test('Reference captions and status strings switch in all locales without altering branding',()=>{
 const win={},ctx={window:win};
 runInNewContext(read('js/source-reference-locales.js'),ctx);
 const labels=Array.from(win.__tfwSourceReferenceEnglish),source=[labels[0],labels[18],labels[56],
  'THE FINAL WAIT','ROAD TO LEONIDA','THE FINAL MONTH'];
 const fixed=new Set(['THE FINAL WAIT','ROAD TO LEONIDA']);
 const nodes=source.map(v=>({nodeValue:v,parentElement:{
  childElementCount:0,dataset:fixed.has(v)?{tfwFixedBrand:'1'}:{},
  closest(q){return fixed.has(v)&&q.includes('data-tfw-fixed-brand')?this:null},
  classList:{add(){},remove(){}},setAttribute(){},removeAttribute(){},getAttribute(){return null}
 }}));
 const loaded=[];
 const doc={body:{},readyState:'loading',title:'The Final Wait',head:{appendChild(s){loaded.push(s)}},
  createElement(){return{}},addEventListener(){},createTreeWalker(){let i=0;return{nextNode(){return nodes[i++]||null}}},
  querySelectorAll(){return[]},getElementById(){return null},querySelector(){return null}};
 win.addEventListener=()=>{};
 const context={window:win,document:doc,location:{pathname:'/index.html'},NodeFilter:{SHOW_TEXT:4},Promise};
 runInNewContext(read('js/reviewed-i18n.js'),context);
 for(const script of loaded){runInNewContext(read(script.src.split('?')[0]),context);script.onload?.()}
 for(const l of lang){
  win.__tfwReviewedI18nApply(l);
  for(const i of [0,1,2])assert.equal(nodes[i].nodeValue,
   win.__tfwSourceReferenceLocales[l][labels.indexOf(source[i])],l+' source '+i);
  assert.equal(nodes[3].nodeValue,'THE FINAL WAIT');
  assert.equal(nodes[4].nodeValue,'ROAD TO LEONIDA');
  assert.notEqual(nodes[5].nodeValue,'THE FINAL MONTH');
 }
 win.__tfwReviewedI18nApply('en');
 assert.deepEqual(nodes.map(x=>x.nodeValue),source);
});
