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
  assert.match(script,/start=async/);
  assert.match(script,/initCommunity\(\)/);
  assert.match(script,/\/api\/community\/config/);
  assert.doesNotMatch(read('js/app.js'),/supabase-js|hype-room|HYPE_TICKET_SECRET/);
});
test('The community assets are available on all standalone routes',()=>{
  for(const path of ['index.html','today.html','timeline.html','intel.html','intel-archive.html']){
    const page=read(path);
    assert.match(page,/js\/community\.js\?v=1/);
    assert.match(page,/css\/community\.css\?v=1/);
  }
  const build=read('tools/build-cloudflare-pages.mjs');
  assert.match(build,/include:\['\/api\/timezone','\/api\/community\/\*'\]/);
  assert.match(build,/community-privacy.html/);
  assert.match(build,/community-terms.html/);
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
  assert.match(worker,/acceptWebSocket\(server\)/);
  assert.match(worker,/serializeAttachment\(/);
  assert.match(worker,/INTERVAL_MS=10_000/);
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
