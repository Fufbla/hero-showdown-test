import {overlaps} from '../core.mjs';
export const TELEPORT_MARGIN=32,TELEPORT_COOLDOWN=.6,TELEPORT_EFFECT=.3;
export function isOffscreen(hero,view,margin=TELEPORT_MARGIN){return hero.x+hero.w/2<view.x-margin||hero.x-hero.w/2>view.x+view.width+margin||hero.y<view.y-margin||hero.y-hero.h>view.y+view.height+margin;}
export function safeLanding(game,leader,view){
 const h=game.hero,candidates=[];
 for(const surface of game.surfaces){
  if(surface.w<h.w+16||surface.y<view.y+h.h+12||surface.y>view.y+view.height-12)continue;
  const min=Math.max(surface.x+h.w/2+8,view.x+h.w/2+16),max=Math.min(surface.x+surface.w-h.w/2-8,view.x+view.width-h.w/2-16);
  if(min>max)continue;
  for(const offset of [-64,64,-110,110,-170,170,-240,240,-340,340]){
   const x=Math.max(min,Math.min(max,leader.x+offset)),y=surface.y,box={x:x-h.w/2-5,y:y-h.h-5,w:h.w+10,h:h.h+5};
   if(Math.abs(x-leader.x)<h.w+12)continue;
   if(game.surfaces.some(s=>s!==surface&&!s.oneWay&&overlaps(box,s)))continue;
   if(game.enemies.some(e=>e.hp>0&&e.state!=='dead'&&overlaps(box,{x:e.x-e.w/2-24,y:e.y-e.h-12,w:e.w+48,h:e.h+24})))continue;
   if(game.legendaryHazards.some(a=>a.life>0&&overlaps(box,a)))continue;
   if(game.enemies.some(e=>e.state==='active'&&e.attack?.zones?.some(z=>overlaps(box,z))))continue;
   if(game.enemyShots.some(p=>p.life>0&&overlaps(box,{x:p.x-20,y:p.y-20,w:40,h:40})))continue;
   candidates.push({x,y,score:Math.hypot(x-leader.x,(y-leader.y)*1.4)});
  }
 }
 candidates.sort((a,b)=>a.score-b.score||a.x-b.x);return candidates[0]||null;
}
export function teleportFollower(game,leader,view){
 if(game.hero.dead||(game.localTeleportUntil||0)>game.time||!isOffscreen(game.hero,view))return false;
 const place=safeLanding(game,leader,view);if(!place)return false;
 const h=game.hero;
 if(game.powers.flying)game.powers.end('flight');
 Object.assign(h,{x:place.x,y:place.y,prevX:place.x,prevY:place.y,vx:0,vy:0,grounded:true,jumps:0,jumpBuffer:0,coyote:.1,dropThrough:null});
 game.localTeleportUntil=game.time+TELEPORT_COOLDOWN;game.teleportEffectUntil=game.time+TELEPORT_EFFECT;
 return true;
}
