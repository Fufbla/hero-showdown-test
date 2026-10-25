'use strict';

// Loaded after the existing Story/Versus extensions. No Story arena is replaced.
const harborIndex=venueNames.length;
const harborHazard=new HealthiaHarborCore.Hazard();
const harborArt={background:new Image(),parts:new Image()};
const harborSources={background:'assets/harbor/harbor-background.png',parts:'assets/harbor/monster-parts.png'};
const harborRound={doubleKO:false,resolving:false,lastImpact:0};
venueNames.push('TOXIC HARBOR');
const harborThumbnail=new Image();harborThumbnail.src='assets/harbor/harbor-preview.webp';venueImages.push(harborThumbnail);

function harborSelected(){return venue===harborIndex&&!window.HealthiaStory?.active;}
function harborReady(){return Object.values(harborArt).every(im=>im.complete&&im.naturalWidth>0);}
function harborLoad(){for(const [key,im] of Object.entries(harborArt)){im.failed=false;im.src=harborSources[key];}}
function harborStatus(){
  if(mode!=='venue'||venue!==harborIndex)return;
  const button=document.getElementById('startvenue'),note=document.getElementById('harbor-status');
  const failed=Object.values(harborArt).some(im=>im.failed);
  if(button){button.disabled=!harborReady();button.textContent=harborReady()?'FIGHT AT TOXIC HARBOR →':failed?'ARTWORK COULD NOT LOAD':'LOADING TOXIC HARBOR…';}
  if(note)note.textContent=failed?'Arena artwork could not load. Select Reload artwork to try again.':'Move or jump clear of glowing slam zones. The monster can damage either side.';
  const retry=document.getElementById('harbor-reload');if(retry)retry.hidden=!failed;
}
for(const im of Object.values(harborArt)){
  im.addEventListener('load',()=>{im.failed=false;harborStatus();});
  im.addEventListener('error',()=>{im.failed=true;harborStatus();});
}
harborLoad();

const harborOldVenue=showVenue;
showVenue=function(){
  if(window.HealthiaStory?.active)return showStorySelect();
  harborOldVenue();
  const card=overlay.querySelector('[data-venue="'+harborIndex+'"]');
  if(card){card.querySelector('p').textContent='LIVING ARENA · Random monster slams';const preview=card.querySelector('img');preview.alt='Giant toxic monster looming over a sunset harbor arena';preview.style.objectFit='contain';}
  if(venue===harborIndex){
    const note=document.createElement('p');note.id='harbor-status';note.setAttribute('role','status');
    overlay.querySelector('.cards').after(note);
    const retry=document.createElement('button');retry.id='harbor-reload';retry.textContent='RELOAD ARTWORK';retry.hidden=true;retry.onclick=()=>{harborLoad();harborStatus();};
    document.getElementById('startvenue').after(retry);
  }
  harborStatus();syncMenuFocus();
};

const harborOldStart=start;
start=function(...args){
  if(harborSelected()&&!harborReady()){showVenue();return;}
  if(!coGuest()){harborHazard.reset();harborRound.doubleKO=false;harborRound.lastImpact=0;}
  return harborOldStart(...args);
};

// Defer the result until all fighters in this one impact have been evaluated.
const harborOldFinish=finish;
finish=function(win){if(harborRound.resolving)return;return harborOldFinish(win);};

function harborHitOpponent(damage,x){
  if(boss.hp<=0||spreeInvisible())return;
  boss.hp=Math.max(0,boss.hp-damage);boss.vx=(boss.x>=x?1:-1)*330;boss.hitstun=.48;boss.hitFlash=.16;boss.pulse=.18;
  boss.state='recover';boss.timer=.85;boss.breakout=null;boss.guardFlash=0;
  const facing=boss.dir||(hero.x>boss.x?1:-1);
  if(opponent===5){boss.wasteHeavy=true;boss.wasteReactDuration=.56;boss.wasteReact=.56;boss.wasteHitFacing=facing;boss.wasteMoving=false;}
  if(opponent===4){boss.styroHeavy=true;boss.styroReactDuration=.52;boss.styroReact=.52;boss.styroHitFacing=facing;boss.styroMoving=false;styroHit(Math.sign(boss.vx),true);}
  if(opponent===3){boss.venomHeavy=true;boss.venomHitDuration=.48;boss.venomHitFacing=facing;boss.bearMoving=false;}
  if(opponent===2){boss.sonicHeavy=true;boss.sonicHitDuration=.48;boss.sonicHitFacing=facing;boss.sonicMoving=false;}
  if(opponent===1){boss.dogHeavy=true;boss.dogHitDuration=.48;boss.dogHitFacing=facing;boss.dogMoving=false;}
  if(opponent===6)atom.recoil=.18;
}

