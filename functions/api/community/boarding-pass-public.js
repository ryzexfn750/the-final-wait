import {enabled,fail,json,adminApi} from '../../_lib/community.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function onRequestGet({request,env}){
  if(!enabled(env))return fail('Verification unavailable',503);
  const id=new URL(request.url).searchParams.get('id')||'';
  if(!UUID.test(id))return fail('Ticket not found',404);
  try{
    // No auth required: a high-entropy public UUID is a shareable capability.
    // The inner join proves the community profile is still active; deleting
    // the profile cascades the private row and invalidates this public link.
    const url='/rest/v1/community_boarding_passes?public_id=eq.'+
      encodeURIComponent(id)+'&select=public_id,ticket_code,edition,registered_at,community_profiles!inner(nickname)&limit=1';
    const response=await adminApi(env,url);
    if(!response.ok)return fail('Verification temporarily unavailable',503);
    const rows=await response.json();
    const found=rows?.[0];
    if(!found?.community_profiles?.nickname)return fail('Ticket not found',404);
    return json({verified:true,ticket:{
      publicId:found.public_id,ticketCode:found.ticket_code,
      edition:found.edition,registeredAt:found.registered_at,
      nickname:found.community_profiles.nickname
    }});
  }catch{return fail('Verification temporarily unavailable',503)}
}
