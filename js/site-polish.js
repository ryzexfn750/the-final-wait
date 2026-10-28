/* The Final Wait — global GTA VI mouse cursor and ambient light.
 * One fixed composited layer across the entire document. Unlike the old
 * .cursor-glow, it is not hidden by performance classes on <html>.
 * Activates on actual mouse movement even on touchscreen-equipped PCs.
 */
(()=>{
  'use strict';
  function boot(){
    if(document.getElementById('tfwGlobalCursor'))return;
    const layer=document.createElement('div');
    layer.id='tfwGlobalCursor';
    layer.className='tfw-global-cursor-layer';
    layer.setAttribute('aria-hidden','true');

    const halo=document.createElement('div');
    halo.className='tfw-global-cursor-glow';
    const reticle=document.createElement('div');
    reticle.className='tfw-global-cursor-reticle';
    const center=document.createElement('span');
    center.className='tfw-global-cursor-center';
    reticle.appendChild(center);
    layer.appendChild(halo);
    layer.appendChild(reticle);
    document.body.appendChild(layer);

    let x=-200,y=-200,frame=0,active=false,mouseSeen=false;
    let lastTouch=0;
    function paint(){
      frame=0;
      const translate='translate3d('+x+'px,'+y+'px,0) translate(-50%,-50%)';
      halo.style.transform=translate;
      reticle.style.transform=translate;
    }
    function reveal(){
      if(!mouseSeen){
        mouseSeen=true;
        document.documentElement.classList.add('tfw-global-cursor-ready');
      }
      if(!active){
        active=true;
        layer.classList.add('active');
      }
    }
    function hide(){
      active=false;
      layer.classList.remove('active');
    }
    function move(event){
      // Do not hide the Windows pointer on touchscreens, but support a USB
      // mouse or trackpad on hybrid devices without relying on pointer:fine.
      if(event.pointerType && event.pointerType!=='mouse' && event.pointerType!=='pen')return;
      if(Date.now()-lastTouch<900)return;
      if(!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
      x=event.clientX;y=event.clientY;
      const target=event.target;
      const interactive=Boolean(target?.closest?.('a,button,summary,[role="button"],[role="link"],input[type="range"],label'));
      const textInput=Boolean(target?.closest?.('input:not([type="range"]),textarea,select,[contenteditable="true"]'));
      layer.classList.toggle('interactive',interactive&&!textInput);
      layer.classList.toggle('text-input',textInput);
      reveal();
      if(!frame)frame=requestAnimationFrame(paint);
    }

    document.addEventListener('pointerdown',event=>{
      if(event.pointerType==='touch'){lastTouch=Date.now();hide()}
    },{passive:true,capture:true});
    // Capture events from every section, link, modal and article, even if
    // their own mouse effects listen on the same events.
    document.addEventListener('pointermove',move,{passive:true,capture:true});
    document.addEventListener('mousemove',move,{passive:true,capture:true});
    document.addEventListener('mouseout',event=>{
      if(!event.relatedTarget)hide();
    },{passive:true,capture:true});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden)hide();
    });
    window.addEventListener('blur',hide);

    // Expose a read-only diagnostic for regression and user verification.
    window.__tfwGlobalCursorStatus=()=>({
      initialized:true,active,seenMouse:mouseSeen,
      x,y,layerPresent:Boolean(document.getElementById('tfwGlobalCursor'))
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else boot();
})();
