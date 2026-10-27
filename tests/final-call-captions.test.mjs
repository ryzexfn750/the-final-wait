import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const script=readFileSync(new URL('../js/final-call-captions.js',import.meta.url),'utf8');

test('Final Call subtitles align with dialogue and support future locale packs',()=>{
 class Classes{
   constructor(){this.values=new Set()}
   add(...items){items.forEach(x=>this.values.add(x))}
   remove(...items){items.forEach(x=>this.values.delete(x))}
   toggle(x,on){if(on)this.values.add(x);else this.values.delete(x)}
 }
 class Element{
   constructor(){this.classList=new Classes();this.children=[];this.attrs={}}
   setAttribute(k,v){this.attrs[k]=v}
   removeAttribute(k){delete this.attrs[k]}
   appendChild(node){this.children.push(node);return node}
   replaceChildren(...nodes){this.children=nodes}
 }
 const hero=new Element(),sel={value:'en'};
 const handlers={};
 const document={
   documentElement:{lang:'en'},
   getElementById:id=>id==='hero'?hero:null,
   createElement:()=>new Element(),
   querySelector:q=>q==='.gtranslate_wrapper select'?sel:null
 };
 const window={addEventListener:(name,fn)=>{(handlers[name]??=[]).push(fn)}};
 runInNewContext(script,{document,window});
 const d=window.__tfwCallCaptionDebug;
 assert.equal(d.cues.length,17);
 for(const [time,id] of [
   [384051,null],[384050,'ringing'],[379230,'connect'],
   [378240,'michael-1'],[367910,'franklin-1'],
   [359320,'trevor-1'],[350220,'michael-2'],
   [347500,'trevor-2'],[339220,'franklin-2'],
   [332030,'michael-3'],[330310,'trevor-3'],
   [325270,'laughter'],[323150,'franklin-3'],
   [319480,'michael-4'],[317400,'trevor-4'],
   [314220,null],[313350,'michael-5'],
   [311360,'franklin-4'],[309210,'disconnect'],
   [307421,'disconnect'],[307420,null]
 ]){
   d.sync(time);assert.equal(d.activeId(),id,'Time '+time+'ms');
 }
 for(const c of d.cues){
   assert.ok(c.start>c.end,c.id);
   assert.ok(d.plan(c.en).chunks.every(x=>x.to-x.from+1<=9),c.id);
 }
 sel.value='en|it';
 d.sync(384050);
 assert.equal(d.currentText(),'Phone ringing');
 window.__tfwFinalCallTranslations.it={ringing:'Telefono che squilla'};
 d.sync(384010);
 assert.equal(d.currentText(),'Telefono che squilla');
 assert.equal(d.currentLanguage(),'it');
 d.sync(307420);
 assert.equal(hero.attrs['data-tfw-caption'],undefined);
});
