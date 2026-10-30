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
 const m=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(js));
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
test('Canvas PNG exports retain source imagery and draw both intended formats',async()=>{
 const m=await import('data:text/javascript;charset=utf-8,'+
  encodeURIComponent(read('js/boarding-pass.js'))+'#png-tests');
 const seen=[],canvasDims=[];
 const ctx={
  fillRect(){},beginPath(){},stroke(){},fill(){},save(){},restore(){},moveTo(){},lineTo(){},roundRect(){},
  createLinearGradient:()=>({addColorStop(){}}),
  createRadialGradient:()=>({addColorStop(){}}),
  drawImage(){seen.push('image')},
  fillText(...args){if(args.length===4&&!Number.isFinite(args[3]))throw Error('Invalid canvas width');seen.push(String(args[0]))}
 };
 const prevDoc=globalThis.document,prevImage=globalThis.Image;
 globalThis.document={createElement:tag=>{
   assert.equal(tag,'canvas');
   const canvas={width:0,height:0,getContext:()=>ctx,toBlob:cb=>{
     canvasDims.push([canvas.width,canvas.height]);cb(new Blob(['png'],{type:'image/png'}));
   }};
   return canvas;
 }};
 globalThis.Image=class{width=1920;height=1080;set src(value){seen.push(value);this.onload()}};
 try{
  assert.equal((await m.renderBoardingPassPNG(sample,false)).type,'image/png');
  assert.equal((await m.renderBoardingPassPNG(sample,true)).type,'image/png');
  assert.deepEqual(canvasDims,[[1600,900],[1080,1920]]);
  assert.ok(seen.filter(x=>x==='image').length===2,'Both formats must draw local scenes');
  assert.ok(seen.includes(m.EDITIONS.founders.image));
  for(const text of ['LeonidaFan','19 NOV 2026','F-00027','LEONIDA'])
   assert.ok(seen.includes(text),text);
 }finally{globalThis.document=prevDoc;globalThis.Image=prevImage}
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
 assert.match(profile,/id="profileTicketCanvas"/);
 assert.match(profile,/id="profileTicketActions"/);
 assert.match(profile,/css\/boarding-pass\.css\?v=2/);
 assert.match(client,/fetch\('\/api\/community\/boarding-pass'/);
 assert.match(client,/mountBoardingPass\(/);
 assert.match(client,/attachBoardingPassActions\(/);
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
 for(const name of ['DOWNLOAD TICKET PNG','DOWNLOAD STORY PNG','SHARE ON X','SHARE ON REDDIT','INSTAGRAM','TIKTOK','COPY VERIFIED LINK'])
  assert.ok(js.includes(name),name);
});
