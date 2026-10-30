/* Verify the real community session and registered profile before loading any editor. */
const notice=document.getElementById('overlayAuthCheck');
const protectedContent=document.getElementById('builderProtected');
const setError=message=>{
 notice.querySelector('strong').textContent='ACCOUNT REQUIRED';
 notice.querySelector('p').textContent=message;
 notice.querySelector('a').hidden=false;
};
window.__tfwWhenReady=(async()=>{
 try{
  const configResponse=await fetch('/api/community/config',{cache:'no-store'});
  if(!configResponse.ok)throw Error('Account service unavailable.');
  const config=await configResponse.json();
  if(!config.enabled)throw Error('Account service unavailable.');
  const lib=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  const client=lib.createClient(config.supabaseUrl,config.supabaseAnonKey,{
   auth:{flowType:'pkce',detectSessionInUrl:true,autoRefreshToken:true,persistSession:true}
  });
  const {data:sessionData,error:sessionError}=await client.auth.getSession();
  if(sessionError||!sessionData?.session?.access_token)throw Error('Sign in with Google to use the Streamer Overlay creator.');
  const {data:userData,error:userError}=await client.auth.getUser();
  if(userError||!userData?.user)throw Error('Your session expired. Sign in again.');
  const result=await fetch('/api/community/profile',{cache:'no-store',headers:{Authorization:'Bearer '+sessionData.session.access_token}});
  if(!result.ok)throw Error('Complete your account registration before using this tool.');
  const data=await result.json();
  if(!data.profile?.nickname||data.profile.terms_version!==config.termsVersion)
   throw Error('Complete your account registration before using this tool.');
  protectedContent.hidden=false;notice.hidden=true;
  await import('./streamer-overlay-builder.js?v=6');
  return true;
 }catch(error){
  setError(error?.message||'Please return to the countdown and sign in.');
  return false;
 }
})();
