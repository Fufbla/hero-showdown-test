import {styleCMaterial} from './style-c-materials.mjs';
import {hairDefinition} from './hair-catalog.mjs';
import {INK,tone,line,oval,curve,poly} from './style-c-paint.mjs';
const LEGACY={
 curls:{texture:'curl',shape:'round',volume:1.12,length:3},
 locs:{texture:'loc',shape:'loose',volume:1,length:28,part:-1},
 short:{texture:'straight',shape:'crop',volume:.86,length:0,part:-1},
 waves:{texture:'wave',shape:'sweep',volume:1.08,length:4,part:-1},
 ponytail:{texture:'wave',shape:'high-tail',volume:1.1,length:31,part:-1},
 braids:{texture:'braid',shape:'double-braid',volume:1,length:29},
};
export const styleCHairDefinition=id=>hairDefinition(id)||LEGACY[id];
// Locks use a few connected cubic strokes; motion comes from the existing
// damped cosmetic hair state, with different stiffness by fiber/length.
export function drawStyleCHair(c,l,m,time,layer='front',back=false){
 const d=styleCHairDefinition(l.hair);if(!d||l.helmet)return;
 const col=l.hairColor,dark=tone(col,.58),light=tone(col,1.65),gold=l.trim||'#e9c56d',v=d.volume;
 const wind=m?.wind||0,bounce=m?.bounce||0,texture=d.texture;
 function lock(x,y,ex,ey,w,i){
  const flexible=Math.min(1,Math.abs(ey-y)/22),sway=wind*flexible;
  ex+=sway;ey+=bounce*flexible;
  const curl=texture==='curl'||texture==='wave'?Math.sin(i*1.7+time*2)*2.5:0;
  c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x-4+curl,y+(ey-y)*.34,ex+4+curl,ey-(ey-y)*.2,ex,ey);
  c.lineCap='round';c.strokeStyle=INK;c.lineWidth=w+1.3;c.stroke();c.strokeStyle=col;c.lineWidth=w;c.stroke();
  c.strokeStyle=light;c.lineWidth=w*.28;c.stroke();
  c.beginPath();c.moveTo(x+w*.24,y+1);c.bezierCurveTo(x-3+curl+w*.24,y+(ey-y)*.34,ex+4+curl+w*.22,ey-(ey-y)*.2,ex+w*.16,ey);c.strokeStyle=dark;c.lineWidth=w*.25;c.stroke();
  const material=styleCMaterial(texture==='braid'?'braid':texture==='curl'||texture==='wave'?'curl':'loc',col);
  if(material){
   const point=t=>{const q=1-t;return [q*q*q*x+3*q*q*t*(x-4+curl)+3*q*t*t*(ex+4+curl)+t*t*t*ex,q*q*q*y+3*q*q*t*(y+(ey-y)*.34)+3*q*t*t*(ey-(ey-y)*.2)+t*t*t*ey];};
   for(let j=0;j<8;j++){const a=point(j/8),b=point((j+1)/8),len=Math.hypot(b[0]-a[0],b[1]-a[1]);c.save();c.translate(...a);c.rotate(Math.atan2(b[1]-a[1],b[0]-a[0])-Math.PI/2);c.drawImage(material,0,j*material.height/8,material.width,material.height/8,-w*.6,-.4,w*1.2,len+.8);c.restore();}
  }
  if(!material&&['loc','twist','braid'].includes(texture))for(let j=1;j<7;j++){const f=j/7,px=x+(ex-x)*f,py=y+(ey-y)*f;
   if(texture==='braid')line(c,[[px-w*.3,py-1],[px+w*.25,py+1],[px-w*.25,py+2]],tone(col,1.5),.65);
   else line(c,[[px-w*.25,py],[px+w*.22,py+((j%2)?1:-1)*.8]],dark,.65);}
  if(!material&&texture==='curl')for(let j=1;j<5;j++){const f=j/5;oval(c,x+(ex-x)*f+Math.sin(j*2+i)*1.6,y+(ey-y)*f,w*.63,w*.8,col,INK,.65);line(c,[[x+(ex-x)*f-1,y+(ey-y)*f],[x+(ex-x)*f,y+(ey-y)*f-1.4]],light,.7);}
  if(['loc','braid'].includes(texture)&&i%4===1){const f=.64,px=x+(ex-x)*f,py=y+(ey-y)*f;c.save();c.translate(px,py);c.rotate(-Math.atan2(ex-x,ey-y));poly(c,[[-w*.55,-1.5],[w*.55,-1.5],[w*.5,1.7],[-w*.5,1.7]],gold,INK,.5);line(c,[[-w*.3,-1],[w*.2,-1]],'#fff1b0',.7);c.restore();}
 }
 function puff(x,y,r,seed=0){oval(c,x,y,r,r*.88,dark,INK,1.1);for(let i=0;i<20;i++){const a=i*2.4+seed,t=Math.sqrt(i/20),xx=x+Math.cos(a)*r*t,yy=y+Math.sin(a)*r*.8*t;oval(c,xx,yy,2.8,2.5,col,INK,.55);c.beginPath();c.arc(xx-.4,yy-.6,1.6,3.6,5.8);c.strokeStyle=light;c.lineWidth=.65;c.stroke();}}
 c.save();
 if(layer==='rear'){
  if(['loose','bob','half'].includes(d.shape)&&d.length>9){
   curve(c,[[-17,-12],[-25,0,-21,d.length-8],[-5,d.length+1,18,d.length-8],[24,0,15,-15]],dark,INK,1.2);
   for(let i=0;i<11;i++)lock(-17+i*3.4,-14-Math.sin(i/10*Math.PI)*5,-19+i*3.8,d.length-10+(d.shape==='bob'?Math.sin(i*.7)*3:Math.sin(i)*2),texture==='straight'?4.8:4.2,i);}
  if(d.shape.includes('tail')){const y=d.shape==='high-tail'?-24:-2;oval(c,-12,y,6,4,gold,INK,.8);for(let i=0;i<7;i++)lock(-10-i*.8,y-4,-27-i*1.5,y+d.length*.9-i*.7,texture==='braid'?3.3:4.5,i);}
  if(d.shape==='double-braid')for(const s of[-1,1])lock(s*16,-8,s*21,25,5,s===1?1:2);
  c.restore();return;
 }
 // Crown with a deliberate hairline and readable temple shape.
 curve(c,[[-17,1],[-21,-14,-12,-22],[0,-28,13,-21],[21,-13,17,1],[13,-6,10,-11],[4,-8,0,-13],[-9,-7,-12,-8],[-14,0,-17,1]],col,INK,1.3);
 if(['round','fade','taper'].includes(d.shape)){
  const rx=(d.shape==='taper'?12:17)*v,ry=(d.shape==='fade'?7:10)*v;
  for(let i=0;i<28;i++){const a=i*2.4,t=Math.sqrt(i/28),x=Math.cos(a)*rx*t,y=-16+Math.sin(a)*ry*t;oval(c,x,y,texture==='straight'?2.6:3.3,2.9,col,INK,.65);c.beginPath();c.arc(x-.3,y-.4,1.6,3.4,5.8);c.strokeStyle=light;c.lineWidth=.7;c.stroke();}
 }else if(d.shape==='buzz'){
  for(let i=0;i<44;i++){const x=Math.sin(i*5)*16,y=-11-Math.abs(Math.cos(i*3))*12;line(c,[[x,y],[x+.4,y-.9]],light,.6);}
 }else if(d.shape==='flat'){
  curve(c,[[-16,-11],[-17,-30],[-10,-32,14,-30],[16,-9],[10,-13],[-10,-12]],col,INK,1.3);
  for(let i=0;i<60;i++){const x=-14+i%15*2,y=-29+Math.floor(i/15)*4;oval(c,x,y,1.3,1.4,i%3?col:light,INK,.35);}
 }else if(d.shape==='knots'){for(let i=0;i<5;i++)puff(-17+i*8,-12-Math.sin(i/4*Math.PI)*16,4.6,i);}
 else if(d.shape==='double'){puff(-21,-20,8*v);puff(21,-20,8*v,1);}
 else if(d.shape==='bun'||d.shape==='half'){
  puff(-2,-26,9*v);
  if(texture==='loc')for(let i=0;i<8;i++)lock(-10+i*2.7,-27,7-i*1.6,-31-Math.sin(i/7*Math.PI)*5,3.6,i);
  oval(c,-4,-22,7,2,gold,INK,.65);
 }else if(d.shape==='crown'){for(let i=0;i<14;i++){const a=Math.PI+i/13*Math.PI;oval(c,Math.cos(a)*16,-9+Math.sin(a)*17,3.2,3.8,col,INK,.8);line(c,[[Math.cos(a)*16-1,-9+Math.sin(a)*17],[Math.cos(a)*16+1,-10+Math.sin(a)*17]],light,.7);}}
 else if(d.shape.includes('tail')){for(let i=0;i<12;i++){const x=-16+i*2.9;c.beginPath();c.moveTo(x,-10-Math.sin(i/11*Math.PI)*3);c.bezierCurveTo(x-4,-21,-4,-26,-11,-25);c.strokeStyle=INK;c.lineWidth=2;c.stroke();c.strokeStyle=light;c.lineWidth=.7;c.stroke();}for(const side of[-1,1])lock(side*16,-11,side*19,13,2.5,side===1?1:2);}
 else if(d.shape==='spikes'){for(let i=0;i<8;i++){const x=-16+i*4.4;poly(c,[[x,-10],[x-2,-22-Math.sin(i/7*Math.PI)*8],[x+5,-19],[x+5,-10]],col,INK,1);line(c,[[x+1,-12],[x,-21]],light,.8);}}
 else if(d.shape==='sweep'||d.shape==='crop'){
  for(let i=0;i<10;i++){const x=-16+i*3.3;c.beginPath();c.moveTo(x,-8);c.bezierCurveTo(x-7,-18,-12+i*2,-28*v,13+d.part*3,-19);c.strokeStyle=INK;c.lineWidth=4.5;c.stroke();c.strokeStyle=col;c.lineWidth=3;c.stroke();c.strokeStyle=light;c.lineWidth=.7;c.stroke();}
 }else if(d.length<=10&&texture==='loc'){
  for(let i=0;i<10;i++){const x=-14+i*3.1;lock(x,-11-Math.sin(i/9*Math.PI)*4,x+(i<5?-10:6)+Math.sin(i*2)*4,-18-Math.sin(i/9*Math.PI)*12,4.5,i);}
 }else{
  for(let i=0;i<10;i++){const x=-16+i*3.5;c.beginPath();c.moveTo(x,-7);c.quadraticCurveTo(x+(d.part||0)*6,-22,2+(d.part||0)*7,-23);c.strokeStyle=INK;c.lineWidth=d.shape==='rows'?2.5:1.8;c.stroke();c.strokeStyle=light;c.lineWidth=.65;c.stroke();}
  if(['loose','bob','half'].includes(d.shape)&&d.length>9&&!back)for(const s of[-1,1])for(let i=0;i<2;i++)lock(s*(15+i*3),-13,s*(18+i*4),Math.min(24,d.length-9)-i*3,3.5,i+(s===1?3:0));
 }
 if(back&&d.length>9&&['loose','bob','half'].includes(d.shape))for(let i=0;i<8;i++)lock(-14+i*4,-17,-15+i*4.5,d.length-8,4.3,i);
 if(l.age==='older')for(const s of[-1,1])line(c,[[s*16,-9],[s*17,-4]],'#b4a9a0',1.5);
 c.restore();
}
