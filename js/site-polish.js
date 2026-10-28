/* One global cursor/light controller shared by countdown and all articles. */
(()=>{
  'use strict';
  function start(){
    const fine=matchMedia('(pointer:fine)').matches;
    const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
    const glow=document.getElementById('cursorGlow');
    if(!fine||reduced||!glow)return;
    if(document.getElementById('tfwPointerDot'))return;
    const dot=document.createElement('div');
    dot.id='tfwPointerDot';
    dot.className='tfw-pointer-dot';
    dot.setAttribute('aria-hidden','true');
    document.body.appendChild(dot);
    document.body.classList.add('tfw-custom-cursor','has-pointer');
    let x=-100,y=-100,active=false,frame=0;
    const setPosition=()=>{
      frame=0;
      dot.style.left=x+'px';dot.style.top=y+'px';
      glow.style.left=x+'px';glow.style.top=y+'px';
    };
    const show=()=>{
      if(!active){active=true;document.body.classList.add('tfw-pointer-active')}
      dot.style.opacity='1';glow.style.opacity='';
    };
    const hide=()=>{
      active=false;document.body.classList.remove('tfw-pointer-active');
      dot.style.opacity='0';glow.style.opacity='0';
    };
    // Capture pointer movement regardless of the nested section, overlay,
    // article card or interactive control under the mouse.
    document.addEventListener('pointermove',event=>{
      if(event.pointerType&&event.pointerType!=='mouse'&&event.pointerType!=='pen')return;
      x=event.clientX;y=event.clientY;
      if(!frame)frame=requestAnimationFrame(setPosition);
      const t=event.target;
      dot.classList.toggle('interactive',Boolean(t?.closest?.('a,button,summary,[role="button"],input[type="range"]')));
      show();
    },{passive:true,capture:true});
    document.addEventListener('pointerover',event=>{
      if(!event.relatedTarget&&active)show();
    },{passive:true});
    document.addEventListener('pointerout',event=>{
      if(!event.relatedTarget)hide();
    },{passive:true});
    window.addEventListener('blur',hide);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)hide()});
    window.addEventListener('pointerleave',hide);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
