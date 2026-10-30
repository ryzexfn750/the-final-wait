import test from 'node:test';
import assert from 'node:assert/strict';
import {printBoardingPass,PRINT_DURATION} from '../js/ticket-assembly-motion.js';
function animated(width=920){
 const runs=[],events=[];
 const make=(name)=>({
  style:{},
  getBoundingClientRect:()=>({width}),
  animate(frames,options){
   events.push(name);
   const record={name,frames,options,cancelled:false};
   runs.push(record);
   return {finished:Promise.resolve(),cancel(){record.cancelled=true}};
  }
 });
 return {runs,events,clip:make('clip'),scanner:make('scanner'),card:make('card')};
}
test('Real browser WAAPI progressively unmasks ticket from right to left and moves scanner',async()=>{
 const ctx=animated();
 assert.equal(PRINT_DURATION,7200);
 await printBoardingPass(ctx);
 assert.deepEqual(ctx.events,['clip','scanner','card']);
 assert.equal(ctx.runs.length,3);
 const [reveal,sweep,settle]=ctx.runs;
 assert.equal(reveal.options.duration,7200);
 assert.equal(sweep.options.duration,7200);
 assert.equal(settle.options.duration,7200);
 assert.equal(reveal.frames[0].clipPath,'inset(0 0 0 100%)');
 assert.equal(reveal.frames.at(-1).clipPath,'inset(0 0 0 0%)');
 assert.equal(reveal.frames[2].clipPath,'inset(0 0 0 66%)');
 assert.equal(sweep.frames[0].transform,'translate3d(915px,0,0)');
 assert.equal(sweep.frames.at(-1).transform,'translate3d(0,0,0)');
 assert.equal(ctx.clip.style.clipPath,'inset(0 0 0 0)');
 assert.equal(ctx.scanner.style.opacity,'0');
 assert.ok(ctx.runs.every(r=>r.cancelled));
});
test('Reduced-motion visitors receive a legible fade without sweeping motion',async()=>{
 const ctx=animated();
 await printBoardingPass({...ctx,reducedMotion:true});
 assert.deepEqual(ctx.events,['clip']);
 assert.equal(ctx.clip.style.clipPath,'inset(0 0 0 0)');
 assert.equal(ctx.clip.style.opacity,'1');
});
test('Fallback reveals without WAAPI and still leaves ticket fully visible',async()=>{
 const clip={style:{},getBoundingClientRect:()=>({width:850})};
 const scanner={style:{}};
 const card={style:{}};
 await printBoardingPass({clip,scanner,card,duration:1});
 assert.equal(clip.style.clipPath,'inset(0 0 0 0)');
 assert.equal(clip.style.transition,'none');
 assert.equal(scanner.style.opacity,'0');
 assert.equal(scanner.style.transform,'translate3d(0,0,0)');
});
