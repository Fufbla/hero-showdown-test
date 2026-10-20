'use strict';
// Classic-script module: shares the original game bindings.

function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h)}

function ellipse(x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2);ctx.fill()}

function line(points,c,width=3){ctx.strokeStyle=c;ctx.lineWidth=width;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.stroke()}

function text(s,x,y,size=20,c='#fff',align='left'){ctx.font=`900 ${size}px Arial`;ctx.textAlign=align;ctx.fillStyle=c;ctx.fillText(s,x,y)}

function poly(points,c,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=c;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.stroke()}}

function sprite(index,x,feet,height,face=1,angle=0,alpha=1){if(!loaded)return;let cr=index===3?[620,630,635,625]:heroes[index].crop;const sw=atlas.width/1255,sh=atlas.height/1255;ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,feet-height*.48);ctx.rotate(angle);ctx.scale(face,1);let width=height*cr[2]/cr[3];ctx.drawImage(atlas,cr[0]*sw,cr[1]*sh,cr[2]*sw,cr[3]*sh,-width/2,-height*.52,width,height);ctx.restore()}

function hitBoss(d,dir,gain=5,kind='special',contact){
 if(mode!=='fight'||boss.hp<=0||spreeInvisible())return;
 if(opponent===6){if(atomTryDodge())return false;atom.recoil=.18;}
 boss.hp=Math.max(0,boss.hp-d);boss.vx=dir*(kind==='kick'?260:selected===1?230:150);boss.pulse=.16;boss.hitFlash=.14;boss.hitstun=kind==='kick'?.22:.14;if(opponent===3){boss.venomHeavy=kind==='kick'||d>=20;boss.venomHitDuration=boss.hitstun;boss.venomHitFacing=boss.dir||(hero.x>boss.x?1:-1);boss.bearMoving=false;}if(opponent===2){boss.sonicHeavy=kind==='kick'||d>=20;boss.sonicHitDuration=boss.hitstun;boss.sonicHitFacing=boss.state==='idle'?(hero.x>boss.x?1:-1):(boss.dir||-1);boss.sonicMoving=false;}if(opponent===1){boss.dogHeavy=kind==='kick'||d>=20;boss.dogHitDuration=boss.hitstun;boss.dogHitFacing=boss.dogFacing||(hero.x>boss.x?1:-1);boss.dogMoving=false;}
 // Pause the existing attack state instead of erasing its warning and target.
 hero.power=clamp(hero.power+gain,0,100);combo=comboTime>0?combo+1:1;best=Math.max(best,combo);comboTime=1.7;
 shake=Math.max(shake,kind==='kick'?9:6);hitStop=Math.max(hitStop,kind==='kick'?.065:.04);
 const p=contact||{x:boss.x-dir*72,y:GROUND-160};effects.push({type:'impact',x:p.x,y:p.y,life:.18,max:.18,heavy:kind==='kick'||d>=20});burst(p.x,p.y,14,'#d8ff91');
 combatSound(gain===0?(selected===1?'heavy':selected===2?'punch':'wind'):kind==='kick'?'kick':selected===1?'heavy':'punch',gain===0?1.15:1,bossMaterial());if(!boss.hp)finish(true);
}

function hitHero(d,source,cloud=false){
 if(mode!=='fight'||hero.inv>0)return false;
 const blocking=hero.block&&!cloud&&Math.sign(source-hero.x)===hero.face;
 hero.hp=Math.max(0,hero.hp-d*(blocking?.18:1));hero.power=clamp(hero.power+(blocking?6:8),0,100);hero.inv=cloud?.5:.6;
 if(blocking){hero.guardStun=.16;hero.vx=(hero.x>source?1:-1)*75;effects.push({type:'guard',x:hero.x+hero.face*35,y:hero.y-150,life:.18,max:.18});combatSound('block',.9);hitStop=Math.max(hitStop,.025);}
 else{
  hero.pendingAttack=null;hero.anim=0;hero.buffer=null;hero.block=false;hero.special=0;hero.dash=null;directionTaps={};
  const push=hero.x>source?1:-1;hero.vx=push*(cloud?45:d>=20?420:260);hero.stun=cloud?.1:d>=20?.36:.24;hero.hitReact=hero.stun;
  if(d>=22&&!cloud&&hero.hp>0){hero.knockdown=.90;hero.vy=-210;hero.inv=Math.max(hero.inv,1.0);hero.fallLanded=false;}
  shake=Math.max(shake,cloud?2:d>=20?12:6);hitStop=Math.max(hitStop,cloud?.018:d>=20?.075:.045);
  effects.push({type:'impact',x:hero.x,y:hero.y-145,life:.14,max:.14,heavy:d>=20});burst(hero.x,hero.y-140,10,'#ffa55e');combatSound(cloud?'wind':d>=18?'heavy':'punch',cloud?.45:1,bossMaterial());
 }
 syncAnimation();if(!hero.hp)finish(false);return true;
}

