const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const storage = {
  get(k){ try { return localStorage.getItem(k); } catch { return null; } },
  set(k,v){ try { localStorage.setItem(k,v); } catch {} }
};
let article = null;
let scenes = [];

const escapeHtml = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const sourceHost = url => { try { return new URL(url).hostname.replace(/^www\./,'').toUpperCase(); } catch { return 'ORIGINAL SOURCE'; } };
const isMobile = () => matchMedia('(max-width:700px)').matches;
const sceneById = id => scenes.find(s => s.id === id) || scenes[0];
const srcFor = scene => isMobile() ? scene?.mobile : scene?.desktop;
const positionFor = scene => isMobile() ? (scene?.mobilePosition || scene?.position || '50% 50%') : (scene?.desktopPosition || scene?.position || '50% 50%');

function showToast(message){
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.classList.remove('show'), 1900);
}

function articleUrl(){ return new URL('today.html', location.href).href; }
function shareText(){ return article ? `${article.headline} — Today in Leonida.` : 'Today in Leonida — The Final Wait.'; }
async function copyText(text){
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText='position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  }
  showToast('ARTICLE LINK COPIED');
}
async function share(kind){
  const text = shareText(), url = articleUrl();
  if (kind === 'x') window.open(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank', 'noopener');
  else if (kind === 'whatsapp') window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank', 'noopener');
  else if (kind === 'native') {
    if (navigator.share) {
      try { await navigator.share({ title: article?.headline || 'Today in Leonida', text, url }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    await copyText(url);
  }
}

function renderBlock(block, index){
  switch(block.type){
    case 'heading': return `<h2 class="article-heading reveal">${escapeHtml(block.text)}</h2>`;
    case 'paragraph': return `<p class="article-paragraph ${index === 0 ? 'first' : ''} reveal">${escapeHtml(block.text)}</p>`;
    case 'image': {
      const scene = sceneById(block.sceneId);
      return `<figure class="article-image reveal"><img src="${escapeHtml(srcFor(scene))}" alt="${escapeHtml(block.alt || block.caption || 'Official GTA VI screenshot')}" style="object-position:${escapeHtml(positionFor(scene))}" loading="lazy" /><figcaption>${escapeHtml(block.caption || '')}</figcaption></figure>`;
    }
    case 'quote': return `<blockquote class="article-quote reveal">${escapeHtml(block.text)}${block.cite ? `<cite>${escapeHtml(block.cite)}</cite>` : ''}</blockquote>`;
    case 'sources': return `<section class="source-ledger reveal"><div class="source-ledger-head"><span>ORIGINAL SOURCES</span><h3>THE SOURCE DESK</h3><p>Primary links used to verify this story.</p></div><div class="source-ledger-list">${(block.items || []).map((x,i) => `<a class="source-ledger-entry" href="${escapeHtml(x.url)}" target="_blank" rel="noreferrer"><span class="source-ledger-index">${String(i+1).padStart(2,'0')}</span><span class="source-ledger-copy"><small>${escapeHtml(sourceHost(x.url))}</small><strong>${escapeHtml(x.label)}</strong></span><span class="source-ledger-arrow">↗</span></a>`).join('')}</div></section>`;
    default: return '';
  }
}

function observeReveals(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { $$('.reveal').forEach(el => el.classList.add('visible')); return; }
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
  }), { threshold:.08 });
  $$('.reveal').forEach(el => io.observe(el));
}

function bindPointerFx(){
  if (!matchMedia('(pointer:fine)').matches) return;
  const glow = $('#cursorGlow');
  window.addEventListener('pointermove', e => { glow.style.left=`${e.clientX}px`; glow.style.top=`${e.clientY}px`; }, {passive:true});
  $$('.magnetic').forEach(el => {
    el.addEventListener('pointermove', e => { const r=el.getBoundingClientRect(); el.style.transform=`translate3d(${(e.clientX-r.left-r.width/2)*.08}px,${(e.clientY-r.top-r.height/2)*.1}px,0)`; });
    el.addEventListener('pointerleave', () => { el.style.transform=''; });
  });
}


function showRouteLoader(label='LOADING'){
  const loader=$('#routeLoader'); if(!loader)return;
  const text=$('#routeLoaderLabel'); if(text)text.textContent=label;
  loader.setAttribute('aria-hidden','false'); loader.classList.remove('active'); void loader.offsetWidth; loader.classList.add('active');
}
function hideRouteLoader(){const loader=$('#routeLoader');if(!loader)return;loader.classList.remove('active');loader.setAttribute('aria-hidden','true')}
function bindNavigationTransitions(){
  $$('a[href]').forEach(a=>{
    if(a.dataset.transitionBound)return;
    const href=a.getAttribute('href')||'';
    if(!a.target && !href.startsWith('http') && !href.startsWith('mailto:')){
      a.dataset.transitionBound='1';
      a.addEventListener('click',e=>{e.preventDefault();showRouteLoader(href.includes('#hero')?'RETURNING TO COUNTDOWN':'LOADING THE FINAL WAIT');setTimeout(()=>{location.href=a.href},620)});
    }
  });
  window.addEventListener('pageshow',hideRouteLoader);
}

async function init(){
  try {
    const [sceneRes, articleRes] = await Promise.all([
      fetch('./assets/scenes.json', {cache:'no-cache'}),
      fetch('./content/today.json', {cache:'no-cache'})
    ]);
    if (!sceneRes.ok || !articleRes.ok) throw new Error('Could not load article data');
    scenes = await sceneRes.json(); article = await articleRes.json();
    const hero = sceneById(article.heroSceneId || article.cardSceneId);
    $('#articleHeroBg').style.backgroundImage = `url("${srcFor(hero)}")`;
    $('#articleHeroBg').style.backgroundPosition = positionFor(hero);
    $('#articleIssue').textContent = article.issue || '';
    $('#articleDate').textContent = article.date || '';
    $('#articleCategory').textContent = article.category || '';
    $('#articleHeadline').textContent = article.headline || '';
    $('#articleDek').textContent = article.dek || '';
    $('#articleByline').textContent = `BY ${article.byline || 'THE FINAL WAIT DESK'}`;
    $('#articleReadTime').textContent = article.readingTime || '';
    $('#articleBody').innerHTML = (article.blocks || []).map(renderBlock).join('');
    document.title = `${article.headline} — Today in Leonida`;
    $$('[data-share]').forEach(b => b.addEventListener('click', () => share(b.dataset.share)));
    observeReveals(); bindPointerFx(); bindNavigationTransitions();
  } catch (e) {
    console.error(e); showToast('ARTICLE COULD NOT LOAD');
  }
}
init();
