'use strict';

// Separate Versus venue. Story's original rooftop and Toxic Harbor remain independent.
const tempestIndex=venueNames.length;
const tempestHazard=new HealthiaTempestCore.Hazard();
const tempestArt={background:new Image(),monster:new Image(),tornado:new Image()};
const tempestSources={background:'assets/tempest/rooftop.webp',monster:'assets/tempest/monster.webp',tornado:'assets/tempest/tornado.webp'};
const tempestRound={resolving:false,doubleKO:false,bossWillGuard:false,bossReactAt:0,guardSerial:-1,lastPhase:'idle'};
venueNames.push('STORM ROOFTOP');
const tempestThumbnail=new Image();tempestThumbnail.src='assets/tempest/preview.webp';venueImages.push(tempestThumbnail);

function tempestSelected(){return venue===tempestIndex&&!window.HealthiaStory?.active;}
function tempestReady(){return Object.values(tempestArt).every(im=>im.complete&&im.naturalWidth>0);}
function tempestLoad(){for(const [key,im] of Object.entries(tempestArt)){im.failed=false;im.src=tempestSources[key];}}
function tempestStatus(){
  if(mode!=='venue'||venue!==tempestIndex)return;
  const button=document.getElementById('startvenue'),note=document.getElementById('tempest-status');
  const failed=Object.values(tempestArt).some(im=>im.failed);
  if(button){button.disabled=!tempestReady();button.textContent=tempestReady()?'FIGHT AT STORM ROOFTOP →':failed?'ARTWORK COULD NOT LOAD':'LOADING STORM ROOFTOP…';}
  if(note)note.textContent=failed?'Arena artwork could not load. Reload artwork to try again.':'The Air Pollution Monster throws tornadoes across the entire rooftop. Hold BLOCK to take no tornado damage. Jumping, dashing, and specials cannot avoid the wind. Both sides can be hit.';
  const retry=document.getElementById('tempest-reload');if(retry)retry.hidden=!failed;
}
for(const im of Object.values(tempestArt)){
  im.addEventListener('load',()=>{im.failed=false;tempestStatus();});
  im.addEventListener('error',()=>{im.failed=true;tempestStatus();});
}
tempestLoad();

const tempestOldVenue=showVenue;
showVenue=function(...args){
  const value=tempestOldVenue(...args);if(mode!=='venue')return value;
  const card=overlay.querySelector('[data-venue="'+tempestIndex+'"]');
  if(card){card.querySelector('p').textContent='LIVING ARENA · Block the tornado';card.querySelector('img').alt='Air Pollution Monster above a stormy city rooftop';}
  if(venue===tempestIndex){
    const note=document.createElement('p');note.id='tempest-status';note.setAttribute('role','status');overlay.querySelector('.cards').after(note);
    const retry=document.createElement('button');retry.id='tempest-reload';retry.textContent='RELOAD ARTWORK';retry.hidden=true;retry.onclick=()=>{tempestLoad();tempestStatus();};document.getElementById('startvenue').after(retry);
  }
  tempestStatus();syncMenuFocus();return value;
};

const tempestOldStart=start;
start=function(...args){
  if(tempestSelected()&&!tempestReady()){showVenue();return;}
  if(!coGuest()){tempestHazard.reset();Object.assign(tempestRound,{resolving:false,doubleKO:false,bossWillGuard:false,bossReactAt:0,guardSerial:-1,lastPhase:'idle'});}
  return tempestOldStart(...args);
};
const tempestOldFinish=finish;
finish=function(win){if(tempestRound.resolving)return;return tempestOldFinish(win);};

