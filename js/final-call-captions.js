/* THE FINAL WAIT — synced Final Call dialogue subtitles.
 * The countdown's remaining milliseconds are the only timeline clock.
 * English is the master track. Locale packs can be added later by cue id
 * via window.__tfwFinalCallTranslations[languageCode][cueId].
 */
(()=>{
  'use strict';
  // Starts/ends from the supplied transcript. Last-started wins for overlaps.
  const CUES=Object.freeze([
    {id:'ringing',start:384050,end:379230,effect:true,en:'Phone ringing'},
    {id:'connect',start:379230,end:378460,effect:true,en:'Call connects'},
    {id:'michael-1',start:378240,end:367910,speaker:'Michael',en:"You know what's funny? We spent our whole lives trying to escape this city. And every time we thought we made it out... Los Santos pulled us right back in."},
    {id:'franklin-1',start:367910,end:359320,speaker:'Franklin',en:"Maybe that's the point, man. We were so busy chasing the next big thing... we never stopped to appreciate what we already had."},
    {id:'trevor-1',start:359320,end:350220,speaker:'Trevor',en:"Oh, Jesus Christ. Are we seriously doing the emotional goodbye thing? 'Cause I didn't sign up to cry on the phone today."},
    {id:'michael-2',start:350220,end:347500,speaker:'Michael',en:"Nobody's saying goodbye, Trevor."},
    {id:'trevor-2',start:347500,end:339220,speaker:'Trevor',en:"Yeah... well... good. 'Cause as much as I hate you two... it's been one hell of a ride."},
    {id:'franklin-2',start:339220,end:332030,speaker:'Franklin',en:"Thirteen years, man. All the mistakes, all the crazy shit... I wouldn't change a thing."},
    {id:'michael-3',start:332030,end:330310,speaker:'Michael',en:"Neither would I."},
    {id:'trevor-3',start:330310,end:325270,speaker:'Trevor',en:"Okay, maybe a few things. A lot of things, actually."},
    {id:'laughter',start:325270,end:323150,effect:true,en:'Laughter'},
    {id:'franklin-3',start:323150,end:319480,speaker:'Franklin',en:"Whatever comes next... they won't forget us."},
    {id:'michael-4',start:319480,end:317400,speaker:'Michael',en:"No. They won't."},
    {id:'trevor-4',start:317400,end:314220,speaker:'Trevor',en:'So... same time, another life?'},
    {id:'michael-5',start:313350,end:311460,speaker:'Michael',en:'Take care of yourselves.'},
    {id:'franklin-4',start:311360,end:309380,speaker:'Franklin',en:'See you on the other side.'},
    {id:'disconnect',start:309210,end:307420,effect:true,en:'Call disconnects'}
  ]);
  const translations=window.__tfwFinalCallTranslations||Object.create(null);
  window.__tfwFinalCallTranslations=translations;
  const hero=document.getElementById('hero');
  if(!hero)return;

  const root=document.createElement('div');
  root.className='tfw-call-subtitles notranslate';
  root.setAttribute('translate','no'); // never let GTranslate alter timed spans
  root.setAttribute('aria-label','Final Call cinematic subtitles');
  root.setAttribute('aria-live','off');
  const cards=Array.from({length:2},()=>{
    const card=document.createElement('div');
    card.className='tfw-caption-card';
    card.setAttribute('aria-hidden','true');
    const speaker=document.createElement('div');
    speaker.className='tfw-caption-speaker';
    const line=document.createElement('div');
    line.className='tfw-caption-line';
    card.appendChild(speaker);
    card.appendChild(line);
    root.appendChild(card);
    return {card,speaker,line,wordNodes:[]};
  });
  hero.appendChild(root);

  function language(){
    const selector=document.querySelector('.gtranslate_wrapper select');
    const value=String(selector?.value||document.documentElement.lang||'en').toLowerCase();
    return value.split('|').pop().split(/[-_]/)[0]||'en';
  }
  function cueFor(ms){
    for(let i=CUES.length-1;i>=0;i--){
      const c=CUES[i];
      if(ms<=c.start&&ms>c.end)return c;
    }
    return null;
  }
  function weight(word){
    let result=1;
    if(/[,;:]$/.test(word))result+=.35;
    if(/[.!?]['"]?$/.test(word))result+=.55;
    if(/(?:\.\.\.|…)['"]?$/.test(word))result+=.85;
    return result;
  }
  function buildPlan(text){
    const words=text.trim().split(/\s+/).filter(Boolean);
    const weights=words.map(weight);
    const total=weights.reduce((sum,n)=>sum+n,0)||1;
    let accumulated=0;
    const begins=weights.map(w=>{const start=accumulated/total;accumulated+=w;return start});
    // Phrase-based, balanced around punctuation, no giant single-line speech.
    const chunks=[];
    let from=0;
    for(let i=0;i<words.length;i++){
      const count=i-from+1;
      const punctuation=/[,;:!?]$|(?:\.\.\.|…)$|\.$/.test(words[i]);
      if(count>=9||(count>=4&&punctuation)||i===words.length-1){
        chunks.push({from,to:i});
        from=i+1;
      }
    }
    return {words,begins,chunks};
  }
  function spokenIndex(plan,fraction){
    let left=0,right=plan.begins.length;
    while(left<right){
      const middle=(left+right)>>1;
      if(plan.begins[middle]<=fraction)left=middle+1;
      else right=middle;
    }
    return Math.max(0,left-1);
  }

  const planCache=new Map();
  let current=null,chunkNumber=-1,locale='en',text='',visibleSide=0,spoken=-1;
  function hide(){
    if(!current)return;
    current=null;chunkNumber=-1;text='';spoken=-1;
    root.classList.remove('visible');
    cards.forEach(c=>{
      c.card.classList.remove('active');
      c.card.setAttribute('aria-hidden','true');
    });
    hero.removeAttribute('data-tfw-caption');
  }
  function swap(cue,plan,chunk){
    const incoming=cards[1-visibleSide],outgoing=cards[visibleSide];
    const range=plan.chunks[chunk];
    incoming.card.className='tfw-caption-card '+(cue.effect?'effect':cue.speaker.toLowerCase());
    incoming.speaker.textContent=cue.effect?'ON THE LINE':cue.speaker.toUpperCase();
    incoming.line.replaceChildren();
    incoming.wordNodes=[];
    for(let i=range.from;i<=range.to;i++){
      const span=document.createElement('span');
      span.className='tfw-caption-word';
      span.textContent=plan.words[i]+(i===range.to?'':' ');
      incoming.line.appendChild(span);
      incoming.wordNodes.push({index:i,el:span});
    }
    incoming.card.setAttribute('aria-label',incoming.speaker.textContent+': '+plan.words.slice(range.from,range.to+1).join(' '));
    incoming.card.setAttribute('aria-hidden','false');
    incoming.card.classList.add('active');
    outgoing.card.classList.remove('active');
    outgoing.card.setAttribute('aria-hidden','true');
    visibleSide=1-visibleSide;spoken=-1;
  }
  function update(ms){
    if(!Number.isFinite(ms))return;
    const cue=cueFor(ms);
    if(!cue){hide();return}
    const lang=language();
    const localized=translations[lang]?.[cue.id]||cue.en;
    const cacheKey=cue.id+':'+lang+':'+localized;
    if(!planCache.has(cacheKey))planCache.set(cacheKey,buildPlan(localized));
    const plan=planCache.get(cacheKey);
    const p=Math.max(0,Math.min(1,(cue.start-ms)/(cue.start-cue.end)));
    const index=cue.effect?plan.words.length-1:spokenIndex(plan,p);
    const chunk=plan.chunks.findIndex(group=>index>=group.from&&index<=group.to);
    if(cue!==current||chunk!==chunkNumber||lang!==locale||text!==localized){
      current=cue;chunkNumber=chunk;locale=lang;text=localized;
      swap(cue,plan,chunk);
      root.classList.add('visible');
      hero.setAttribute('data-tfw-caption',cue.id);
    }
    if(index!==spoken){
      for(const node of cards[visibleSide].wordNodes){
        node.el.classList.toggle('spoken',node.index<=index);
        node.el.classList.toggle('current',node.index===index);
      }
      spoken=index;
    }
  }
  window.addEventListener('tfw:countdown',event=>update(Number(event.detail?.remaining)));
  const initial=Number(window.__tfwPreviewRemainingMs??window.__tfwLastRemaining);
  if(Number.isFinite(initial))update(initial);
  window.__tfwCallCaptionDebug={
    cues:CUES,sync:update,activeId:()=>current?.id||null,
    currentText:()=>text,currentLanguage:()=>locale,currentChunk:()=>chunkNumber,
    plan:buildPlan
  };
})();
