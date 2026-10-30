import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const source=read('js/community.js');
function isolateAnimation(reduced=false){
 const begin=source.indexOf('const REACTION_DURATION=1750;');
 const end=source.indexOf('  function animate(entries)',begin);
 assert.ok(begin>0&&end>begin,'Live Web Animations helper exists');
 const isolated=source.slice(begin,end);
 const window={matchMedia:()=>({matches:reduced})};
 return runInNewContext('(()=>{'+isolated+';return {animateReaction,REACTION_DURATION}})()',
   {window,console});
}
function mockElement(calls){
 const names=new Set();
 return {
  style:{getPropertyValue:()=>'-21px'},
  classList:{
   add:n=>names.add(n),
   remove:n=>names.delete(n),
   contains:n=>names.has(n)
  },
  animate:(frames,options)=>{calls.push({frames,options});return {finished:Promise.resolve()}}
 };
}
test('Every supported reaction creates independent motion for badge and emoji',()=>{
 const {animateReaction,REACTION_DURATION}=isolateAnimation();
 assert.equal(REACTION_DURATION,1750);
 for(const kind of ['flame','launch','party','sway','heartbeat']){
  const containerCalls=[],emojiCalls=[];
  const container=mockElement(containerCalls),emoji=mockElement(emojiCalls);
  assert.equal(animateReaction(container,emoji,kind),true);
  assert.equal(containerCalls.length,1,kind+' parent animation');
  assert.equal(emojiCalls.length,1,kind+' emoji-specific animation');
  assert.ok(container.classList.contains('tfw-reaction-waapi'));
  const parent=containerCalls[0],glyph=emojiCalls[0];
  assert.equal(parent.frames[0].opacity,0);
  assert.equal(parent.frames.at(-1).opacity,0);
  assert.ok(parent.frames.some(frame=>frame.opacity===1));
  assert.equal(parent.options.duration,1750);
  assert.equal(glyph.options.duration,1750);
  assert.ok(glyph.frames.length>=4);
  assert.ok(glyph.frames.some(frame=>frame.transform.includes('rotate(')));
 }
 const css=read('css/community.css');
 assert.match(css,/#hero \.tfw-hype-float\.tfw-reaction-waapi,/);
 assert.match(css,/animation:none!important/);
 assert.match(source,/animateReaction\(node,e,emojiMotion\[item\.emoji\]\)/);
 assert.match(source,/__tfwPreviewHypeReaction/);
});
test('Respect reduced-motion preference and retain CSS animation fallback',()=>{
 const {animateReaction}=isolateAnimation(true);
 let called=false;
 const e={style:{getPropertyValue:()=>'-10px'},
   animate:()=>{called=true},
   classList:{add:()=>{},remove:()=>{}}};
 assert.equal(animateReaction(e,e,'flame'),false);
 assert.equal(called,false);
 const css=read('css/community.css');
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/tfwReactionReduced/);
});
