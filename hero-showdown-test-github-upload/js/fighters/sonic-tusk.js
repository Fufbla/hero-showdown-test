'use strict';
// Classic-script module: shares the original game bindings.

function sonicSprite(pose,x,y,height=300,dir=-1,alpha=1,angle=0){if(!sonicAtlas.complete||!sonicAtlas.width)return;const r=[[0,0,670,600],[700,0,630,600],[0,610,680,572],[680,650,650,532]][pose];const w=height*r[2]/r[3];ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle);ctx.scale(dir===-1?1:-1,1);ctx.drawImage(sonicAtlas,...r,-w/2,-height,w,height);ctx.restore()}

function sonicOrigin(){const dir=(boss.state==='warn'||boss.state==='attack')?boss.dir:(hero.x>boss.x?1:-1);return {dir,x:boss.x+dir*112,y:GROUND-188}}

function soundCone(x,y,length,height,dir,alpha=1){if(!sonicFX.complete||!sonicFX.width)return;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(dir===-1?1:-1,1);ctx.drawImage(sonicFX,-length,-height*.57,length,height);ctx.restore()}

function resonantRing(x,y,rx,ry,alpha=1){ctx.save();ctx.globalAlpha=alpha;ctx.shadowColor='#b65cff';ctx.shadowBlur=15;for(let i=0;i<3;i++){ctx.strokeStyle=['#a842ec','#e0a1ff','#fff1ff'][i];ctx.lineWidth=[7,4,1.5][i];ctx.beginPath();ctx.ellipse(x,y,rx+i*3,ry+i*2,0,0,Math.PI*2);ctx.stroke()}ctx.shadowBlur=0;ctx.restore()}

function drawSonic(){const a=sonicOrigin(),defeated=mode==='victory';const dir=defeated?(boss.sonicDeathFacing||-1):boss.hitstun>0?(boss.sonicHitFacing||-1):a.dir;sonicMotionSprite(sonicMotionPose(),boss.x,GROUND,dir);if(defeated)return;
if(boss.state==='warn'){const dur=boss.type==='blast'?1.35:boss.type==='stomp'?1:.9,q=clamp(1-boss.timer/dur,0,1);for(let j=0;j<3;j++)resonantRing(a.x,a.y,8+q*15+j*5,12+q*24+j*6,.12+q*.17);for(let j=0;j<9;j++){const angle=j*Math.PI*2/9+t*2,r=68*(1-q)+15;ellipse(a.x+Math.cos(angle)*r,a.y+Math.sin(angle)*r,2,2,'#ecc5ff')}if(boss.type==='stomp')resonantRing(boss.x,GROUND-8,50+q*45,12,.4)}
if(boss.state==='attack'&&boss.type==='blast'){const grow=clamp((1.3-boss.timer)/.3,0,1),fade=clamp(boss.timer/.2,0,1),length=650*grow;soundCone(a.x,a.y,length,205*(.96+Math.sin(t*15)*.035),a.dir,.7*fade);for(let j=0;j<7;j++){const d=((t*280+j*90)%650);if(d<length)resonantRing(a.x+a.dir*d,a.y,10+d*.025,16+d*.10,.45*fade)}resonantRing(a.x,a.y,12,20,.85)}
for(const w of soundWaves){if(w.kind==='bass'){soundCone(w.x-w.dir*120,GROUND-24,145,78,w.dir,.75);resonantRing(w.x,GROUND-24,16,29,.7)}else{soundCone(w.x-w.dir*145,w.y,170,126,w.dir,.8);resonantRing(w.x,w.y,17,54,.7)}}}

function sonicWarning(){if(boss.state!=='warn')return;const a=sonicOrigin();text(boss.type==='pulse'?'SONIC PULSE — JUMP OR BLOCK':boss.type==='stomp'?'BASS STOMP — JUMP THE LOW WAVES':'HORN BLAST — DOUBLE JUMP OR BLOCK',640,167,18,'#f1c4ff','center');ctx.save();ctx.strokeStyle='#dca7ff';ctx.lineWidth=2;ctx.setLineDash([10,8]);if(boss.type==='stomp'){ctx.strokeRect(50,GROUND-50,1180,50)}else{ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x+a.dir*650,a.y);ctx.stroke()}ctx.restore()}

