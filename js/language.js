(() => {
  let booted=false;
  let observer=null;

  function stripSelectLanguage(){
    document.querySelectorAll('.gtranslate_wrapper select').forEach(select=>{
      const current=select.value;
      [...select.options].forEach(option=>{
        const label=(option.textContent||'').trim();
        if(/^select\s+language$/i.test(label) || /^choose\s+language$/i.test(label)) option.remove();
      });
      if(current && [...select.options].some(o=>o.value===current)) select.value=current;
      if(select.selectedIndex<0 && select.options.length) select.selectedIndex=0;
    });
  }

  function watchWidget(){
    const wrappers=[...document.querySelectorAll('.gtranslate_wrapper')];
    if(!wrappers.length) return;
    stripSelectLanguage();
    if(observer) observer.disconnect();
    observer=new MutationObserver(()=>stripSelectLanguage());
    wrappers.forEach(wrapper=>observer.observe(wrapper,{childList:true,subtree:true}));
  }

  function boot(){
    if(booted || !document.querySelector('.gtranslate_wrapper')) return;
    booted=true;
    window.gtranslateSettings={
      default_language:'en',
      languages:['en','fr','es','ru','it'],
      wrapper_selector:'.gtranslate_wrapper',
      flag_style:'2d',
      native_language_names:true
    };
    watchWidget();
    const s=document.createElement('script');
    s.src='https://cdn.gtranslate.net/widgets/latest/dropdown.js';
    s.defer=true;
    s.onload=()=>{watchWidget();setTimeout(stripSelectLanguage,80);setTimeout(stripSelectLanguage,400);setTimeout(stripSelectLanguage,1200)};
    s.onerror=()=>document.documentElement.classList.add('translation-unavailable');
    document.body.appendChild(s);
  }
  document.addEventListener('tfw:content-ready',boot,{once:true});
  window.addEventListener('load',()=>setTimeout(boot,700),{once:true});
  setTimeout(boot,2200);
})();
