/* Shared desktop pointer accent (home, newspaper and dossiers). */
(()=>{
 'use strict';
 const fine=matchMedia('(pointer:fine)');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 function init(){
  const glow=document.getElementById('cursorGlow');
  if(!fine.matches||reduced.matches||!glow)return;
  const dot=document.createElement('div');
  dot.className='tfw-pointer-dot';
  dot.setAttribute('aria-hidden','true');
  document.body.appendChild(dot);
  document.body.classList.add('tfw-custom-cursor','has-pointer');
  let x=-100,y=-100,moved=false;
  const point=e=>{
    if(e.pointerType&&e.pointerType!=='mouse'&&e.pointerType!=='pen')return;
    x=e.clientX;y=e.clientY;
    if(!moved){moved=true;dot.style.opacity='1'}
    dot.style.transform='translate3d('+x+'px,'+y+'px,0) translate(-50%,-50%)';
    glow.style.left=x+'px';glow.style.top=y+'px';
    dot.classList.toggle('interactive',Boolean(e.target&&e.target.closest('a,button,summary,[role="button"],input[type="range"]')));
  };
  window.addEventListener('pointermove',point,{passive:true});
  document.addEventListener('pointerout',e=>{
    if(!e.relatedTarget){dot.style.opacity='0';glow.style.opacity='0'}
  });
  document.addEventListener('pointerover',()=>{if(moved){dot.style.opacity='1';glow.style.opacity=''}});
  window.addEventListener('blur',()=>{dot.style.opacity='0'});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