function update(dt){
 if(!Number.isFinite(dt)||dt<=0)return;
 simulationRemainder+=dt;
 while(simulationRemainder+1e-9>=FIXED_STEP){simulationRemainder-=FIXED_STEP;updateStep(FIXED_STEP);}
}


function artPart(r,x,y,w,h,alpha=1,angle=0,flip=1){if(!finishAtlas.complete||!finishAtlas.width)return;ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,y);ctx.rotate(angle);ctx.scale(flip,1);ctx.drawImage(finishAtlas,...r,-w/2,-h/2,w,h);ctx.restore()}


function start(){audio();clearInput();hitStop=0;mode='fight';paused=false;simulationRemainder=0;hero={dash:null,dashCooldown:0,state:'idle',previousState:'idle',stateTime:0,guardStun:0,landing:0,buffer:null,stride:144,fallLanded:false,x:260,y:GROUND,vx:0,vy:0,jumps:0,walkCycle:0,idleTime:0,hitReact:0,knockdown:0,hp:100,power:35,face:1,cd:0,inv:0,anim:0,attack:'',special:0,specialTick:0,origin:0,block:false,stun:0};boss={x:950,vx:0,hitstun:0,hitFlash:0,hp:650,max:650,cd:2.1,state:'idle',timer:0,target:0,type:'',recovery:0,pulse:0,count:0};phase=1;resetAtom();resetSpree();styroSpikes=[];styroBursts=[];wasteShots=[];wastePools=[];wasteBursts=[];plantShots=[];vines=[];soundWaves=[];foamShots=[];shockwaves=[];shots=[];hazards=[];effects=[];particles=[];combo=0;best=0;comboTime=0;elapsed=0;ending=0;banner=opponent===6?'ATOMDUST — PARTICLE MENACE':'PROTECT THE BEACH!';bannerTime=2;shake=0;overlay.classList.add('hidden');document.getElementById('pause').textContent='PAUSE'}

function clearInput(){
 keys={};padHeld={};touchHeld={};directionTaps={};padAxisDirection=0;
 analogPointer=null;analogDirection=0;
 if(analogKnob)analogKnob.style.transform='translate(-50%,-50%)';
 document.querySelectorAll('.down').forEach(e=>e.classList.remove('down'));
}

function held(k){return !!(keys[k]||padHeld[k]||touchHeld[k])}

function burst(x,y,n,color){for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-240,240),vy:rand(-240,80),life:rand(.25,.6),color,r:rand(2,6)})}

function rectHit(ax,ay,aw,ah,bx,by,bw,bh){return ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by}

function finish(win){if(opponent===3&&boss)boss.venomDeathFacing=boss.venomHitFacing||boss.dir||-1;if(opponent===2&&boss)boss.sonicDeathFacing=boss.sonicHitFacing||boss.sonicFacing||boss.dir||-1;if(opponent===1&&boss)boss.dogDeathFacing=boss.dogHitFacing||boss.dogFacing||boss.dir||-1;mode=win?'victory':'defeat';hero.defeatY=hero.y;ending=0;fallSoundPlayed=false;hero.pendingAttack=null;hero.anim=0;hero.special=0;hero.block=false;hero.buffer=null;hero.dash=null;hero.vx=0;clearInput();if(atom){atom.clouds=[];atom.caps=[];atom.slow=false;atom.disperse=0;}if(spree){spree.beams=[];spree.hidden=0;spree.rings=[];}styroSpikes=[];styroBursts=[];wasteShots=[];wastePools=[];wasteBursts=[];plantShots=[];vines=[];soundWaves=[];foamShots=[];shockwaves=[];hazards=[];boss.state='idle';banner='';if(win){burst(boss.x,350,90,opponent===2?'#c8a3ff':opponent===1?'#fff5e1':'#9aa7ae');scoreTick()}else scoreTick()}

