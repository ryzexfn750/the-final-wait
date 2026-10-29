import {enabled,json,fail,authenticate,getProfile,adminApi,bodyJSON,
  TERMS_VERSION,senderSubscribe,senderUnsubscribe} from '../../_lib/community.js';

// Changing marketing preferences never modifies the permanent nickname or
// re-writes the original acceptance timestamp for the community terms.
export async function onRequestPost({request,env}){
  if(!enabled(env))return fail('Community unavailable',503);
  const user=await authenticate(request,env);
  if(!user)return fail('Authentication required',401);
  let old;
  try{old=await getProfile(env,user.id)}
  catch{return fail('Profile unavailable',503)}
  if(!old?.nickname||old.terms_version!==TERMS_VERSION)
    return fail('Complete current account registration first',403);
  let body;
  try{body=await bodyJSON(request)}catch{return fail('Invalid request',400)}
  if(typeof body?.newsletter!=='boolean')return fail('Invalid newsletter choice',400);
  const code=String(body.turnstileToken||'');
  if(code.length<10||code.length>2048)return fail('Complete the security check',403);
  const challenge=new URLSearchParams({
    secret:env.TURNSTILE_SECRET,response:code
  });
  let proof;
  try{
    const reply=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',body:challenge
    });
    proof=reply.ok?await reply.json():null;
  }catch{}
  if(!proof?.success||proof.hostname!==new URL(request.url).hostname)
    return fail('Security check failed',403);
  const wanted=body.newsletter;
  if(old.marketing_opt_in===wanted&&
     old.marketing_status!=='pending'&&
     old.marketing_status!=='pending_unsubscribe')
    return json({marketingOptIn:wanted,marketingStatus:old.marketing_status});
  const now=new Date().toISOString();
  const nextStatus=wanted?'pending':'pending_unsubscribe';
  const update=await adminApi(env,'/rest/v1/community_profiles?id=eq.'+
    encodeURIComponent(user.id),{
    method:'PATCH',headers:{Prefer:'return=representation'},
    body:JSON.stringify({
      marketing_opt_in:wanted,marketing_status:nextStatus,
      ...(wanted?{marketing_consent_at:now}:{}),
      updated_at:now
    })
  });
  if(!update.ok)return fail('Could not update your preferences',503);
  let providerStatus=nextStatus;
  try{
    if(wanted)providerStatus=await senderSubscribe(env,user.email);
    else if(await senderUnsubscribe(env,user.email))providerStatus='not_requested';
  }catch{}
  if(providerStatus!==nextStatus){
    const saved=await adminApi(env,'/rest/v1/community_profiles?id=eq.'+
      encodeURIComponent(user.id),{
      method:'PATCH',body:JSON.stringify({
        marketing_status:providerStatus,updated_at:new Date().toISOString()
      })
    });
    if(!saved.ok)providerStatus=nextStatus;
  }
  return json({marketingOptIn:wanted,marketingStatus:providerStatus});
}
