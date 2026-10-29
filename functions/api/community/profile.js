import {enabled,json,fail,authenticate,adminApi,getProfile,bodyJSON,
  NICKNAME,TERMS_VERSION,senderSubscribe,senderUnsubscribe} from '../../_lib/community.js';
async function handle(request,env,mode){
  if(!enabled(env))return fail('Community not configured',503);
  const user=await authenticate(request,env);
  if(!user)return fail('Sign in with a verified email first',401);
  let old;
  try{old=await getProfile(env,user.id)}catch{return fail('Database temporarily unavailable',503)}
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
  if(body?.acceptedTerms!==true||body?.termsVersion!==TERMS_VERSION)
    return fail('Accept the current terms to continue',400);
  const nickname=String(body?.nickname||'').trim();
  if(!NICKNAME.test(nickname)||/^(admin|administrator|moderator|staff|rockstar|support|system|official)$/i.test(nickname))
    return fail('Nickname: 3–20 letters, numbers or underscores, no reserved words',400);
  const wantsEmail=body.newsletter===true;
  let status='not_requested';
  if(wantsEmail){
    status=old?.marketing_opt_in&&old.marketing_status==='subscribed'?
      'subscribed':await senderSubscribe(env,user.email).catch(()=> 'pending');
  }else if(old?.marketing_opt_in||old?.marketing_status==='pending_unsubscribe'){
    const removed=await senderUnsubscribe(env,user.email).catch(()=>false);
    status=removed?'not_requested':'pending_unsubscribe';
  }
  const now=new Date().toISOString();
  const insert={
    id:user.id,nickname,terms_version:TERMS_VERSION,terms_accepted_at:now,
    marketing_opt_in:wantsEmail,marketing_status:status,
    marketing_consent_at:wantsEmail?(old?.marketing_opt_in?undefined:now):null,
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
  const saved=await response.json();
  return json({user:{id:user.id,email:user.email},profile:saved[0]});
}
export const onRequestGet=({request,env})=>handle(request,env,'GET');
export const onRequestPost=({request,env})=>handle(request,env,'POST');
export const onRequestDelete=({request,env})=>handle(request,env,'DELETE');
