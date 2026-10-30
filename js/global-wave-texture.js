/* One equirectangular CanvasTexture replaces hundreds of overlapping 3D
 * extruded timezone meshes. It prevents polygon-cap triangulation artifacts,
 * z-fighting and massive GPU overdraw near the poles and antimeridian. */
export function createPlanetPainter(mapPaths){
 const canvas=document.createElement('canvas');
 canvas.width=1024;canvas.height=512;
 const ctx=canvas.getContext('2d',{alpha:false});
 let night=null,lastAt=Date.now(),onNight=null;
 function paint(at){
  lastAt=at;
  const w=canvas.width,h=canvas.height;
  ctx.resetTransform();
  ctx.clearRect(0,0,w,h);
  if(night){
   ctx.drawImage(night,0,0,w,h);
   ctx.fillStyle='rgba(12,9,34,.27)';ctx.fillRect(0,0,w,h);
  }else{
   const g=ctx.createLinearGradient(0,0,0,h);
   g.addColorStop(0,'#241d47');g.addColorStop(.5,'#10112b');g.addColorStop(1,'#211843');
   ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }
  ctx.save();ctx.setTransform(w/960,0,0,h/480,0,0);
  for(const {feature:f,path} of mapPaths){
   const released=at>=f.release,soon=!released&&f.release-at<=3600000;
   ctx.fillStyle=released?'rgba(241,101,184,.65)':soon?'rgba(239,175,111,.65)':'rgba(127,96,189,.20)';
   ctx.strokeStyle=released?'rgba(255,179,229,.46)':'rgba(173,145,220,.25)';
   ctx.lineWidth=.45;
   ctx.fill(path,'evenodd');ctx.stroke(path);
  }
  ctx.restore();
  return canvas;
 }
 async function loadNight(onUpdated){
  onNight=onUpdated;
  const img=new Image();img.crossOrigin='anonymous';
  const ok=await new Promise(resolve=>{
   let finished=false;
   const done=v=>{if(finished)return;finished=true;clearTimeout(timeout);resolve(v)};
   const timeout=setTimeout(()=>done(false),5000);
   img.onload=()=>done(true);
   img.onerror=()=>done(false);
   img.src='https://cdn.jsdelivr.net/npm/three-globe@2.45.0/example/img/earth-night.jpg';
  });
  if(ok){night=img;paint(lastAt);if(typeof onNight==='function')onNight()}
 }
 return {canvas,paint,loadNight};
}
