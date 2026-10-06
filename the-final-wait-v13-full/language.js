(() => {
  let booted=false;
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
    const s=document.createElement('script');
    s.src='https://cdn.gtranslate.net/widgets/latest/dropdown.js';
    s.defer=true;
    s.onerror=()=>document.documentElement.classList.add('translation-unavailable');
    document.body.appendChild(s);
  }
  document.addEventListener('tfw:content-ready',boot,{once:true});
  window.addEventListener('load',()=>setTimeout(boot,700),{once:true});
  setTimeout(boot,2200);
})();
