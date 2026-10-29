/* The Final Wait: optional community. Fails closed if external services
   are not configured; countdown/music are never dependent on this module. */
if(!new URLSearchParams(location.search).has('tfw_embed')){
  void initCommunity();
}
async function initCommunity(){
  let settings;
  try{
    const response=await fetch('/api/community/config',{cache:'no-store'});
    if(!response.ok)return;
    settings=await response.json();
    if(!settings.enabled)return;
  }catch{return}
  const template=`
  <button type="button" class="hype-launch" id="hypeLaunch" aria-controls="hypePanel" aria-expanded="false">
    <span class="hype-live-dot"></span> LIVE HYPE <span aria-hidden="true">🔥</span>
  </button>
  <section class="hype-panel" id="hypePanel" hidden aria-label="Live hype community">
    <div class="hype-head">
      <div><strong>THE FINAL WAIT · LIVE HYPE</strong><small id="hypeZone">YOUR TIME ZONE</small></div>
      <button type="button" id="hypeClose" aria-label="Close hype">×</button>
    </div>
    <p class="hype-description">Send reactions to fans counting down in your time zone.</p>
    <div class="hype-stats"><span id="hypeOnline">● OFFLINE</span><span id="hypeState">CONNECTING…</span></div>
    <div id="hypeNotice" class="hype-notice" role="status" aria-live="polite"></div>
    <div id="hypeGuest" hidden>
      <p>Join with your Google account. Your email is private; only your nickname is visible.</p>
      <button type="button" class="hype-primary" id="hypeGoogle">CONTINUE WITH GOOGLE</button>
    </div>
    <form id="hypeProfile" hidden>
      <label for="hypeNickname">PUBLIC NICKNAME</label>
      <input id="hypeNickname" type="text" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" required autocomplete="nickname" placeholder="LeonidaFan" />
      <label class="hype-checkbox"><input id="hypeTerms" type="checkbox" required />
        <span>I accept the <a href="community-terms.html" target="_blank" rel="noopener">Terms of Service</a>
        and have read the <a href="community-privacy.html" target="_blank" rel="noopener">Privacy Notice</a>.</span>
      </label>
      <label class="hype-checkbox"><input id="hypeNewsletter" type="checkbox" />
        <span>I want to receive optional announcements and release reminders by email. I can unsubscribe at any time.</span>
      </label>
      <button type="submit" class="hype-primary">SAVE & JOIN THE HYPE</button>
      <button type="button" class="hype-text-button" id="hypeCancelProfile">BACK</button>
    </form>
    <div id="hypeMember" hidden>
      <div class="hype-member-row"><strong id="hypeName"></strong>
        <button type="button" class="hype-text-button" id="hypeEdit">EDIT PROFILE</button></div>
      <div class="hype-reactions" id="hypeReactions" role="group" aria-label="Send emoji reactions"></div>
      <small class="hype-rule">One reaction every 10 seconds · Only fans in your time zone</small>
      <div class="hype-feed" id="hypeFeed" aria-live="off"></div>
      <div class="hype-member-row">
        <button type="button" class="hype-text-button" id="hypeLogout">SIGN OUT</button>
        <button type="button" class="hype-text-button hype-danger" id="hypeDelete">DELETE ACCOUNT</button>
      </div>
    </div>
    <div class="hype-foot">Fan-made community · Not affiliated with Rockstar Games</div>
  </section>`;
  const wrapper=document.createElement('div');
  wrapper.className='hype-root';
  wrapper.innerHTML=template;
  document.body.appendChild(wrapper);
  const $=s=>wrapper.querySelector(s);
  const state={client:null,profile:null,user:null,ws:null,opened:false,retry:0,
    timer:null,lastSent:0,busy:false,settings,connecting:false};
  const launcher=$('#hypeLaunch'),panel=$('#hypePanel'),notice=$('#hypeNotice');
  const announce=(message,error=false)=>{
    notice.textContent=message;notice.classList.toggle('hype-error',error);
  };
  const zone=()=>{try{return localStorage.getItem('tfw_timezone')||
    Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Rome'}catch{return 'Europe/Rome'}};
  const setZoneLabel=()=>{$('#hypeZone').textContent=zone().replaceAll('_',' ')};
  function view(which){
    for(const key of ['Guest','Profile','Member'])$('#hype'+key).hidden=key!==which;
  }
  async function loadAuth(){
    if(state.client)return state.client;
    const lib=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    state.client=lib.createClient(settings.supabaseUrl,settings.supabaseAnonKey,{
      auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,
        persistSession:true}
    });
    return state.client;
  }
  async function token(){
    const {data,error}=await state.client.auth.getSession();
    if(error||!data?.session?.access_token)throw Error('Session expired; sign in again');
    return data.session.access_token;
  }
  async function api(path,body,method='POST'){
    const access=await token();
    const response=await fetch('/api/community/'+path,{
      method,cache:'no-store',
      headers:{'content-type':'application/json',Authorization:'Bearer '+access},
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    });
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw Error(data.error||'Community service unavailable');
    return data;
  }
  async function refresh(){
    try{
      const client=await loadAuth();
      const {data}=await client.auth.getUser();
      state.user=data?.user||null;
      closeSocket();
      if(!state.user){state.profile=null;view('Guest');return}
      const result=await api('profile',undefined,'GET');
      state.profile=result.profile;
      if(!state.profile||state.profile.terms_version!==settings.termsVersion){
        fillProfile();view('Profile');
      }else{
        showMember();if(state.opened)void connectSocket();
      }
    }catch(e){announce(e.message,true);view('Guest')}
  }
  function fillProfile(){
    $('#hypeNickname').value=state.profile?.nickname||
      state.user?.user_metadata?.preferred_username||'';
    $('#hypeTerms').checked=false; // Current terms require affirmative consent.
    $('#hypeNewsletter').checked=Boolean(state.profile?.marketing_opt_in);
  }
  function showMember(){
    $('#hypeName').textContent=state.profile.nickname;
    const status=state.profile.marketing_status;
    announce(status==='pending'?'Account ready. Newsletter confirmation is pending.':
      status==='pending_unsubscribe'?'Newsletter removal is pending support.':
      'Welcome to your local hype room.');
    view('Member');
  }
  const emojis=settings.emojis||['🔥','🚀','💜','🎉','❤️'];
  for(const emoji of emojis){
    const button=document.createElement('button');
    button.type='button';button.className='hype-emoji';
    button.textContent=emoji;button.setAttribute('aria-label','Send '+emoji);
    button.addEventListener('click',()=>send(emoji));
    $('#hypeReactions').appendChild(button);
  }
  function feed(entries){
    const list=$('#hypeFeed');
    for(const item of entries.slice(-6)){
      if(typeof item.nickname!=='string'||typeof item.emoji!=='string')continue;
      const line=document.createElement('div');
      const name=document.createElement('strong');name.textContent=item.nickname;
      const action=document.createElement('span');action.textContent=' '+item.emoji;
      line.append(name,action);list.prepend(line);
    }
    while(list.children.length>12)list.lastElementChild.remove();
  }
  function closeSocket(){
    clearTimeout(state.timer);state.timer=null;
    if(state.ws){state.ws.onclose=null;state.ws.onerror=null;state.ws.close();state.ws=null}
    state.connecting=false;
    $('#hypeOnline').textContent='● OFFLINE';
  }
  async function connectSocket(){
    if(!state.opened||!state.profile||state.ws||state.connecting)return;
    state.connecting=true;
    setZoneLabel();$('#hypeState').textContent='CONNECTING…';
    try{
      const targetZone=zone();
      const result=await api('ticket',{zone:targetZone});
      if(!state.opened||targetZone!==zone()){state.connecting=false;return}
      const protocol=location.protocol==='https:'?'wss:':'ws:';
      const socket=new WebSocket(protocol+'//'+location.host+
        '/api/community/live?ticket='+encodeURIComponent(result.ticket));
      state.ws=socket;
      socket.onopen=()=>{
        state.connecting=false;state.retry=0;
        $('#hypeState').textContent='CONNECTED';
      };
      socket.onmessage=event=>{
        let message;try{message=JSON.parse(event.data)}catch{return}
        if(message.type==='welcome'||message.type==='hype'){
          $('#hypeOnline').textContent='● '+Number(message.online||0).toLocaleString()+' ONLINE';
        }
        if(message.type==='hype'&&message.latest?.length)feed(message.latest);
        if(message.type==='slow_down')announce('Please wait '+message.wait+'s before reacting.');
      };
      socket.onerror=()=>{$('#hypeState').textContent='UNAVAILABLE'};
      socket.onclose=()=>{
        state.ws=null;state.connecting=false;
        $('#hypeState').textContent='RECONNECTING…';
        $('#hypeOnline').textContent='● OFFLINE';
        if(!state.opened||!state.profile)return;
        state.retry=Math.min(state.retry+1,5);
        state.timer=setTimeout(()=>{void connectSocket()},Math.min(20_000,1200*2**state.retry));
      };
    }catch(e){
      state.connecting=false;$('#hypeState').textContent='UNAVAILABLE';
      announce('Live hype is temporarily unavailable. Countdown is unaffected.',true);
    }
  }
  function send(emoji){
    if(!state.ws||state.ws.readyState!==WebSocket.OPEN){
      announce('Connecting to your local hype room…',true);return;
    }
    const remaining=10_000-(Date.now()-state.lastSent);
    if(remaining>0){announce('Wait '+Math.ceil(remaining/1000)+'s before reacting.');return}
    state.lastSent=Date.now();
    state.ws.send(JSON.stringify({type:'reaction',emoji}));
    announce('Reaction sent '+emoji);
  }
  async function open(){
    state.opened=true;panel.hidden=false;launcher.setAttribute('aria-expanded','true');
    setZoneLabel();
    try{await refresh()}catch(e){announce(e.message,true)}
  }
  function close(){
    state.opened=false;panel.hidden=true;launcher.setAttribute('aria-expanded','false');
    closeSocket();
  }
  launcher.addEventListener('click',()=>state.opened?close():void open());
  $('#hypeClose').addEventListener('click',close);
  $('#hypeGoogle').addEventListener('click',async()=>{
    try{
      const client=await loadAuth();
      sessionStorage.setItem('tfw_hype_open','yes');
      const {error}=await client.auth.signInWithOAuth({
        provider:'google',options:{redirectTo:location.origin+'/'}
      });
      if(error)throw error;
    }catch(e){announce('Google login unavailable: '+e.message,true)}
  });
  $('#hypeProfile').addEventListener('submit',async event=>{
    event.preventDefault();if(state.busy)return;state.busy=true;
    try{
      const result=await api('profile',{
        nickname:$('#hypeNickname').value.trim(),
        acceptedTerms:$('#hypeTerms').checked,termsVersion:settings.termsVersion,
        newsletter:$('#hypeNewsletter').checked
      });
      state.profile=result.profile;showMember();void connectSocket();
    }catch(e){announce(e.message,true)}
    finally{state.busy=false}
  });
  $('#hypeCancelProfile').addEventListener('click',()=>{
    if(state.profile){showMember();void connectSocket()}else view('Guest');
  });
  $('#hypeEdit').addEventListener('click',()=>{closeSocket();fillProfile();view('Profile')});
  $('#hypeLogout').addEventListener('click',async()=>{
    closeSocket();await state.client.auth.signOut();state.profile=null;state.user=null;view('Guest');
  });
  $('#hypeDelete').addEventListener('click',async()=>{
    if(!confirm('Permanently delete your The Final Wait community account?'))return;
    try{
      await api('profile',undefined,'DELETE');closeSocket();
      await state.client.auth.signOut();state.profile=null;state.user=null;
      view('Guest');announce('Your account has been deleted.');
    }catch(e){announce(e.message,true)}
  });
  window.addEventListener('tfw:timezone-change',()=>{
    setZoneLabel();
    if(state.opened&&state.profile){closeSocket();void connectSocket()}
  });
  window.addEventListener('storage',event=>{
    if(event.key==='tfw_timezone'&&state.opened){
      setZoneLabel();if(state.profile){closeSocket();void connectSocket()}
    }
  });
  if(sessionStorage.getItem('tfw_hype_open')==='yes'){
    sessionStorage.removeItem('tfw_hype_open');
    void open();
  }
}
