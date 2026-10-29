// Shared Cloudflare Pages API helpers. Secrets must only exist server-side.
export const TERMS_VERSION = '2026-10-29';
export const NICKNAME = /^[A-Za-z0-9_]{3,20}$/;
export const EMOJIS = ['🔥','🚀','💜','🎉','❤️'];
export const json = (value,status=200)=>new Response(JSON.stringify(value),{
  status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  'x-content-type-options':'nosniff'}
});
export const fail=(message,status=400)=>json({error:message},status);
export function enabled(env){
  return env.COMMUNITY_ENABLED==='true' &&
   Boolean(env.SUPABASE_URL&&env.SUPABASE_ANON_KEY&&env.SUPABASE_SERVICE_ROLE_KEY&&
     env.HYPE_TICKET_SECRET&&env.HYPE_ROOMS&&
     env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET);
}
export function adminApi(env,path,opts={}){
  // Modern sb_secret_ keys are opaque API keys, not bearer JWTs.
  // Legacy service_role JWTs still support Authorization: Bearer.
  const secret=env.SUPABASE_SERVICE_ROLE_KEY;
  return fetch(env.SUPABASE_URL.replace(/\/$/,'')+path,{
    ...opts,headers:{
      apikey:secret,
      ...(secret.startsWith('eyJ')?{Authorization:'Bearer '+secret}:{}),
      'content-type':'application/json',
      ...(opts.headers||{})
    }
  });
}
export async function authenticate(request,env){
  const match=/^Bearer ([A-Za-z0-9._-]{20,})$/.exec(request.headers.get('authorization')||'');
  if(!match)return null;
  const response=await fetch(env.SUPABASE_URL.replace(/\/$/,'')+'/auth/v1/user',{
    headers:{apikey:env.SUPABASE_ANON_KEY,Authorization:'Bearer '+match[1]},
    cf:{cacheTtl:0}
  });
  if(!response.ok)return null;
  const user=await response.json();
  if(!user?.id||!user.email||!user.email_confirmed_at)return null;
  return {id:user.id,email:user.email};
}
export async function getProfile(env,id){
  const response=await adminApi(env,'/rest/v1/community_profiles?id=eq.'+
    encodeURIComponent(id)+'&select=id,nickname,terms_version,marketing_opt_in,marketing_status');
  if(!response.ok){
    // Private QA: expose only upstream HTTP status and a short machine error code.
    // Never include Supabase response text, tokens, URLs with keys or user data.
    let code='';
    try{
      const payload=await response.json();
      const candidate=String(payload?.code||'');
      if(/^[A-Za-z0-9_]{1,24}$/.test(candidate))code=candidate;
    }catch{}
    throw Error('Supabase HTTP '+response.status+(code?' / '+code:''));
  }
  const items=await response.json();
  return items[0]||null;
}
export async function bodyJSON(request){
  if(Number(request.headers.get('content-length')||0)>4096)throw Error('Payload too large');
  const body=await request.text();
  if(body.length>4096)throw Error('Payload too large');
  return JSON.parse(body);
}
const enc=new TextEncoder();
function b64url(bytes){
  let value='';for(const b of bytes)value+=String.fromCharCode(b);
  return btoa(value).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function decodeB64(value){
  const input=value.replace(/-/g,'+').replace(/_/g,'/');
  const binary=atob(input.padEnd(Math.ceil(input.length/4)*4,'='));
  return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
async function hmac(secret,input){
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
  return {key,data:enc.encode(input)};
}
export async function createTicket(secret,payload){
  const body=b64url(enc.encode(JSON.stringify(payload)));
  const {key,data}=await hmac(secret,body);
  const signature=new Uint8Array(await crypto.subtle.sign('HMAC',key,data));
  return body+'.'+b64url(signature);
}
export async function verifyTicket(secret,ticket){
  if(!ticket||ticket.length>1700||!ticket.includes('.'))return null;
  const [body,sig,...extra]=ticket.split('.');
  if(extra.length||!body||!sig)return null;
  try{
    const {key,data}=await hmac(secret,body);
    if(!await crypto.subtle.verify('HMAC',key,decodeB64(sig),data))return null;
    const payload=JSON.parse(new TextDecoder().decode(decodeB64(body)));
    if(!payload||!Number.isFinite(payload.exp)||payload.exp<Date.now()||
       payload.exp>Date.now()+45_000||!payload.sub||!payload.nickname||!payload.zone)return null;
    return payload;
  }catch{return null}
}
export function validZone(zone){
  if(typeof zone!=='string'||zone.length>70||!(/^[A-Za-z_+\-/]+$/.test(zone)))return false;
  try{new Intl.DateTimeFormat('en',{timeZone:zone});return true}catch{return false}
}
export async function senderSubscribe(env,email){
  if(!env.SENDER_API_KEY||!env.SENDER_GROUP_ID)return 'pending';
  const response=await fetch('https://api.sender.net/v2/subscribers',{
    method:'POST',headers:{Authorization:'Bearer '+env.SENDER_API_KEY,
      'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({email,groups:[env.SENDER_GROUP_ID],trigger_automation:false})
  });
  if(response.ok)return 'subscribed';
  // If this address already exists, apply the selected newsletter group.
  if(response.status===409||response.status===422){
    const add=await fetch('https://api.sender.net/v2/subscribers/groups/'+encodeURIComponent(env.SENDER_GROUP_ID),{
      method:'POST',headers:{Authorization:'Bearer '+env.SENDER_API_KEY,
       'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({subscribers:[email],trigger_automation:false})
    });
    if(add.ok)return 'subscribed';
  }
  return 'pending';
}
export async function senderUnsubscribe(env,email){
  if(!env.SENDER_API_KEY||!env.SENDER_GROUP_ID)return false;
  const response=await fetch('https://api.sender.net/v2/subscribers/groups/'+encodeURIComponent(env.SENDER_GROUP_ID),{
    method:'DELETE',headers:{Authorization:'Bearer '+env.SENDER_API_KEY,
      'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({subscribers:[email],trigger_automation:false})
  });
  return response.ok;
}
