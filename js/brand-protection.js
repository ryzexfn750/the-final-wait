/* Brand copy is immutable across translation languages. Runs before GTranslate. */
(()=>{
 'use strict';
 const fixed=new Set([
  'THE FINAL WAIT','ROAD TO LEONIDA','THE ROAD TO LEONIDA',
  'THE END OF AN ERA.','Every story has an ending.',
  'THE FINAL WAIT ARCHIVE'
 ]);
 const brandContainers='.brand-copy,.footer-brand,.tfw-final-call-headline';
 const lock=el=>{
  if(!el||el.nodeType!==1||el.closest('.gtranslate_wrapper,.tfw-gate-language-widget'))return;
  if(el.matches(brandContainers)||fixed.has((el.textContent||'').trim())){
   if(el.getAttribute('translate')!=='no')el.setAttribute('translate','no');
   if(!el.classList.contains('notranslate'))el.classList.add('notranslate');
   if(el.dataset.tfwFixedBrand!=='1')el.dataset.tfwFixedBrand='1';
  }else if(el.dataset.tfwFixedBrand==='1'){
   // A dynamic heading may be replaced with a countdown phase label.
   el.removeAttribute('translate');el.classList.remove('notranslate');
   delete el.dataset.tfwFixedBrand;
  }
 };
 const scan=root=>{
  if(!root||root.nodeType!==1)return;
  lock(root);
  root.querySelectorAll(brandContainers).forEach(lock);
  // Static HTML has translate=no already. This pass covers dynamically
  // injected brand text without protecting ordinary UI around it.
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
   if(fixed.has((node.nodeValue||'').trim()))lock(node.parentElement);
  }
 };
 if(typeof MutationObserver==='undefined')return;
 const observer=new MutationObserver(mutations=>{
  const changed=new Set();
  for(const item of mutations){
   if(item.type==='characterData'){if(item.target.parentElement)changed.add(item.target.parentElement)}
   else {
    for(const node of item.addedNodes){
     if(node.nodeType===1)changed.add(node);
     else if(node.nodeType===3&&node.parentElement)changed.add(node.parentElement);
    }
   }
  }
  for(const el of changed)scan(el);
 });
 observer.observe(document.documentElement,{childList:true,characterData:true,subtree:true});
 if(document.body)scan(document.body);
 else document.addEventListener('DOMContentLoaded',()=>scan(document.body),{once:true});
 window.__tfwBrandProtection={scan};
})();
