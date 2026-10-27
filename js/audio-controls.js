/* Shared soundtrack master volume. Each track keeps its existing mix level. */
(()=>{
 'use strict';
 const get=k=>{try{return localStorage.getItem(k)}catch{return null}};
 const put=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
 const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
 const stored=Number(get('tfw_volume'));
 let volume=get('tfw_volume')===null||!Number.isFinite(stored)?1:clamp(stored);
 let enabled=get('tfw_sound')!=='off';
 const factor=()=>enabled?volume:0;
 window.__tfwMasterVolume=factor;
 window.__tfwVolumeState=()=>({volume,enabled});
 let popup,slider,valueLabel,muteButton,anchor;
 function dispatchVolume(){
   window.dispatchEvent(new CustomEvent('tfw:volume-change',{detail:{volume:factor(),level:volume,enabled}}));
 }
 function syncUi(){
   if(!popup)return;
   slider.value=String(Math.round(volume*100));
   slider.style.setProperty('--volume-fill',String(Math.round(volume*100))+'%');
   valueLabel.textContent=String(Math.round(volume*100))+'%';
   muteButton.textContent=enabled?'MUTE':'UNMUTE';
   muteButton.setAttribute('aria-pressed',String(!enabled));
   for(const id of ['soundButton','mobileSoundButton']){
     const b=document.getElementById(id);
     if(!b)continue;
     b.setAttribute('aria-pressed',String(enabled));
     b.setAttribute('aria-label',enabled?'Sound: choose volume or mute':'Sound muted: choose volume or unmute');
     const label=b.querySelector('.sound-label');
     if(label)label.textContent=enabled?'SOUND':'MUTED';
   }
 }
 function enable(next){
   const previous=enabled;
   enabled=Boolean(next);
   if(enabled&&volume===0)volume=.7;
   put('tfw_sound',enabled?'on':'off');
   put('tfw_volume',String(volume));
   if(previous!==enabled)window.dispatchEvent(new CustomEvent('tfw:sound-change',{detail:{enabled}}));
   dispatchVolume();syncUi();
 }
 window.__tfwSetSoundVolume=level=>{
   volume=clamp(level);
   const previous=enabled;
   enabled=volume>0;
   put('tfw_volume',String(volume));
   put('tfw_sound',enabled?'on':'off');
   if(previous!==enabled)window.dispatchEvent(new CustomEvent('tfw:sound-change',{detail:{enabled}}));
   dispatchVolume();syncUi();
 };
 function position(){
   if(!popup||popup.hidden||!anchor)return;
   const r=anchor.getBoundingClientRect(),width=popup.offsetWidth||275;
   const x=Math.max(10,Math.min(innerWidth-width-10,r.right-width));
   popup.style.left=x+'px';
   popup.style.top=Math.max(8,Math.min(innerHeight-(popup.offsetHeight||170)-8,r.bottom+11))+'px';
 }
 function close(){if(!popup)return;popup.hidden=true;if(anchor)anchor.setAttribute('aria-expanded','false');anchor=null}
 function toggle(button){
   if(!popup)return;
   if(!popup.hidden&&anchor===button){close();return}
   if(anchor)anchor.setAttribute('aria-expanded','false');
   anchor=button;popup.hidden=false;
   button.setAttribute('aria-expanded','true');
   syncUi();position();slider.focus({preventScroll:true});
 }
 function boot(){
   if(popup)return;
   popup=document.createElement('div');
   popup.id='tfwSoundPanel';
   popup.className='tfw-volume-popover';
   popup.hidden=true;
   popup.setAttribute('role','group');
   popup.setAttribute('aria-label','Sound volume');
   popup.innerHTML='<div class="tfw-volume-head"><span>MASTER VOLUME</span><strong id="tfwVolumeValue">100%</strong></div><input id="tfwVolumeSlider" type="range" min="0" max="100" step="1" value="100" aria-label="Volume percentage"><div class="tfw-volume-actions"><button type="button" id="tfwMuteToggle" aria-pressed="false">MUTE</button><span>SOUNDTRACK + EFFECTS</span></div>';
   document.body.appendChild(popup);
   slider=popup.querySelector('#tfwVolumeSlider');
   valueLabel=popup.querySelector('#tfwVolumeValue');
   muteButton=popup.querySelector('#tfwMuteToggle');
   slider.addEventListener('input',()=>window.__tfwSetSoundVolume(Number(slider.value)/100));
   muteButton.addEventListener('click',()=>enable(!enabled));
   for(const id of ['soundButton','mobileSoundButton']){
     const b=document.getElementById(id);
     if(!b)continue;
     b.setAttribute('aria-controls','tfwSoundPanel');
     b.setAttribute('aria-haspopup','true');
     b.setAttribute('aria-expanded','false');
     b.title='Adjust soundtrack volume';
     b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggle(b)});
   }
   document.addEventListener('pointerdown',e=>{
     if(popup.hidden||popup.contains(e.target)||(anchor&&anchor.contains(e.target)))return;
     close();
   });
   document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
   window.addEventListener('resize',position,{passive:true});
   window.addEventListener('scroll',()=>{if(!popup.hidden)position()},{passive:true});
   window.addEventListener('tfw:sound-change',e=>{
     enabled=Boolean(e.detail&&e.detail.enabled);
     syncUi();dispatchVolume();
   });
   syncUi();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
})();
