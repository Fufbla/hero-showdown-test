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
function updateDrStyro(dt){
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

// Cross-fade atlas poses and deform around planted feet for weight and follow-through.
function styroBody(pose,mix,x,feet,dir,lean=0,squash=0,alpha=1){
 const recoil=boss.styroRecoil||0;
 lean+=(boss.styroHitDir||0)*recoil*.12;
 const sx=1+squash+recoil*.05,sy=1-squash*.65-recoil*.04;
 if(pose&&mix<1)styroArt(0,x,feet,320,dir,alpha*(1-mix),lean,sx,sy);
 styroArt(pose,x,feet,320,dir,alpha*(pose?mix:1),lean,sx,sy);
}
function drawDrStyro(){
 const dir=boss.dir||(hero.x>boss.x?1:-1),dead=mode==='victory';
 if(dead){styroArt(3,boss.x,GROUND+20,280,dir,Math.max(.25,1-ending*.22),dir*.35);return;}
 const v=boss.styroVisual||{stride:0,speed:0,foam:[]};
 const moving=clamp(v.speed/80,0,1),step=Math.sin(v.stride);
 const breath=Math.sin(t*2.8),feet=GROUND-Math.abs(step)*5*moving;
 const split=boss.type==='double'&&['warn','attack','recover'].includes(boss.state);
 if(split){
  const attack=boss.state==='attack',recover=boss.state==='recover';
  const out=styroEase((1.45-boss.timer)/1.45),back=recover?styroEase(1-boss.timer/1.65):0;
  const travel=attack?1:recover?1-back:out;
  const center=boss.x+(boss.target-boss.x)*travel;
  const spread=attack?175-65*styroEase((1.1-boss.timer)/.68):recover?110*(1-back):175*out;
  const punch=attack?styroEase((1.1-boss.timer)/.68):recover?1-styroEase(back*2):0;
  // Both copies converge exactly on the real pushbox before returning to idle.
  const alpha=1;
  for(const side of [-1,1])styroBody(1,punch,clamp(center+side*spread,160,1120),GROUND,-side,-side*.1*punch,.025*Math.sin(travel*Math.PI),alpha);
 }else{
  let pose=0,mix=1,lean=dir*step*.018*moving,squash=breath*.008+Math.abs(step)*.012*moving;
  if(boss.state==='warn'){
   const q=styroEase(1-boss.timer/(boss.type==='spikes'?1:.85));
   lean=-dir*.09*q;squash=.055*q;
   if(boss.type==='spikes'){pose=2;mix=q*.7;}
  }else if(boss.state==='attack'){
   pose=boss.type==='spikes'?2:1;
   const elapsed=(pose===2?1.4:.7)-boss.timer;
   mix=styroEase(elapsed/.15);
   const force=pose===2?Math.sin(elapsed/.34*Math.PI)**2:Math.sin(Math.PI*clamp(elapsed/.5,0,1));
   lean=dir*.12*force;squash=-.035*force;
  }else if(boss.state==='recover'){
   const q=styroEase(1-boss.timer/1.15);pose=boss.type==='spikes'?2:1;mix=1-styroEase(q*2.5);
   lean=dir*.035*(1-q);squash=.035*Math.sin(q*Math.PI)*Math.exp(-q*2);
  }
  styroBody(pose,mix,boss.x,feet,dir,lean,squash);
 }
 for(const p of styroSpikes)styroArt(4,p.x,p.y+23,46,p.dir,1,Math.sin(t*20)*.045);
 for(const e of styroBursts){const size=70+(1-e.life/.32)*75;styroArt(5,e.x,e.y+size/2,size,-1,Math.min(1,e.life/.12));}
 for(const f of v.foam){ctx.save();ctx.globalAlpha=Math.min(1,f.life*3);ctx.translate(f.x,f.y);ctx.rotate(f.spin);rect(-f.size/2,-f.size/2,f.size,f.size,'#fff6e8');ctx.restore();}
}
