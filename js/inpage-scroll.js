/* GTA VI pointer also stays consistent when dragging the timezone scrollbar.
   Native browser scrollbar chrome cannot use the page's CSS cursor, so
   render its scroll thumb inside the document (wheel/keyboard stay native). */
(()=>{
 'use strict';
 const list=document.getElementById('timezoneList');
 const modal=document.getElementById('timezoneModal');
 if(!list||!modal)return;
 const track=document.createElement('div');
 track.id='tfwTimezoneScrollbar';track.className='tfw-inpage-scrollbar';track.hidden=true;
 track.setAttribute('role','scrollbar');track.setAttribute('aria-orientation','vertical');
 track.setAttribute('aria-label','Timezone list scroll');
 track.tabIndex=0;
 const thumb=document.createElement('div');thumb.className='tfw-inpage-scrollbar-thumb';
 track.appendChild(thumb);document.body.appendChild(track);
 let dragging=false,dragY=0,dragScroll=0,trackHeight=0,thumbHeight=0;
 const fine=()=>window.matchMedia('(any-pointer:fine)').matches;
 function update(){
   if(!fine()||modal.hidden||!list.clientHeight){track.hidden=true;return}
   const overflow=list.scrollHeight-list.clientHeight;
   if(overflow<=2){track.hidden=true;return}
   const box=list.getBoundingClientRect();
   const margin=3;
   track.style.left=(box.right-12)+'px';
   track.style.top=(box.top+margin)+'px';
   trackHeight=Math.max(30,box.height-2*margin);
   track.style.height=trackHeight+'px';
   thumbHeight=Math.max(28,Math.min(trackHeight,trackHeight*list.clientHeight/list.scrollHeight));
   thumb.style.height=thumbHeight+'px';
   thumb.style.transform='translateY('+((list.scrollTop/overflow)*(trackHeight-thumbHeight))+'px)';
   track.setAttribute('aria-valuemin','0');
   track.setAttribute('aria-valuemax',String(Math.round(overflow)));
   track.setAttribute('aria-valuenow',String(Math.round(list.scrollTop)));
   track.hidden=false;
 }
 track.addEventListener('pointerdown',event=>{
   if(event.button!==0)return;
   event.preventDefault();
   track.setPointerCapture(event.pointerId);
   dragging=true;dragY=event.clientY;dragScroll=list.scrollTop;
   if(event.target===track){
     const y=event.clientY-track.getBoundingClientRect().top-thumbHeight/2;
     list.scrollTop=Math.max(0,y/(trackHeight-thumbHeight))*(list.scrollHeight-list.clientHeight);
     dragScroll=list.scrollTop;dragY=event.clientY;
   }
   update();
 });
 track.addEventListener('pointermove',event=>{
   if(!dragging)return;
   event.preventDefault();
   const range=trackHeight-thumbHeight;
   if(range<=0)return;
   list.scrollTop=dragScroll+(event.clientY-dragY)*(list.scrollHeight-list.clientHeight)/range;
   update();
 });
 const end=()=>{dragging=false};
 track.addEventListener('pointerup',end);
 track.addEventListener('pointercancel',end);
 track.addEventListener('lostpointercapture',end);
 track.addEventListener('keydown',event=>{
   const amount=event.key==='ArrowDown'?45:event.key==='ArrowUp'?-45:event.key==='PageDown'?list.clientHeight*.8:event.key==='PageUp'?-list.clientHeight*.8:null;
   if(amount===null)return;
   event.preventDefault();list.scrollTop+=amount;update();
 });
 list.addEventListener('scroll',update,{passive:true});
 window.addEventListener('resize',update,{passive:true});
 const observer=new MutationObserver(update);
 observer.observe(list,{childList:true,subtree:false});
 observer.observe(modal,{attributes:true,attributeFilter:['hidden']});
 document.addEventListener('pointermove',()=>{if(!track.hidden&&!dragging)update()},{passive:true});
 update();
})();
