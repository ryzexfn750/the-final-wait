/* GTranslate remains the translation engine. This is a themed, accessible
   presentation of its real native selector, not a replacement translator. */
(()=>{
  'use strict';
  let booted=false,observer=null;
  const labels={
    en:['EN','ENGLISH','🇬🇧'],fr:['FR','FRANÇAIS','🇫🇷'],
    es:['ES','ESPAÑOL','🇪🇸'],de:['DE','DEUTSCH','🇩🇪'],
    it:['IT','ITALIANO','🇮🇹'],pt:['PT','PORTUGUÊS','🇧🇷'],
    ru:['RU','РУССКИЙ','🇷🇺'],pl:['PL','POLSKI','🇵🇱'],
    ja:['JA','日本語','🇯🇵'],tr:['TR','TÜRKÇE','🇹🇷'],
    nl:['NL','NEDERLANDS','🇳🇱'],ko:['KO','한국어','🇰🇷'],
    'zh-CN':['ZH','简体中文','🇨🇳'],ar:['AR','العربية','🇸🇦']
  };
  const STORE_LANG='tfw_site_language_v1';
  const STORE_MODE='tfw_site_language_mode_v1';
  const read=k=>{try{return localStorage.getItem(k)}catch{return null}};
  const save=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
  const supported=new Set(Object.keys(labels));
  // Mapping is deliberately conservative. Mixed-language countries are chosen
  // using the user's browser preference if it is supported.
  const countryGroups={
    it:'IT,SM,VA',
    fr:'FR,MC',
    es:'ES,MX,AR,CL,CO,PE,VE,EC,BO,PY,UY,CR,CU,DO,GT,HN,NI,SV,PA,PR,GQ',
    de:'DE,AT,LI',
    pt:'BR,PT,AO,MZ,CV,GW,ST,TL',
    ru:'RU,BY',
    pl:'PL',
    ja:'JP',
    tr:'TR',
    nl:'NL,SR',
    ko:'KR,KP',
    'zh-CN':'CN',
    ar:'SA,AE,EG,QA,KW,BH,OM,JO,LB,SY,IQ,YE,DZ,MA,TN,LY,SD,MR,PS,DJ'
  };
  const singleCountry=new Map(Object.entries(countryGroups).flatMap(([lang,values])=>
    values.split(',').map(country=>[country,lang])));
  const mixedCountries=new Set(['BE','CH','LU','CA','SG','KZ','KG']);
  const langFromBrowser=()=>{
    const device=Array.isArray(navigator.languages)?navigator.languages:[navigator.language];
    for(const value of device){
      const tag=String(value||'').toLowerCase();
      const code=/^zh(?:-(?:cn|sg|hans))?$/.test(tag)?
        'zh-CN':tag.split('-')[0];
      if(supported.has(code))return code;
    }
    return 'en';
  };
  function countryLanguage(code){
    if(!/^[A-Z]{2}$/.test(String(code||'')))return 'en';
    const country=String(code).toUpperCase();
    if(mixedCountries.has(country))return langFromBrowser();
    return singleCountry.get(country)||'en';
  }
  function legacyChoice(){
    const value=document.cookie.split(';').map(x=>x.trim())
      .find(x=>x.startsWith('googtrans='));
    if(!value)return null;
    let code=null;
    try{code=languageCode(/\/en\/([a-z]{2}(?:-[a-z]{2,4})?)(?:$|\/)/i.exec(decodeURIComponent(value.slice(10)))?.[1])}
    catch{return null}
    return supported.has(code)?code:null;
  }
  const saved=read(STORE_LANG),mode=read(STORE_MODE);
  const legacy=mode===null?legacyChoice():null;
  let manual=mode==='manual'&&supported.has(saved)||!!legacy;
  let current=manual?(supported.has(saved)?saved:legacy):
    mode==='auto'&&supported.has(saved)?saved:'en';
  let preferredAppliedTo='';
  // GTranslate may set dir="rtl" on the entire page for Arabic. Keep the
  // original physical layout; only individual text runs should be RTL.
  function preserveLayoutDirection(){
    const root=document.documentElement;
    if(root.lang!==current)root.lang=current;
    if(current!=='ar')return;
    if(root.dir!=='ltr')root.dir='ltr';
    if(document.body&&document.body.dir!=='ltr')document.body.dir='ltr';
  }
  preserveLayoutDirection();
  if(typeof MutationObserver!=='undefined'){
    const directionObserver=new MutationObserver(preserveLayoutDirection);
    directionObserver.observe(document.documentElement,{
      attributes:true,attributeFilter:['lang','dir']
    });
    if(document.body)directionObserver.observe(document.body,{
      attributes:true,attributeFilter:['dir']
    });
  }
  window.__tfwPreferredSiteLanguage=()=>current;
  window.__tfwDetectedSiteLanguage=countryLanguage;
  function updateLanguage(code,userChoice=false){
    if(!supported.has(code))code='en';
    if(userChoice){manual=true;save(STORE_MODE,'manual');save(STORE_LANG,code)}
    else if(!manual){save(STORE_MODE,'auto');save(STORE_LANG,code)}
    if(current!==code)preferredAppliedTo='';
    current=code;
    preserveLayoutDirection();
    applyPreferred();
  }
  function applyPreferred(){
    const native=document.querySelector('.gtranslate_wrapper select');
    if(native){
      const option=[...native.options].find(o=>languageCode(o.value)===current);
      if(option){
        if(native.value!==option.value){
          native.value=option.value;
          native.dispatchEvent(new Event('change',{bubbles:true}));
        }
        preferredAppliedTo=current;
      }
    }
    document.querySelectorAll('.tfw-gate-language-widget select').forEach(select=>{
      const option=[...select.options].find(o=>languageCode(o.value)===current);
      if(option)select.value=option.value;
    });
    document.querySelectorAll('.language-widget .tfw-lang-control').forEach(control=>{
      const select=control.parentElement?.querySelector('select');
      if(select)syncControl(control,select);
    });
    // Use hand-reviewed site copy wherever available. The translation widget
    // remains a fallback for editorial content not yet manually localized.
    window.__tfwReviewedI18nApply?.(current);
  }
  function onCountryDetected(event){
    if(manual)return;
    const country=event?.detail?.country||window.__tfwGeoCountry||null;
    updateLanguage(countryLanguage(country));
  }
  window.addEventListener('tfw:timezone-detected',onCountryDetected);
  if(window.__tfwGeoCountry)onCountryDetected({detail:{country:window.__tfwGeoCountry}});
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
    const code=String(value||'en').split('|').pop().trim().toLowerCase();
    return code==='zh-cn'?'zh-CN':code;
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
      const id='tfwLangMenu'+[...document.querySelectorAll('.gtranslate_wrapper, .tfw-gate-language-widget')].indexOf(wrapper);
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
        text.setAttribute('dir','auto');
        const mark=document.createElement('span');
        mark.className='tfw-lang-check';mark.textContent='✓';mark.setAttribute('aria-hidden','true');
        btn.append(flagNode,text,mark);
        btn.addEventListener('click',()=>{
          updateLanguage(code,true);
          syncControl(control,select);closeMenu(control,true);
        });
        popup.appendChild(btn);
      }
      control.dataset.signature=signature;
    }
    syncControl(control,select);
  }
  function watchWidget(){
    const wrappers=[...document.querySelectorAll('.gtranslate_wrapper, .tfw-gate-language-widget')];
    if(!wrappers.length)return;
    stripSelectLanguage();
    wrappers.forEach(mountMenu);
    applyPreferred();
    if(observer)observer.disconnect();
    observer=new MutationObserver(()=>{
      // GTranslate may rebuild its <select> after switching languages.
      stripSelectLanguage();
      wrappers.forEach(mountMenu);
      applyPreferred();
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
      languages:['en','fr','es','de','it','pt','ru','pl','ja','tr','nl','ko','zh-CN','ar'],
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
  window.addEventListener('tfw:registration-gate-mounted',watchWidget);
  window.addEventListener('storage',event=>{
    if(event.key!==STORE_LANG&&event.key!==STORE_MODE)return;
    const code=read(STORE_LANG);
    if(supported.has(code)){
      manual=read(STORE_MODE)==='manual';
      current=code;preserveLayoutDirection();applyPreferred();
    }
  });
  document.addEventListener('tfw:content-ready',boot,{once:true});
  window.addEventListener('load',()=>setTimeout(boot,700),{once:true});
  setTimeout(boot,2200);
})();