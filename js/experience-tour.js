/* First-registration guided overview. Does not interrupt ticket printing,
   audio playback or the user's device reminder choice. */
(()=>{
 'use strict';
 if(!document.body?.classList.contains('home-page')||window!==window.top)return;
 const pendingKey='tfw_tour_pending_user_v1',donePrefix='tfw_site_tour_done_v1:';
 const targets=[
  null,'#hero .countdown-shell','#globalWavePreview .tfw-wave-feature-cta',
  '#today .section-head','#timeline .timeline-controls',
  '#intel .intel-archive-cta','#share .share-actions',
  '.tfw-account-link',null
 ];
 const titles=[
  'WELCOME TO THE FINAL WAIT','LIVE COUNTDOWN','GLOBAL MIDNIGHT WAVE',
  'TODAY IN LEONIDA','ROAD TO LEONIDA','LEONIDA INTEL',
  'SHARE & HYPE','PROFILE & SETTINGS','READY TO EXPLORE'
 ];
 const translations={
  en:{texts:[
   'Discover the main features of the website in a few quick steps.',
   'Follow the live countdown, change the background scene and select your own time zone.',
   'Explore the interactive 3D globe and see midnight travel around the world.',
   'Read the daily feature and discover what is happening on the road to GTA VI.',
   'Browse the important milestones and open each story for more detail.',
   'Explore the archive of people, locations and details from Leonida.',
   'Share the countdown with your friends and join the live community hype.',
   'Open your profile for your collectible ticket. Settings lets you reduce animations and effects.',
   'You are all set. You can replay this guide at any time from Settings.'
  ],controls:['SKIP TOUR','BACK','NEXT','FINISH','STEP']},
  it:{texts:[
   'Scopri le principali funzionalità del sito in pochi semplici passaggi.',
   'Segui il conto alla rovescia, cambia lo sfondo e seleziona il tuo fuso orario.',
   'Esplora il globo 3D interattivo e osserva la mezzanotte avanzare nel mondo.',
   'Leggi l’articolo del giorno e scopri gli aggiornamenti sul percorso verso GTA VI.',
   'Ripercorri gli eventi principali e apri gli articoli per approfondirli.',
   'Esplora l’archivio dedicato ai personaggi, ai luoghi e ai dettagli di Leonida.',
   'Condividi il conto alla rovescia con gli amici e partecipa all’entusiasmo della community.',
   'Nel profilo trovi il tuo biglietto da collezione. Nelle impostazioni puoi ridurre animazioni ed effetti.',
   'Hai tutto ciò che serve! Puoi rivedere questa guida in qualsiasi momento dalle Impostazioni.'
  ],controls:['SALTA LA GUIDA','INDIETRO','AVANTI','TERMINA','PASSAGGIO']},
  fr:{texts:[
   'Découvrez les principales fonctionnalités du site en quelques étapes.',
   'Suivez le compte à rebours, changez de décor et choisissez votre fuseau horaire.',
   'Explorez le globe 3D interactif et regardez minuit parcourir le monde.',
   'Lisez l’article du jour et suivez les actualités autour de GTA VI.',
   'Parcourez les grands événements et ouvrez chaque article pour en savoir plus.',
   'Explorez les dossiers sur les personnages, les lieux et les détails de Leonida.',
   'Partagez le compte à rebours et participez à l’enthousiasme de la communauté.',
   'Votre profil contient votre billet souvenir. Les paramètres permettent de réduire les animations et effets.',
   'Tout est prêt ! Vous pouvez relancer cette visite depuis les paramètres.'
  ],controls:['PASSER LA VISITE','RETOUR','SUIVANT','TERMINER','ÉTAPE']},
  es:{texts:[
   'Descubre las principales funciones del sitio en unos pocos pasos.',
   'Sigue la cuenta atrás, cambia el fondo y elige tu zona horaria.',
   'Explora el globo 3D interactivo y observa cómo llega la medianoche a todo el mundo.',
   'Lee el artículo del día y descubre las novedades sobre GTA VI.',
   'Recorre los principales acontecimientos y abre cada historia para conocer más.',
   'Explora el archivo de personajes, lugares y detalles de Leonida.',
   'Comparte la cuenta atrás y únete a la emoción de la comunidad.',
   'En tu perfil encontrarás el billete de colección. En ajustes puedes reducir animaciones y efectos.',
   '¡Todo listo! Puedes repetir esta guía cuando quieras desde Ajustes.'
  ],controls:['SALTAR GUÍA','ATRÁS','SIGUIENTE','TERMINAR','PASO']},
  de:{texts:[
   'Entdecke die wichtigsten Funktionen der Website in wenigen Schritten.',
   'Verfolge den Countdown, wechsle die Hintergrundszene und wähle deine Zeitzone.',
   'Erkunde den interaktiven 3D-Globus und sieh, wie Mitternacht um die Welt wandert.',
   'Lies den Tagesartikel und entdecke Neuigkeiten rund um GTA VI.',
   'Sieh dir wichtige Meilensteine an und öffne die vollständigen Geschichten.',
   'Entdecke das Archiv über Figuren, Orte und Details aus Leonida.',
   'Teile den Countdown mit Freunden und mach bei der Community mit.',
   'Im Profil findest du dein Sammelticket. Unter Einstellungen kannst du Animationen und Effekte reduzieren.',
   'Fertig! Du kannst diese Führung jederzeit über die Einstellungen wiederholen.'
  ],controls:['TOUR ÜBERSPRINGEN','ZURÜCK','WEITER','FERTIG','SCHRITT']},
  pt:{texts:[
   'Conheça os principais recursos do site em poucos passos.',
   'Acompanhe a contagem regressiva, troque o cenário e selecione seu fuso horário.',
   'Explore o globo 3D interativo e veja a meia-noite chegar pelo mundo.',
   'Leia a matéria do dia e confira as novidades sobre GTA VI.',
   'Navegue pelos principais acontecimentos e abra as histórias completas.',
   'Explore o arquivo de personagens, lugares e detalhes de Leonida.',
   'Compartilhe a contagem regressiva e participe da empolgação da comunidade.',
   'Seu perfil reúne o bilhete colecionável. Nas configurações, reduza animações e efeitos.',
   'Tudo pronto! Você pode rever este guia nas Configurações.'
  ],controls:['PULAR TOUR','VOLTAR','PRÓXIMO','CONCLUIR','ETAPA']},
  ru:{texts:[
   'Познакомьтесь с основными возможностями сайта за несколько шагов.',
   'Следите за обратным отсчётом, меняйте фон и выбирайте свой часовой пояс.',
   'Исследуйте интерактивный 3D-глобус и наблюдайте, как полночь наступает по всему миру.',
   'Читайте материал дня и узнавайте новости о GTA VI.',
   'Просматривайте важные события и открывайте подробные статьи.',
   'Изучайте архив персонажей, мест и деталей Леониды.',
   'Делитесь обратным отсчётом с друзьями и участвуйте в жизни сообщества.',
   'В профиле находится ваш коллекционный билет. В настройках можно уменьшить анимацию и эффекты.',
   'Готово! Это руководство можно снова открыть в настройках.'
  ],controls:['ПРОПУСТИТЬ','НАЗАД','ДАЛЕЕ','ГОТОВО','ШАГ']},
  pl:{texts:[
   'Poznaj najważniejsze funkcje strony w kilku prostych krokach.',
   'Śledź odliczanie, zmieniaj tło i wybierz swoją strefę czasową.',
   'Odkryj interaktywny globus 3D i zobacz, jak północ dociera do kolejnych miejsc.',
   'Przeczytaj artykuł dnia i poznaj najnowsze informacje o GTA VI.',
   'Przejrzyj ważne wydarzenia i otwórz pełne artykuły.',
   'Odkryj archiwum postaci, miejsc i szczegółów Leonidy.',
   'Udostępnij odliczanie znajomym i dołącz do społeczności.',
   'W profilu znajdziesz bilet kolekcjonerski. W ustawieniach ograniczysz animacje i efekty.',
   'Gotowe! Możesz ponownie uruchomić ten przewodnik w Ustawieniach.'
  ],controls:['POMIŃ PRZEWODNIK','WSTECZ','DALEJ','ZAKOŃCZ','KROK']},
  ja:{texts:[
   'サイトの主な機能を簡単なステップでご紹介します。',
   'カウントダウンを確認し、背景シーンやタイムゾーンを変更できます。',
   'インタラクティブな3D地球儀で、世界各地に真夜中が訪れる様子を見られます。',
   '今日の記事を読んで、GTA VI の最新情報をチェックしましょう。',
   '重要な出来事をたどり、各記事の詳細を読めます。',
   'レオニダの人物、場所、さまざまな情報をまとめた記事を探せます。',
   'カウントダウンを友達と共有し、コミュニティの盛り上がりに参加しましょう。',
   'プロフィールでは記念チケットを確認できます。設定ではアニメーションや効果を減らせます。',
   '準備完了！このガイドは設定からいつでも再表示できます。'
  ],controls:['ガイドをスキップ','戻る','次へ','完了','ステップ']},
  tr:{texts:[
   'Sitenin temel özelliklerini birkaç adımda keşfedin.',
   'Geri sayımı izleyin, arka planı değiştirin ve saat diliminizi seçin.',
   'Etkileşimli 3D küreyi keşfedin ve gece yarısının dünyada ilerleyişini izleyin.',
   'Günün yazısını okuyun ve GTA VI hakkındaki gelişmeleri takip edin.',
   'Önemli olayları inceleyin ve ayrıntılar için yazıları açın.',
   'Leonida’nın karakterleri, mekânları ve ayrıntıları hakkındaki arşivi keşfedin.',
   'Geri sayımı arkadaşlarınızla paylaşın ve topluluğun heyecanına katılın.',
   'Profilinizde koleksiyon biletinizi bulabilirsiniz. Ayarlardan animasyonları ve efektleri azaltabilirsiniz.',
   'Hazırsınız! Bu rehberi Ayarlar bölümünden yeniden açabilirsiniz.'
  ],controls:['REHBERİ ATLA','GERİ','İLERİ','BİTİR','ADIM']},
  nl:{texts:[
   'Ontdek de belangrijkste functies van de website in een paar stappen.',
   'Volg de countdown, verander de achtergrond en kies je tijdzone.',
   'Verken de interactieve 3D-wereldbol en zie hoe middernacht de wereld rondgaat.',
   'Lees het artikel van vandaag en ontdek het laatste nieuws over GTA VI.',
   'Blader door belangrijke gebeurtenissen en open de volledige verhalen.',
   'Verken het archief over personages, locaties en details uit Leonida.',
   'Deel de countdown met vrienden en doe mee met de community.',
   'In je profiel vind je je verzamelkaartje. Bij Instellingen kun je animaties en effecten beperken.',
   'Klaar! Je kunt deze rondleiding altijd opnieuw starten via Instellingen.'
  ],controls:['RONDLEIDING OVERSLAAN','TERUG','VOLGENDE','AFRONDEN','STAP']},
  ko:{texts:[
   '몇 단계만으로 사이트의 주요 기능을 알아보세요.',
   '실시간 카운트다운을 확인하고 배경과 시간대를 변경할 수 있습니다.',
   '인터랙티브 3D 지구본에서 전 세계에 자정이 찾아오는 모습을 살펴보세요.',
   '오늘의 기사와 GTA VI 관련 최신 소식을 확인하세요.',
   '주요 사건을 둘러보고 전체 기사를 읽어 보세요.',
   '레오니다의 인물, 장소, 세부 정보를 다룬 자료실을 탐색하세요.',
   '친구들과 카운트다운을 공유하고 커뮤니티의 열기에 참여하세요.',
   '프로필에서 기념 티켓을 확인하고 설정에서 애니메이션과 효과를 줄일 수 있습니다.',
   '준비 완료! 설정에서 언제든 이 안내를 다시 볼 수 있습니다.'
  ],controls:['안내 건너뛰기','뒤로','다음','완료','단계']},
  'zh-CN':{texts:[
   '通过几个简单步骤了解网站的主要功能。',
   '查看实时倒计时，更换背景画面并选择你的时区。',
   '探索交互式 3D 地球，看看午夜如何逐渐抵达世界各地。',
   '阅读每日专题，了解 GTA VI 的最新动态。',
   '浏览重要事件，并打开完整文章了解详情。',
   '探索莱昂尼达的人物、地点与细节资料。',
   '与朋友分享倒计时，参与社区的热烈讨论。',
   '在个人资料中查看收藏纪念票，也可以在设置中减少动画和特效。',
   '一切就绪！你可以随时从设置中重新查看本指南。'
  ],controls:['跳过指南','返回','下一步','完成','步骤']},
  ar:{texts:[
   'تعرّف على أهم ميزات الموقع في بضع خطوات بسيطة.',
   'تابع العد التنازلي المباشر وغيّر الخلفية واختر منطقتك الزمنية.',
   'استكشف الكرة الأرضية التفاعلية ثلاثية الأبعاد وشاهد حلول منتصف الليل حول العالم.',
   'اقرأ مقال اليوم وتابع آخر أخبار GTA VI.',
   'تصفح المحطات المهمة وافتح المقالات الكاملة لمعرفة التفاصيل.',
   'استكشف أرشيف الشخصيات والأماكن والتفاصيل في ليونيدا.',
   'شارك العد التنازلي مع أصدقائك وانضم إلى حماس المجتمع.',
   'ستجد تذكرتك التذكارية في الملف الشخصي. ويمكنك تقليل الحركات والمؤثرات من الإعدادات.',
   'أنت جاهز! يمكنك إعادة تشغيل هذا الدليل في أي وقت من الإعدادات.'
  ],controls:['تخطي الدليل','السابق','التالي','إنهاء','الخطوة']}
 };
 let layer=null,step=0,account=null,retry=0;
 const read=k=>{try{return sessionStorage.getItem(k)}catch{return null}};
 const lang=()=>{
  const value=window.__tfwPreferredSiteLanguage?.()||localStorage.getItem('tfw_site_language_v1')||'en';
  const normalized=String(value).toLowerCase();
  return translations[value]?value:normalized.startsWith('zh')?'zh-CN':translations[normalized.split('-')[0]]?normalized.split('-')[0]:'en';
 };
 const copy=()=>translations[lang()]||translations.en;
 function canOpen(){
  return !document.documentElement.classList.contains('tfw-auth-pending')&&
   !document.documentElement.classList.contains('tfw-ticket-reveal-open')&&
   !document.body.classList.contains('tfw-route-overlay-open')&&
   !document.querySelector('#tfwExperienceModal:not([hidden])')&&
   !document.getElementById('tfwTicketReveal');
 }
 function shades(rect){
  const a=layer.querySelectorAll('.tfw-tour-shade');
  if(!rect){
   a[0].style.cssText='inset:0';a[1].style.display='none';a[2].style.display='none';a[3].style.display='none';
   layer.querySelector('.tfw-tour-target').hidden=true;
   return;
  }
  const x=Math.max(0,rect.left),y=Math.max(0,rect.top);
  const r=Math.min(innerWidth,rect.right),b=Math.min(innerHeight,rect.bottom);
  const positions=[
   [0,0,innerWidth,y],[0,y,x,b-y],[r,y,innerWidth-r,b-y],[0,b,innerWidth,innerHeight-b]
  ];
  a.forEach((element,i)=>{
   const p=positions[i];element.style.display='block';
   element.style.left=p[0]+'px';element.style.top=p[1]+'px';
   element.style.width=Math.max(0,p[2])+'px';element.style.height=Math.max(0,p[3])+'px';
  });
  const target=layer.querySelector('.tfw-tour-target');
  target.hidden=false;target.style.left=x+'px';target.style.top=y+'px';
  target.style.width=Math.max(0,r-x)+'px';target.style.height=Math.max(0,b-y)+'px';
 }
 let mark=null;
 function position(){
  if(!layer)return;
  const selector=targets[step],target=selector?document.querySelector(selector):null;
  if(target){
   const rect=target.getBoundingClientRect(),pad=7;
   if(rect.bottom<0||rect.top>innerHeight){
    target.scrollIntoView({block:'center',behavior:'instant'});
   }
   const now=target.getBoundingClientRect();
   shades({left:now.left-pad,top:now.top-pad,right:now.right+pad,bottom:now.bottom+pad});
  }else shades(null);
 }
 function render(){
  if(!layer)return;
  const c=copy(),ui=layer.querySelector('.tfw-tour-card');
  ui.dir=lang()==='ar'?'rtl':'ltr';
  ui.querySelector('.tfw-tour-progress').textContent=c.controls[4]+' '+(step+1)+' / '+titles.length;
  ui.querySelector('h2').textContent=titles[step];
  ui.querySelector('.tfw-tour-description').textContent=c.texts[step];
  layer.querySelector('[data-tour=skip]').textContent=c.controls[0];
  layer.querySelector('[data-tour=back]').textContent=c.controls[1];
  layer.querySelector('[data-tour=next]').textContent=step===titles.length-1?c.controls[3]:c.controls[2];
  layer.querySelector('[data-tour=back]').disabled=step===0;
  layer.querySelector('.tfw-tour-meter span').style.width=((step+1)/titles.length*100)+'%';
  if(mark)clearTimeout(mark);
  const selector=targets[step],target=selector?document.querySelector(selector):null;
  if(target){
   target.scrollIntoView({block:'center',behavior:'instant'});
   mark=setTimeout(position,70);
  }else position();
  layer.querySelector('[data-tour=next]').focus({preventScroll:true});
 }
 function close(){
  if(!layer)return;
  layer.remove();layer=null;
  document.documentElement.classList.remove('tfw-tour-open');
  window.removeEventListener('resize',position);
  window.removeEventListener('scroll',position,true);
  document.removeEventListener('keydown',trap,true);
  if(mark)clearTimeout(mark);
  try{
   if(account)localStorage.setItem(donePrefix+account,'1');
   sessionStorage.removeItem(pendingKey);
  }catch{}
  document.querySelector('#topbarZoneButton')?.focus({preventScroll:true});
 }
 function trap(event){
  if(!layer)return;
  if(event.key==='Escape'){event.preventDefault();close();return}
  if(event.key==='ArrowRight'){event.preventDefault();step=Math.min(step+1,titles.length-1);render();return}
  if(event.key==='ArrowLeft'){event.preventDefault();step=Math.max(0,step-1);render();return}
  if(event.key!=='Tab')return;
  const list=[...layer.querySelectorAll('button:not(:disabled)')];
  const i=list.indexOf(document.activeElement);
  if(event.shiftKey&&i<=0){event.preventDefault();list[list.length-1].focus()}
  else if(!event.shiftKey&&i===list.length-1){event.preventDefault();list[0].focus()}
 }
 function start(options={}){
  if(layer)return;
  if(!canOpen()){
   if(options.force&&retry++<25)setTimeout(()=>start(options),200);
   return;
  }
  retry=0;
  const pending=read(pendingKey);
  if(!options.force&&!pending)return;
  try{if(!options.force&&localStorage.getItem(donePrefix+pending)==='1')return}catch{}
  account=pending;step=0;
  layer=document.createElement('section');layer.id='tfwSiteTour';layer.className='tfw-site-tour';
  layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');
  layer.setAttribute('translate','no');layer.classList.add('notranslate');
  layer.setAttribute('aria-label','Website guided tour');
  layer.innerHTML='<div class="tfw-tour-shade"></div><div class="tfw-tour-shade"></div><div class="tfw-tour-shade"></div><div class="tfw-tour-shade"></div>'+
   '<div class="tfw-tour-target" aria-hidden="true"></div>'+
   '<div class="tfw-tour-card"><p class="tfw-tour-progress"></p><h2></h2>'+
   '<p class="tfw-tour-description"></p><div class="tfw-tour-meter"><span></span></div>'+
   '<div class="tfw-tour-actions"><button type="button" data-tour="skip"></button>'+
   '<button type="button" data-tour="back"></button>'+
   '<button type="button" data-tour="next"></button></div></div>';
  document.body.appendChild(layer);
  document.documentElement.classList.add('tfw-tour-open');
  layer.querySelector('[data-tour=skip]').addEventListener('click',close);
  layer.querySelector('[data-tour=back]').addEventListener('click',()=>{step=Math.max(0,step-1);render()});
  layer.querySelector('[data-tour=next]').addEventListener('click',()=>{
   if(step===titles.length-1){close();return}
   step++;render();
  });
  document.addEventListener('keydown',trap,true);
  window.addEventListener('resize',position);
  window.addEventListener('scroll',position,true);
  render();
 }
 window.__tfwSiteTourStart=start;
 window.addEventListener('tfw:experience-choice',()=>start());
 window.addEventListener('tfw:site-language-changed',()=>{if(layer)render()});
 window.addEventListener('tfw:community-ready',()=>{
  if(new URLSearchParams(location.search).has('tour'))start({force:true});
 });
 if(new URLSearchParams(location.search).has('tour')){
  if(document.readyState==='complete')setTimeout(()=>start({force:true}),650);
  else window.addEventListener('load',()=>setTimeout(()=>start({force:true}),650),{once:true});
 }
})();