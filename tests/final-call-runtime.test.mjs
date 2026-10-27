import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const JS=readFileSync(new URL('../js/final-call.js',import.meta.url),'utf8');

test('Final Call advances across all 14 unique images and restores at exact thresholds', async()=>{
 class Classes{
   constructor(){this.values=new Set()}
   add(...keys){keys.forEach(k=>this.values.add(k))}
   remove(...keys){keys.forEach(k=>this.values.delete(k))}
   contains(key){return this.values.has(key)}
 }
 class Element{
   constructor(){this.classList=new Classes();this.data={};this.dataset={};this.style={setProperty:(k,v)=>this.data[k]=v,removeProperty:k=>delete this.data[k]}}
   setAttribute(){}removeAttribute(){}
 }
 const handlers=new Map();
 const on=(name,fn)=>handlers.set(name,[...(handlers.get(name)||[]),fn]);
 const send=(name,detail)=>{for(const fn of handlers.get(name)||[])fn({detail})};
 const hero=new Element();hero.insertBefore=()=>{};
 const body=new Element();
 const document={body,documentElement:new Element(),hidden:false,getElementById:id=>id==='hero'?hero:null,createElement:()=>new Element(),querySelector:()=>new Element(),addEventListener:on};
 class AudioMock{
   constructor(){this.paused=true;this.duration=1488.168;this.currentTime=0;this.readyState=0;this.listeners=new Map()}
   addEventListener(name,fn){this.listeners.set(name,fn)}
   load(){this.readyState=1;this.listeners.get('loadedmetadata')?.()}
   play(){this.paused=false;return Promise.resolve()}
   pause(){this.paused=true}
 }
 class ImageMock{set src(v){this.location=v;this.naturalWidth=960}decode(){return Promise.resolve()}}
 let tickTime=0,seed=60;
 const window={__tfwPreviewPlaying:true,crypto:{getRandomValues(a){a[0]=(seed++*1664525+1013904223)>>>0}},addEventListener:on,
   dispatchEvent:e=>send(e.type,e.detail)};
 runInNewContext(JS,{window,document,Image:ImageMock,Audio:AudioMock,matchMedia:()=>({matches:true}),localStorage:{getItem:()=> 'on'},
   performance:{now:()=>tickTime},console,Math,Uint32Array,Promise,Number,String,
   CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}}});
 const debug=window.__tfwFinalCallDebug;
 async function frame(remaining,preview=true){tickTime+=310;send('tfw:countdown',{remaining,preview});await Promise.resolve();await Promise.resolve();await Promise.resolve();}
 await frame(384051);assert.equal(body.classList.contains('tfw-final-call-active'),false);
 await frame(384050);assert.equal(body.classList.contains('tfw-final-call-active'),true);
 const permutation=debug.getOrder();
 assert.equal(permutation.length,14);assert.equal(new Set(permutation).size,14);
 const presented=new Set();
 for(let i=0;i<14;i++){
   await frame(384050-(i+.05)*debug.IMAGE_DURATION);
   await new Promise(resolve=>setImmediate(resolve));
   presented.add(body.dataset.tfwFinalCallImage);
 }
 assert.equal(presented.size,14);
 await frame(306500);assert.equal(body.classList.contains('tfw-final-call-restoring'),true);
 await frame(305250);assert.equal(body.data['--tfw-final-call-restore'],'0.50000');
 await frame(304000);assert.equal(body.classList.contains('tfw-final-call-active'),false);
 await frame(1795500);assert.equal(debug.getAudio().paused,false);
 window.__tfwPreviewPlaying=false;
 await frame(1795450);assert.equal(debug.getAudio().paused,true,'a stopped preview should not play audio');
});
