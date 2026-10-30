import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sample={
 publicId:'11111111-1111-4111-8111-111111111111',
 ticketCode:'F-00027',edition:'founders',
 nickname:'LeonidaFan',registeredAt:'2026-10-30T08:32:00.000Z'
};
test('SQL migration makes each ticket unique, secure, automatically issued and deleted with the account',()=>{
 const sql=read('supabase/boarding-pass-schema.sql');
 assert.match(sql,/user_id uuid primary key references public\.community_profiles\(id\) on delete cascade/i);
 assert.match(sql,/public_id uuid not null unique default gen_random_uuid\(\)/i);
 assert.match(sql,/unique \(edition,serial_number\)/i);
 assert.match(sql,/for update/i);
 assert.match(sql,/on conflict \(edition\) do update set last_number=c\.last_number\+1/i);
 assert.match(sql,/if result_value is not null then return result_value/i);
 assert.match(sql,/security definer set search_path = ''/i);
 assert.match(sql,/revoke all on function public\.issue_community_boarding_pass\(uuid\) from public,anon,authenticated/i);
 assert.match(sql,/grant execute on function public\.issue_community_boarding_pass\(uuid\) to service_role/i);
 assert.match(sql,/after insert on public\.community_profiles/i);
 assert.match(sql,/order by p\.created_at,p\.id/i);
 for(const day of ['2026-11-06','2026-11-11','2026-11-19'])
  assert.ok(sql.includes(day));
 assert.doesNotMatch(sql,/grant\s+(?:select|execute).*\s+to\s+(?:anon|authenticated)\b/i);
});
test('Four editions use real repository screenshots and preserve a stable private code',async()=>{
 const js=read('js/boarding-pass.js');
 const m=await import(new URL('../js/boarding-pass.js',import.meta.url).href);
 for(const [edition,prefix] of Object.entries({founders:'F',early:'E',final:'B',welcome:'W'})){
  const item={...sample,edition,ticketCode:prefix+'-00012'};
  assert.equal(m.validBoardingPass(item),true);
  const e=m.EDITIONS[edition];
  assert.ok(existsSync(new URL('../'+e.image.slice(1),import.meta.url)),e.image);
 }
 assert.equal(m.validBoardingPass({...sample,publicId:'F-00027'}),false);
 assert.equal(m.validBoardingPass({...sample,nickname:'<img src=x>'}),false);
 assert.equal(m.validBoardingPass({...sample,ticketCode:'W-00027'}),false);
 assert.equal(m.publicTicketUrl(sample,'https://community-qa.the-final-wait.pages.dev'),
  'https://community-qa.the-final-wait.pages.dev/ticket/'+sample.publicId);
 assert.match(js,/strong\.textContent=value/);
 assert.match(js,/caption\.textContent=label/);
 assert.doesNotMatch(js,/innerHTML\s*=\s*.*pass\.nickname/);
});
test('QR has the exact decoded user-provided destination, quiet zone and no Bitly logo',async()=>{
 const mod=await import(new URL('../js/ticket-qr.js',import.meta.url).href);
 assert.equal(mod.TICKET_QR_TARGET,'https://bit.ly/4A3VRzz?r=qr');
 const svg=mod.qrSvgMarkup();
 assert.match(svg,/viewBox="0 0 41 41"/);
 assert.match(svg,/fill="#ffeaf6"/);
 assert.match(svg,/fill="#171020"/);
 assert.doesNotMatch(svg,/bitly|watermark/i);
 assert.ok((svg.match(/h1v1h-1z/g)||[]).length>300);
 const js=read('js/boarding-pass.js');
 assert.match(js,/mountTicketQR\(card\.querySelector\('\.tfw-ticket-qr'\)\)/);
 assert.match(js,/renderBoardingPassPNG\(pass,portrait=false\)/);
 assert.match(js,/html-to-image@1\.11\.13/);
 assert.match(js,/const visible=document\.querySelector\(selector\)/);
 assert.match(js,/pixelRatio:portrait\?2:1/);
 assert.match(js,/source\.classList\.add\('tfw-ticket--portrait'\)/);
 assert.doesNotMatch(js,/UNOFFICIAL FAN PROJECT/);
 assert.doesNotMatch(js,/drawTicketWide|drawTicketTall|drawBarcode/);
});
test('Authenticated issuance rejects guests; public verification checks live DB membership',async()=>{
 const secure=read('functions/api/community/boarding-pass.js')
  .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*/,'')
  .replace('export async function onRequestGet','async function onRequestGet');
 let count=0;
 const deps={
  enabled:()=>true,fail:(error,status)=>({error,status}),json:o=>o,
  authenticate:async()=>null,
  getProfile:async()=>({nickname:'LeonidaFan',terms_version:'current'}),
  adminApi:async()=>{count++;return {ok:true,json:async()=>sample}},
  TERMS_VERSION:'current'
 };
 const makeHandler=d=>new Function('d','const {enabled,fail,json,authenticate,getProfile,adminApi,TERMS_VERSION}=d;'+secure+';return onRequestGet')(d);
 const context={request:{},env:{}};
 assert.equal((await makeHandler(deps)(context)).status,401);
 assert.equal(count,0);
 deps.authenticate=async()=>({id:'abc'});
 assert.deepEqual((await makeHandler(deps)(context)).ticket,sample);
 assert.equal(count,1);
 deps.getProfile=async()=>({nickname:'LeonidaFan',terms_version:'old'});
 assert.equal((await makeHandler(deps)(context)).status,403);
 assert.equal(count,1);

 const source=read('functions/api/community/boarding-pass-public.js')
  .replace(/^import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*/,'')
  .replace('export async function onRequestGet','async function onRequestGet');
 const captured=[];
 const api=new Function('d','const {enabled,fail,json,adminApi}=d;'+source+';return onRequestGet')({
  enabled:()=>true,fail:(error,status)=>({error,status}),json:o=>o,
  adminApi:async(_env,url)=>{
   captured.push(url);
   return {ok:true,json:async()=>[{
    public_id:sample.publicId,ticket_code:sample.ticketCode,
    registered_at:sample.registeredAt,edition:sample.edition,
    community_profiles:{nickname:sample.nickname}
   }]};
  }
 });
 let result=await api({env:{},request:{url:'https://x.test/api/community/boarding-pass-public?id='+sample.publicId}});
 assert.equal(result.verified,true);
 assert.deepEqual(result.ticket,sample);
 assert.match(captured[0],/community_profiles!inner\(nickname\)/);
 assert.equal((await api({env:{},request:{url:'https://x.test/api/community/boarding-pass-public?id=F-00027'}})).status,404);
 assert.equal(captured.length,1);
});
test('Profile-only placement, no public sign-in and Cloudflare routing all work together',()=>{
 const profile=read('profile.html'),client=read('js/community-profile.js'),page=read('ticket.html');
 const share=read('js/public-boarding-pass.js'),router=read('functions/ticket/[id].js');
 const build=read('tools/build-cloudflare-pages.mjs');
 assert.match(profile,/id="profileTicketLink"/);
 assert.match(profile,/id="profileTicketCode"/);
 assert.doesNotMatch(profile,/id="profileTicketCanvas"/);
 assert.match(profile,/css\/boarding-pass\.css\?v=5/);
 assert.match(client,/fetch\('\/api\/community\/boarding-pass'/);
 assert.match(client,/open.href=publicTicketUrl\(pass\)/);
 assert.doesNotMatch(client,/mountBoardingPass\(/);
 assert.match(page,/id="ticketPublicHolder"/);
 assert.match(page,/id="ticketPublicActions"/);
 assert.match(page,/VERIFIED BY THE FINAL WAIT/);
 assert.doesNotMatch(page,/js\/community\.js/);
 assert.match(share,/boarding-pass-public\?id=/);
 assert.match(router,/env\.ASSETS\.fetch/);
 assert.match(router,/x-robots-tag/);
 assert.match(build,/ticket\.html/);
 assert.match(build,/'\/ticket\/\*'/);
 assert.match(read('community-privacy.html'),/collectible boarding pass/);
 assert.match(read('community-terms.html'),/decorative, non-transferable/);
 const js=read('js/boarding-pass.js');
 for(const name of ['DOWNLOAD TICKET','DOWNLOAD STORY VERSION','SHARE ON X','SHARE ON REDDIT','INSTAGRAM','TIKTOK','COPY VERIFIED LINK'])
  assert.ok(js.includes(name),name);
});

test('Detail page reuses full working topbar, language geometry, audio and modal CTA',()=>{
 const page=read('ticket.html'),profile=read('profile.html');
 for(const id of ['tfwPageShare','tfwPageFullscreen','soundButton','mobileSoundButton','tfwPageMenu','tfwPageDrawer'])
  assert.match(page,new RegExp('id="'+id+'"'));
 assert.match(page,/js\/community-header\.js\?v=3/);
 assert.match(page,/js\/secondary-controls\.js\?v=48/);
 assert.match(page,/gtranslate_wrapper language-widget/);
 assert.match(page,/js\/secondary-share\.js\?v=46/);
 assert.match(profile,/id="profileTicketLink"/);
 assert.doesNotMatch(page,/Every boarding pass is unique/);
 assert.doesNotMatch(read('js/public-boarding-pass.js'),/Authenticity checked against an active The Final Wait community account/);
 const js=read('js/boarding-pass.js'),css=read('css/boarding-pass.css');
 assert.match(js,/download\.textContent='DOWNLOAD'/);
 assert.match(js,/share\.textContent='SHARE'/);
 assert.match(js,/const openModal=kind=>/);
 assert.match(js,/modal\.setAttribute\('aria-modal','true'\)/);
 assert.match(js,/download\.addEventListener\('click',\(\)=>openModal\('download'\)\)/);
 assert.match(js,/share\.addEventListener\('click',\(\)=>openModal\('share'\)\)/);
 assert.match(css,/\.tfw-ticket-modal/);
 assert.match(css,/\.tfw-ticket-quick-button/);
});
test('Original layout, user-supplied scan-safe QR and portrait use one shared DOM',()=>{
 const js=read('js/boarding-pass.js'),css=read('css/boarding-pass.css');
 assert.doesNotMatch(js,/EXCLUSIVE COMMUNITY COLLECTIBLE/);
 assert.doesNotMatch(js,/✦ VERIFIED PASSENGER/);
 assert.doesNotMatch(js,/✓ VERIFIED PASSENGER/);
 assert.match(js,/import \{mountTicketQR\} from '\.\/ticket-qr\.js\?v=1'/);
 assert.match(js,/\.tfw-ticket-qr/);
 assert.match(css,/\.tfw-ticket--portrait/);
 assert.match(css,/width:540px!important;height:960px!important/);
 assert.match(js,/downloadBoardingPass\(pass,false\)/);
 assert.match(js,/downloadBoardingPass\(pass,true\)/);
});
test('Registration runs a one-time ticket reveal, with exit, reduced motion and safe fallback',()=>{
 const src=read('js/community.js'),intro=read('js/ticket-reveal.js');
 const css=read('css/ticket-reveal.css');
 assert.match(src,/const firstRegistration=!state\.profile\?\.nickname/);
 assert.match(src,/if\(firstRegistration\)/);
 assert.match(src,/import\('\.\/ticket-reveal\.js\?v=3'\)/);
 assert.match(src,/api\('GET','boarding-pass'\)/);
 assert.match(intro,/export async function showTicketReveal\(loadTicket\)/);
 assert.match(intro,/mountBoardingPass\(holder,pass\)/);
 assert.match(intro,/tfw-reveal-printing/);
 assert.match(intro,/tfw-reveal-complete/);
 assert.match(intro,/overlay\.remove\(\)/);
 assert.match(intro,/tfw-reveal-skip/);
 assert.match(intro,/tfw-reveal-continue/);
 assert.doesNotMatch(intro,/tfw-reveal-open|APPROVED FOR BOARDING/);
 assert.match(css,/@keyframes tfwRevealPrint/);
 assert.match(css, /prefers-reduced-motion:reduce/);
});

test('First registration never exposes countdown beneath the reveal and reminder follows',()=>{
 const src=read('js/community.js');
 assert.match(src,/const \{showTicketReveal\}=await import/);
 assert.match(src,/const ceremony=showTicketReveal\(/);
 assert.match(src,/hideGate\(\);void connectSocket\(\);\s*void ceremony/);
 const reveal=read('js/ticket-reveal.js'),css=read('css/ticket-reveal.css');
 assert.match(reveal,/await pause\(6400\)/);
 assert.match(css,/clip-path:inset\(0 0 0 100%/);
 assert.match(css,/animation:tfwRevealPrint 6\.4s/);
 assert.match(css,/z-index:2147482600/);
 assert.match(css,/#tfwGlobalCursor\.tfw-global-cursor-layer\{z-index:2147483000/);
 assert.match(reveal,/window\.__tfwTicketRevealFinished=true/);
 const support=read('js/support-experience.js');
 assert.match(support,/addEventListener\('tfw:ticket-reveal-closed',offerExperience\)/);
 assert.match(support,/document\.getElementById\('tfwTicketReveal'\)/);
});


test('Exact PNG export includes actual screenshot and ticket contents in both layouts',()=>{
 const js=read('js/boarding-pass.js'),css=read('css/boarding-pass.css');
 assert.match(js,/card\.querySelector\('\.tfw-ticket-scene'\)\.src=e\.image/);
 assert.match(js,/const visible=document\.querySelector\(selector\)/);
 assert.match(js,/source=mountBoardingPass\(stage,pass\)/);
 assert.match(js,/await prepareTicketMedia\(source\)/);
 assert.match(js,/await image\.decode\(\)/);
 assert.match(js,/source\.classList\.add\('tfw-ticket-exporting'\)/);
 assert.match(js,/source\.classList\.add\('tfw-ticket--portrait'\)/);
 assert.doesNotMatch(js,/backgroundColor\s*:/);
 assert.match(css,/\.tfw-ticket \.tfw-ticket-scene\{/);
 assert.match(css,/\.tfw-ticket\.tfw-ticket-exporting:after\{display:none!important\}/);
 assert.doesNotMatch(js,/✓ VERIFIED PASSENGER/);
});
test('Buttons and dialog options are text-only, fully visible and keep cursor above overlays',()=>{
 const js=read('js/boarding-pass.js'),css=read('css/boarding-pass.css');
 for(const label of ['DOWNLOAD','SHARE','DOWNLOAD TICKET','DOWNLOAD STORY VERSION',
   'SHARE ON X','SHARE ON REDDIT','INSTAGRAM','TIKTOK','COPY VERIFIED LINK'])
   assert.ok(js.includes("'"+label+"'"),label);
 assert.match(js,/Download your ticket in your preferred format/);
 assert.doesNotMatch(js,/Choose the version you want to save/);
 assert.match(css,/\.tfw-ticket-quick-button:hover/);
 assert.match(css,/#tfwGlobalCursor\.tfw-global-cursor-layer\{z-index:2147483000!important\}/);
 assert.match(css,/\.tfw-ticket-modal\{z-index:2147482450!important\}/);
 assert.match(css,/html\.tfw-global-cursor-ready \.tfw-ticket-modal/);
});
test('Ceremony intercepts wheel and scroll keys, animates scanner across measured width and releases modal on close',()=>{
 const js=read('js/ticket-reveal.js'),css=read('css/ticket-reveal.css'),support=read('js/support-experience.js');
 for(const pattern of [
  "document.documentElement.classList.add('tfw-ticket-reveal-open')",
  "document.documentElement.classList.remove('tfw-ticket-reveal-open')",
  "window.addEventListener('wheel',blockScroll,{capture:true,passive:false})",
  "window.addEventListener('touchmove',blockScroll,{capture:true,passive:false})",
  "window.dispatchEvent(new Event('tfw:ticket-reveal-closed'))",
  "Math.max(0,holder.getBoundingClientRect().width-5)"
 ])assert.ok(js.includes(pattern),pattern);
 assert.match(css,/html\.tfw-ticket-reveal-open body\{overflow:hidden!important/);
 assert.match(css,/tfwRevealScanMove/);
 assert.match(css,/translate3d\(var\(--tfw-scan-distance/);
 assert.match(support,/document\.getElementById\('tfwTicketReveal'\)/);
 assert.match(support,/addEventListener\('tfw:ticket-reveal-closed',offerExperience\)/);
});
