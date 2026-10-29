import {enabled,json,TERMS_VERSION,EMOJIS} from '../../_lib/community.js';
export function onRequestGet({env}){
  const ready=enabled(env);
  return json({
    enabled:ready,
    supabaseUrl:ready?env.SUPABASE_URL:null,
    supabaseAnonKey:ready?env.SUPABASE_ANON_KEY:null,
    termsVersion:TERMS_VERSION,
    emojis:EMOJIS,
    newsletterReady:Boolean(env.SENDER_API_KEY&&env.SENDER_GROUP_ID),
    turnstileSiteKey:ready?env.TURNSTILE_SITE_KEY:null
  });
}
