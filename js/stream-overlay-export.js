/* Build a dependency-free browser source that works without Cloudflare Access. */
import {normalizeOptions} from './stream-overlay-core.js?v=5';
export function bundleOverlayHtml({template,css,core,runner,options}){
 const normalized=normalizeOptions(options);
 const settings=JSON.stringify(normalized).replace(/</g,'\\u003c');
 const embeddedCore=core.replace(/^export\s+/gm,'');
 const importPattern=/^import\s+\{[\s\S]*?\}\s*from\s*['"]\.\/stream-overlay-core\.js\?v=\d+['"];\s*/m;
 if(!importPattern.test(runner))throw Error('The browser source module has an unexpected import');
 const embeddedRunner=runner.replace(importPattern,'')
  .replace('let config=parseOptions(location.search);','let config=normalizeOptions('+settings+');');
 if(embeddedRunner.includes('let config=parseOptions(location.search);'))
  throw Error('Could not embed the saved overlay settings');
 const safeScript=(embeddedCore+'\n'+embeddedRunner).replace(/<\/script/gi,'<\\/script');
 const result=template
  .replace(/<link rel="stylesheet" href="css\/stream-overlay\.css\?v=\d+">/,
    '<style>\n'+css.replace(/<\/style/gi,'<\\/style')+'\n</style>')
  .replace(/<script type="module" src="js\/stream-overlay\.js\?v=\d+"><\/script>/,
    '<script>\n'+safeScript+'\n</script>');
 if(/href="css\/stream-overlay\.css|src="js\/stream-overlay\.js/.test(result))
  throw Error('Could not inline the browser source assets');
 return result;
}
