'use strict';
// Classic-script module: shares the original game bindings.


function dogPortrait(){const c=document.createElement('canvas');c.width=340;c.height=250;c.getContext('2d').drawImage(dogAtlas,20,0,690,515,0,0,340,250);return c.toDataURL()}

function dogSprite(pose,x,feet,height=350,dir=-1,alpha=1,angle=0){if(!dogAtlas.complete||!dogAtlas.width)return;const r=[[20,0,690,515],[730,0,800,515],[20,520,760,495],[745,500,790,524]][pose];ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,feet);ctx.rotate(angle);ctx.scale(dir===-1?1:-1,1);const w=height*r[2]/r[3];const masks=[null,[[730,0],[1530,0],[1530,515],[1410,515],[1410,485],[1010,485],[1010,515],[730,515]],[[20,520],[730,520],[730,875],[780,950],[780,1015],[20,1015]],[[745,530],[1000,530],[1000,498],[1300,498],[1300,530],[1535,530],[1535,1024],[745,1024]]];if(masks[pose]){ctx.beginPath();masks[pose].forEach((p,i)=>{const xx=(p[0]-r[0])/r[2]*w-w/2,yy=(p[1]-r[1])/r[3]*height-height;i?ctx.lineTo(xx,yy):ctx.moveTo(xx,yy)});ctx.closePath();ctx.clip();}ctx.drawImage(dogAtlas,...r,-w/2,-height,w,height);ctx.restore()}

function foamChunk(x,y,r,spin){ctx.save();ctx.translate(x,y);ctx.rotate(spin);poly([[-r,-r*.65],[r*.55,-r],[r,r*.55],[-r*.5,r]],'#f6f4eb','#8c8f95');ellipse(-r*.25,-r*.3,Math.max(1,r*.14),Math.max(1,r*.14),'#c5c5c4');ctx.restore()}

function updateStyrodogLogic(dt){if(boss.hitstun>0){}else if(boss.state==='idle'){boss.cd-=dt;let dx=hero.x-boss.x;if(Math.abs(dx)>210)boss.x=clamp(boss.x+Math.sign(dx)*(phase===1?65:90)*dt,155,1125);if(boss.cd<=0){boss.count++;boss.type=phase===3&&boss.count%3===0?'roar':phase>=2&&boss.count%2===0?'slam':'claw';boss.state='warn';boss.timer=boss.type==='roar'?1.2:boss.type==='slam'?1.05:.85;boss.dir=hero.x>boss.x?1:-1;boss.target=boss.type==='roar'?hero.x:clamp(hero.x,boss.x-300,boss.x+300);boss.startX=boss.x;combatSound('foam',.7)}}else if(boss.state==='warn'){boss.timer-=dt;if(boss.timer<=0){boss.state='attack';boss.timer=boss.type==='claw'?.68:boss.type==='slam'?.95:1.5;boss.struck=false;boss.volley=0;noise(.2,.35)}}else if(boss.state==='attack'){boss.timer-=dt;if(boss.type==='claw'){let p=clamp((.68-boss.timer)/.30,0,1);boss.x=clamp(boss.startX+(boss.target-boss.dir*210-boss.startX)*p,155,1125);if(!boss.struck&&boss.timer<=.38){boss.struck=true;noise(.12,.5);if(Math.abs(hero.x-(boss.x+boss.dir*225))<115&&hero.y>GROUND-175)hitHero(phase===1?15:19,boss.x);burst(boss.x+boss.dir*225,GROUND-130,14,'#f5f2df')}}if(boss.type==='slam'&&!boss.struck&&boss.timer<=.53){boss.struck=true;shake=16;combatSound('ground',1.1,'foam');burst(boss.x,GROUND-10,35,'#f5f2df');for(const dir of [-1,1])shockwaves.push({x:boss.x,dir,life:2.5,hit:false});if(Math.abs(hero.x-boss.x)<155&&hero.y>GROUND-160)hitHero(20,boss.x)}if(boss.type==='roar'){const count=Math.floor((1.5-boss.timer)/.4);if(count>boss.volley&&count<=3){boss.volley=count;for(let j=0;j<3;j++){let x=boss.x+boss.dir*(j===1?20:90),y=GROUND-245+(j-1)*23;let dx=boss.target-x,dy=GROUND-100-y,len=Math.hypot(dx,dy);foamShots.push({x,y,vx:dx/len*(320+phase*25),vy:dy/len*(320+phase*25)+(j-1)*35,life:3,r:13,spin:j});}noise(.12,.3)}}if(boss.timer<=0){boss.state='recover';boss.timer=boss.type==='slam'?1.35:1.05}}else if(boss.state==='recover'){boss.timer-=dt;if(boss.timer<=0){boss.state='idle';boss.cd=phase===1?.95:.65}}}

function updateFoam(dt){for(const f of foamShots){f.x+=f.vx*dt;f.y+=f.vy*dt;f.spin+=dt*5;f.life-=dt;if(Math.abs(hero.x-f.x)<38&&f.y>hero.y-heroes[selected].height+35&&f.y<hero.y){hitHero(8,f.x);f.life=0;burst(f.x,f.y,6,'#fff9e7')}if(f.y>GROUND){f.life=0;burst(f.x,GROUND,5,'#eeeade')}}foamShots=foamShots.filter(f=>f.life>0&&f.x>-30&&f.x<W+30);for(const q of shockwaves){q.x+=q.dir*(phase===3?360:300)*dt;q.life-=dt;if(!q.hit&&Math.abs(hero.x-q.x)<45&&hero.y>GROUND-75){hitHero(13,q.x);q.hit=true}}shockwaves=shockwaves.filter(q=>q.life>0&&q.x>0&&q.x<W)}

