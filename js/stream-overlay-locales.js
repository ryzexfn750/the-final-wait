/* Native stream overlay labels, independent of the GTranslate site widget. */
(()=>{
'use strict';
const locales={"it":["VERSO LEONIDA","GIORNI","ORE","MINUTI","SECONDI","GTA VI È USCITO!","L'ATTESA È FINITA.","Overlay per streaming","Overlay del countdown di GTA VI"],"fr":["EN ROUTE VERS LEONIDA","JOURS","HEURES","MINUTES","SECONDES","GTA VI EST SORTI !","L'ATTENTE EST FINIE.","Habillage de stream","Compte à rebours GTA VI pour stream"],"es":["RUMBO A LEONIDA","DÍAS","HORAS","MINUTOS","SEGUNDOS","¡GTA VI YA ESTÁ AQUÍ!","LA ESPERA TERMINÓ.","Overlay para directos","Cuenta atrás de GTA VI para directos"],"de":["AUF NACH LEONIDA","TAGE","STUNDEN","MINUTEN","SEKUNDEN","GTA VI IST DA!","DAS WARTEN IST VORBEI.","Stream-Overlay","GTA VI Countdown für Streams"],"pt":["RUMO A LEONIDA","DIAS","HORAS","MINUTOS","SEGUNDOS","GTA VI CHEGOU!","A ESPERA ACABOU.","Overlay para lives","Contagem regressiva de GTA VI para lives"],"ru":["ПУТЬ В ЛЕОНИДУ","ДНИ","ЧАСЫ","МИНУТЫ","СЕКУНДЫ","GTA VI ВЫШЛА!","ОЖИДАНИЕ ОКОНЧЕНО.","Оверлей для стрима","Счётчик GTA VI для трансляции"],"pl":["DROGA DO LEONIDY","DNI","GODZINY","MINUTY","SEKUNDY","GTA VI JUŻ JEST!","KONIEC CZEKANIA.","Nakładka do streamu","Odliczanie do GTA VI na streamie"],"ja":["レオニダへの道","日","時間","分","秒","GTA VI 発売！","待ち時間は終わった。","配信用オーバーレイ","GTA VIの配信用カウントダウン"],"tr":["LEONIDA'YA GİDEN YOL","GÜN","SAAT","DAKİKA","SANİYE","GTA VI ÇIKTI!","BEKLEYİŞ SONA ERDİ.","Yayın katmanı","GTA VI yayın geri sayımı"],"nl":["OP WEG NAAR LEONIDA","DAGEN","UREN","MINUTEN","SECONDEN","GTA VI IS UIT!","HET WACHTEN IS VOORBIJ.","Stream-overlay","GTA VI-aftelling voor streams"],"ko":["레오니다로 향하는 길","일","시간","분","초","GTA VI 출시!","기다림은 끝났습니다.","방송용 오버레이","GTA VI 방송용 카운트다운"],"zh-CN":["前往莱昂尼达","天","小时","分钟","秒","GTA VI 正式发售！","等待结束了。","直播叠加层","GTA VI 直播倒计时"],"ar":["الطريق إلى ليونيدا","أيام","ساعات","دقائق","ثوانٍ","صدرت GTA VI!","انتهى الانتظار.","تراكب البث","العد التنازلي لـ GTA VI أثناء البث"]};
const normalize=v=>{const t=String(v||'').replace('_','-').toLowerCase();return t==='zh'||t.startsWith('zh-')?'zh-CN':t.split('-')[0]};
let stored='';try{stored=localStorage.getItem('tfw_site_language_v1')||''}catch{}
const cookie=document.cookie.match(/googtrans=\\/en\\/([^;]+)/)?.[1]||'';
let selected=normalize(new URLSearchParams(location.search).get('lang')||stored||cookie||navigator.languages?.[0]||navigator.language||'en');
const set=(selector,value)=>{const n=document.querySelector(selector);if(n&&value&&n.textContent!==value)n.textContent=value};
function apply(code){const a=locales[code];if(!a)return;
 document.documentElement.lang=code;document.documentElement.dir='ltr';
 set('.stream-subtitle',a[0]);document.querySelectorAll('.stream-unit small').forEach((n,i)=>{if(a[i+1])n.textContent=a[i+1]});
 set('#streamReleased strong',a[5]);set('#streamReleased span',a[6]);
 document.title='The Final Wait — '+a[7];
 const surface=document.getElementById('streamSurface');if(surface)surface.setAttribute('aria-label',a[8]);
 if(code==='ar')document.querySelectorAll('.stream-subtitle,.stream-unit small,.stream-released strong,.stream-released span').forEach(n=>n.dir='rtl');
}
apply(selected);
window.addEventListener('storage',e=>{if(e.key==='tfw_site_language_v1')apply(normalize(e.newValue))});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==window.parent||window===window.parent)return;
 const settings=e.data;if(settings?.type==='tfw:overlay-settings'&&settings.options&&typeof settings.options.lang==='string')apply(normalize(settings.options.lang));});
})();
