// Hero Showdown Royale: enemy-side Ground Roots and Whirlwind sprite VFX.
// The four frames in each atlas are arranged 2x2, row-major. Only the art
// disappears after two seconds; gameplay control and damage remain unchanged.
export const ENEMY_CONTROL_VFX_SECONDS=2;
export const ENEMY_CONTROL_VFX_SOURCES=Object.freeze({
  roots:new URL('./assets/vfx/ground-roots-trap.avif',import.meta.url).href,
  whirlwind:new URL('./assets/vfx/whirlwind-hit.avif',import.meta.url).href
});
const atlas=new Map();
function imageFor(kind){
  if(atlas.has(kind))return atlas.get(kind);
  const url=ENEMY_CONTROL_VFX_SOURCES[kind];
  if(!url||typeof Image==='undefined')return null;
  const entry={image:new Image(),ready:false,failed:false};
  entry.image.decoding='async';
  entry.image.onload=()=>{entry.ready=entry.image.naturalWidth>0&&entry.image.naturalHeight>0;};
  entry.image.onerror=()=>{entry.failed=true;console.warn('[Enemy control VFX] Asset unavailable:',url);};
  entry.image.src=url;atlas.set(kind,entry);return entry;
}
export function enemyControlFrame(kind,age){
  if(!Number.isFinite(age)||age<0||age>=ENEMY_CONTROL_VFX_SECONDS)return -1;
  if(kind==='roots')return age<.23?0:age<.52?1:age<1.15?2:3;
  if(kind==='whirlwind')return Math.floor(age*9)%4;
  return -1;
}
export function enemyControlAnchor(enemy,kind){
  if(!enemy)return null;
  const x=Number(enemy.x)||0;
  const feet=kind==='whirlwind'?(enemy.liftOrigin?.y??enemy.surface?.y??enemy.y):(enemy.surface?.y??enemy.y);
  const groundY=Number(feet)||0;
  const width=kind==='roots'
    ?Math.min(200,Math.max(78,(Number(enemy.w)||45)*1.9))
    :Math.min(225,Math.max(90,(Number(enemy.w)||45)*2.1));
  const height=kind==='roots'
    ?Math.min(135,Math.max(68,(Number(enemy.h)||65)*.96))
    :Math.min(170,Math.max(88,(Number(enemy.h)||65)*1.22));
  return {x,groundY,width,height};
}
function drawFrame(c,entry,frame,anchor,kind,age){
  if(!entry?.ready||frame<0||!anchor)return false;
  const image=entry.image,fw=image.naturalWidth/2,fh=image.naturalHeight/2;
  const scale=kind==='whirlwind'?1+Math.sin(age*22)*.045:1;
  const width=anchor.width*scale,height=anchor.height*scale;
  const dx=anchor.x-width/2,dy=anchor.groundY-height*.90;
  c.save();
  c.globalAlpha *= (kind === 'whirlwind' ? .78 : .94);
  // Four isolated frame cells; never draw the entire sprite sheet at once.
  c.drawImage(image,(frame%2)*fw,Math.floor(frame/2)*fh,fw,fh,dx,dy,width,height);
  c.restore();return true;
}
/**
 * Paint in the world's foreground, AFTER monsters. Roots wrap in front of
 * lower legs; the translucent cyclone shows its monster through the wind.
 * Each target gets its own hit art rather than a single effect at the
 * player's feet or a shared centroid.
 */
export function drawEnemyControlVfx(c,game){
  const handledRoots=new Set(),handledWind=new Set();
  const active=game?.powers?.active||{};
  for(const [kind,state] of [['roots',active.roots],['whirlwind',active.whirlwind]]){
    if(!state||!Array.isArray(state.targets))continue;
    const ready=imageFor(kind);
    const frame=enemyControlFrame(kind,state.age);
    for(const e of game.enemies||[]){
      if(e.state==='dead'||!state.targets.includes(e.id))continue;
      (kind==='roots'?handledRoots:handledWind).add(e.id);
      if(frame<0||!ready?.ready)continue;
      const anchor=enemyControlAnchor(e,kind);
      drawFrame(c,ready,frame,anchor,kind,state.age);
    }
  }
  return {handledRoots,handledWind,rootsReady:!!atlas.get('roots')?.ready,whirlwindReady:!!atlas.get('whirlwind')?.ready};
}