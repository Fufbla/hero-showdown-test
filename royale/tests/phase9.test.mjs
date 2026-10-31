import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STEP,decodeSave} from '../core.mjs';
import {WORLD_REGIONS,TYPES,VERTICAL_ROUTES,VERTICAL_TIERS,regionSurfaces,regionSpawns} from '../world.mjs';
import {trackCamera,inView} from '../camera.mjs';
import {CLOCK} from '../progression.mjs';
const tick=(g,n,input={})=>{for(let i=0;i<n;i++)g.step(STEP,typeof input==='function'?input(i):input);};
const game=id=>{const g=new Game({random:()=>.99});g.travel(id);g.hero.invulnerable=1000;return g;};
export function climb(g,from,to){
  const h=g.hero;Object.assign(h,{x:from?from.x+from.w-35:to.x+35,y:from?.y??600,vx:0,vy:0,grounded:true,jumps:0,coyote:.1});
  let double=false,landed=false;const target=to.x+70;
  for(let f=0;f<180;f++){
    const jump=f===0||(!double&&h.jumps===1&&h.vy>-70);
    if(f>0&&jump)double=true;
    g.step(STEP,{jump,move:h.x<target?1:0,run:true});
    if(f>5&&h.grounded&&Math.abs(h.y-to.y)<.01&&h.x>to.x&&h.x<to.x+to.w){landed=true;break;}
  }
  return landed;
}
for(const r of WORLD_REGIONS){
 test(`P9 ${r.name}: all three four-tier routes reached with unmodified double jump`,()=>{
   const g=game(r.id);g.enemies=[];
   for(const route of VERTICAL_ROUTES){let previous=null;for(const step of route){const dest=g.surfaces.find(s=>s.id===step.id);assert.ok(climb(g,previous,dest),`${r.id} ${dest.id} from ${previous?.id}: ${g.hero.x},${g.hero.y}`);assert.equal(g.hero.jumps,0);previous=dest;}}
 });
 test(`P9 ${r.name}: 24 stable homes across every elevation and safe bounded patrol`,()=>{
   const g=game(r.id);g.hero.x=160;g.hero.y=600;
   assert.equal(g.enemies.length,24);assert.equal(new Set(g.enemies.map(e=>e.id)).size,24);
   const tiers=new Set(g.enemies.map(e=>e.spawnSurface.y));for(const y of [600,...VERTICAL_TIERS])assert.ok(tiers.has(y),`missing ${y}`);
   for(const e of g.enemies){assert.ok(e.x-e.w/2>=e.surface.x&&e.x+e.w/2<=e.surface.x+e.surface.w);assert.equal(e.y,e.surface.y-(e.flying?50:0));}
   for(let i=0;i<1000;i++)for(const e of g.enemies)g.stepEnemy(e,STEP);
   for(const e of g.enemies){assert.ok(e.x-e.w/2>=e.surface.x&&e.x+e.w/2<=e.surface.x+e.surface.w);if(!e.flying)assert.equal(e.y,e.surface.y);}
 });
 test(`P9 ${r.name}: all elevated homes respawn at their surface without overlapping hero`,()=>{
   const g=game(r.id);
   for(const e of g.enemies.filter(e=>e.surface.oneWay)){
     e.protection=0;g.damageEnemy(e,e.maxHp);e.respawn=0;g.hero.x=e.spawnX;g.hero.y=e.spawnSurface.y;g.stepEnemy(e,STEP);assert.equal(e.state,'dead');
     g.hero.x=160;g.hero.y=600;g.stepEnemy(e,STEP);assert.equal(e.hp,e.maxHp);assert.equal(e.y,e.spawnSurface.y-(e.flying?50:0));assert.equal(e.desperate,false);
   }
 });
}
for(const [type,info] of Object.entries(TYPES)){
 test(`P9 ${info.name}: threshold has no displacement; wounded elevated pursuit and attacks persist`,()=>{
   const g=game(info.region),surface=g.surfaces.find(s=>s.id==='climb-0-3');
   const e=g.makeEnemy(type,surface.x+70,surface.id,100);g.enemies=[e];e.protection=0;
   Object.assign(g.hero,{x:surface.x+260,y:surface.y,level:99,hp:100000,maxHp:100000});
   const x=e.x,y=e.y,damage=g.monsterDamage(e);g.damageEnemy(e,e.maxHp*.5,{stagger:false});
   assert.equal(e.x,x);assert.equal(e.y,y);assert.ok(e.desperate);assert.equal(g.monsterDamage(e),damage);
   let attack=false,minDistance=999;const initialDistance=Math.abs(g.hero.x-e.x);
   for(let i=0;i<480;i++){g.step(STEP);attack ||= e.state==='strike'||e.pouncing||g.enemyShots.length>0;minDistance=Math.min(minDistance,Math.abs(g.hero.x-e.x));}
   assert.ok(attack,'never attacked');assert.ok(minDistance<initialDistance||['spore','bolt','acid','spit','orb','pulse','volley'].includes(info.behavior));
   if(!info.flying)assert.ok(Math.abs(e.y-surface.y)<1||e.airborne);
   assert.equal(g.monsterDamage(e),damage);assert.equal(e.maxHp,info.hp);
 });
}
test('P9 ordinary flinches never restart attack telegraph or create permanent hit stun',()=>{
 const g=game(1),e=g.makeEnemy('bottle',1020,'sand-a',0);g.enemies=[e];g.hero.x=1060;g.hero.level=99;e.protection=0;e.hp=e.maxHp=10000;e.state='warn';e.age=.5;
 let attacks=0;for(let i=0;i<300;i++){g.damageEnemy(e,1);g.step();if(e.state==='strike')attacks++;}
 assert.ok(attacks>0);assert.ok(e.stagger<.05);assert.ok(e.hp<10000);assert.ok(e.x>950);
});
test('P9 down+jump drops through only current ledge and resets on next landing',()=>{
 const g=game(1);g.enemies=[];Object.assign(g.hero,{x:850,y:320,grounded:true,jumps:0});g.step(STEP,{jump:true,vertical:1});assert.equal(g.hero.grounded,false);assert.ok(g.hero.y>320);tick(g,90);assert.ok(g.hero.grounded);assert.ok(g.hero.y>320);assert.equal(g.hero.jumps,0);
});
test('P9 vertical camera keeps hero visible through maximum climbs and long falls without snapping',()=>{
 for(const height of [480,720]){const c={x:0,y:0},h={x:1500,y:600,h:88};trackCamera(c,h,700,height,STEP,{reset:true});let previous=c.y;for(let i=0;i<500;i++){h.y=i<250?600-i*3.4:-250+(i-250)*3.4;trackCamera(c,h,700,height,STEP);if(i>90)assert.ok(h.y-h.h>c.y-1&&h.y<c.y+height);assert.ok(Math.abs(c.y-previous)<26);previous=c.y;}assert.ok(inView(h.x-20,h.y-88,40,88,c,700,height));}
});
test('P9 all new heights persist through v8 manual save with appearance and progress unchanged',()=>{
 for(const y of VERTICAL_TIERS){const g=game(4);g.enemies=[];Object.assign(g.hero,{x:1540,y,level:65,xp:731,coins:928});g.powers.data.points=64;g.healthRoots=3;g.look.hair='braids';const save=decodeSave(g.save());assert.ok(save);const loaded=new Game({save});assert.equal(loaded.hero.y,y);assert.equal(loaded.hero.x,1540);assert.equal(loaded.hero.xp,731);assert.equal(loaded.look.hair,'braids');assert.equal(loaded.healthRoots,3);}
});
test('P9 desperation leaves separate nighttime rules intact',()=>{
 const g=game(5),e=g.enemies[0];e.protection=0;g.damageEnemy(e,e.maxHp*.5);g.now=()=>g.world.clockReference+CLOCK.day+1;assert.equal(g.monsterDamage(e),TYPES[e.type].damage*2);assert.equal(e.maxHp,TYPES[e.type].hp);
});

