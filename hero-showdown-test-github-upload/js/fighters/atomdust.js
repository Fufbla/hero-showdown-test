'use strict';
// Classic-script module: shares the original game bindings.

function resetAtom(){atom={hits:0,disperse:0,smokeCd:0,capCd:0,clouds:[],caps:[],cycle:0,walk:0,move:0,jump:0,pose:'idle',poseTime:0,recoil:0,cough:0,slow:false};}

function atomHash(i){const q=Math.sin(i*127.1+311.7)*43758.5453;return q-Math.floor(q);}

function atomTryDodge(){
 if(opponent!==6||!atom)return false;
 if(atom.disperse>0)return true;
 atom.hits++;
 if(atom.hits<4)return false;
 atom.hits=0;atom.disperse=.6;atom.dodgeUntil=t+.6;atom.pose='disperse';atom.poseTime=0;
 boss.state='disperse';hitStop=0;boss.hitstun=0;boss.vx=0;boss.jump=0;boss.struck=true;
 banner='DISPERSE!';bannerTime=.6;combatSound('whoosh',1.1);return true;
}

function atomSmokeContains(c,x,y){const age=4-c.life,r=45+145*Math.min(1,age/.65);return Math.abs(x-c.x)<r&&y>GROUND-225&&y<GROUND+15;}

function atomSlowFactor(){return opponent===6&&atom&&atom.clouds.some(c=>c.life>0&&atomSmokeContains(c,hero.x,hero.y-115))?.5:1;}

function atomInhalation(d){
 // Inhalation bypasses blocking and contact invulnerability, without cancelling attacks.
 if(mode!=='fight'||d<=0)return;hero.hp=Math.max(0,hero.hp-d);
 if(hero.hp<=0)finish(false);
}

function atomCapSound(){
 combatSound('whoosh',.5);if(!ac||muted||combatVoiceCount>=18)return;
 if(!atomCapSound.buffer){const rate=ac.sampleRate||44100,b=ac.createBuffer(1,Math.ceil(rate*.12),rate),a=b.getChannelData(0);for(let i=0;i<a.length;i++){const s=i/rate;a[i]=(.28*Math.sin(s*2*Math.PI*880)+.16*Math.sin(s*2*Math.PI*1437)+.09*Math.sin(s*2*Math.PI*2273))*Math.exp(-s*48)*Math.min(1,s/.002);}atomCapSound.buffer=b;}
 const s=ac.createBufferSource(),g=ac.createGain();s.buffer=atomCapSound.buffer;s.playbackRate.value=.94+Math.random()*.12;g.gain.value=.36;s.connect(g);g.connect(master);combatVoiceCount++;s.onended=()=>{combatVoiceCount--;s.disconnect();g.disconnect()};s.start();
}

function atomLaunchSmoke(){
 if(!atom||atom.smokeCd>1e-7||atom.disperse>0)return false;
 const a=atomHand('front'),b=atomHand('back');
 atom.clouds.push({x:(a.x+b.x)/2,origin:(a.x+b.x)/2,y:GROUND-145,dir:boss.dir,life:4,from:[a,b]});
 atom.smokeCd=10;combatSound('wind',.85,'smoke');return true;
}

function atomLaunchCap(){
 const a=atomHand('front');atom.caps.push({x:a.x,y:a.y,oldX:a.x,vx:boss.dir*520,dir:boss.dir,life:2.6,spin:0,color:boss.volley%3});atomCapSound();
}

function atomStartAttack(type){
 if(atom.disperse>0||boss.hitstun>0)return false;
 if(type==='smoke'&&atom.smokeCd>1e-7||type==='caps'&&atom.capCd>1e-7)return false;
 boss.dir=hero.x>=boss.x?1:-1;boss.type=type;boss.state='warn';boss.timer=type==='smoke'?.78:type==='caps'?.65:type==='jumpkick'?.82:.57;
 boss.target=hero.x;boss.startX=boss.x;boss.struck=false;boss.volley=0;atom.poseTime=0;return true;
}

