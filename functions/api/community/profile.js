import {enabled,json,fail,authenticate,adminApi,getProfile,bodyJSON,
  NICKNAME,TERMS_VERSION,senderSubscribe,senderUnsubscribe} from '../../_lib/community.js';
async function handle(request,env,mode){
  if(!enabled(env))return fail('Community not configured',503);
  const user=await authenticate(request,env);
  if(!user)return fail('Sign in with a verified email first',401);
  let old;
  try{old=await getProfile(env,user.id)}catch(error){
    // Sanitized diagnostic applies only to the protected QA branch deployment.
    const qaHost=new URL(request.url).hostname==='community-qa.the-final-wait.pages.dev';
    return fail('Database temporarily unavailable'+(qaHost?': '+error.message:''),503);
  }
  if(mode==='GET')return json({user:{id:user.id,email:user.email},profile:old});
  if(mode==='DELETE'){
    if(old?.marketing_opt_in||old?.marketing_status==='pending_unsubscribe'){
      const removed=await senderUnsubscribe(env,user.email).catch(()=>false);
      if(!removed)return fail('Newsletter removal requires support; account was not deleted',503);
    }
    const response=await adminApi(env,'/auth/v1/admin/users/'+encodeURIComponent(user.id),{
      method:'DELETE'
    });
    if(!response.ok)return fail('Account deletion unavailable',503);
    return json({deleted:true});
  }
  let body;
  try{body=await bodyJSON(request)}catch{return fail('Invalid request body',400)}
  // Turnstile is enforced server-side. Browser-side checks alone are not security.
  const token=String(body?.turnstileToken||'');
  if(token.length<10||token.length>2048)return fail('Complete the security challenge',403);
  const challenge=new URLSearchParams({
    secret:env.TURNSTILE_SECRET,response:token
  });
  let verified;
  try{
    const check=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',body:challenge
    });
    verified=check.ok?await check.json():null;
  }catch{}
  if(!verified?.success||verified.hostname!==new URL(request.url).hostname)
    return fail('Security verification failed. Please retry',403);
  if(body?.acceptedTerms!==true||body?.termsVersion!==TERMS_VERSION)
    return fail('Accept the current terms to continue',400);
  const nickname=String(body?.nickname||'').trim();
  if(!NICKNAME.test(nickname)||/^(admin|administrator|moderator|staff|rockstar|support|system|official|ryzegtavi|thefinalwait|gta6|gtavi)$/i.test(nickname))
    return fail('Nickname: 3–20 letters, numbers or underscores, no reserved words',400);
  // A nickname is immutable once registered, including case. A change must
  // never be accepted through crafted API requests or an obsolete client.
  if(old?.nickname&&nickname!==old.nickname)
    return fail('Nickname cannot be changed after registration',409);
  const wantsEmail=body.newsletter===true;
  const now=new Date().toISOString();
  // Save the verified user's choices before touching the external mailing list:
  // a failed nickname conflict must never subscribe an unregistered user.
  const existingOptIn=Boolean(old?.marketing_opt_in);
  const initialStatus=wantsEmail?
    (existingOptIn&&old.marketing_status==='subscribed'?'subscribed':'pending'):
    ((existingOptIn||old?.marketing_status==='pending_unsubscribe')?
      'pending_unsubscribe':'not_requested');
  const insert={
    id:user.id,nickname,terms_version:TERMS_VERSION,terms_accepted_at:now,
    marketing_opt_in:wantsEmail,marketing_status:initialStatus,
    marketing_consent_at:wantsEmail&&!existingOptIn?now:
      wantsEmail?undefined:null,
    updated_at:now
  };
  if(insert.marketing_consent_at===undefined)delete insert.marketing_consent_at;
  const response=await adminApi(env,'/rest/v1/community_profiles?on_conflict=id',{
    method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},
    body:JSON.stringify(insert)
  });
  if(!response.ok){
    const err=await response.text();
    if(response.status===409||err.includes('23505'))return fail('Nickname already taken',409);
    return fail('Profile could not be saved',503);
  }
  const saved=(await response.json())[0];
  let status=initialStatus;
  if(status==='pending'&&wantsEmail){
    status=await senderSubscribe(env,user.email).catch(()=> 'pending');
  }else if(status==='pending_unsubscribe'&&!wantsEmail){
    const removed=await senderUnsubscribe(env,user.email).catch(()=>false);
    status=removed?'not_requested':'pending_unsubscribe';
  }
  if(status!==initialStatus){
    const update=await adminApi(env,'/rest/v1/community_profiles?id=eq.'+
      encodeURIComponent(user.id),{
      method:'PATCH',headers:{Prefer:'return=representation'},
      body:JSON.stringify({marketing_status:status,updated_at:new Date().toISOString()})
    });
    if(!update.ok)return fail('Newsletter status needs reconciliation; please retry',503);
  }
  return json({user:{id:user.id,email:user.email},
    profile:{...saved,marketing_status:status}});
}
export const onRequestGet=({request,env})=>handle(request,env,'GET');
export const onRequestPost=({request,env})=>handle(request,env,'POST');
export const onRequestDelete=({request,env})=>handle(request,env,'DELETE');
