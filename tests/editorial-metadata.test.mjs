import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const langs=['it','fr','es','de','pt','ru','pl','ja','tr','nl','ko','zh-CN','ar'];
const articlePaths=['js/archive-body-locales.js','js/archive-body-extra-locales.js',
 'js/archive-body-batch-pl.js','js/archive-body-batch-tr.js',
 'js/archive-body-batch2-pl.js','js/archive-body-batch2-tr.js',
 'js/archive-body-batch3-pl.js','js/archive-body-batch3-tr.js',
 'js/archive-body-batch3-ja.js','js/archive-body-batch3-zh-CN.js',
 'js/archive-body-batch3-ar.js','js/archive-body-batch4-ja.js',
 'js/archive-body-batch5-ja.js','js/archive-body-batch5-zh-CN.js',
 'js/archive-body-batch4-ko.js','js/archive-body-batch4-ar.js',
 'js/archive-body-batch6-zh-CN.js','js/archive-body-batch5-ar.js',
 'js/archive-body-batch5-ko.js','js/archive-body-batch6-ko.js',
 ...['fr','es','de','pt','nl','ru'].map(l=>'js/archive-timeline-'+l+'.js'),
 'js/archive-timeline-new-shared.js',
 ...[1,2,3,4,5,6].map(n=>'js/archive-timeline-new-batch'+n+'.js')];

test('Reviewed editorial metadata covers all categories and dates in 13 languages',()=>{
 const ctx={window:{},Intl,Date};
 runInNewContext(read('js/editorial-metadata-locales.js'),ctx);
 const keys=ctx.window.__tfwEditorialMetadataEnglish;
 const values=ctx.window.__tfwEditorialMetadataLocales;
 assert.equal(keys.length,52);
 assert.equal(new Set(keys).size,keys.length);
 assert.deepEqual(Object.keys(values).sort(),[...langs].sort());
 const timeline=JSON.parse(read('content/timeline.json'));
 for(const article of timeline){
  assert.ok(keys.includes(article.category),'Missing category: '+article.category);
  if(article.date!=='2014–2015')assert.ok(keys.includes(article.date),'Missing date: '+article.date);
 }
 for(const label of ['170+ ANIMAL SPECIES','RARE · DISCOVERABLE · LEGENDARY',
  'DYNAMIC WEATHER','TROPICAL STORMS & HURRICANES','AN EXTENDED LOOK'])
  assert.ok(keys.includes(label),'Missing dossier label: '+label);
 for(const lang of langs){
  const items=values[lang];
  assert.equal(items.length,keys.length,'Unequal catalogue length: '+lang);
  assert.ok(items.every(item=>typeof item==='string'&&item.trim()),lang);
  assert.notEqual(items[keys.indexOf('NOV 19, 2026')],'NOV 19, 2026',lang);
  assert.notEqual(items[keys.indexOf('SCHEDULED · LAUNCH')],'SCHEDULED · LAUNCH',lang);
 }
 assert.equal(values.it[keys.indexOf('NOV 19, 2026')],'19 novembre 2026');
 assert.equal(values.fr[keys.indexOf('DYNAMIC WEATHER')],'MÉTÉO DYNAMIQUE');
 assert.equal(values.ar[keys.indexOf('REPORTED · LEAKS')],'تقارير · تسريبات');
});

test('All 41 articles have complete reviewed body segments in every language',()=>{
 const ctx={window:{}};
 for(const file of articlePaths)runInNewContext(read(file),ctx,{filename:file});
 const original=ctx.window.__tfwArchiveBodyEnglish;
 const translations=ctx.window.__tfwArchiveBodyLocales;
 const keys=['intel','timeline'].flatMap(type=>
  JSON.parse(read('content/'+type+'.json')).map(a=>type+':'+a.id));
 assert.equal(keys.length,41);
 assert.deepEqual(Object.keys(original).sort(),[...keys].sort());
 for(const lang of langs){
  assert.deepEqual(Object.keys(translations[lang]).sort(),[...keys].sort(),
   'Missing translated articles in '+lang);
  for(const key of keys){
   const source=original[key],translated=translations[lang][key];
   assert.equal(translated.length,source.length,lang+' '+key);
   assert.ok(translated.every(item=>typeof item==='string'&&item.trim()),lang+' '+key);
  }
 }
});

test('All translated pages load updated reviewed catalogues before the language selector',()=>{
 const script=read('js/reviewed-i18n.js');
 assert.match(script,/editorial-metadata-locales\.js\?v=1/);
 for(const page of ['index.html','today.html','timeline.html','intel.html',
  'intel-archive.html','profile.html','settings.html','support.html',
  'newsletter.html','global-wave.html','streamer-overlay.html','ticket.html']){
  const html=read(page);
  const reviewed=html.indexOf('js/reviewed-i18n.js?v=10');
  const language=html.indexOf('js/language.js?v=54');
  assert.ok(reviewed>=0&&language>reviewed,page);
 }
});
