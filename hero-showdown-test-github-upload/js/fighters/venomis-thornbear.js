'use strict';
// Classic-script module: shares the original game bindings.

function venomPart(r,x,feet,w,h,dir=1,alpha=1,angle=0){if(!venomAtlas.complete||!venomAtlas.width)return;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,feet);ctx.rotate(angle);ctx.scale(dir,1);ctx.drawImage(venomAtlas,...r,-w/2,-h,w,h);ctx.restore()}

function venomFigure(r,x,y,h,dir,angle=0){const w=h*r[2]/r[3];ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(-dir,1);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(venomHD,...r,-w/2,-h,w,h);ctx.restore()}

function drawVenomis(){const dir=mode==='victory'?(boss.venomDeathFacing||-1):boss.hitstun>0?(boss.venomHitFacing||-1):(boss.dir||(hero.x>boss.x?1:-1)),dead=mode==='victory';const trainerX=Number.isFinite(boss.trainerX)?boss.trainerX:clamp(boss.x-dir*245,125,1135);ellipse(trainerX,GROUND-17,60,8,'#1c2e3444');venomMotionSprite(trainerMotionSheet,trainerMotionFrames,trainerMotionPose(),trainerX,GROUND-20,282,dead?dir:(boss.trainerDir||dir));venomMotionSprite(bearMotionSheet,bearMotionFrames,bearMotionPose(),boss.x,GROUND,310,dir);if(dead)return;
if(boss.state==='warn'){const handX=trainerX+dir*100,handY=GROUND-210;line([[handX,handY],[boss.x-dir*60,GROUND-260]],'#b3fd6b77',2);ellipse(handX,handY,5,5,'#c4ff91')}
if(boss.type==='swipe'&&boss.state==='attack'&&boss.timer<.43&&boss.timer>.12){venomPart([8,886,112,128],boss.x+dir*180,GROUND-30,195,215,dir,clamp(boss.timer/.25,0,1));}
for(const p of plantShots){venomPart([434,886,88,69],p.x,p.y+24,83,58,p.dir);for(let j=0;j<3;j++)ellipse(p.x-p.dir*(25+j*10),p.y,3-j*.6,3-j*.6,'#a6ed6055')}
for(const v of vines){if(v.age<.7){ctx.strokeStyle='#cefc7b';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(v.x,GROUND-5,57,10,0,0,Math.PI*2);ctx.stroke()}else{const grow=clamp((v.age-.7)/.25,0,1);venomPart([320,887,106,123],v.x,GROUND,114,170*grow,1,clamp((2.6-v.age)/.4,0,1));}}}

function venomWarning(){if(boss.state!=='warn')return;text(boss.type==='swipe'?'CLAW SWIPE — JUMP OR BLOCK':boss.type==='seeds'?'FLYTRAP SHOTS — DODGE OR BLOCK':'VINE SNARE — MOVE OFF THE MARKS',640,167,18,'#d5ff9c','center');if(boss.type==='swipe'){ctx.strokeStyle='#bce986';ctx.lineWidth=3;ctx.setLineDash([8,7]);ctx.strokeRect(boss.target-100,GROUND-160,200,160);ctx.setLineDash([])}}

