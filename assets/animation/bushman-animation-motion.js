/* New body poses only; native fire, charge, damage, networking and defeat remain intact. */
(function(){
 'use strict';
 const core=HealthiaBushmanMotionCore,profile=HealthiaBushmanAtlas;
 const enabled=new URLSearchParams(location.search).get('bushman')!=='original';
 const frames=new Map(),history=new WeakMap(),reactions=new WeakMap(),errors=[];
 const originalSprite=bushmanSprite,originalUpdate=updateBushman,originalHit=hitBoss;
 const ready=()=>frames.size===32;
 const active=()=>enabled&&ready()&&opponent===8;
 const loading=profile.sheets.map(sheet=>new Promise(resolve=>{
  if(!enabled){resolve(false);return;}
  const image=new Image();
  image.onload=async()=>{
   try{
    const entries=await Promise.all(sheet.frames.map(async(frame,i)=>{
     const [x,y,w,h,ax,ay]=frame.crop;
     if(!frame.crop.every(Number.isFinite)||w<=0||h<=0||x<0||y<0||x+w>image.naturalWidth||y+h>image.naturalHeight||ax<x||ax>x+w||ay<y||ay>y+h)throw Error('Invalid Bushman crop or ground anchor');
     if(frame.contact&&(!frame.contact.every(Number.isFinite)||frame.contact[0]<x||frame.contact[0]>x+w||frame.contact[1]<y||frame.contact[1]>=ay))throw Error('Invalid Bushman attack registration');
     const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(image,x,y,w,h,0,0,w,h);
     let texture=canvas;if(typeof createImageBitmap==='function'){try{texture=await createImageBitmap(canvas);}catch(_){/* Canvas fallback keeps the same prepared art. */}}
     const id=frame.id??sheet.first+i;if(!Number.isInteger(id)||id<0||id>=32)throw Error('Invalid Bushman pose id');
     return [id,{texture,frame,referenceHeight:frame.referenceHeight||sheet.referenceHeight}];
    }));
    entries.forEach(([id,entry])=>frames.set(id,entry));resolve(true);
   }catch(error){errors.push({asset:sheet.file,message:error.message});resolve(false);}
  };
  image.onerror=()=>{errors.push({asset:sheet.file,message:'Using original Bushman animation.'});resolve(false);};
  image.src='assets/animation/'+sheet.file;
 }));
 function snapshot(){return {x:boss.x,face:bushman.action?.face||boss.dir||-1,stride:bushman.walk,state:boss.state};}
 function visual(){
  const now=snapshot(),locked=paused||hitStop>0||specialSceneLocked()||coGuest()||mode!=='fight'||!bushman.moving||boss.hitstun>0||bushman.recoil>0||boss.breakout||boss.guardFlash>0||boss.state!=='idle';
  return core.interpolate(history.get(boss),now,simulationRemainder/FIXED_STEP,locked);
 }
 function parameters(v){
  const reaction=reactions.get(boss);
  return {victory:mode==='victory',breakout:boss.breakout,hitstun:boss.hitstun||0,recoil:bushman.recoil,
   heavy:reaction?.heavy??Math.abs(boss.vx||0)>240,reactionDuration:reaction?.duration||.27,
   guard:boss.guardFlash||0,guarding:boss.state==='tempest-guard',moving:bushman.moving,stride:v.stride,time:bushman.time,
   action:bushman.action,attack:bushman.action?BushmanCore.ATTACKS[bushman.action.kind]:null};
 }
 updateBushman=function(dt){
  if(!boss)return originalUpdate(dt);
  const subject=boss,previous=snapshot(),result=originalUpdate(dt);
  if(subject===boss&&dt>0)history.set(subject,previous);
  return result;
 };
 hitBoss=function(...args){
  const subject=boss,before=subject?.hp,result=originalHit(...args);
  if(enabled&&opponent===8&&subject===boss&&subject&&subject.hp<before)reactions.set(subject,{heavy:args[3]==='kick'||args[0]>=20,duration:bushman.recoil||.27});
  return result;
 };
 bushmanSprite=function(sheet,frame,x,y,face,alpha=1){
  if(!active()||!boss||!bushman)return originalSprite(sheet,frame,x,y,face,alpha);
  const v=visual(),p=core.pose(parameters(v));
  if(p.legacy)return originalSprite(sheet,frame,x,y,face,alpha);
  const entry=frames.get(p.frame);if(!entry)return originalSprite(sheet,frame,x,y,face,alpha);
  const reg=core.registration(entry.frame,entry.referenceHeight,p);
  ctx.save();ctx.translate(x+v.x-boss.x,y);ctx.scale(-v.face*reg.scale,reg.scale);ctx.globalAlpha*=alpha;
  ctx.drawImage(entry.texture,-reg.anchor[0],-reg.anchor[1]);ctx.restore();
 };
 window.HealthiaBushmanAnimation={enabled,ready,active,whenLoaded:Promise.all(loading),
  inspect(){
   if(!boss||!bushman||opponent!==8)return null;const v=visual(),p=core.pose(parameters(v)),entry=frames.get(p.frame);
   const reg=entry?core.registration(entry.frame,entry.referenceHeight,p):null;
   const contact=reg?.contact?{x:v.x-v.face*(reg.contact[0]-reg.anchor[0])*reg.scale,y:GROUND+(reg.contact[1]-reg.anchor[1])*reg.scale}:null;
   return {state:p.state,pose:p.frame,legacy:!active()||!!p.legacy,x:v.x,facing:v.face,contact};
  },
  metrics(){return {enabled,ready:ready(),addedDrawings:frames.size,walkFrames:8,errors:[...errors],textureBytes:[...frames.values()].reduce((n,f)=>n+f.texture.width*f.texture.height*4,0)};}
 };
})();
