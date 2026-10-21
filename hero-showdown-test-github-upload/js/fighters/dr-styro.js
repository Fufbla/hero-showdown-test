'use strict';
// Classic-script module: shares the original game bindings.

function styroArt(pose,x,feet,h=310,dir=-1,alpha=1,angle=0,sx=1,sy=1){const r=styroRects[pose],w=h*r[2]/r[3];ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,feet);ctx.rotate(angle);ctx.scale(-dir*sx,sy);if(pose===1){ctx.beginPath();ctx.moveTo(-w/2,-h);ctx.lineTo(w*.33,-h);ctx.lineTo(w*.33,-h*.37);ctx.lineTo(w/2,-h*.37);ctx.lineTo(w/2,0);ctx.lineTo(-w/2,0);ctx.closePath();ctx.clip();}ctx.drawImage(styroAtlas,...r,-w/2,-h,w,h);ctx.restore();}

function styroBurst(x,y){styroFoam(x,y,12);styroBursts.push({x,y,life:.32});burst(x,y,14,'#fff6e8');}

// Visual state belongs to this fighter; simulation and damage windows stay unchanged.
function styroEase(q){q=clamp(q,0,1);return q*q*(3-2*q);}
function styroFoam(x,y,n=4){
 const v=boss.styroVisual;if(!v)return;
 for(let i=0;i<n&&v.foam.length<90;i++)v.foam.push({x,y,vx:(Math.random()-.5)*150,vy:-35-Math.random()*130,life:.5+Math.random()*.4,size:2+Math.random()*5,spin:Math.random()*6});
}
function styroHit(dir,heavy){
 boss.styroRecoil=heavy?1:.65;boss.styroHitDir=dir;
 styroFoam(boss.x-dir*70,GROUND-160,heavy?16:9);
}
function updateDrStyroLogic(dt){
 const v=boss.styroVisual||(boss.styroVisual={lastX:boss.x,stride:0,speed:0,clock:0,foam:[]});
 const dx=boss.x-v.lastX;v.lastX=boss.x;
 v.speed+=(Math.abs(dx)/Math.max(dt,.001)-v.speed)*(1-Math.exp(-12*dt));
 v.stride+=Math.abs(dx)*.065;v.clock+=dt;
 boss.styroRecoil=Math.max(0,(boss.styroRecoil||0)-dt*3.8);
 if(v.speed>25&&v.clock>.085){v.clock=0;styroFoam(boss.x,GROUND-8,2);}
 for(const f of v.foam){f.life-=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=310*dt;f.spin+=dt*4;}
 v.foam=v.foam.filter(f=>f.life>0);

 for(const e of styroBursts)e.life-=dt;styroBursts=styroBursts.filter(e=>e.life>0);
 if(boss.hitstun>0){}else if(boss.state==='idle'){boss.cd-=dt;boss.dir=hero.x>boss.x?1:-1;if(Math.abs(hero.x-boss.x)>260)boss.x=clamp(boss.x+boss.dir*(phase===1?70:95)*dt,210,1070);if(boss.cd<=0){boss.count++;boss.type=phase>=2&&boss.count%3===0?'double':boss.count%2===0?'spikes':'crush';boss.dir=hero.x>boss.x?1:-1;boss.target=clamp(hero.x,180,1100);boss.startX=boss.x;boss.state='warn';boss.timer=boss.type==='double'?1.45:boss.type==='spikes'?1:.85;boss.struck=false;boss.volley=0;combatSound('foam',.75);}}
 else if(boss.state==='warn'){boss.timer-=dt;if(boss.timer<=0){boss.state='attack';boss.timer=boss.type==='double'?1.1:boss.type==='spikes'?1.4:.7;combatSound('whoosh',.8);}}
 else if(boss.state==='attack'){boss.timer-=dt;
 if(boss.type==='crush'){const q=styroEase((.7-boss.timer)/.3);boss.x=clamp(boss.startX+(boss.target-boss.dir*170-boss.startX)*q,190,1090);if(!boss.struck&&boss.timer<=.38){boss.struck=true;const x=boss.x+boss.dir*150;styroBurst(x,GROUND-160);if(Math.abs(hero.x-x)<95&&hero.y>GROUND-190)hitHero(18,boss.x);else combatSound('whoosh',.6);}}
 if(boss.type==='spikes'){const n=Math.floor((1.4-boss.timer)/.34);if(n>boss.volley&&n<=3){boss.volley=n;const x=boss.x+boss.dir*105,y=GROUND-185;styroSpikes.push({x,y,dir:boss.dir,vx:boss.dir*(360+phase*35),life:3});styroBurst(x,y);combatSound('foam',.55);}}
 if(boss.type==='double'&&!boss.struck&&boss.timer<=.42){boss.struck=true;styroBurst(boss.target-45,GROUND-160);styroBurst(boss.target+45,GROUND-160);shake=14;/* Two simultaneous 18-damage fists resolve as one 36-damage contact, respecting block/invulnerability. */if(Math.abs(hero.x-boss.target)<120&&hero.y>GROUND-195)hitHero(36,boss.x);else combatSound('whoosh',1.2);}
 if(boss.timer<=0){boss.state='recover';boss.timer=boss.type==='double'?1.65:1.15;}}
 else if(boss.state==='recover'){boss.timer-=dt;if(boss.timer<=0){boss.state='idle';boss.cd=phase===1?1:.65;}}
 for(const p of styroSpikes){p.x+=p.vx*dt;p.life-=dt;if(Math.abs(hero.x-p.x)<48&&p.y>hero.y-heroes[selected].height+35&&p.y<hero.y){hitHero(12,p.x-p.dir*60);p.life=0;styroBurst(p.x,p.y);}}
 styroSpikes=styroSpikes.filter(p=>p.life>0&&p.x>-90&&p.x<W+90);
}

