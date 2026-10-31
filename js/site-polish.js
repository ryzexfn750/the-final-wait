/* The Final Wait — global GTA VI mouse cursor and ambient light.
 * One fixed composited layer across the entire document. Unlike the old
 * .cursor-glow, it is not hidden by performance classes on <html>.
 * Activates on actual mouse movement even on touchscreen-equipped PCs.
 */
(()=>{
  'use strict';

  // Per-device graphics preferences, shared across regular and seamless pages.
  const perfKey='tfw_visual_preferences_v1';
  const perfDefaults={mode:'cinematic',reactions:true,cursor:true};
  let perfPrefs={...perfDefaults};
  function loadPerf(){
    try{
      const value=JSON.parse(localStorage.getItem(perfKey)||'{}');
      return {
        mode:['cinematic','balanced','lite'].includes(value.mode)?value.mode:'cinematic',
        reactions:value.reactions!==false,cursor:value.cursor!==false
      };
    }catch{return {...perfDefaults}}
  }
  function applyPerf(){
    perfPrefs=loadPerf();
    const html=document.documentElement;
    html.classList.toggle('tfw-performance-balanced',perfPrefs.mode==='balanced');
    html.classList.toggle('tfw-performance-lite',perfPrefs.mode==='lite');
    html.classList.toggle('tfw-disable-live-reactions',!perfPrefs.reactions);
    html.classList.toggle('tfw-disable-custom-cursor',!perfPrefs.cursor);
    if(!perfPrefs.cursor){
      html.classList.remove('tfw-global-cursor-ready');
      document.getElementById('tfwGlobalCursor')?.classList.remove('active');
    }
    window.dispatchEvent(new CustomEvent('tfw:performance-change',{detail:{...perfPrefs}}));
  }
  window.__tfwPerformancePrefs=()=>({...perfPrefs});
  function updatePerf(next){
    try{localStorage.setItem(perfKey,JSON.stringify({...perfPrefs,...next}))}catch{}
    applyPerf();
  }
  applyPerf();
  window.addEventListener('storage',event=>{if(event.key===perfKey)applyPerf()});
  function bindPerfSettings(){
    const mode=document.getElementById('tfwPerformanceMode');
    if(!mode||mode.dataset.bound)return;
    mode.dataset.bound='1';
    const reactions=document.getElementById('tfwPerformanceReactions');
    const cursor=document.getElementById('tfwPerformanceCursor');
    const status=document.getElementById('tfwPerformanceStatus');
    const sync=()=>{
      mode.value=perfPrefs.mode;reactions.checked=perfPrefs.reactions;cursor.checked=perfPrefs.cursor;
    };
    const change=next=>{
      updatePerf(next);sync();
      if(status)status.textContent='Preferences saved on this device.';
    };
    mode.addEventListener('change',()=>change({mode:mode.value}));
    reactions.addEventListener('change',()=>change({reactions:reactions.checked}));
    cursor.addEventListener('change',()=>change({cursor:cursor.checked}));
    window.addEventListener('tfw:performance-change',sync);
    sync();
    document.getElementById('tfwRunSiteTour')?.addEventListener('click',()=>{
      try{
        if(window!==window.parent&&window.parent.location.origin===location.origin&&
           typeof window.parent.__tfwSiteTourStart==='function'){
          window.parent.__tfwSeamlessNavigation?.open('/index.html');
          window.parent.setTimeout(()=>window.parent.__tfwSiteTourStart({force:true}),250);
          return;
        }
      }catch{}
      window.location.assign('/index.html?tour=1');
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindPerfSettings,{once:true});
  else bindPerfSettings();

  function boot(){
    if(document.getElementById('tfwGlobalCursor')||!perfPrefs.cursor)return;
    const layer=document.createElement('div');
    layer.id='tfwGlobalCursor';
    layer.className='tfw-global-cursor-layer';
    layer.setAttribute('aria-hidden','true');

    const halo=document.createElement('div');
    halo.className='tfw-global-cursor-glow';
    const reticle=document.createElement('div');
    reticle.className='tfw-global-cursor-reticle';
    // Familiar OS-pointer silhouette with a GTA VI sunset gradient.
    // The arrow tip is the click hotspot; no circular reticle remains.
    reticle.innerHTML='<svg viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'+
      '<defs><linearGradient id="tfwArrowGradient" x1="0" y1="0" x2=".85" y2="1">'+
      '<stop offset="0%" stop-color="#ffbb79"/>'+
      '<stop offset="46%" stop-color="#fa63b7"/>'+
      '<stop offset="100%" stop-color="#9578ff"/></linearGradient></defs>'+
      '<path d="M2 1.5 L2 27 L8.5 21 L14.2 33 L19.7 30.4 L14.1 19 L25.2 18.3 Z" fill="none" stroke="#130d1e" stroke-width="3.2" stroke-linejoin="round"/>'+
      '<path d="M2 1.5 L2 27 L8.5 21 L14.2 33 L19.7 30.4 L14.1 19 L25.2 18.3 Z" fill="url(#tfwArrowGradient)" stroke="rgba(255,255,255,.92)" stroke-width="1.15" stroke-linejoin="round"/>'+
      '</svg>';
    // Render a matching I-beam inside the same custom cursor when selecting text.
    reticle.innerHTML+='<svg class="tfw-global-cursor-ibeam" viewBox="0 0 12 22" aria-hidden="true" focusable="false">'+
      '<path d="M2 2.5H10M6 2.5V19.5M2 19.5H10" fill="none" stroke="#130d1e" stroke-width="3.4" stroke-linecap="round"/>'+
      '<path d="M2 2.5H10M6 2.5V19.5M2 19.5H10" fill="none" stroke="#f8b4e7" stroke-width="1.65" stroke-linecap="round"/></svg>';
    layer.appendChild(halo);
    layer.appendChild(reticle);
    document.body.appendChild(layer);

    let x=-200,y=-200,frame=0,active=false,mouseSeen=false;
    let lastTouch=0;
    let autoScroll=null,autoScrollFrame=0,skipMiddleMouseDown=false;
    const autoIcon=document.createElement('div');
    autoIcon.className='tfw-autoscroll-indicator';
    autoIcon.hidden=true;
    autoIcon.innerHTML='<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">'+
      '<circle cx="20" cy="20" r="15" fill="#150d23" stroke="#ed8bca" stroke-width="1.5"/>'+
      '<path d="M20 7l-6 8h12zM20 33l6-8H14z" fill="#f7b0d9"/>'+
      '<circle cx="20" cy="20" r="3" fill="#f1e5ff"/></svg>';
    layer.appendChild(autoIcon);
    const scrollingParent=target=>{
      for(let el=target;el&&el!==document.body;el=el.parentElement){
        if(el.scrollHeight>el.clientHeight+10 &&
          /auto|scroll/.test(getComputedStyle(el).overflowY||''))return el;
      }
      const root=document.scrollingElement||document.documentElement;
      return root.scrollHeight>root.clientHeight+10?root:null;
    };
    function stopAutoScroll(){
      if(!autoScroll)return;
      autoScroll=null;autoIcon.hidden=true;
      layer.classList.remove('autoscroll');
      if(autoScrollFrame){cancelAnimationFrame(autoScrollFrame);autoScrollFrame=0}
    }
    function positionAutoIcon(pointerX,pointerY){
      autoIcon.style.transform='translate3d('+(pointerX-20)+'px,'+(pointerY-20)+'px,0)';
    }
    function autoScrollTick(){
      autoScrollFrame=0;
      if(!autoScroll||document.hidden)return;
      const delta=autoScroll.pointerY-autoScroll.anchorY;
      const magnitude=Math.max(0,Math.abs(delta)-18);
      const speed=Math.sign(delta)*Math.min(36,Math.pow(magnitude/22,1.16));
      if(speed){
        const node=autoScroll.container;
        if(node===document.scrollingElement||node===document.documentElement)
          window.scrollBy(0,speed);
        else node.scrollTop+=speed;
      }
      autoScrollFrame=requestAnimationFrame(autoScrollTick);
    }
    // Browsers do not expose styling for their built-in middle-click autoscroll icon.
    // Prevent the native mode and own both the scrolling and its visible indicator.
    function middleClick(event){
      if(event.button!==1)return;
      if(autoScroll){event.preventDefault();event.stopPropagation();return}
      if(event.target?.closest?.('a[href],button,input,textarea,select,[contenteditable]'))return;
      const container=scrollingParent(event.target);
      if(!container)return;
      event.preventDefault();event.stopPropagation();
      autoScroll={container,anchorY:event.clientY,pointerY:event.clientY};
      autoIcon.hidden=false;
      positionAutoIcon(event.clientX,event.clientY);
      layer.classList.add('autoscroll');
      reveal();autoScrollFrame=requestAnimationFrame(autoScrollTick);
    }
    let selectingText=false;
    const syncSelection=()=>{
      const selection=document.getSelection?.();
      selectingText=Boolean(selection&&selection.rangeCount>0&&!selection.isCollapsed&&String(selection).trim());
      layer.classList.toggle('text-selecting',selectingText);
      document.documentElement.classList.toggle('tfw-text-selection-active',selectingText);
    };
    function paint(){
      frame=0;
      const translate='translate3d('+x+'px,'+y+'px,0) translate(-50%,-50%)';
      halo.style.transform=translate;
      // Classic pointer hotspot: top-left tip, not center of the image.
      reticle.style.transform='translate3d('+(x-1.3)+'px,'+(y-1)+'px,0)';
    }
    function reveal(){
      if(!mouseSeen||!document.documentElement.classList.contains('tfw-global-cursor-ready')){
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
      if(!perfPrefs.cursor){hide();return}
      // Do not hide the Windows pointer on touchscreens, but support a USB
      // mouse or trackpad on hybrid devices without relying on pointer:fine.
      if(event.pointerType && event.pointerType!=='mouse' && event.pointerType!=='pen')return;
      if(Date.now()-lastTouch<900)return;
      if(!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
      x=event.clientX;y=event.clientY;
      if(autoScroll){autoScroll.pointerY=y;positionAutoIcon(x,y)}
      const target=event.target;
      const interactive=Boolean(target?.closest?.('a,button,summary,[role="button"],[role="link"],input[type="range"],label'));
      const textInput=Boolean(target?.closest?.('input:not([type="range"]),textarea,select,[contenteditable="true"]'));
      layer.classList.toggle('interactive',interactive&&!textInput);
      const textCaret=Boolean(!interactive&&!textInput&&target?.closest?.(
        'p,h1,h2,h3,h4,h5,h6,blockquote,li,dt,dd,figcaption,.legal-copy,.tfw-hype-float-name'));
      layer.classList.toggle('text-input',textInput);
      layer.classList.toggle('text-caret',textCaret);
      reveal();
      if(!frame)frame=requestAnimationFrame(paint);
    }

    document.addEventListener('pointerdown',event=>{
      if(event.pointerType==='touch'){lastTouch=Date.now();stopAutoScroll();hide();return}
      if(autoScroll&&event.button!==1){stopAutoScroll();event.preventDefault();return}
      if(event.button===1&&autoScroll){
        event.preventDefault();event.stopPropagation();
        skipMiddleMouseDown=true;stopAutoScroll();return;
      }
      if(event.button===1)middleClick(event);
    },{passive:false,capture:true});
    document.addEventListener('mousedown',event=>{
      if(event.button===1&&skipMiddleMouseDown){
        event.preventDefault();event.stopPropagation();skipMiddleMouseDown=false;
      }else middleClick(event);
    },{passive:false,capture:true});
    document.addEventListener('auxclick',event=>{
      if(event.button===1&&autoScroll)event.preventDefault();
    },{capture:true});
    document.addEventListener('selectionchange',syncSelection);
    document.addEventListener('mouseup',event=>{
      if(event.button===1)skipMiddleMouseDown=false;
      if(event.button===0){move(event);syncSelection()}
    },{capture:true,passive:true});
    // DOM selection and Windows pointer state can settle after mouseup.
    // Synchronize immediately in the capture phase, without a delayed timeout.
    window.addEventListener('pointerup',event=>{
      if(event.button===0){move(event);syncSelection()}
    },{capture:true,passive:true});
    window.addEventListener('keydown',event=>{
      if(event.key==='Escape')stopAutoScroll();
    },{capture:true});
    // Capture events from every section, link, modal and article, even if
    // their own mouse effects listen on the same events.
    document.addEventListener('pointermove',move,{passive:true,capture:true});
    document.addEventListener('mousemove',move,{passive:true,capture:true});
    window.addEventListener('mousemove',move,{passive:true,capture:true});
    document.addEventListener('mouseout',event=>{
      if(!event.relatedTarget)hide();
    },{passive:true,capture:true});
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){stopAutoScroll();hide()}
    });
    window.addEventListener('blur',()=>{stopAutoScroll();hide()});

    // Expose a read-only diagnostic for regression and user verification.
    window.__tfwGlobalCursorStatus=()=>({
      initialized:true,active,seenMouse:mouseSeen,
      autoscroll:Boolean(autoScroll),selectingText,
      x,y,layerPresent:Boolean(document.getElementById('tfwGlobalCursor'))
    });
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else boot();
  window.addEventListener('tfw:performance-change',()=>{if(perfPrefs.cursor)boot()});
})();
