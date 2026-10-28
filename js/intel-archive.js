import { INTEL } from './config.js?v=44';

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const mobile=()=>matchMedia('(max-width:700px)').matches;
let scenes=new Map(),imageObserver=null,selected='ALL';

function sceneFor(id){return scenes.get(id)||scenes.values().next().value||null}
function coverFor(scene){return scene?(mobile()?scene.mobile:scene.desktop):''}
function placement(scene){return scene?(mobile()?scene.mobilePosition||scene.position:scene.desktopPosition||scene.position)||'center':'center'}

function draw(){
  const entries=selected==='ALL'?INTEL:INTEL.filter(item=>item.category===selected);
  const grid=$('#archiveGrid');
  imageObserver?.disconnect();
  grid.innerHTML=entries.map(item=>{
    const scene=sceneFor(item.sceneId),src=coverFor(scene);
    return '<a class="intel-card tilt-card" href="intel.html?article='+encodeURIComponent(item.articleId||'')+'" aria-label="Read '+escapeHtml(item.kicker)+' dossier">'+
      '<div class="intel-image" data-bg="'+escapeHtml(src)+'" style="background-position:'+escapeHtml(placement(scene))+'"></div>'+
      '<div class="intel-copy"><span class="intel-badge">'+escapeHtml(item.category)+'</span><br><span>'+escapeHtml(item.kicker)+'</span>'+
      '<h3>'+escapeHtml(item.title)+'</h3><p>'+escapeHtml(item.text)+'</p>'+
      '<span class="intel-read">READ THE FULL DOSSIER <b>↗</b></span></div></a>';
  }).join('');
  $('#archiveFilterCount').textContent=entries.length+' DOSSIERS';
  $('#archiveCount').textContent=INTEL.length+' DOSSIERS';
  const load=node=>{
    const src=node.dataset.bg;
    if(!src)return;
    node.style.backgroundImage='url("'+src.replaceAll('"','%22')+'")';
    delete node.dataset.bg;
  };
  const covers=$$('.intel-image[data-bg]',grid);
  if('IntersectionObserver' in window){
    imageObserver=new IntersectionObserver(events=>{
      for(const event of events)if(event.isIntersecting){
        load(event.target);
        imageObserver.unobserve(event.target);
      }
    },{rootMargin:'360px 0px',threshold:0});
    covers.forEach(node=>imageObserver.observe(node));
  }else covers.forEach(load);
}
function choose(next){
  selected=['ALL','PEOPLE','PLACES','SYSTEMS'].includes(next)?next:'ALL';
  $$('#archiveFilters button').forEach(button=>{
    const active=button.dataset.filter===selected;
    button.classList.toggle('active',active);
    button.setAttribute('aria-pressed',String(active));
  });
  const url=new URL(location.href);
  if(selected==='ALL')url.searchParams.delete('category');
  else url.searchParams.set('category',selected);
  if(url.href!==location.href)history.replaceState(null,'',url.pathname+url.search);
  draw();
}
async function boot(){
  const initial=new URLSearchParams(location.search).get('category')?.toUpperCase()||'ALL';
  $$('#archiveFilters button').forEach(button=>
    button.addEventListener('click',()=>choose(button.dataset.filter)));
  try{
    const response=await fetch('./assets/scenes.json',{cache:'force-cache'});
    if(!response.ok)throw new Error('Image manifest unavailable');
    const entries=await response.json();
    scenes=new Map(entries.map(entry=>[entry.id,entry]));
    choose(initial);
  }catch(error){
    console.error('Cannot load Leonida archive:',error);
    $('#archiveLoading').textContent='UNABLE TO LOAD THE ARCHIVE. RELOAD THE PAGE TO RETRY.';
    return;
  }
  $('#archiveLoading').hidden=true;
}
boot();
