import {BOSS_FX_THEMES,bossTheme,drawBossShot as originalShot} from '../../royale/boss-effects.mjs?bossFallback=1';
import {cuePlan,contactReady} from './model.mjs';
export {BOSS_FX_THEMES,bossTheme};
export const warningZones=a=>(a?.zones||[]).map(z=>({...z}));
const TAU=Math.PI*2,clamp=n=>Math.max(0,Math.min(1,n));
const colors=theme=>BOSS_FX_THEMES[theme]||BOSS_FX_THEMES.trash;
function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.fillStyle=color;c.fill();}
function path(c,points,color,width){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function shard(c,x,y,size,color,tilt=0){c.save();c.translate(x,y);c.rotate(tilt);c.beginPath();c.moveTo(-size*.7,size*.5);c.lineTo(-size*.45,-size*.5);c.lineTo(size*.2,-size);c.lineTo(size*.7,size*.3);c.closePath();c.fillStyle=color;c.fill();c.restore();}
function mote(c,x,y,size,color){ellipse(c,x,y,size,size*.65,color);}
function charge(c,b,time,progress,shape){
 const [base,light]=colors(bossTheme(b)),n=5+b.phase*2;
 const x=b.x+b.face*(b.w*.45),y=b.y-(shape==='wave'?34:75);
 c.save();c.globalAlpha=.35+progress*.35;
 for(let i=0;i<n;i++){const a=i*2.399+time*4,r=5+(1-progress)*22;const px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.8;
  if(['bush','venomis','trash','wastelander','styro'].includes(bossTheme(b)))shard(c,px,py,2+progress*3,i%2?base:light,a);else mote(c,px,py,2+progress*2,i%2?base:light);
 }
 c.restore();
}
// These are physical materials, without outlines, hatching, arrows or warning text.
export function drawNaturalGround(c,z,{theme='trash',shape='ground',time=0,active=false,progress=0,recovery=false}={}){
 const [base,light]=colors(theme),floor=z.y+z.h,n=Math.max(5,Math.ceil(z.w/19)),q=clamp(progress);
 c.save();c.beginPath();c.rect(z.x,z.y,z.w,z.h);c.clip();
 c.globalAlpha*=recovery?.25:active?.95:.65;
 for(let i=0;i<n;i++){
  const seed=i*2.399,x=z.x+(i+.5)*z.w/n,w=z.w/n*.72,wobble=Math.sin(time*15+seed);
  if(shape==='lightning'){
   if(active){path(c,[[x-w,floor-2],[x-w*.3,floor-18-wobble*4],[x+w*.1,floor-9],[x+w*.4,z.y+5],[x+w,floor-8]],i%2?base:light,3);mote(c,x,floor-3,3,light);}
   else{mote(c,x,floor-3-Math.abs(wobble)*(6+q*18),1.5+q,light);shard(c,x+w*.2,floor-2-q*6,2,base,seed);}
  }else if(['bush','venomis'].includes(theme)){
   if(active){const tip=z.y+4+Math.sin(seed)*3;path(c,[[x,floor],[x-w*.3,floor-z.h*.25],[x+w*.3,floor-z.h*.65],[x,tip]],base,Math.max(5,w*.5));shard(c,x+w*.4,floor-z.h*.5,w*.7,light,-.8);}
   else{ellipse(c,x,floor-2,w*.65,3+q*4,'#715e40');shard(c,x+w*.3,floor-4-q*7,3+q*4,base,seed);}
  }else if(['trash','pollution','air'].includes(theme)||theme==='venom'||shape==='trap'&&theme!=='styro'){
   const height=active?z.h*(.5+.35*Math.sin(seed)**2):3+q*6;
   ellipse(c,x,floor-height*.48,w,height*.55,base);ellipse(c,x-w*.25,floor-height*.9,w*.32,Math.max(1,height*.12),light);
   if(active)mote(c,x+wobble*5,z.y+5+(Math.sin(seed)+1)*z.h*.2,3,base);
  }else if(theme==='styro'){
   const height=active?z.h*.85:4+q*8;
   shard(c,x,floor-height*.5,w*.8,base,Math.sin(seed)*.4);ellipse(c,x,floor-height*.5,w*.5,height*.5,base);ellipse(c,x-2,floor-height*.7,2,3,'#718f8a');
  }else{
   // Irregular displaced stones rise from the ground at every locked site.
   const height=active?z.h*(.58+.35*Math.sin(seed)**2):3+q*7;
   shard(c,x,floor-height*.4,Math.max(4,height*.5),i%2?base:'#726a57',seed*.2);
   if(active)path(c,[[x-w*.6,floor-3],[x-w*.3,floor-height*.5],[x+w*.15,floor-height],[x+w*.7,floor-6]],light,2);
   else mote(c,x+wobble*3,floor-4-q*8,2,'#c3b492');
  }
 }
 c.restore();
}
function fallingPreparation(c,z,time,progress,theme){
 const [base,light]=colors(theme),x=z.x+z.w/2;
 c.save();c.globalAlpha=.75;
 // A single object at the actual spawn point; falling dust and its physical shadow.
 shard(c,x+Math.sin(time*11)*2,90,10+progress*3,base,time*.25);
 for(let i=0;i<5;i++){const q=(time*.8+i*.17)%1;mote(c,x+Math.sin(i*8)*8,105+q*75,1.2,light);}
 ellipse(c,x,598,11+progress*3,3,'#151b2355');c.restore();
}
function melee(c,b,z,time,active,shape){
 const [base,light]=colors(bossTheme(b));
 if(!active){charge(c,b,time,clamp(b.age/b.attack.warning),shape);return;}
 c.save();c.beginPath();c.rect(z.x,z.y,z.w,z.h);c.clip();
 const floor=z.y+z.h,cy=shape==='sweep'?floor-24:floor-60;
 // Contact material spans the authoritative low hit footprint on the first hit tick.
 // The body pose is independently snapped to its authored contact frame.
 for(let j=0;j<3;j++){
  const y=cy+(j-1)*(shape==='sweep'?9:17),ends=shape==='sweep'?[z.x+3,z.x+z.w-3]:[b.x,z.x+(b.face>0?z.w-3:3)];
  if(['bush','venomis'].includes(bossTheme(b)))path(c,[[ends[0],y+8],[ends[0]+(ends[1]-ends[0])*.45,y-8],[ends[1],y]],base,6-j);
  else{c.globalAlpha=.55;path(c,[[ends[0],y+7],[ends[0]+(ends[1]-ends[0])*.6,y-7],[ends[1],y]],base,10-j*2);c.globalAlpha=1;}
 }
 for(let i=0;i<9;i++){const x=z.x+(i+.5)*z.w/9,dy=Math.sin(i*2.4)*12;shard(c,x,cy+dy,3+i%3,i%2?light:base,time*2+i);}
 c.restore();
}
export function drawBossAttackFX(c,g){
 const b=g.arenaScene?.boss,a=b?.attack;if(!a||!['windup','active','recover'].includes(b.state))return;
 const theme=bossTheme(b),progress=clamp(b.age/(b.state==='windup'?a.warning:b.state==='active'?a.duration:a.recovery));
 for(const cue of cuePlan(b)){
  if(['projectile','bounce','wave'].includes(cue.kind)){if(b.state==='windup')charge(c,b,g.time,progress,cue.kind);continue;}
  if(cue.kind==='barrier'){if(b.state==='windup')charge(c,b,g.time,progress,'barrier');else if(b.state==='active'){const [base]=colors(theme);c.save();c.globalAlpha=.7;for(let i=0;i<12;i++){const angle=i*TAU/12;ellipse(c,b.x+Math.cos(angle)*b.w*.62,b.y-b.h*.5+Math.sin(angle)*b.h*.55,12,18,base);}c.restore();}continue;}
  if(cue.kind==='charge'){if(cue.preparing)charge(c,b,g.time,progress,'melee');else if(cue.active){c.save();c.globalAlpha=.4;for(let i=0;i<7;i++)mote(c,b.x-b.face*(b.w*.45+i*11),b.y-5-(i%3)*4,3+i,'#b9ac91');c.restore();}continue;}
  if(cue.kind==='fall'){if(b.state==='windup')fallingPreparation(c,cue.zone,g.time,progress,theme);continue;}
  if(cue.kind==='melee'||cue.kind==='sweep'){if(b.state!=='recover')melee(c,b,cue.zone,g.time,cue.active,cue.kind);continue;}
  if(['cloud','tornado','trap'].includes(cue.kind)&&b.state!=='windup')continue; // Persistent objects draw below, for their full simulation lifetime.
  if(cue.kind==='leap'&&b.state==='active'&&!cue.active){const z=cue.zone;ellipse(c,z.x+z.w/2,z.y+z.h-2,z.w*.27,6,'#17232044');continue;}
  drawNaturalGround(c,cue.zone,{theme,shape:cue.kind,time:g.time,active:cue.active,progress,recovery:b.state==='recover'});
  if(theme==='lightning'&&cue.preparing){const x=cue.zone.x+cue.zone.w/2;c.save();c.globalAlpha=.3;for(let i=0;i<5;i++)ellipse(c,x+(i-2)*13,330+(i%2)*6,19,8,'#c2c1ca');c.restore();}
 }
}
export function drawDangerZone(c,z,{theme='trash',shape='ground',time=0,active=false,progress=0}={}){
 if(shape==='cloud'||shape==='tornado'){
  const [base,light]=colors(theme),n=shape==='tornado'?12:9;c.save();c.beginPath();c.rect(z.x,z.y,z.w,z.h);c.clip();
  for(let i=0;i<n;i++){const t=i/(n-1),width=z.w*(shape==='tornado'?.2+t*.28:.3),x=z.x+z.w*.5+Math.sin(time*4+i)*z.w*.1,y=z.y+z.h*(1-t);c.globalAlpha=.55;ellipse(c,x,y,width,14,base);c.globalAlpha=.45;ellipse(c,x-width*.15,y-4,width*.65,5,light);}
  c.restore();return;
 }
 drawNaturalGround(c,z,{theme,shape,time,active,progress});
}
export function drawBossShot(c,p,time){return originalShot(c,p,time);}
