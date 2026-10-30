import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('js/community.js');

test('Every emoji in a 300-reaction burst eventually animates and DOM stays bounded',()=>{
 const start=source.indexOf('const REACTION_NORMAL_MS=340;');
 const end=source.indexOf('  function updateHype(counts){',start);
 assert.ok(start>0&&end>start,'New visual queue exists');
 const code=source.slice(start,end);
 let now=0,peak=0;
 const frames=[],timers=[],visible=[],rendered=[];
 function element(tag){
  return {tag,style:{properties:{},setProperty(k,v){this.properties[k]=v}},
   children:[],appendChild(n){this.children.push(n)},remove(){
    const idx=visible.indexOf(this);if(idx>=0)visible.splice(idx,1)
   }};
 }
 const layer={isConnected:true,appendChild(node){
  visible.push(node);rendered.push(node);
  peak=Math.max(peak,visible.length);
 }};
 const hero={getBoundingClientRect:()=>({left:0,top:0,width:1300,height:800})};
 const meter={getBoundingClientRect:()=>({right:87,top:180,height:385,width:58})};
 const document={
  hidden:false,createElement:element,
  body:{classList:{contains:()=>false}},
  documentElement:{classList:{contains:()=>false}}
 };
 const EMOJIS=['🔥','🚀','🥳','🎉','🌴','🩷','💜'];
 const runtime=runInNewContext('(()=>{'+code+';return {animate,stats:()=>({queued:totalQueued,displayed:totalDisplayed,pending:reactionQueue.length,active:inFlight.size})}})()',
  {document,layer,hero,meter,EMOJIS,communityPreview:false,
   requestAnimationFrame:cb=>{frames.push(cb);return frames.length},
   setTimeout:(fn,delay)=>{timers.push({fn,due:now+delay})},
   state:{profile:null}});
 const items=Array.from({length:300},(_,i)=>({emoji:EMOJIS[i%7],nickname:'Tester_123'}));
 runtime.animate(items);
 assert.equal(runtime.stats().queued,300);
 assert.equal(runtime.stats().pending,300);
 for(let k=0;k<400;k++){
  now+=16;
  for(let t=timers.length-1;t>=0;t--){
   if(timers[t].due<=now){const [task]=timers.splice(t,1);task.fn()}
  }
  for(const callback of frames.splice(0))callback(now);
  if(runtime.stats().displayed===300&&runtime.stats().active===0)break;
 }
 assert.equal(runtime.stats().displayed,300,'All 300 emojis must have appeared');
 assert.equal(runtime.stats().pending,0,'No emoji left in queue');
 assert.equal(runtime.stats().active,0,'All animations finished');
 assert.ok(peak<=26,'At most 26 animated elements at any moment');
 assert.equal(rendered.length,300);
 assert.ok(rendered.every(node=>node.children.some(child=>EMOJIS.includes(child.textContent))));
 assert.ok(rendered.some(node=>node.style.properties['--reaction-duration']==='165ms'));
});
test('CSS visibly moves and rotates emoji, with lower opacity and reduced-motion support',()=>{
 const css=read('css/community.css');
 assert.match(css,/tfwHypeStreamFlight var\(--reaction-duration,340ms\)/);
 assert.match(css,/tfwHypeStreamTurn var\(--reaction-duration,340ms\)/);
 assert.match(css,/translate3d\(var\(--stream-x\),var\(--stream-y\),0\)/);
 assert.match(css,/opacity:\.24/);
 assert.match(css,/tfwHypeStreamReduced/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
