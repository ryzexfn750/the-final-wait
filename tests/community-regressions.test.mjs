import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Gate links cannot trigger delayed app navigation',()=>{
 const app=read('js/app.js'),gate=read('js/community.js');
 assert.match(app,/a\.closest\('#tfwCommunityGate'\)/);
 assert.match(app,/document\.documentElement\.classList\.contains\('tfw-auth-pending'\)/);
 assert.match(app,/hideRouteLoader\(\);window\.__tfwSeamlessNavigation\.open\(destination\)/);
 assert.match(gate,/event\.preventDefault\(\);event\.stopPropagation\(\);legalOpener=anchor;void openLegal\(page\)/);
 assert.match(gate,/\},true\);/);
});

test('Preview cannot be bypassed by direct iframe query or public support',()=>{
 const gate=read('js/community.js'),nav=read('js/seamless-navigation.js');
 assert.match(gate,/window\.self===window\.top/);
 assert.match(gate,/window\.parent\.location\.origin===location\.origin/);
 assert.match(nav,/preview&&origin\.pathname\.endsWith\('\/support\.html'\)/);
 for(const p of ['index.html','today.html','timeline.html','intel.html','intel-archive.html','profile.html','newsletter.html']){
   const html=read(p);
   assert.match(html,/tfw-auth-pending/);
   assert.match(html,/window\.parent\.__tfwSeamlessNavigation/);
 }
});

test('Back and Forward resolve against displayed content with preload timeout',()=>{
 const nav=read('js/seamless-navigation.js');
 assert.match(nav,/activeFrame\.dataset\.tfwRoute/);
 assert.match(nav,/const shown=activeFrame/);
 assert.match(nav,/const failNavigation=error=>/);
 assert.match(nav,/const watchdog=setTimeout/);
 assert.match(nav,/iframe\.tfw-frame-preloading/);
});

test('Legal preferences work both inside registration and direct privacy notice',()=>{
 const gate=read('js/community.js'),privacy=read('community-privacy.html');
 const consent=read('js/analytics-consent.js');
 assert.match(gate,/data-tfw-analytics-preferences/);
 assert.match(privacy,/tfwPrivacyCookiePreferences/);
 assert.match(privacy,/initAnalytics\(\)/);
 assert.match(consent,/window\.addEventListener\('storage'/);
 assert.match(consent,/banner\.querySelector\('#analyticsDecline'\)\?\.focus\(\)/);
});

test('Worker advertises all emojis and acknowledges accepted reactions',async()=>{
 const source=read('workers/hype-worker/src/index.js')
  .replace(/^import\s+.+?;\s*/,'')
  .replace('export default {','const entrypoint = {')
  .replace('export class HypeRoom','class HypeRoom');
 let peers=[];
 class Socket{
  sent=[];attachment=null;
  send(data){this.sent.push(JSON.parse(data))}
  serializeAttachment(data){this.attachment=data}
  deserializeAttachment(){return this.attachment}
  close(){}
 }
 class Pair{constructor(){this[0]=new Socket();this[1]=new Socket()}}
 class MockResponse{constructor(body,init={}){this.body=body;this.status=init.status;this.webSocket=init.webSocket}}
 const Base=class{constructor(ctx,env){this.ctx=ctx;this.env=env}};
 const {HypeRoom}=new Function('DurableObject','WebSocketPair','Response',
  source+'\nreturn {HypeRoom}')(Base,Pair,MockResponse);
 for(const emoji of ['🥳','🌴','🩷']){
  peers=[];
  const ctx={acceptWebSocket:(s)=>peers.push(s),getWebSockets:tag=>peers,
   storage:{getAlarm:async()=>null,setAlarm:async()=>{}}};
  const room=new HypeRoom(ctx,{});
  room.scheduleFlush=()=>{};
  const request={url:'https://hype.internal/connect',headers:new Headers({
    Upgrade:'websocket','X-Hype-User':'00000000-0000-4000-8000-000000000001',
    'X-Hype-Nickname':'Tester_1','X-Hype-Zone':'Europe/Rome'
  })};
  const response=await room.fetch(request);
  assert.equal(response.status,101);
  const welcome=peers[0].sent[0];
  assert.equal(welcome.protocol,2);
  assert.ok(welcome.emojis.includes(emoji));
  await room.webSocketMessage(peers[0],JSON.stringify({type:'reaction',emoji}));
  assert.ok(peers[0].sent.some(x=>x.type==='reaction_ack'&&x.emoji===emoji));
  assert.equal(room.pending.get(emoji),1);
  await room.webSocketMessage(peers[0],JSON.stringify({type:'reaction',emoji:'❌'}));
  assert.ok(peers[0].sent.some(x=>x.type==='reaction_error'&&x.reason==='unsupported_emoji'));
 }
});

test('New emoji UI uses server capability negotiation before cooldown',()=>{
 const client=read('js/community.js');
 assert.match(client,/state\.serverEmojis\.includes\(emoji\)/);
 assert.match(client,/msg\.protocol===2/);
 assert.match(client,/msg\.type==='reaction_ack'/);
 assert.match(client,/state\.pendingReaction=null;/);
 assert.match(client,/LEGACY_EMOJIS=/);
});
