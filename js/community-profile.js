/* Profile page owns account actions; the parent document owns audio and
   fullscreen navigation when embedded by seamless-navigation.js. */
const $=selector=>document.querySelector(selector);
const feedback=(text,error=false)=>{
  const el=$('#profileFeedback');
  el.textContent=text;el.classList.toggle('error',error);
};
const status=(value)=>{
  const map={
    subscribed:'You are subscribed to optional email updates.',
    not_requested:'You are not subscribed.',
    pending:'Subscription confirmation is pending.',
    pending_unsubscribe:'Your unsubscribe is pending. Contact support@thefinalwait.com if it does not complete.'
  };
  $('#profileNewsletterStatus').textContent=map[value]||'Newsletter status unavailable.';
};
async function initProfile(){
  let settings;
  try{
    const response=await fetch('/api/community/config',{cache:'no-store'});
    if(!response.ok)throw Error('Community configuration unavailable');
    settings=await response.json();
    if(!settings.enabled)throw Error('Community is not enabled in this environment');
  }catch(error){feedback(error.message,true);return}
  let client,profile,user,challengeId=null,challengeToken='',busy=false;
  const auth=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  client=auth.createClient(settings.supabaseUrl,settings.supabaseAnonKey,{
    auth:{flowType:'pkce',detectSessionInUrl:true,
      autoRefreshToken:true,persistSession:true}
  });
  async function api(method,path,body){
    const session=(await client.auth.getSession()).data?.session;
    if(!session?.access_token)throw Error('Please sign in again');
    const response=await fetch('/api/community/'+path,{
      method,cache:'no-store',
      headers:{Authorization:'Bearer '+session.access_token,'content-type':'application/json'},
      ...(body===undefined?{}:{body:JSON.stringify(body)})
    });
    let result={};try{result=await response.json()}catch{}
    if(!response.ok)throw Error(result.error||'Profile service unavailable');
    return result;
  }
  async function challenge(){
    if(challengeId!==null)return;
    if(!window.turnstile){
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.onload=resolve;script.onerror=()=>reject(Error('Security check unavailable'));
        document.head.appendChild(script);
      });
    }
    challengeId=window.turnstile.render($('#profileTurnstile'),{
      sitekey:settings.turnstileSiteKey,theme:'dark',
      callback:token=>{challengeToken=token},
      'expired-callback':()=>{challengeToken=''}
    });
  }
  const topHome=()=>{
    // Seamless navigation uses a same-origin iframe: signing out must also
    // dismiss the parent member shell so that the account gate returns.
    try{window.top.location.assign(new URL('index.html',location.href).href)}
    catch{location.assign('index.html')}
  };
  try{
    const data=await api('GET','profile');
    user=data.user;profile=data.profile;
    if(!user||!profile?.nickname||profile.terms_version!==settings.termsVersion){
      throw Error('Your profile needs registration. Return to the homepage.');
    }
    $('#profileNickname').textContent=profile.nickname;
    $('#profileNewsletter').checked=Boolean(profile.marketing_opt_in);
    status(profile.marketing_status);
    if(!settings.newsletterReady)feedback('Newsletter is currently unavailable; contact support for changes.');
    await challenge();
  }catch(error){feedback(error.message,true)}
  $('#profileNewsletterForm').addEventListener('submit',async event=>{
    event.preventDefault();
    if(busy||!profile)return;busy=true;
    $('#profileSaveNewsletter').disabled=true;
    try{
      if(!challengeToken)throw Error('Complete the security check first.');
      const result=await api('POST','newsletter',{
        newsletter:$('#profileNewsletter').checked,turnstileToken:challengeToken
      });
      profile.marketing_opt_in=result.marketingOptIn;
      profile.marketing_status=result.marketingStatus;
      status(result.marketingStatus);
      feedback(result.marketingStatus==='pending_unsubscribe'?
        'Your unsubscribe request is pending. Contact support if it remains pending.':
        'Your email preference has been saved.');
    }catch(error){feedback(error.message,true)}
    finally{
      busy=false;$('#profileSaveNewsletter').disabled=false;challengeToken='';
      if(challengeId!==null)window.turnstile?.reset(challengeId);
    }
  });
  $('#profileLogout').addEventListener('click',async()=>{
    feedback('Signing out…');
    try{await client.auth.signOut();topHome()}
    catch(error){feedback('Sign out failed: '+error.message,true)}
  });
  $('#profileDelete').addEventListener('click',async()=>{
    if(!confirm('Permanently delete your The Final Wait community account? This cannot be undone.'))return;
    if(!confirm('Confirm permanent account deletion.'))return;
    feedback('Deleting account…');
    try{
      await api('DELETE','profile');
      await client.auth.signOut().catch(()=>{});
      topHome();
    }catch(error){feedback(error.message,true)}
  });
}
// The secondary page loader waits for tfw:content-ready. No article data
// is fetched for profile; the shell itself is ready as soon as the DOM is built.
window.__tfwContentReady=true;
document.dispatchEvent(new Event('tfw:content-ready'));
void initProfile().catch(error=>feedback(error.message,true));
