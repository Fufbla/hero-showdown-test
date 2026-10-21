'use strict';
// Classic-script module: shares the original game bindings.

function wasteArt(pose,x,feet,h=330,dir=-1,alpha=1,angle=0){const r=wasteRects[pose],w=h*r[2]/r[3];ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,feet);ctx.rotate(angle);ctx.scale(-dir,1);if(pose===0){ctx.beginPath();ctx.moveTo(-w/2,-h);ctx.lineTo(w*.30,-h);ctx.lineTo(w*.30,-h*.45);ctx.lineTo(w/2,-h*.45);ctx.lineTo(w/2,0);ctx.lineTo(-w/2,0);ctx.closePath();ctx.clip();}ctx.drawImage(wasteAtlas,...r,-w/2,-h,w,h);ctx.restore();}

function wasteImpact(x,y){wasteBursts.push({x,y,life:.34});burst(x,y,18,'#bcb99b');}

function updateWastelanderLogic(dt){for(const e of wasteBursts)e.life-=dt;wasteBursts=wasteBursts.filter(e=>e.life>0);
 if(boss.hitstun>0){}else if(boss.state==='idle'){boss.cd-=dt;boss.dir=hero.x>boss.x?1:-1;if(Math.abs(hero.x-boss.x)>300)boss.x=clamp(boss.x+boss.dir*(phase===1?48:70)*dt,250,1050);if(boss.cd<=0){boss.count++;boss.type=phase>=2&&boss.count%3===0?'acid':boss.count%2===0?'trash':'mallet';boss.dir=hero.x>boss.x?1:-1;boss.startX=boss.x;boss.target=boss.type==='acid'?boss.x+boss.dir*95:clamp(hero.x,160,1120);boss.state='warn';boss.timer=boss.type==='mallet'?1.15:1;boss.struck=false;boss.volley=0;combatSound('armor',.7);}}
 else if(boss.state==='warn'){boss.timer-=dt;if(boss.timer<=0){boss.state='attack';boss.timer=boss.type==='trash'?1.45:boss.type==='acid'?1.05:.85;combatSound('whoosh',.65);}}
 else if(boss.state==='attack'){boss.timer-=dt;
 if(boss.type==='mallet'){const q=clamp((.85-boss.timer)/.4,0,1);boss.x=clamp(boss.startX+(boss.target-boss.dir*195-boss.startX)*q,220,1080);if(!boss.struck&&boss.timer<=.4){boss.struck=true;const x=boss.x+boss.dir*195;wasteImpact(x,GROUND-35);shake=15;combatSound('ground',1.1,'armor');if(Math.abs(hero.x-x)<110&&hero.y>GROUND-145)hitHero(phase===3?26:22,boss.x);}}
 if(boss.type==='trash'){const n=Math.floor((1.45-boss.timer)/.36);if(n>boss.volley&&n<=(phase===3?3:2)){boss.volley=n;const x=boss.x+boss.dir*155,y=GROUND-218;wasteShots.push({x,y,dir:boss.dir,vx:boss.dir*(330+phase*30),life:3,spin:0});wasteImpact(x,y);combatSound('whoosh',.8);}}
 if(boss.type==='acid'&&!boss.struck&&boss.timer<=.65){boss.struck=true;wastePools.push({x:boss.x+boss.dir*95,life:5.2,age:0});combatSound('wind',.6);}
 if(boss.timer<=0){boss.state='recover';boss.timer=boss.type==='mallet'?1.4:1.15;}}
 else if(boss.state==='recover'){boss.timer-=dt;if(boss.timer<=0){boss.state='idle';boss.cd=phase===1?1.1:.7;}}
 for(const p of wasteShots){p.x+=p.vx*dt;p.spin+=dt*5;p.life-=dt;if(Math.abs(hero.x-p.x)<48&&p.y>hero.y-heroes[selected].height+30&&p.y<hero.y){hitHero(13,p.x-p.dir*60);p.life=0;wasteImpact(p.x,p.y);}}
 wasteShots=wasteShots.filter(p=>p.life>0&&p.x>-90&&p.x<W+90);
 for(const p of wastePools){p.age+=dt;p.life-=dt;if(p.age>.3&&Math.abs(hero.x-p.x)<100&&hero.y>GROUND-45)hitHero(5,p.x,true);}wastePools=wastePools.filter(p=>p.life>0);
}

function wasteWarning(){if(boss.state!=='warn')return;text(boss.type==='mallet'?'TRASH MALLET — JUMP OR MOVE CLEAR':boss.type==='acid'?'ACID SPILL — KEEP OFF THE GREEN': 'TRASH CANNON — JUMP OR BLOCK',640,164,18,'#fff1ce','center');ctx.save();ctx.strokeStyle=boss.type==='acid'?'#aaff65':'#ffc777';ctx.lineWidth=3;ctx.setLineDash([9,6]);if(boss.type==='trash'){ctx.beginPath();ctx.moveTo(boss.x+boss.dir*155,GROUND-218);ctx.lineTo(boss.dir<0?30:1250,GROUND-218);ctx.stroke();}else{ctx.strokeRect(boss.target-110,GROUND-(boss.type==='acid'?35:145),220,boss.type==='acid'?30:140);}ctx.restore();}


