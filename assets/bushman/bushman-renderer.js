/* Whole-body authored poses, registered at their planted feet. No limb stretching. */
'use strict';
const bushmanMotionFrames=[
 {r:[0,0,384,512],a:[198,491]},{r:[384,0,384,512],a:[194,491]},
 {r:[768,0,384,512],a:[197,491]},{r:[1152,0,384,512],a:[188,491]},
 {r:[0,512,384,512],a:[195,460]},{r:[384,512,384,512],a:[202,460]},
 {r:[768,512,384,512],a:[205,460]},{r:[1152,512,384,512],a:[198,460]}
];
const bushmanCombatFrames=[
 {r:[0,0,320,418],a:[190,390]},{r:[320,0,350,418],a:[215,390]},
 {r:[675,0,280,418],a:[135,390]},{r:[970,0,284,418],a:[140,390]},
 {r:[0,425,350,390],a:[270,360]},{r:[365,425,290,390],a:[175,360]},
 {r:[660,425,270,390],a:[140,360]},{r:[930,425,324,390],a:[200,360]},
 {r:[0,825,320,360],a:[170,325]},{r:[325,825,285,360],a:[145,325]},
 {r:[610,825,350,360],a:[190,325]},{r:[965,825,289,360],a:[145,325]}
];
function bushmanPose(){
 if(mode==='victory')return {sheet:'motion',frame:7};
 if(bushman.recoil>0||boss.hitstun>0)return {sheet:'combat',frame:11};
 if(boss.guardFlash>0||boss.state==='tempest-guard')return {sheet:'motion',frame:6};
 const a=bushman.action;
 if(a){
  const stage=BushmanCore.stage(a),p=BushmanCore.ATTACKS[a.kind];let frame;
  if(a.kind==='punch')frame=stage==='windup'?0:stage==='active'?1:2;
  else if(a.kind==='kick')frame=stage==='active'?4:stage==='recover'?5:3;
  else if(a.kind==='blast')frame=stage==='windup'?(a.age/p.windup<.5?8:9):stage==='active'?10:8;
  else frame=stage==='active'?7:6;
  return {sheet:'combat',frame};
 }
 if(bushman.moving)return {sheet:'motion',frame:[2,3,4,5,4,3][Math.floor(bushman.walk*6)%6]};
 return {sheet:'motion',frame:Math.floor(bushman.time*.7)%2?1:0};
}
function bushmanSprite(sheet,frame,x,y,face,alpha=1){
 const image=bushmanImages[sheet];if(!image?.naturalWidth)return;
 const f=(sheet==='motion'?bushmanMotionFrames:bushmanCombatFrames)[frame],scale=240/(sheet==='motion'?460:315);
 ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.scale(-face,1);
 ctx.drawImage(image,...f.r,-f.a[0]*scale,-f.a[1]*scale,f.r[2]*scale,f.r[3]*scale);ctx.restore();
}
function bushmanFX(cell,x,y,face,sx,sy,anchorX,anchorY,alpha=1){
 const im=bushmanImages.fx;if(!im.naturalWidth)return;
 ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.scale(-face,1);
 ctx.drawImage(im,(cell%3)*512,Math.floor(cell/3)*512,512,512,-anchorX*sx,-anchorY*sy,512*sx,512*sy);ctx.restore();
}
function drawBushmanGround(){
 for(const z of bushman.zones){
  const opacity=Math.min(1,z.life*2),pulse=1+Math.sin(bushman.time*9)*.035;
  ellipse(z.x,GROUND+6,89,12,'#411a09b0');
  bushmanFX(3+Math.floor(bushman.time*8)%2,z.x,GROUND+12,-1,.39,.36*pulse,256,360,opacity);
 }
 const a=bushman.action;
 if(a?.kind==='scorch'&&!a.released){
  ctx.save();ctx.strokeStyle='#ffad58';ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.globalAlpha=.6+.3*Math.sin(bushman.time*14);ctx.beginPath();ctx.ellipse(a.target,GROUND+3,76,13,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
}
function drawBushman(){
 if(!boss)return;drawBushmanGround();
 const face=bushman.action?.face||boss.dir||-1,pose=bushmanPose();
 const alpha=mode==='victory'?Math.max(.2,1-ending*.1):1;
 ellipse(boss.x,GROUND+3,66,8,'#1d130b66');
 const a=bushman.action;
 if(a?.kind==='blast'&&BushmanCore.stage(a)==='windup'){
  const u=a.age/BushmanCore.ATTACKS.blast.windup;
  ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.10+u*.16;
  const glow=ctx.createRadialGradient(boss.x,GROUND-140,5,boss.x,GROUND-140,105);glow.addColorStop(0,'#ffec99');glow.addColorStop(.4,'#ff6a13');glow.addColorStop(1,'#ff6a1300');ctx.fillStyle=glow;ctx.fillRect(boss.x-110,GROUND-250,220,220);ctx.restore();
 }
 bushmanSprite(pose.sheet,pose.frame,boss.x,GROUND,face,alpha);
 // Embers are tied to the simulation clock, so pause and cinematics freeze the pose and fire together.
 if(mode==='fight'){
  ctx.save();ctx.globalCompositeOperation='screen';
  for(let i=0;i<5;i++){const u=(bushman.time*(.4+i*.03)+i*.19)%1;ctx.globalAlpha=(1-u)*.55;ellipse(boss.x+face*(18+i*7)+Math.sin(i*2+bushman.time)*8,GROUND-215-u*55,1.5,2.5,'#ffd178');}
  ctx.restore();
 }
}
function drawBushmanEffects(){
 for(const p of bushman.projectiles){const flicker=1+Math.sin(p.age*37)*.04;bushmanFX(Math.floor(p.age*12)%2,p.x,p.y,p.face,.25,.25*flicker,150,270);}
 for(const f of bushman.flares){
  const u=1-f.life/f.max;
  if(f.kind==='blast')bushmanFX(5,f.x,f.y,f.face,1.23,.67*(.94+Math.sin(u*23)*.06),480,250,Math.min(1,f.life*5));
  else{const size=.14+.17*u;bushmanFX(2,f.x,f.y,f.face,size,size,256,270,Math.min(1,f.life*7));}
 }
}
(function(){
 const oldHud=hud;hud=function(){
  oldHud();if(opponent!==8||!boss)return;
  ctx.save();ctx.shadowColor='#241000';ctx.shadowBlur=5;
  for(let i=0;i<4;i++){
   const lit=i<bushman.charge,x=1239-i*19;ctx.fillStyle=lit?'#ffc66b':'#2f2927';ctx.strokeStyle=lit?'#fff3b5':'#af774c';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.moveTo(x,56);ctx.lineTo(x+6,64);ctx.lineTo(x,72);ctx.lineTo(x-6,64);ctx.closePath();ctx.fill();ctx.stroke();
  }
  battleText(bushman.charge===4?'FIRE BLAST READY · 2×':'FIRE BLAST · '+bushman.charge+'/4',1155,68,12,bushman.charge===4?'#ffe49a':'#ffcb9f','right');ctx.restore();
 };
})();
