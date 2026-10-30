/* Shared account/tools controls: PROFILE — SETTINGS — LANGUAGE.
   Keep both links out of the original flex sizing to preserve navigation. */
(()=>{
 'use strict';
 const header=document.querySelector('.topbar');
 const profile=header?.querySelector('.tfw-account-link:not(.tfw-settings-link)');
 const languages=header?.querySelector('.language-widget');
 if(!header||!profile||!languages)return;
 let settings=header.querySelector('.tfw-settings-link');
 if(!settings){
  settings=document.createElement('a');
  settings.className='tfw-account-link tfw-settings-link';
  settings.href='settings.html';
  settings.setAttribute('aria-label','Open settings');
  settings.innerHTML='<svg class="tfw-account-person" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
   '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .2.2 1.4 1.1-1.8 3.1-1.8-.7a8.5 8.5 0 0 1-2 .9L15 22h-3.6l-.4-2.4a8.5 8.5 0 0 1-2-.9l-1.8.7-1.8-3.1 1.7-1.3a8.9 8.9 0 0 1 0-2l-1.7-1.3 1.8-3.1 1.8.7a8.5 8.5 0 0 1 2-.9L11.4 6H15l.4 2.4a8.5 8.5 0 0 1 2 .9l1.8-.7 1.8 3.1-1.7 1.3a8.9 8.9 0 0 1 .1 2Z" transform="translate(-1 -1.5) scale(.95)"/></svg>'+
   '<span class="tfw-settings-label">SETTINGS</span>';
  header.insertBefore(settings,languages);
 }
 if(location.pathname.endsWith('/settings.html')){
  settings.setAttribute('aria-current','page');
  profile.removeAttribute('aria-current');
 }
 const addMobile=drawer=>{
  if(!drawer||drawer.querySelector('a[href="settings.html"]'))return;
  const link=document.createElement('a');
  link.href='settings.html';link.textContent='SETTINGS';
  const profileLink=drawer.querySelector('a[href="profile.html"]');
  if(profileLink)profileLink.insertAdjacentElement('afterend',link);
  else drawer.prepend(link);
  link.addEventListener('click',()=>{
   drawer.hidden=true;
   const button=document.querySelector('[aria-controls="'+drawer.id+'"]');
   button?.setAttribute('aria-expanded','false');
  });
 };
 addMobile(document.querySelector('#mobileMenu'));
 addMobile(document.querySelector('#tfwPageDrawer'));
 let scheduled=false;
 const reposition=()=>{
  scheduled=false;
  const rect=languages.getBoundingClientRect();
  if(rect.width<=0)return;
  const settingsRight=Math.max(8,window.innerWidth-rect.left+9);
  settings.style.right=settingsRight+'px';
  profile.style.right=settingsRight+settings.getBoundingClientRect().width+8+'px';
 };
 const schedule=()=>{
  if(scheduled)return;
  scheduled=true;requestAnimationFrame(reposition);
 };
 settings.style.position='absolute';
 profile.style.position='absolute';
 schedule();
 window.addEventListener('resize',schedule,{passive:true});
 window.addEventListener('pageshow',schedule,{passive:true});
 if(typeof ResizeObserver==='function'){
  const observer=new ResizeObserver(schedule);
  observer.observe(languages);
  observer.observe(settings);
  observer.observe(header);
 }
 const mutations=new MutationObserver(schedule);
 mutations.observe(languages,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
 document.addEventListener('tfw:content-ready',schedule);
 setTimeout(schedule,800);
 setTimeout(schedule,2500);
})();
