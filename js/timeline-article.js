const $=(s,r=document)=>r.querySelector(s); const $$=(s,r=document)=>[...r.querySelectorAll(s)];
let scenes=[],articles=[],article=null;
const isMobile=()=>matchMedia('(max-width:700px)').matches;
const escapeHtml=v=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const sourceHost=url=>{try{return new URL(url).hostname.replace(/^www\./,'').toUpperCase()}catch{return 'SOURCE'}};
function sceneById(id){return scenes.find(s=>s.id===id)||scenes[0]}
function srcFor(scene){return isMobile()?(scene.mobile||scene.desktop):scene.desktop}
function positionFor(scene){return isMobile()?(scene.mobilePosition||scene.position||'50% 50%'):(scene.desktopPosition||scene.position||'50% 50%')}
function showToast(msg){const t=$('#toast');if(!t)return;t.textContent=msg;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),1700)}
function renderBlock(block,index){
  if(block.type==='eyebrow')return `<p class="article-section-label">${escapeHtml(block.text)}</p>`;
  if(block.type==='heading')return `<h2 class="article-heading reveal">${escapeHtml(block.text)}</h2>`;
  if(block.type==='paragraph')return `<p class="article-paragraph ${index===0?'first':''} reveal">${escapeHtml(block.text)}</p>`;
  if(block.type==='image'){const s=sceneById(block.sceneId);return `<figure class="article-image reveal"><div class="article-image-frame"><img class="cinematic-media" src="${escapeHtml(srcFor(s))}" alt="${escapeHtml(block.caption||'Official GTA VI image')}" style="object-position:${escapeHtml(positionFor(s))}" loading="lazy"></div><figcaption>${escapeHtml(block.caption||'')}</figcaption></figure>`}
  if(block.type==='sources')return `<section class="source-ledger reveal timeline-source-ledger"><div class="source-ledger-head"><h3>SOURCES & PRIMARY RECORD</h3></div><div class="source-ledger-list">${(block.items||[]).map((x,i)=>`<a class="source-ledger-entry" href="${escapeHtml(x.url)}" target="_blank" rel="noreferrer"><span class="source-ledger-index">${String(i+1).padStart(2,'0')}</span><span class="source-ledger-copy"><small>${escapeHtml(sourceHost(x.url))}</small><strong>${escapeHtml(x.label)}</strong></span><span class="source-ledger-arrow">↗</span></a>`).join('')}</div></section>`;
  return '';
}
function observeReveals(){if(matchMedia('(prefers-reduced-motion: reduce)').matches){$$('.reveal').forEach(x=>x.classList.add('visible'));return}const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');io.unobserve(e.target)}}),{threshold:.08});$$('.reveal').forEach(x=>io.observe(x))}
function bindFx(){if(matchMedia('(pointer:fine)').matches){document.body.classList.add('has-pointer');const glow=$('#cursorGlow');window.addEventListener('pointermove',e=>{if(glow){glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px'}},{passive:true});$$('.magnetic').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.transform=`translate3d(${(e.clientX-r.left-r.width/2)*.08}px,${(e.clientY-r.top-r.height/2)*.1}px,0)`});el.addEventListener('pointerleave',()=>el.style.transform='')})}}
function showRouteLoader(label='LOADING'){const loader=$('#routeLoader');if(!loader)return;const text=$('#routeLoaderLabel');if(text)text.textContent=label;loader.setAttribute('aria-hidden','false');loader.classList.remove('active');void loader.offsetWidth;loader.classList.add('active')}
function hideRouteLoader(){const loader=$('#routeLoader');if(!loader)return;loader.classList.remove('active');loader.setAttribute('aria-hidden','true')}
function bindNavigation(){$$('a[href]').forEach(a=>{if(a.target)return;const href=a.getAttribute('href')||'';if(href.startsWith('http')||href.startsWith('#'))return;a.addEventListener('click',e=>{if(e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;e.preventDefault();showRouteLoader(href.includes('#timeline')?'RETURNING TO TIMELINE':'LOADING THE FINAL WAIT');setTimeout(()=>location.href=a.href,850)})});window.addEventListener('pageshow',hideRouteLoader)}
async function init(){
  try{
    const [sr,ar]=await Promise.all([fetch('./assets/scenes.json',{cache:'no-cache'}),fetch('./content/timeline.json',{cache:'no-cache'})]);
    if(!sr.ok||!ar.ok)throw new Error('data'); scenes=await sr.json(); articles=await ar.json();
    const id=new URLSearchParams(location.search).get('story')||articles[0]?.id; article=articles.find(x=>x.id===id)||articles[0]; if(!article)throw new Error('story');
    const hero=sceneById(article.heroSceneId); $('#articleHeroBg').style.backgroundImage=`url("${srcFor(hero)}")`; $('#articleHeroBg').style.backgroundPosition=positionFor(hero);
    $('#articleDate').textContent=article.date; $('#articleCategory').textContent=article.category; $('#articleHeadline').textContent=article.headline; $('#articleDek').textContent=article.dek; $('#articleByline').textContent='BY '+article.byline; $('#articleReadTime').textContent=article.readingTime; $('#articleBody').innerHTML=article.blocks.map(renderBlock).join('');
    document.title=`${article.headline} — The Road to Leonida`; document.querySelector('meta[name="description"]').content=article.dek;
    $('#copyTimelineLink').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);showToast('ARTICLE LINK COPIED')}catch{showToast('COPY THE URL FROM YOUR BROWSER')}});
    observeReveals(); bindFx(); bindNavigation(); document.dispatchEvent(new Event('tfw:content-ready'));
  }catch(e){console.error(e);showToast('TIMELINE STORY COULD NOT LOAD');document.dispatchEvent(new Event('tfw:content-ready'))}
}
init();
