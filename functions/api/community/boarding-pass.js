import {enabled,fail,json,authenticate,getProfile,adminApi,TERMS_VERSION} from '../../_lib/community.js';
export async function onRequestGet({request,env}){
  if(!enabled(env))return fail('Community unavailable',503);
  const user=await authenticate(request,env);
  if(!user)return fail('Authentication required',401);
  let profile;
  try{profile=await getProfile(env,user.id)}
  catch{return fail('Profile temporarily unavailable',503)}
  if(!profile?.nickname||profile.terms_version!==TERMS_VERSION)
    return fail('Complete your community registration first',403);
  try{
    // RPC atomically issues the ticket if missing. It never changes an issued
    // serial number or edition. The SQL trigger also issues new registrations.
    const response=await adminApi(env,'/rest/v1/rpc/issue_community_boarding_pass',{
      method:'POST',body:JSON.stringify({p_user:user.id})
    });
    if(!response.ok)return fail('Boarding pass temporarily unavailable',503);
    const pass=await response.json();
    if(!pass?.publicId||!pass?.ticketCode)return fail('Boarding pass unavailable',503);
    return json({ticket:pass});
  }catch{return fail('Boarding pass temporarily unavailable',503)}
}