function styroWarning(){if(boss.state!=='warn')return;const split=boss.type==='double';text(split?'DOUBLE TROUBLE — TWO FISTS, DOUBLE DAMAGE!':boss.type==='spikes'?'STYRO SPIKES — JUMP OR BLOCK':'FOAM CRUSH — DODGE OR BLOCK',640,164,18,'#fff1ce','center');if(boss.type!=='spikes'){ctx.save();ctx.strokeStyle='#ffbd6c';ctx.lineWidth=3;ctx.setLineDash([9,6]);ctx.strokeRect(boss.target-(split?120:95),GROUND-195,split?240:190,190);ctx.restore();}else{ctx.save();ctx.strokeStyle='#ffe8b6';ctx.setLineDash([10,9]);ctx.beginPath();ctx.moveTo(boss.x+boss.dir*105,GROUND-185);ctx.lineTo(boss.dir<0?30:1250,GROUND-185);ctx.stroke();ctx.restore();}}


// Dr. Styro: authored poses, with travel-driven footfalls and a held final fall.
const styroMotionSheet=new Image();styroMotionSheet.src='assets/images/styro-motion-sheet.webp';
const styroMotionFrames=[
 [8,12,300,307,157,295],[345,12,264,307,135,295],
 [636,12,294,307,148,295],[974,12,270,307,139,295],
 [8,321,310,306,156,299],[341,321,284,306,142,299],
 [649,372,275,255,140,248],[970,337,276,290,143,283],
 [12,630,305,289,155,277],[327,676,300,243,153,231],
 [627,744,306,175,153,163],[934,784,320,135,160,123],
 [12,928,291,292,148,285]
];
function styroMotionSprite(pose,x,feet,dir,lean=0){
 if(!styroMotionSheet.complete||!styroMotionSheet.naturalWidth){styroArt(0,x,feet,320,dir);return;}
 const f=styroMotionFrames[pose],scale=320/285;
 ctx.save();ctx.translate(x,feet);ctx.scale(-dir*scale,scale);ctx.rotate(lean);
 ctx.drawImage(styroMotionSheet,f[0],f[1],f[2],f[3],-f[4],-f[5],f[2],f[3]);ctx.restore();
}
function updateDrStyro(dt){
 const oldX=boss.x,walking=boss.state==='idle'&&boss.hitstun<=0;
 boss.styroReact=Math.max(0,(boss.styroReact||0)-dt);
 updateDrStyroLogic(dt);
 const distance=Math.abs(boss.x-oldX);
 boss.styroMoving=walking&&boss.state==='idle'&&distance>1e-6;
 if(boss.styroMoving){
  const step=Math.floor((boss.styroStride||0)*2);
  boss.styroStride=((boss.styroStride||0)+distance/96)%1000;
  if(Math.floor(boss.styroStride*2)!==step){combatSound('ground',.12,'foam');burst(boss.x,GROUND-2,3,'#f4eddf');}
 }
}
function styroBody(x,dir){
 if(boss.styroReact>0&&!boss.styroMoving){
  const q=1-boss.styroReact/(boss.styroReactDuration||.38);
  const pose=q<.48?(boss.styroHeavy?6:5):7;
  styroMotionSprite(pose,x,GROUND,dir,Math.sin(q*Math.PI)*(boss.styroHeavy?.045:-.035));return;
 }
 if(boss.state==='idle'){
  const stride=(boss.styroStride||0)*Math.PI*2;
  const pose=boss.styroMoving?Math.floor((boss.styroStride||0)*4)%4:4;
  styroMotionSprite(pose,x,GROUND,dir,boss.styroMoving?Math.sin(stride)*.012:Math.sin(t*3)*.004);return;
 }
 if(boss.state==='warn'){styroMotionSprite(12,x,GROUND,dir,-.015);return;}
 if(boss.state==='recover'){
  const duration=boss.type==='double'?1.65:1.15;
  styroMotionSprite(boss.timer>duration-.24?7:4,x,GROUND,dir);return;
 }
 // Retain the original special-attack artwork and contact timings.
 if(boss.type==='spikes'){styroArt(2,x,GROUND,320,dir);return;}
 const duration=boss.type==='double'?1.1:.7;
 const age=duration-boss.timer;
 if(age<.12)styroMotionSprite(12,x,GROUND,dir);
 else if(boss.timer<.16)styroMotionSprite(7,x,GROUND,dir);
 else styroArt(1,x,GROUND,320,dir);
}

