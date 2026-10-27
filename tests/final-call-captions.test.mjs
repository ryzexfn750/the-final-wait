import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const captions=readFileSync(new URL('../js/final-call-captions.js',import.meta.url),'utf8');
const locales=readFileSync(new URL('../js/final-call-locales.js',import.meta.url),'utf8');

test('Final Call keeps its enlarged subtitle frame across cues, silent gaps and the restoration fade',()=>{
 class Classes{
   constructor(){this.s=new Set()}
   add(...keys){keys.forEach(k=>this.s.add(k))}
   remove(...keys){keys.forEach(k=>this.s.delete(k))}
   toggle(key,on){if(on)this.s.add(key);else this.s.delete(key)}
   contains(key){return this.s.has(key)}
 }
 class Element{
   constructor(){
     this.classList=new Classes();this.children=[];this.attrs={};this.textContent='';
     this.data={};this.style={
       setProperty:(k,v)=>this.data[k]=v,
       removeProperty:k=>delete this.data[k]
     };
   }
   setAttribute(k,v){this.attrs[k]=v}
   removeAttribute(k){delete this.attrs[k]}
   appendChild(node){this.children.push(node);return node}
   replaceChildren(...nodes){this.children=nodes}
 }
 const hero=new Element(),languageSelect={value:'en'};
 const handlers={};
 const document={
   documentElement:{lang:'en'},
   getElementById:id=>id==='hero'?hero:null,
   createElement:()=>new Element(),
   querySelector:query=>query==='.gtranslate_wrapper select'?languageSelect:null
 };
 const window={addEventListener:(name,fn)=>{(handlers[name]??=[]).push(fn)}};
 runInNewContext(locales,{window});
 runInNewContext(captions,{window,document});
 const debug=window.__tfwCallCaptionDebug;
 const root=hero.children[0];
 assert.equal(debug.cues.length,17);
 const timeline=[
   [384051,null,false],[384050,'ringing',true],
   [379230,'connect',true],[378240,'michael-1',true],
   [367910,'franklin-1',true],[359320,'trevor-1',true],
   [350220,'michael-2',true],[347500,'trevor-2',true],
   [339220,'franklin-2',true],[332030,'michael-3',true],
   [330310,'trevor-3',true],[325270,'laughter',true],
   [323150,'franklin-3',true],[319480,'michael-4',true],
   [317400,'trevor-4',true],
   [314220,'trevor-4',true], // silence: hold instead of flash
   [313800,'trevor-4',true],
   [313350,'michael-5',true],[311360,'franklin-4',true],
   [309210,'disconnect',true],
   [307420,'disconnect',true], // retain last line through outro
   [306500,'disconnect',true],
   [305250,'disconnect',true],
   [304001,'disconnect',true],[304000,null,false]
 ];
 for(const [remaining,id,visible] of timeline){
   debug.sync(remaining);
   assert.equal(debug.activeId(),id,'Subtitles at '+remaining);
   assert.equal(debug.isPanelVisible(),visible,'Panel at '+remaining);
   assert.equal(root.classList.contains('visible'),visible,'Root at '+remaining);
 }
 assert.equal(debug.opacity(384050),0);
 assert.ok(Math.abs(debug.opacity(383650)-.5)<.001);
 assert.equal(debug.opacity(383250),1);
 assert.equal(debug.opacity(306500),1);
 assert.ok(Math.abs(debug.opacity(305250)-.5)<.001);
 assert.equal(debug.opacity(304000),0);
 assert.equal(root.children.length,3,'One fixed heading and two content layers');

 for(const locale of ['fr','es','ru','de','it']){
   const pack=window.__tfwFinalCallTranslations[locale];
   assert.equal(Object.keys(pack).length,17,locale+' must include all lines');
   for(const cue of debug.cues){
     assert.ok(pack[cue.id],locale+' missing '+cue.id);
     assert.ok(debug.plan(pack[cue.id]).chunks.every(x=>x.to-x.from+1<=9),
       locale+' overly long subtitle chunk for '+cue.id);
   }
   languageSelect.value='en|'+locale;
   debug.sync(384049);
   assert.equal(debug.currentText(),pack.ringing);
   debug.sync(376000);
   assert.equal(debug.currentText(),pack['michael-1']);
   assert.equal(debug.currentLanguage(),locale);
 }
 languageSelect.value='en';
 debug.sync(384049);
 assert.equal(debug.currentText(),'Phone ringing');
 debug.sync(304000);
 assert.equal(hero.attrs['data-tfw-caption'],undefined);
});
