/* Whole-body presentation for the two actors. Combat, followers and hazards stay authoritative. */
(function(){
 'use strict';
 const core=HealthiaVenomisThornbearCore,profile=HealthiaVenomisThornbearAtlas;
 const enabled=new URLSearchParams(location.search).get('venomis')!=='original';
 const frames=new Map(),history=new WeakMap(),errors=[];
 const originalSprite=venomMotionSprite,originalUpdate=updateVenomis;
 const ready=()=>frames.size===48;
 const active=()=>enabled&&ready()&&opponent===3;
 const loading=profile.sheets.map(sheet=>new Promise(resolve=>{
  if(!enabled){resolve(false);return;}
  const im=new Image();
  im.onload=async()=>{
   try{
    const registered=await Promise.all(sheet.frames.map(async(f,i)=>{
     const [sx,sy,w,h,ax,ay]=f;
     if(!f.every(Number.isFinite)||w<=0||h<=0||sx<0||sy<0||sx+w>im.naturalWidth||sy+h>im.naturalHeight||ax<sx||ax>sx+w||ay<sy||ay>sy+h)throw new Error('Invalid Venomis / Thornbear crop or anchor');
     const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
     const context=canvas.getContext('2d'),mask=sheet.masks?.[i];
     if(mask){context.beginPath();mask.forEach(([x,y],j)=>j?context.lineTo(x,y):context.moveTo(x,y));context.closePath();context.clip();}
     context.drawImage(im,sx,sy,w,h,0,0,w,h);
     // Freeze the isolated drawing once so the main canvas can reuse an immutable texture.
     let texture=canvas;
     if(typeof createImageBitmap==='function'){try{texture=await createImageBitmap(canvas);}catch(_){/* Older renderers keep the prepared canvas. */}}
     return [sheet.first+i,{canvas:texture,anchor:[ax-sx,ay-sy],referenceHeight:sheet.referenceHeight}];
    }));
    registered.forEach(([id,entry])=>frames.set(id,entry));resolve(true);
   }catch(error){errors.push({asset:sheet.file,message:error.message});resolve(false);}
  };
  im.onerror=()=>{errors.push({asset:sheet.file,message:'Using original Venomis and Thornbear animation.'});resolve(false);};
  im.src='assets/animation/'+sheet.file;
 }));
 function facing(){
  if(mode==='victory')return boss.venomDeathFacing||-1;
  if(boss.breakout)return boss.breakout.dir||boss.dir||-1;
  if(boss.hitstun>0)return boss.venomHitFacing||-1;
  if(boss.guardFlash>0)return boss.guardFacing||boss.dir||-1;
  return boss.dir||(hero.x>boss.x?1:-1);
 }
 function snapshot(){
  const face=facing();
  return {bear:{x:boss.x,face,stride:boss.bearStride||0,state:boss.state},
   trainer:{x:Number.isFinite(boss.trainerX)?boss.trainerX:core.clamp(boss.x-face*245,125,1135),face:mode==='victory'?face:(boss.trainerDir||face),stride:boss.trainerStride||0,state:boss.state}};
 }
 function visual(){
  const now=snapshot(),previous=history.get(boss),alpha=simulationRemainder/FIXED_STEP;
  const locked=paused||hitStop>0||specialSceneLocked()||coGuest()||mode!=='fight'||boss.breakout;
  return {bear:core.interpolate(previous?.bear,now.bear,alpha,locked||boss.state!=='idle'||!boss.bearMoving||boss.hitstun>0||boss.guardFlash>0),
   trainer:core.interpolate(previous?.trainer,now.trainer,alpha,locked||!boss.trainerMoving)};
 }
 function data(v){
  // Vines keep ageing during hitstun; the bear's paused attack timer does not.
  const liveVineAge=vines.length?Math.min(...vines.map(v=>v.age)):undefined;
  return {state:boss.state,type:boss.type,timer:boss.timer,time:t,ending,victory:mode==='victory',moving:!!boss.bearMoving,stride:v.bear.stride,
   trainerMoving:!!boss.trainerMoving,trainerStride:v.trainer.stride,hitstun:boss.hitstun||0,hitDuration:boss.venomHitDuration,heavy:!!boss.venomHeavy,
   guard:boss.guardFlash||0,breakout:boss.breakout,volley:boss.volley||0,vineAge:liveVineAge};
 }
 updateVenomis=function(dt){
  const subject=boss,previous=snapshot(),result=originalUpdate(dt);
  if(subject===boss&&dt>0)history.set(subject,previous);
  return result;
 };
 venomMotionSprite=function(sheet,originalFrames,originalPose,x,feet,height,dir){
  const kind=sheet===bearMotionSheet?'bear':sheet===trainerMotionSheet?'trainer':null;
  if(!active()||!boss||!kind)return originalSprite(sheet,originalFrames,originalPose,x,feet,height,dir);
  const v=visual(),p=kind==='bear'?core.bearPose(data(v)):core.trainerPose(data(v));
  if(p.legacy)return originalSprite(sheet,originalFrames,originalPose,x,feet,height,dir);
  const entry=frames.get(p.frame);
  if(!entry)return originalSprite(sheet,originalFrames,originalPose,x,feet,height,dir);
  const {canvas,anchor,referenceHeight}=entry,scale=height/referenceHeight,position=v[kind],current=snapshot()[kind];
  ctx.save();ctx.translate(x+position.x-current.x,feet);ctx.scale(-position.face*scale,scale);
  ctx.drawImage(canvas,-anchor[0],-anchor[1],canvas.width,canvas.height);ctx.restore();
 };
 // drawVenomis still owns warning links, claw arcs, projectiles, ground vines and defeat.
 window.HealthiaVenomisThornbearAnimation={enabled,ready,active,whenLoaded:Promise.all(loading),
  inspect(){if(!boss||opponent!==3)return null;const v=visual(),d=data(v),bear=core.bearPose(d),trainer=core.trainerPose(d);return {
   bear:{state:bear.state,pose:bear.frame,legacy:!!bear.legacy,x:v.bear.x,facing:v.bear.face},
   trainer:{state:trainer.state,pose:trainer.frame,legacy:!!trainer.legacy,x:v.trainer.x,facing:v.trainer.face}};},
  metrics(){return {enabled,ready:ready(),addedDrawings:frames.size,bearWalkFrames:8,trainerWalkFrames:8,errors:[...errors],textureBytes:[...frames.values()].reduce((n,e)=>n+e.canvas.width*e.canvas.height*4,0)};}
 };
})();
