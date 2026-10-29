import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Global GTA pointer is independent of hero/article detection and works on mouse-equipped hybrids',()=>{
  const handlers={},frames=[];
  class Classes{
    constructor(){this.set=new Set()}
    add(name){this.set.add(name)}
    remove(name){this.set.delete(name)}
    toggle(name,on){if(on)this.set.add(name);else this.set.delete(name)}
    contains(name){return this.set.has(name)}
  }
  class El{
    constructor(){this.classList=new Classes();this.style={};this.children=[];this.attrs={}}
    setAttribute(key,value){this.attrs[key]=value}
    appendChild(el){this.children.push(el);return el}
  }
  const root=new El();
  const document={
    readyState:'complete',
    documentElement:new El(),
    body:root,
    createElement:()=>new El(),
    getElementById(id){return root.children.find(node=>node.id===id)||null},
    addEventListener(name,fn){(handlers[name]??=[]).push(fn)}
  };
  const window={addEventListener(name,fn){(handlers['window:'+name]??=[]).push(fn)}};
  let now=10000;
  runInNewContext(read('js/site-polish.js'),{
    window,document,Number,Date:{now:()=>now},
    requestAnimationFrame:fn=>{frames.push(fn);return frames.length}
  });
  const emit=(name,event={})=>{
    for(const fn of handlers[name]||[])fn(event);
  };
  const layer=document.getElementById('tfwGlobalCursor');
  assert.ok(layer,'Standalone layer created on the document root');
  assert.equal(root.children.length,1);
  assert.equal(layer.children.length,3,'Halo, reticle and autoscroll indicator');
  assert.equal(window.__tfwGlobalCursorStatus().active,false);
  assert.equal(document.documentElement.classList.contains('tfw-global-cursor-ready'),false);

  const neutral={closest:()=>null};
  emit('pointermove',{clientX:125,clientY:280,pointerType:'mouse',target:neutral});
  assert.equal(window.__tfwGlobalCursorStatus().active,true);
  assert.equal(document.documentElement.classList.contains('tfw-global-cursor-ready'),true);
  assert.equal(layer.classList.contains('active'),true);
  frames.shift()();
  assert.match(layer.children[0].style.transform,/125px,280px/);
  assert.match(layer.children[1].style.transform,/123\.7px,279px/); // click hotspot at arrow tip

  // The entire site, rather than article-only containers, emits events.
  emit('mousemove',{clientX:455,clientY:76,target:{closest:selector=>selector.startsWith('a,button')}});
  frames.shift()();
  assert.match(layer.children[0].style.transform,/455px,76px/);
  assert.equal(layer.classList.contains('interactive'),true);

  emit('pointermove',{
    clientX:490,clientY:86,pointerType:'mouse',
    target:{closest:selector=>selector.includes('contenteditable')}
  });
  frames.shift()();
  assert.equal(layer.classList.contains('text-input'),true);

  // Touch must not replace the normal touch interface or leave the halo on.
  emit('pointerdown',{pointerType:'touch'});
  assert.equal(layer.classList.contains('active'),false);
  emit('pointermove',{clientX:40,clientY:50,pointerType:'touch',target:neutral});
  assert.equal(layer.classList.contains('active'),false);
  emit('mousemove',{clientX:41,clientY:51,target:neutral});
  assert.equal(layer.classList.contains('active'),false,'No fake mouse halo immediately after touch');
  now+=1000;
  emit('mousemove',{clientX:42,clientY:52,target:neutral});
  assert.equal(layer.classList.contains('active'),true);

  emit('window:blur');
  assert.equal(layer.classList.contains('active'),false);
  emit('mouseout',{relatedTarget:null});
  assert.equal(layer.classList.contains('active'),false);
});

test('Global mouse halo is fixed above all sections and installed on every site route',()=>{
  const css=read('css/site-polish.css'),js=read('js/site-polish.js');
  assert.match(css,/#tfwGlobalCursor\.tfw-global-cursor-layer\{\s*position:fixed!important/);
  assert.match(css,/z-index:2147483000!important/);
  assert.match(css,/pointer-events:none!important/);
  assert.match(css,/width:210px!important/);
  const pointer=css.slice(css.indexOf('#tfwGlobalCursor .tfw-global-cursor-reticle{'),css.indexOf('#tfwGlobalCursor .tfw-global-cursor-reticle:before'));
  assert.match(pointer,/width:18px!important/);
  assert.match(pointer,/height:24px!important/);
  assert.match(css,/#tfwGlobalCursor.interactive .tfw-global-cursor-reticle\{\s*width:18px!important;\s*height:24px!important/);
  assert.match(css,/rgba\(242,63,178,\.065\)/);
  assert.match(js,/linearGradient id="tfwArrowGradient"/);
  assert.match(js,/M2 1\.5 L2 27/);
  assert.doesNotMatch(css,/#tfwGlobalCursor \.tfw-global-cursor-reticle\{[^}]*border-radius:50%/);
  assert.match(css,/html\.tfw-global-cursor-ready \.cursor-glow/);
  assert.match(js,/document\.addEventListener\('pointermove',move/);
  assert.match(js,/document\.addEventListener\('mousemove',move/);
  assert.doesNotMatch(js,/if\(!fine\|\|reduced\|\|!glow\)return/);
  for(const page of ['index.html','today.html','intel.html','timeline.html','intel-archive.html']){
    const html=read(page);
    assert.ok(html.includes('css/site-polish.css?v=50'),page+' updated stylesheet');
    assert.ok(html.includes('js/site-polish.js?v=43'),page+' updated script');
  }
});
