/* GTranslate remains the translation engine. This is a themed, accessible
   presentation of its real native selector, not a replacement translator. */
(()=>{
  'use strict';
  let booted=false,observer=null;
  const labels={
    en:['EN','ENGLISH','🇬🇧'],fr:['FR','FRANÇAIS','🇫🇷'],
    es:['ES','ESPAÑOL','🇪🇸'],de:['DE','DEUTSCH','🇩🇪'],
    it:['IT','ITALIANO','🇮🇹']
  };
  function stripSelectLanguage(){
    document.querySelectorAll('.gtranslate_wrapper select').forEach(select=>{
      const current=select.value;
      [...select.options].forEach(option=>{
        const label=(option.textContent||'').trim();
        if(/^select\s+language$/i.test(label)||/^choose\s+language$/i.test(label))option.remove();
      });
      if(current&&[...select.options].some(o=>o.value===current))select.value=current;
      if(select.selectedIndex<0&&select.options.length)select.selectedIndex=0;
    });
  }
  function languageCode(value){
    return String(value||'en').split('|').pop().trim().toLowerCase();
  }
  function closeMenu(control,restoreFocus=false){
    if(!control)return;
    const popup=control.querySelector('.tfw-lang-menu');
    const trigger=control.querySelector('.tfw-lang-trigger');
    if(popup.hidden)return;
    popup.hidden=true;
    trigger.setAttribute('aria-expanded','false');
    control.classList.remove('open');
    if(restoreFocus)trigger.focus();
  }
  function syncControl(control,select){
    if(!select||!control)return;
    const code=languageCode(select.value),entry=labels[code]||[code.toUpperCase(),code.toUpperCase(),'🌐'];
    const abbr=control.querySelector('.tfw-lang-current');
    const trigger=control.querySelector('.tfw-lang-trigger');
    if(abbr.textContent!==entry[0])abbr.textContent=entry[0];
    trigger.setAttribute('aria-label','Language: '+entry[1]+'. Change language');
    control.querySelectorAll('.tfw-lang-option').forEach(btn=>{
      const active=btn.dataset.value===select.value;
      if(btn.getAttribute('aria-selected')!==String(active))
        btn.setAttribute('aria-selected',String(active));
      btn.classList.toggle('selected',active);
    });
  }
  function mountMenu(wrapper){
    const select=wrapper.querySelector('select');
    if(!select)return;
    let control=wrapper.querySelector('.tfw-lang-control');
    if(!control){
      select.classList.add('tfw-lang-native');
      select.setAttribute('aria-hidden','true');
      select.tabIndex=-1;
      control=document.createElement('div');
      control.className='tfw-lang-control';
      const id='tfwLangMenu'+[...document.querySelectorAll('.gtranslate_wrapper')].indexOf(wrapper);
      control.innerHTML=
        '<button type="button" class="tfw-lang-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="'+id+'">'+
          '<span class="tfw-lang-globe" aria-hidden="true">✦</span>'+
          '<span class="tfw-lang-current">EN</span>'+
          '<span class="tfw-lang-chevron" aria-hidden="true"></span></button>'+
        '<div class="tfw-lang-menu" id="'+id+'" role="listbox" aria-label="Choose site language" hidden></div>';
      wrapper.appendChild(control);
      control.querySelector('.tfw-lang-trigger').addEventListener('click',()=>{
        const popup=control.querySelector('.tfw-lang-menu');
        if(!popup.hidden){closeMenu(control);return}
        document.querySelectorAll('.tfw-lang-control.open').forEach(other=>closeMenu(other));
        popup.hidden=false;
        control.classList.add('open');
        control.querySelector('.tfw-lang-trigger').setAttribute('aria-expanded','true');
      });
      control.addEventListener('keydown',event=>{
        const popup=control.querySelector('.tfw-lang-menu');
        const trigger=control.querySelector('.tfw-lang-trigger');
        const buttons=[...popup.querySelectorAll('.tfw-lang-option')];
        if(event.key==='Escape'&&!popup.hidden){
          event.preventDefault();closeMenu(control,true);return;
        }
        if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
        event.preventDefault();
        if(popup.hidden){trigger.click();return}
        const i=buttons.indexOf(document.activeElement);
        const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:
          (i+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;
        buttons[next]?.focus();
      });
    }
    if(!select.dataset.tfwLangBound){
      select.dataset.tfwLangBound='yes';
      select.addEventListener('change',()=>syncControl(control,select));
    }
    const options=[...select.options].filter(option=>labels[languageCode(option.value)]);
    if(!options.length)return;
    const signature=options.map(option=>option.value+':'+option.textContent).join('|');
    const popup=control.querySelector('.tfw-lang-menu');
    if(control.dataset.signature!==signature){
      popup.replaceChildren();
      for(const option of options){
        const code=languageCode(option.value);
        const [abbr,name,flag]=labels[code];
        const btn=document.createElement('button');
        btn.type='button';btn.className='tfw-lang-option';
        btn.setAttribute('role','option');
        btn.dataset.value=option.value;
        const flagNode=document.createElement('span');
        flagNode.className='tfw-lang-flag';flagNode.textContent=flag;flagNode.setAttribute('aria-hidden','true');
        const text=document.createElement('span');
        text.className='tfw-lang-name';text.textContent=name;
        const mark=document.createElement('span');
        mark.className='tfw-lang-check';mark.textContent='✓';mark.setAttribute('aria-hidden','true');
        btn.append(flagNode,text,mark);
        btn.addEventListener('click',()=>{
          if(select.value!==option.value){
            select.value=option.value;
            // Let the existing GTranslate widget perform the actual translation.
            select.dispatchEvent(new Event('change',{bubbles:true}));
          }
          syncControl(control,select);closeMenu(control,true);
        });
        popup.appendChild(btn);
      }
      control.dataset.signature=signature;
    }
    syncControl(control,select);
  }
  function watchWidget(){
    const wrappers=[...document.querySelectorAll('.gtranslate_wrapper')];
    if(!wrappers.length)return;
    stripSelectLanguage();
    wrappers.forEach(mountMenu);
    if(observer)observer.disconnect();
    observer=new MutationObserver(()=>{
      // GTranslate may rebuild its <select> after switching languages.
      stripSelectLanguage();
      wrappers.forEach(mountMenu);
    });
    wrappers.forEach(wrapper=>observer.observe(wrapper,{childList:true,subtree:true}));
  }
  document.addEventListener('click',event=>{
    document.querySelectorAll('.tfw-lang-control.open').forEach(control=>{
      if(!control.contains(event.target))closeMenu(control);
    });
  },true);
  function boot(){
    if(booted||!document.querySelector('.gtranslate_wrapper'))return;
    booted=true;
    window.gtranslateSettings={
      default_language:'en',
      languages:['en','fr','es','de','it'],
      wrapper_selector:'.gtranslate_wrapper',
      flag_style:'2d',
      native_language_names:true
    };
    watchWidget();
    const script=document.createElement('script');
    script.src='https://cdn.gtranslate.net/widgets/latest/dropdown.js';
    script.defer=true;
    script.onload=()=>{
      watchWidget();
      for(const delay of [80,400,1200])setTimeout(watchWidget,delay);
    };
    script.onerror=()=>document.documentElement.classList.add('translation-unavailable');
    document.body.appendChild(script);
  }
  document.addEventListener('tfw:content-ready',boot,{once:true});
  window.addEventListener('load',()=>setTimeout(boot,700),{once:true});
  setTimeout(boot,2200);
})();