function tempestBossGuarding(){return tempestSelected()&&boss?.state==='tempest-guard'&&boss.hp>0&&boss.hitstun<=0&&!boss.breakout;}
function tempestReleaseGuard(){if(boss?.state==='tempest-guard'){boss.state='recover';boss.timer=.35;boss.guardFlash=0;}}
function tempestPlanGuard(){
  const s=tempestHazard.state;
  if(s.serial!==tempestRound.guardSerial){
    tempestRound.guardSerial=s.serial;
    tempestRound.bossWillGuard=Math.random()<({easy:.28,medium:.52,hard:.72}[versusDifficulty]||.52);
    tempestRound.bossReactAt=s.clock+.38+Math.random()*.6;
  }
  const threatened=['windup','cast','sweep'].includes(s.phase)&&!Object.hasOwn(s.contacts,'boss');
  if(!threatened){tempestReleaseGuard();return;}
  // Use a distinct neutral state so all eight villain brains stop attacking while braced.
  // Existing projectiles continue to advance normally in each villain's updater.
  if(tempestRound.bossWillGuard&&s.clock>=tempestRound.bossReactAt&&boss.hp>0&&boss.hitstun<=0&&!boss.breakout&&!spreeInvisible()&&!(atom?.disperse>0)&&['idle','warn','recover','tempest-guard'].includes(boss.state)){
    boss.state='tempest-guard';boss.guardFlash=.12;boss.guardFacing=-s.direction;boss.vx=0;boss.jump=0;
    boss.wasteMoving=boss.styroMoving=boss.bearMoving=boss.sonicMoving=boss.dogMoving=false;
  }
}
function tempestPhase(phase){
  if(phase==='windup'){tempestPlanGuard();combatSound('wind',.8);}
  if(phase==='cast')combatSound('whoosh',1);
  if(phase==='sweep')combatSound('wind',1.3);
}
function tempestBlockFx(x,y,face){
  effects.push({type:'guard',x:x+face*32,y:y-145,life:.36,max:.36});
  burst(x,y-110,14,'#b8f9ff');combatSound('block',.85);
}
function tempestHitBoss(direction){
  if(boss.hp<=0)return;
  boss.hp=Math.max(0,boss.hp-boss.max*.18);boss.vx=direction*330;boss.hitstun=.48;boss.hitFlash=.16;boss.pulse=.18;
  boss.state='recover';boss.timer=.85;boss.breakout=null;boss.guardFlash=0;
  const facing=boss.dir||(hero.x>boss.x?1:-1);
  if(opponent===5){boss.wasteHeavy=true;boss.wasteReactDuration=.56;boss.wasteReact=.56;boss.wasteHitFacing=facing;boss.wasteMoving=false;}
  if(opponent===4){boss.styroHeavy=true;boss.styroReactDuration=.52;boss.styroReact=.52;boss.styroHitFacing=facing;boss.styroMoving=false;styroHit(direction,true);}
  if(opponent===3){boss.venomHeavy=true;boss.venomHitDuration=.48;boss.venomHitFacing=facing;boss.bearMoving=false;}
  if(opponent===2){boss.sonicHeavy=true;boss.sonicHitDuration=.48;boss.sonicHitFacing=facing;boss.sonicMoving=false;}
  if(opponent===1){boss.dogHeavy=true;boss.dogHitDuration=.48;boss.dogHitFacing=facing;boss.dogMoving=false;}
  if(opponent===6){atom.recoil=.18;atom.disperse=0;}
  if(opponent===7){spree.hidden=0;spree.charge=0;}
  effects.push({type:'impact',x:boss.x,y:GROUND-160,life:.24,max:.24,heavy:true});
  burst(boss.x,GROUND-130,18,'#c7d2e2');combatSound('heavy',.9,bossMaterial());
}
function tempestContact(contact){
  if(!tempestSelected()||mode!=='fight'||coGuest()||paused||specialSceneLocked())return;
  if(contact.id==='boss'){
    if(contact.blocked)tempestBlockFx(boss.x,GROUND,-contact.direction);
    else tempestHitBoss(contact.direction);
  }else{
    const index=Number(contact.id.slice(1));
    const apply=()=>{
      if(contact.blocked){hero.guardStun=Math.max(hero.guardStun,.18);tempestBlockFx(hero.x,hero.y,-contact.direction);}
      else{
        // The hazard deliberately bypasses dodge/special invulnerability, but never cinematics.
        hero.inv=0;hero.block=false;hitHero(18,hero.x-contact.direction*100);
      }
    };
    if(coActive())coWith(index,apply);else apply();
  }
  shake=Math.max(shake,contact.blocked?2:7);
}
function tempestFighters(previous){
  const players=coActive()?coop.players:[hero];
  return [...players.map((p,i)=>({id:'p'+i,x:p.x,previousX:previous[i],hp:p.hp,block:p.block===true})),{id:'boss',x:boss.x,previousX:previous[2],hp:boss.hp,block:tempestBossGuarding()}];
}
const tempestOldStep=updateStep;
updateStep=function(dt){
  const selectedStage=tempestSelected(),frozen=paused||specialSceneLocked()||hitStop>0,previousTime=elapsed;
  const players=coActive()?coop.players:[hero];
  const previous=[players[0]?.x,players[1]?.x,boss?.x];
  if(selectedStage&&!coGuest()&&!frozen&&mode==='fight')tempestPlanGuard();
  const value=tempestOldStep(dt);
  if(!selectedStage||coGuest()||frozen||paused||specialSceneLocked())return value;
  if(mode==='fight'&&elapsed>previousTime){
    tempestRound.resolving=true;
    try{tempestHazard.step(dt,{fighters:tempestFighters(previous),onContact:tempestContact,onPhase:tempestPhase});}
    finally{tempestRound.resolving=false;}
    const allDown=(coActive()?coop.players:[hero]).every(p=>p.hp<=0);
    tempestRound.doubleKO=allDown&&boss.hp<=0;
    if(allDown)finish(false);else if(boss.hp<=0)finish(true);
    tempestPlanGuard();
  }else if(mode==='victory'||mode==='defeat'){tempestHazard.step(dt,{allowNew:false});tempestReleaseGuard();}
  return value;
};

