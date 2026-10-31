import { TYPES } from './world.mjs';
import { segmentHit } from './powers.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ranged=new Set(['spore','bolt','acid','spit','orb','pulse','volley']);
export function advancedEnemy(g,e,dt){
  const info=TYPES[e.type],h=g.hero,d=h.x-e.x,scale=e.rooted?.5:1;
  const range=ranged.has(info.behavior)?310:info.behavior==='quake'?125:85;
  const left=Math.max(e.surface.x+e.w/2+5,e.spawnX-220),right=Math.min(e.surface.x+e.surface.w-e.w/2-5,e.spawnX+220);
  const engaged=!h.dead&&!g.isSafeCamp()&&Math.abs(h.x-e.spawnX)<400&&Math.abs(h.y-e.y)<(e.flying?180:95);
  if(e.flying){const targetY=e.surface.y-50-Math.sin(g.time*(info.behavior==='phase'?3:1.8)+e.id)*18;g.moveEnemyAir(e,e.x,e.y+clamp(targetY-e.y,-110*dt,110*dt));}
  const move=speed=>{const nx=clamp(e.x+e.face*speed*scale*dt,left,right);if(e.flying)g.moveEnemyAir(e,nx,e.y);else e.x=nx;};
  if(e.state==='patrol'){
    if(engaged&&Math.abs(d)<range){e.face=Math.sign(d)||e.face;e.state='warn';e.age=0;return;}
    if(engaged)e.face=Math.sign(d)||e.face;
    if(e.x<=left)e.face=1;if(e.x>=right)e.face=-1;
    move(info.speed*(info.behavior==='phase'?(1+Math.sin(g.time*3)*.35):1));
  }else if(e.state==='warn'&&e.age>=Math.max(.38,.8-info.region*.045)){
    e.state='strike';e.age=0;e.hit=false;
    if(info.behavior==='pounce'){e.airborne=true;e.vy=-260;e.airVx=e.face*info.speed*1.8;e.pouncing=true;}
  }else if(e.state==='strike'){
    if(!ranged.has(info.behavior))move(info.speed*(info.behavior==='skitter'?2.1:info.behavior==='lunge'?2:1.25));
    if(!e.hit&&e.age>=.08){
      e.hit=true;
      if(ranged.has(info.behavior)){
        const count=info.behavior==='volley'?3:info.behavior==='pulse'?2:1;
        const x=e.x+e.face*(e.w/2+8),y=e.y-e.h*.55,angle=Math.atan2(h.y-h.h*.5-y,h.x-x),speed=175+info.region*18;
        for(let i=0;i<count;i++)if(g.enemyShots.length<32){const a=angle+(i-(count-1)/2)*.16;g.enemyShots.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:2.6,source:e,color:info.color});}
      }else if(Math.abs(h.y-e.y)<(info.behavior==='slam'?85:65)&&Math.abs(h.x-e.x)<range&&(h.x-e.x)*e.face>-20)g.hurt(g.monsterDamage(e),e.x,e);
    }
    if(e.age>.28){e.state='recover';e.age=0;}
  }else if(e.state==='recover'&&e.age>Math.max(.65,1.25-info.region*.06)){e.state='patrol';e.age=0;}
}
export function stepEnemyProjectiles(g,dt){
  for(const p of g.enemyShots){
    if(p.gravity)p.vy+=p.gravity*dt;
    const nx=p.x+p.vx*dt,ny=p.y+p.vy*dt,h=g.heroBox();
    const hit=segmentHit(p.x,p.y,nx,ny,h,5),wall=g.surfaces.filter(s=>!s.oneWay).map(s=>segmentHit(p.x,p.y,nx,ny,s,5)).filter(t=>t!==null).sort((a,b)=>a-b)[0];
    if(hit!==null&&(wall===undefined||hit<wall)){g.hurt(p.damage??g.monsterDamage(p.source),p.x,p.source);p.life=0;}
    else if(wall!==undefined){if(p.bounce>0&&p.vy>0&&p.y<595){p.bounce--;p.vy=-Math.max(180,Math.abs(p.vy)*.7);p.y=589;}else p.life=0;}
    p.x=nx;if(!(wall!==undefined&&p.bounce>=0&&p.vy<0))p.y=ny;p.life-=dt;
  }
  g.enemyShots=g.enemyShots.filter(p=>p.life>0);
}
