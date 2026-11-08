import {EqualXPAuthority} from './equal-xp-authority.mjs';
import {Game,decodeSave} from '../core.mjs';
import {encodeRuntime,decodeRuntime} from '../multiplayer/runtime.mjs';
import {expireLoot} from '../world-loot.mjs';
import {teleportFollower,safeLanding} from './teleport.mjs';
export {AUTOSAVE_MS} from './room-rules.mjs';

// Copy only the persisted graph, never the shared AI/projectile runtime. No live
// combat timers or arrays are mutated while preparing a checkpoint.
export function captureProgress(game){
 let g=game;if(g.hero.dead){g=decodeRuntime(encodeRuntime(game));g.respawn();}
 const h=g.hero,arena=g.pendingBossEntry||(g.arenaScene?(g.arenaScene.legendary?{legendary:g.arenaScene.legendary,mode:g.arenaScene.cleared?'cleared':'restart'}:{region:g.regionId,mode:g.arenaScene.cleared?'cleared':'restart'}):null);
 const checkpoint=g.world.checkpoint.region===g.regionId?{region:g.regionId,index:g.checkpoint}:g.world.checkpoint;
 const location=g.arenaScene?{...g.arenaScene.returnLocation,hp:h.hp,vx:0,vy:0,jumps:0}:{x:h.x,y:h.y,face:h.face,hp:h.hp,vx:h.vx,vy:g.powers.flying?Math.max(0,h.vy):h.vy,jumps:h.jumps};
 return structuredClone({version:8,loot:g.loot.filter(o=>o.expiresAt>g.now()).map(({localDropId,...o})=>o),legendary:{...g.legendary,recovery:g.mergeSnapshot()},economy:g.economy,sanctuary:g.sanctuary,bossProgress:g.bossProgress,arena,powers:g.powers.snapshot(),look:g.look,outfit:g.outfit,level:h.level,xp:h.xp,coins:h.coins,checkpoint:g.checkpoint,kills:g.kills,species:[...g.species],reachedEnd:g.reachedEnd,healthRoots:g.healthRoots,inventory:g.inventory,world:{...g.world,region:g.regionId,checkpoint,activated:[...new Set([...g.world.activated,`${checkpoint.region}:${checkpoint.index}`])],location,monsters:(g.arenaScene?.enemies||g.enemies).filter(e=>!e.boss&&!e.summoned).map(e=>({id:e.id,type:e.type,hp:e.hp,respawn:Math.max(0,e.respawn)}))}});
}
export class LocalSession {
 constructor(selections,{now=Date.now,allowSameAccount=false}={}){
  if(selections.length!==2)throw Error('Choose two heroes.');
  const keys=selections.map(s=>s.profile.identity+':'+s.slot);
  if(new Set(keys).size!==2)throw Error('Choose different heroes. One saved hero cannot be both players.');
  if(!allowSameAccount&&selections[0].profile.identity===selections[1].profile.identity)throw Error('Each player must sign in with their own account code.');
  const memory={initial:{version:1,tick:0,rooms:new Map(),heroes:new Map(),imports:new Map()},revision:0,commit(){this.revision++;}};
  this.authority=new EqualXPAuthority(memory,{capacity:2,maxConnections:2,now});this.selections=selections;this.active=new Set([0,1]);this.leaving=new Set();this.ready=[false,false];this.paused=true;this.sequence=[0,0];this.leader=0;
  this.heroes=selections.map((s,i)=>{
   const row=s.profile.slots.find(r=>r.slot_number===s.slot);if(!row?.snapshot||!decodeSave(JSON.stringify(row.snapshot)))throw Error('Choose an existing valid saved hero.');
   const h=this.authority.adopt(keys[i],{id:crypto.randomUUID(),slot:s.slot-1,snapshot:row.snapshot});this.authority.attach(h.owner,h.id,{close(){}});return h;
  });
  const [a,b]=this.heroes,lead=a.game,follow=b.game;
  if(lead.treeVisit)lead.leaveTree();if(follow.treeVisit)follow.leaveTree();
  // Reopening a cleared arena never gives the joining account a free victory.
  if(lead.arenaScene?.cleared){lead.leaveBoss('local-start');lead.combatTimer=0;}
  if(follow.arenaScene)follow.leaveBoss('local-start');
  follow.loadRegion(lead.regionId,{x:lead.hero.x,y:lead.hero.y});
  if(lead.arenaScene){if(lead.arenaScene.legendary)follow.startLegendaryScene(lead.arenaScene.legendary,'restart');else follow.startBossScene('restart');}
  const room=this.authority.mode(a.owner,a.id,'create');this.authority.mode(b.owner,b.id,'join',room.code);this.authority.startRoom(a);
  const land=safeLanding(b.game,a.game.hero,{x:Math.max(0,a.game.hero.x-500),y:a.game.hero.y-650,width:1000,height:850});
  if(land)Object.assign(b.game.hero,{x:land.x,y:land.y,prevX:land.x,prevY:land.y,vx:0,vy:0,grounded:true,jumps:0});
  this.heroes.forEach(h=>{h.game.paused=true;h.game.drain();});
 }
 get games(){return this.heroes.map(h=>h.game);}
 setPaused(value){this.paused=value;for(const i of this.active)this.heroes[i].game.paused=value;}
 pause(){this.setPaused(true);this.ready=[false,false];}
 markReady(i,value=true){
  if(!this.active.has(i)||this.leaving.size)return false;this.ready[i]=value;
  if([...this.active].every(n=>this.ready[n])){for(const n of this.active)if(this.games[n].treeVisit)this.command(n,'leaveTree');this.setPaused(false);return true;}return false;
 }
 step(actions,viewport){
  if(this.paused)return;
  for(const i of this.active){const h=this.heroes[i];this.authority.input(h.owner,h.id,++this.sequence[i],actions[i]||{});}
  const zones=this.games.map(g=>`${g.regionId}:${g.arenaScene?.legendary||!!g.arenaScene}`);
  this.authority.tick();
  // Automatic passages/arena exits also belong to the single shared world.
  const changed=[...this.active].find(i=>zones[i]!==`${this.games[i].regionId}:${this.games[i].arenaScene?.legendary||!!this.games[i].arenaScene}`);
  if(changed!==undefined&&changed!==this.leader)this.followScene(this.leader,changed);
  const lead=this.games[this.leader];
  for(const i of this.active)if(i!==this.leader){const g=this.games[i];if(g.regionId!==lead.regionId||!!g.arenaScene!==!!lead.arenaScene||g.arenaScene?.legendary!==lead.arenaScene?.legendary)this.followLeader(i);}
  if(this.active.size===2&&viewport)teleportFollower(this.games[1],lead.hero,viewport);
  this.authority.reconcileDrops();
 }
 followLeader(i){return this.followScene(i,this.leader);}
 followScene(i,source){
  const lead=this.games[source],g=this.games[i];if(g.treeVisit)g.leaveTree();
  if(g.arenaScene)g.leaveBoss('travel');g.loadRegion(lead.regionId,{x:lead.hero.x,y:lead.hero.y});
  if(lead.arenaScene){if(lead.arenaScene.legendary)g.startLegendaryScene(lead.arenaScene.legendary,'restart');else g.startBossScene('restart');}
  this.authority.bind(this.heroes[i]);
 }
 command(player,method,args=[]){
  if(!this.active.has(player))throw Error('This player has left.');
  const h=this.heroes[player];
  if(['travel','enterBoss','enterLegendary','returnCheckpoint'].includes(method)&&this.active.size===2){
   if([...this.active].some(i=>!this.games[i].canTravel()))return false;
   if(method==='enterLegendary'&&[...this.active].some(i=>this.games[i].hero.level<99||!this.games[i].powers.data.equipped.some(Boolean)))return false;
   // The requested destination becomes Player 1's scene first; the companion joins it.
   const leader=this.heroes[this.leader],result=this.authority.command(leader.owner,leader.id,leader.commandSeq+1,method,args);if(result===false)return false;
   for(const i of this.active)if(i!==this.leader)this.followLeader(i);this.setPaused(this.paused);return result;
  }
  const result=this.authority.command(h.owner,h.id,h.commandSeq+1,method,args);this.setPaused(this.paused);return result;
 }
 expireLoot(){for(const i of this.active)expireLoot(this.games[i]);this.authority.reconcileDrops();}
 visualLoot(){const drops=[],seen=new Set();for(const i of this.active)for(const o of this.games[i].loot){const key=o.localDropId?'shared-'+o.localDropId:`${i}:${o.id}`;if(!seen.has(key)){seen.add(key);drops.push(o);}}return drops;}
 async saveOne(i){if(!this.active.has(i))return {player:i,ok:true};try{const {profile,slot}=this.selections[i];await profile.save(slot,captureProgress(this.games[i]));return {player:i,ok:true};}catch(error){return {player:i,ok:false,error:error.message,conflict:!!this.selections[i].profile.blocked?.has(this.selections[i].slot)};}}
 saveAll(){return Promise.all([...this.active].map(i=>this.saveOne(i)));}
 async leave(i){
  if(!this.active.has(i))return {ok:true};this.leaving.add(i);this.pause();const saved=await this.saveOne(i);
  // On failure the player stays signed in with their pending checkpoint, allowing a safe retry.
  this.leaving.delete(i);if(!saved.ok)return saved;
  const h=this.heroes[i],room=this.authority.state.rooms.get(h.room);this.authority.detach(h.id,this.authority.connections.get(h.id));room.members.delete(h.id);this.authority.state.heroes.delete(h.id);this.active.delete(i);this.ready[i]=false;
  if(this.leader===i)this.leader=[...this.active][0]??null;
  if(this.active.size){room.code=null;room.hostId=this.heroes[this.leader].id;room.phase='playing';this.setPaused(this.leaving.size>0);}return saved;
 }
}
