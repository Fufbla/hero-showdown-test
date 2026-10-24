(function(root){
'use strict';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const POOLS=[{x:190,y:604},{x:410,y:604},{x:640,y:604},{x:865,y:604},{x:1090,y:604}];
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
function random(seed){let s=seed>>>0;return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
class Encounter{
 constructor(options={}){
  this.rng=options.random||random(options.seed??Date.now());this.round=options.round===2?2:1;this.limit=30;this.spawned=0;this.defeated=0;
  this.serial=0;this.originalDefeated=0;this.offspringSpawned=0;this.offspringDefeated=0;this.splitCount=0;this.spawnDelay=0;this.batchDepth=0;
  this.enemies=[];this.remains=[];this.splits=[];this.events=[];this.pools=POOLS.map((p,i)=>({...p,id:i,base:true,born:0}));this.poolSerial=5;this.lastSpawn=-1000;this.typeQueue=[];
  this.time=0;this.phase='fight';this.maxSlots=0;this.player={x:640,y:604};this.fill();
 }
 shuffle(items){for(let i=items.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;}
 nextType(){
  if(!this.typeQueue.length){const pairs=this.shuffle([['ground','ground'],['jump','jump'],['ground','jump']]);this.typeQueue=pairs.flatMap(p=>this.rng()<.5?p:p.slice().reverse());}
  return this.typeQueue.shift();
 }
 fill(){
  while(this.enemies.length<2&&this.spawned<this.limit&&this.phase==='fight'&&this.spawnDelay<=0&&!this.batchDepth){
   // Continuous ground positions, not fixed spawn lanes. A new oily opening
   // is visible for the whole bubbling stage before any creature emerges.
   let x=640,best=-Infinity;
   for(let attempt=0;attempt<48;attempt++){
    const candidate=110+this.rng()*1060;
    const clearance=Math.min(Math.abs(candidate-this.player.x)-170,Math.abs(candidate-this.lastSpawn)-130,...this.enemies.map(e=>Math.abs(candidate-e.x)-155));
    if(clearance>best){x=candidate;best=clearance;}if(clearance>=0)break;
   }
   const i=this.poolSerial++,p={id:i,x,y:604,born:this.time,base:false};this.pools.push(p);this.lastSpawn=x;
   const e={id:++this.serial,originalNumber:++this.spawned,generation:0,type:this.nextType(),pool:i,x:p.x,y:p.y,prevX:p.x,prevY:p.y,face:p.x<this.player.x?1:-1,
    state:'bubble',age:0,cycle:this.rng()*6,delay:.28+this.rng()*.4,hitFlash:0,wrongUntil:0,stagger:0,damageDone:false};
   this.enemies.push(e);this.events.push({type:'spawn',id:e.id,pool:i,x:p.x,y:p.y,enemyType:e.type});
  }
  this.maxSlots=Math.max(this.maxSlots,this.enemies.length);
 }
 hurtbox(e){return {x:e.x-83,y:e.y-183,w:166,h:177};}
 airborne(e){return e.y<604-.5;}
 vulnerable(e){return !['bubble','emerge','split'].includes(e.state);}
 strike(attack){
  if(this.phase!=='fight')return [];
  const results=[];attack.targets=attack.targets||new Set();
  for(const e of this.enemies.slice()){
   if(!this.vulnerable(e)||attack.targets.has(e.id)||!overlap(attack.box,this.hurtbox(e)))continue;
   // Facing and the swept limb volume matter; a strike cannot hit behind her.
   if((e.x-attack.origin)*attack.face < -38)continue;
   attack.targets.add(e.id);
   const isKick=attack.key==='kick'||attack.key==='sweep',isPunch=attack.key==='punch'||attack.key==='uppercut';
   // The creature's current position decides the move, never its AI type.
   const correct=this.airborne(e)?isPunch:isKick;
   if(correct){this.defeat(e,attack.face);results.push({id:e.id,defeated:true,x:e.x,y:e.y-75});}
   else if(this.time>=e.wrongUntil){e.hitFlash=.16;e.wrongUntil=this.time+.35;this.events.push({type:'resist',id:e.id,x:e.x,y:e.y-80});results.push({id:e.id,defeated:false});}
  }
  return results;
 }
 defeat(e,dir,options={}){
  const index=this.enemies.indexOf(e);if(index<0||(!options.special&&!this.vulnerable(e))||this.phase!=='fight')return false;
  this.enemies.splice(index,1);this.defeated++;
  if(e.generation===0)this.originalDefeated++;else this.offspringDefeated++;
  // Count original defeats, not spawn IDs or offspring kills.
  const splitting=this.round===2&&e.generation===0&&this.originalDefeated%2===0;
  if(splitting)this.split(e);
  else this.remains.push({...e,dir,life:.52,max:.52});
  this.events.push({type:'defeat',id:e.id,x:e.x,y:e.y-65,defeated:this.defeated,enemyType:e.type,generation:e.generation,splitting});
  if(!this.batchDepth){this.fill();this.checkComplete();}
  return true;
 }
 split(parent){
  const center=clamp(parent.x,206,1074),children=[];this.splitCount++;
  for(let i=0;i<2;i++){
   const x=center+(i?96:-96),e={id:++this.serial,generation:1,parentId:parent.id,type:parent.type,pool:null,x,y:604,prevX:x,prevY:604,face:i?1:-1,
    state:'split',age:0,cycle:this.rng()*6,delay:.5+i*.25,hitFlash:0,wrongUntil:0,stagger:0,damageDone:false};
   this.enemies.push(e);children.push(e.id);this.offspringSpawned++;
  }
  this.splits.push({x:parent.x,y:parent.y,toX:center,age:0,duration:.95,children,purged:false});
  this.maxSlots=Math.max(this.maxSlots,this.enemies.length);
  this.events.push({type:'split',id:parent.id,ordinal:this.originalDefeated,children,x:parent.x,y:parent.y});
 }
 checkComplete(){
  if(this.phase==='fight'&&!this.batchDepth&&this.originalDefeated===this.limit&&!this.enemies.length&&!this.splits.length){
   this.phase='victory';this.events.push({type:'complete',defeated:this.defeated,spawned:this.spawned,offspring:this.offspringSpawned,round:this.round});
  }
 }
 clearVenue(dir,hold=1.2){
  if(this.phase!=='fight')return 0;
  const before=this.defeated;this.spawnDelay=Math.max(this.spawnDelay,hold);this.batchDepth++;
  for(const e of this.enemies.slice())this.defeat(e,dir,{special:true});
  // A special also destroys newly divided offspring and unfinished splits.
  // Keep the split visual, then dissolve it in the same blast.
  for(const e of this.enemies.slice())this.defeat(e,dir,{special:true});
  for(const s of this.splits)s.purged=true;
  this.batchDepth--;this.checkComplete();return this.defeated-before;
 }
 repel(x,range,dir){
  for(const e of this.enemies){if(!this.vulnerable(e)||Math.abs(e.x-x)>range)continue;
   e.stagger=Math.max(e.stagger,.65);e.hitFlash=.12;
   // Add a decaying impulse without moving the current point of the arc.
   if(e.state==='air')e.pushVelocity=clamp((e.pushVelocity||0)+dir*150,-240,240);
   else{e.x=clamp(e.x+dir*45,110,1170);e.state=e.type==='ground'?'crawl':'recover';e.age=0;e.delay=.6;}
  }
 }
 step(dt,player){
  if(!Number.isFinite(dt)||dt<=0)return;
  // The game supplies fixed 1/120-second steps; cap external callers safely.
  dt=Math.min(dt,.05);this.time+=dt;this.player={x:clamp(player.x,110,1170),y:player.y};
  for(const d of this.remains){d.life-=dt;d.x=clamp(d.x+d.dir*45*dt,110,1170);d.y=Math.min(604,d.y+140*dt);}
  this.remains=this.remains.filter(d=>d.life>0);
  for(const s of this.splits){
   s.age+=dt;
   if(s.age>=s.duration)for(const id of s.children){const e=this.enemies.find(e=>e.id===id);if(e&&e.state==='split'){e.state=e.type==='ground'?'crawl':'recover';e.age=0;e.stagger=.18;this.events.push({type:'offspring-ready',id:e.id,parentId:e.parentId});}}
  }
  this.splits=this.splits.filter(s=>s.age<s.duration);
  this.pools=this.pools.filter(p=>p.base||this.time-p.born<10||this.enemies.some(e=>e.pool===p.id));
  if(this.phase!=='fight')return;
  this.spawnDelay=Math.max(0,this.spawnDelay-dt);this.fill();this.checkComplete();if(this.phase!=='fight')return;
  for(const e of this.enemies){
   e.prevX=e.x;e.prevY=e.y;e.age+=dt;e.hitFlash=Math.max(0,e.hitFlash-dt);e.stagger=Math.max(0,e.stagger-dt);
   if(e.state==='split')continue;
   if(e.state==='bubble'){if(e.age>=.38){e.state='emerge';e.age=0;}continue;}
   if(e.state==='emerge'){if(e.age>=.72){e.state=e.type==='ground'?'crawl':'recover';e.age=0;this.events.push({type:'emerged',id:e.id,pool:e.pool});}continue;}
   const distance=player.x-e.x,dir=Math.sign(distance)||e.face;
   if(e.state!=='air'&&e.state!=='strike')e.face=dir;
   if(e.state!=='air'&&e.stagger>0)continue;
   const pace=1+this.originalDefeated/90;
   if(e.type==='ground'){
    if(e.state==='crawl'){
     if(Math.abs(distance)>114){const dx=dir*81*pace*dt;e.x+=dx;e.cycle+=Math.abs(dx)/23;}
     else{e.state='warn';e.age=0;e.damageDone=false;}
    }else if(e.state==='warn'){
     if(Math.abs(distance)>185){e.state='crawl';e.age=0;}
     else if(e.age>=.62){e.state='strike';e.age=0;e.attackFace=e.face;}
    }else if(e.state==='strike'){
     if(e.age<.17)e.x+=e.attackFace*95*dt;
     if(!e.damageDone&&e.age>=.18){e.damageDone=true;if(Math.abs(player.x-e.x)<150&&player.y>604-90&&(player.x-e.x)*e.attackFace>-35)this.events.push({type:'attack',id:e.id,x:e.x,damage:9});}
     if(e.age>=.44){e.state='recover';e.age=0;e.delay=.78;}
    }else if(e.state==='recover'&&e.age>=e.delay){e.state='crawl';e.age=0;}
   }else{
    if(e.state==='recover'){
     // Give a close-range jumper room for a readable arc; never leave the sand.
     if(Math.abs(distance)<205){const away=-dir,next=e.x+away*115*dt;e.x=clamp(next,110,1170);e.cycle+=dt*6;}
     if(e.age>=e.delay+.30){e.state='windup';e.age=0;}
    }else if(e.state==='windup'){
     if(e.age>=.65){e.state='air';e.age=0;e.from=e.x;e.to=clamp(player.x+dir*75,110,1170);e.airOffset=0;e.pushVelocity=0;e.height=140+this.rng()*16;e.duration=1.16+this.rng()*.10;e.damageDone=false;e.face=dir;this.events.push({type:'leap',id:e.id,x:e.x});}
    }else if(e.state==='air'){
     const p=clamp(e.age/e.duration,0,1);e.airOffset=(e.airOffset||0)+(e.pushVelocity||0)*dt;e.pushVelocity=(e.pushVelocity||0)*Math.exp(-5*dt);
     e.x=e.from+(e.to-e.from)*p+e.airOffset;e.y=604-4*e.height*p*(1-p);
     const near=Math.abs(player.x-e.x)<63;
     const body={x:e.x-51,y:e.y-112,w:102,h:86},target={x:player.x-34,y:player.y-240,w:68,h:218};
     if(!e.damageDone&&p>.16&&p<.94&&near&&overlap(body,target)){e.damageDone=true;this.events.push({type:'attack',id:e.id,x:e.x,damage:11});}
     if(p>=1){e.y=604;e.state='land';e.age=0;}
    }else if(e.state==='land'&&e.age>=.24){e.state='recover';e.age=0;e.delay=.62+this.rng()*.25;}
   }
   e.x=clamp(e.x,110,1170);
  }
 }
 drain(){return this.events.splice(0);}
}
const api={Encounter,POOLS,overlap,random};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.HealthiaShoreCore=api;
})(typeof window!=='undefined'?window:globalThis);
