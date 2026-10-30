/* The Final Wait — curated, human-authored UI terminology.
   Only text visible to visitors is localized; brands, user data, ticket
   codes, legal prose and editorial articles are intentionally excluded.
   The GTranslate fallback still handles unreviewed long-form copy. */
(()=>{
 'use strict';
 const english=["HOME","TODAY","TIMELINE","LEONIDA INTEL","SHARE","FULLSCREEN","TIME ZONE","SOUND","MUTED","PROFILE","MENU","CLOSE","COUNTDOWN","DAYS","HOURS","MINUTES","SECONDS","MILLISECONDS","RELEASE DATE","CHANGE","CHANGE SCENE","THE GLOBAL MIDNIGHT WAVE","TODAY IN LEONIDA","THE ROAD TO LEONIDA","INSIDE LEONIDA","ALL","PEOPLE","PLACES","SYSTEMS","PRIVACY NOTICE","TERMS & CONDITIONS","SUPPORT"];
 const data={"it":["HOME","OGGI","CRONOLOGIA","DOSSIER LEONIDA","CONDIVIDI","SCHERMO INTERO","FUSO ORARIO","AUDIO","SILENZIATO","PROFILO","MENU","CHIUDI","CONTO ALLA ROVESCIA","GIORNI","ORE","MINUTI","SECONDI","MILLISECONDI","DATA DI USCITA","CAMBIA","CAMBIA SCENA","L'ONDA GLOBALE DELLA MEZZANOTTE","OGGI A LEONIDA","LA STRADA VERSO LEONIDA","DENTRO LEONIDA","TUTTI","PERSONAGGI","LUOGHI","SISTEMI","INFORMATIVA SULLA PRIVACY","TERMINI E CONDIZIONI","ASSISTENZA"],"fr":["ACCUEIL","AUJOURD'HUI","CHRONOLOGIE","DOSSIERS LEONIDA","PARTAGER","PLEIN ÉCRAN","FUSEAU HORAIRE","SON","MUET","PROFIL","MENU","FERMER","COMPTE À REBOURS","JOURS","HEURES","MINUTES","SECONDES","MILLISECONDES","DATE DE SORTIE","MODIFIER","CHANGER DE SCÈNE","LA VAGUE MONDIALE DE MINUIT","AUJOURD'HUI À LEONIDA","EN ROUTE VERS LEONIDA","AU CŒUR DE LEONIDA","TOUT","PERSONNAGES","LIEUX","SYSTÈMES","POLITIQUE DE CONFIDENTIALITÉ","CONDITIONS GÉNÉRALES","ASSISTANCE"],"es":["INICIO","HOY","CRONOLOGÍA","DOSIERES DE LEONIDA","COMPARTIR","PANTALLA COMPLETA","ZONA HORARIA","SONIDO","SILENCIADO","PERFIL","MENÚ","CERRAR","CUENTA ATRÁS","DÍAS","HORAS","MINUTOS","SEGUNDOS","MILISEGUNDOS","FECHA DE LANZAMIENTO","CAMBIAR","CAMBIAR ESCENA","LA OLA MUNDIAL DE MEDIANOCHE","HOY EN LEONIDA","RUMBO A LEONIDA","DENTRO DE LEONIDA","TODOS","PERSONAJES","LUGARES","SISTEMAS","AVISO DE PRIVACIDAD","TÉRMINOS Y CONDICIONES","AYUDA"],"de":["STARTSEITE","HEUTE","ZEITLEISTE","LEONIDA-DOSSIERS","TEILEN","VOLLBILD","ZEITZONE","TON","STUMM","PROFIL","MENÜ","SCHLIESSEN","COUNTDOWN","TAGE","STUNDEN","MINUTEN","SEKUNDEN","MILLISEKUNDEN","ERSCHEINUNGSDATUM","ÄNDERN","SZENE WECHSELN","DIE WELTWEITE MITTERNACHTSWELLE","HEUTE IN LEONIDA","DER WEG NACH LEONIDA","EIN BLICK AUF LEONIDA","ALLE","FIGUREN","ORTE","SYSTEME","DATENSCHUTZHINWEISE","NUTZUNGSBEDINGUNGEN","SUPPORT"],"pt":["INÍCIO","HOJE","LINHA DO TEMPO","DOSSIÊS DE LEONIDA","COMPARTILHAR","TELA CHEIA","FUSO HORÁRIO","SOM","SEM SOM","PERFIL","MENU","FECHAR","CONTAGEM REGRESSIVA","DIAS","HORAS","MINUTOS","SEGUNDOS","MILISSEGUNDOS","DATA DE LANÇAMENTO","ALTERAR","TROCAR CENA","A ONDA MUNDIAL DA MEIA-NOITE","HOJE EM LEONIDA","O CAMINHO ATÉ LEONIDA","POR DENTRO DE LEONIDA","TODOS","PERSONAGENS","LUGARES","SISTEMAS","AVISO DE PRIVACIDADE","TERMOS E CONDIÇÕES","SUPORTE"],"ru":["ГЛАВНАЯ","СЕГОДНЯ","ХРОНОЛОГИЯ","ДОСЬЕ ЛЕОНИДЫ","ПОДЕЛИТЬСЯ","ПОЛНЫЙ ЭКРАН","ЧАСОВОЙ ПОЯС","ЗВУК","БЕЗ ЗВУКА","ПРОФИЛЬ","МЕНЮ","ЗАКРЫТЬ","ОБРАТНЫЙ ОТСЧЁТ","ДНИ","ЧАСЫ","МИНУТЫ","СЕКУНДЫ","МИЛЛИСЕКУНДЫ","ДАТА ВЫХОДА","ИЗМЕНИТЬ","СМЕНИТЬ СЦЕНУ","ПОЛНОЧЬ ШАГАЕТ ПО МИРУ","СЕГОДНЯ В ЛЕОНИДЕ","ПУТЬ В ЛЕОНИДУ","ВНУТРИ ЛЕОНИДЫ","ВСЁ","ПЕРСОНАЖИ","МЕСТА","СИСТЕМЫ","ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ","УСЛОВИЯ ИСПОЛЬЗОВАНИЯ","ПОДДЕРЖКА"],"pl":["STRONA GŁÓWNA","DZISIAJ","OŚ CZASU","AKTA LEONIDY","UDOSTĘPNIJ","PEŁNY EKRAN","STREFA CZASOWA","DŹWIĘK","WYCISZONO","PROFIL","MENU","ZAMKNIJ","ODLICZANIE","DNI","GODZINY","MINUTY","SEKUNDY","MILISEKUNDY","DATA PREMIERY","ZMIEŃ","ZMIEŃ SCENĘ","FALA PÓŁNOCY NA CAŁYM ŚWIECIE","DZIŚ W LEONIDZIE","DROGA DO LEONIDY","WEWNĄTRZ LEONIDY","WSZYSTKO","POSTACIE","MIEJSCA","SYSTEMY","POLITYKA PRYWATNOŚCI","REGULAMIN","POMOC"],"ja":["ホーム","今日","年表","レオニダ情報","共有","全画面表示","タイムゾーン","音声","ミュート中","プロフィール","メニュー","閉じる","カウントダウン","日","時間","分","秒","ミリ秒","発売日","変更","シーンを切り替える","世界を巡る真夜中の波","今日のレオニダ","レオニダへの道","レオニダの世界","すべて","登場人物","場所","システム","プライバシーポリシー","利用規約","サポート"],"tr":["ANA SAYFA","BUGÜN","ZAMAN ÇİZELGESİ","LEONIDA DOSYALARI","PAYLAŞ","TAM EKRAN","SAAT DİLİMİ","SES","SESSİZ","PROFİL","MENÜ","KAPAT","GERİ SAYIM","GÜN","SAAT","DAKİKA","SANİYE","MİLİSANİYE","ÇIKIŞ TARİHİ","DEĞİŞTİR","SAHNEYİ DEĞİŞTİR","DÜNYAYI DOLAŞAN GECE YARISI DALGASI","BUGÜN LEONIDA'DA","LEONIDA'YA GİDEN YOL","LEONIDA'NIN İÇİNDE","TÜMÜ","KARAKTERLER","YERLER","SİSTEMLER","GİZLİLİK BİLDİRİMİ","ŞARTLAR VE KOŞULLAR","DESTEK"],"nl":["START","VANDAAG","TIJDLIJN","LEONIDA-DOSSIERS","DELEN","VOLLEDIG SCHERM","TIJDZONE","GELUID","GEDEMPT","PROFIEL","MENU","SLUITEN","AFTELLEN","DAGEN","UREN","MINUTEN","SECONDEN","MILLISECONDEN","RELEASEDATUM","WIJZIGEN","ANDERE SCÈNE","DE WERELDWIJDE MIDDERNACHTGOLF","VANDAAG IN LEONIDA","OP WEG NAAR LEONIDA","BINNENKIJKEN IN LEONIDA","ALLES","PERSONAGES","LOCATIES","SYSTEMEN","PRIVACYVERKLARING","ALGEMENE VOORWAARDEN","ONDERSTEUNING"],"ko":["홈","오늘","연대표","레오니다 정보","공유","전체 화면","시간대","소리","음소거","프로필","메뉴","닫기","카운트다운","일","시간","분","초","밀리초","출시일","변경","장면 변경","전 세계로 퍼지는 자정의 물결","오늘의 레오니다","레오니다로 가는 길","레오니다 속으로","전체","등장인물","장소","시스템","개인정보 처리방침","이용약관","고객 지원"],"zh-CN":["首页","今日","时间线","莱昂尼达情报","分享","全屏","时区","声音","已静音","个人资料","菜单","关闭","倒计时","天","小时","分钟","秒","毫秒","发售日期","更改","切换场景","席卷全球的午夜浪潮","今日莱昂尼达","通往莱昂尼达之路","走进莱昂尼达","全部","人物","地点","系统","隐私声明","条款与条件","帮助与支持"],"ar":["الرئيسية","اليوم","الخط الزمني","ملفات ليونيدا","مشاركة","ملء الشاشة","المنطقة الزمنية","الصوت","مكتوم","الملف الشخصي","القائمة","إغلاق","العد التنازلي","الأيام","الساعات","الدقائق","الثواني","أجزاء الألف من الثانية","تاريخ الإصدار","تغيير","تغيير المشهد","موجة منتصف الليل حول العالم","اليوم في ليونيدا","الطريق إلى ليونيدا","داخل ليونيدا","الكل","الشخصيات","الأماكن","الأنظمة","إشعار الخصوصية","الشروط والأحكام","الدعم"]};
 const maps=Object.fromEntries(Object.entries(data).map(([lang,values])=>[
  lang,new Map(english.map((source,i)=>[source,values[i]]))]));
 const sourceKeys=new Set(english);
 const saved=new WeakMap();
 let locale='en',observer=null,scheduled=false,applying=false;
 const ignored='script,style,noscript,textarea,pre,code,svg,option,[contenteditable="true"],.gtranslate_wrapper,.tfw-gate-language-widget';
 function render(node){
  const parent=node.parentElement;
  if(!parent||parent.closest(ignored))return;
  const value=node.nodeValue||'',trim=value.trim();
  if(!trim)return;
  let info=saved.get(node);
  if(!info){
   if(!sourceKeys.has(trim))return;
   info={source:trim,leading:value.slice(0,value.indexOf(trim)),
    trailing:value.slice(value.indexOf(trim)+trim.length),last:value};
   saved.set(node,info);
  }else if(value!==info.last){
   if(sourceKeys.has(trim)){
    info.source=trim;info.leading=value.slice(0,value.indexOf(trim));
    info.trailing=value.slice(value.indexOf(trim)+trim.length);
   }else if(trim!==info.source){
    saved.delete(node);return;
   }
  }
  const translated=maps[locale]?.get(info.source)||info.source;
  const replacement=info.leading+translated+info.trailing;
  if(node.nodeValue!==replacement)node.nodeValue=replacement;
  info.last=replacement;
  // GTranslate must not machine-retranslate curated copy.
  if(parent.childElementCount===0&&parent.getAttribute('translate')!=='no'){
   parent.setAttribute('translate','no');
   parent.classList.add('notranslate');
  }
 }
 function apply(nextLocale=locale){
  locale=Object.prototype.hasOwnProperty.call(maps,nextLocale)?nextLocale:'en';
  if(!document.body||typeof document.createTreeWalker!=='function')return;
  if(applying)return;
  applying=true;
  try{
   const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
   let node;
   while((node=walker.nextNode()))render(node);
  }finally{applying=false}
 }
 function queue(){
  if(scheduled)return;
  scheduled=true;
  Promise.resolve().then(()=>{scheduled=false;apply()});
 }
 function boot(){
  if(observer||!document.body||typeof MutationObserver==='undefined')return;
  apply();
  observer=new MutationObserver(queue);
  observer.observe(document.body,{childList:true,characterData:true,subtree:true});
 }
 window.__tfwReviewedI18nApply=apply;
 document.addEventListener('DOMContentLoaded',boot,{once:true});
 window.addEventListener('tfw:registration-gate-mounted',queue);
 if(document.readyState!=='loading')boot();
})();
