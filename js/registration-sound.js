/* Shared soundtrack controls inside the registration gate and ticket ceremony.
   Delegates to the already installed global audio master — no second player. */
export function mountRegistrationSoundControls(host){
 if(!host)return()=>{};
 const root=document.createElement('div');
 root.className='tfw-onboarding-audio';
 root.innerHTML='<span class="tfw-onboarding-audio-label">SOUNDTRACK</span>'+
  '<button type="button" class="tfw-onboarding-mute" aria-pressed="false">MUTE</button>'+
  '<input class="tfw-onboarding-volume" type="range" min="0" max="100" step="1" aria-label="Soundtrack volume">'+
  '<output class="tfw-onboarding-volume-value">100%</output>';
 host.appendChild(root);
 const mute=root.querySelector('.tfw-onboarding-mute');
 const slider=root.querySelector('.tfw-onboarding-volume');
 const label=root.querySelector('.tfw-onboarding-volume-value');
 let lastPositive=.7;
 const sync=()=>{
  const state=window.__tfwVolumeState?.()||{volume:1,enabled:true};
  const level=Number(state.volume);
  if(state.enabled&&level>0)lastPositive=level;
  slider.value=String(Math.round(level*100));
  slider.style.setProperty('--onboarding-fill',String(Math.round(level*100))+'%');
  label.textContent=Math.round(level*100)+'%';
  const muted=!state.enabled||level===0;
  mute.textContent=muted?'UNMUTE':'MUTE';
  mute.setAttribute('aria-pressed',String(muted));
 };
 slider.addEventListener('input',()=>{
  const value=Number(slider.value)/100;
  if(value>0)lastPositive=value;
  window.__tfwSetSoundVolume?.(value);
  sync();
 });
 mute.addEventListener('click',()=>{
  const state=window.__tfwVolumeState?.()||{volume:1,enabled:true};
  if(state.enabled&&state.volume>0)window.__tfwSetSoundVolume?.(0);
  else window.__tfwSetSoundVolume?.(lastPositive);
  sync();
 });
 window.addEventListener('tfw:volume-change',sync);
 window.addEventListener('tfw:sound-change',sync);
 sync();
 return()=>{
  window.removeEventListener('tfw:volume-change',sync);
  window.removeEventListener('tfw:sound-change',sync);
  root.remove();
 };
}
