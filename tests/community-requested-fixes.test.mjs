import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Multilingual moderation is shared by frontend and the authoritative server',async()=>{
  const policy=read('js/nickname-policy.js');
  const {nicknameVerdict,normalizeNickname,BLOCKED_NICKNAME_TOKENS}=await import(
    'data:text/javascript;charset=utf-8,'+encodeURIComponent(policy));
  assert.ok(BLOCKED_NICKNAME_TOKENS.length>=900);
  assert.equal(normalizeNickname('N3GR0'),'negro');
  for(const candidate of [
    'n1gg3r','N3GR0','n_i_g_g_e_r','NIGGGGER',
    'fr0c10','f_r_o_c_i_o','frrrocio','m4r1c0n',
    'c0nn4rd','f1ckd1ch','v14d0','f_u_c_k',
    'h1tl3r','admin','ryzegtavi'
  ]){
    assert.equal(nicknameVerdict(candidate).ok,false,candidate+' must be rejected');
  }
  for(const candidate of ['LeonidaFan','GTAVisitor_42','Brilliant2026','CoffeeSupport','My_Panda']){
    assert.equal(nicknameVerdict(candidate).ok,true,candidate+' should be permitted');
  }
  for(const candidate of ['','a','a b','x<script>','___super__long__name__','➡➡➡']){
    assert.equal(nicknameVerdict(candidate).ok,false,'invalid nickname '+candidate);
  }
  const server=read('functions/api/community/profile.js');
  const client=read('js/community.js');
  assert.match(server,/import \{nicknameVerdict\} from '\.\.\/\.\.\/\.\.\/js\/nickname-policy\.js'/);
  assert.match(server,/const verdict=nicknameVerdict\(nickname\)/);
  assert.match(client,/import \{nicknameVerdict\} from '\.\/nickname-policy\.js\?v=2'/);
  assert.match(client,/const verdict=nicknameVerdict\(nickname\)/);
  assert.match(client,/nicknameError\.textContent=verdict\.reason/);
});

test('Coffee popup is discreet and the reminder offers persistent choice',()=>{
  const page=read('index.html'),support=read('js/support-experience.js');
  assert.doesNotMatch(page,/class="tfw-support-project"/);
  assert.doesNotMatch(page,/class="tfw-experience-advisory"/);
  for(const p of ['index.html','today.html','timeline.html','intel.html','intel-archive.html','profile.html']){
    assert.match(read(p),/js\/support-experience\.js\?v=4/);
  }
  assert.match(support,/https:\/\/buymeacoffee\.com\/ryzegtavi/);
  assert.match(support,/tfw-footer-coffee-button/);
  assert.match(support,/HELP KEEP THE WAIT ALIVE/);
  assert.match(support,/tfwExperienceRepeat/);
  assert.match(support,/tfwExperienceNever/);
  assert.match(support,/localStorage\.setItem\(choiceKey,preference\)/);
  assert.match(support,/sessionStorage\.setItem\(sessionKey,'yes'\)/);
  assert.match(support,/tfw:community-ready/);
  assert.match(support,/tfw:seamless-return/);
  const gate=read('js/community.js'),css=read('css/community.css');
  assert.match(gate,/if\(page==='community-terms\.html'\)main\.querySelector\('footer'\)\?\.remove\(\)/);
  assert.doesNotMatch(gate,/Your message opens in your preferred email service/);
  assert.match(css,/\.tfw-gate-legal-body\{min-width:0;max-width:100%;overflow-x:hidden!important/);
  const privacy=read('community-privacy.html');
  assert.match(privacy,/class="tfw-legal-links"/);
  assert.match(privacy,/flex-wrap:wrap;white-space:nowrap/);
});

test('Custom middle-click autoscroll and selection state operate without duplicate pointers',()=>{
  const handlers={},frames=[];
  class Classes{
    constructor(){this.values=new Set()}
    add(x){this.values.add(x)}
    remove(x){this.values.delete(x)}
    toggle(x,on){if(on)this.values.add(x);else this.values.delete(x)}
    contains(x){return this.values.has(x)}
  }
  class El{
    constructor(){this.classList=new Classes();this.style={};this.children=[];
      this.scrollHeight=0;this.clientHeight=0;this.parentElement=null}
    setAttribute(){}
    appendChild(node){this.children.push(node);return node}
  }
  const root=new El(),html=new El();html.scrollHeight=3000;html.clientHeight=800;
  const doc={readyState:'complete',body:root,documentElement:html,scrollingElement:html,hidden:false,
    createElement:()=>new El(),
    getElementById:id=>root.children.find(c=>c.id===id)||null,
    addEventListener(name,fn){(handlers[name]??=[]).push(fn)},
    getSelection:()=>({rangeCount:0,isCollapsed:true})
  };
  let distance=0;
  const win={addEventListener(name,fn){(handlers['window:'+name]??=[]).push(fn)},
    scrollBy(_x,y){distance+=y}};
  const context={window:win,document:doc,Number,Date,
    requestAnimationFrame:fn=>{frames.push(fn);return frames.length},
    cancelAnimationFrame:()=>{},
    getComputedStyle:()=>({overflowY:'auto'})};
  runInNewContext(read('js/site-polish.js'),context);
  const emit=(name,e={})=>(handlers[name]||[]).forEach(fn=>fn(e));
  const target={closest:()=>null,parentElement:null};
  let prevented=false;
  emit('pointerdown',{button:1,pointerType:'mouse',clientX:200,clientY:300,target,
    preventDefault(){prevented=true},stopPropagation(){}});
  assert.equal(prevented,true,'native middle-button action prevented');
  assert.equal(win.__tfwGlobalCursorStatus().autoscroll,true);
  emit('mousemove',{clientX:230,clientY:420,target});
  assert.match(root.children[0].children[2].style.transform,/210px,400px/,
    'Autoscroll graphic follows mouse instead of remaining at the click origin');
  for(let i=0;i<4;i++){const fn=frames.shift();if(fn)fn(50*i)}
  assert.ok(distance>0,'middle-button movement scrolls document');
  emit('window:keydown',{key:'Escape'});
  assert.equal(win.__tfwGlobalCursorStatus().autoscroll,false);
  doc.getSelection=()=>({rangeCount:1,isCollapsed:false,toString:()=> 'Selected text'});
  emit('selectionchange');
  assert.equal(win.__tfwGlobalCursorStatus().selectingText,true);
  doc.getSelection=()=>({rangeCount:0,isCollapsed:true});
  emit('selectionchange');
  assert.equal(win.__tfwGlobalCursorStatus().selectingText,false);
  const css=read('css/site-polish.css');
  assert.match(css,/\.tfw-autoscroll-indicator/);
  assert.match(css,/\.text-selecting \.tfw-global-cursor-reticle/);
});