function updateVenomisLogic(dt){if(boss.hitstun>0){}else if(boss.state==='idle'){boss.dir=hero.x>boss.x?1:-1;boss.cd-=dt;if(Math.abs(hero.x-boss.x)>230)boss.x=clamp(boss.x+boss.dir*(phase===1?60:85)*dt,240,1040);if(boss.cd<=0){boss.count++;boss.type=phase===3&&boss.count%3===0?'vines':phase>=2&&boss.count%2===0?'seeds':'swipe';boss.target=clamp(hero.x,boss.x-280,boss.x+280);boss.startX=boss.x;boss.state='warn';boss.timer=boss.type==='vines'?1.1:.9;combatSound('vine',.6)}}else if(boss.state==='warn'){boss.timer-=dt;if(boss.timer<=0){boss.state='attack';boss.timer=boss.type==='swipe'?.7:1.35;boss.struck=false;boss.volley=0;noise(.15,.3)}}else if(boss.state==='attack'){boss.timer-=dt;if(boss.type==='swipe'){let q=clamp((.7-boss.timer)/.3,0,1);boss.x=clamp(boss.startX+(boss.target-boss.dir*180-boss.startX)*q,240,1040);if(!boss.struck&&boss.timer<=.4){boss.struck=true;if(Math.abs(hero.x-(boss.x+boss.dir*180))<100&&hero.y>GROUND-160)hitHero(phase===1?15:19,boss.x);burst(boss.x+boss.dir*180,GROUND-110,12,'#b7f478');noise(.1,.4)}}else if(boss.type==='seeds'){let volley=Math.floor((1.35-boss.timer)/.35);if(volley>boss.volley&&volley<=3){boss.volley=volley;let x=boss.x+boss.dir*110,y=GROUND-260;const dx=hero.x-x,dy=hero.y-110-y,len=Math.max(1,Math.hypot(dx,dy));plantShots.push({x,y,vx:dx/len*345,vy:dy/len*345,dir:boss.dir,life:3});burst(x,y,6,'#d7ff8a');combatSound('whoosh',.55)}}else if(!boss.struck){boss.struck=true;for(const x of [hero.x-135,hero.x,hero.x+135])vines.push({x:clamp(x,70,1210),age:0,hit:false});}if(boss.timer<=0){boss.state='recover';boss.timer=1.2}}else if(boss.state==='recover'){boss.timer-=dt;if(boss.timer<=0){boss.state='idle';boss.cd=phase===1?.9:.6}}
for(const p of plantShots){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(Math.abs(hero.x-p.x)<38&&p.y>hero.y-heroes[selected].height+35&&p.y<hero.y){hitHero(9,p.x-p.dir*30);p.life=0;burst(p.x,p.y,12,'#a7e765')}}plantShots=plantShots.filter(p=>p.life>0&&p.x>0&&p.x<W&&p.y<GROUND);for(const v of vines){v.age+=dt;if(v.age>.88&&!v.hit&&Math.abs(hero.x-v.x)<48&&hero.y>GROUND-140){hitHero(15,v.x,true);v.hit=true;}}vines=vines.filter(v=>v.age<2.6);}

function bearMotionPose(){
 if(mode==='victory')return ending<.14?6:ending<.35?7:ending<.65?8:9;
 if(boss.hitstun>0)return boss.venomHeavy&&boss.hitstun>(boss.venomHitDuration||.22)*.4?6:5;
 if(boss.state==='warn')return boss.type==='swipe'?10:boss.type==='seeds'?12:14;
 if(boss.state==='attack')return boss.type==='swipe'?(boss.timer>.4?10:11):boss.type==='seeds'?13:14;
 if(boss.state==='recover')return boss.timer>.75?15:4;
 return boss.bearMoving?Math.floor((boss.bearStride||0)*4)%4:4;
}

function trainerMotionPose(){if(mode==='victory')return ending<.35?4:7;if(boss.trainerMoving)return Math.floor((boss.trainerStride||0)*4)%4;if(boss.hitstun>0)return 4;return boss.state==='warn'||boss.state==='attack'?(boss.type==='vines'?6:5):4;}

function venomMotionSprite(sheet,frames,pose,x,y,height,dir){if(!sheet.complete||!sheet.width)return;const f=frames.frames[pose],s=height/frames.referenceHeight;ctx.save();ctx.translate(x,y);ctx.scale(-dir*s,s);ctx.drawImage(sheet,...f.rect,-f.anchor[0],-f.anchor[1],f.rect[2],f.rect[3]);ctx.restore();}

function updateVenomis(dt){const old=boss.x,walking=boss.state==='idle'&&boss.hitstun<=0;updateVenomisLogic(dt);const dx=boss.x-old;boss.bearMoving=walking&&boss.state==='idle'&&Math.abs(dx)>1e-6;if(boss.bearMoving){const foot=Math.floor((boss.bearStride||0)*2);boss.bearStride=((boss.bearStride||0)+Math.abs(dx)/105)%1000;if(Math.floor(boss.bearStride*2)!==foot)combatSound('ground',.13,'body');}const dir=boss.dir||(hero.x>boss.x?1:-1),target=clamp(boss.x-dir*245,125,1135);if(!Number.isFinite(boss.trainerX))boss.trainerX=target;const delta=target-boss.trainerX,step=Math.sign(delta)*Math.min(Math.abs(delta),190*dt);boss.trainerX+=step;boss.trainerMoving=Math.abs(step)>1e-5;if(boss.trainerMoving){boss.trainerStride=((boss.trainerStride||0)+Math.abs(step)/105)%1000;boss.trainerDir=Math.sign(step);}else boss.trainerDir=dir;}