function updateStep(dt){
 if(paused)return;
 if(hitStop>0&&mode==='fight'){hitStop=Math.max(0,hitStop-dt);return;}
 t+=dt;
 if(mode==='victory'||mode==='defeat'){ending+=dt;if(!fallSoundPlayed&&ending>=(mode==='victory'&&opponent===3?.65:mode==='victory'&&opponent===2?.62:mode==='victory'&&opponent===1?.56:.38)){fallSoundPlayed=true;combatSound(mode==='defeat'?'fall':opponent===0?'wind':'fall',1.15,mode==='defeat'?'body':bossMaterial());}if(ending-dt<2.5&&ending>=2.5)result();}
 if(mode!=='fight'){advanceEffects(dt);for(const s of shots){s.life-=dt;s.x+=s.dir*430*dt;}shots=shots.filter(s=>s.life>0&&s.x>-180&&s.x<W+180);updateParticles(dt);return;}
 elapsed+=dt;music(dt);bannerTime=Math.max(0,bannerTime-dt);comboTime-=dt;boss.pulse=Math.max(0,boss.pulse-dt);shake=Math.max(0,shake-dt*25);
 boss.hitFlash=Math.max(0,boss.hitFlash-dt);
 if(boss.hitstun>0){boss.hitstun=Math.max(0,boss.hitstun-dt);const before=boss.x;boss.x=clamp(boss.x+boss.vx*dt,150,1120);if(Number.isFinite(boss.startX))boss.startX+=boss.x-before;boss.vx*=Math.exp(-7*dt);}
 stepHero(dt);if(mode!=='fight')return;stepSpecial(dt);if(mode!=='fight')return;
const newPhase=boss.hp/boss.max<.30?3:boss.hp/boss.max<.65?2:1;if(newPhase!==phase){phase=newPhase;banner='PHASE '+phase+' — '+(opponent===7?(phase===2?'PRISM SURGE':'SOLAR SCATTER'):opponent===6?(phase===2?'ASHEN ASSAULT':'PARTICLE FRENZY'):opponent===5?(phase===2?'TOXIC WASTELAND':'SCRAP RAMPAGE'):opponent===4?(phase===2?'SPLIT PERSONALITY':'DOUBLE TROUBLE'):opponent===3?(phase===2?'FERAL BLOOM':'VINE FRENZY'):opponent===2?(phase===2?'BASS SURGE':'MAXIMUM VOLUME'):opponent===1?(phase===2?'FOAM FURY':'TRIPLE ROAR'):(phase===2?'TOXIC TIDE':'SMOG STORM'));bannerTime=2;noise(.5,.6)}
if(opponent===7){updateSpree(dt)}else if(opponent===6){updateAtom(dt)}else if(opponent===5){updateWastelander(dt)}else if(opponent===4){updateDrStyro(dt)}else if(opponent===3){updateVenomis(dt)}else if(opponent===2){updateSonic(dt)}else if(opponent===1){updateStyrodog(dt);updateFoam(dt)}else{if(boss.hitstun>0){}else if(boss.state==='idle'){boss.cd-=dt;const distance=hero.x-boss.x;if(Math.abs(distance)>215)boss.x=clamp(boss.x+Math.sign(distance)*(phase===1?42:phase===2?66:83)*dt,150,1120);if(boss.cd<=0){boss.count++;boss.type=phase===3&&boss.count%3===0?'storm':phase>=2&&boss.count%2===0?'cloud':'punch';boss.state='warn';boss.timer=boss.type==='storm'?1.25:boss.type==='cloud'?1.1:phase===1?1.05:.78;boss.target=clamp(hero.x,120,1160);combatSound('wind',.55)}}else if(boss.state==='warn'){boss.timer-=dt;if(boss.timer<=0){boss.state='attack';boss.timer=boss.type==='storm'?1.65:boss.type==='cloud'?.8:.6;boss.struck=false;boss.stormTick=.52;noise(.35,.7);}}else if(boss.state==='attack'){boss.timer-=dt;if(boss.type==='cloud'&&!boss.struck&&boss.timer<=.20){boss.struck=true;hazards.push({x:boss.target,life:4.8,r:110});burst(boss.target,GROUND-20,20,'#94a65e')}if(boss.type==='punch'&&!boss.struck&&boss.timer<=.32){boss.struck=true;effects.push({type:'fist',x:boss.target,y:GROUND-110,life:.28,max:.28});if(Math.abs(hero.x-boss.target)<105&&hero.y>GROUND-145)hitHero(phase===1?14:18,boss.x)}if(boss.type==='storm'){boss.stormTick-=dt;if(boss.stormTick<=0){boss.stormTick=.52;for(let x of [boss.target-230,boss.target,boss.target+230]){effects.push({type:'fist',x,y:GROUND-110,life:.25,max:.25});if(Math.abs(hero.x-x)<70&&hero.y>GROUND-165)hitHero(15,boss.x)}}}if(boss.timer<=0){boss.state='recover';boss.timer=phase===1?1.2:.95}}
else if(boss.state==='recover'){boss.timer-=dt;if(boss.timer<=0){boss.state='idle';boss.cd=phase===1?1.1:phase===2?.7:.42}}
}
for(const s of shots){s.x+=s.dir*430*dt;s.life-=dt;s.hit-=dt;if(!spreeInvisible()&&Math.abs(s.x-boss.x)<135&&s.hit<=0){hitBoss(20,s.dir,0);s.hit=.18;boss.x=clamp(boss.x+s.dir*24,150,1120)}}shots=shots.filter(s=>s.life>0&&s.x>-100&&s.x<W+100);for(const h of hazards){h.life-=dt;if(Math.abs(hero.x-h.x)<h.r&&hero.y>GROUND-85)hitHero(4,h.x,true)}hazards=hazards.filter(h=>h.life>0);advanceEffects(dt);updateParticles(dt)}