function updateSonicLogic(dt){if(boss.hitstun>0){}else if(boss.state==='idle'){boss.cd-=dt;let dx=hero.x-boss.x;if(Math.abs(dx)>430)boss.x=clamp(boss.x+Math.sign(dx)*55*dt,155,1125);if(boss.cd<=0){boss.count++;boss.type=phase===3&&boss.count%3===0?'blast':phase>=2&&boss.count%2===0?'stomp':'pulse';boss.dir=hero.x>boss.x?1:-1;boss.state='warn';boss.timer=boss.type==='blast'?1.35:boss.type==='stomp'?1:.9;tone(90,.25,'triangle',.22,180)}}else if(boss.state==='warn'){boss.timer-=dt;if(boss.timer<=0){boss.state='attack';boss.timer=boss.type==='blast'?1.3:boss.type==='stomp'?.85:.75;boss.struck=false;tone(120,.35,'triangle',.26,55);noise(.14,.12)}}else if(boss.state==='attack'){boss.timer-=dt;const a=sonicOrigin();if(boss.type==='pulse'&&!boss.struck&&boss.timer<=.56){boss.struck=true;soundWaves.push({kind:'pulse',x:a.x,y:a.y,dir:a.dir,life:3.3,hit:false});burst(a.x,a.y,10,'#dca5ff')}if(boss.type==='stomp'&&!boss.struck&&boss.timer<=.5){boss.struck=true;shake=10;for(const dir of [-1,1])soundWaves.push({kind:'bass',x:boss.x,y:GROUND-24,dir,life:3.5,hit:false});burst(boss.x,GROUND-10,22,'#cda3fb');combatSound('ground',1.1,'armor')}if(boss.type==='blast'){let length=650*clamp((1.3-boss.timer)/.3,0,1),dx=(hero.x-a.x)*a.dir;if(dx>0&&dx<length&&hero.y>a.y-65&&hero.y-heroes[selected].height+40<a.y+65)hitHero(10,boss.x);if(!boss.struck){boss.struck=true;tone(85,.7,'triangle',.25,60)}}if(boss.timer<=0){boss.state='recover';boss.timer=boss.type==='blast'?1.5:1.15}}else if(boss.state==='recover'){boss.timer-=dt;if(boss.timer<=0){boss.state='idle';boss.cd=phase===1?1:.65}}for(const w of soundWaves){w.x+=w.dir*(w.kind==='bass'?320:370)*dt;w.life-=dt;const intersects=w.kind==='bass'?hero.y>GROUND-65:hero.y>w.y-48&&hero.y-heroes[selected].height+40<w.y+48;if(!w.hit&&Math.abs(hero.x-w.x)<38&&intersects){hitHero(w.kind==='bass'?13:14,w.x-w.dir*30);w.hit=true;burst(hero.x,w.y,9,'#dca5ff')}}soundWaves=soundWaves.filter(w=>w.life>0&&w.x>-170&&w.x<W+170)}

function sonicMotionPose(){
 if(mode==='victory')return ending<.14?6:ending<.34?7:ending<.62?8:9;
 if(boss.hitstun>0)return boss.sonicHeavy&&boss.hitstun>(boss.sonicHitDuration||.22)*.4?6:5;
 if(boss.state==='warn')return boss.type==='stomp'?12:10;
 if(boss.state==='attack')return boss.type==='stomp'?(boss.timer>.5?13:14):boss.type==='blast'?15:boss.timer>.56?10:11;
 if(boss.state==='recover')return boss.timer>.8?(boss.type==='stomp'?14:10):4;
 return boss.sonicMoving?Math.floor((boss.sonicStride||0)*4)%4:4;
}

function sonicMotionSprite(pose,x,y,dir){if(!sonicMotionSheet.complete||!sonicMotionSheet.width)return;const f=sonicMotionFrames.frames[pose],s=300/sonicMotionFrames.referenceHeight;ctx.save();ctx.translate(x,y);ctx.scale(-dir*s,s);ctx.drawImage(sonicMotionSheet,...f.rect,-f.anchor[0],-f.anchor[1],f.rect[2],f.rect[3]);ctx.restore();}

function updateSonic(dt){const x=boss.x,walking=boss.state==='idle'&&boss.hitstun<=0;updateSonicLogic(dt);const distance=Math.abs(boss.x-x);boss.sonicMoving=walking&&boss.state==='idle'&&distance>1e-6;if(boss.sonicMoving){const prev=Math.floor((boss.sonicStride||0)*2);boss.sonicStride=((boss.sonicStride||0)+distance/90)%1000;if(Math.floor(boss.sonicStride*2)!==prev)combatSound('ground',.12,'armor');}if(boss.state==='idle'&&boss.hitstun<=0)boss.sonicFacing=hero.x>boss.x?1:-1;}
