// Steel Body transforms any hero into the SAME anonymous, smooth silver figure.
// NO hair, clothing, face, emblem, cape, gender traits or original hero pixels.
// Each independent motion is a cached animated chrome sprite atlas; only its
// pose depends on the hero. Collision, combat, saves and gear stay untouched.
export const STEEL_SILHOUETTE_VERSION='universal-chrome-motion-v1';
export const STEEL_SILHOUETTE_CELLS=Object.freeze({
 idle:8, walk:12, run:14, jump:8, doubleJump:10, fall:6,
 land:6, punch:10, kick:12, hurt:6, flight:8
});
// Wide transparent padding prevents the extended kick and punch poses clipping.
const CELL=224,TAU=Math.PI*2;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const fract=x=>((x%1)+1)%1;
const sin=Math.sin,cos=Math.cos;
const mix=(a,b,t)=>a+(b-a)*t;
const swing=(p,amount)=>sin(TAU*p)*amount;
const sprites=new Map();
export function selectSteelSilhouettePose(hero={},time=0){
 if(!hero.steel||hero.dead)return null;
 const left=(hero.attack?.face||hero.face||1)<0;
 let clip='idle',p=fract(time*.8);
 if(hero.attack){
   clip=hero.attack.kind==='kick'||hero.attack.power==='superKick'?'kick':'punch';
   p=clamp((hero.attack.age||0)/(clip==='kick'?.39:.27));
 }else if(hero.stun>0){
   clip='hurt';p=clamp((hero.hurtAge||0)/.35);
 }else if(hero.flying){
   clip='flight';p=fract(time*1.3);
 }else if(!hero.grounded){
   clip=hero.vy>125?'fall':hero.jumps>=2?'doubleJump':'jump';
   p=clip==='fall'?fract(time*.7):clamp((hero.jumpAge||0)/.44);
 }else if(hero.landing>0){
   clip='land';p=clamp((.13-hero.landing)/.13);
 }else if(Math.abs(hero.vx||0)>220){
   clip='run';p=fract((hero.cycle||0)*.50);
 }else if(Math.abs(hero.vx||0)>8){
   clip='walk';p=fract((hero.cycle||0)*.50);
 }
 const count=STEEL_SILHOUETTE_CELLS[clip];
 return {clip,count,frame:Math.min(count-1,Math.floor(p*count)),phase:p,face:left?-1:1};
}
function metal(c,x0,y0,x1,y1){
 const g=c.createLinearGradient(x0,y0,x1,y1);
 g.addColorStop(0,'#45505e');g.addColorStop(.12,'#82919f');
 g.addColorStop(.28,'#edf5ff');g.addColorStop(.41,'#ffffff');
 g.addColorStop(.54,'#a6b6c5');g.addColorStop(.74,'#5c6876');
 g.addColorStop(.89,'#bccbd8');g.addColorStop(1,'#f0f7ff');
 return g;
}
function orb(c,x,y,r,shine=true){
 const g=c.createRadialGradient(x-r*.37,y-r*.43,1,x,y,r*1.05);
 g.addColorStop(0,'#ffffff');g.addColorStop(.18,'#f9ffff');
 g.addColorStop(.42,'#c0ccd7');g.addColorStop(.73,'#74818f');
 g.addColorStop(.92,'#394856');g.addColorStop(1,'#a9b4c1');
 c.beginPath();c.arc(x,y,r,0,TAU);c.fillStyle=g;c.fill();
 c.lineWidth=1.2;c.strokeStyle='#455160';c.stroke();
 if(shine){
  c.beginPath();c.ellipse(x-r*.35,y-r*.46,r*.31,r*.11,-.43,0,TAU);
  c.fillStyle='rgba(255,255,255,.82)';c.fill();
 }
}
function capsule(c,a,b,width,edge='#3c4856'){
 const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);
 if(len<.1)return;
 c.save();c.translate(a[0],a[1]);c.rotate(Math.atan2(dy,dx));
 c.beginPath();c.roundRect(0,-width/2,len,width,width/2);
 c.fillStyle=metal(c,0,-width/2,0,width/2);c.fill();
 c.lineWidth=1.15;c.strokeStyle=edge;c.stroke();
 // Moving specular line follows the limb, not the hero's old outfit.
 c.beginPath();c.moveTo(width*.28,-width*.29);
 c.lineTo(Math.max(width*.28,len-width*.35),-width*.29);
 c.strokeStyle='rgba(255,255,255,.47)';c.lineWidth=1.5;c.stroke();
 c.restore();
}
function boot(c,point,angle=0){
 c.save();c.translate(...point);c.rotate(angle);
 const g=metal(c,-19,-12,17,6);
 c.beginPath();c.ellipse(5,-3,15,9,-.10,0,TAU);
 c.fillStyle=g;c.fill();c.lineWidth=1.15;c.strokeStyle='#4b5360';c.stroke();
 c.beginPath();c.ellipse(8,-7,8,2,-.08,0,Math.PI);
 c.strokeStyle='rgba(255,255,255,.73)';c.lineWidth=1.7;c.stroke();
 c.restore();
}
function paintCel(c,clip,index,total){
 const q=index/total,a=q*TAU,cyc=sin(a),c2=cos(a);
 const moving=clip==='walk'||clip==='run';
 const sprint=clip==='run',stride=sprint?26:17,lift=sprint?17:11;
 const crouch=clip==='land'?sin(Math.PI*clamp(q))*10:
   clip==='hurt'?6:clip==='jump'?9*(1-q):0;
 const bob=moving?2.2*cos(2*a):clip==='idle'?sin(a)*1.2:0;
 const tilt=sprint?4:clip==='punch'?7:clip==='kick'?-4:clip==='flight'?9:0;
 const hipX=sprint?4:clip==='punch'?5:0;
 const hipY=-45+crouch+bob;
 const air=clip==='jump'||clip==='doubleJump'||clip==='fall'||clip==='flight';
 const jumpArc=clip==='doubleJump'?12+6*sin(Math.PI*q):clip==='jump'?7+9*sin(Math.PI*q):
   clip==='fall'?4+2*sin(a):clip==='flight'?14+3*sin(a):0;
 const legLift=air?Math.max(13,jumpArc+6):0;
 const legNear=(function(){
  if(clip==='kick'){
   const extend=Math.max(0,sin(Math.PI*clamp(q*1.25)))**1.3;
   return [16+extend*64,-3-extend*35];
  }
  if(air)return [21+6*sin(a),-5-legLift-8*sin(a+.3)];
  if(moving)return [15+cyc*stride,-3-Math.max(0,-c2)*lift];
  return [18,-3-crouch*.18];
 })();
 const legFar=air?[-14,-11-legLift*.6+5*sin(a)]:
   moving?[-15-cyc*stride,-3-Math.max(0,c2)*lift]:[-18,-3-crouch*.18];
 const nearHand=(function(){
   if(clip==='punch'){
    const hit=Math.min(1,clamp((q-.20)/.26));
    const retreat=clamp((q-.62)/.25);
    const reach=hit*(1-retreat);
    return [30+reach*54,-64-reach*8];
   }
   if(clip==='kick')return [34,-61-5*sin(a)];
   if(moving)return [27-cyc*(sprint?22:14),-59+c2*6];
   if(air)return [29,-78-8*sin(a)];
   if(clip==='hurt')return [36,-71];
   return [28,-54+1.5*sin(a)];
 })();
 const farHand=moving?[-26+cyc*(sprint?20:13),-61-c2*5]:
  air?[-28,-79+8*cos(a)]:[-28,-56];
 const shoulderNear=[18+tilt*.45,-79+crouch+bob],
       shoulderFar=[-18+tilt*.45,-79+crouch+bob],
       hipNear=[11+hipX,hipY],hipFar=[-11+hipX,hipY];
 const kneeNear=[
   mix(hipNear[0],legNear[0],.56)+(clip==='kick'?-4:8),
   mix(hipNear[1],legNear[1],.54)- (clip==='kick'?10:1)
 ];
 const kneeFar=[mix(hipFar[0],legFar[0],.56)-7,mix(hipFar[1],legFar[1],.53)];
 const elbowNear=[
   mix(shoulderNear[0],nearHand[0],.48)+3,
   mix(shoulderNear[1],nearHand[1],.53)+9
 ];
 const elbowFar=[
   mix(shoulderFar[0],farHand[0],.52)-6,
   mix(shoulderFar[1],farHand[1],.51)+6
 ];
 c.save();c.translate(0,-jumpArc*.16);
 c.lineCap='round';c.lineJoin='round';
 // Each frame independently paints limbs in correct far-to-near depth.
 capsule(c,hipFar,kneeFar,15);
 capsule(c,kneeFar,legFar,13);
 boot(c,legFar);
 capsule(c,shoulderFar,elbowFar,13);
 capsule(c,elbowFar,farHand,12);
 orb(c,...farHand,6.8);
 // Soft glossy rounded chest, no molded armor, clothing, hair or symbol.
 c.save();c.translate(hipX*.45+tilt*.3,-80+crouch+bob);c.rotate(-tilt*.012);
 c.beginPath();c.moveTo(-20,0);
 c.bezierCurveTo(-27,13,-23,27,-17,37);
 c.quadraticCurveTo(-3,48,17,37);
 c.bezierCurveTo(25,27,27,12,20,0);
 c.quadraticCurveTo(0,-8,-20,0);
 c.fillStyle=metal(c,-22,0,23,0);c.fill();c.strokeStyle='#465463';c.lineWidth=1.2;c.stroke();
 c.beginPath();c.moveTo(-14,2);c.bezierCurveTo(-20,15,-17,30,-9,35);
 c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=2.3;c.stroke();
 c.restore();
 orb(c,...shoulderFar,10);orb(c,...shoulderNear,10);
 capsule(c,hipNear,kneeNear,16.5);
 capsule(c,kneeNear,legNear,14.5);
 boot(c,legNear,clip==='kick'?-q*.14:0);
 capsule(c,shoulderNear,elbowNear,14);
 capsule(c,elbowNear,nearHand,13);
 orb(c,...nearHand,7.8);
 // One perfectly featureless metallic spherical head on every animation cel.
 // No face, eye sockets, nose, ears, hair or cape, even on punch and jump.
 const hx=tilt*.50+(clip==='hurt'?-6:0),hy=-110+crouch*.52+bob-jumpArc*.16;
 const neck=[hx,-91+crouch*.55+bob];
 capsule(c,neck,[hx,hy+13],12);
 orb(c,hx,hy,20,false);
 const g=c.createRadialGradient(hx-8,hy-10,1,hx,hy,20);
 g.addColorStop(0,'rgba(255,255,255,.94)');
 g.addColorStop(.3,'rgba(255,255,255,.37)');
 g.addColorStop(1,'rgba(255,255,255,0)');
 c.fillStyle=g;c.beginPath();c.arc(hx,hy,19,0,TAU);c.fill();
 c.beginPath();c.ellipse(hx-7,hy-9,7,2.8,-.6,0,TAU);
 c.fillStyle='rgba(255,255,255,.72)';c.fill();
 c.restore();
}
function sheetFor(clip){
 if(sprites.has(clip))return sprites.get(clip);
 if(typeof document==='undefined')return null;
 const count=STEEL_SILHOUETTE_CELLS[clip],sheet=document.createElement('canvas');
 sheet.width=CELL*count;sheet.height=CELL;
 const c=sheet.getContext('2d');
 if(!c)return null;
 for(let i=0;i<count;i++){
  c.save();c.translate(i*CELL+CELL*.5,CELL-15);
  paintCel(c,clip,i,count);c.restore();
 }
 sprites.set(clip,sheet);
 return sheet;
}
export function steelSilhouetteStatus(){return {clips:Object.keys(STEEL_SILHOUETTE_CELLS).length,cached:[...sprites.keys()]};}
export function drawSteelSilhouette(c,game,pos,time=game?.time||0,hero=game?.hero){
 const state=selectSteelSilhouettePose(hero,time);
 if(!state||!c||!pos)return false;
 const sheet=sheetFor(state.clip);
 if(!sheet)return false;
 c.save();
 const power=game?.powers?.active?.steel;
 const age=power?.age??10,remaining=(power?.duration??10)-age;
 if(age<.14)c.globalAlpha=clamp(.48+age/.14*.52);
 if(remaining<.20)c.globalAlpha*=clamp(.25+remaining/.20*.75,.25,1);
 if(state.face<0){c.translate(pos.x*2,0);c.scale(-1,1);}
 // Same smooth anonymous silver model replaces any appearance.
 c.drawImage(sheet,state.frame*CELL,0,CELL,CELL,
   pos.x-CELL*.5,pos.y-CELL+15,CELL,CELL);
 // Only a modest transformation flash; no old hero silhouette beneath it.
 if(age<.23){
   const flash=1-clamp(age/.23);
   c.globalAlpha=.5*flash;
   c.beginPath();c.ellipse(pos.x,pos.y-63,41+25*(1-flash),73+18*(1-flash),0,0,TAU);
   c.strokeStyle='#d4f8ff';c.lineWidth=2.8;c.shadowColor='#91dfff';c.shadowBlur=12;c.stroke();
 }
 c.restore();
 return true;
}
