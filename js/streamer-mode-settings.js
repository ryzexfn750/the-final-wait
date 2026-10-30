/* Streamer Mode belongs in Settings. Device-wide local preference also
 * propagates to the persistent homepage behind the seamless iframe. */
(()=>{
 'use strict';
 const input=document.getElementById('settingsStreamerMode');
 const state=document.getElementById('settingsStreamerModeState');
 if(!input||!state)return;
 const key='tfw_streamer_mode_v1';
 function read(){try{return localStorage.getItem(key)==='on'}catch{return false}}
 function notify(){
  window.dispatchEvent(new Event('tfw:streamer-mode-change'));
  try{
   if(window.parent!==window&&window.parent.location.origin===location.origin)
    window.parent.dispatchEvent(new Event('tfw:streamer-mode-change'));
  }catch{}
 }
 function sync(){
  const enabled=read();
  input.checked=enabled;
  state.textContent=enabled?'ON':'OFF';
  document.documentElement.classList.toggle('tfw-streamer-mode',enabled);
 }
 input.addEventListener('change',()=>{
  try{localStorage.setItem(key,input.checked?'on':'off')}
  catch{
   state.textContent='NOT SAVED';sync();return;
  }
  sync();notify();
 });
 window.addEventListener('storage',event=>{if(event.key===key)sync()});
 sync();
})();
