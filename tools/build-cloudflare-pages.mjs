import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Cloudflare Pages accepts static assets up to 25 MiB. Keep the original
// repository (and its GitHub Pages deployment) untouched, but exclude the
// larger tracks from the Pages output and serve them from Cloudflare R2.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
const r2Base = 'https://media.thefinalwait.com/';
const remoteTracks = [
  'background-live.mp3',
  'background-v26.mp3',
  'final-call-29m55s.mp3',
];
const excluded = new Set(remoteTracks.map(name => 'assets/audio/' + name));
const publicEntries = [
  'index.html', 'today.html', 'timeline.html', 'intel.html',
  'intel-archive.html', 'profile.html', 'ticket.html', 'newsletter.html', 'support.html', 'community-terms.html', 'community-privacy.html',
  'robots.txt', 'site.webmanifest', '_headers',
  'css', 'js', 'content', 'assets',
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of publicEntries) {
  const from = join(root, entry);
  await cp(from, join(output, entry), {
    recursive: true,
    filter: source => !excluded.has(relative(root, source).replaceAll('\\', '/')),
  });
}

// Rewrite asset links only inside the generated Pages output. The sources
// remain unchanged, so the legacy GitHub Pages version continues to work.
const replacements = Object.fromEntries(remoteTracks.map(name => [name, 0]));
async function rewriteDirectory(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) { await rewriteDirectory(path); continue; }
    if (!/\.(?:html|js|css|json|webmanifest)$/i.test(item.name)) continue;
    const original = await readFile(path, 'utf8');
    let updated = original;
    for (const name of remoteTracks) {
      const localPath = 'assets/audio/' + name;
      const occurrences = updated.split(localPath).length - 1;
      if (occurrences) {
        updated = updated.replaceAll(localPath, r2Base + name);
        replacements[name] += occurrences;
      }
    }
    updated = updated.replaceAll('https://ryzexfn750.github.io/the-final-wait/', 'https://thefinalwait.com/');
    if (updated !== original) await writeFile(path, updated);
  }
}
await rewriteDirectory(output);
for (const name of remoteTracks) {
  if (!replacements[name]) throw new Error('Missing expected R2 audio references: ' + name);
}

const maxAssetBytes = 25 * 1024 * 1024;
async function checkSize(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) { await checkSize(path); continue; }
    const { size } = await stat(path);
    if (size > maxAssetBytes) throw new Error('Pages asset exceeds 25 MiB: ' + relative(output, path));
  }
}
await checkSize(output);
// Invoke the IP-timezone Function only for its endpoint. All static pages,
// styles, images and audio remain served through the normal Pages CDN.
await writeFile(join(output,'_routes.json'),JSON.stringify({
  version:1,
  include:['/api/timezone','/api/community/*','/ticket/*'],
  exclude:[]
}));
console.log('Cloudflare Pages output prepared: dist/');
console.log('R2 audio references:', replacements);
