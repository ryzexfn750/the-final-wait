/* Newsletter controls are deliberately NOT mounted on the user profile.
   Only the site's footer links to this separate optional email page. */
const $=selector=>document.querySelector(selector);
function report(message,error=false){
 const element=$('#profileFeedback');
 element.textContent=message;element.classList.toggle('error',error);
}
const newsletterStatus=value=>{
 const statuses={
  subscribed:'You are subscribed.',
  not_requested:'You are not subscribed.',
  pending:'Your subscription is awaiting confirmation.',
  pending_unsubscribe:'Your unsubscribe is pending. Contact support@thefinalwait.com if it remains pending.'
 };
 $('#profileNewsletterStatus').textContent=statuses[value]||'Status unavailable.';
};
async function initNewsletter(){
 let settings;
 try{
  const response=await fetch('/api/community/config',{cache:'no-store'});
  if(!response.ok)throw Error('Community service unavailable');
  settings=await response.json();
  if(!settings.enabled)throw Error('Community is not enabled here');
 }catch(error){report(error.message,true);return}
 const lib=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
 const client=lib.createClient(settings.supabaseUrl,settings.supabaseAnonKey,{
  auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}
 });
 let challengeId=null,challengeToken='',profile=null,busy=false;
 async function api(method,path,body){
  const session=(await client.auth.getSession()).data?.session;
  if(!session?.access_token)throw Error('Sign in with Google to manage your newsletter');
  const response=await fetch('/api/community/'+path,{
   method,cache:'no-store',
   headers:{Authorization:'Bearer '+session.access_token,'content-type':'application/json'},
   ...(body===undefined?{}:{body:JSON.stringify(body)})
  });
  let result={};try{result=await response.json()}catch{}
  if(!response.ok)throw Error(result.error||'Could not update newsletter');
  return result;
 }
 try{
  const data=await api('GET','profile');
  profile=data.profile;
  if(!profile?.nickname||profile.terms_version!==settings.termsVersion)
   throw Error('Complete community registration before updating email settings');
  $('#profileNewsletter').checked=Boolean(profile.marketing_opt_in);
  newsletterStatus(profile.marketing_status);
  // Keep server-side Turnstile; show it only on this footer-linked page
  // when a user chooses to manage newsletter preferences.
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
 }catch(error){report(error.message,true)}
 $('#profileNewsletterForm').addEventListener('submit',async event=>{
  event.preventDefault();
  if(busy||!profile)return;
  busy=true;$('#profileSaveNewsletter').disabled=true;
  try{
   if(!challengeToken)throw Error('Complete the security check first');
   const result=await api('POST','newsletter',{
    newsletter:$('#profileNewsletter').checked,turnstileToken:challengeToken
   });
   profile.marketing_opt_in=result.marketingOptIn;
   profile.marketing_status=result.marketingStatus;
   newsletterStatus(result.marketingStatus);
   report(result.marketingStatus==='pending_unsubscribe'?
    'Your unsubscribe request is pending confirmation.':
    'Your newsletter preferences have been saved.');
  }catch(error){report(error.message,true)}
  finally{
   busy=false;$('#profileSaveNewsletter').disabled=false;
   challengeToken='';
   if(challengeId!==null)window.turnstile?.reset(challengeId);
  }
 });
}
window.__tfwContentReady=true;
document.dispatchEvent(new Event('tfw:content-ready'));
void initNewsletter().catch(error=>report(error.message,true));
