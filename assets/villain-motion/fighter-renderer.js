/* Isolated Versus renderer. Combat, collision and story boss controllers are never advanced here. */
'use strict';
window.HealthiaVillainMotion=(()=>{
 const Core=HealthiaVillainMotionCore,Atlas=HealthiaVillainAtlas,Data=HealthiaCompetitiveData;
 const original={styrodog:HealthiaStyrodogAtlas,sonic:HealthiaSonicTuskAtlas,venomis:HealthiaVenomisThornbearAtlas,styro:HealthiaStyroAtlas,wastelander:HealthiaWastelanderAtlas,bushman:HealthiaBushmanAtlas,air:HealthiaAirPollutionAtlas,spree:HealthiaLighteningSpreeAtlas};
 const images=new Map(),cache=new Map(),errors=[],loads=[];let complete=false;
 function image(file,folder='animation'){
  const url='assets/'+folder+'/'+file;if(images.has(url))return images.get(url);
  const im=new Image();images.set(url,im);loads.push(new Promise(resolve=>{im.onload=()=>resolve(true);im.onerror=()=>{errors.push(url);resolve(false);};im.src=url;}));return im;
 }
 for(const a of Object.values(original))for(const s of a.sheets||[a])image(s.file);
 for(const a of Object.values(Atlas))image(a.file,'villain-motion');
 function source(id,frame,newArt=false){
  const a=newArt?Atlas[id]:original[id];if(!a)return null;
  if(newArt){const f=a.frames[frame];return f?{...f,ref:a.referenceHeight,im:image(a.file,'villain-motion'),key:a.file+':'+frame}:null;}
  let s,f,index;
  if(a.sheets){for(const candidate of a.sheets){const i=candidate.frames.findIndex((x,j)=>typeof x.id==='number'?x.id===frame:candidate.first+j===frame);if(i>=0){s=candidate;f=candidate.frames[i];index=i;}}}else{s=a;f=a.frames[frame];index=frame;}
  if(!f)return null;const raw=Array.isArray(f)?f:f.crop,[x,y,w,h,ax,ay]=raw;
  return {crop:[x,y,w,h],anchor:[ax-x,ay-y],ref:f.referenceHeight||s.referenceHeight,mask:s.masks?.[index],im:image(s.file),facing:-1,key:s.file+':'+frame};
 }
 function outline(canvas){const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data,p=[];for(let y=0;y<canvas.height;y+=3){let l=canvas.width,r=-1;for(let x=0;x<canvas.width;x++)if(d[(y*canvas.width+x)*4+3]>16){l=Math.min(l,x);r=x;}if(r>=0)p.push([l,y],[r,y]);}return p;}
 function texture(s){
  if(!s?.im.complete||!s.im.naturalWidth)return null;
  if(cache.has(s.key)){const entry=cache.get(s.key);cache.delete(s.key);cache.set(s.key,entry);if(cache.size>64)cache.delete(cache.keys().next().value);return entry;}
  const [x,y,w,h]=s.crop,c=document.createElement('canvas');c.width=w;c.height=h;const d=c.getContext('2d');
  if(s.clipRuns){d.beginPath();for(let i=0;i<s.clipRuns.length;i+=3)d.rect(s.clipRuns[i],s.clipRuns[i+1],s.clipRuns[i+2],1);d.clip();}
  else if(s.mask?.length){d.beginPath();s.mask.forEach((p,i)=>i?d.lineTo(p[0],p[1]):d.moveTo(p[0],p[1]));d.closePath();d.clip();}
  d.drawImage(s.im,x,y,w,h,0,0,w,h);const entry={canvas:c,outline:outline(c)};cache.set(s.key,entry);if(cache.size>64)cache.delete(cache.keys().next().value);return entry;
 }
 function stamp(ctx,s,x,y,height,face,v={},alpha=1){
  const t=texture(s);if(!t)return false;const scale=height/s.ref,mirror=face/(s.facing||-1),sx=v.sx||1,sy=v.sy||1;
  if(v.groundContact){const angle=-(v.roll||0),sin=Math.sin(angle),cos=Math.cos(angle);const bottom=Math.max(...t.outline.map(p=>(sin*(p[0]-s.anchor[0])*sx+cos*(p[1]-s.anchor[1])*sy)*scale));y=604-bottom;}
  ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.scale(mirror*scale,scale);ctx.rotate(-(v.roll||0));ctx.scale(sx,sy);ctx.drawImage(t.canvas,-s.anchor[0],-s.anchor[1]);ctx.restore();return true;
 }
 // Exact competitive phases choose the art. No animation timer can trigger a hit.
 const abilities={
  styrodog:{shoot:[[28,29],[30],[31,29]],skill:[[22,23,24,25],[26],[27,22]],special:[[28,29],[30],[31,29]]},
  sonic:{shoot:[[16,17,18],[19,20],[21,17]],skill:[[22,23,24,25],[26],[27,22]],special:[[28,29],[30],[31,29]]},
  venomis:{shoot:[[22,23],[24],[25,23]],skill:[[26,27],[28],[29,27]],special:[[16,17,18],[19,20],[21,17]]},
  styro:{shoot:[[24,25],[26],[27,25]],skill:[[24,25],[26],[27,25]],special:[[28,29,30,18],[19,20],[21,22,31]]},
  wastelander:{shoot:[[24,25],[26],[27,25]],skill:[[28,29],[30],[31,29]],special:[[16,17,18,32,33],[20,19],[21,22,23]]},
  atomdust:{shoot:[[6],[7],[8]],skill:[[1,6],[7],[8,0]],special:[[6],[7],[8,0]]},
  spree:{shoot:[[4,5],[6],[7,5]],skill:[[8,9],[10],[11,9]],special:[[4,5],[6],[7,5]]},
  bushman:{shoot:[[24,25],[26],[27,25]],skill:[[28,29],[30],[31,29]],special:[[28,29],[30],[31,29]]},
  air:{shoot:[[7],[8],[9]],skill:[[10],[11],[10]],special:[[12],[13],[12]]}
 };
 function abilityFrame(id,v){const list=abilities[id]?.[v.key]?.[{windup:0,active:1,recovery:2}[v.phase]];return list?list[Math.min(list.length-1,Math.floor(v.progress*list.length))]:0;}
 function walkFrame(id,f){const q=((f.walk||0)%1+1)%1;return id==='bushman'?Math.floor(q*4):Math.floor(q*8);}
 function newFrame(f,v){
  if(v.state==='walk'&&Atlas[f.id+'_walk'])return {id:f.id+'_walk',frame:Math.floor(v.step*8)};
  return {id:f.id,frame:v.frame};
 }
 function drawTrainer(ctx,f,v){
  const walking=Math.abs(f.vx)>12;let frame=walking?32+Math.floor(((f.walk%1)+1)%1*8):40;
  if(v.normal||v.state==='ability')frame=43;if(f.hp<=0)frame=47;
  // Thornbear can leap while his handler stays on the arena floor.
  stamp(ctx,source('venomis',frame),Core.clamp(f.x-v.face*125,70,1210),604,260,v.face,{bodyY:0},.94);
 }
 function drawAir(ctx,f,v){
  let frame=v.frame,newArt=true,sx=1,sy=1,roll=v.roll;
  if(v.state==='ability'||v.state==='air-ability'){frame=abilityFrame('air',v);newArt=false;}
  else if(v.state==='walk'||v.state==='dash'){frame=3+Math.floor(((f.walk%1+1)%1)*4);newArt=false;roll+=Core.clamp(f.vx/2000,-.08,.08);}
  else if(v.air){sy=v.frame===2?.88:1;roll+=Core.clamp(f.vx/2000,-.08,.08);}
  ctx.save();ctx.beginPath();ctx.rect(-4096,-4096,8192,4700);ctx.clip();
  stamp(ctx,source('air',frame,newArt),f.x+v.face*v.lean,f.y+v.bodyY,330,v.face,{...v,sx,sy,roll});ctx.restore();
  return {frame,newArt};
 }
 function draw({ctx,fighter:f,opponent:other,world}){
  const v=Core.pose(f,world),height=Data.byId[f.id].height;let frame=v.frame,newArt=false,sheet=f.id;
  ctx.save();if(f.invisible>0)ctx.globalAlpha=f.invisible<.4?.17+(1-f.invisible/.4)*.6:.17;
  if(f.id==='venomis')drawTrainer(ctx,f,v);
  if(f.id==='air'){const p=drawAir(ctx,f,v);frame=p.frame;newArt=p.newArt;}
  else{
   let artId=f.id;
   if(v.state==='ability'&&!(v.phase==='recovery'&&v.progress>.72)){frame=abilityFrame(f.id,v);newArt=f.id==='atomdust';}
   else if(v.state==='walk'&&!Atlas[f.id+'_walk'])frame=walkFrame(f.id,f);
   else if(Atlas[f.id]){const selected=newFrame(f,v);frame=selected.frame;artId=selected.id;newArt=true;}
   else frame=v.air?f.id==='styrodog'?24:13:v.state==='landing'?14:8;
   const recoil=v.state==='ability'?(v.phase==='windup'?-2*Core.ease(v.progress):v.phase==='active'?3:3*(1-Core.ease(v.progress))):v.lean;
   const y=f.y+v.bodyY;
   if(f.id==='styro'&&v.key==='special'&&v.phase==='active'){
    // Decoys remain translucent; the hittable fighter stays visibly at its combat root.
    stamp(ctx,source('styro',0,true),f.x-v.face*75,y,height,v.face,{roll:-.02},.25);
    stamp(ctx,source('styro',0,true),f.x+v.face*75,y,height,v.face,{roll:.02},.25);
   }
   if(artId==='atomdust'&&newArt&&[6,7,8].includes(frame)){artId='atomdust_punch';frame=frame-6;}
   if(f.id==='styrodog'&&newArt&&frame===2){frame=24;newArt=false;}
   sheet=artId;const rendered=stamp(ctx,source(artId,frame,newArt),f.x+v.face*recoil,y,height,v.face,v);
   if(!rendered)stamp(ctx,source(f.id,8),f.x,y,height,v.face,v);
  }
  if(f.block||f.guardStun>0){ctx.strokeStyle=f.slot?'#ffbf91':'#9cf9e1';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(f.x+v.face*48,f.y-120,38,94,0,0,Math.PI*2);ctx.stroke();}
  ctx.restore();return {state:v.state,phase:v.phase,pose:frame,facing:v.face,airborne:v.air,legacy:false,newArt,sheet};
 }
 for(const c of Data.roster.filter(c=>c.villain!==undefined))HealthiaCompetitiveAnimation.register(c.id,draw);
 const whenLoaded=Promise.all(loads).then(ok=>{complete=ok.every(Boolean);return complete;});
 return Object.freeze({whenLoaded,ready:()=>complete,metrics:()=>({ready:complete,errors:[...errors],newSheets:Object.keys(Atlas),cachedFrames:cache.size,sourceSheets:images.size}),pose:Core.pose,draw});
})();
