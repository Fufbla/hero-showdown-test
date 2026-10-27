/* Whole-body Styrodog animation. No gameplay or shared fighter state is changed. */
(function(){
 'use strict';
 const core=HealthiaStyrodogCore,profile=HealthiaStyrodogAtlas;
 const enabled=new URLSearchParams(location.search).get('styrodog')!=='original';
 const frames=new Map(),history=new WeakMap(),errors=[];
 const originalSprite=dogMotionSprite,originalUpdate=updateStyrodog;
 const ready=()=>frames.size===32;
 const active=()=>enabled&&ready()&&opponent===1;
 const loading=profile.sheets.map(sheet=>new Promise(resolve=>{
  if(!enabled){resolve(false);return;}
  const im=new Image();
  im.onload=()=>{
   try{
    const registered=sheet.frames.map((f,i)=>{
     const [sx,sy,w,h,ax,ay]=f;
     if(!f.every(Number.isFinite)||w<=0||h<=0||sx<0||sy<0||sx+w>im.naturalWidth||sy+h>im.naturalHeight||ax<sx||ax>sx+w||ay<sy||ay>sy+h)throw new Error('Invalid Styrodog crop or anchor');
     const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
     const context=canvas.getContext('2d'),mask=sheet.masks?.[i];
     if(mask){context.beginPath();mask.forEach(([x,y],j)=>j?context.lineTo(x,y):context.moveTo(x,y));context.closePath();context.clip();}
     context.drawImage(im,sx,sy,w,h,0,0,w,h);
     return [sheet.first+i,{canvas,anchor:[ax-sx,ay-sy],scale:350/sheet.referenceHeight}];
    });
    registered.forEach(([id,entry])=>frames.set(id,entry));resolve(true);
   }catch(error){errors.push({asset:sheet.file,message:error.message});resolve(false);}
  };
  im.onerror=()=>{errors.push({asset:sheet.file,message:'Using original Styrodog animation.'});resolve(false);};
  im.src='assets/animation/'+sheet.file;
 }));
 function facing(){
  if(mode==='victory')return boss.dogDeathFacing||-1;
  if(boss.breakout)return boss.breakout.dir||boss.dir||-1;
  if(boss.hitstun>0)return boss.dogHitFacing||-1;
  if(boss.guardFlash>0)return boss.guardFacing||boss.dogFacing||-1;
  return boss.state==='idle'?(boss.dogFacing||-1):(boss.dir||-1);
 }
 function snapshot(){return {x:boss.x,face:facing(),stride:boss.dogStride||0,state:boss.state};}
 function visual(){
  const locked=paused||hitStop>0||specialSceneLocked()||coGuest()||mode!=='fight'||boss.state!=='idle'||!boss.dogMoving||boss.hitstun>0||boss.guardFlash>0||boss.breakout;
  return core.interpolate(history.get(boss),snapshot(),simulationRemainder/FIXED_STEP,locked);
 }
 function data(v){return {state:boss.state,type:boss.type,timer:boss.timer,time:t,ending,victory:mode==='victory',moving:!!boss.dogMoving,
  stride:v.stride,hitstun:boss.hitstun||0,hitDuration:boss.dogHitDuration,heavy:!!boss.dogHeavy,guard:boss.guardFlash||0,breakout:boss.breakout};}
 updateStyrodog=function(dt){
  const subject=boss,previous=snapshot(),result=originalUpdate(dt);
  if(subject===boss&&dt>0)history.set(subject,previous);
  return result;
 };
 dogMotionSprite=function(originalPose,x,feet,dir){
  if(!active()||!boss)return originalSprite(originalPose,x,feet,dir);
  const v=visual(),p=core.pose(data(v));
  if(p.legacy)return originalSprite(originalPose,x,feet,dir);
  const {canvas,anchor,scale}=frames.get(p.frame);
  ctx.save();ctx.translate(x+v.x-boss.x,GROUND+p.lift);ctx.scale(-v.face*scale,scale);
  ctx.drawImage(canvas,-anchor[0],-anchor[1],canvas.width,canvas.height);ctx.restore();
 };
 // Existing drawStyrodog keeps foam particles, swipe effects and the approved collapse.
 window.HealthiaStyrodogAnimation={enabled,ready,active,whenLoaded:Promise.all(loading),
  inspect(){if(!boss||opponent!==1)return null;const v=visual(),p=core.pose(data(v));return {state:p.state,pose:p.frame,legacy:!!p.legacy,x:v.x,lift:p.lift,facing:v.face};},
  metrics(){return {enabled,ready:ready(),addedDrawings:frames.size,walkFrames:8,errors:[...errors],textureBytes:[...frames.values()].reduce((n,e)=>n+e.canvas.width*e.canvas.height*4,0)};}
 };
})();
