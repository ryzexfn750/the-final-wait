import {enabled,fail,verifyTicket} from '../../_lib/community.js';
export async function onRequestGet({request,env}){
  if(!enabled(env))return fail('Live hype unavailable',503);
  if((request.headers.get('upgrade')||'').toLowerCase()!=='websocket')
    return fail('WebSocket required',426);
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return fail('Invalid origin',403);
  const url=new URL(request.url);
  const ticket=await verifyTicket(env.HYPE_TICKET_SECRET,url.searchParams.get('ticket'));
  if(!ticket)return fail('Invalid or expired ticket',401);
  try{
    const id=env.HYPE_ROOMS.idFromName('tz:'+ticket.zone);
    const stub=env.HYPE_ROOMS.get(id);
    return await stub.fetch(new Request('https://hype.internal/connect',{
      headers:{
        Upgrade:'websocket',
        'X-Hype-User':ticket.sub,
        'X-Hype-Nickname':ticket.nickname,
        'X-Hype-Zone':ticket.zone
      }
    }));
  }catch{return fail('Live reactions temporarily unavailable',503)}
}
