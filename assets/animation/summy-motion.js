/* Shared hero presentation controller. Filename retained for existing uploads. */
(function(){
 'use strict';
 const core=HealthiaMotionCore,profiles=HealthiaHeroAtlases;
 const enabled=new URLSearchParams(location.search).get('animation')!=='original';
 const entries=profiles.map(()=>new Map()),states=new WeakMap(),errors=[];
 const oldArt=heroArt,oldPose=heroPose,oldFighter=fighter,oldBounds=heroStageBounds;
 let renderAlpha=1,lastFrame=0,frameMs=[],renderMs=[],drawStarted=0;
 const ready=(index=selected)=>entries[index]?.size===32;
 const active=(index=selected)=>enabled&&ready(index);
 function cache(index,sheet,im){
  if(!im.naturalWidth)return;
  const profile=profiles[index],definition=profile.sheets[sheet];
  const next=new Map();
  definition.frames.forEach((f,i)=>{
   const [sx,sy,w,h,ax,ay]=f,c=document.createElement('canvas');c.width=w;c.height=h;
   if(sx<0||sy<0||sx+w>im.naturalWidth||sy+h>im.naturalHeight)throw new Error('Atlas crop is outside the image');
   const g=c.getContext('2d'),points=definition.masks?.[i];
   if(points){g.beginPath();points.forEach(([x,y],n)=>n?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.clip();}
   g.drawImage(im,sx,sy,w,h,0,0,w,h);
   next.set(definition.first+i,{canvas:c,anchor:[ax-sx,ay-sy],scale:heroes[index].height/definition.referenceHeight});
  });
  for(const [pose,entry] of next)entries[index].set(pose,entry);
 }
 const loading=profiles.flatMap((profile,index)=>profile.sheets.map((sheet,i)=>new Promise(resolve=>{
  if(!enabled){resolve(false);return;}
  const im=new Image();
  im.onload=()=>{try{cache(index,i,im);resolve(true);}catch(error){errors.push({hero:profile.name,asset:sheet.file,message:error.message});resolve(false);}};
  im.onerror=()=>{errors.push({hero:profile.name,asset:sheet.file,message:'Artwork could not load; using original animation.'});resolve(false);};
  im.src='assets/animation/'+sheet.file;
 })));
 function stateFor(p){
  let state=states.get(p);
  if(!state){state={previous:null,current:{x:p.x,y:p.y,face:p.face}};states.set(p,state);}
  return state;
 }
 function poseData(){
  const p=hero;let state=animationState();
  if(state==='idle'&&p.landing>0)state='land';
  const tag=typeof story!=='undefined'&&story.active&&story.tag;
  if(tag&&tag.phase!=='down')state='run';
  return {heroIndex:selected,state,age:p.stateTime||0,cycle:p.walkCycle||0,idle:p.idleTime||0,
   landing:p.landing||0,guard:p.guardStun||0,knockdown:p.knockdown||0,ending,
   special:p.specialTick||0,dash:p.dash?p.dash.elapsed/p.dash.duration:0,attack:p.anim>0?p.pendingAttack:null,
   link:p.buffer?.key==='kick'||p.comboChain?.queue?.[0]==='kick'||
    (p.pendingAttack?.key==='kick'&&p.previousState==='punch'&&p.stateTime<p.pendingAttack.startup),fallback:oldPose()};
 }
 heroPose=function(){return active()&&hero?core.pose(poseData()):oldPose();};
 heroArt=function(index,pose,x,feet,face=1,alpha=1,breath=0){
  const entry=enabled&&entries[index]?.get(pose);
  if(!entry)return oldArt(index,pose>=100?0:pose,x,feet,face,alpha,breath);
  const {canvas,anchor,scale}=entry;
  ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,feet);ctx.scale(face*scale,scale);
  ctx.drawImage(canvas,-anchor[0],-anchor[1],canvas.width,canvas.height);ctx.restore();
 };
 heroStageBounds=function(face=hero.face){
  const bounds=oldBounds(face);
  if(!active())return bounds;
  for(const {canvas,anchor,scale} of entries[selected].values()){
   const left=anchor[0]*scale,right=(canvas.width-anchor[0])*scale;
   bounds.min=Math.max(bounds.min,(face>0?left:right)+16);
   bounds.max=Math.min(bounds.max,W-(face>0?right:left)-16);
  }
  return bounds;
 };
 fighter=function(x,y,...args){
  if(!active()||!hero)return oldFighter(x,y,...args);
  const info=poseData(),pose=core.pose(info),p=hero,s=stateFor(p);
  const tag=typeof story!=='undefined'&&story.active&&story.tag;
  if(tag?.phase==='down')return oldFighter(x,y,...args);
  // Network guests already interpolate positions. Never smooth them twice.
  const locked=paused||hitStop>0||specialSceneLocked()||coGuest()||!!tag||mode!=='fight'||p.anim>0||p.special>0||p.block;
  const position=core.renderPosition(s.previous,{x,y,face:p.face},renderAlpha,locked);
  let feet=position.y;
  if(info.state==='defeat')feet=GROUND-Math.max(0,GROUND-(p.defeatY||GROUND))*Math.max(0,1-ending/.38);
  drawComboTrail();
  // Opaque, intact authored figures: no face cross-fades or independent limbs.
  heroArt(selected,pose,position.x,feet,p.face,1,0);
 };
 const oldSync=syncAnimation;
 syncAnimation=function(dt=0){
  oldSync(dt);if(!active()||!hero)return;
  const s=stateFor(hero);
  if(dt>0)s.previous=s.current;
  s.current={x:hero.x,y:hero.y,face:hero.face};
 };
 function beginFrame(ms){
  if(lastFrame&&ms>lastFrame&&ms-lastFrame<250){frameMs.push(ms-lastFrame);if(frameMs.length>600)frameMs.shift();}
  lastFrame=ms;renderAlpha=core.clamp(simulationRemainder/FIXED_STEP,0,1);drawStarted=performance.now();
 }
 function endFrame(){renderMs.push(performance.now()-drawStarted);if(renderMs.length>600)renderMs.shift();}
 const percentile=(list,p)=>{if(!list.length)return null;const a=[...list].sort((a,b)=>a-b);return a[Math.floor((a.length-1)*p)];};
 window.HealthiaAnimation={
  active,ready,beginFrame,endFrame,whenLoaded:Promise.all(loading),
  resetMetrics(){frameMs=[];renderMs=[];lastFrame=0;},
  metrics(){return {candidate:'hero-team',hero:profiles[selected]?.name,enabled,ready:ready(),allReady:profiles.every((_,i)=>ready(i)),samples:frameMs.length,
   fps:frameMs.length?1000/(frameMs.reduce((a,b)=>a+b,0)/frameMs.length):null,
   frameP95:percentile(frameMs,.95),drawP95:percentile(renderMs,.95),simulationHz:1/FIXED_STEP,
   sourceDrawings:28+(entries[selected]?.size||0),heroes:profiles.map((p,i)=>({name:p.name,ready:ready(i),addedDrawings:entries[i].size})),errors:[...errors],
   extraTextureBytes:entries.reduce((n,bank)=>n+[...bank.values()].reduce((b,e)=>b+e.canvas.width*e.canvas.height*4,0),0)};},
  inspect(){return hero?{hero:profiles[selected]?.name,state:poseData().state,pose:heroPose(),attack:hero.pendingAttack?core.attackPhase(hero.pendingAttack):null}:null;}
 };
})();