function drawDrStyro(){
 const dir=mode==='victory'?(boss.styroDeathFacing||-1):boss.styroReact>0?(boss.styroHitFacing||-1):(boss.dir||(hero.x>boss.x?1:-1));
 if(mode==='victory'){
  const pose=ending<.16?8:ending<.38?9:ending<.62?10:11;
  const drift=-dir*20*Math.min(1,ending/.62);
  styroMotionSprite(pose,boss.x+drift,GROUND,dir);
  if(ending>.36&&ending<1.05){const q=(ending-.36)/.69;for(let i=0;i<10;i++)foamChunk(boss.x+drift+Math.sin(i*7.1)*(30+q*110),GROUND-3-Math.sin(q*Math.PI)*(12+i%4*7),3+i%3,i+q*4);}
  return;
 }
 const split=boss.type==='double'&&(boss.state==='warn'||boss.state==='attack'||boss.state==='recover');
 if(split){
  const q=boss.state==='warn'?clamp((1.45-boss.timer)/.7,0,1):1;
  let center=boss.startX+(boss.target-boss.startX)*q;
  let spread=boss.state==='attack'?175-65*clamp((1.1-boss.timer)/.6,0,1):175*q;
  if(boss.state==='recover'){const merge=clamp((1.65-boss.timer)/.65,0,1);center+=(boss.x-center)*merge;spread=110*(1-merge);}
  if(spread<2)styroBody(center,dir);
  else{styroBody(clamp(center-spread,160,1120),1);styroBody(clamp(center+spread,160,1120),-1);}
 }else styroBody(boss.x,dir);
 for(const p of styroSpikes)styroArt(4,p.x,p.y+23,46,p.dir);
 for(const e of styroBursts){const size=70+(1-e.life/.32)*75;styroArt(5,e.x,e.y+size/2,size,-1,Math.min(1,e.life/.12));}
 for(const f of boss.styroVisual?.foam||[]){ctx.save();ctx.globalAlpha=Math.min(1,f.life*3);ctx.translate(f.x,f.y);ctx.rotate(f.spin);rect(-f.size/2,-f.size/2,f.size,f.size,'#fff6e8');ctx.restore();}
}
