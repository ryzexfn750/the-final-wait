import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const clock={
  audioStart:29*60_000+55_500,
  imageStart:6*60_000+24_050,
  restoreStart:5*60_000+6_500,
  restoreEnd:5*60_000+4_000,
};
test('Final Call timing is millisecond accurate',()=>{
  assert.equal(clock.audioStart,1_795_500);
  assert.equal(clock.imageStart,384_050);
  assert.equal(clock.restoreStart,306_500);
  assert.equal(clock.restoreEnd,304_000);
  assert.equal(clock.imageStart-clock.restoreStart,77_550);
  assert.equal(clock.restoreStart-clock.restoreEnd,2_500);
  const js=read('js/final-call.js');
  for(const token of ['29*MINUTE+55_500','6*MINUTE+24_050','5*MINUTE+6_500','5*MINUTE+4_000']){
    assert.ok(js.includes(token),token);
  }
});
test('Fourteen non-repeating slots cover precisely the takeover window',()=>{
 const interval=(clock.imageStart-clock.restoreStart)/14;
 for(let i=0;i<14;i++){
   const start=clock.imageStart-i*interval;
   const end=clock.imageStart-(i+1)*interval;
   assert.ok(start>end&&end>=clock.restoreStart-0.00001);
   assert.equal(Math.min(13,Math.floor((clock.imageStart-(start-0.1))/interval)),i);
 }
 assert.equal(Math.min(13,Math.floor((clock.imageStart-clock.restoreStart)/interval)),13);
 for(const size of ['mobile','desktop']){
   for(let i=1;i<=14;i++){
     const file=`assets/final-call/${size}/final-call-${String(i).padStart(2,'0')}.webp`;
     assert.ok(existsSync(new URL('../'+file,import.meta.url)),file);
   }
 }
});
test('Audio file, scene filter integration and preview state are present',()=>{
 assert.ok(existsSync(new URL('../assets/audio/final-call-29m55s.mp3',import.meta.url)));
 assert.match(read('index.html'),/css\/final-call\.css\?v=34/);
 assert.match(read('index.html'),/js\/final-call\.js\?v=34/);
 assert.match(read('js/milestones.js'),/__tfwFinalCallAudio/);
 assert.match(read('js/milestones.js'),/__tfwPreviewPlaying=true/);
 assert.match(read('js/milestones.js'),/tfw:final-call-audio-play/);
 assert.match(read('css/final-call.css'),/tfw-final-call-restoring/);
 assert.match(read('css/final-call.css'),/--tfw-final-call-restore/);
 assert.match(read('js/final-call.js'),/if\(slot===currentSlot\)return/);
});
