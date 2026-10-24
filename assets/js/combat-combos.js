'use strict';

// KK -> low sweep; KKPP -> uppercut. Input edges still come from the existing
// keyboard, touch and controller paths, including the authoritative co-op host.
const COMBO_BONUS = .08;
const COMBO_TAP_WINDOW = .9;
let comboSerial = 0;
const comboDefinitions = [
 {name:'summy',referenceHeight:360,frames:[
  [16,168,330,329,230,490],[388,179,415,315,575,487],
  [803,231,423,255,1010,479],[1223,176,298,318,1405,487],
  [27,645,309,327,225,965],[415,607,316,365,610,965],
  [820,523,305,445,1020,961],[1225,622,288,351,1410,966]]},
 {name:'sadie',referenceHeight:360,frames:[
  [22,176,286,306,215,475],[375,191,383,281,568,465],
  [777,235,409,243,970,471],[1204,167,289,308,1388,468],
  [45,617,287,353,230,963],[406,587,329,381,610,961],
  [811,515,282,453,1002,961],[1185,620,328,350,1395,963]]},
 {name:'vee',referenceHeight:380,frames:[
  [21,124,271,341,205,458],[399,124,372,336,587,453],
  [774,158,411,296,969,447],[1199,104,307,364,1380,461],
  [36,595,294,362,219,950],[431,568,306,387,617,948],
  [791,518,330,433,1010,944],[1189,564,318,392,1398,949]]}
];
const comboSheets = comboDefinitions.map(def=>{
 const im=new Image();im.src='assets/combos/'+def.name+'-combos.png';return im;
});