function updateParticles(dt){for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=250*dt;p.life-=dt}particles=particles.filter(p=>p.life>0)}


function draw(){ctx.save();ctx.clearRect(0,0,W,H);if(shake>0&&mode==='fight'&&!paused)ctx.translate(Math.sin(t*90)*shake,Math.cos(t*73)*shake*.4);sky();let hx=hero?hero.x:300,hy=hero?hero.y:GROUND,bx=boss?boss.x:940;ellipse(hx,GROUND+3,90,12,'#675c424a');if(!spreeInvisible())ellipse(bx,GROUND+2,155,18,'#3f434d55');for(const h of hazards){for(let i=0;i<7;i++)smokePuff(h.x+(i-3)*29+Math.sin(t*2+i)*6,GROUND-25-Math.sin(t+i)*8,80,.5+Math.sin(t+i)*.06,i*.4);ellipse(h.x,GROUND-9,h.r,18,'#748d3a33');text('TOXIC',h.x,GROUND+26,13,'#30422c','center')}
if(opponent===6&&boss)atomWarning();if(opponent===5&&boss)wasteWarning();if(opponent===4&&boss)styroWarning();if(opponent===3&&boss)venomWarning();if(opponent===2&&boss)sonicWarning();if(opponent===1&&boss)dogWarning();if(!opponent&&boss&&boss.state==='warn'){let points=boss.type==='storm'?[boss.target-230,boss.target,boss.target+230]:[boss.target];for(const x of points){rect(x-(boss.type==='cloud'?110:80),GROUND-8,boss.type==='cloud'?220:160,12,Math.sin(t*20)>0?'#ffb25a':'#ef694c');ctx.strokeStyle='#ffc872';ctx.lineWidth=3;ctx.setLineDash([8,8]);ctx.strokeRect(x-80,GROUND-155,160,148);ctx.setLineDash([])}text(boss.type==='punch'?'SMOKE PUNCH — JUMP OR BLOCK':boss.type==='cloud'?'TOXIC CLOUD — MOVE CLEAR':'SMOG STORM — FIND THE GAPS',640,167,18,'#fff0be','center')}
let alpha=mode==='victory'?Math.max(0,1-ending/1.5):1;
if(opponent===7&&boss){drawSpree()}else if(opponent===6&&boss){drawAtom()}else if(opponent===5&&boss){drawWastelander()}else if(opponent===4&&boss){drawDrStyro()}else if(opponent===3&&boss){drawVenomis()}else if(opponent===2&&boss){drawSonic()}else if(opponent===1&&boss){drawStyrodog();drawFoam()}else{for(let i=0;i<13;i++){let xx=bx+Math.sin(i*2.8+t*.9)*(125+i*3),yy=GROUND-80-i*20;ellipse(xx,yy,25+Math.sin(t*2+i)*8,19,`rgba(34,42,53,${alpha*.28})`)}
if(boss&&boss.state==='attack'&&boss.type==='storm')rect(0,125,W,480,'#111a3344');sprite(3,bx+(boss&&boss.state==='attack'?Math.sin(t*22)*8:0),GROUND+8+Math.sin(t*2)*8,405,hero&&hero.x>bx?-1:1,boss&&boss.pulse>0?.025:0,alpha);
}
bossMotion();
for(const s of shots)tornado(s);
if(boss&&boss.hitFlash>0){ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=boss.hitFlash/.14*.32;ellipse(boss.x,GROUND-160,145,165,'#fff7cf');ctx.restore();}
let lean=hero&&hero.anim>0?(hero.attack==='kick'?-.13:.10)*hero.face:hero&&hero.stun>0?-.08:Math.sin(t*2)*.012;let celebration=mode==='victory'?Math.abs(Math.sin(ending*5))*20:0;let defeated=mode==='defeat';if(hero&&hero.special>0&&selected===2)for(let i=1;i<=3;i++)heroArt(selected,heroPose(),hx-i*hero.face*28,hy,hero.face,.10);
drawDashTrails();fighter(hx,hy,lean,celebration,defeated);drawHeroPower();
if(hero&&hero.block){ctx.strokeStyle='#9cf9e1';ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(hx+hero.face*45,hy-140,70,110,0,-1.5,1.5);ctx.stroke()}
for(const e of effects){ctx.save();if(e.type==='rockSmash'||e.type==='superPunch'){drawPowerEffect(e);ctx.restore();continue;}ctx.globalAlpha=e.life/e.max;if(e.type==='slash'){ctx.strokeStyle=e.kick?'#ffe17c':'#e1ffcf';ctx.lineWidth=e.kick?18:11;ctx.beginPath();ctx.ellipse(e.x,e.y,e.kick?100:65,50,e.dir*.25,-1.5,1.5);ctx.stroke();text(e.kick?'WHAM!':'POW!',e.x,e.y-35,24,'#fff1ac','center')}if(e.type==='wave'){let r=(1-e.life/e.max)*470;ctx.strokeStyle='#e6ff9b';ctx.lineWidth=12;ctx.beginPath();ctx.ellipse(e.x,e.y,r,38,0,0,Math.PI*2);ctx.stroke()}if(e.type==='fist'){ctx.strokeStyle='#d99b6277';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(e.x,e.y+75,30+(1-e.life/e.max)*65,8+(1-e.life/e.max)*16,0,0,Math.PI*2);ctx.stroke()}if(e.type==='impact'){const q=1-e.life/e.max;ctx.strokeStyle=e.heavy?'#fff3a1':'#ffffff';ctx.lineWidth=e.heavy?15:9;ctx.beginPath();ctx.arc(e.x,e.y,18+q*62,0,Math.PI*2);ctx.stroke();for(let j=0;j<6;j++){ctx.beginPath();ctx.moveTo(e.x+Math.cos(j)*25,e.y+Math.sin(j)*25);ctx.lineTo(e.x+Math.cos(j)*(45+q*55),e.y+Math.sin(j)*(45+q*55));ctx.stroke();}}if(e.type==='ghost')heroArt(selected,9,e.x,e.y,e.face||hero.face,.3);if(e.type==='guard'){ellipse(e.x,e.y,75,100,'#8ffce433')}ctx.restore()}
for(const p of particles)ellipse(p.x,p.y,p.r,p.r,p.color);if(mode==='victory'&&ending<2.5){for(let i=0;i<12;i++)line([[((t*600+i*150)%1500)-200,160+i*36],[((t*600+i*150)%1500),145+i*36]],'#d6ffee99',5)}
if(opponent===7)drawSpreeEffects();if(opponent===6)drawAtomEffects();drawEnvironmentForeground();hud();atomHud();ctx.restore()}
