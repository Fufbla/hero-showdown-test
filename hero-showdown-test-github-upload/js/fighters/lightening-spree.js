'use strict';
// Classic-script module: shares the original game bindings.

function resetSpree(){spree={hidden:0,until:0,destination:0,beams:[],rings:[],cycle:0,charge:0,aim:0,flash:0};}

function spreeInvisible(){return opponent===7&&spree&&spree.hidden>0;}

function spreeVanish(){
 if(!spree||mode!=='fight')return;
 const candidates=[];for(let x=190;x<=1090;x+=90)if(Math.abs(x-hero.x)>175&&Math.abs(x-boss.x)>130)candidates.push(x);
 spree.destination=candidates[Math.floor(Math.random()*candidates.length)]||clamp(hero.x+ (hero.x<W/2?300:-300),190,1090);
 spree.hidden=2;spree.until=t+2;boss.state='invisible';boss.vx=0;boss.hitstun=0;boss.pulse=0;boss.hitFlash=0;
 spree.rings.push({x:boss.x,y:GROUND-170,life:.35,max:.35});combatSound('whoosh',.7,'armor');
}

function spreeOrigin(type=boss.type){const dir=boss.dir||(hero.x>boss.x?1:-1);return {x:boss.x+dir*(type==='spark'?142:151),y:GROUND-(type==='spark'?229:248)};}

function spreeAttack(type){boss.type=type;boss.dir=hero.x>boss.x?1:-1;boss.state='warn';boss.timer=type==='spark'?1.05:.85;boss.duration=boss.timer;boss.struck=false;boss.volley=0;const a=spreeOrigin();spree.aim=Math.atan2(hero.y-125-a.y,hero.x-a.x);spree.charge=0;}

function spreeFire(spark=false,second=false){
 const a=spreeOrigin(),offsets=spark?[-.34,-.17,0,.17,.34]:[0];
 for(let i=0;i<offsets.length;i++){const angle=spree.aim+offsets[i]+(second?.07:0);spree.beams.push({x:a.x,y:a.y,angle,length:1450,life:spark?.29:.34,max:spark?.29:.34,width:spark?14:30,damage:spark?9:18,hit:false,hue:i});}
 spree.flash=.18;shake=Math.max(shake,spark?6:4);combatSound('wind',spark?1:.8);combatSound('armor',.4);duckMusic();
}

function spreeBeamHit(b){
 // Segment-versus-AABB slab test, expanded by the beam radius.
 const pad=b.width*.5,minX=hero.x-26-pad,maxX=hero.x+26+pad,minY=hero.y-heroes[selected].height+24-pad,maxY=hero.y-10+pad;
 const dx=Math.cos(b.angle)*b.length,dy=Math.sin(b.angle)*b.length;let lo=0,hi=1;
 for(const [p,d,min,max]of [[b.x,dx,minX,maxX],[b.y,dy,minY,maxY]]){if(Math.abs(d)<1e-8){if(p<min||p>max)return false;}else{let u=(min-p)/d,v=(max-p)/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);if(lo>hi)return false;}}
 return true;
}

function updateSpree(dt){
 if(!spree)return;spree.flash=Math.max(0,spree.flash-dt);
 for(const e of spree.rings)e.life-=dt;spree.rings=spree.rings.filter(e=>e.life>0);
 for(const b of spree.beams){b.life-=dt;if(b.life>0&&!b.hit&&spreeBeamHit(b)){b.hit=true;hitHero(b.damage,b.x);}}
 spree.beams=spree.beams.filter(b=>b.life>0);if(mode!=='fight')return;
 if(spree.hidden>0){spree.hidden=Math.max(0,spree.until-t);if(spree.hidden<1e-8){spree.hidden=0;boss.x=spree.destination;boss.dir=hero.x>boss.x?1:-1;spree.rings.push({x:boss.x,y:GROUND-170,life:.36,max:.36});spree.cycle++;spreeAttack(spree.cycle%2===0?'spark':'beam');}return;}
 if(boss.hitstun>0)return;
 if(boss.state==='idle'){boss.cd-=dt;if(boss.cd<=0)spreeVanish();}
 else if(boss.state==='warn'){boss.timer-=dt;spree.charge=clamp(1-boss.timer/boss.duration,0,1);if(boss.timer<=0){boss.state='attack';boss.timer=boss.type==='spark'?.78:.6;boss.duration=boss.timer;boss.struck=false;boss.volley=0;}}
 else if(boss.state==='attack'){
  boss.timer-=dt;const age=boss.duration-boss.timer;
  if(!boss.struck&&age>=.10){boss.struck=true;spreeFire(boss.type==='spark');}
  if(boss.type==='spark'&&phase===3&&boss.volley===0&&age>=.43){boss.volley=1;spreeFire(true,true);}
  if(boss.timer<=0){boss.state='recover';boss.timer=phase===3?.9:1.25;spree.charge=0;}
 }else if(boss.state==='recover'){boss.timer-=dt;if(boss.timer<=0){boss.state='idle';boss.cd=phase===3?.35:.65;}}
}

