/* Cached native debris layers; original hit points, effects and disintegration are preserved. */
(function(){
 'use strict';
 const core=HealthiaAtomdustCore,enabled=new URLSearchParams(location.search).get('atomdust')!=='original';
 const originalDraw=drawAtom,originalUpdate=updateAtom,layers=[],errors=[],history=new WeakMap(),motion=new WeakMap();
 const order=[6,7,2,3,0,8,9,1,4,5];
 const ready=()=>layers.length===atomRig.bones.length&&layers.every(Boolean);
 const active=()=>enabled&&ready()&&opponent===6;
 const whenLoaded=new Promise(resolve=>{
  if(!enabled){resolve(false);return;}
  let started=false;
  async function prepare(){
   if(started)return;started=true;
   try{
    const prepared=await Promise.all(atomRig.bones.map(async(bone,index)=>{
     const parts=atomRig.parts.filter(p=>p.bone===index);if(!parts.length)throw Error('Missing Atomdust bone');
     const left=Math.min(...parts.map(p=>p.r[0])),top=Math.min(...parts.map(p=>p.r[1]));
     const right=Math.max(...parts.map(p=>p.r[0]+p.r[2])),bottom=Math.max(...parts.map(p=>p.r[1]+p.r[3]));
     if(left<0||top<0||right>atomImage.width||bottom>atomImage.height)throw Error('Invalid Atomdust source crop');
     const canvas=document.createElement('canvas');canvas.width=right-left;canvas.height=bottom-top;const c=canvas.getContext('2d');
     for(const p of parts){const [x,y,w,h]=p.r;c.drawImage(atomImage,x,y,w,h,x-left,y-top,w,h);}
     let texture=canvas;if(typeof createImageBitmap==='function'){try{texture=await createImageBitmap(canvas);}catch(_){/* Prepared canvas remains usable. */}}
     return {texture,left,top};
    }));
    layers.push(...prepared);resolve(true);
   }catch(error){errors.push(error.message);resolve(false);}
  }
  if(atomImage.complete&&atomImage.width)prepare();else{atomImage.addEventListener('load',prepare,{once:true});atomImage.addEventListener('error',()=>{errors.push('Original Atomdust art unavailable.');resolve(false);},{once:true});}
 });
 function snapshot(){return {x:boss.x,face:boss.dir||(hero.x>boss.x?1:-1),stride:atom.walk||0,state:boss.state};}
 function moving(){return boss.state==='idle'&&boss.hitstun<=0&&Math.abs(atom.move)>5&&!boss.breakout&&atom.disperse<=0&&!(boss.guardFlash>0);}
 function parameters(v){
  const m=motion.get(boss);
  return {state:boss.state,type:boss.type,timer:boss.timer,duration:boss.duration||.55,age:(boss.duration||.55)-boss.timer,time:t,
   hitstun:boss.hitstun||0,hitStrength:core.clamp(Math.abs(boss.vx||0)/260,.4,1),guard:boss.guardFlash||0,breakout:boss.breakout,
   disperse:atom.disperse||0,victory:mode==='victory',volley:boss.volley||0,moving:moving(),walkWeight:m?.weight??(moving()?1:0),stride:v.stride};
 }
 function visual(){
  const current=snapshot(),locked=paused||hitStop>0||specialSceneLocked()||coGuest()||mode!=='fight'||!moving();
  return core.interpolate(history.get(boss),current,simulationRemainder/FIXED_STEP,locked);
 }
 function posed(v){
  let j=core.joints(atomSkeleton(),atomRig.joints,parameters(v));const settle=motion.get(boss)?.settle;
  if(settle&&boss.state==='recover'&&boss.hitstun<=0)j=core.mix(settle.joints,j,core.ease(settle.age/.20));
  return j;
 }
 updateAtom=function(dt){
  if(!boss||!atom)return originalUpdate(dt);
  const subject=boss,previous=snapshot(),m=motion.get(subject)||{weight:0,settle:null};
  const beforeJ=previous.state==='attack'?core.joints(atomSkeleton(),atomRig.joints,parameters(previous)):null;
  const result=originalUpdate(dt);
  if(subject!==boss||dt<=0)return result;
  history.set(subject,previous);
  if(boss.hitstun<=0&&mode==='fight'){
   const target=moving()?1:0;m.weight+=core.clamp(target-m.weight,-dt/.14,dt/.14);
   if(beforeJ&&boss.state==='recover')m.settle={joints:beforeJ,age:0};
   else if(m.settle){m.settle.age+=dt;if(m.settle.age>=.2||boss.state!=='recover')m.settle=null;}
  }
  motion.set(subject,m);return result;
 };
 drawAtom=function(){
  if(!active()||!boss||!atom||atom.disperse>0||mode==='victory'||boss.breakout)return originalDraw();
  const v=visual(),J=posed(v),s=atomRig.scale;
  ctx.save();ctx.translate(v.x,GROUND-(boss.jump||0));ctx.scale(v.face,1);
  for(const index of order){
   const [a,b]=atomRig.bones[index],A=atomRig.joints[a],B=atomRig.joints[b],C=J[a],D=J[b],layer=layers[index];
   const restAngle=Math.atan2(B[1]-A[1],B[0]-A[0]),angle=Math.atan2(D[1]-C[1],D[0]-C[0]);
   const stretch=Math.hypot(D[0]-C[0],D[1]-C[1])/Math.hypot(B[0]-A[0],B[1]-A[1]);
   ctx.save();ctx.translate((C[0]-atomRig.root[0])*s,(C[1]-atomRig.root[1])*s);ctx.rotate(angle);ctx.scale(stretch*s,s);ctx.rotate(-restAngle);
   ctx.drawImage(layer.texture,layer.left-A[0],layer.top-A[1]);ctx.restore();
  }
  ctx.restore();
 };
 window.HealthiaAtomdustAnimation={enabled,ready,active,whenLoaded,
  inspect(){if(!boss||!atom||opponent!==6)return null;const v=visual(),p=parameters(v);return {state:core.label(p),x:v.x,facing:v.face,legacy:!active()||p.disperse>0||p.victory||!!p.breakout,joints:posed(v)};},
  metrics(){return {enabled,ready:ready(),walkKeyframes:8,cachedLayers:layers.length,originalPieces:atomRig.parts.length,errors:[...errors]};}
 };
})();
