// Approved 24-pose Style C artwork for the isolated 0000000000 test hero.
// This optional atlas is separate from cloud characters and gameplay physics.
// The sheet must be the transparent 6x4, 256px-cell derivative of the approved
// image, *not* the original labeled concept board with opaque scenery panels.
export const APPROVED_MOTION_VERSION='approved-style-c-24-v1';
export const APPROVED_MOTION_ATLAS=Object.freeze({
  file:'approved/approved-action-atlas.avif',
  cols:6,rows:4,cell:256,anchorX:128,anchorY:232
});
export const APPROVED_POSES=Object.freeze([
 'idle-right','idle-left','run-right','run-left','jump-right','jump-left',
 'double-right','double-left','strength-windup','strength-impact',
 'kick-windup','kick-impact','fireball-charge','fireball-release',
 'steel','roots','whirlwind','agility','flight','speed','merge',
 'strength-left','kick-left','fireball-left'
]);
const idx=Object.freeze(Object.fromEntries(APPROVED_POSES.map((name,i)=>[name,i])));
const seconds=value=>Number.isFinite(value)?Math.max(0,value):0;
export function selectApprovedPose(hero={},game={}){
  if(hero.dead||hero.stun>0)return null;
  const left=(hero.attack?.face||hero.face||1)<0;
  const active=game?.powers?.active||{};
  const attack=hero.attack;
  if(attack?.kind){
    const age=seconds(attack.age);
    if(attack.power==='strength')return left?idx['strength-left']:(age<.13?idx['strength-windup']:idx['strength-impact']);
    if(attack.power==='superKick')return left?idx['kick-left']:(age<.13?idx['kick-windup']:idx['kick-impact']);
    return null; // Let original game own other attack poses.
  }
  if((hero.castAge??Infinity)<.24)
    return left?idx['fireball-left']:(seconds(hero.castAge)<.12?idx['fireball-charge']:idx['fireball-release']);
  if(hero.flying||active.flight)return idx.flight;
  if(game?.legendary?.active&&(game?.mergeEffects?.length||game?.mergeShots?.length))return idx.merge;
  if(active.steel||hero.steel)return idx.steel;
  if(active.roots)return idx.roots;
  if(active.whirlwind)return idx.whirlwind;
  if((hero.dodgeAge??Infinity)<.22||hero.agile&&Math.abs(hero.vx||0)<25)return idx.agility;
  if(hero.grounded===false)return left?idx[hero.jumps>=2?'double-left':'jump-left']:idx[hero.jumps>=2?'double-right':'jump-right'];
  if(Math.abs(hero.vx||0)>25){
    if(Number(game?.powers?.speed)>0&&Math.abs(hero.vx||0)>180)return idx.speed;
    // Only one approved frame per facing: avoid a fake sliding run loop.
    // Keep old multi-frame run atlas until a genuine run-cycle is authored.
    return null;
  }
  return left?idx['idle-left']:idx['idle-right'];
}
export class ApprovedMotionSprites{
 constructor({loader=null}={}){this.loader=loader;this.image=null;this.loading=null;this.error=null;}
 async preload(){
  if(this.image)return true;
  if(this.loading)return this.loading;
  const load=this.loader||(()=>new Promise((resolve,reject)=>{
   if(typeof Image==='undefined'){reject(Error('Browser image API unavailable'));return;}
   const image=new Image();image.decoding='async';
   image.onload=()=>resolve(image);
   image.onerror=()=>reject(Error('Approved Style C atlas not installed; original animation retained'));
   image.src=new URL('./'+APPROVED_MOTION_ATLAS.file,import.meta.url).href;
  }));
  this.loading=(async()=>{
   try{
    const image=await load();
    if(image.width!==APPROVED_MOTION_ATLAS.cols*APPROVED_MOTION_ATLAS.cell||
       image.height!==APPROVED_MOTION_ATLAS.rows*APPROVED_MOTION_ATLAS.cell)
      throw Error('Approved Style C atlas has incorrect dimensions');
    this.image=image;this.error=null;return true;
   }catch(error){this.error=error.message;return false;}
   finally{this.loading=null;}
  })();
  return this.loading;
 }
 draw(ctx,x,y,hero,game,scale=1){
  if(!this.image||!(scale>0))return false;
  const frame=selectApprovedPose(hero,game);
  if(frame===null)return false;
  const meta=APPROVED_MOTION_ATLAS,cell=meta.cell;
  const sourceX=(frame%meta.cols)*cell,sourceY=Math.floor(frame/meta.cols)*cell;
  const worldSize=176*scale;
  ctx.save();
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(this.image,sourceX,sourceY,cell,cell,
   x-worldSize*meta.anchorX/cell,y-worldSize*meta.anchorY/cell,worldSize,worldSize);
  ctx.restore();
  return true;
 }
}
export const approvedMotionSprites=new ApprovedMotionSprites();
