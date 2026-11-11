// Illustration-space animation only. These anchors are consumed by artwork and
// existing effects. Nothing writes back into attacks, movement, saves or gear.
import {animationState, previewHero, twoBone} from './hero-rig.mjs';
import {ATTACKS} from './core.mjs';
import {STYLE_C_MOTIONS} from './style-c-clips.mjs';
export {STYLE_C_MOTIONS};
export {prepareStyleCMotion, drawStyleCMotionLimb, styleCMotionStatus} from './style-c-motion-paint.mjs';

const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,v));
const mix=(a,b,t)=>a+(b-a)*t;
const wrap=v=>((v%1)+1)%1;
const pair=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t)];
const length=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const neutral=STYLE_C_MOTIONS.idle.frames[0];
const gaitClips=new Set(['walk','run','v2-run','speed']);
const attacks=new Set(['punch','air-punch','kick','air-kick','strength','superKick']);
const airClips=new Set(['jump','double-jump','fall','air-punch','air-kick','flight','knockback']);

// Active frames start and end on exactly the clocks used by normal, aerial and
// powered attacks. Attack speed changes advance the game's attack.age directly.
function attackPhase(kind,age) {
  const a=ATTACKS[kind];
  if(age<a.startup) return {phase:.40*clamp(age/a.startup), contact:false};
  if(age<a.startup+a.active) return {phase:.40, contact:true};
  return {phase:mix(.40,1,clamp((age-a.startup-a.active)/(a.duration-a.startup-a.active))),contact:false};
}
function chooseClip(h,options) {
  const requested=options.poseName || h.visualClip;
  if(!h.dead && h.attack) {
    if(h.attack.power==='strength'||h.attack.power==='superKick')return h.attack.power;
    return (h.grounded?'':'air-')+h.attack.kind;
  }
  if(requested && Object.hasOwn(STYLE_C_MOTIONS,requested))return requested;
  if(h.dead)return 'defeat';
  if(h.respawnAge<.6)return 'respawn';
  if(h.stun>0)return (h.hurtAge??0)>.04 && (!h.grounded || Math.abs(h.vx||0)>60)?'knockback':'hurt';
  if(h.flying)return 'flight';
  if((h.castAge??100)<.25)return 'fireball';
  if(h.agile && (h.dodgeAge??100)<.30)return 'agility';
  const standard=animationState(h);
  if((options.turnAge??1)<.16 && (standard==='idle'||gaitClips.has(standard)))return 'turn';
  if(standard==='idle'&&h.steel)return 'steel';
  return standard;
}
function clockFor(state,h,time,options) {
  const clip=STYLE_C_MOTIONS[state];
  if(attacks.has(state)&&h.attack)return attackPhase(h.attack.kind,h.attack.age);
  if(gaitClips.has(state)){
    const stride=state==='walk'?11.5:state==='run'?16.5:state==='v2-run'?19.5:20;
    return {phase:wrap((h.cycle||0)*52/(4*stride)),contact:false};
  }
  const clocks={
    turn:options.turnAge??h.turnAge??h.visualClipAge, jump:h.jumpAge, 'double-jump':h.jumpAge,
    land:h.landing>0?.13-h.landing:undefined,
    hurt:h.hurtAge, knockback:h.hurtAge, defeat:h.defeatAge, respawn:h.respawnAge,
    fireball:h.castAge, roots:options.effectAge??h.visualClipAge, whirlwind:options.effectAge??h.visualClipAge,
    steel:options.effectAge??h.visualClipAge, agility:options.effectAge??h.dodgeAge??h.visualClipAge
  };
  const eventAge=clocks[state]??h.visualClipAge;
  // The creator rehearses single-use casts repeatedly. In an actual patrol a
  // cast receives its own non-looping action clock from the active power.
  const elapsed=eventAge??(!clip.loop && h.visualClip===state ? time%(clip.duration+.20) : time);
  return {phase:clip.loop?wrap(elapsed/clip.duration):clamp(elapsed/clip.duration),contact:false};
}
function tweenFrame(clip,phase) {
  let i=0;
  for(let n=1;n<clip.stops.length&&clip.stops[n]<=phase;n++)i=n;
  const j=i+1<clip.frames.length?i+1:clip.loop?0:i;
  const start=clip.stops[i],end=j>i?clip.stops[j]:1;
  const t=clamp((phase-start)/(end-start||1));
  const a=clip.frames[i],b=clip.frames[j],index=t<.5?i:j;
  return {
    index, body:a.body.map((v,k)=>mix(v,b.body[k],t)),
    hands:a.hands.map((p,k)=>pair(p,b.hands[k],t)), feet:a.feet.map((p,k)=>pair(p,b.feet[k],t)),
    headTilt:mix(a.headTilt||0,b.headTilt||0,t),open:clip.frames[index].open,sole:clip.frames[index].sole
  };
}
function sample(model,l,state,phase,contact,unit,elapsed, usePlantedFeet=true) {
  const m=model,clip=STYLE_C_MOTIONS[state],art=tweenFrame(clip,phase);
  const [bodyX,bodyY,bodyLean]=art.body,offset=[bodyX/unit,bodyY/unit];
  let lean=bodyLean/unit;
  const renderWidth={slender:.87,balanced:1,strong:1.12,full:1.22}[l.build]||1;
  const renderHeight=(l.height||1)*(l.age==='teen'?.98:l.age==='older'?.99:1);
  const lengths=(bones,scale)=>bones.map(b=>[length(b[0],b[1])*scale,length(b[1],b[2])*scale]);
  const armLengths=lengths(m.arms,l.arms||1),legLengths=lengths(m.legs,l.legs||1);
  const adapt=(points,original,rest)=>points.map((p,i)=>[
    original[i][2][0]+(p[0]-rest[i][0])/unit,original[i][2][1]+(p[1]-rest[i][1])/unit
  ]);
  const hands=adapt(art.hands,m.arms,neutral.hands),feet=adapt(art.feet,m.legs,neutral.feet);
  const floors=m.restAnkleY||m.legs.map(leg=>leg[2][1]);
  feet.forEach((point,i)=>{point[1]+=floors[i]-m.legs[i][2][1];});
  const isGait=gaitClips.has(state),stride=state==='walk'?11.5:state==='run'?16.5:state==='v2-run'?19.5:20;
  if(isGait && usePlantedFeet)for(let i=0;i<2;i++){
    const q=wrap(phase+i*.5),swing=clamp((q-.5)*2),radius=stride/unit;
    const center=m.origin[0]+(i?-3:3)/unit;
    feet[i][0]=center+(q<.5?radius*(1-4*q):(swing*2-1)*radius);
    feet[i][1]=floors[i]-(q<.5?0:Math.sin(swing*Math.PI)*(state==='walk'?9:state==='run'?16:state==='v2-run'?19:19)/unit);
  }
  const grounded=!airClips.has(state);
  // Bring a grounded pelvis down as needed for planted feet while preserving
  // femur/shin lengths at the extremes of the player's leg slider.
  if(grounded&&state!=='idle')for(let i=0;i<2;i++){
    if((contact||art.index===2)&&i===0&&['kick','superKick'].includes(state))continue;
    const root=m.legs[i][0],dx=feet[i][0]-root[0]-offset[0],reach=legLengths[i][0]+legLengths[i][1]-.02;
    if(Math.abs(dx)<reach)offset[1]=Math.max(offset[1],feet[i][1]-root[1]-Math.sqrt(reach*reach-dx*dx));
  }
  const strikeArt=clip.frames[art.index].hit;
  // At exactly the authored contact key the action gallery and the live hit
  // use the same hand or foot. The external body size scale is accounted for.
  if((contact || Math.abs(phase-.40)<1e-8)&&strikeArt){
    const isArm=strikeArt==='hand',goal=isArm?hands[0]:feet[0];
    goal[0]=m.origin[0]+(isArm?54:56)/(unit*renderWidth);
    goal[1]=m.origin[1]+(isArm?-54:-39)/(unit*renderHeight);
    const mount=(isArm?m.arms:m.legs)[0][0],lens=(isArm?armLengths:legLengths)[0];
    const reach=lens[0]+lens[1]-.08,dy=goal[1]-mount[1]-offset[1];
    if(Math.abs(dy)>reach*.92)offset[1]+=dy-Math.sign(dy)*.92*reach;
    const vert=goal[1]-mount[1]-offset[1],horizontal=Math.sqrt(Math.max(.01,reach*reach-vert*vert));
    const shift=Math.max(0,goal[0]-mount[0]-offset[0]-(isArm?lean:0)-horizontal);
    if(isArm)lean+=shift;else offset[0]+=shift;
  }
  const pose=(bones,goals,lens,bends,xLean)=>bones.map((bone,i)=>{
    const root=[bone[0][0]+offset[0]+xLean,bone[0][1]+offset[1]];
    return twoBone(root,goals[i],lens[i][0],lens[i][1],bends[i]);
  });
  const arms=pose(m.arms,hands,armLengths,[1,1],lean);
  const legs=pose(m.legs,feet,legLengths,[-1,1],0);
  const hip=[m.hip[0]+offset[0],m.hip[1]+offset[1]];
  const shoulder=[m.shoulder[0]+offset[0]+lean,m.shoulder[1]+offset[1]];
  let opacity=1;
  if(state==='respawn')opacity=mix(.4,1,phase);
  if(state==='defeat')opacity=1-.55*clamp((elapsed-1)/.5);
  return {m,arms,legs,hip,shoulder,offset,lean,rotation:0,opacity,state,clip:state,phase,
    frame:art.index,frameCount:clip.frames.length,open:art.open,sole:art.sole,
    moving:isGait?1:0,run:state==='run'||state==='v2-run'||state==='speed'?1:0,
    extension:contact?1:attacks.has(state)?Math.max(0,1-Math.abs(phase-.4)/.4):0,
    head:[m.head[0]+offset[0]+lean,m.head[1]+offset[1]],headTilt:art.headTilt,unitScale:unit};
}
export function sampleStyleCMotion(model,look,hero,time,options={}) {
  const state=chooseClip(hero,options),clock=clockFor(state,hero,time,options);
  const key=options.motionFrame??hero.visualFrame;
  if(Number.isInteger(key) && key>=0 && key<STYLE_C_MOTIONS[state].frames.length)
    return styleCMotionKey(model,look,state,key,options.unit||.35);
  return sample(model,look,state,clock.phase,clock.contact,options.unit||.35,hero.defeatAge||0);
}
// Exposing the actual key sampler also keeps the packed cel builder and the
// visual review from reconstructing slightly different versions of each pose.
export function styleCMotionKey(model,look,state,index,unit=.35) {
  const clip=STYLE_C_MOTIONS[state],phase=clip.stops[index];
  return sample(model,look,state,phase,!!clip.frames[index].hit,unit,phase*clip.duration);
}
export function motionFrameSample(clipName,frameIndex) {
  const clip=STYLE_C_MOTIONS[clipName];
  if(!clip || !Number.isInteger(frameIndex) || frameIndex<0 || frameIndex>=clip.frames.length)
    throw new RangeError('Unknown Style C animation frame');
  const phase=clip.stops[frameIndex],time=phase*clip.duration;
  const hero={...previewHero(clipName,time),visualClip:clipName,visualFrame:frameIndex};
  if(attacks.has(clipName)){
    const kind=clipName.includes('kick')||clipName==='superKick'?'kick':'punch',a=ATTACKS[kind];
    const age=phase<.4?a.startup*phase/.4:phase===.4?a.startup+a.active*.5:
      a.startup+a.active+(a.duration-a.startup-a.active)*(phase-.4)/.6;
    hero.attack={kind,age,face:1,...(['strength','superKick'].includes(clipName)?{power:clipName}:{})};
  }
  return {hero,time,options:{poseName:clipName,motionFrame:frameIndex}};
}
