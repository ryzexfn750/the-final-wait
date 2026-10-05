/* Shared cinematic motion: drift and pointer offset are independent. */
(()=>{
  'use strict';
  const reduce=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(pointer:fine)');
  const selector='.newspaper-image,.intel-image,.timeline-visual img,.article-image img,.article-hero-bg';
  const watched=new WeakSet();
  const io=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>target.classList.toggle('motion-visible',isIntersecting)),{rootMargin:'80px'});
  function bind(root=document){
    [...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)].forEach(el=>{
      if(watched.has(el))return;watched.add(el);el.classList.add('cinematic-media');io.observe(el);
      const host=el.closest('.intel-card,.newspaper-image-link,.timeline-visual,.article-image,.article-hero')||el.parentElement;
      let raf=0,x=0,y=0;
      host.addEventListener('pointermove',e=>{
        if(reduce.matches||!fine.matches)return;
        const r=host.getBoundingClientRect();x=((e.clientX-r.left)/r.width-.5)*-16;y=((e.clientY-r.top)/r.height-.5)*-12;
        if(!raf)raf=requestAnimationFrame(()=>{raf=0;el.style.setProperty('--media-x',x+'px');el.style.setProperty('--media-y',y+'px')});
      },{passive:true});
      host.addEventListener('pointerleave',()=>{cancelAnimationFrame(raf);raf=0;el.style.setProperty('--media-x','0px');el.style.setProperty('--media-y','0px')});
    });
  }
  bind();
  new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(node=>{if(node.nodeType===1)bind(node)}))).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('motion-paused',document.hidden));
  reduce.addEventListener('change',()=>{if(reduce.matches)document.querySelectorAll(selector).forEach(el=>{el.style.setProperty('--media-x','0px');el.style.setProperty('--media-y','0px')})});

  async function banner(){
    const host=document.querySelector('.share-backdrop');if(!host)return;
    const scenes=await fetch('./assets/scenes.json').then(r=>r.json());
    const ids=['scene-147','scene-146','scene-149','scene-151','scene-153'];
    const art=ids.map(id=>scenes.find(s=>s.id===id)).filter(Boolean);if(!art.length)return;
    host.innerHTML='<div class="banner-wash"></div><div class="banner-art"><img alt="" decoding="async"><img alt="" decoding="async"></div>';
    const imgs=[...host.querySelectorAll('img')],wash=host.querySelector('.banner-wash');
    let index=0,layer=0,visible=false,busy=false;
    imgs[0].src=art[0].desktop;imgs[0].classList.add('active');wash.style.backgroundImage=`url("${art[0].desktop}")`;
    new IntersectionObserver(([e])=>{visible=e.isIntersecting},{threshold:.05}).observe(host);
    setInterval(async()=>{
      if(!visible||document.hidden||reduce.matches||busy)return;busy=true;
      const next=(index+1)%art.length,incoming=imgs[1-layer];incoming.src=art[next].desktop;
      try{await incoming.decode();imgs[layer].classList.remove('active');incoming.classList.add('active');wash.style.backgroundImage=`url("${art[next].desktop}")`;index=next;layer=1-layer}catch{}finally{busy=false}
    },12000);
    const section=host.parentElement;
    section.addEventListener('pointermove',e=>{if(reduce.matches||!fine.matches)return;const r=section.getBoundingClientRect();const nx=(e.clientX-r.left)/r.width-.5,ny=(e.clientY-r.top)/r.height-.5;host.style.setProperty('--banner-x',nx*-14+'px');host.style.setProperty('--banner-y',ny*-10+'px');const artEl=host.querySelector('.banner-art');if(artEl){artEl.style.setProperty('--banner-rx',ny*-2.2+'deg');artEl.style.setProperty('--banner-ry',nx*2.8+'deg')}} ,{passive:true});
    section.addEventListener('pointerleave',()=>{host.style.setProperty('--banner-x','0px');host.style.setProperty('--banner-y','0px');const artEl=host.querySelector('.banner-art');if(artEl){artEl.style.setProperty('--banner-rx','0deg');artEl.style.setProperty('--banner-ry','0deg')}});
  }
  banner().catch(()=>{});

  function reading(){
    const body=document.querySelector('.article-body');if(!body||!body.querySelector('h2'))return;
    if(document.querySelector('.reading-tools'))return;
    const bar=document.createElement('div');bar.className='reading-progress';bar.setAttribute('aria-hidden','true');bar.innerHTML='<i></i>';document.body.append(bar);
    const nav=document.createElement('details');nav.className='reading-tools';nav.innerHTML='<summary>IN THIS DOSSIER</summary><nav aria-label="Article contents"></nav>';
    body.querySelectorAll('h2').forEach((h,i)=>{h.id='chapter-'+(i+1);const a=document.createElement('a');a.href='#'+h.id;a.textContent=h.textContent;a.addEventListener('click',()=>{nav.open=false;h.classList.add('visible')});nav.querySelector('nav').append(a)});
    body.prepend(nav);
    let raf=0;
    function progress(){raf=0;const r=body.getBoundingClientRect();bar.firstChild.style.transform=`scaleX(${Math.max(0,Math.min(1,(innerHeight-r.top)/(body.offsetHeight+innerHeight)))})`}
    window.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(progress)},{passive:true});progress();
  }
  const body=document.querySelector('.article-body');if(body){reading();new MutationObserver(reading).observe(body,{childList:true})}
})();
