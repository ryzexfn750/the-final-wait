import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Styled language menu preserves the real GTranslate change and accessibility',()=>{
 const js=read('js/language.js'),css=read('css/site-polish.css');
 assert.match(js,/script\.src='https:\/\/cdn\.gtranslate\.net\/widgets\/latest\/dropdown\.js'/);
 assert.match(js,/select\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/);
 assert.match(js,/select\.addEventListener\('change'/);
 assert.match(js,/observer=new MutationObserver/);
 assert.match(js,/role="listbox"/);
 assert.match(js,/setAttribute\('role','option'\)/);
 for(const code of ['en','it','fr','de','es'])assert.match(js,new RegExp(code+':\\['));
 assert.match(js,/event\.key==='Escape'/);
 assert.match(js,/ArrowDown/);
 assert.match(js,/closeMenu\(control,true\)/);
 assert.match(css,/\.tfw-lang-menu\{/);
 assert.match(css,/\.tfw-lang-option\.selected/);
 assert.match(css,/html body \.gtranslate_wrapper select\.tfw-lang-native/);
 for(const p of ['index.html','today.html','timeline.html','intel.html','intel-archive.html','profile.html','newsletter.html','support.html']){
  const html=read(p);
  assert.match(html,/js\/language\.js\?v=49/);
  assert.match(html,/css\/site-polish\.css\?v=54/);
  assert.match(html,/js\/site-polish\.js\?v=48/);
 }
});