function updateAtomEffects(dt){
 if(!atom)return;atom.cough=Math.max(0,atom.cough-dt);atom.recoil=Math.max(0,atom.recoil-dt);
 let exposure=0;
 for(const c of atom.clouds){const active=Math.min(dt,Math.max(0,c.life));const age=4-c.life;c.x=c.origin+c.dir*80*Math.min(.9,age);if(atomSmokeContains(c,hero.x,hero.y-115))exposure=Math.max(exposure,active);c.life=Math.max(0,c.life-dt);}
 atom.clouds=atom.clouds.filter(c=>c.life>1e-8);atom.slow=atomSlowFactor()<1;
 if(exposure>0){atomInhalation(100*.02*exposure);if(atom.cough<=0){atom.cough=.85;effects.push({type:'atomCough',x:hero.x,y:hero.y-heroes[selected].height+35,life:.20,max:.20});}}
 for(const p of atom.caps){p.oldX=p.x;p.x+=p.vx*dt;p.spin+=dt*26;p.life-=dt;
  const min=Math.min(p.oldX,p.x)-12,max=Math.max(p.oldX,p.x)+12;
  if(max>hero.x-28&&min<hero.x+28&&p.y>hero.y-heroes[selected].height+22&&p.y<hero.y-8){
   if(hitHero(6,p.oldX)){hero.inv=Math.min(hero.inv,.10);combatSound('armor',.55);}
   p.life=0;burst(p.x,p.y,5,'#e3e9d3');
  }
 }
 atom.caps=atom.caps.filter(p=>p.life>0&&p.x>-35&&p.x<W+35);
}

function updateAtom(dt){
 if(!atom)return;
 atom.smokeCd=Math.max(0,atom.smokeCd-dt);atom.capCd=Math.max(0,atom.capCd-dt);atom.poseTime+=dt;
 updateAtomEffects(dt);if(mode!=='fight')return;
 if(atom.disperse>0){atom.disperse=Math.max(0,atom.dodgeUntil-t);if(atom.disperse<1e-8){atom.disperse=0;boss.state='recover';boss.timer=.15;boss.cd=.25;}return;}
 if(boss.hitstun>0)return;
 const before=boss.x;
 if(boss.state==='idle'){
  boss.dir=hero.x>boss.x?1:-1;const gap=Math.abs(hero.x-boss.x);
  if(gap>205)boss.x=clamp(boss.x+boss.dir*(phase===3?115:90)*dt,190,1090);
  boss.cd-=dt;
  if(boss.cd<=0){atom.cycle++;let type=gap<240?(atom.cycle%2?'punch':'kick'):'caps';
   if(atom.smokeCd<=0&&atom.cycle%3===0)type='smoke';
   else if(atom.capCd<=0&&gap>280)type='caps';
   else if(type==='caps'&&atom.capCd>0)type=phase>=2?'jumpkick':'punch';
   atomStartAttack(type);
  }
 }else if(boss.state==='warn'){
  boss.timer-=dt;if(boss.timer<=0){boss.state='attack';atom.poseTime=0;boss.timer=boss.type==='smoke'?.86:boss.type==='caps'?.90:boss.type==='jumpkick'?.8:.55;boss.duration=boss.timer;boss.struck=false;boss.volley=0;}
 }else if(boss.state==='attack'){
  boss.timer-=dt;const age=boss.duration-boss.timer;
  if(boss.type==='smoke'&&!boss.struck&&age>=.18){boss.struck=true;atomLaunchSmoke();}
  else if(boss.type==='caps'){
   if(age>=.14&&boss.volley===0){if(atom.capCd<=1e-7){atom.capCd=5;boss.volley=1;atomLaunchCap();}else boss.volley=3;}
   if(age>=.30&&boss.volley===1){boss.volley=2;atomLaunchCap();}
   if(age>=.46&&boss.volley===2){boss.volley=3;atomLaunchCap();}
  }else if(['punch','kick','jumpkick'].includes(boss.type)){
   const jumping=boss.type==='jumpkick';boss.jump=jumping?Math.sin(Math.min(1,age/.8)*Math.PI)*85:0;
   if(age<.24)boss.x=clamp(boss.x+boss.dir*(jumping?260:130)*dt,190,1090);
   const impact=jumping?.35:.22;
   if(!boss.struck&&age>=impact){boss.struck=true;const p=atomHand(boss.type==='punch'?'front':'foot');
    if(Math.abs(hero.x-p.x)<70&&p.y>hero.y-heroes[selected].height+20&&p.y<hero.y+10)hitHero(boss.type==='punch'?12:17,boss.x);
    else combatSound('whoosh',.65);
   }
  }
  if(boss.timer<=0){boss.state='recover';boss.timer=phase===3?.6:.82;boss.jump=0;}
 }else if(boss.state==='recover'){
  boss.timer-=dt;if(boss.timer<=0){boss.state='idle';boss.cd=phase===3?.25:.55;}
 }
 atom.move=(boss.x-before)/dt;atom.walk+=(boss.x-before)*(boss.dir||-1)/125;
}