import {CapeCloth} from '../cape.mjs';
import {poseFor,previewHero,CAPE_LENGTH} from '../hero-rig.mjs';
import {POWER_IDS} from '../powers.mjs';
test('P9 cape has fixed 48-unit length, connected links and no floor clipping through every motion',()=>{
 for(const build of ['slender','strong','full']){
  const cloth=new CapeCloth();for(let i=0;i<3600;i++){
   const t=i/60,h=previewHero(['idle','run','jump','double-jump','fall','land','punch','kick','flight'][Math.floor(i/80)%9],t),p=poseFor({build,height:i%2?.88:1.12,cape:true},h,t),chain=cloth.advance(p,h,t,STEP);
   assert.deepEqual(chain[0],p.cape[0]);let length=0;for(let j=1;j<chain.length;j++){const len=Math.hypot(chain[j][0]-chain[j-1][0],chain[j][1]-chain[j-1][1]);assert.ok(Math.abs(len-CAPE_LENGTH/8)<1e-6);assert.ok(chain[j].every(Number.isFinite));if(p.grounded)assert.ok(chain[j][1]<=-4+1e-6);length+=len;}assert.ok(Math.abs(length-48)<1e-6);
  }
 }
});
for(const tier of [1,2,3,4])for(const power of POWER_IDS){
 test(`P9 ${power} remains functional on elevated tier ${tier}`,()=>{
  const g=game(1),s=g.surfaces.find(s=>s.id===`climb-0-${tier}`);g.enemies=[];Object.assign(g.hero,{x:s.x+100,y:s.y,level:99,hp:1570,maxHp:1570,grounded:true,invulnerable:999});g.powers.data.levels[power]=20;g.powers.data.equipped=[power==='speed'?null:power,null,null];
  const e=g.makeEnemy(power==='fireball'?'bottle':'crawler',g.hero.x+45,s.id,0);e.hp=e.maxHp=100000;e.protection=0;e.stagger=999;g.enemies=[e];
  if(power==='speed'){assert.equal(g.powers.speed,.6);assert.equal(g.powers.attackRate,1.5);return;}
  assert.ok(g.powers.activate(power));const x=e.x;
  if(power==='flight'){assert.ok(g.powers.flying);g.step(STEP,{vertical:-1});assert.ok(g.hero.y<s.y);assert.equal(g.startAttack===undefined,false);assert.equal(g.powers.incoming(10,e),null);g.powers.end('flight');g.step();assert.ok(g.hero.vy>0);}
  else if(power==='steel'){assert.ok(g.powers.incoming(100,{boss:true})<=25);g.step(STEP,{jump:true});assert.ok(g.hero.y<s.y);}
  else if(power==='agility'){g.random=()=>.1;assert.equal(g.powers.incoming(100,e),null);g.step(STEP,{punch:true});assert.ok(g.hero.attack);}
  else {tick(g,90);assert.ok(e.hp<100000);if(power==='roots'){assert.equal(e.x,x);assert.equal(e.y,s.y);assert.ok(e.rooted);}if(power==='whirlwind'){assert.ok(e.lifted);assert.ok(e.y<s.y);g.powers.end('whirlwind');tick(g,120);assert.ok(!e.airborne);assert.equal(e.y,e.surface.y);}}
 });
}
test('P9 intended Strength and Villain Merge pushback remain; ordinary hits do not reset pursuit',()=>{
 const g=game(1),e=g.makeEnemy('crawler',1000,'sand-a',0);g.enemies=[e];e.hp=e.maxHp=10000;e.protection=0;
 g.damageEnemy(e,5000,{knock:18});assert.equal(e.x,1000);assert.ok(e.desperate);
 g.damageEnemy(e,1,{kind:'merge:sonic',knock:40});assert.equal(e.x,1040);
 g.hero.attack={power:'strength'};g.damageEnemy(e,1,{knock:18});assert.equal(e.x,1058);
});
import {Renderer} from '../renderer.mjs';
test('P9 pooled effects survive hero/region/arena resets without allocation or growth',()=>{
 const renderer=Object.create(Renderer.prototype);renderer.particles=Array.from({length:96},()=>({life:0}));renderer.particleCursor=0;const references=[...renderer.particles];
 for(let pass=0;pass<10;pass++){for(let i=0;i<80;i++)renderer.event({type:'hit',x:100,y:200});assert.equal(renderer.particles.length,96);assert.ok(renderer.particles.some(p=>p.life>0));renderer.clearParticles();assert.ok(renderer.particles.every(p=>p.life===0));assert.ok(renderer.particles.every((p,i)=>p===references[i]));}
});
