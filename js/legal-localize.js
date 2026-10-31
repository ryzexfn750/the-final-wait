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
 function localizeLegalMain(main,page,lang=locale()){
  const pack=translations[lang]?.[page];if(!main||!pack)return false;
  const headers=[...main.querySelectorAll(':scope > h2')];
  const body=[...main.querySelectorAll(':scope > p')].filter(n=>!n.matches('.small')&&!n.querySelector('button'));
  if(headers.length!==pack.heads.length||body.length!==pack.body.length)return false;
  const h1=main.querySelector(':scope > h1'),stamp=main.querySelector(':scope > p.small');
  const draft=main.querySelector(':scope > .draft'),footer=main.querySelector('footer');
  if(!h1||!stamp||!draft||!footer)return false;
  const site='<strong>The Final Wait</strong> (<a href="https://thefinalwait.com">thefinalwait.com</a>)';
  const mail='<a href="support.html">support@thefinalwait.com</a>';
  const agency='<a href="https://www.garanteprivacy.it/">'+pack.agency+'</a>';
  const privacy='<a href="community-privacy.html">'+(translations[lang]?.privacy?.privacyLabel||'Community Privacy Notice')+'</a>';
  const expand=v=>v.replaceAll('{site}',site).replaceAll('{mail}',mail).replaceAll('{agency}',agency).replaceAll('{privacy}',privacy);
  main.setAttribute('translate','no');main.classList.add('notranslate');main.lang=lang;
  h1.textContent=pack.title;stamp.textContent=pack.stamp;
  draft.innerHTML='<strong>'+pack.notice[0]+'</strong> '+pack.notice[1];
  headers.forEach((node,i)=>node.textContent=pack.heads[i]);
  body.forEach((node,i)=>node.innerHTML=expand(pack.body[i]));
  if(page==='privacy'){
   const button=main.querySelector('#tfwPrivacyCookiePreferences');
   const credit=footer.querySelector('.tfw-legal-credit');
   const terms=footer.querySelector('a[href="community-terms.html"]');
   const support=footer.querySelector('a[href="support.html"]');
   if(button)button.textContent=pack.button;
   if(credit)credit.textContent=pack.footer[0];
   if(terms)terms.textContent=pack.footer[1];
   if(support)support.textContent=pack.footer[2];
  }else footer.innerHTML=pack.footer[0]+' <a href="community-privacy.html">'+pack.footer[1]+'</a> · <a href="support.html">'+pack.footer[2]+'</a>';
  main.querySelectorAll('h1,h2,p,.draft,footer').forEach(node=>{
   if(lang==='ar')node.setAttribute('dir','rtl');else node.removeAttribute('dir');
  });
  return true;
 }
 window.__tfwLocalizeLegalMain=localizeLegalMain;
 function render(){
  const page=location.pathname.endsWith('community-privacy.html')?'privacy':
   location.pathname.endsWith('community-terms.html')?'terms':null;
  const lang=locale();
  if(page&&localizeLegalMain(document.querySelector('main'),page,lang)){
   document.title=translations[lang][page].title+' — The Final Wait';
   document.documentElement.lang=lang;document.documentElement.dir='ltr';
  }
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});
 else render();
})();
