import {enabled,fail,json,authenticate,getProfile,bodyJSON,validZone,createTicket} from '../../_lib/community.js';
export async function onRequestPost({request,env}){
  if(!enabled(env))return fail('Community unavailable',503);
  const user=await authenticate(request,env);
  if(!user)return fail('Authentication required',401);
  let profile;
  try{profile=await getProfile(env,user.id)}catch{return fail('Database unavailable',503)}
  if(!profile?.nickname||!profile?.terms_version)return fail('Complete your profile',403);
  let body;
  try{body=await bodyJSON(request)}catch{return fail('Invalid request',400)}
  if(!validZone(body?.zone))return fail('Invalid time zone',400);
  const ticket=await createTicket(env.HYPE_TICKET_SECRET,{
    sub:user.id,nickname:profile.nickname,zone:body.zone,
    exp:Date.now()+30_000,nonce:crypto.randomUUID()
  });
  return json({ticket,zone:body.zone,expiresIn:30});
}
