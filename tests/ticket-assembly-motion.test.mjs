import test from 'node:test';
import assert from 'node:assert/strict';
import {printBoardingPass,PRINT_DURATION} from '../js/ticket-assembly-motion.js';
const scene=width=>({
 clip:{style:{},getBoundingClientRect:()=>({width})},
 scanner:{style:{}},card:{style:{}}
});
function timed(ctx,step=240){
 const snapshots=[];let timestamp=0;
 return {snapshots,requestFrame:async()=>{
  snapshots.push({mask:ctx.clip.style.clipPath,scan:ctx.scanner.style.transform,
   line:ctx.scanner.style.opacity,alpha:ctx.clip.style.opacity});
  return timestamp+=step;
 }};
}
test('Real paint frames reveal the ticket from right to left, even without WAAPI',async()=>{
 const ctx=scene(920),t=timed(ctx),updates=[];
 assert.equal(PRINT_DURATION,7200);
 await printBoardingPass({...ctx,requestFrame:t.requestFrame,onProgress:p=>updates.push(p)});
 const masks=t.snapshots.map(s=>Number(s.mask.match(/ ([\d.]+)%\)$/)?.[1]))
  .filter(Number.isFinite);
 assert.equal(masks[0],100);
 assert.ok(masks.some(n=>n>5&&n<95),'must show intermediate mask states');
 assert.ok(masks.some(n=>n>10&&n<50),'must reveal in multiple paint frames');
 assert.ok(t.snapshots.some(s=>s.line==='1'&&s.scan!=='translate3d(0,0,0)'),
  'scanner must visibly travel along the ticket');
 assert.equal(ctx.clip.style.clipPath,'inset(0 0 0 0%)');
 assert.equal(ctx.scanner.style.opacity,'0');
 assert.equal(updates.at(-1),1);
});
test('Reduced motion fades in instead of suddenly showing finished ticket',async()=>{
 const ctx=scene(850),t=timed(ctx,100);
 await printBoardingPass({...ctx,reducedMotion:true,requestFrame:t.requestFrame});
 assert.ok(t.snapshots.some(s=>Number(s.alpha)>0&&Number(s.alpha)<1));
 assert.ok(t.snapshots.every(s=>s.line==='0'));
 assert.equal(ctx.clip.style.opacity,'1');
});
test('Short animation completes and resets the scanner',async()=>{
 const ctx=scene(850),t=timed(ctx,100);
 await printBoardingPass({...ctx,duration:1,requestFrame:t.requestFrame});
 assert.equal(ctx.clip.style.clipPath,'inset(0 0 0 0%)');
 assert.equal(ctx.scanner.style.transform,'translate3d(0,0,0)');
});
test('Audio docks sit directly under their viewport overlays',async()=>{
 const {readFileSync}=await import('node:fs');
 const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const gate=read('js/community.js'),reveal=read('js/ticket-reveal.js'),
       css=read('css/ticket-reveal.css');
 assert.match(gate,/gate\.appendChild\(gate\.querySelector\('#tfwGateSound'\)\)/);
 assert.match(reveal,/overlay\.appendChild\(overlay\.querySelector\('#tfwRevealSound'\)\)/);
 assert.match(css,/#tfwCommunityGate > #tfwGateSound/);
 assert.match(css,/#tfwTicketReveal > #tfwRevealSound/);
 assert.match(css,/position:fixed!important/);
});
