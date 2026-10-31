import { TYPES } from './world.mjs';
import { segmentHit } from './powers.mjs';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ranged=new Set(['spore','bolt','acid','spit','orb','pulse','volley']);
// State timers are attack timers, never damage-reaction timers. Desperation is a
// persistent pursuit state; it adds no damage, health, regeneration or displacement.
export function advancedEnemy(g,e,dt){
  const info=TYPES[e.type],h=g.hero,d=h.x-e.x,coast=info.region===1;
  const range=ranged.has(info.behavior)?310:info.behavior==='quake'?125:coast?65:85;
  const desperate=e.desperate=e.hp<=e.maxHp*.5;
  const peaceful=info.peaceful&&h.level<=3&&!e.provoked&&!desperate;
  const leash=desperate?Infinity:coast?225:400;
  const engaged=!h.dead&&!peaceful&&!g.isSafeCamp()&&Math.abs(h.x-e.spawnX)<leash&&Math.abs(h.y-e.y)<(e.flying?240:coast?62:95);
  const wander=coast?150:220;
  const left=Math.max(e.surface.x+e.w/2+5,engaged?0:e.spawnX-wander),right=Math.min(e.surface.x+e.surface.w-e.w/2-5,engaged?Infinity:e.spawnX+wander);
  if(e.flying){const targetY=engaged?h.y-45:e.surface.y-50-Math.sin(g.time*(info.behavior==='phase'?3:1.8)+e.id)*18;g.moveEnemyAir(e,e.x,e.y+clamp(targetY-e.y,-110*dt,110*dt));}
  const move=speed=>{const nx=clamp(e.x+e.face*speed*(e.rooted?.5:1)*dt,left,right);if(e.flying)g.moveEnemyAir(e,nx,e.y);else e.x=nx;};
  if(['patrol','chase','desperation','idle'].includes(e.state)){
    if(engaged){
      e.face=Math.sign(d)||e.face;e.state=desperate?'desperation':'chase';
      if(Math.abs(d)<range){e.state='warn';e.age=0;return;}
    }else{e.state='patrol';if(e.x<=left)e.face=1;else if(e.x>=right)e.face=-1;}
    // At a platform edge keep facing a tracked hero; never turn away in pursuit.
    move(info.speed*(info.behavior==='phase'?(1+Math.sin(g.time*3)*.35):1));
  }else if(e.state==='warn'&&e.age>=(coast?(e.type==='crawler'?.55:.7):Math.max(.38,.8-info.region*.045))){
    e.state='strike';e.age=0;e.hit=false;
    if(info.behavior==='pounce'||info.behavior==='hop'){e.airborne=true;e.vy=coast?-180:-260;e.airVx=e.face*(coast?95:info.speed*1.8);e.pouncing=true;}
  }else if(e.state==='strike'){
    if(!ranged.has(info.behavior))move(coast?(e.type==='crawler'?155:105):info.speed*(info.behavior==='skitter'?2.1:info.behavior==='lunge'?2:1.25));
    if(!e.hit&&e.age>=(coast?.06:.08)){
      e.hit=true;
      if(ranged.has(info.behavior)){
        const count=info.behavior==='volley'?3:info.behavior==='pulse'?2:1;
        const x=e.x+e.face*(e.w/2+8),y=e.y-e.h*.55,angle=Math.atan2(h.y-h.h*.5-y,h.x-x),speed=175+info.region*18;
        for(let i=0;i<count;i++)if(g.enemyShots.length<32){const a=angle+(i-(count-1)/2)*.16;g.enemyShots.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:2.6,source:e,color:info.color});}
      }else if(Math.abs(h.y-e.y)<(info.behavior==='slam'?85:65)&&Math.abs(h.x-e.x)<(coast?76:range)&&(h.x-e.x)*e.face>-20)g.hurt(g.monsterDamage(e),e.x,e);
    }
    if(e.age>(coast?.24:.28)){e.state='recover';e.age=0;}
  }else if(e.state==='recover'){
    // Continue tracking during the intentional attack recovery window.
    if(engaged){e.face=Math.sign(d)||e.face;if(Math.abs(d)>range)move(info.speed*.55);}
    if(e.age>=(coast?1.1:Math.max(.65,1.25-info.region*.06))){e.state=engaged?(desperate?'desperation':'chase'):'patrol';e.age=0;}
  }
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
