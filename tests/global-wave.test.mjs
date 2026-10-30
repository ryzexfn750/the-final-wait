import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CITIES} from '../js/global-wave-cities.js';
import {EARLIEST,LATEST,DURATION,midnight,buildZones,milestones,waveSnapshot,
 timelineAt,timelinePosition,zoneStatus,cityState,remainingText,offsetLabel,localClock}
 from '../js/global-wave-core.js';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const data=JSON.parse(read('content/geo/timezones-simplified.geojson'));
test('Local November 19 midnight is correct across UTC offsets, DST and unusual regions',()=>{
 const expected={
  'Pacific/Kiritimati':'2026-11-18T10:00:00.000Z',
  'Pacific/Chatham':'2026-11-18T10:15:00.000Z',
  'Pacific/Auckland':'2026-11-18T11:00:00.000Z',
  'Asia/Kathmandu':'2026-11-18T18:15:00.000Z',
  'Asia/Kolkata':'2026-11-18T18:30:00.000Z',
  'Europe/Rome':'2026-11-18T23:00:00.000Z',
  'Europe/London':'2026-11-19T00:00:00.000Z',
  'America/St_Johns':'2026-11-19T03:30:00.000Z',
  'America/New_York':'2026-11-19T05:00:00.000Z',
  'America/Los_Angeles':'2026-11-19T08:00:00.000Z',
  'Pacific/Honolulu':'2026-11-19T10:00:00.000Z',
  'Pacific/Pago_Pago':'2026-11-19T11:00:00.000Z'
 };
 for(const [zone,iso] of Object.entries(expected))assert.equal(new Date(midnight(zone)).toISOString(),iso,zone);
 assert.equal(midnight('INVALID/ZONE'),null);
});
test('Dataset is self-hosted, contains genuine IANA polygon boundaries and retains attribution',()=>{
 assert.equal(data.type,'FeatureCollection');
 assert.ok(data.features.length>=400);
 const zones=buildZones(data.features);
 assert.ok(zones.length>=350,'Too few recognized IANA areas');
 assert.ok(new Set(zones.map(z=>z.tzid)).size>300);
 assert.ok(zones.every(z=>Number.isFinite(z.release)&&z.geometry?.coordinates?.length));
 assert.ok(zones.some(z=>z.tzid==='America/New_York'));
 assert.ok(zones.some(z=>z.tzid==='Australia/Sydney'));
 assert.ok(zones.some(z=>z.tzid==='Europe/Rome'));
 const licence=read('content/geo/README.md');
 assert.match(licence,/ODbL/);assert.match(licence,/OpenStreetMap/);
 const build=read('tools/build-cloudflare-pages.mjs');
 assert.match(build,/'content'/);
});
test('Global wave snapshot and milestone ordering are internally consistent',()=>{
 const zones=buildZones(data.features),groups=milestones(zones);
 assert.ok(groups.length>20);
 assert.ok(groups.every((m,i)=>i===0||m.instant>groups[i-1].instant));
 assert.equal(groups.reduce((n,m)=>n+m.zones.length,0),zones.length);
 const before=waveSnapshot(zones,EARLIEST-1000),end=waveSnapshot(zones,LATEST+1000);
 assert.equal(before.reached,0);assert.equal(before.waiting,zones.length);
 assert.equal(end.reached,zones.length);assert.equal(end.waiting,0);
 assert.equal(end.next,null);
 assert.ok(before.next);
 const at=groups[Math.floor(groups.length/2)].instant;
 const midway=waveSnapshot(zones,at);
 assert.ok(midway.reached>0&&midway.waiting>0);
 assert.equal(midway.reached+midway.waiting,zones.length);
 assert.equal(zoneStatus('Europe/Rome',midnight('Europe/Rome')-1),'waiting');
 assert.equal(zoneStatus('Europe/Rome',midnight('Europe/Rome')),'reached');
});
test('Simulation can be scrubbed, reversed and replayed independently of the real clock',()=>{
 assert.equal(timelineAt(0),EARLIEST);
 assert.equal(timelineAt(1000),LATEST);
 assert.equal(timelineAt(-3),EARLIEST);
 assert.equal(timelineAt(1800),LATEST);
 assert.equal(timelinePosition(EARLIEST),0);
 assert.equal(timelinePosition(LATEST),1000);
 assert.equal(timelinePosition(EARLIEST+DURATION/2),500);
 assert.ok(remainingText(7*86400000+3*3600000).startsWith('7d 03:'));
});
test('City markers retain different zones within the same country',()=>{
 assert.ok(CITIES.length>=30);
 assert.ok(CITIES.every(c=>midnight(c.tz)!==null&&Number.isFinite(c.lat)&&Number.isFinite(c.lng)));
 assert.equal(CITIES.find(c=>c.name==='Miami').tz,'America/New_York');
 assert.notEqual(midnight('America/New_York'),midnight('America/Los_Angeles'));
 assert.notEqual(midnight('Australia/Sydney'),midnight('Australia/Perth'));
 const ny=CITIES.find(c=>c.name==='New York');
 const before=cityState(ny,midnight(ny.tz)-1000);
 const after=cityState(ny,midnight(ny.tz));
 assert.equal(before.reached,false);
 assert.equal(after.reached,true);
 assert.equal(after.countdown,'MIDNIGHT REACHED');
 assert.match(offsetLabel('Europe/Rome',midnight('Europe/Rome')),/UTC\+1/);
 assert.match(localClock('Europe/Rome',midnight('Europe/Rome')),/00:00:00/);
});
test('The site exposes a dedicated route with working 3D and 2D interactions',()=>{
 const page=read('global-wave.html'),js=read('js/global-wave.js'),css=read('css/global-wave.css');
 assert.match(page,/THE GLOBAL<br><em>MIDNIGHT WAVE\./);
 assert.match(page,/id="waveGlobe3D"/);
 assert.match(page,/id="waveMap2D"/);
 assert.match(page,/id="waveTimeline"/);
 assert.match(page,/id="waveModeLive"/);
 assert.match(page,/id="waveModeSim"/);
 assert.match(page,/id="waveCitySearch"/);
 assert.match(page,/id="wavePlay"/);
 assert.match(page,/id="waveView2D"/);
 assert.match(page,/id="waveView3D"/);
 assert.match(page,/noindex,nofollow/);
 assert.match(js,/globe\.gl@2\.46\.2\/dist\/globe\.gl\.min\.js/);
 assert.match(js,/createPlanetPainter/);
 assert.match(js,/onGlobeClick/);
 assert.match(js,/globe\.globeMaterial\(\)/);
 assert.match(js,/material\.map\.needsUpdate=true/);
 assert.doesNotMatch(js,/\.polygonsData\(|\.polygonCapColor\(|\.polygonStrokeColor\(|\.ringsData\(/);
 assert.match(js,/new create\(ui\.globe/);
 assert.match(js,/selectGlobeRegion/);
 assert.match(js,/pointOfView/);
 assert.match(js,/function render2D/);
 assert.match(js,/isPointInPath/);
 assert.match(js,/pauseAnimation\(\)/);
 assert.match(js,/navigator|nav\.deviceMemory/);
 assert.match(css,/@media\(max-width:720px\)/);
 assert.doesNotMatch(page,/THE FINAL WAIT · GLOBAL EXPERIENCE|ONE WORLD\. MANY MIDNIGHTS|class="wave-disclaimer"|SELECT A TERRITORY OR CITY/);
 assert.match(page,/MAP DATA & CREDITS/);
 const stage=page.indexOf('id="waveMapStage"');
 const timeline=page.indexOf('class="wave-timeline-panel"');
 const mapEnd=page.indexOf('class="wave-globe-bottom"');
 assert.ok(stage>=0&&stage<timeline&&timeline<mapEnd,'The slider must remain within the map view');
 const painter=read('js/global-wave-texture.js');
 assert.match(painter,/1024/);
 assert.match(painter,/fill\(path,'evenodd'\)/);
 assert.match(painter,/crossOrigin='anonymous'/);
 assert.doesNotMatch(painter,/WebGLRenderer|ExtrudeGeometry/);
});
test('Homepage CTA, seamless navigation and Cloudflare publication are connected',()=>{
 const home=read('index.html'),nav=read('js/seamless-navigation.js'),build=read('tools/build-cloudflare-pages.mjs');
 assert.match(home,/THE GLOBAL<br><em>MIDNIGHT WAVE/);
 assert.match(home,/href="global-wave\.html"/);
 assert.match(home,/css\/global-wave-teaser\.css\?v=1/);
 assert.match(nav,/'global-wave\.html'/);
 assert.match(build,/'global-wave\.html'/);
 for(const page of ['index.html','today.html','timeline.html','intel.html',
  'intel-archive.html','profile.html','newsletter.html','support.html','settings.html','streamer-overlay.html']){
  assert.match(read(page),/js\/seamless-navigation\.js\?v=58/,page);
 }
});
