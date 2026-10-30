import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('js/community.js');
test('HYPE renderer absorbs massive bursts and limits the number of simultaneous nodes',()=>{
 const start=source.indexOf('const REACTION_DURATION=780;'),end=source.indexOf('  function updateHype(counts){',start);
 assert.ok(start>0&&end>start,'Quiet reaction renderer exists');
 const code=source.slice(start,end);
 const nodes=[],timers=[];
 let now=1000;
 const element=tag=>({
  tagName:tag,children:[],style:{setProperty(){}},textContent:'',className:'',
  appendChild(child){this.children.push(child)}
 });
 const layer={
  isConnected:true,children:nodes,
  get childElementCount(){return nodes.length},
  get firstElementChild(){return nodes[0]},
  appendChild(n){n.remove=()=>{const i=nodes.indexOf(n);if(i>=0)nodes.splice(i,1)};nodes.push(n)}
 };
 const document={
  hidden:false,body:{classList:{contains:()=>false}},
  documentElement:{classList:{contains:()=>false}},
  createElement:element
 };
 const meter={getBoundingClientRect:()=>({top:300,right:70,width:40,height:250})};
 const hero={getBoundingClientRect:()=>({left:0,top:0,width:1300,height:800})};
 const EMOJIS=['🔥','🚀','🥳','🎉','🌴','🩷','💜'];
 const runtime=runInNewContext('(()=>{'+code+';return {animate,REACTION_DURATION}})()',
  {window:{},document,hero,meter,layer,EMOJIS,communityPreview:false,performance:{now:()=>now},
   setTimeout:(fn,delay)=>timers.push(delay),state:{profile:{nickname:'TestFan'}}});
 assert.equal(runtime.REACTION_DURATION,780);
 const burst=Array.from({length:200},(_,i)=>({emoji:EMOJIS[i%7],nickname:'LoadTestFan'}));
 runtime.animate(burst);
 assert.equal(nodes.length,1,'A burst of 200 reactions must display only one');
 now+=10;runtime.animate(burst);
 assert.equal(nodes.length,1,'Reactions within the throttle window are skipped');
 for(let i=0;i<20;i++){now+=160;runtime.animate(burst)}
 assert.ok(nodes.length<=2,'At most two live emoji DOM nodes');
 assert.ok(timers.every(delay=>delay===800),'Nodes expire after less than one second');
});
test('Reduced-motion and CSS fallback are modest and last 780 ms',()=>{
 const css=read('css/community.css');
 assert.match(css,/tfwHypeQuietRise 780ms/);
 assert.match(css,/opacity:\.42/);
 assert.match(css,/tfwHypeQuietReduced 780ms/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