function drawFoam(){for(const f of foamShots)foamChunk(f.x,f.y,f.r,f.spin);for(const q of shockwaves){for(let i=0;i<5;i++)foamChunk(q.x-q.dir*i*13,GROUND-12-Math.sin(i*.7+t*13)*8,8-i*.9,t+i);ctx.strokeStyle='#fff2b6';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(q.x,GROUND-7,28,13,0,Math.PI,Math.PI*2);ctx.stroke()}}

function dogWarning(){if(boss.state!=='warn')return;const label=boss.type==='claw'?'CLAW LUNGE — JUMP OR BLOCK':boss.type==='slam'?'FOAM SLAM — JUMP THE SHOCKWAVE':'TRIPLE ROAR — DODGE OR BLOCK';text(label,640,167,18,'#fff1c5','center');ctx.save();ctx.strokeStyle='#ffe19b';ctx.lineWidth=3;ctx.setLineDash([9,8]);if(boss.type==='claw')ctx.strokeRect(boss.target-100,GROUND-175,200,175);else if(boss.type==='slam')ctx.strokeRect(boss.x-165,GROUND-35,330,35);else line([[boss.x,GROUND-240],[boss.target,GROUND-100]],'#ffd891',3);ctx.restore()}

// Styrodog's authored whole-body animation. Walking follows actual travel distance.
function dogMotionPose(){
 if(mode==='victory')return ending<.13?6:ending<.32?7:ending<.56?8:9;
 if(boss.hitstun>0)return boss.dogHeavy&&boss.hitstun>(boss.dogHitDuration||.22)*.4?6:5;
 if(boss.state==='warn')return boss.type==='claw'?10:boss.type==='slam'?12:15;
 if(boss.state==='attack'){
  if(boss.type==='claw')return boss.timer>.44?10:boss.timer>.15?11:10;
  if(boss.type==='slam')return boss.timer>.54?13:14;
  return 15;
 }
 if(boss.state==='recover')return boss.type==='slam'&&boss.timer>.8?14:boss.type==='claw'&&boss.timer>.8?10:4;
 return boss.dogMoving?Math.floor((boss.dogStride||0)*4)%4:4;
}

function dogMotionSprite(pose,x,feet,dir){
 if(!dogMotionSheet.complete||!dogMotionSheet.width)return;
 const f=dogMotionFrames.frames[pose],s=350/dogMotionFrames.referenceHeight;
 ctx.save();ctx.translate(x,feet);ctx.scale(-dir*s,s);
 ctx.drawImage(dogMotionSheet,...f.rect,-f.anchor[0],-f.anchor[1],f.rect[2],f.rect[3]);ctx.restore();
}

function updateStyrodog(dt){
 const oldX=boss.x,wasWalking=boss.state==='idle'&&boss.hitstun<=0;
 updateStyrodogLogic(dt);
 const distance=Math.abs(boss.x-oldX);
 boss.dogMoving=wasWalking&&boss.state==='idle'&&distance>1e-6;
 if(boss.dogMoving){
  const previous=Math.floor((boss.dogStride||0)*2);
  boss.dogStride=((boss.dogStride||0)+distance/100)%1000;
  boss.dogFacing=hero.x>boss.x?1:-1;
  if(Math.floor(boss.dogStride*2)!==previous){combatSound('ground',.12,'foam');burst(boss.x,GROUND-3,3,'#eee7d0');}
 }
 if(boss.hitstun<=0&&boss.state==='idle')boss.dogFacing=hero.x>boss.x?1:-1;
}

function drawStyrodog(){
 const dead=mode==='victory',pose=dogMotionPose(),dir=dead?(boss.dogDeathFacing||-1):boss.hitstun>0?(boss.dogHitFacing||-1):boss.state==='idle'?(boss.dogFacing||-1):(boss.dir||-1);
 let lift=0;if(!dead&&boss.hitstun<=0&&boss.state==='attack'&&boss.type==='slam'&&boss.timer>.54)lift=-Math.sin(clamp((.95-boss.timer)/.41,0,1)*Math.PI)*48;
 // Breathing stays rooted at the feet; no scaling, rotation or disappearing limbs.
 dogMotionSprite(pose,boss.x,GROUND+lift,dir);
 if(dead){
  if(ending>=.32&&ending<.95){const q=(ending-.32)/.63;for(let i=0;i<12;i++){const dx=Math.sin(i*7.1)*(25+q*110),dy=-Math.sin(q*Math.PI)*(12+i%4*8);foamChunk(boss.x+dx,GROUND-4+dy,3+(i%3),i+ending*5);}}
  return;
 }
 if(boss.hitstun>0){for(let i=0;i<5;i++){const q=1-boss.hitstun/(boss.dogHitDuration||.22);foamChunk(boss.x-dir*(40+q*35)+Math.sin(i*7)*25,GROUND-190+i*24-q*18,3,i+t);}return;}
 if(boss.state==='attack'&&boss.type==='claw'&&boss.timer<.44&&boss.timer>.16){for(let j=0;j<3;j++){ctx.strokeStyle='#fff6d4cc';ctx.lineWidth=4;ctx.beginPath();ctx.arc(boss.x+dir*180,GROUND-165,50+j*14,dir<0?2.4:-.7,dir<0?4:1);ctx.stroke();}}
 if(boss.type==='roar'&&(boss.state==='warn'||boss.state==='attack')){for(let j=0;j<3;j++){const mx=boss.x+dir*(j===1?20:90),my=GROUND-245+(j-1)*23;ctx.strokeStyle='#ffeabd88';ctx.lineWidth=2;ctx.beginPath();ctx.arc(mx,my,15+((t*50+j*10)%35),dir<0?2.4:-.7,dir<0?3.8:.7);ctx.stroke();}}
}
