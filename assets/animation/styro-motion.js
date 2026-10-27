/* Whole-body replacement, isolated from boss rules and competitive Versus. */
(function(){
 'use strict';
 const core=HealthiaStyroCore,profile=HealthiaStyroAtlas;
 const enabled=new URLSearchParams(location.search).get('styro')!=='original';
 const frames=new Map(),history=new WeakMap(),errors=[];
 const originalBody=styroBody,originalUpdate=updateDrStyro;
 const ready=()=>frames.size===32,active=()=>enabled&&ready()&&opponent===4;
 const loading=profile.sheets.map(sheet=>new Promise(resolve=>{
  if(!enabled){resolve(false);return;}
  const im=new Image();
  im.onload=()=>{
   try{
    const registered=sheet.frames.map((f,i)=>{
     const [sx,sy,w,h,ax,ay]=f;
     if(w<=0||h<=0||sx<0||sy<0||sx+w>im.naturalWidth||sy+h>im.naturalHeight)throw new Error('Invalid Dr. Styro crop');
     const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
     canvas.getContext('2d').drawImage(im,sx,sy,w,h,0,0,w,h);
     return [sheet.first+i,{canvas,anchor:[ax-sx,ay-sy],scale:320/sheet.referenceHeight}];
    });
    registered.forEach(([id,entry])=>frames.set(id,entry));resolve(true);
   }catch(error){errors.push({asset:sheet.file,message:error.message});resolve(false);}
  };
  im.onerror=()=>{errors.push({asset:sheet.file,message:'Using original Dr. Styro animation.'});resolve(false);};
  im.src='assets/animation/'+sheet.file;
 }));
 function facing(){return boss.styroReact>0?(boss.styroHitFacing||-1):(boss.dir||(hero.x>boss.x?1:-1));}
 function data(){return {state:boss.state,type:boss.type,timer:boss.timer,time:t,ending,victory:mode==='victory',moving:!!boss.styroMoving,
  stride:boss.styroStride||0,react:boss.styroReact||0,reactDuration:boss.styroReactDuration,heavy:!!boss.styroHeavy,
  hitstun:boss.hitstun||0,guard:boss.guardFlash||0,breakout:boss.breakout};}
 updateDrStyro=function(dt){
  const subject=boss,previous={x:subject.x,face:facing()};
  const result=originalUpdate(dt);
  if(subject===boss&&dt>0)history.set(subject,previous);
  return result;
 };
 function position(x){
  const locked=paused||hitStop>0||specialSceneLocked()||coGuest()||mode!=='fight'||boss.state!=='idle'||boss.styroReact>0||boss.breakout;
  return x+core.renderX(history.get(boss),{x:boss.x,face:facing()},simulationRemainder/FIXED_STEP,locked)-boss.x;
 }
 styroBody=function(x,dir){
  if(!active()||!boss)return originalBody(x,dir);
  const pose=core.pose(data());if(pose.legacy)return originalBody(x,dir);
  const {canvas,anchor,scale}=frames.get(pose.frame);
  ctx.save();ctx.translate(position(x),GROUND);ctx.scale(-dir*scale,scale);
  ctx.drawImage(canvas,-anchor[0],-anchor[1],canvas.width,canvas.height);ctx.restore();
 };
 // drawDrStyro keeps the split positions, original defeat, spikes and foam effects.
 window.HealthiaStyroAnimation={enabled,ready,active,whenLoaded:Promise.all(loading),
  inspect(){if(!boss||opponent!==4)return null;const p=core.pose(data());return {state:p.state,pose:p.frame,legacy:!!p.legacy,x:position(boss.x),facing:facing()};},
  metrics(){return {enabled,ready:ready(),addedDrawings:frames.size,walkFrames:8,errors:[...errors],textureBytes:[...frames.values()].reduce((n,e)=>n+e.canvas.width*e.canvas.height*4,0)};}
 };
})();
