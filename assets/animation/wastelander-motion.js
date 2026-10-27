/* Whole-body Wastelander drawings; no changes to attack logic or hitboxes. */
(function(){
 'use strict';
 const core=HealthiaWastelanderCore,profile=HealthiaWastelanderAtlas;
 const enabled=new URLSearchParams(location.search).get('wastelander')!=='original';
 const frames=new Map(),history=new WeakMap(),errors=[];
 const originalBody=wasteBody,originalDraw=drawWastelander,originalUpdate=updateWastelander;
 const ready=()=>frames.size===34,active=()=>enabled&&ready()&&opponent===5;
 const loading=profile.sheets.map(sheet=>new Promise(resolve=>{
  if(!enabled){resolve(false);return;}
  const im=new Image();
  im.onload=()=>{
   try{
    const registered=[];
    sheet.frames.forEach((f,i)=>{
     const [sx,sy,w,h,ax,ay]=f;
     if(w<=0||h<=0||sx<0||sy<0||sx+w>im.naturalWidth||sy+h>im.naturalHeight)throw new Error('Invalid Wastelander crop');
     const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
     const context=canvas.getContext('2d'),mask=sheet.masks?.[i];
     if(mask){context.beginPath();mask.forEach(([x,y],j)=>j?context.lineTo(x,y):context.moveTo(x,y));context.closePath();context.clip();}
     context.drawImage(im,sx,sy,w,h,0,0,w,h);
     registered.push([sheet.first+i,{canvas,anchor:[ax-sx,ay-sy],scale:340/sheet.referenceHeight}]);
    });
    registered.forEach(([id,entry])=>frames.set(id,entry));resolve(true);
   }catch(error){errors.push({asset:sheet.file,message:error.message});resolve(false);}
  };
  im.onerror=()=>{errors.push({asset:sheet.file,message:'Using the original Wastelander animation.'});resolve(false);};
  im.src='assets/animation/'+sheet.file;
 }));
 function facing(){return boss.wasteReact>0?(boss.wasteHitFacing||-1):(boss.dir||(hero.x>boss.x?1:-1));}
 function data(){return {state:boss.state,type:boss.type,timer:boss.timer,phase,time:t,ending,victory:mode==='victory',
  moving:!!boss.wasteMoving,stride:boss.wasteStride||0,react:boss.wasteReact||0,reactDuration:boss.wasteReactDuration,
  heavy:!!boss.wasteHeavy,hitstun:boss.hitstun||0,guard:boss.guardFlash||0,breakout:boss.breakout};}
 updateWastelander=function(dt){
  const subject=boss,previous={x:subject.x,face:facing()};
  const result=originalUpdate(dt);
  if(subject===boss&&dt>0)history.set(subject,previous);
  return result;
 };
 function position(){
  const locked=paused||hitStop>0||specialSceneLocked()||coGuest()||mode!=='fight'||boss.state!=='idle'||boss.wasteReact>0||boss.breakout;
  return core.renderX(history.get(boss),{x:boss.x,face:facing()},simulationRemainder/FIXED_STEP,locked);
 }
 function art(frame,x,dir){
  const entry=frames.get(frame),{canvas,anchor,scale}=entry;
  ctx.save();ctx.translate(x,GROUND);ctx.scale(-dir*scale,scale);
  ctx.drawImage(canvas,-anchor[0],-anchor[1],canvas.width,canvas.height);ctx.restore();
 }
 function acidStream(x,dir){
  const marker=profile.pourOutlet,entry=frames.get(30);
  const sx=x-dir*marker[0]*entry.scale,sy=GROUND+marker[1]*entry.scale;
  const end=x+dir*95,wobble=Math.sin(t*25)*4;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(sx,sy);ctx.bezierCurveTo(sx+dir*22,sy+38,end+wobble,GROUND-48,end,GROUND-8);
  ctx.strokeStyle='#397e16';ctx.lineWidth=13;ctx.stroke();ctx.strokeStyle='#a5ed27';ctx.lineWidth=8;ctx.stroke();
  ctx.strokeStyle='#e0ff76';ctx.lineWidth=2;ctx.stroke();
  for(let i=0;i<3;i++){
   const q=((t*1.8+i/3)%1+1)%1;
   ctx.beginPath();ctx.ellipse(sx+(end-sx)*q+Math.sin(q*8+i)*7,sy+(GROUND-sy)*q,2.5,5,0,0,Math.PI*2);ctx.fillStyle='#bdff47';ctx.fill();
  }
  ctx.restore();
 }
 wasteBody=function(){
  if(!active()||!boss)return originalBody();
  const p=core.pose(data()),x=position(),dir=facing();
  if(p.legacy)return originalBody();
  art(p.frame,x,dir);if(p.pour)acidStream(x,dir);
 };
 // Keep existing collapse, projectiles, pools, particles and their draw order.
 drawWastelander=function(){return originalDraw();};
 window.HealthiaWastelanderAnimation={enabled,ready,active,whenLoaded:Promise.all(loading),
  inspect(){if(!boss||opponent!==5)return null;const p=core.pose(data());return {state:p.state,pose:p.frame,legacy:p.legacy,x:position(),facing:facing()};},
  metrics(){return {enabled,ready:ready(),addedDrawings:frames.size,walkFrames:8,errors:[...errors],
   textureBytes:[...frames.values()].reduce((n,e)=>n+e.canvas.width*e.canvas.height*4,0)};}
 };
})();