function atomSkeleton(){
 const J={};for(const [k,v]of Object.entries(atomRig.joints))J[k]=[v[0],v[1]];
 if(!boss||!atom)return J;
 const moving=boss.state==='idle'&&Math.abs(atom.move)>5,w=moving?Math.sin(atom.walk*Math.PI*2):0;
 const bob=moving?-Math.abs(Math.sin(atom.walk*Math.PI*4))*5:Math.sin(t*2.4)*2;
 for(const k of ['hip','neck','head','bs','fs','be','fe','bh','fh','bl','fl'])J[k][1]+=bob;
 if(moving){J.bf[0]+=w*35;J.ff[0]-=w*35;J.bf[1]-=Math.max(0,w)*24;J.ff[1]-=Math.max(0,-w)*24;J.bk[0]+=w*16;J.fk[0]-=w*16;J.bh[0]-=w*18;J.fh[0]+=w*18;}
 let push=0;
 if(boss.state==='warn'){const a=1-clamp(boss.timer/(boss.type==='smoke'?.78:.65),0,1);J.fh[0]-=a*70;J.fh[1]-=a*85;J.fe[0]-=a*40;J.bh[1]-=a*35;}
 if(boss.state==='attack'){
  const age=boss.duration-boss.timer;
  const pulse=(start,end,peak)=>age<start?0:age<peak?(age-start)/(peak-start):age<end?1-(age-peak)/(end-peak):0;
  if(boss.type==='punch'){push=Math.max(0,pulse(0,.55,.22));J.fh=[470+push*150,325-push*50];J.fe=[395+push*92,275-push*60];J.fs[0]+=push*18;J.neck[0]+=push*14;}
  if(boss.type==='kick'||boss.type==='jumpkick'){const q=Math.max(0,pulse(0,boss.duration,boss.type==='kick'?.22:.35));J.fk=[410+q*12,540-q*240];J.ff=[425+q*210,700-q*(boss.type==='jumpkick'?230:360)];J.hip[0]-=q*28;J.neck[0]-=q*40;J.fh[0]-=q*45;}
  if(boss.type==='smoke'){const q=Math.min(1,age/.18)*Math.min(1,boss.timer/.2);J.fh=[470+q*100,325-q*160];J.fe=[395+q*85,275-q*75];J.bh=[140+q*385,305-q*105];J.be=[75+q*260,245-q*10];J.bs[0]+=q*35;}
  if(boss.type==='caps'){const q=Math.min(1,age/.14)*Math.min(1,boss.timer/.20),recoil=Math.exp(-((age-.14)% .16)*25)*8;J.fh=[470+q*(100-recoil),325-q*50];J.fe=[395+q*75,275-q*80];}
  const prep=Math.max(0,1-age/.16);J.fh[0]-=prep*70;J.fh[1]-=prep*85;J.fe[0]-=prep*40;J.bh[1]-=prep*35;
 }
 if(boss.hitstun>0){const q=Math.min(1,boss.hitstun/.14);for(const k of ['neck','head','bs','fs','be','fe','bh','fh'])J[k][0]-=q*25;}
 return J;
}