function resetHeroCombo(p=hero){if(p)p.comboChain=null;}
function resetAllCombos(){
 if(typeof hero!=='undefined')resetHeroCombo(hero);
 if(typeof coop!=='undefined')for(const p of coop.players)resetHeroCombo(p);
 if(typeof story!=='undefined')for(const p of story.team||[])resetHeroCombo(p);
}
function comboGrounded(){return hero.y>=GROUND-.5&&hero.jumps===0;}
function comboMoveSpec(key){
 const fast=selected===2,base=heroes[selected].damage;
 if(key==='sweep')return {key,kick:true,duration:fast?.47:.56,startup:fast?.12:.16,active:.13,damage:base*1.5*(1+COMBO_BONUS)};
 if(key==='uppercut')return {key,kick:false,duration:fast?.45:.54,startup:fast?.10:.14,active:.15,damage:base*(1+COMBO_BONUS)};
 return attackSpec(key);
}
function startComboAttack(key,chain){
 const a=comboMoveSpec(key);
 hero.face=boss.x>=hero.x?1:-1;
 hero.attack=key;hero.attackDuration=a.duration;hero.anim=a.duration;hero.cd=a.duration;
 hero.block=false;hero.buffer=null;
 hero.pendingAttack={...a,chainId:chain.id,sequencePart:key==='kick'?'lead':key==='punch'?'link':key,
  face:hero.face,elapsed:0,hit:false,missSound:false};
 chain.ttl=Math.max(COMBO_TAP_WINDOW,a.duration+.5);
 syncAnimation();
}
function readComboInput(key,fromBuffer){
 if(fromBuffer&&key!=='kick')return false;
 if(!['kick','punch'].includes(key)){resetHeroCombo();return false;}
 if(!comboGrounded()||held('block')||hero.dash){resetHeroCombo();return false;}
 let chain=hero.comboChain;
 if(chain&&chain.ttl<=0){resetHeroCombo();chain=null;}
 if(chain){
  let move=null;
  if(chain.stage===1&&key==='kick'){chain.stage=2;move='sweep';}
  else if(chain.stage===2&&key==='punch'){chain.stage=3;move='punch';}
  else if(chain.stage===3&&key==='punch'){chain.stage=4;move='uppercut';}
  // A completed input sequence cannot grow an unlimited attack queue.
  else if(chain.stage===4)return true;
  else {resetHeroCombo();chain=null;}
  if(move){
   chain.queue.push(move);chain.ttl=COMBO_TAP_WINDOW;hero.buffer=null;
   if(hero.anim<=0&&hero.cd<=1e-7)startComboAttack(chain.queue.shift(),chain);
   return true;
  }
 }
 if(key==='kick'){
  chain=hero.comboChain={id:++comboSerial,stage:1,ttl:COMBO_TAP_WINDOW,queue:[],credit:0};
  // A tap during an ordinary attack's recovery must still start the next
  // sequence. Keep every deliberate press, even between rendered frames.
  if(hero.anim>0||hero.cd>1e-7){chain.queue.push('kick');hero.buffer=null;}
  else startComboAttack('kick',chain);
  return true;
 }
 return false;
}
function stepHeroCombo(dt){
 const chain=hero.comboChain;if(!chain)return;
 if(hero.hp<=0||hero.stun>0||hero.knockdown>0||hero.guardStun>0||hero.special>0||hero.dash||held('block')||!comboGrounded()){
  resetHeroCombo();return;
 }
 const a=hero.pendingAttack;
 if(chain.queue.length){
  // Cancel only after the previous move's entire active interval. Fast taps
  // cannot skip a hit, and holding a button never supplies another input edge.
  const canLink=a&&a.chainId===chain.id&&a.key!=='uppercut'&&a.elapsed+1e-8>=a.startup+a.active+.065;
  if(canLink||(!a&&hero.anim<=0&&hero.cd<=1e-7))startComboAttack(chain.queue.shift(),chain);
 }else{
  chain.ttl-=dt;
  if(chain.ttl<=0||(chain.stage===4&&!a&&hero.anim<=0))resetHeroCombo();
 }
}
function comboDamage(a){
 const chain=hero.comboChain;
 return a.damage+(['sweep','uppercut'].includes(a.key)&&chain&&chain.id===a.chainId?chain.credit:0);
}
function recordComboHit(a,landed){
 const chain=hero.comboChain;
 if(!landed)return;
 if(chain&&chain.id===a.chainId){
  // Regular hits keep their original damage. Their 8% share is paid only by
  // a connected combo move: KK = 1.08 * two kicks; KKPP = 1.08 * KKPP.
  if(a.key==='sweep'||a.key==='uppercut')chain.credit=0;
  else chain.credit+=a.damage*COMBO_BONUS;
 }
 if(mode!=='fight'||boss.breakout)return;
 if(a.key==='sweep'){
  boss.vx=a.face*72;boss.hitstun=Math.max(boss.hitstun,.29*(versusDifficulty==='hard'?.65:versusDifficulty==='medium'?.82:1));
  shake=Math.max(shake,7);hitStop=Math.max(hitStop,.055);
 }else if(a.key==='uppercut'){
  boss.vx=a.face*230;boss.hitstun=Math.max(boss.hitstun,.35*(versusDifficulty==='hard'?.65:versusDifficulty==='medium'?.82:1));
  for(const field of ['wasteHeavy','styroHeavy','venomHeavy','sonicHeavy','dogHeavy'])boss[field]=true;
  shake=Math.max(shake,10);hitStop=Math.max(hitStop,.075);
  combatSound('heavy',.55,bossMaterial());
 }else if(a.sequencePart==='link')boss.vx=a.face*80;
}
function comboPose(a){
 const e=a.elapsed,start=a.startup,end=start+a.active;
 if(a.key==='sweep'){
  if(e<start*.48)return 20;if(e<start)return 21;if(e<end)return 22;
  if(e<end+.065)return 21;if(e<a.duration-.045)return 23;return 15;
 }
 if(e<start*.50)return 24;if(e<start+a.active*.30)return 25;if(e<end)return 26;
 if(e<end+.065)return 25;if(e<a.duration-.045)return 27;return 0;
}
function drawComboSprite(index,pose,x,feet,face,alpha){
 const def=comboDefinitions[index],im=comboSheets[index],f=def.frames[pose-20];
 if(!im.complete||!im.naturalWidth){heroArt(index,pose<24?15:9,x,feet,face,alpha);return;}
 const [sx,sy,w,h,ax,ay]=f,s=heroes[index].height/def.referenceHeight;
 ctx.save();ctx.globalAlpha*=alpha;ctx.translate(x,feet);ctx.scale(face*s,s);
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(im,sx,sy,w,h,sx-ax,sy-ay,w,h);ctx.restore();
}
function comboStageBounds(left,right){
 const d=comboDefinitions[selected],s=heroes[selected].height/d.referenceHeight;
 for(const [x,y,w,h,ax] of d.frames){left=Math.max(left,(ax-x)*s);right=Math.max(right,(x+w-ax)*s);}
 return {left,right};
}
function comboHitbox(a){
 const s=heroes[selected].height/comboDefinitions[selected].referenceHeight;
 if(a.key==='sweep'){
  const reach=[205,198,199][selected]*s,cx=hero.x+a.face*reach,cy=hero.y-[26,33,47][selected]*s;
  return {x:cx-38,y:cy-25,w:76,h:50,cx,cy};
 }
 const p=clamp((a.elapsed-a.startup)/a.active,0,1);
 const from=[95,80,90][selected],to=[60,43,8][selected],reach=(from+(to-from)*p)*s;
 const above=([300,290,280][selected]+[112,130,125][selected]*p)*s;
 const cx=hero.x+a.face*reach,cy=hero.y-above;
 return {x:cx-35,y:cy-46,w:70,h:92,cx,cy};
}
function stepComboMotion(dt,limits){
 const a=hero.pendingAttack;if(!a||a.key!=='uppercut'||hero.stun>0)return;
 // Small planted step into the rising punch keeps a connected sweep string
 // in reach. Apply swept pushbox limits; never teleport through an opponent.
 const p=clamp((a.elapsed+dt)/a.startup,0,1),travel=(selected===2?30:26)*p*p*(3-2*p);
 const dx=travel-(a.rootMotion||0);a.rootMotion=travel;
 let next=clamp(hero.x+a.face*dx,limits.min,limits.max);
 if(!spreeInvisible()&&a.face*(boss.x-hero.x)>0){
  const stop=boss.x-a.face*105;
  next=a.face>0?Math.max(hero.x,Math.min(next,stop)):Math.min(hero.x,Math.max(next,stop));
 }
 hero.x=next;
}
function drawComboTrail(){
 const a=hero?.pendingAttack;if(!a||!['sweep','uppercut'].includes(a.key))return;
 const p=clamp((a.elapsed-a.startup*.7)/(a.active+a.startup*.3+.08),0,1);
 if(p<=0||p>=1)return;
 ctx.save();ctx.translate(hero.x,hero.y);ctx.scale(a.face,1);
 ctx.globalAlpha=Math.sin(p*Math.PI)*.62;ctx.lineCap='round';
 for(let n=0;n<2;n++){
  ctx.strokeStyle=n===0?heroes[selected].color:'#fffbe2';ctx.lineWidth=n===0?9:3;
  ctx.beginPath();
  if(a.key==='sweep')ctx.ellipse(45,-22,130,23,0,-Math.PI*.83,Math.PI*(p*.88-.33));
  else {const s=heroes[selected].height/comboDefinitions[selected].referenceHeight;ctx.moveTo(20*s,-170*s);ctx.bezierCurveTo(150*s,-220*s,125*s,-360*s,50*s,-420*s);}
  ctx.stroke();
 }
 ctx.restore();
}
function drawComboImpact(e){
 const p=1-e.life/e.max;
 ctx.save();ctx.translate(e.x,e.y);ctx.scale(e.dir,1);ctx.globalAlpha=(1-p)*.85;
 ctx.strokeStyle=e.color;ctx.lineWidth=4*(1-p)+1;ctx.lineCap='round';
 ctx.beginPath();
 if(e.move==='sweep')ctx.ellipse(-20,0,40+p*60,9+p*12,-.08,-2.7,.65);
 else {ctx.moveTo(-18,35);ctx.quadraticCurveTo(30,-5,6,-55-p*36);}
 ctx.stroke();ctx.restore();
}

// Touch ownership and controller edges are handled by battle-input.js.
