import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, resolve, extname} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=rel=>readFileSync(resolve(root,rel),'utf8');
const pages=['index.html','today.html','timeline.html','intel.html'];
const existing=rel=>existsSync(resolve(root,rel));
const cleanRef=ref=>ref.replace(/[?#].*$/,'');
const local=ref=>ref&&!/^(?:#|https?:|data:|mailto:|tel:|javascript:|\/\/)/i.test(ref);

test('all four public pages link to existing local CSS, scripts, icons and pages',()=>{
 for(const page of pages){
   const html=read(page);
   for(const match of html.matchAll(/\b(?:href|src)=(["'])(.*?)\1/g)){
     const ref=match[2];
     if(!local(ref))continue;
     const file=cleanRef(ref);
     assert.ok(!file.startsWith('/'),page+': absolute links break GitHub Pages subpaths: '+ref);
     assert.ok(existing(file),page+': broken local link: '+ref);
   }
   const styles=[...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/g)].map(x=>x[0]);
   const expected=page==='index.html'?3:1;
   assert.equal(styles.length,expected,page+': unexpected stylesheet count');
   assert.match(html,/css\/base\.css\?v=31/);
   if(page==='index.html')assert.match(html,/css\/experience\.css\?v=33/);
 }
});

test('all entrypoint scripts and module imports resolve after JS relocation',()=>{
 for(const page of pages){
   const html=read(page);
   const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=(["'])(.*?)\1/g)].map(x=>x[2]);
   assert.ok(scripts.length>=3,page+' missing scripts');
   for(const url of scripts){
     const path=cleanRef(url);
     if(!local(url))continue;
     assert.ok(path.startsWith('js/'),page+' script is not in js/: '+url);
     assert.ok(existing(path),page+' missing JS: '+url);
   }
 }
 for(const file of readdirSync(resolve(root,'js')).filter(x=>extname(x)==='.js')){
   const source=read('js/'+file);
   for(const m of source.matchAll(/\bimport\s+(?:[\s\S]*?\s+from\s+)?(["'])(\.[^"']+)\1/g)){
     const target=resolve(root,'js',cleanRef(m[2]));
     assert.ok(existsSync(target),'js/'+file+' has unresolved import '+m[2]);
   }
 }
});

test('all CSS image URLs resolve relative to the new css directory',()=>{
 for(const file of ['base.css','experience.css','final-call.css']){
   const css=read('css/'+file);
   for(const match of css.matchAll(/url\(\s*(["']?)(\.\.\/assets\/[^"'()]+)\1\s*\)/g)){
     const path=resolve(root,'css',match[2]);
     assert.ok(existsSync(path),'css/'+file+': missing '+match[2]);
   }
   assert.doesNotMatch(css,/url\(\s*["']?assets\//,'CSS still refers to the former root directory');
 }
});

test('scene inventory and editorial scene IDs are valid',()=>{
 const scenes=JSON.parse(read('assets/scenes.json'));
 const used=new Set(),ids=new Set();
 assert.ok(scenes.length>=150,'unexpected loss of scene catalog');
 for(const scene of scenes){
   assert.ok(!ids.has(scene.id),'duplicate scene ID '+scene.id);ids.add(scene.id);
   for(const key of ['desktop','mobile']){
     assert.ok(existing(scene[key]),scene.id+' missing '+scene[key]);
     used.add(scene[key]);
   }
 }
 for(const type of ['desktop','mobile']){
   const dir='assets/screenshots/'+type;
   for(const img of readdirSync(resolve(root,dir))){
     if(img.endsWith('.webp'))assert.ok(used.has(dir+'/'+img),'unreferenced image '+img);
   }
 }
 const timeline=JSON.parse(read('content/timeline.json'));
 const intel=JSON.parse(read('content/intel.json'));
 const today=JSON.parse(read('content/today.json'));
 const articleIDs=new Set([...timeline,...intel].map(x=>x.id));
 for(const doc of [...timeline,...intel,today]){
   for(const key of ['heroSceneId','cardSceneId']){
     if(doc[key])assert.ok(ids.has(doc[key]),'missing scene '+doc[key]+' in '+(doc.id||'today'));
   }
   for(const block of doc.blocks||[]){
     if(block.sceneId)assert.ok(ids.has(block.sceneId),'missing embedded scene '+block.sceneId);
   }
 }
 const config=read('js/config.js');
 for(const [,id] of config.matchAll(/\barticleId:\s*['"]([^'"]+)['"]/g))
   assert.ok(articleIDs.has(id),'config references nonexistent article: '+id);
 for(const [,id] of config.matchAll(/\bsceneId:\s*['"]([^'"]+)['"]/g))
   assert.ok(ids.has(id),'config references nonexistent scene: '+id);
});

test('old versioned assets have been removed but active audio fallback remains',()=>{
 const removed=[
  'styles.css','v6.css','v8.css','v9.css','v10.css','v11.css','v12.css',
  'v13.css','v15.css','v16.css','v17.css','v19.css','v23.css',
  'v26.css','v27.css','v28.css','v29-phase1.css','v29-phase2.css',
  'README-V23.txt',
  'assets/gta-vi-logo.png','assets/gta-vi-logo-clean.png',
  'assets/gta-vi-logo-lockup.png','assets/ryze-gtavi-logo.png'
 ];
 for(const path of removed)assert.equal(existing(path),false,'stale file still present: '+path);
 assert.ok(existing('assets/audio/background-v26.mp3'));
 assert.ok(existing('assets/audio/background-live.mp3'),'keep audio failover');
 assert.ok(existing('assets/gta-vi-logo.webp'));
 assert.ok(existing('assets/ryze-gtavi-logo-lockup.png'));
});