function atomHand(which){const J=atomSkeleton(),p=J[which==='back'?'bh':which==='foot'?'ff':'fh'],s=atomRig.scale,dir=boss.dir||(hero.x>boss.x?1:-1);return {x:boss.x+dir*(p[0]-atomRig.root[0])*s,y:GROUND-(boss.jump||0)+(p[1]-atomRig.root[1])*s};}

function drawAtom(){
 if(!atomImage.complete||!atomImage.width||!boss)return;
 const J=atomSkeleton(),s=atomRig.scale,dir=boss.dir||(hero.x>boss.x?1:-1),dead=mode==='victory';
 const age=atom?.disperse>0?.6-atom.disperse:0,spread=atom?.disperse>0?(age<.16?Math.sin(age/.16*Math.PI/2):age<.31?1:Math.cos((age-.31)/.29*Math.PI/2)):0;
 const collapse=dead?clamp(ending/.95,0,1):0;
 ctx.save();ctx.translate(boss.x,GROUND-(boss.jump||0));ctx.scale(dir,1);
 for(let i=0;i<atomRig.parts.length;i++){
  const p=atomRig.parts[i],[a,b]=atomRig.bones[p.bone],A=atomRig.joints[a],B=atomRig.joints[b],C=J[a],D=J[b];
  const angle=Math.atan2(D[1]-C[1],D[0]-C[0])-Math.atan2(B[1]-A[1],B[0]-A[0]),co=Math.cos(angle),si=Math.sin(angle),dx=p.c[0]-A[0],dy=p.c[1]-A[1];
  const len=Math.hypot(B[0]-A[0],B[1]-A[1]),u=(dx*(B[0]-A[0])+dy*(B[1]-A[1]))/(len*len),n=(-dx*(B[1]-A[1])+dy*(B[0]-A[0]))/len,newLen=Math.max(1,Math.hypot(D[0]-C[0],D[1]-C[1]));
  let x=(C[0]+u*(D[0]-C[0])-n*(D[1]-C[1])/newLen-atomRig.root[0])*s,y=(C[1]+u*(D[1]-C[1])+n*(D[0]-C[0])/newLen-atomRig.root[1])*s,rot=angle;
  const hash=atomHash(i),theta=hash*Math.PI*2+spread*age*8;
  if(spread>0){x+=(Math.cos(theta)*(175+atomHash(i+17)*100)-x)*spread;y+=(-170+Math.sin(theta)*(130+atomHash(i+9)*60)-y)*spread;rot+=Math.sin(theta)*spread*4;}
  else if(collapse>0){const q=1-(1-collapse)**2;x+=(Math.cos(theta)*(25+hash*110)-x)*q;y+=(-3-atomHash(i+23)*15-y)*q;rot+=q*theta;}
  else {x+=Math.sin(t*3+theta)*.3;y+=Math.cos(t*2.5+theta)*.3;rot+=Math.sin(t*2+theta)*.002;if(boss.hitstun>0){x+=Math.cos(theta)*atom.recoil*25;y+=Math.sin(theta)*atom.recoil*15;}}
  ctx.save();ctx.translate(x,y);ctx.rotate(rot);const [sx,sy,sw,sh]=p.r,blend=Math.min(1,Math.max(spread,collapse)*7);
  if(blend<1){ctx.globalAlpha=1-blend;ctx.drawImage(atomImage,sx,sy,sw,sh,-sw*s/2,-sh*s/2,sw*s,sh*s);}
  if(blend>0&&i%2===0){ctx.globalAlpha=blend;const cell=i%8,size=10+hash*13;ctx.drawImage(atomDebris,(cell%4)*128,Math.floor(cell/4)*128,128,128,-size/2,-size/2,size,size);}
  ctx.restore();
 }
 ctx.restore();
}

