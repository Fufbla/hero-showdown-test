/* Registered whole-body art; original effects, invisibility and shatter remain authoritative. */
(function(){
 'use strict';
 const core=HealthiaLighteningSpreeCore,profile=HealthiaLighteningSpreeAtlas;
 const enabled=new URLSearchParams(location.search).get('spree')!=='original';
 const frames=[],errors=[],reactions=new WeakMap(),originalArt=spreeArt,originalHit=hitBoss;
 const ready=()=>frames.length===profile.frames.length&&frames.every(Boolean);
 const active=()=>enabled&&ready()&&opponent===7;
 const whenLoaded=new Promise(resolve=>{
  if(!enabled){resolve(false);return;}
  const image=new Image();
  image.onload=async()=>{
   try{
    const prepared=await Promise.all(profile.frames.map(async frame=>{
     const [x,y,w,h,ax,ay]=frame.crop;
     if(!frame.crop.every(Number.isFinite)||w<=0||h<=0||x<0||y<0||x+w>image.naturalWidth||y+h>image.naturalHeight||ax<x||ax>x+w||ay<y||ay>y+h)throw Error('Invalid Lightening Spree crop or anchor');
     if(frame.emitter&&(!frame.emitter.every(Number.isFinite)||frame.emitter[0]<x||frame.emitter[0]>x+w||frame.emitter[1]<y||frame.emitter[1]>=ay))throw Error('Invalid Lightening Spree hand registration');
     const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
     canvas.getContext('2d').drawImage(image,x,y,w,h,0,0,w,h);
     let texture=canvas;if(typeof createImageBitmap==='function'){try{texture=await createImageBitmap(canvas);}catch(_){/* Prepared canvas remains usable. */}}
     return {texture,frame};
    }));
    frames.push(...prepared);resolve(true);
   }catch(error){errors.push(error.message);resolve(false);}
  };
  image.onerror=()=>{errors.push('New Lightening Spree artwork unavailable; using original animation.');resolve(false);};
  image.src='assets/animation/'+profile.file;
 });
 function parameters(){
  const arrival=spree.rings.filter(e=>e.max===.36&&Math.abs(e.x-boss.x)<3);
  return {state:boss.state,type:boss.type,timer:boss.timer,duration:boss.duration||1,time:t,
   victory:mode==='victory',hidden:spree.hidden,breakout:boss.breakout,hitstun:boss.hitstun||0,
   heavy:reactions.get(boss)?.heavy??Math.abs(boss.vx||0)>240,guard:boss.guardFlash||0,
   arrivalAge:arrival.length?Math.min(...arrival.map(e=>e.max-e.life)):undefined,
   liveBeams:spree.beams.filter(b=>b.life>0).length,struck:!!boss.struck,volley:boss.volley||0,phase};
 }
 hitBoss=function(...args){
  const subject=boss,before=subject?.hp,result=originalHit(...args);
  if(enabled&&opponent===7&&subject===boss&&subject&&subject.hp<before)reactions.set(subject,{heavy:args[3]==='kick'||args[0]>=20});
  return result;
 };
 spreeArt=function(originalPose,x,y,dir,alpha=1,angle=0){
  if(!active()||!boss||!spree)return originalArt(originalPose,x,y,dir,alpha,angle);
  const data=parameters(),pose=core.pose(data);
  if(pose.legacy)return originalArt(originalPose,x,y,dir,alpha,angle);
  if(pose.hidden)return;
  const entry=frames[pose.frame];if(!entry)return originalArt(originalPose,x,y,dir,alpha,angle);
  const reg=core.registration(entry.frame,profile.referenceHeight,pose.emitting,data.type);
  ctx.save();ctx.translate(x,GROUND);ctx.scale(dir*reg.scale,reg.scale*(pose.breathe||1));ctx.globalAlpha*=alpha;
  ctx.drawImage(entry.texture,-reg.anchor[0],-reg.anchor[1]);ctx.restore();
 };
 window.HealthiaLighteningSpreeAnimation={enabled,ready,active,whenLoaded,
  inspect(){
   if(!boss||!spree||opponent!==7)return null;
   const data=parameters(),pose=core.pose(data),dir=boss.dir||(hero.x>boss.x?1:-1),entry=frames[pose.frame];
   const reg=entry?core.registration(entry.frame,profile.referenceHeight,pose.emitting,data.type):null;
   const emitter=reg?.emitter?{x:boss.x+dir*(reg.emitter[0]-reg.anchor[0])*reg.scale,y:GROUND+(reg.emitter[1]-reg.anchor[1])*reg.scale}:null;
   return {state:pose.state,pose:pose.frame,hidden:!!pose.hidden,legacy:!active()||!!pose.legacy,x:boss.x,facing:dir,emitter};
  },
  metrics(){return {enabled,ready:ready(),addedDrawings:frames.length,errors:[...errors],textureBytes:frames.reduce((n,f)=>n+f.texture.width*f.texture.height*4,0)};}
 };
})();
