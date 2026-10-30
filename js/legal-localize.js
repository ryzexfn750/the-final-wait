/* Localize legal draft pages without changing their original English
   source, links, legal references, registration state or page layout. */
(()=>{
 'use strict';
 const translations=window.__tfwLegalLocales||{};
 const supported=new Set(['en','it','fr','es','de','pt','ru','pl','ja','tr','nl','ko','zh-CN','ar']);
 const read=key=>{try{return localStorage.getItem(key)}catch{return null}};
 function locale(){
  let code=read('tfw_site_language_v1');
  if(!code){
   const cookie=document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
   if(cookie){try{code=decodeURIComponent(cookie[1]).split('/').pop()}catch{}}
  }
  if(!code)code=(navigator.languages&&navigator.languages[0])||navigator.language||'en';
  code=String(code).replace('_','-').toLowerCase();
  if(code==='zh'||code.startsWith('zh-'))code='zh-CN';
  else code=code.split('-')[0];
  return supported.has(code)?code:'en';
 }
 function render(){
  const page=location.pathname.endsWith('community-privacy.html')?'privacy':
             location.pathname.endsWith('community-terms.html')?'terms':null;
  if(!page)return;
  const lang=locale(),pack=translations[lang]?.[page];
  if(!pack)return; // Never present partial/machine-translated legal terms.
  const headers=[...document.querySelectorAll('main > h2')];
  const body=[...document.querySelectorAll('main > p')]
   .filter(node=>!node.matches('.small')&&!node.querySelector('button'));
  if(headers.length!==pack.heads.length||body.length!==pack.body.length)return;
  const strongSite='<strong>The Final Wait</strong> (<a href="https://thefinalwait.com">thefinalwait.com</a>)';
  const support='<a href="support.html">support@thefinalwait.com</a>';
  const agency='<a href="https://www.garanteprivacy.it/">'+pack.agency+'</a>';
  const privacy='<a href="community-privacy.html">'+(translations[lang]?.privacy?.privacyLabel||'Community Privacy Notice')+'</a>';
  const expand=value=>value.replaceAll('{site}',strongSite).replaceAll('{mail}',support)
   .replaceAll('{agency}',agency).replaceAll('{privacy}',privacy);
  document.title=pack.title+' — The Final Wait';
  document.documentElement.lang=lang;
  document.documentElement.dir='ltr';
  const main=document.querySelector('main');
  main.setAttribute('translate','no');main.classList.add('notranslate');
  document.querySelector('main > h1').textContent=pack.title;
  document.querySelector('main > p.small').textContent=pack.stamp;
  const draft=document.querySelector('main > .draft');
  draft.innerHTML='<strong>'+pack.notice[0]+'</strong> '+pack.notice[1];
  headers.forEach((node,i)=>node.textContent=pack.heads[i]);
  body.forEach((node,i)=>node.innerHTML=expand(pack.body[i]));
  const footer=main.querySelector('footer');
  if(page==='privacy'){
   document.getElementById('tfwPrivacyCookiePreferences').textContent=pack.button;
   footer.querySelector('.tfw-legal-credit').textContent=pack.footer[0];
   footer.querySelector('a[href="community-terms.html"]').textContent=pack.footer[1];
   footer.querySelector('a[href="support.html"]').textContent=pack.footer[2];
  }else{
   footer.innerHTML=pack.footer[0]+' <a href="community-privacy.html">'+pack.footer[1]+'</a> · <a href="support.html">'+pack.footer[2]+'</a>';
  }
  if(lang==='ar'){
   main.querySelectorAll('h1,h2,p,.draft,footer').forEach(node=>node.setAttribute('dir','rtl'));
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});
 else render();
})();
