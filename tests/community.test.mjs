import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import {TextDecoder,TextEncoder} from 'node:util';
import vm from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('The hype UI is independent of the countdown and load-gated',()=>{
  const script=read('js/community.js');
  assert.match(script,/PUBLIC_COMMUNITY_ENABLED=false/);
  assert.match(script,/tfw_community_preview/);
  assert.match(script,/void initCommunity\(\)/);
  assert.match(script,/tfw-auth-pending/);
  assert.match(script,/tfw-hype-stage/);
  assert.match(script,/tfw-hype-rail/);
  assert.match(script,/\/api\/community\/config/);
  assert.doesNotMatch(read('js/app.js'),/supabase-js|hype-room|HYPE_TICKET_SECRET/);
});
test('The community assets are available on all standalone routes',()=>{
  for(const path of ['index.html','today.html','timeline.html','intel.html','intel-archive.html','profile.html','newsletter.html']){
    const page=read(path);
    assert.match(page,/js\/community\.js\?v=(?:17|18|19)/);
    assert.match(page,/css\/community\.css\?v=12/);
  }
  const build=read('tools/build-cloudflare-pages.mjs');
  assert.match(build,/include:\['\/api\/timezone','\/api\/community\/\*','\/ticket\/\*'\]/);
  assert.match(build,/community-privacy.html/);
  assert.match(build,/community-terms.html/);
  assert.match(build,/profile.html/);
});
test('No privileged credentials shipped to the browser',()=>{
  const client=read('js/community.js');
  assert.doesNotMatch(client,/SUPABASE_SERVICE_ROLE_KEY|SENDER_API_KEY|HYPE_TICKET_SECRET/);
  assert.match(client,/acceptedTerms:\$\('#hypeTerms'\).checked/);
  assert.match(client,/newsletter:\$\('#hypeNewsletter'\).checked/);
  assert.match(client,/flowType:'pkce'/);
});
test('Profile schema is protected and nickname is unique case-insensitively',()=>{
  const sql=read('supabase/community-schema.sql');
  assert.match(sql,/enable row level security/i);
  assert.match(sql,/revoke all on public.community_profiles from anon, authenticated/i);
  assert.match(sql,/unique index.*community_nickname_ci/i);
  assert.match(sql,/lower\(nickname\)/);
});
test('Pages API validates auth and only issues short-lived tickets',()=>{
  const profile=read('functions/api/community/profile.js');
  const ticket=read('functions/api/community/ticket.js');
  const websocket=read('functions/api/community/live.js');
  assert.match(profile,/authenticate\(request,env\)/);
  assert.match(profile,/acceptedTerms!==true/);
  assert.match(ticket,/getProfile\(env,user.id\)/);
  assert.match(ticket,/Date.now\(\)\+30_000/);
  assert.match(websocket,/verifyTicket/);
  assert.match(websocket,/idFromName\('tz:'\+ticket.zone\)/);
});
test('Durable Object uses hibernation and rate-limits reactions',()=>{
  const worker=read('workers/hype-worker/src/index.js');
  assert.match(worker,/acceptWebSocket\(server,\s*\['uid:'\+userId\]\)/);
  assert.match(worker,/serializeAttachment\(/);
  assert.match(worker,/function cooldownFor\(count\)/);
  assert.match(worker,/scheduleFlush\(\)/);
  assert.match(worker,/const ALLOWED=new Set/);
  const cfg=read('workers/hype-worker/wrangler.jsonc');
  assert.match(cfg,/new_sqlite_classes/);
});
test('HMAC tickets are tamper-evident and expire',async()=>{
  const module=read('functions/_lib/community.js').replace(/^export\s+/gm,'');
  const context={
    crypto:webcrypto,TextEncoder,TextDecoder,Date,JSON,Intl,
    btoa:input=>Buffer.from(input,'binary').toString('base64'),
    atob:input=>Buffer.from(input,'base64').toString('binary')
  };
  vm.runInNewContext(module+'\nthis.helpers={createTicket,verifyTicket,validZone,enabled,NICKNAME};',context);
  const {createTicket,verifyTicket,validZone,enabled,NICKNAME}=context.helpers;
  const secret='a-long-cryptographic-signing-secret-at-least-32-characters';
  const payload={sub:'user-1',nickname:'LeonidaFan',zone:'Europe/Rome',
    exp:Date.now()+30_000,nonce:'abcd'};
  const ticket=await createTicket(secret,payload);
  assert.equal((await verifyTicket(secret,ticket)).nickname,'LeonidaFan');
  const changed=(ticket[0]==='A'?'B':'A')+ticket.slice(1);
  assert.equal(await verifyTicket(secret,changed),null);
  const expired=await createTicket(secret,{...payload,exp:Date.now()-1000});
  assert.equal(await verifyTicket(secret,expired),null);
  assert.equal(validZone('America/New_York'),true);
  assert.equal(validZone('not-a-zone'),false);
  assert.equal(NICKNAME.test('John_123'),true);
  assert.equal(NICKNAME.test('<script>'),false);
  assert.equal(enabled({}),false);
});
test('All new JavaScript files parse',()=>{
  const files=[
    'js/community.js','functions/_lib/community.js',
    'functions/api/community/config.js','functions/api/community/profile.js',
    'functions/api/community/ticket.js','functions/api/community/live.js',
    'functions/api/community/newsletter.js','js/community-profile.js',
    'js/community-newsletter.js','js/community-header.js','js/support-experience.js','js/nickname-policy.js',
    'workers/hype-worker/src/index.js'
  ];
  for(const file of files){
    let body=read(file);
    body=body.replace(/^import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?\s*/gm,'');
    body=body.replace(/\bexport default\s*/g,'const __default = ');
    body=body.replace(/\bexport class\s*/g,'class ');
    body=body.replace(/\bexport (async\s+function|function|const)\b/g,'$1');
    assert.doesNotThrow(()=>new Function(body),file);
  }
});

test('Live tickets require acceptance of the current terms (regression)',async()=>{
  const source=read('functions/api/community/ticket.js')
    .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*/,'')
    .replace('export async function onRequestPost','async function onRequestPost');
  const makeHandler=new Function('deps',
    'const {enabled,fail,json,authenticate,getProfile,bodyJSON,validZone,createTicket,TERMS_VERSION}=deps;'+
    'const crypto={randomUUID:()=>"test-nonce"};'+source+'\nreturn onRequestPost;');
  let ticketCalls=0;
  const deps={
    enabled:()=>true,
    fail:(error,status)=>({error,status}),
    json:value=>value,
    authenticate:async()=>({id:'00000000-0000-4000-8000-000000000001'}),
    getProfile:async()=>({nickname:'Tester_1',terms_version:'old-version'}),
    bodyJSON:async()=>({zone:'Europe/Rome'}),
    validZone:()=>true,
    createTicket:async()=>{ticketCalls++;return 'signed-ticket'},
    TERMS_VERSION:'2026-10-29'
  };
  const handler=makeHandler(deps);
  const context={request:{},env:{HYPE_TICKET_SECRET:'mock'}};
  const rejected=await handler(context);
  assert.equal(rejected.status,403);
  assert.equal(ticketCalls,0);
  deps.getProfile=async()=>({nickname:'Tester_1',terms_version:deps.TERMS_VERSION});
  const accepted=await makeHandler(deps)(context);
  assert.equal(accepted.ticket,'signed-ticket');
  assert.equal(ticketCalls,1);
});
test('WebSocket ingress is same-origin and the room avoids unbounded ping replies',()=>{
  const live=read('functions/api/community/live.js');
  assert.match(live,/if\(origin!==new URL\(request.url\).origin\)/);
  const worker=read('workers/hype-worker/src/index.js');
  assert.match(worker,/acceptWebSocket\(server,\['uid:'\+userId\]\)/);
  assert.match(worker,/getWebSockets\('uid:'\+userId\)/);
  assert.match(worker,/const latestPeer=Math.max\(/);
  assert.doesNotMatch(worker,/type:'pong'/);
});
test('SQL privileges are restricted to the service role',()=>{
  const sql=read('supabase/community-schema.sql');
  assert.match(sql,/grant usage on schema public to service_role/i);
  assert.match(sql,/grant select, insert, update, delete on table public.community_profiles to service_role/i);
  assert.doesNotMatch(sql,/grant\s+.+\s+to\s+(anon|authenticated)/i);
});

test('Durable Object expires WebSockets without storing per-socket alarms',async()=>{
  const worker=read('workers/hype-worker/src/index.js')
    .replace(/^import\s+.+?;\s*/,'')
    .replace('export default {','const entrypoint = {')
    .replace('export class HypeRoom','class HypeRoom');
  const fakeBase=class {constructor(ctx,env){this.ctx=ctx;this.env=env}};
  const {HypeRoom,sessionDeadline}=new Function('DurableObject',
    worker+'\nreturn {HypeRoom,sessionDeadline}')(fakeBase);
  const now=Date.now();
  assert.ok(sessionDeadline(now)>=now+15*60_000);
  assert.ok(sessionDeadline(now)<now+30*60_000);
  const closed=[];
  const peers=[
    {deserializeAttachment:()=>({expiresAt:now-1000}),
      close:(code,reason)=>closed.push({code,reason})},
    {deserializeAttachment:()=>({expiresAt:now+60_000}),
      close:()=>{throw Error('Active socket should not close')}}
  ];
  const alarms=[];
  const ctx={
    getWebSockets:()=>peers,
    storage:{setAlarm:async time=>{alarms.push(time)}}
  };
  const room=new HypeRoom(ctx,{});
  room.scheduleFlush=()=>{};
  await room.alarm();
  assert.equal(closed.length,1);
  assert.equal(closed[0].code,4001);
  assert.deepEqual(alarms,[now+60_000]);
  const expiredSocket={
    deserializeAttachment:()=>({uid:'example',last:0,expiresAt:now-1000}),
    close:(code,reason)=>closed.push({code,reason})
  };
  await room.webSocketMessage(expiredSocket,JSON.stringify({type:'reaction',emoji:'🔥'}));
  assert.equal(closed.length,2);
});

test('Protected real WebSocket QA script cannot bypass production limits',()=>{
  const script=read('js/hype-loadtest-qa.js');
  assert.match(script,/location\.hostname!==QA_HOST/);
  assert.match(script,/!\[20,50\]\.includes\(connections\)/);
  assert.match(script,/new WebSocket\(url\)/);
  assert.match(script,/\/api\/community\/ticket/);
  assert.match(script,/\/api\/community\/profile/);
  assert.match(script,/connections\/2/);
  assert.match(script,/item\.socket\.close\(1000,'Load test complete'\)/);
  assert.doesNotMatch(script,/SENDER_API_KEY|SUPABASE_SERVICE_ROLE_KEY|HYPE_TICKET_SECRET/);
});

test('Node high-load benchmark remains local, bounded and uses tagged delivery',()=>{
  const runner=read('tools/benchmark-hype-ws-local.mjs');
  const harness=read('workers/hype-worker/src/local-loadtest.js');
  assert.match(runner,/ALLOWED_SIZES=new Set\(\[250,500,1000\]\)/);
  assert.match(runner,/ALLOWED_CONCURRENCY=new Set\(\[8,16,32\]\)/);
  assert.match(runner,/const HOST='127\.0\.0\.1'/);
  assert.match(runner,/MAX_CLIENT_RSS_MB=600/);
  assert.match(runner,/MAX_TOTAL_MS=120_000/);
  assert.match(runner,/runId=randomBytes\(6\)/);
  assert.match(runner,/item\.nickname===nickname/);
  assert.match(runner,/broadcastComplete/);
  assert.match(runner,/socket\.close\(1000,'Local benchmark finished'\)/);
  assert.match(harness,/run\?'QA'\+run:'LoadTest'/);
  assert.match(harness,/origin&&origin!==url.origin/);
  assert.doesNotMatch(runner,/https:\/\/(?:thefinalwait\.com|[^\s]+\.pages\.dev)/i);
});

test('Long-duration local WebSocket soak is bounded and never contacts Production',()=>{
  const source=read('tools/soak-hype-ws-local.mjs');
  assert.match(source,/const URL_BASE='http:\/\/127\.0\.0\.1:8787\/'/);
  assert.match(source,/const WS_BASE='ws:\/\/127\.0\.0\.1:8787\/connect'/);
  assert.match(source,/const SIZE=1000/);
  assert.match(source,/const PARALLEL=16/);
  assert.match(source,/DURATION_OPTIONS=new Set\(\[20,35\]\)/);
  assert.match(source,/const PROBE_MS=180_000/);
  assert.match(source,/const MAX_RSS_MB=600/);
  assert.match(source,/name="tfw-loadtest-version" content="2"/);
  assert.match(source,/socket\?\.close\(1000,'Local soak complete'\)/);
  assert.match(source,/report:output/);
  assert.doesNotMatch(source,/thefinalwait\.com|\.pages\.dev|SUPABASE_SERVICE_ROLE_KEY|SENDER_API_KEY/);
});
test('Quota estimator counts short-lived socket renewals and hibernation limits',()=>{
  const source=read('tools/hype-free-tier-estimator.mjs');
  assert.match(source,/DAILY_REQUESTS=100_000/);
  assert.match(source,/DAILY_GBS=13_000/);
  assert.match(source,/ceil\(mins\/15\)/);
  assert.match(source,/WS_INCOMING_BILLING_RATIO=20/);
  assert.match(source,/scenario\(5000,4,.05,1\)/);
  assert.match(source,/estimatedPagesFunctionsWorst:sessionsWorst\*2/);
});

test('v2 onboarding must protect all site entry points and preserve footer disclosures',()=>{
  const routes=['index.html','today.html','timeline.html','intel.html',
    'intel-archive.html','profile.html','newsletter.html'];
  for(const path of routes){
    const html=read(path);
    assert.match(html,/tfw-auth-pending/);
    assert.match(html,/tfw-account-link/);
    assert.match(html,/profile\.html/);
    assert.match(html,/community-privacy\.html/);
    assert.match(html,/community-terms\.html/);
  }
  const nav=read('js/seamless-navigation.js');
  assert.match(nav,/intel-archive\.html','profile\.html/);
  assert.match(read('css/community.css'),/tfw-auth-gate/);
});
test('Seven requested emoji are identical on the API, Durable Object and UI',()=>{
  const shared=read('functions/_lib/community.js');
  const worker=read('workers/hype-worker/src/index.js');
  const client=read('js/community.js');
  const emojis=['🔥','🚀','🥳','🎉','🌴','🩷','💜'];
  for(const emoji of emojis){
    assert.ok(shared.includes(emoji));
    assert.ok(worker.includes(emoji));
    assert.ok(client.includes(emoji));
  }
  assert.match(client,/item\.nickname/);
  assert.match(client,/name\.textContent=item\.nickname/);
  assert.match(client,/state\.nextAllowed/);
  assert.match(client,/tfw-hype-intensity/);
});
test('Nickname is immutable server-side, newsletter changes require identity and Turnstile',()=>{
  const profile=read('functions/api/community/profile.js');
  assert.match(profile,/old\?\.nickname&&nickname!==old\.nickname/);
  const newsletter=read('functions/api/community/newsletter.js');
  assert.match(newsletter,/authenticate\(request,env\)/);
  assert.match(newsletter,/getProfile\(env,user\.id\)/);
  assert.match(newsletter,/siteverify/);
  assert.match(newsletter,/proof\.hostname!==new URL\(request\.url\)\.hostname/);
  assert.match(newsletter,/senderSubscribe/);
  assert.match(newsletter,/senderUnsubscribe/);
  assert.doesNotMatch(newsletter,/nickname\s*:/);
});

test('Anonymous first visits show Google registration instead of an auth exception',()=>{
  const client=read('js/community.js');
  assert.match(client,/const \{data:sessionData,error:sessionError\}=await auth\.auth\.getSession\(\)/);
  assert.match(client,/if\(!sessionData\?\.session\)/);
  assert.match(client,/showGate\('guest'\)/);
  assert.match(client,/provider:'google'/);
  assert.match(client,/termsVersion:settings\.termsVersion/);
  assert.match(client,/newsletter:\$\('#hypeNewsletter'\)\.checked/);
});

test('UI polish preserves nav position, visible registration cursor and foot-only newsletter',()=>{
  const css=read('css/community.css');
  const profile=read('profile.html');
  const newsletter=read('newsletter.html');
  const profileJS=read('js/community-profile.js');
  const footerRoutes=['index.html','today.html','timeline.html','intel.html',
    'intel-archive.html','profile.html','newsletter.html'];
  const header=read('js/community-header.js');
  for(const route of footerRoutes){
    const html=read(route);
    assert.match(html,/js\/community-header\.js\?v=4/);
    assert.match(html,/href="newsletter\.html"/);
    assert.match(html,/tfw-account-person/);
  }
  assert.match(header,/languages\.getBoundingClientRect\(\)/);
  assert.match(header,/profile\.style\.position='absolute'/);
  assert.match(css,/html\.tfw-global-cursor-ready #tfwCommunityGate/);
  assert.match(css,/#hero>\.tfw-hype-intensity/);
  assert.match(css,/bottom:0;left:0;width:100%!important/);
  assert.match(css,/height:0;display:block/);
  assert.match(profile,/class="tfw-profile-confirm"/);
  assert.match(profile,/<dialog /);
  assert.match(profile,/tfw-profile-avatar/);
  assert.doesNotMatch(profile,/profileNewsletterForm|profileTurnstile|Permanent nickname · visible/);
  assert.doesNotMatch(profileJS,/confirm\(/);
  assert.match(profileJS,/dialog\.showModal\(\)/);
  assert.match(profileJS,/profileConfirmAccept/);
  assert.match(newsletter,/profileNewsletterForm/);
  assert.match(newsletter,/profileTurnstile/);
  assert.match(read('js/community-newsletter.js'),/api\('POST','newsletter'/);
  assert.match(read('js/seamless-navigation.js'),/newsletter\.html/);
  assert.match(read('tools/build-cloudflare-pages.mjs'),/newsletter\.html/);
});
test('Login text trimmed and reaction positions avoid countdown controls',()=>{
  const client=read('js/community.js');
  assert.doesNotMatch(client,/COMMUNITY ACCESS|Your email is private|Sign in with Google to enter the site/);
  assert.match(client,/function randomSafePosition\(\)/);
  assert.match(client,/getBoundingClientRect\(\)/);
  assert.match(client,/const bar=meter\?\.getBoundingClientRect\(\)/);
  assert.match(client,/MAX_VISIBLE_REACTIONS=2/);
  assert.match(client,/finale-last-10/);
  assert.match(client,/REACTION_DURATION\+20/);
  assert.match(client,/fill\.style\.height/);
});

test('Nested profile, legal and support navigation owns scroll, not homepage hash',()=>{
  const app=read('js/app.js');
  const nav=read('js/seamless-navigation.js');
  const css=read('css/community.css');
  assert.match(app,/function syncSectionHash\(\)\{\s*\/\/ The persistent homepage must not overwrite iframe route URLs\./);
  assert.match(app,/document\.body\.classList\.contains\('tfw-route-overlay-open'\)/);
  assert.match(nav,/document\.documentElement\.classList\.add\('tfw-route-overlay-open'\)/);
  assert.match(nav,/document\.documentElement\.classList\.remove\('tfw-route-overlay-open'\)/);
  assert.match(nav,/community-privacy\.html','community-terms\.html','support\.html/);
  assert.match(read('js/community.js'),/window\.addEventListener\('tfw:seamless-return'/);
  assert.match(nav,/window\.addEventListener\('wheel',parentScrollGuard,\{capture:true,passive:false\}\)/);
  assert.match(css,/html\.tfw-route-overlay-open/);
  assert.match(css,/overflow-y:hidden!important/);
  assert.match(read('tools/build-cloudflare-pages.mjs'),/support\.html/);
});
test('Profile includes the real creation date from server-side Supabase',()=>{
  const shared=read('functions/_lib/community.js');
  const html=read('profile.html');
  const script=read('js/community-profile.js');
  assert.match(shared,/select=id,nickname,created_at,terms_version/);
  assert.match(html,/<time id="profileCreatedAt"/);
  assert.match(script,/profile\.created_at/);
  assert.match(script,/timeZone:'UTC'/);
});
test('HYPE sits opposite emoji rail and uses in-tube readable label',()=>{
  const script=read('js/community.js');
  const css=read('css/community.css');
  assert.match(script,/<span>HYPE LEVEL<\/span>/);
  assert.doesNotMatch(script,/LIVE HYPE LEVEL/);
  assert.match(css,/left:29px!important;right:auto!important/);
  assert.match(css,/\.tfw-hype-meter-caption/);
  assert.match(css,/#hero>\.tfw-hype-intensity \.tfw-hype-meter-caption/);
  assert.match(css,/tfwHypeQuick 1\.6s/);
  assert.match(css,/tfwEmojiQuickWiggle/);
  assert.match(script,/tfw-hype-emoji-glyph/);
});
test('Signup uses integrated nickname validation instead of browser tooltips',()=>{
  const source=read('js/community.js');
  assert.match(source,/<form id="tfwGateRegister" hidden novalidate>/);
  assert.match(source,/id="tfwNicknameError" role="alert"/);
  assert.match(source,/nicknameInput\.setAttribute\('aria-invalid','true'\)/);
  assert.match(source,/Spaces are not allowed/);
  assert.doesNotMatch(source,/Choose your permanent nickname and finish registration/);
});
test('Support and footer legal disclosure remain readable without a local mail app',()=>{
  const pages=['index.html','today.html','timeline.html',
    'intel.html','intel-archive.html','profile.html','newsletter.html'];
  for(const path of pages){
    const page=read(path);
    assert.match(page,/href="support\.html">SUPPORT<\/a>/);
    assert.match(page,/class="legal-copy"/);
  }
  const html=read('support.html');
  assert.match(html,/id="tfwSupportAddress"/);
  assert.match(html,/navigator\.clipboard\.writeText/);
  assert.doesNotMatch(html,/tfw-auth-pending/);
  assert.match(read('css/community.css'),/body>footer:has\(>\.tfw-community-footer-links\)/);
  assert.match(read('css/community.css'),/border:0!important;background:transparent!important/);
});

test('Auth gate legal links stay in one tab and cannot bypass registration',()=>{
 const community=read('js/community.js'),nav=read('js/seamless-navigation.js');
 assert.doesNotMatch(community,/target="_blank" rel="noopener">(?:PRIVACY|TERMS|SUPPORT)/);
 assert.match(community,/tfwGateLegal/);
 assert.match(community,/legalPages=new Set/);
 assert.match(nav,/tfw-auth-pending/);
 assert.match(nav,/pendingRoute/);
 assert.match(nav,/activeFrame\.contentWindow\.location\.hash/);
});
test('Analytics consent is optional and separate; duplicate Privacy button removed',()=>{
 const consent=read('js/analytics-consent.js'),community=read('js/community.js');
 assert.match(consent,/__tfwAnalyticsConsent/);
 assert.doesNotMatch(consent,/privacyButton\s*=\s*document\.createElement/);
 assert.match(community,/tfwGateAnalytics/);
 assert.match(community,/acceptedTerms:\$\('#hypeTerms'\)\.checked/);
 assert.match(community,/newsletter:\$\('#hypeNewsletter'\)\.checked/);
 assert.doesNotMatch(community,/tfwHypePct/);
 assert.doesNotMatch(read('support.html'),/If clicking an email link doesn't open anything/);
});

test('Hype animations stay quiet and bounded even during massive local bursts',()=>{
 const client=read('js/community.js'),css=read('css/community.css');
 assert.match(client,/const REACTION_DURATION=780/);
 assert.match(client,/const REACTION_THROTTLE=145/);
 assert.match(client,/const MAX_VISIBLE_REACTIONS=2/);
 assert.match(client,/now-lastReactionShownAt<REACTION_THROTTLE/);
 assert.match(client,/layer\.childElementCount>MAX_VISIBLE_REACTIONS/);
 assert.match(client,/function randomSafePosition\(\)/);
 assert.match(client,/const bar=meter\?\.getBoundingClientRect\(\)/);
 assert.match(client,/document\.body\.classList\.contains\('finale-last-10'\)/);
 assert.match(client,/document\.documentElement\.classList\.contains\('tfw-ticket-reveal-open'\)/);
 assert.match(client,/window\.__tfwStressTestHype=\(total=200\)=>/);
 assert.match(client,/No network traffic/);
 assert.doesNotMatch(client,/node\.animate\(frames|glyph\.animate\(reactionMotionFrames/);
 assert.match(css,/tfwHypeQuietRise 780ms/);
 assert.match(css,/opacity:\.42/);
 assert.match(css,/tfw-hype-float-quiet::before/);
});