function spreeArt(pose,x,y,dir,alpha=1,angle=0){if(!spreeSheet.complete||!spreeSheet.width)return;const f=spreeFrames.frames[pose],s=350/spreeFrames.referenceHeight;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(dir*s,s);ctx.globalAlpha*=alpha;ctx.drawImage(spreeSheet,...f.rect,-f.anchor[0],-f.anchor[1],f.rect[2],f.rect[3]);ctx.restore();}

function drawSpree(){
 if(!boss||!spree)return;const dir=boss.dir||(hero.x>boss.x?1:-1);
 if(mode==='victory'){
  const q=clamp(ending/1.1,0,1);spreeArt(5,boss.x,GROUND+q*12,dir,1-q,dir*q*.25);
  for(let i=0;i<42;i++){const a=i*2.399,x=boss.x+Math.cos(a)*(25+q*100),y=GROUND-((1-q)*((i*23)%290)+5);ctx.save();ctx.translate(x,y);ctx.rotate(a+q*3);poly([[-5,-9],[7,-2],[3,8],[-4,3]],['#d8fbff','#fff0be','#d3caff'][i%3],'#ffffff99');ctx.restore();}return;
 }
 if(spree.hidden>0)return;
 let pose=0;if(boss.hitstun>0)pose=5;else if(boss.state==='warn')pose=boss.type==='spark'?3:1;else if(boss.state==='attack')pose=boss.type==='spark'?4:2;
 const recoil=boss.hitstun>0?-dir*Math.sin(boss.hitstun*18)*4:0;
 spreeArt(pose,boss.x+recoil,GROUND+(pose===0?Math.sin(t*2.4)*1.5:0),dir);
 // Small surface highlights remain confined to the body, without full-screen flashes.
 if(pose===0)for(let i=0;i<4;i++){const a=.25+.15*Math.sin(t*3+i*2),x=boss.x+dir*(Math.sin(i*9)*35),y=GROUND-110-i*48;ctx.save();ctx.globalAlpha=a;line([[x-4,y],[x+4,y]],'#fffadc',1);line([[x,y-6],[x,y+6]],'#e6fdff',1);ctx.restore();}
}

function drawSpreeEffects(){if(!spree||!boss)return;
 for(const e of spree.rings){const q=1-e.life/e.max;ctx.save();ctx.globalAlpha=(1-q)*.65;ctx.strokeStyle='#d3f7ff';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(e.x,e.y,35+q*105,90+q*80,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 if(spree.hidden>0){text('LIGHTENING SPREE IS INVISIBLE',640,165,16,'#e6f9ff','center');if(spree.hidden<.32){ctx.save();ctx.globalAlpha=1-spree.hidden/.32;ctx.strokeStyle='#ffe3a1';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(spree.destination,GROUND,70,10,0,0,Math.PI*2);ctx.stroke();ctx.restore();}return;}
 if(boss.state==='warn'){
  const a=spreeOrigin(),spark=boss.type==='spark';text(spark?'LIGHT SPARK — MULTIPLE BEAMS! JUMP OR BLOCK':'LIGHTENING BEAM — DODGE OR BLOCK',640,165,17,'#fff1ca','center');
  ctx.save();ctx.setLineDash([8,13]);ctx.lineWidth=1.5;ctx.strokeStyle='#fff0b788';
  for(const off of spark?[-.34,-.17,0,.17,.34]:[0]){const ang=spree.aim+off;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(a.x+Math.cos(ang)*1450,a.y+Math.sin(ang)*1450);ctx.stroke();}ctx.setLineDash([]);
  const glow=ctx.createRadialGradient(a.x,a.y,0,a.x,a.y,18+spree.charge*24);glow.addColorStop(0,'#fffdeabb');glow.addColorStop(.35,'#ffe09d66');glow.addColorStop(1,'#a8eaff00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(a.x,a.y,18+spree.charge*24,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 for(const b of spree.beams){const fade=Math.min(1,b.life/.10),endX=b.x+Math.cos(b.angle)*b.length,endY=b.y+Math.sin(b.angle)*b.length;ctx.save();ctx.globalAlpha=fade;ctx.lineCap='round';
  for(const [width,col]of [[b.width+20,'#a9ecff25'],[b.width+9,'#e6beff55'],[b.width,'#ffe5a9bb'],[b.width*.5,'#edfbff'],[Math.max(2,b.width*.18),'#ffffff']]){line([[b.x,b.y],[endX,endY]],col,width);}
  const normal=[-Math.sin(b.angle),Math.cos(b.angle)];for(let j=0;j<3;j++){const off=(j-1)*b.width*.32;line([[b.x+normal[0]*off,b.y+normal[1]*off],[endX+normal[0]*off,endY+normal[1]*off]],['#ff80cbaa','#b2ffb5bb','#7dcfffaa'][j],2);}
  ellipse(b.x,b.y,13+spree.flash*35,13+spree.flash*35,'#fff6d9');ctx.restore();
 }
}
function spreePortrait(){if(spreePortraitCache)return spreePortraitCache;const c=document.createElement('canvas');c.width=300;c.height=300;const g=c.getContext('2d'),f=spreeFrames.frames[0];g.drawImage(spreeSheet,...f.rect,58,0,184,300);return spreePortraitCache=c.toDataURL();}
