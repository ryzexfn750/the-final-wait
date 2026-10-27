import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const clock={
  audioStart:29*60_000+55_500,
  imageStart:6*60_000+24_050,
  enterStart:6*60_000+27_000,
  enterEnd:6*60_000+23_700,
  restoreStart:5*60_000+6_500,
  restoreEnd:5*60_000+4_000,
};
test('Final Call timing is millisecond accurate',()=>{
  assert.equal(clock.audioStart,1_795_500);
  assert.equal(clock.imageStart,384_050);
  assert.equal(clock.restoreStart,306_500);
  assert.equal(clock.restoreEnd,304_000);
  assert.equal(clock.imageStart,384_050);
  assert.equal(clock.enterStart,387_000);
  assert.equal(clock.enterEnd,383_700);
  assert.equal(clock.enterStart-clock.enterEnd,3_300);
  assert.equal(clock.enterStart-clock.restoreStart,80_500);
  assert.equal(clock.restoreStart-clock.restoreEnd,2_500);
  const js=read('js/final-call.js');
  for(const token of ['29*MINUTE+55_500','6*MINUTE+27_000','6*MINUTE+23_700','5*MINUTE+6_500','5*MINUTE+4_000']){
    assert.ok(js.includes(token),token);
  }
});
test('Ten allowed non-repeating slots cover the complete takeover interval',()=>{
 const ids=[1,2,3,4,5,8,9,11,12,14];
 const interval=(clock.enterStart-clock.restoreStart)/ids.length;
 for(let i=0;i<ids.length;i++){
   const start=clock.enterStart-i*interval;
   const end=clock.enterStart-(i+1)*interval;
   assert.ok(start>end&&end>=clock.restoreStart-0.00001);
   assert.equal(Math.min(ids.length-1,Math.floor((clock.enterStart-(start-0.1))/interval)),i);
 }
 assert.equal(Math.min(9,Math.floor((clock.enterStart-clock.restoreStart)/interval)),9);
 const source=read('js/final-call.js');
 assert.match(source,/IMAGE_IDS=Object.freeze\(\[1,2,3,4,5,8,9,11,12,14\]\)/);
 assert.match(source,/BEEP_FIRST=5\*MINUTE\+6_000/);
 assert.match(source,/BEEP_LAST=5\*MINUTE\+1_000/);
 for(const size of ['mobile','desktop']){
   for(const i of ids){
     const file=`assets/final-call/${size}/final-call-${String(i).padStart(2,'0')}.webp`;
     assert.ok(existsSync(new URL('../'+file,import.meta.url)),file);
   }
 }
});
test('Audio file, scene filter integration and preview state are present',()=>{
 assert.ok(existsSync(new URL('../assets/audio/final-call-29m55s.mp3',import.meta.url)));
 assert.match(read('index.html'),/css\/final-call\.css\?v=35/);
 assert.match(read('index.html'),/js\/final-call\.js\?v=35/);
 assert.match(read('js/milestones.js'),/__tfwFinalCallAudio/);
 assert.match(read('js/milestones.js'),/__tfwPreviewPlaying=true/);
 assert.match(read('js/milestones.js'),/tfw:final-call-audio-play/);
 assert.match(read('css/final-call.css'),/final-call-layer-stack/);
 assert.match(read('css/final-call.css'),/--tfw-final-call-visible/);
 assert.match(read('js/final-call.js'),/if\(slot===currentSlot\)return/);
});
