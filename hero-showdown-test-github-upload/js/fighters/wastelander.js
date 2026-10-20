'use strict';
// Classic-script module: shares the original game bindings.

function wasteArt(pose,x,feet,h=330,dir=-1,alpha=1,angle=0){const r=wasteRects[pose],w=h*r[2]/r[3];ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,feet);ctx.rotate(angle);ctx.scale(-dir,1);if(pose===0){ctx.beginPath();ctx.moveTo(-w/2,-h);ctx.lineTo(w*.30,-h);ctx.lineTo(w*.30,-h*.45);ctx.lineTo(w/2,-h*.45);ctx.lineTo(w/2,0);ctx.lineTo(-w/2,0);ctx.closePath();ctx.clip();}ctx.drawImage(wasteAtlas,...r,-w/2,-h,w,h);ctx.restore();}

function wasteImpact(x,y){wasteBursts.push({x,y,life:.34});burst(x,y,18,'#bcb99b');}

function updateWastelander(dt){for(const e of wasteBursts)e.life-=dt;wasteBursts=wasteBursts.filter(e=>e.life>0);
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

function drawWastelander(){const dir=boss.dir||(hero.x>boss.x?1:-1);if(mode==='victory'){wasteArt(0,boss.x,GROUND+55,320,dir,Math.max(.15,1-ending*.25),dir*clamp(ending,0,1)*.65);return;}
 for(const p of wastePools){const grow=clamp(p.age/.35,0,1),fade=Math.min(1,p.life/.5);wasteArt(5,p.x,GROUND+12,105*grow,-1,fade);}
 let pose=0,x=boss.x,y=GROUND,angle=Math.sin(t*3)*.006;
 if(boss.state==='attack'){pose=boss.type==='trash'?1:boss.type==='acid'?2:3;if(pose===3){x+=dir*45;const swing=clamp((.85-boss.timer)/.45,0,1);y-=Math.sin(swing*Math.PI)*32;angle=-dir*(1-swing)*.24;}}
 else if(boss.state==='warn'&&boss.type==='mallet'){pose=3;x-=dir*20;y-=18;angle=-dir*.22;}
 wasteArt(pose,x,y,340,dir,1,angle);
 for(const p of wasteShots)wasteArt(4,p.x,p.y+29,58,p.dir,1,p.spin);
 for(const e of wasteBursts){const size=70+(1-e.life/.34)*75;wasteArt(6,e.x,e.y+size/2,size,-1,Math.min(1,e.life/.14));}
}
