/* Shared in-site Share dialog for all secondary routes. */
(()=>{
 'use strict';
 const trigger=document.getElementById('tfwPageShare');
 if(!trigger)return;
 const backdrop=document.createElement('div');
 backdrop.id='tfwSecondaryModalBackdrop';backdrop.className='modal-backdrop';backdrop.hidden=true;
 const modal=document.createElement('div');
 modal.id='tfwSecondaryShareModal';modal.className='share-modal glass';modal.hidden=true;
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 modal.setAttribute('aria-labelledby','tfwSecondaryShareTitle');modal.tabIndex=-1;
 modal.innerHTML=[
 '<button type="button" class="modal-close" id="tfwSecondaryShareClose" aria-label="Close Share dialog">×</button>',
 '<img class="tfw-share-brand" src="assets/ryze-gtavi-logo-lockup.png" alt="Ryze GTA VI" width="104" loading="eager">',
 '<p class="eyebrow bright">SHARE THE WAIT</p>',
 '<h2 id="tfwSecondaryShareTitle">SHARE THE STORY.</h2>',
 '<p id="tfwSecondaryShareCopy">Bring someone to Leonida.</p>',
 '<div class="share-actions modal-actions">',
 '<button type="button" class="fx-button" data-tfw-share="x">SHARE ON X</button>',
 '<button type="button" class="fx-button" data-tfw-share="whatsapp">SHARE ON WHATSAPP</button>',
 '<button type="button" class="fx-button primary" data-tfw-share="native">SHARE WEBSITE</button>',
 '</div>'
 ].join('');
 document.body.append(backdrop,modal);
 let previousFocus=null;
 const pageUrl=()=>{
   const url=new URL(location.href);
   url.searchParams.delete('tfw_embed');return url.href;
 };
 const shareData=()=>({title:document.title,text:document.title+' — The Final Wait',url:pageUrl()});
 const close=()=>{
   if(modal.hidden)return;
   modal.hidden=true;backdrop.hidden=true;
   document.body.classList.remove('tfw-secondary-modal-open');
   try{previousFocus?.focus({preventScroll:true})}catch{}
 };
 const open=()=>{
   previousFocus=document.activeElement;
   modal.querySelector('#tfwSecondaryShareTitle').textContent=
     document.body.classList.contains('intel-archive-page')?'SHARE THE ARCHIVE.':'SHARE THE STORY.';
   modal.querySelector('#tfwSecondaryShareCopy').textContent=document.title+' — The Final Wait.';
   backdrop.hidden=false;modal.hidden=false;document.body.classList.add('tfw-secondary-modal-open');
   modal.querySelector('#tfwSecondaryShareClose').focus({preventScroll:true});
 };
 trigger.addEventListener('click',open);
 modal.querySelector('#tfwSecondaryShareClose').addEventListener('click',close);
 backdrop.addEventListener('click',close);
 document.addEventListener('keydown',event=>{
   if(modal.hidden)return;
   if(event.key==='Escape'){event.preventDefault();close();return}
   if(event.key!=='Tab')return;
   const focusable=[...modal.querySelectorAll('button:not([disabled])')];
   if(!focusable.length)return;
   const first=focusable[0],last=focusable[focusable.length-1];
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 });
 async function copy(url){
   try{await navigator.clipboard.writeText(url)}
   catch{
     const input=document.createElement('textarea');input.value=url;
     input.style.cssText='position:fixed;opacity:0';document.body.appendChild(input);
     input.select();
     try{document.execCommand('copy')}catch{}
     input.remove();
   }
   const button=modal.querySelector('[data-tfw-share="native"]');
   button.textContent='LINK COPIED';setTimeout(()=>{button.textContent='SHARE WEBSITE'},1700);
 }
 modal.querySelectorAll('[data-tfw-share]').forEach(button=>button.addEventListener('click',async()=>{
   const data=shareData(),kind=button.dataset.tfwShare;
   if(kind==='x')window.open('https://x.com/intent/post?text='+encodeURIComponent(data.text)+'&url='+encodeURIComponent(data.url),'_blank','noopener');
   else if(kind==='whatsapp')window.open('https://wa.me/?text='+encodeURIComponent(data.text+' '+data.url),'_blank','noopener');
   else{
     if(navigator.share){try{await navigator.share(data);close();return}catch(error){if(error.name==='AbortError')return}}
     await copy(data.url);
   }
 }));
})();
