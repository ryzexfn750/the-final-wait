import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const pages=['index','today','timeline','intel','intel-archive','global-wave',
 'streamer-overlay','profile','settings','support','newsletter','ticket'];
test('Branding is opted out of translation before the GTranslate widget starts',()=>{
 for(const page of pages){
  const html=read(page+'.html');
  const guard=html.indexOf('js/brand-protection.js?v=3');
  const i18n=html.indexOf('js/reviewed-i18n.js?v=20');
  const language=html.indexOf('js/language.js?v=54');
  assert.ok(guard>=0&&i18n>guard&&language>i18n,page);
  assert.match(html,/<title[^>]*translate="no"/,page);
  assert.match(html,/class="brand-copy notranslate"[^>]*translate="no"/,page);
  assert.match(html,/class="footer-brand notranslate"[^>]*translate="no"/,page);
 }
 const home=read('index.html');
 assert.match(home,/id="heroTitle"[^>]*translate="no">ROAD TO LEONIDA/);
 assert.match(home,/THE END OF AN ERA\.<\/h2>/);
 const review=read('js/reviewed-i18n.js');
 assert.match(review,/fixedBrand=new Set/);
 assert.doesNotMatch(review,/'index.html':'THE ROAD TO LEONIDA'/);
 for(const source of ['js/community.js','js/milestones.js','js/seamless-navigation.js',
  'js/ticket-reveal.js'])
  assert.match(read(source),/notranslate[^<>]*translate="no"[^<>]*>THE FINAL WAIT/);
});
test('Early brand guard protects dynamic brand text and releases phase labels',()=>{
 let callback;
 class MutationObserver {
  constructor(cb){callback=cb}
  observe(element,options){assert.ok(element);assert.equal(options.subtree,true)}
 }
 const createElement=text=>{
  const values=new Set(),attributes=new Map();
  return {
   nodeType:1,textContent:text,dataset:{},
   classList:{add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v)},
   closest(){return null},matches(){return false},querySelectorAll(){return[]},
   setAttribute:(k,v)=>attributes.set(k,v),getAttribute:k=>attributes.get(k)||null,
   removeAttribute:k=>attributes.delete(k),
   attrs:attributes,classes:values
  };
 };
 const head=createElement(''),child=createElement('THE FINAL WAIT');
 const document={
  documentElement:head,body:null,
  addEventListener(){},
  createTreeWalker(){return{nextNode(){return null}}}
 };
 runInNewContext(read('js/brand-protection.js'),{
  document,window:{},MutationObserver,NodeFilter:{SHOW_TEXT:4}
 });
 callback([{type:'childList',addedNodes:[child]}]);
 assert.equal(child.attrs.get('translate'),'no');
 assert.ok(child.classes.has('notranslate'));
 child.textContent='THE FINAL MINUTE';
 callback([{type:'characterData',target:{parentElement:child}}]);
 assert.equal(child.attrs.has('translate'),false);
 assert.equal(child.classes.has('notranslate'),false);
});