function drawAtomEffects(){
 if(!atom)return;
 for(const c of atom.clouds){const age=4-c.life,r=45+145*Math.min(1,age/.65),fade=Math.min(1,c.life/.65);ctx.save();
  // Two clearly anchored streams from both extended hands feed the expanding cloud.
  if(age<.65&&boss.state==='attack'&&boss.type==='smoke'){for(const hand of [atomHand('front'),atomHand('back')])for(let j=0;j<6;j++){const q=j/5;ctx.save();ctx.globalAlpha=.45*fade;const width=35+q*35;ctx.translate(hand.x+(c.x-hand.x)*q,hand.y+(c.y-hand.y)*q);ctx.rotate(Math.atan2(c.y-hand.y,c.x-hand.x));ctx.drawImage(atomSmoke,-width/2,-width/6,width,width/3);ctx.restore();}}
  for(let j=0;j<3;j++){const width=r*(1.8+j*.08),xx=c.x+Math.sin(age*1.8+j)*8,yy=GROUND-85-j*43+Math.sin(age*2+j)*6;ctx.save();ctx.globalAlpha=(j===1?.43:.31)*fade;ctx.translate(xx,yy);ctx.scale(j%2?-1:1,1);ctx.drawImage(atomSmoke,-width/2,-width/6,width,width/3);ctx.restore();}
  for(let j=0;j<15;j++){const q=atomHash(j+4);ellipse(c.x+(q-.5)*r*1.6,GROUND-60-((age*35+j*17)%130),1.5,1,'#39343088');}
  ctx.strokeStyle=`rgba(255,186,96,${.5*fade})`;ctx.lineWidth=2;ctx.setLineDash([7,9]);ctx.beginPath();ctx.ellipse(c.x,GROUND-3,r,9,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);text('TOXIC SMOKE',c.x,GROUND+24,12,'#f4d9a8','center');ctx.restore();
 }
 for(const p of atom.caps){ctx.save();ctx.translate(p.x,p.y);for(let j=1;j<=4;j++){ctx.globalAlpha=.14*(1-j/5);drawAtomCap(-p.dir*j*13,0,p.spin-j*.3,p.color);}ctx.globalAlpha=1;drawAtomCap(0,0,p.spin,p.color);ctx.restore();}
 for(const e of effects)if(e.type==='atomCough'){ctx.save();ctx.globalAlpha=e.life/e.max;for(let j=0;j<3;j++)smokePuff(hero.x+hero.face*(35+j*9),hero.y-heroes[selected].height+48-j*4,12+j*4,.4,j);ctx.restore();}
}

function drawAtomCap(x,y,spin,color){ctx.save();ctx.translate(x,y);ctx.rotate(spin);ctx.scale(1,.65+.35*Math.abs(Math.cos(spin)));ctx.drawImage(atomDebris,(color%4)*128,128,128,128,-18,-18,36,36);ctx.strokeStyle='#fff8df';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-12,-6);ctx.lineTo(-4,-12);ctx.stroke();ctx.restore();}

function atomWarning(){if(!boss||!atom)return;if(boss.state==='warn'){text(boss.type==='smoke'?'TOXIC SMOKE — MOVE CLEAR: DAMAGE + SLOW':boss.type==='caps'?'THREE SHARP CAPS — JUMP OR BLOCK':boss.type==='punch'?'DEBRIS PUNCH — BLOCK OR DODGE':'SCATTER KICK — BLOCK OR MOVE CLEAR',640,165,17,'#fff1c2','center');}if(atom.disperse>0)text('DISPERSED',boss.x,GROUND-360,17,'#ffcb83','center');}

function atomHud(){if(opponent!==6||!atom||mode==='title')return;rect(901,126,350,35,'#122632dc');text('DISPERSE',914,149,11,'#ffdaa2');for(let i=0;i<4;i++){ellipse(1004+i*19,143,6,6,i<atom.hits?'#ffb259':'#405258');}text(atom.disperse>0?'REFORMING':atom.hits===3?'DODGE READY':'EVERY FOURTH HIT',1239,149,10,'#fff2ca','right');if(atom.slow&&mode==='fight'){rect(28,215,225,31,'#222b21e5');text('TOXIC: −50% SPEED • −2% HP/s',39,236,11,'#ffcf8c');}}