// Only the host advances randomness/collision. The guest consumes the exact same state.
const tempestOldState=coState;
coState=function(){return {...tempestOldState(),tempest:tempestSelected()?tempestHazard.snapshot():null,tempestDoubleKO:tempestRound.doubleKO};};
const tempestOldReceive=coReceive;
coReceive=function(data){
  if(Array.isArray(data?.players)&&data.players.length===2&&data.boss&&['fight','victory','defeat'].includes(data.mode)&&data.venue===tempestIndex&&data.tempest){
    const prior=tempestHazard.state.phase,serial=tempestHazard.state.serial;
    if(tempestHazard.receive(data.tempest)){
      tempestRound.doubleKO=data.tempestDoubleKO===true;
      if(prior!==data.tempest.phase||serial!==data.tempest.serial)tempestPhaseSound(data.tempest.phase);
    }
  }
  return tempestOldReceive(data);
};
function tempestPhaseSound(phase){if(phase==='windup'||phase==='sweep')combatSound('wind',phase==='windup'?.8:1.3);else if(phase==='cast')combatSound('whoosh',1);}

// Each source pose has an eye anchor, keeping the head steady during the throw.
const tempestPoseRects=[[20,110,620,525],[640,40,605,595],[10,650,645,570],[650,650,594,570]];
const tempestPoseAnchors=[[334,186],[325,293],[410,155],[315,196]];
const tempestForeground=document.createElement('canvas');tempestForeground.width=W;tempestForeground.height=H;
let tempestForegroundReady=false;
function tempestMakeForeground(){
  const c=tempestForeground.getContext('2d');c.clearRect(0,0,W,H);c.drawImage(tempestArt.background,0,0,W,H);
  c.globalCompositeOperation='destination-in';const gradient=c.createLinearGradient(0,315,0,475);gradient.addColorStop(0,'transparent');gradient.addColorStop(1,'#000');c.fillStyle=gradient;c.fillRect(0,0,W,H);c.globalCompositeOperation='source-over';tempestForegroundReady=true;
}
tempestArt.background.addEventListener('load',()=>{tempestForegroundReady=false;});
function tempestMonsterFrame(frame,alpha=1){
  if(alpha<=0)return;const s=tempestHazard.state,src=tempestPoseRects[frame],anchor=tempestPoseAnchors[frame];
  const sx=1.60,sy=.97,breathe=1+Math.sin(s.clock*1.05)*.008;
  const faceX=785+Math.sin(s.clock*.52)*9,faceY=179+Math.sin(s.clock*.95)*5;
  ctx.save();ctx.globalAlpha=alpha*.94;ctx.drawImage(tempestArt.monster,...src,faceX-anchor[0]*sx,faceY-anchor[1]*sy,src[2]*sx,src[3]*sy*breathe);ctx.restore();
}
function tempestMonster(){
  const s=tempestHazard.state,T=HealthiaTempestCore.timing;let from=0,to=0,mix=0;
  if(s.phase==='windup'){from=0;to=1;mix=Math.min(1,s.age/.38);}
  else if(s.phase==='cast'){from=1;to=2;mix=Math.min(1,s.age/.18);}
  else if(s.phase==='sweep'){from=2;to=3;mix=Math.min(1,s.age/.46);}
  else if(s.phase==='dissipate'){from=3;to=3;}
  else if(s.phase==='recover'){from=3;to=0;mix=Math.min(1,s.age/T.recover);}
  tempestMonsterFrame(from,1-mix);if(mix)tempestMonsterFrame(to,mix);
}
function tempestDrawTornado(x,y,size,alpha=1,clock=tempestHazard.state.clock){
  const im=tempestArt.tornado,cellW=im.naturalWidth/3,cellH=im.naturalHeight/2,f=(clock*14)%6,index=Math.floor(f),mix=f-index;
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(clock*4)*.018);ctx.globalAlpha=alpha;
  // Six detailed smoke phases; a short blend removes harsh frame popping.
  for(const [frame,opacity] of [[index,1-mix],[((index+1)%6),mix]]){ctx.globalAlpha=alpha*opacity;ctx.drawImage(im,(frame%3)*cellW,Math.floor(frame/3)*cellH,cellW,cellH,-size*.5,-size,size,size);}
  ctx.restore();
}
function tempestWarning(){
  const s=tempestHazard.state;if(!['windup','cast','sweep'].includes(s.phase)||mode!=='fight')return;
  const pulse=.55+.18*Math.sin(s.clock*13),direction=s.direction;
  ctx.save();ctx.strokeStyle=`rgba(255,200,108,${pulse})`;ctx.lineWidth=2;ctx.setLineDash([14,13]);ctx.lineDashOffset=-s.clock*direction*90;ctx.beginPath();ctx.moveTo(38,GROUND+14);ctx.lineTo(W-38,GROUND+14);ctx.stroke();ctx.setLineDash([]);
  ctx.shadowColor='#000';ctx.shadowBlur=10;ctx.font='900 22px Arial';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='#131820';ctx.strokeText('TORNADO · HOLD BLOCK',W/2,154);ctx.fillStyle='#ffe2a0';ctx.fillText('TORNADO · HOLD BLOCK',W/2,154);
  const edge=direction===1?38:W-38;
  for(let i=0;i<3;i++){const x=edge+direction*i*20;line([[x-direction*7,GROUND-17],[x,GROUND-9],[x-direction*7,GROUND-1]],'#ffe2a0',3);}
  ctx.restore();
}
const tempestOldSky=sky;
sky=function(...args){
  if(!tempestSelected()||!tempestReady())return tempestOldSky(...args);
  ctx.drawImage(tempestArt.background,0,0,W,H);tempestMonster();
  if(!tempestForegroundReady)tempestMakeForeground();ctx.drawImage(tempestForeground,0,0);
  // Subtle airborne ash and wind drift tie the monster to the environment.
  const s=tempestHazard.state;ctx.save();
  for(let i=0;i<24;i++){const x=(i*197+s.clock*22)%W,y=175+(i*67)%340+Math.sin(s.clock+i)*5;ctx.fillStyle=i%5?'#a8afbf33':'#f8cf9555';ctx.fillRect(x,y,i%3+1,1);}
  ctx.restore();
};
const tempestOldForeground=drawEnvironmentForeground;
drawEnvironmentForeground=function(...args){
  if(!tempestSelected()||!tempestReady())return tempestOldForeground(...args);
  const s=tempestHazard.state,T=HealthiaTempestCore.timing;
  if(s.phase==='cast'){
    const q=Math.min(1,s.age/T.cast),e=q*q,target=s.direction===1?-170:W+170;
    tempestDrawTornado(465+(target-465)*e,337+(GROUND-337)*e,95+q*330,.92);
  }
  if(s.phase==='sweep'||s.phase==='dissipate'){
    const fade=s.phase==='dissipate'?1-s.age/T.dissipate:1;
    // Faint floor reflection plus a full-height funnel: jumping cannot clear it.
    ctx.save();ctx.translate(0,GROUND+18);ctx.scale(1,-.18);ctx.translate(0,-GROUND);tempestDrawTornado(s.x,GROUND,465,fade*.12);ctx.restore();
    tempestDrawTornado(s.x,GROUND+10,465,fade*.91);
    ctx.save();ctx.globalAlpha=fade*.55;ctx.strokeStyle='#d8e1ee';ctx.lineWidth=1.4;
    for(let i=0;i<12;i++){
      const p=(s.clock*1.9+i/12)%1,angle=p*Math.PI*2,y=GROUND-25-(i%5)*75;
      ctx.beginPath();ctx.ellipse(s.x+Math.sin(p*6+i)*8,y,60+(GROUND-y)*.20,8+(i%3)*3,-.1,angle,angle+.8);ctx.stroke();
    }
    ctx.restore();
  }
  tempestWarning();
};
function tempestResultText(){
  if(!tempestSelected())return;const heading=overlay.querySelector('h2'),note=overlay.querySelector('p');
  if(heading&&tempestRound.doubleKO)heading.textContent='DOUBLE K.O.';
  else if(heading&&mode==='victory')heading.innerHTML='VICTORY!<br>STORM ROOFTOP';
  if(note&&tempestRound.doubleKO)note.textContent='The tornado knocked out both sides. Fight again for a rematch.';
  else if(note&&mode==='victory')note.textContent=villainNames[opponent]+' defeated at Storm Rooftop · '+Math.floor(elapsed)+' seconds · Best combo: '+best+' hits';
}
const tempestOldResult=result;result=function(...args){const r=tempestOldResult(...args);tempestResultText();return r;};
const tempestOldCoResult=coRoundResult;coRoundResult=function(...args){const r=tempestOldCoResult(...args);tempestResultText();return r;};
window.HealthiaTempest={index:tempestIndex,hazard:tempestHazard,round:tempestRound,ready:tempestReady};
