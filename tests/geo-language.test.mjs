import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const source=read('js/language.js');
function sandbox({stored={},languages=['en-US'],cookie=''}={}){
 const values=new Map(Object.entries(stored)),listeners={};
 const selectors=[];
 const document={
  cookie,documentElement:{lang:'en'},
  addEventListener(event,cb){listeners['document:'+event]=cb},
  querySelector(){return null},
  querySelectorAll(){return []}
 };
 const window={
  addEventListener(event,cb){listeners[event]=cb}
 };
 const localStorage={
  getItem:key=>values.get(key)??null,
  setItem:(key,value)=>values.set(key,value)
 };
 runInNewContext(source,{window,document,localStorage,navigator:{languages,language:languages[0]},
  setTimeout:()=>0,Event:class{constructor(type){this.type=type}}});
 return {window,document,values,listeners};
}
test('Country maps to all fourteen enabled languages with an English fallback',()=>{
 const {window}=sandbox();
 const cases={IT:'it',SM:'it',FR:'fr',DE:'de',AT:'de',ES:'es',MX:'es',
  BR:'pt',PT:'pt',RU:'ru',BY:'ru',PL:'pl',JP:'ja',TR:'tr',
  NL:'nl',KR:'ko',CN:'zh-CN',SA:'ar',AE:'ar',
  US:'en',GB:'en',XX:'en',NO:'en',IN:'en'};
 for(const [country,lang] of Object.entries(cases))
  assert.equal(window.__tfwDetectedSiteLanguage(country),lang,country);
 assert.equal(window.__tfwDetectedSiteLanguage(null),'en');
});
test('Multilingual countries use browser preference without requiring GPS',()=>{
 const french=sandbox({languages:['fr-CA','en-CA']});
 assert.equal(french.window.__tfwDetectedSiteLanguage('CA'),'fr');
 const german=sandbox({languages:['de-CH','en-GB']});
 assert.equal(german.window.__tfwDetectedSiteLanguage('CH'),'de');
 const english=sandbox({languages:['en-US']});
 assert.equal(english.window.__tfwDetectedSiteLanguage('BE'),'en');
 const chinese=sandbox({languages:['zh-CN','en-US']});
 assert.equal(chinese.window.__tfwDetectedSiteLanguage('SG'),'zh-CN');
 const japanese=sandbox({languages:['ja-JP']});
 assert.equal(japanese.window.__tfwDetectedSiteLanguage('SG'),'ja');
 const traditional=sandbox({languages:['zh-TW','en-US']});
 assert.equal(traditional.window.__tfwDetectedSiteLanguage('SG'),'en');
});
test('Country detection sets automatic language and persists it across secondary iframes',()=>{
 const s=sandbox();
 s.listeners['tfw:timezone-detected']({detail:{country:'IT'}});
 assert.equal(s.window.__tfwPreferredSiteLanguage(),'it');
 assert.equal(s.document.documentElement.lang,'it');
 assert.equal(s.values.get('tfw_site_language_v1'),'it');
 assert.equal(s.values.get('tfw_site_language_mode_v1'),'auto');
 const other=sandbox({stored:Object.fromEntries(s.values)});
 assert.equal(other.window.__tfwPreferredSiteLanguage(),'it');
 s.listeners['tfw:timezone-detected']({detail:{country:'JP'}});
 assert.equal(s.window.__tfwPreferredSiteLanguage(),'ja');
});
test('Previously selected language wins over country auto-detection',()=>{
 const s=sandbox({stored:{tfw_site_language_v1:'de',tfw_site_language_mode_v1:'manual'}});
 s.listeners['tfw:timezone-detected']({detail:{country:'IT'}});
 assert.equal(s.window.__tfwPreferredSiteLanguage(),'de');
 assert.equal(s.values.get('tfw_site_language_mode_v1'),'manual');
 const prior=sandbox({cookie:'googtrans=/en/fr'});
 assert.equal(prior.window.__tfwPreferredSiteLanguage(),'fr');
 prior.listeners['tfw:timezone-detected']({detail:{country:'IT'}});
 assert.equal(prior.window.__tfwPreferredSiteLanguage(),'fr');
 const chinese=sandbox({cookie:'googtrans=/en/zh-CN'});
 assert.equal(chinese.window.__tfwPreferredSiteLanguage(),'zh-CN');
 const arabic=sandbox({stored:{tfw_site_language_v1:'ar',tfw_site_language_mode_v1:'manual'}});
 arabic.listeners['tfw:timezone-detected']({detail:{country:'JP'}});
 assert.equal(arabic.window.__tfwPreferredSiteLanguage(),'ar');
 assert.equal(arabic.document.documentElement.lang,'ar');
 assert.equal(arabic.document.documentElement.dir,'ltr');
});
test('Cloudflare geo endpoint returns only timezone and ISO country code, not IP',()=>{
 const file=read('functions/api/timezone.js').replace('export function onRequestGet','function onRequestGet');
 const handler=new Function(file+'\nreturn onRequestGet')();
 const resp=handler({request:{cf:{country:'IT',timezone:'Europe/Rome'}}});
 assert.equal(resp.status,200);
 assert.equal(resp.headers.get('Cache-Control'),'private, no-store, max-age=0');
 return resp.json().then(json=>assert.deepEqual(json,{timezone:'Europe/Rome',country:'IT'}));
});
test('Registration reuses the same accessible menu, options and language state',()=>{
 const community=read('js/community.js');
 const lang=read('js/language.js'),style=read('css/community.css');
 assert.match(community,/id="tfwGateLanguage" class="language-widget tfw-gate-language-widget"/);
 assert.match(community,/tfw:registration-gate-mounted/);
 for(const langcode of ["en","fr","es","de","it","pt","ru","pl","ja","tr","nl","ko","zh-CN","ar"])
  assert.match(community,new RegExp('<option value="'+langcode+'">'));
 assert.match(lang,/\.gtranslate_wrapper, \.tfw-gate-language-widget/);
 assert.match(lang,/window\.addEventListener\('tfw:registration-gate-mounted',watchWidget\)/);
 assert.match(lang,/updateLanguage\(code,true\)/);
 assert.match(lang,/native\.dispatchEvent\(new Event\('change'/);
 assert.match(style,/#tfwGateLanguage \.tfw-lang-menu/);
 assert.match(style,/#tfwGateLanguage select\.tfw-lang-native/);
});
test('All translated pages use the new country and locale selector bootstrap',()=>{
 for(const page of ['index.html','today.html','timeline.html','intel.html','intel-archive.html',
  'profile.html','newsletter.html','support.html','settings.html','streamer-overlay.html',
  'global-wave.html','ticket.html']){
  const html=read(page);
  assert.match(html,/js\/language\.js\?v=51/,page);
  assert.match(html,/js\/timezone-init\.js\?v=4/,page);
 }
 assert.match(read('index.html'),/js\/community\.js\?v=22/);
 assert.match(read('index.html'),/css\/community\.css\?v=15/);
 assert.match(read('js/language.js'),/languages:\['en','fr','es','de','it','pt','ru','pl','ja','tr','nl','ko','zh-CN','ar'\]/);
});

test('All fourteen language codes are exposed by the widget and the registration menu',()=>{
 const script=read('js/language.js'),gate=read('js/community.js');
 const codes=["en","fr","es","de","it","pt","ru","pl","ja","tr","nl","ko","zh-CN","ar"];
 for(const code of codes){
  assert.ok(script.includes("'"+code+"'"),code);
  assert.ok(gate.includes('<option value="'+code+'">'),code);
 }
 assert.match(script,/code==='zh-cn'\?'zh-CN':code/);
 assert.match(read('css/site-polish.css'),/overflow-y:auto;overscroll-behavior:contain/);
 assert.match(read('css/site-polish.css'),/max-height:min\(66vh,530px\)/);
});

test('Arabic affects text flow, never page or control ordering',()=>{
 const css=read('css/site-polish.css');
 assert.match(css,/html:lang\(ar\) body \*\{\s*direction:ltr!important/);
 assert.match(css,/:not\(:has\(\*\)\)\{\s*direction:rtl!important;\s*unicode-bidi:plaintext/);
 assert.match(css,/html:lang\(ar\) textarea\{direction:rtl!important/);
 const js=read('js/language.js');
 assert.match(js,/function preserveLayoutDirection\(\)/);
 assert.match(js,/if\(root\.dir!=='ltr'\)root\.dir='ltr'/);
 assert.match(js,/if\(document\.body&&document\.body\.dir!=='ltr'\)document\.body\.dir='ltr'/);
 assert.match(js,/attributeFilter:\['lang','dir'\]/);
 const s=sandbox({stored:{tfw_site_language_v1:'ar',tfw_site_language_mode_v1:'manual'}});
 assert.equal(s.document.documentElement.lang,'ar');
 assert.equal(s.document.documentElement.dir,'ltr');
 s.listeners['tfw:timezone-detected']({detail:{country:'DE'}});
 assert.equal(s.document.documentElement.lang,'ar');
});
