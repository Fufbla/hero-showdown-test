/* Whole smoke-body poses; original smoke strands, fists, clouds and defeat remain. */
(function(){
 'use strict';
 const core=HealthiaAirPollutionCore,profile=HealthiaAirPollutionAtlas;
 const enabled=new URLSearchParams(location.search).get('air')!=='original';
 const frames=[],errors=[],movement=new WeakMap(),reactions=new WeakMap();
 const originalSprite=sprite,originalStep=updateStep,originalHit=hitBoss;
 const ready=()=>frames.length===16,active=()=>enabled&&ready()&&loaded&&opponent===0;
 const whenLoaded=new Promise(resolve=>{
  if(!enabled){resolve(false);return;}
  const image=new Image();
  image.onload=async()=>{try{
   const prepared=await Promise.all(profile.frames.map(async frame=>{
    const [x,y,w,h,ax,ay]=frame.crop;
    if(!frame.crop.every(Number.isFinite)||w<=0||h<=0||x<0||y<0||x+w>image.naturalWidth||y+h>image.naturalHeight||ax<x||ax>x+w||ay<y||ay>y+h)throw Error('Invalid Air Pollution Monster crop');
    if(frame.mouth&&(!frame.mouth.every(Number.isFinite)||frame.mouth[0]<x||frame.mouth[0]>x+w||frame.mouth[1]<y||frame.mouth[1]>y+h))throw Error('Invalid smoke-mouth registration');
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(image,x,y,w,h,0,0,w,h);
    let texture=canvas;if(typeof createImageBitmap==='function'){try{texture=await createImageBitmap(canvas);}catch(_){/* Prepared canvas remains usable. */}}
    return {texture,frame};
   }));frames.push(...prepared);resolve(true);
  }catch(error){errors.push(error.message);resolve(false);}};
  image.onerror=()=>{errors.push('Using original Air Pollution Monster animation.');resolve(false);};
  image.src='assets/animation/'+profile.file;
 });
 function snapshot(stride=movement.get(boss)?.stride||0){return {x:boss.x,face:hero&&hero.x>boss.x?1:-1,state:boss.state,stride};}
 function visual(){
  const m=movement.get(boss),now=snapshot();
  const locked=paused||hitStop>0||specialSceneLocked()||coGuest()||mode!=='fight'||!m?.moving||boss.hitstun>0||boss.breakout||boss.guardFlash>0||boss.state!=='idle';
  return core.interpolate(m?.previous,now,simulationRemainder/FIXED_STEP,locked);
 }
 function parameters(v){
  const m=movement.get(boss),recent=m?.lastRelease;
  const liveStorm=(recent?.kind==='storm'&&elapsed-recent.time<.20)||effects.some(e=>e.type==='fist'&&e.max===.25&&e.life>0);
  return {state:boss.state,type:boss.type,timer:boss.timer,phase,time:t,struck:!!boss.struck,liveStorm,
   victory:mode==='victory',breakout:boss.breakout,hitstun:boss.hitstun||0,heavy:reactions.get(boss)?.heavy??Math.abs(boss.vx||0)>240,
   guard:boss.guardFlash||0,moving:!!m?.moving,stride:v.stride};
 }
 updateStep=function(dt){
  if(!boss||opponent!==0)return originalStep(dt);
  const subject=boss,m=movement.get(subject)||{stride:0,serial:0},previous=snapshot(m.stride);
  const beforeTime=elapsed,beforeHit=boss.hitstun||0,beforeType=boss.type,beforeStruck=boss.struck,beforeTick=boss.stormTick;
  const result=originalStep(dt);
  if(subject!==boss||!(dt>0)||mode!=='fight'||elapsed<=beforeTime||coGuest())return result;
  const dx=Math.abs(boss.x-previous.x),moving=previous.state==='idle'&&boss.state==='idle'&&beforeHit<=0&&boss.hitstun<=0&&!boss.breakout&&dx>1e-6&&dx<80;
  const released=previous.state==='attack'&&beforeType===boss.type&&((['punch','cloud'].includes(beforeType)&&boss.struck&&!beforeStruck)||(beforeType==='storm'&&boss.stormTick>beforeTick+1e-9));
  movement.set(subject,{previous,stride:m.stride+(moving?dx/100:0),moving,serial:m.serial+(released?1:0),lastRelease:released?{kind:boss.type,time:elapsed}:m.lastRelease});
  return result;
 };
 hitBoss=function(...args){
  const subject=boss,before=subject?.hp,result=originalHit(...args);
  if(enabled&&opponent===0&&subject===boss&&subject&&subject.hp<before)reactions.set(subject,{heavy:args[3]==='kick'||args[0]>=20});
  return result;
 };
 sprite=function(index,x,feet,height,face=1,angle=0,alpha=1){
  if(index!==3||!active()||!boss||!['fight','victory','defeat'].includes(mode))return originalSprite(index,x,feet,height,face,angle,alpha);
  const v=visual(),p=core.pose(parameters(v));if(p.legacy)return originalSprite(index,x,feet,height,face,angle,alpha);
  const entry=frames[p.frame],reg=core.registration(entry.frame,height,profile.referenceHeight,p);
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x+v.x-boss.x,feet);ctx.rotate(angle);ctx.scale(-v.face*reg.scale,reg.scale);ctx.drawImage(entry.texture,-reg.anchor[0],-reg.anchor[1]);ctx.restore();
 };
 window.HealthiaAirPollutionAnimation={enabled,ready,active,whenLoaded,
  inspect(){if(!boss||opponent!==0)return null;const v=visual(),p=core.pose(parameters(v)),entry=frames[p.frame],reg=entry?core.registration(entry.frame,405,profile.referenceHeight,p):null;
   const a=bossAnchors(),mouth=reg?.mouth?{x:a.x-v.face*(reg.mouth[0]-reg.anchor[0])*reg.scale,y:a.y+(reg.mouth[1]-reg.anchor[1])*reg.scale}:null;
   return {state:p.state,pose:p.frame,x:v.x,facing:v.face,legacy:!active()||!!p.legacy,releaseSerial:movement.get(boss)?.serial||0,mouth};
  },
  metrics(){return {enabled,ready:ready(),addedDrawings:frames.length,glideFrames:4,errors:[...errors],textureBytes:frames.reduce((n,f)=>n+f.texture.width*f.texture.height*4,0)};}
 };
})();
