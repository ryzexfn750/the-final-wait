/* The Final Wait — creator support and post-entry device notice. */
(()=>{
  'use strict';
  const choiceKey='tfw_experience_prompt_choice_v1';
  const sessionKey='tfw_experience_prompt_seen_v1';
  function init(){
    if(document.getElementById('tfwCoffeeModal'))return;
    const footer=document.querySelector('footer .footer-socials, footer .tfw-footer-creator');
    const coffeeModal=document.createElement('div');
    coffeeModal.id='tfwCoffeeModal';
    coffeeModal.className='tfw-ui-overlay';
    coffeeModal.hidden=true;
    coffeeModal.innerHTML=[
      '<section class="tfw-ui-dialog" role="dialog" aria-modal="true" aria-labelledby="tfwCoffeeTitle" tabindex="-1">',
      '<button type="button" id="tfwCoffeeClose" class="tfw-ui-close" aria-label="Close support window">×</button>',
      '<span class="tfw-ui-eyebrow">SUPPORT THE CREATOR</span>',
      '<div class="tfw-ui-coffee-mark" aria-hidden="true">☕</div>',
      '<h2 id="tfwCoffeeTitle">HELP KEEP THE WAIT ALIVE.</h2>',
      '<p>Hello! I\'m RyzeGTAVI, the creator of The Final Wait, a website dedicated to the countdown to Grand Theft Auto VI.</p>',
      '<p>If you enjoy the project, consider buying me a coffee! Your support helps me keep the website running, improve it and create even more experiences.</p>',
      '<p>Thanks for being part of The Final Wait!</p>',
      '<a id="tfwCoffeeContinue" class="tfw-ui-action" href="https://buymeacoffee.com/ryzegtavi" target="_blank" rel="noopener noreferrer">CONTINUE TO BUY ME A COFFEE</a>',
      '</section>'
    ].join('');
    document.body.appendChild(coffeeModal);
    const experienceModal=document.createElement('div');
    experienceModal.id='tfwExperienceModal';
    experienceModal.className='tfw-ui-overlay';
    experienceModal.hidden=true;
    experienceModal.innerHTML=[
      '<section class="tfw-ui-dialog tfw-experience-dialog" role="dialog" aria-modal="true" aria-labelledby="tfwExperienceTitle" aria-describedby="tfwExperienceDescription" tabindex="-1">',
      '<span class="tfw-ui-eyebrow">BEFORE YOU ENTER LEONIDA</span>',
      '<span class="tfw-experience-mark" aria-hidden="true">✦</span>',
      '<h2 id="tfwExperienceTitle">GET THE FULL EXPERIENCE.</h2>',
      '<p id="tfwExperienceDescription">For the best experience, enjoy The Final Wait on a computer or a powerful device with a large screen. The cinematic scenes, animations and sound are designed to shine there.</p>',
      '<p class="tfw-experience-choice-hint">Would you like to see this reminder on future visits?</p>',
      '<div class="tfw-experience-choices">',
      '<button type="button" id="tfwExperienceRepeat" class="tfw-ui-action">YES, REMIND ME NEXT VISIT</button>',
      '<button type="button" id="tfwExperienceNever" class="tfw-ui-secondary">NO, DON\'T SHOW AGAIN</button>',
      '</div></section>'
    ].join('');
    document.body.appendChild(experienceModal);
    let previousFocus=null,shown=null;
    const updateLock=()=>document.documentElement.classList.toggle('tfw-ui-modal-open',Boolean(shown));
    function openModal(modal){
      if(shown||document.documentElement.classList.contains('tfw-auth-pending'))return;
      previousFocus=document.activeElement;
      shown=modal;modal.hidden=false;updateLock();
      (modal.querySelector('button,a[href]')||modal.querySelector('[tabindex]'))?.focus();
    }
    function closeModal(modal){
      if(shown!==modal)return;
      shown=null;modal.hidden=true;updateLock();
      if(previousFocus?.isConnected)previousFocus.focus();
      previousFocus=null;
    }
    if(footer){
      const trigger=document.createElement('button');
      trigger.id='tfwCoffeeTrigger';
      trigger.type='button';trigger.className='tfw-footer-coffee-button';
      trigger.innerHTML='<span aria-hidden="true">☕</span><span>SUPPORT THE PROJECT</span>';
      trigger.setAttribute('aria-haspopup','dialog');
      trigger.setAttribute('aria-controls','tfwCoffeeModal');
      footer.appendChild(trigger);
      trigger.addEventListener('click',()=>openModal(coffeeModal));
    }
    coffeeModal.querySelector('#tfwCoffeeClose').addEventListener('click',()=>closeModal(coffeeModal));
    coffeeModal.addEventListener('click',event=>{
      if(event.target===coffeeModal)closeModal(coffeeModal);
    });
    coffeeModal.querySelector('#tfwCoffeeContinue').addEventListener('click',()=>closeModal(coffeeModal));
    function rememberChoice(preference){
      try{
        localStorage.setItem(choiceKey,preference);
        sessionStorage.setItem(sessionKey,'yes');
      }catch{}
      closeModal(experienceModal);
    }
    experienceModal.querySelector('#tfwExperienceRepeat').addEventListener('click',()=>rememberChoice('repeat'));
    experienceModal.querySelector('#tfwExperienceNever').addEventListener('click',()=>rememberChoice('never'));
    document.addEventListener('keydown',event=>{
      if(!shown)return;
      if(event.key==='Escape'&&shown===coffeeModal){
        event.preventDefault();event.stopPropagation();closeModal(coffeeModal);return;
      }
      if(event.key!=='Tab')return;
      const controls=[...shown.querySelectorAll('a[href],button:not([disabled])')].filter(el=>!el.hidden);
      if(!controls.length)return;
      const first=controls[0],last=controls[controls.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    },true);
    const embedded=window.self!==window.top&&new URLSearchParams(location.search).has('tfw_embed');
    function offerExperience(){
      if(embedded||shown||document.body.classList.contains('tfw-route-overlay-open')||
         document.documentElement.classList.contains('tfw-auth-pending'))return;
      try{
        if(localStorage.getItem(choiceKey)==='never'||sessionStorage.getItem(sessionKey)==='yes')return;
      }catch{return}
      openModal(experienceModal);
    }
    window.addEventListener('tfw:community-ready',offerExperience);
    window.addEventListener('tfw:seamless-return',()=>{
      if(!embedded)requestAnimationFrame(offerExperience);
    });
    let preview=false;
    try{preview=localStorage.getItem('tfw_community_preview')==='yes'}catch{}
    if(!preview&&!embedded&&document.body.classList.contains('home-page')){
      if(document.readyState==='complete')setTimeout(offerExperience,800);
      else window.addEventListener('load',()=>setTimeout(offerExperience,800),{once:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