function harborImpact(slam){
  if(!harborSelected()||mode!=='fight'||coGuest()||paused||specialSceneLocked())return;
  harborRound.lastImpact=slam.serial;harborRound.resolving=true;
  try{
    coEach(()=>{
      if(!HealthiaHarborCore.inSlam(hero,slam,GROUND)||hero.inv>0)return;
      // An overhead environmental strike bypasses a frontal guard.
      hero.block=false;hitHero(18,slam.x);
    });
    if(HealthiaHarborCore.inSlam({x:boss.x,y:GROUND,hp:boss.hp},slam,GROUND))harborHitOpponent(boss.max*.18,slam.x);
  }finally{harborRound.resolving=false;}
  shake=Math.max(shake,15);hitStop=Math.max(hitStop,.075);
  burst(slam.x,GROUND-8,26,'#cdff67');burst(slam.x,GROUND-12,16,'#de80ff');combatSound('ground',1.3,'armor');
  const players=coActive()?coop.players:[hero],allDown=players.every(p=>p.hp<=0);
  harborRound.doubleKO=allDown&&boss.hp<=0;
  if(allDown)finish(false);else if(boss.hp<=0)finish(true);
}

const harborOldStep=updateStep;
updateStep=function(dt){
  const frozen=paused||specialSceneLocked()||hitStop>0,previous=elapsed;
  const value=harborOldStep(dt);
  if(!harborSelected()||coGuest()||frozen||paused||specialSceneLocked())return value;
  if(mode==='fight'&&elapsed>previous)harborHazard.step(dt,harborImpact);
  else if(mode==='victory'||mode==='defeat')harborHazard.step(dt,null,false);
  return value;
};

// The host chooses the timing/location and applies damage once. Guests only render snapshots.
const harborOldState=coState;
coState=function(){return {...harborOldState(),harbor:harborSelected()?harborHazard.snapshot():null,harborDoubleKO:harborRound.doubleKO};};
const harborOldReceive=coReceive;
coReceive=function(data){
  if(Array.isArray(data?.players)&&data.players.length===2&&data.boss&&['fight','victory','defeat'].includes(data.mode)){
    harborRound.doubleKO=data.harborDoubleKO===true;
    if(data.venue===harborIndex&&data.harbor){
      const prior=harborHazard.state.serial,was=harborHazard.state.phase;
      if(harborHazard.receive(data.harbor)&&data.harbor.phase==='hold'&&(was!=='hold'||prior!==data.harbor.serial))combatSound('ground',1.3,'armor');
    }
  }
  return harborOldReceive(data);
};

function harborResultText(){
  if(!harborSelected())return;
  const heading=overlay.querySelector('h2');
  if(heading)heading.innerHTML=harborRound.doubleKO?'DOUBLE K.O.':mode==='victory'?'VICTORY!<br>TOXIC HARBOR':heading.innerHTML;
  if(harborRound.doubleKO){const note=overlay.querySelector('p');if(note)note.textContent='The same monster slam knocked out both sides. Fight again for a rematch.';}
  else if(mode==='victory'){const note=overlay.querySelector('p');if(note)note.textContent=harborVictoryDescription();}
}
function harborVictoryDescription(){return villainNames[opponent]+' defeated at Toxic Harbor · '+Math.floor(elapsed)+' seconds · Best combo: '+best+' hits';}
const harborOldResult=result;result=function(...args){const r=harborOldResult(...args);harborResultText();return r;};
const harborOldCoResult=coRoundResult;coRoundResult=function(...args){const r=harborOldCoResult(...args);harborResultText();return r;};

