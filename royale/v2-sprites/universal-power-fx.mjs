// Universal, character-independent power effects. The live hero remains the
// only owner of its head, hair, costume, cape, pose and color. These VFX use
// layers behind/in front of that hero; gameplay state is read-only.
// Each animation uses 12+ distinct subframes plus continuous particle motion.
export const UNIVERSAL_FX_VERSION='hero-overlay-motions-v1';
export const UNIVERSAL_FX_FRAMES=Object.freeze({
  strength:12, superKick:14, fireball:12, agility:16, speed:16, flight:16
});
const TAU=Math.PI*2;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const frac=x=>((x%1)+1)%1;
const ease=x=>x*x*(3-2*x);
const scalar=(v,other=0)=>Number.isFinite(v)?v:other;
const P=Object.freeze({
  strength:['#ffea6c','#ffb529','#fff8ce'],
  superKick:['#ffa82e','#ffd05a','#fff1ac'],
  fireball:['#ff642b','#ffbc2d','#fff9d2'],
  agility:['#84fff2','#3ed3cc','#f0fffa'],
  speed:['#5cf1d6','#21c3ed','#d4ffff'],
  flight:['#f8d466','#6fe4fb','#f6ffff']
});
export function universalPowerStates(game,hero=game?.hero){
 if(!hero||hero.dead)return [];
 const active=game?.powers?.active||{};
 const out=[];
 if(hero.attack?.power==='strength')out.push({id:'strength',age:scalar(hero.attack.age),phase:clamp(scalar(hero.attack.age)/.27)});
 if(hero.attack?.power==='superKick')out.push({id:'superKick',age:scalar(hero.attack.age),phase:clamp(scalar(hero.attack.age)/.39)});
 if((hero.castAge??100)<.25)out.push({id:'fireball',age:scalar(hero.castAge),phase:clamp(scalar(hero.castAge)/.25)});
 if(hero.agile||active.agility)out.push({id:'agility',age:scalar(active.agility?.age,hero.dodgeAge||0),phase:frac(scalar(game?.time)*1.8)});
 if(hero.flying||active.flight)out.push({id:'flight',age:scalar(active.flight?.age),phase:frac(scalar(game?.time)*1.25)});
 if(Math.abs(hero.vx||0)>160 && (game?.powers?.speed>0||game?.powers?.data?.levels?.speed>0))
   out.push({id:'speed',age:scalar(game?.time),phase:frac(scalar(hero.cycle)*.5)});
 return out.map(s=>({...s,frame:Math.floor(s.phase*UNIVERSAL_FX_FRAMES[s.id])%UNIVERSAL_FX_FRAMES[s.id]}));
}
function line(c,pts,color,width,glow=0){
 c.beginPath();c.moveTo(...pts[0]);for(let i=1;i<pts.length;i++)c.lineTo(...pts[i]);
 c.lineCap='round';c.lineJoin='round';c.strokeStyle=color;c.lineWidth=width;
 if(glow){c.shadowColor=color;c.shadowBlur=glow;}c.stroke();c.shadowBlur=0;
}
function arc(c,x,y,rx,ry,from,to,color,width,glow=0,rotation=0){
 c.beginPath();c.ellipse(x,y,Math.max(.2,rx),Math.max(.2,ry),rotation,from,to);
 c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';
 c.shadowColor=color;c.shadowBlur=glow;c.stroke();c.shadowBlur=0;
}
function spark(c,x,y,angle,scale,palette){
 const dx=Math.cos(angle),dy=Math.sin(angle);
 line(c,[[x-dx*scale*.3,y-dy*scale*.3],[x+dx*scale,y+dy*scale]],palette[0],Math.max(1,scale*.15),6);
 c.beginPath();c.arc(x,y,Math.max(.8,scale*.10),0,TAU);c.fillStyle=palette[2];c.fill();
}
function glow(c,x,y,r,color,opacity){
 c.save();c.globalAlpha*=opacity;
 const g=c.createRadialGradient(x,y,1,x,y,r);
 g.addColorStop(0,color);g.addColorStop(.25,color+'99');g.addColorStop(1,color+'00');
 c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();c.restore();
}
function lightning(c,points,color,thick){
 line(c,points,color,thick+2,12);line(c,points,'#fff9df',Math.max(1,thick*.28),0);
}
function strokeDash(c,x,y,len,dir,ix,t,p){
 const a=dir*(len+(ix*19)%34+frac(t*10+ix*.32)*60);
 const py=y-8-ix*7-frac(t*7+ix*.27)*9;
 line(c,[[x-a*.32,py],[x-a,py-1.4]],p[ix%2],2.4+(ix%3)*.3,7);
}
function strength(c,x,y,s,layer,t,face){
 const colors=P.strength,phase=s.phase,release=ease(clamp((phase-.27)/.20));
 const fx=x+face*(34+release*35),fy=y-67-release*2;
 if(layer==='back'){
   glow(c,x,y-59,62,colors[1],.13+.09*Math.sin(t*13)**2);
   for(let i=0;i<5;i++){
     const u=t*7+i*1.38,side=i%2?-1:1;
     arc(c,x+side*7,y-63+(i-2)*12,24+i*4,9+i, u,u+1.6,colors[i%2],2.7,8);
   }
 }else{
   glow(c,fx,fy,release*24+14,colors[0],.35+.25*release);
   for(let i=0;i<8;i++){
     const a=i*TAU/8+t*1.2,rr=17+i%3*7+release*18;
     const px=fx+Math.cos(a)*rr,py=fy+Math.sin(a)*rr*.55;
     spark(c,px,py,a,5+release*13,colors);
   }
   lightning(c,[[x+face*21,y-83],[x+face*32,y-69],[fx-face*5,fy+9],[fx+face*(10+release*16),fy-2]],colors[1],2.7);
   if(release>.04)arc(c,fx,fy,12+release*41,16+release*18,-1.1,1.3,colors[2],2.5,9);
 }
}
function superKick(c,x,y,s,layer,t,face){
 const colors=P.superKick,phase=s.phase,hit=ease(clamp((phase-.21)/.24));
 const footX=x+face*(24+hit*57),footY=y-17-hit*26;
 if(layer==='back'){
  for(let i=0;i<5;i++)arc(c,x,y-15-i*13,32+i*5,11+i*2,t*7+i*.9,t*7+i*.9+1.5,colors[i%2],2.5,10);
  glow(c,x+face*18,y-30,40,colors[0],.15);
 }else{
  arc(c,footX-face*13,footY,19+hit*31,21+hit*17,-1.5,1.5,colors[0],4.5,15,-face*.13);
  arc(c,footX-face*13,footY,16+hit*24,18+hit*13,-1.5,1.5,colors[2],1.6,6,-face*.13);
  for(let i=0;i<9;i++){
   const a=-1.35+i*.34+t*.5,px=footX+Math.cos(a)*(24+hit*32),py=footY+Math.sin(a)*(20+hit*30);
   spark(c,px,py,a,5+hit*8,colors);
  }
  glow(c,footX,footY,20+hit*20,colors[1],.22);
 }
}
function fireball(c,x,y,s,layer,t,face){
 const colors=P.fireball,phase=s.phase,charge=Math.sin(Math.PI*clamp(phase*1.08))**.6;
 const fx=x+face*(30+Math.max(0,phase-.46)*34),fy=y-69;
 if(layer==='back'){
  for(let i=0;i<4;i++)arc(c,x+face*4,y-61,28+i*8,16+i*3,t*5+i,t*5+i+1.35,colors[i%2],2.5,10);
 }else{
  glow(c,fx,fy,16+charge*23,colors[0],.30+charge*.3);
  for(let i=0;i<6;i++){
    const a=t*9+i*TAU/6;
    arc(c,fx,fy,10+charge*17,9+charge*15,a,a+.68,colors[i%2],2.5,9);
    spark(c,fx+Math.cos(a)*(18+charge*18),fy+Math.sin(a)*(15+charge*16),a,5+charge*5,colors);
  }
  if(phase>.47)lightning(c,[[fx-face*21,fy+4],[fx-face*9,fy-8],[fx+face*20,fy]],colors[0],2.7);
 }
}
function agility(c,x,y,s,layer,t,face){
 const p=P.agility,phase=s.phase;
 if(layer==='back'){
  for(let i=0;i<5;i++){
   const sweep=frac(phase+i*.21),yy=y-110+sweep*94;
   line(c,[[x-face*(58+sweep*24),yy],[x-face*(13+sweep*8),yy-3]],p[i%2],2.2,7);
  }
  glow(c,x,y-51,60,p[1],.13);
 }else{
  for(let i=0;i<5;i++){
   const a=t*8+i*1.25,yy=y-18-i*22;
   arc(c,x,yy,29+i%2*12,8+i%3*2,a,a+1.7,p[i%2],2.2,9);
  }
  for(let i=0;i<3;i++)spark(c,x+face*(19+i*9),y-27-i*24,i*1.7+t*8,5,p);
 }
}
function flight(c,x,y,s,layer,t){
 const p=P.flight,phase=s.phase;
 if(layer==='back'){
  for(let i=0;i<6;i++){
   const a=phase*TAU+i*.56,ry=8+i*4;
   arc(c,x,y+5-i*13,31+i*4,ry,a,a+2.15,p[i%2],2.2,8);
  }
  glow(c,x,y+8,47,p[0],.21);
 }else{
  for(let i=0;i<4;i++){
   const a=phase*TAU*1.3+i*1.6;
   arc(c,x,y+8-i*24,24+i*5,5+i*2,a,a+1.8,p[(i+1)%2],3,9);
   spark(c,x+Math.cos(a)*(24+i*6),y-3-i*21,a,8,p);
  }
  for(let side of [-1,1])line(c,[[x+side*15,y+10],[x+side*24,y+28],[x+side*35,y+47]],p[1],2.7,10);
 }
}
function speed(c,x,y,s,layer,t,face){
 const p=P.speed,phase=s.phase;
 if(layer==='back'){
  for(let i=0;i<8;i++)strokeDash(c,x-face*3,y,13,face,i,t,p);
  for(let i=0;i<3;i++){
   const q=frac(phase+i/3),dx=face*(15+q*44),dy=3-q*8;
   glow(c,x-dx,y+dy,5+q*9,p[i%2],.14*(1-q));
   arc(c,x-dx,y+dy,3+q*8,2+q*3,0,Math.PI,p[i%2],2,5);
  }
 }else{
  for(let i=0;i<3;i++){
   const a=phase*TAU+i*2.1;
   arc(c,x,y-10-i*30,22+i*5,4+i,a,a+1.0,p[i%2],2,8);
  }
  spark(c,x-face*19,y-3,phase*TAU,5,p);
 }
}
// Frames are discrete at 12–16 poses per effect; animated sparks and orbiting
// curves interpolate between frames for a polished 60fps appearance.
export function drawUniversalPowerFX(c,game,pos,time=0,layer='back',hero=game?.hero){
 if(!c||!pos||!(layer==='back'||layer==='front'))return false;
 const states=universalPowerStates(game,hero);
 if(!states.length)return false;
 const face=(hero.attack?.face||hero.face||1)<0?-1:1;
 for(const s of states){
   c.save();
   // Keep every effect attached to the moving player, never replace the body.
   c.globalAlpha=1;
   if(s.id==='strength')strength(c,pos.x,pos.y,s,layer,time,face);
   else if(s.id==='superKick')superKick(c,pos.x,pos.y,s,layer,time,face);
   else if(s.id==='fireball')fireball(c,pos.x,pos.y,s,layer,time,face);
   else if(s.id==='agility')agility(c,pos.x,pos.y,s,layer,time,face);
   else if(s.id==='flight')flight(c,pos.x,pos.y,s,layer,time);
   else if(s.id==='speed')speed(c,pos.x,pos.y,s,layer,time,face);
   c.restore();
 }
 return true;
}