// Wastelander's authored walk, impact, attack and collapse poses.
const wasteMotionSheet=new Image();wasteMotionSheet.src='assets/images/waste-motion-sheet.webp';
const wasteMotionFrames=[[64, 15, 298, 249, 136, 247], [418, 16, 302, 247, 166, 245], [782, 16, 311, 248, 186, 246], [1193, 16, 305, 248, 159, 246], [53, 271, 297, 244, 147, 242], [435, 283, 270, 232, 149, 230], [769, 320, 343, 199, 199, 197], [1169, 271, 320, 249, 183, 247], [54, 523, 303, 215, 146, 213], [409, 549, 315, 198, 175, 196], [770, 566, 346, 192, 198, 190], [1140, 607, 376, 134, 212, 132], [77, 740, 295, 262, 163, 260], [389, 784, 380, 211, 245, 209], [788, 768, 340, 230, 218, 228], [1205, 756, 281, 244, 162, 242]];
function wasteMotionSprite(pose,x,feet,dir,lean=0){
 if(!wasteMotionSheet.complete||!wasteMotionSheet.naturalWidth){wasteArt(0,x,feet,340,dir);return;}
 const f=wasteMotionFrames[pose],scale=340/245;
 ctx.save();ctx.translate(x,feet);ctx.scale(-dir*scale,scale);ctx.rotate(lean);
 ctx.drawImage(wasteMotionSheet,f[0],f[1],f[2],f[3],-f[4],-f[5],f[2],f[3]);ctx.restore();
}
function updateWastelander(dt){
 const oldX=boss.x,walking=boss.state==='idle'&&boss.hitstun<=0;
 boss.wasteReact=Math.max(0,(boss.wasteReact||0)-dt);
 updateWastelanderLogic(dt);
 const distance=Math.abs(boss.x-oldX);
 boss.wasteMoving=walking&&boss.state==='idle'&&distance>1e-6;
 if(boss.wasteMoving){
  const step=Math.floor((boss.wasteStride||0)*2);
  boss.wasteStride=((boss.wasteStride||0)+distance/104)%1000;
  if(Math.floor(boss.wasteStride*2)!==step){combatSound('ground',.16,'armor');burst(boss.x,GROUND-2,3,'#bcb99b');}
 }
}
function wasteBody(){
 const dir=boss.wasteReact>0?(boss.wasteHitFacing||-1):(boss.dir||(hero.x>boss.x?1:-1));
 let pose=4,lean=0;
 if(boss.wasteReact>0&&!boss.wasteMoving){
  const q=1-boss.wasteReact/(boss.wasteReactDuration||.4);
  pose=q<.52?(boss.wasteHeavy?6:5):7;
  lean=Math.sin(q*Math.PI)*(boss.wasteHeavy?.025:-.03);
 }else if(boss.state==='idle'){
  pose=boss.wasteMoving?Math.floor((boss.wasteStride||0)*4)%4:4;
  lean=boss.wasteMoving?Math.sin((boss.wasteStride||0)*Math.PI*2)*.012:Math.sin(t*2.6)*.004;
 }else if(boss.state==='warn'){
  pose=boss.type==='mallet'?12:boss.type==='acid'?15:4;
  if(boss.type==='mallet')lean=-.025*clamp((1.15-boss.timer)/.35,0,1);
 }else if(boss.state==='attack'){
  if(boss.type==='mallet'){
   // Ground contact at timer .4 matches the existing damaging strike.
   pose=boss.timer>.4?12:13;
   lean=boss.timer>.4?clamp((.85-boss.timer)/.45,0,1)*-.12:0;
  }else if(boss.type==='trash'){
   const age=1.45-boss.timer,shotAge=age% .36;
   pose=age>=.36&&shotAge<.18?14:4;
   lean=pose===14?.025*Math.sin(shotAge/.18*Math.PI):0;
  }else{
   // Keep the original acid stream aligned with its existing puddle spawn.
   if(boss.timer<=.65&&boss.timer>.16){wasteArt(2,boss.x,GROUND,340,dir);return;}
   pose=15;
  }
 }else if(boss.state==='recover'){
  const duration=boss.type==='mallet'?1.4:1.15,age=duration-boss.timer;
  pose=boss.type==='mallet'&&age<.22?13:age<.6?7:4;
 }
 wasteMotionSprite(pose,boss.x,GROUND,dir,lean);
}
function drawWastelander(){
 if(mode==='victory'){
  const dir=boss.wasteDeathFacing||-1,pose=ending<.18?8:ending<.42?9:ending<.68?10:11;
  wasteMotionSprite(pose,boss.x-dir*16*clamp(ending/.68,0,1),GROUND,dir);
  if(ending>.42&&ending<1.1){const q=(ending-.42)/.68;ctx.save();ctx.globalAlpha=1-q;
   for(let i=0;i<10;i++){ctx.fillStyle=['#b9b5a4','#267ea1','#d7a63b'][i%3];const x=boss.x+Math.sin(i*7.1)*(25+q*135),y=GROUND-5-Math.sin(q*Math.PI)*(12+i%4*9);ctx.fillRect(x,y,5+i%3,4+i%4);}ctx.restore();}
  return;
 }
 for(const p of wastePools){const grow=clamp(p.age/.35,0,1),fade=Math.min(1,p.life/.5);wasteArt(5,p.x,GROUND+12,105*grow,-1,fade);}
 wasteBody();
 for(const p of wasteShots)wasteArt(4,p.x,p.y+29,58,p.dir,1,p.spin);
 for(const e of wasteBursts){const size=70+(1-e.life/.34)*75;wasteArt(6,e.x,e.y+size/2,size,-1,Math.min(1,e.life/.14));}
}