// A small articulated canvas rig keeps each arm attached to its shoulder.
// The hand moves forward in perspective; no extra hand is painted into the background.
const harborSprites={body:[0,70,840,880],left:[840,520,696,504],right:[840,0,696,512]};
function harborBodyMotion(){const c=harborHazard.state.clock;return {x:Math.sin(c*.46)*8,y:Math.sin(c*1.05)*4,breath:1+Math.sin(c*1.05)*.009};}
function harborArmPose(side){
  const s=harborHazard.state,m=harborBodyMotion(),left=side==='left';
  const shoulder={x:(left?534:968)+m.x,y:166+m.y};
  const rest={x:(left?345:1140)+m.x+Math.sin(s.clock*.7+(left?0:1))*8,y:242+m.y+Math.sin(s.clock*1.15+(left?0:1.3))*7};
  const p=s.arm===side?harborHazard.pose():{reach:0,lift:0};
  const hand={x:rest.x+(s.x-rest.x)*p.reach,y:rest.y+(GROUND-91-rest.y)*p.reach-p.lift*90};
  return {shoulder,hand,reach:p.reach,lift:p.lift};
}
function harborDrawArm(side,foreground=false){
  const pose=harborArmPose(side),left=side==='left',src=harborSprites[side];
  const anchor=left?{x:568,y:121}:{x:115,y:175},tip=left?{x:183,y:324}:{x:505,y:346};
  const ax=tip.x-anchor.x,ay=tip.y-anchor.y,len=Math.hypot(ax,ay),ux=ax/len,uy=ay/len;
  const scale=.48+pose.reach*.14,join=.58;
  const wrist={x:pose.hand.x+ax*(join-1)*scale,y:pose.hand.y+ay*(join-1)*scale};
  const distance=Math.hypot(wrist.x-pose.shoulder.x,wrist.y-pose.shoulder.y);
  const control={x:wrist.x-ux*distance*.58,y:wrist.y-uy*distance*.58};
  function point(x,y){
    const u=((x-anchor.x)*ux+(y-anchor.y)*uy)/len,v=-(x-anchor.x)*uy+(y-anchor.y)*ux;
    if(u>=join)return {x:pose.hand.x+(x-tip.x)*scale,y:pose.hand.y+(y-tip.y)*scale};
    const q=Math.max(0,u/join),r=1-q;
    let cx=r*r*pose.shoulder.x+2*r*q*control.x+q*q*wrist.x;
    let cy=r*r*pose.shoulder.y+2*r*q*control.y+q*q*wrist.y;
    const tx=2*r*(control.x-pose.shoulder.x)+2*q*(wrist.x-control.x),ty=2*r*(control.y-pose.shoulder.y)+2*q*(wrist.y-control.y),tl=Math.max(1,Math.hypot(tx,ty));
    if(u<0){cx+=tx/tl*u*len*scale;cy+=ty/tl*u*len*scale;}
    return {x:cx-ty/tl*v*scale,y:cy+tx/tl*v*scale};
  }
  function triangle(a,b,c){
    const center={x:(a.x+b.x+c.x)/3,y:(a.y+b.y+c.y)/3};
    if(foreground&&((center.x-anchor.x)*ux+(center.y-anchor.y)*uy)/len<join)return;
    const p=point(a.x,a.y),q=point(b.x,b.y),r=point(c.x,c.y);
    const d=a.x*(b.y-c.y)+b.x*(c.y-a.y)+c.x*(a.y-b.y);
    const aa=(p.x*(b.y-c.y)+q.x*(c.y-a.y)+r.x*(a.y-b.y))/d;
    const bb=(p.y*(b.y-c.y)+q.y*(c.y-a.y)+r.y*(a.y-b.y))/d;
    const cc=(p.x*(c.x-b.x)+q.x*(a.x-c.x)+r.x*(b.x-a.x))/d;
    const dd=(p.y*(c.x-b.x)+q.y*(a.x-c.x)+r.y*(b.x-a.x))/d;
    const ee=p.x-aa*a.x-cc*a.y,ff=p.y-bb*a.x-dd*a.y;
    const mx=(p.x+q.x+r.x)/3,my=(p.y+q.y+r.y)/3;
    ctx.save();ctx.beginPath();
    for(const [i,v] of [p,q,r].entries()){const dx=v.x-mx,dy=v.y-my,l=Math.max(1,Math.hypot(dx,dy));const x=v.x+dx/l*.55,y=v.y+dy/l*.55;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    ctx.closePath();ctx.clip();ctx.transform(aa,bb,cc,dd,ee,ff);ctx.drawImage(harborArt.parts,...src,0,0,src[2],src[3]);ctx.restore();
  }
  const columns=8,rows=5;
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const x=i*src[2]/columns,y=j*src[3]/rows,w=src[2]/columns,h=src[3]/rows;
    const a={x,y},b={x:x+w,y},c={x:x+w,y:y+h},d={x,y:y+h};triangle(a,b,c);triangle(a,c,d);
  }
}
function harborDrawBody(){
  const m=harborBodyMotion();ctx.drawImage(harborArt.parts,...harborSprites.body,460+m.x,-49+m.y,595,478*m.breath);
  // Low-cost ripples and falling slime animate without allocating particles every frame.
  const clock=harborHazard.state.clock;
  ctx.save();ctx.globalCompositeOperation='screen';
  for(let i=0;i<13;i++){
    const p=(clock*.38+i*.137)%1,x=485+i*42+Math.sin(clock+i)*8;
    ellipse(x,409+p*24,5+p*30,1+p*4,`rgba(${i%2?'119,255,85':'218,82,255'},${(1-p)*.24})`);
  }
  for(let i=0;i<10;i++){const p=(clock*.55+i*.173)%1,x=530+i*43;ellipse(x+Math.sin(i)*10,325+p*90,1.2,3.5,`rgba(${i%2?'165,255,126':'230,135,255'},${Math.sin(p*Math.PI)*.62})`);}
  ctx.restore();
}
function harborMarker(){
  const s=harborHazard.state;
  if(!['windup','strike','hold'].includes(s.phase))return;
  const intensity=.63+.24*Math.sin(s.clock*19),strike=s.phase!=='windup';
  ctx.save();ctx.fillStyle=`rgba(255,104,48,${strike?.31:.13+intensity*.08})`;ctx.strokeStyle=strike?'#fff4b0':'#ffe16c';ctx.lineWidth=4;
  ctx.beginPath();ctx.ellipse(s.x,GROUND+2,s.radius,23,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.setLineDash([8,8]);ctx.strokeStyle='#ff9278';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(s.x,GROUND+2,s.radius+7,29,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  if(s.phase==='windup'){
    const r=Math.max(8,(1-s.age/HealthiaHarborCore.timing.windup)*s.radius);
    ctx.strokeStyle='#fff6d2';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(s.x,GROUND+2,r,Math.max(3,r*.21),0,0,Math.PI*2);ctx.stroke();
    text('!',s.x,GROUND+12,29,'#fff7b5','center');
  }
  ctx.restore();
}
const harborOldSky=sky;
sky=function(...args){
  if(!harborSelected()||!harborReady())return harborOldSky(...args);
  ctx.drawImage(harborArt.background,0,0,W,H);
  for(const side of ['left','right'])harborDrawArm(side);
  harborDrawBody();harborMarker();
};
const harborOldForeground=drawEnvironmentForeground;
drawEnvironmentForeground=function(...args){
  if(!harborSelected()||!harborReady())return harborOldForeground(...args);
  const s=harborHazard.state,p=harborHazard.pose();
  if(p.reach>.03)harborDrawArm(s.arm,true);
  if(['hold','retract'].includes(s.phase)&&!s.returnFrom){
    const age=s.phase==='hold'?s.age:s.age+.20,q=Math.min(1,age/.65);
    if(q<1){ctx.save();ctx.globalAlpha=1-q;ctx.strokeStyle='#d6ff91';ctx.lineWidth=6*(1-q)+1;ctx.beginPath();ctx.ellipse(s.x,GROUND+3,25+q*170,6+q*29,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  }
};

window.HealthiaHarbor={index:harborIndex,hazard:harborHazard,round:harborRound,ready:harborReady};
