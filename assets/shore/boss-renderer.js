'use strict';
// Authored transparent parts, articulated around the simulation's contact poses.
const shoreBossRects=[[24,70,591,438],[625,44,380,473],[1080,44,432,470],[157,528,240,443],[629,552,282,394],[938,800,571,180]];
function shoreBossPart(part,x,y,w,h,angle=0,ax=.5,ay=.5,alpha=1){
 if(!shoreBossParts.complete||!shoreBossParts.naturalWidth)return;
 ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=alpha;
 ctx.drawImage(shoreBossParts,...shoreBossRects[part],-w*ax,-h*ay,w,h);ctx.restore();
}
function shoreBossLink(a,b,width=46){
 const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
 shoreBossPart(3,(a.x+b.x)/2,(a.y+b.y)/2,width,length+20,Math.atan2(dy,dx)-Math.PI/2);
}
function shoreBossTail(m){
 const tip=m.stingerPose(),end={x:tip.x+54,y:tip.y-133},start={x:640,y:350};
 const c1={x:850,y:125},c2={x:Math.min(1190,end.x+110),y:Math.min(120,end.y-65)};
 const point=p=>({x:(1-p)**3*start.x+3*(1-p)**2*p*c1.x+3*(1-p)*p*p*c2.x+p**3*end.x,y:(1-p)**3*start.y+3*(1-p)**2*p*c1.y+3*(1-p)*p*p*c2.y+p**3*end.y});
 for(let i=0;i<10;i++)shoreBossLink(point(i/10),point((i+1)/10),50-i*1.2);
}
function shoreBossClaws(m){
 return [m.clawPose(1),m.clawPose(-1)];
}
function shoreBossClaw(p,i,trail=false){
 if(trail){ctx.save();ctx.globalAlpha=.24;ctx.strokeStyle='#ffe5a1';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(p.x-p.side*36,p.y+10);ctx.quadraticCurveTo(p.x-p.side*15,p.y-8,p.x,p.y);ctx.stroke();ctx.restore();}
 shoreBossPart(i?2:1,p.x,p.y,210,260,p.angle,...p.anchor);
}
function shoreBossBodyOffset(m){
 return {x:m.flash>0?Math.sin(m.flash*60)*7:0,y:Math.sin(t*2.4)*.8};
}
function drawShoreBossBack(m){
 if(m.state==='dissolve'){drawShoreBossDeath(m);return;}
 const offset=shoreBossBodyOffset(m);
 ctx.save();ctx.beginPath();ctx.rect(0,0,W,608);ctx.clip();ctx.translate(offset.x,offset.y);
 ellipse(640,573,290,26,'#080e1899');
 shoreBossTail(m);
 const claws=shoreBossClaws(m);
 claws.forEach(p=>shoreBossLink(p.shoulder,p.wrist,65));
 shoreBossPart(0,640,573,530,393,0,.5,1);
 if(m.flash>0){ctx.save();ctx.globalAlpha=m.flash*1.3;ellipse(640,395,110,100,'#e9ffad');ctx.restore();}
 claws.forEach((p,i)=>{if(!['clawWindup','clawSweep'].includes(m.state)||(m.side===1?i!==0:i!==1))shoreBossClaw(p,i);});
 ctx.restore();
 if(m.state==='clawWindup'){
  const p=m.clawPose();ctx.save();ctx.globalAlpha=.45+.25*Math.sin(m.age*18);ctx.strokeStyle='#ffd689';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(p.x,608,95,14,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 if(['stingerWindup','stingerPlunge','stingerExposed'].includes(m.state)){
  const exposed=m.state==='stingerExposed'&&m.dodged;
  ctx.save();ctx.strokeStyle=exposed?'#e9ffb7':'#b8ee35';ctx.lineWidth=m.locked?5:3;ctx.globalAlpha=.7;
  ctx.beginPath();ctx.ellipse(m.targetX,607,75,18,0,0,Math.PI*2);ctx.stroke();
  if(m.locked&&!exposed){ctx.fillStyle='#d0ff3c22';ctx.fill();ctx.beginPath();ctx.moveTo(m.targetX-58,595);ctx.lineTo(m.targetX+58,619);ctx.moveTo(m.targetX+58,595);ctx.lineTo(m.targetX-58,619);ctx.stroke();}
  ctx.restore();
 }
}
function drawShoreBossFront(m){
 if(m.state==='dissolve')return;
 const offset=shoreBossBodyOffset(m);
 ctx.save();ctx.beginPath();ctx.rect(0,0,W,608);ctx.clip();ctx.translate(offset.x,offset.y);
 shoreBossClaws(m).forEach((p,i)=>{
  if(['clawWindup','clawSweep'].includes(m.state)&&(m.side===1?i===0:i===1))shoreBossClaw(p,i,m.state==='clawSweep');
 });
 const p=m.stingerPose(),glow=m.state==='stingerExposed'&&m.dodged;
 if(glow){ctx.save();ctx.globalAlpha=.35+.18*Math.sin(t*12);ctx.strokeStyle='#e5ffac';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(p.x+16,p.y-45,64,82,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 shoreBossPart(4,p.x,p.y,118,165,0,.20,.92);
 if(['stingerWindup','stingerPlunge','stingerExposed','reflect'].includes(m.state)){
  for(let j=0;j<3;j++){const q=(t*2+j/3)%1;ellipse(p.x+Math.sin(j*4)*9,p.y+q*34,3*(1-q),5*(1-q),'#b5eb36');}
 }
 ctx.restore();
}
function drawShoreBossDeath(m){
 const age=m.deathAge,frames=[0,1,2,3],dur=.62,index=Math.min(3,Math.floor(age/dur)),blend=clamp((age/dur-index-.68)/.32,0,1);
 // Painted collapse frames crossfade into a persistent toxin pool.
 if(shoreBossDeath.complete&&shoreBossDeath.naturalWidth){
  const rects=[[0,0,768,570],[768,0,768,570],[0,580,768,444],[768,580,768,444]],scales=[.85,.85,.75,.55],feet=[555,555,415,415];
  function frame(n,alpha){const r=rects[n],sy=scales[n];ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(shoreBossDeath,...r,230,604-feet[n]*sy,820,r[3]*sy);ctx.restore();}
  frame(frames[index],1);if(index<3&&blend>0)frame(frames[index+1],blend);
 }else shoreBossPart(5,640,590,720,135);
 if(age>1.7){for(let i=0;i<6;i++){const q=(t*.7+i*.17)%1;ellipse(410+i*92,594-Math.sin(q*Math.PI)*8,3+q*2,2+q*2,'#a3cf444f');}}
}
