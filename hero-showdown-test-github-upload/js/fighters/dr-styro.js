'use strict';
// Classic-script module: shares the original game bindings.

function styroArt(pose,x,feet,h=310,dir=-1,alpha=1,angle=0){const r=styroRects[pose],w=h*r[2]/r[3];ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,feet);ctx.rotate(angle);ctx.scale(-dir,1);if(pose===1){ctx.beginPath();ctx.moveTo(-w/2,-h);ctx.lineTo(w*.33,-h);ctx.lineTo(w*.33,-h*.37);ctx.lineTo(w/2,-h*.37);ctx.lineTo(w/2,0);ctx.lineTo(-w/2,0);ctx.closePath();ctx.clip();}ctx.drawImage(styroAtlas,...r,-w/2,-h,w,h);ctx.restore();}

function styroBurst(x,y){styroBursts.push({x,y,life:.32});burst(x,y,14,'#fff6e8');}

function updateDrStyro(dt){
 for(const e of styroBursts)e.life-=dt;styroBursts=styroBursts.filter(e=>e.life>0);
 if(boss.hitstun>0){}else if(boss.state==='idle'){boss.cd-=dt;boss.dir=hero.x>boss.x?1:-1;if(Math.abs(hero.x-boss.x)>260)boss.x=clamp(boss.x+boss.dir*(phase===1?70:95)*dt,210,1070);if(boss.cd<=0){boss.count++;boss.type=phase>=2&&boss.count%3===0?'double':boss.count%2===0?'spikes':'crush';boss.dir=hero.x>boss.x?1:-1;boss.target=clamp(hero.x,180,1100);boss.startX=boss.x;boss.state='warn';boss.timer=boss.type==='double'?1.45:boss.type==='spikes'?1:.85;boss.struck=false;boss.volley=0;combatSound('foam',.75);}}
 else if(boss.state==='warn'){boss.timer-=dt;if(boss.timer<=0){boss.state='attack';boss.timer=boss.type==='double'?1.1:boss.type==='spikes'?1.4:.7;combatSound('whoosh',.8);}}
 else if(boss.state==='attack'){boss.timer-=dt;
 if(boss.type==='crush'){const q=clamp((.7-boss.timer)/.3,0,1);boss.x=clamp(boss.startX+(boss.target-boss.dir*170-boss.startX)*q,190,1090);if(!boss.struck&&boss.timer<=.38){boss.struck=true;const x=boss.x+boss.dir*150;styroBurst(x,GROUND-160);if(Math.abs(hero.x-x)<95&&hero.y>GROUND-190)hitHero(18,boss.x);else combatSound('whoosh',.6);}}
 if(boss.type==='spikes'){const n=Math.floor((1.4-boss.timer)/.34);if(n>boss.volley&&n<=3){boss.volley=n;const x=boss.x+boss.dir*105,y=GROUND-185;styroSpikes.push({x,y,dir:boss.dir,vx:boss.dir*(360+phase*35),life:3});styroBurst(x,y);combatSound('foam',.55);}}
 if(boss.type==='double'&&!boss.struck&&boss.timer<=.42){boss.struck=true;styroBurst(boss.target-45,GROUND-160);styroBurst(boss.target+45,GROUND-160);shake=14;/* Two simultaneous 18-damage fists resolve as one 36-damage contact, respecting block/invulnerability. */if(Math.abs(hero.x-boss.target)<120&&hero.y>GROUND-195)hitHero(36,boss.x);else combatSound('whoosh',1.2);}
 if(boss.timer<=0){boss.state='recover';boss.timer=boss.type==='double'?1.65:1.15;}}
 else if(boss.state==='recover'){boss.timer-=dt;if(boss.timer<=0){boss.state='idle';boss.cd=phase===1?1:.65;}}
 for(const p of styroSpikes){p.x+=p.vx*dt;p.life-=dt;if(Math.abs(hero.x-p.x)<48&&p.y>hero.y-heroes[selected].height+35&&p.y<hero.y){hitHero(12,p.x-p.dir*60);p.life=0;styroBurst(p.x,p.y);}}
 styroSpikes=styroSpikes.filter(p=>p.life>0&&p.x>-90&&p.x<W+90);
}

function styroWarning(){if(boss.state!=='warn')return;const split=boss.type==='double';text(split?'DOUBLE TROUBLE — TWO FISTS, DOUBLE DAMAGE!':boss.type==='spikes'?'STYRO SPIKES — JUMP OR BLOCK':'FOAM CRUSH — DODGE OR BLOCK',640,164,18,'#fff1ce','center');if(boss.type!=='spikes'){ctx.save();ctx.strokeStyle='#ffbd6c';ctx.lineWidth=3;ctx.setLineDash([9,6]);ctx.strokeRect(boss.target-(split?120:95),GROUND-195,split?240:190,190);ctx.restore();}else{ctx.save();ctx.strokeStyle='#ffe8b6';ctx.setLineDash([10,9]);ctx.beginPath();ctx.moveTo(boss.x+boss.dir*105,GROUND-185);ctx.lineTo(boss.dir<0?30:1250,GROUND-185);ctx.stroke();ctx.restore();}}

function drawDrStyro(){const dir=boss.dir||(hero.x>boss.x?1:-1),dead=mode==='victory';if(dead){styroArt(3,boss.x,GROUND+20,280,dir,Math.max(.25,1-ending*.22),dir*.35);return;}
 const split=boss.type==='double'&&(boss.state==='warn'||boss.state==='attack'||boss.state==='recover');
 if(split){const attack=boss.state==='attack',q=boss.state==='warn'?clamp((1.45-boss.timer)/.7,0,1):1;const center=boss.startX+(boss.target-boss.startX)*q;const spread=attack?175-65*clamp((1.1-boss.timer)/.6,0,1):175*q;styroArt(attack?1:3,clamp(center-spread,160,1120),GROUND,310,1,1);styroArt(attack?1:3,clamp(center+spread,160,1120),GROUND,310,-1,1);}
 else{styroArt(boss.state==='attack'?(boss.type==='spikes'?2:1):0,boss.x,GROUND+Math.sin(t*4)*2,320,dir);}
 for(const p of styroSpikes){styroArt(4,p.x,p.y+23,46,p.dir);}
 for(const e of styroBursts){const size=70+(1-e.life/.32)*75;styroArt(5,e.x,e.y+size/2,size,-1,Math.min(1,e.life/.12));}
}
