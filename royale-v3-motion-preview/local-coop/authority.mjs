// Browser-local adaptation of the co-op authority at ce3fb345. No network transport.
const randomUUID=()=>globalThis.crypto.randomUUID();
const randomInt=max=>{const a=new Uint32Array(1),limit=2**32-(2**32%max);do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%max;};
import {MAX_ROOM_PLAYERS,MIN_ROOM_PLAYERS} from './room-rules.mjs';
import {Game,STEP,decodeSave,overlaps} from '../core.mjs';
import {TYPES} from '../world.mjs';
import {RESPAWN} from '../progression.mjs';
import {isBoss,segmentHit} from '../powers.mjs';
import {stepEnemyProjectiles} from '../monsters.mjs';
import {compactProjectiles,ProjectilePool} from '../projectiles.mjs';
import {encodeRuntime,decodeRuntime} from '../multiplayer/runtime.mjs';
import {pickupLoot} from '../world-loot.mjs';
import {PROTOCOL,inputPacket,consumeEdges,roomCode,sequence} from './protocol.mjs';

const key=g=>`${g.regionId}:${g.arenaScene?(g.arenaScene.legendary||'boss'):'world'}`;
const clone=o=>decodeRuntime(encodeRuntime(o));
const METHODS=new Set(['fastTravel','portalTravel','travel','enterBoss','enterLegendary','visitTree','leaveTree','upgradePower','equipPower','equipItem','buyCostume','buyHealthRoot','useHealthRoot','pickupLoot','applyMakeover','sellItem','discardItem','resolveReward','acceptReward','claimChest','claimMergeReward','equipMergeMix','activateMergeSet','returnNormalEquipment','returnCheckpoint']);
// Commands never leave this device; exact serialization is the retry signature.
const hash=JSON.stringify;
export class Authority {
  constructor(store,{capacity,maxConnections=capacity,now=Date.now,graceMs=30000,allowLegacyImport=false}={}) {
    if(!Number.isSafeInteger(capacity)||capacity<1||!Number.isSafeInteger(maxConnections)||maxConnections<capacity)throw Error('Set measured room and server capacities before starting.');
    this.store=store;this.state=store.initial;if(this.state.version!==1)throw Error('Unsupported authority schema. No state was overwritten.');this.allowLegacyImport=allowLegacyImport;this.capacity=capacity;this.maxConnections=maxConnections;this.now=now;this.graceMs=graceMs;this.inputs=new Map();this.connections=new Map();this.failed=false;this.overloaded=false;
    this.capacity=Math.min(capacity,MAX_ROOM_PLAYERS);
    // Existing durable rooms were already playing before lobbies were added.
    for(const r of this.state.rooms.values()){r.phase??='playing';r.hostId??=[...r.members][0];}
    for(const h of this.state.heroes.values()){h.connected=false;h.disconnectedAt=now();this.hook(h);}
  }
  commit(){if(this.failed)throw Error('Authority unavailable.');try{const result=this.store.commit(this.state);this.dirty=false;return result;}catch(e){this.failed=true;throw e;}}
  owner(owner,id){const h=this.state.heroes.get(id);if(!h||h.owner!==owner)throw Error('Hero is not available to this account.');return h;}
  list(owner){return [...this.state.heroes.values()].filter(h=>h.owner===owner).map(h=>({id:h.id,slot:h.slot,name:h.game.look.name,level:h.game.hero.level,room:this.state.rooms.get(h.room)?.code||null,revision:h.revision,commandSeq:h.commandSeq}));}
  create(owner,{slot,look,legacy=null,sourceId=null,confirmed=false}) {
    if(!owner||!Number.isInteger(slot)||slot<0||slot>2)throw Error('Invalid hero slot.');
    if([...this.state.heroes.values()].some(h=>h.owner===owner&&h.slot===slot))throw Error('That account slot already has a hero. No progress was overwritten.');
    let save=null;
    if(legacy){
      if(!this.allowLegacyImport)throw Error('Local import awaits verified account migration. Your local save is unchanged.');
      if(!confirmed||typeof sourceId!=='string'||sourceId.length<8||sourceId.length>160)throw Error('Confirm the one-time local import.');
      if(this.state.imports.has(sourceId))throw Error('This local hero was already imported.');
      save=decodeSave(JSON.stringify(legacy));if(!save)throw Error('The local save needs recovery.');
    }
    const game=new Game({save,look:save?.look||look,now:this.now});game.started=true;game.legendaryStorageReady=true;
    const h={id:randomUUID(),owner,slot,game,room:null,connected:false,disconnectedAt:this.now(),revision:1,commandSeq:0,lastCommand:null,imported:!!legacy};
    this.state.heroes.set(h.id,h);if(legacy)this.state.imports.set(sourceId,{owner,hero:h.id});
    this.newRoom(h,false);this.hook(h);this.commit();return h;
  }
  adopt(owner,reservation) {
    const {id,slot,snapshot}=reservation;
    if(typeof id!=='string'||!Number.isInteger(slot)||slot<0||slot>2)throw Error('Invalid migration reservation.');
    const existing=this.state.heroes.get(id);
    if(existing){if(existing.owner!==owner||existing.slot!==slot)throw Error('Migration ownership conflict.');return existing;}
    if(this.list(owner).some(h=>h.slot===slot))throw Error('Account slot changed during migration.');
    const save=decodeSave(JSON.stringify(snapshot));if(!save)throw Error('Reserved save requires recovery.');
    const game=new Game({save,now:this.now});game.started=true;game.paused=true;game.legendaryStorageReady=true;
    const h={id,owner,slot,game,room:null,connected:false,disconnectedAt:this.now(),revision:1,commandSeq:0,lastCommand:null,imported:true};
    this.state.heroes.set(id,h);this.newRoom(h,false);this.hook(h);this.commit();return h;
  }
  newRoom(h,publicRoom) {
    let code=null;
    if(publicRoom)do {code=String(randomInt(1000000)).padStart(6,'0');}while([...this.state.rooms.values()].some(r=>r.code===code));
    const r={id:randomUUID(),code,hostId:h.id,phase:publicRoom?'lobby':'playing',members:new Set([h.id]),worlds:new Map(),createdAt:this.now()};this.state.rooms.set(r.id,r);h.room=r.id;this.bind(h);return r;
  }
  connected(r){return [...r.members].map(id=>this.state.heroes.get(id)).filter(h=>h?.connected);}
  refreshHost(r){if(!r.members.has(r.hostId)||!this.state.heroes.get(r.hostId)?.connected)r.hostId=this.connected(r)[0]?.id||[...r.members][0]||null;}
  startRoom(h){
    const r=this.state.rooms.get(h.room);this.refreshHost(r);
    if(!r.code)throw Error('Create or join a multiplayer room first.');
    if(r.hostId!==h.id)throw Error('Only the room creator can start the adventure.');
    if(r.phase==='playing')return {started:true};
    if(this.connected(r).length<MIN_ROOM_PLAYERS)throw Error('At least two connected players are needed to start.');
    r.phase='playing';r.startedAt=this.now();
    // Waiting-room button presses must never execute when the room starts.
    for(const id of r.members){const pending=this.inputs.get(id);if(pending)pending.input={};}
    return {started:true};
  }
  attach(owner,id,connection) {
    const h=this.owner(owner,id);
    if(!this.connections.has(id)&&(this.connections.size>=this.maxConnections||this.overloaded))throw Error('Server capacity reached. Existing adventures remain connected. Please try again later.');
    const old=this.connections.get(id);if(old&&old!==connection)old.close(4001,'This hero resumed in another connection.');
    this.connections.set(id,connection);h.connected=true;h.disconnectedAt=null;this.inputs.set(id,{seq:0,input:{},at:this.now()});this.refreshHost(this.state.rooms.get(h.room));this.commit();return h;
  }
  detach(id,connection) {
    if(this.connections.get(id)!==connection)return;
    this.connections.delete(id);this.inputs.delete(id);const h=this.state.heroes.get(id);if(!h)return;
    h.connected=false;h.disconnectedAt=this.now();h.game.powers.cancelEffects();h.game.cancelMergeEffects();h.game.hero.attack=null;h.game.hero.attackBuffer=null;const room=this.state.rooms.get(h.room);this.refreshHost(room);for(const world of room.worlds.values())this.reconcileControls(room,world);this.commit();
  }
  mode(owner,id,mode,code,persist=true) {
    const h=this.owner(owner,id),old=this.state.rooms.get(h.room);
    if(!['solo','create','join'].includes(mode))throw Error('Unknown room action.');
    let target;
    if(mode==='join') {
      roomCode(code);target=[...this.state.rooms.values()].find(r=>r.code===code);if(!target)throw Error('Room code is not active.');
      if(target===old)return target;
      const reserved=[...target.members].filter(id=>{const p=this.state.heroes.get(id);return p.connected||this.now()-p.disconnectedAt<this.graceMs;}).length;
      if(reserved>=this.capacity||this.overloaded)throw Error('Room capacity reached. Up to five players can join, including the creator.');
    }
    if(mode==='solo'&&!old.code)return old;
    // Clone the authoritative graph, not a client snapshot: exact location, HP,
    // attack cooldowns and progression survive the transfer, including midair.
    h.game=clone(h.game);h.game.powers.cancelEffects();h.game.cancelMergeEffects();old.members.delete(id);this.refreshHost(old);for(const w of old.worlds.values())this.reconcileControls(old,w);this.hook(h);
    if(target){target.members.add(id);h.room=target.id;this.bind(h);}else target=this.newRoom(h,mode==='create');
    if(!old.members.size)this.state.rooms.delete(old.id);
    h.revision++;if(persist)this.commit();return target;
  }
  input(owner,id,n,raw) {
    const h=this.owner(owner,id),state=this.inputs.get(id);if(!h.connected||!state)throw Error('Connect this hero first.');sequence(n);
    if(n<=state.seq)return false;const parsed=inputPacket(raw);
    // Do not lose edge actions between simulation ticks. Movement remains latest.
    for(const k of ['jump','punch','kick','heal','interact','portal','tree','nextTarget'])parsed[k]||=!!state.input[k];
    parsed.powers=parsed.powers.map((v,i)=>v||!!state.input.powers?.[i]);
    state.seq=n;state.input=parsed;state.at=this.now();return true;
  }
  command(owner,id,n,method,args=[]) {
    const h=this.owner(owner,id);sequence(n);if(!Array.isArray(args)||args.length>4)throw Error('Invalid command arguments.');
    const signature=hash({n,method,args});
    if(n===h.commandSeq&&h.lastCommand?.signature===signature)return h.lastCommand.result;
    if(n!==h.commandSeq+1)throw Error('Command conflict. Refresh authoritative state before retrying.');
    let result;
    if(method==='mode')result={code:this.mode(owner,id,args[0],args[1],false).code};
    else if(method==='save')result={ok:true};
    else if(method==='startRoom')result=this.startRoom(h);
    else if(method==='pause'){if(typeof args[0]!=='boolean')throw Error('Invalid pause.');h.game.paused=args[0];result=true;}
    else {
      if(!METHODS.has(method))throw Error('Unsupported command.');
      if(this.state.rooms.get(h.room).phase==='lobby')throw Error('Wait for the room creator to start the adventure.');
      result=(method==='pickupLoot'?pickupLoot(h.game,...args):h.game[method](...args))??true;this.bind(h);
    }
    h.commandSeq=n;h.lastCommand={signature,result};h.revision++;this.commit();return result;
  }
  bind(h) {
    const g=h.game,r=this.state.rooms.get(h.room),k=key(g);let w=r.worlds.get(k);
    if(!w){w={key:k,enemies:g.enemies,shots:g.enemyShots,pool:g.enemyShotPool,hazards:g.legendaryHazards,fight:g.bossEncounter,cleared:!!g.arenaScene?.cleared};r.worlds.set(k,w);}
    g.enemies=w.enemies;g.enemyShots=w.shots;g.enemyShotPool=w.pool;g.legendaryHazards=w.hazards;
    if(g.arenaScene){g.arenaScene.boss=w.enemies.find(isBoss);g.arenaScene.cleared=w.cleared;g.bossEncounter=w.cleared?null:w.fight;}
    h.zone=k;return w;
  }
  hook(h) {
    const g=h.game;g.now=this.now;
    g.emit=(type,data={})=>{Game.prototype.emit.call(g,type,{...data,netId:h.eventSeq=(h.eventSeq||0)+1});if(['reward','level','camp','hurt','defeat','respawn','boss-victory','chest-claimed','legendary-clear-ready','equipment','purchase','upgrade','heal'].includes(type))this.dirty=true;};
    g.stepEnemy=()=>{};g.stepEncounter=()=>{};
    // Leaving an arena must not clear everyone else's projectiles.
    g.clearEnemyShots=()=>{g.enemyShots=[];};
    g.damageEnemy=(e,amount,options)=>{
      const hp=e.hp,previousReward=g.reward;
      // Record a lethal contribution before the existing engine invokes reward.
      g.reward=enemy=>{if(enemy.hp<hp){enemy.participants??=new Set();enemy.participants.add(h.id);}this.reward(h,enemy);};
      try{const result=Game.prototype.damageEnemy.call(g,e,amount,options);if(e.hp<hp){e.participants??=new Set();e.participants.add(h.id);}return result;}finally{g.reward=previousReward;}
    };
    g.reward=e=>this.reward(h,e);
  }
  reward(attacker,e) {
    if(e.rewarded||e.hp>0||e.state!=='dead')return;
    e.rewarded=true;
    const room=this.state.rooms.get(attacker.room),players=this.contributors(room,attacker.zone,e.participants);
    const offset=(room.xpTurn||0)%Math.max(1,players.length);
    for(let i=0;i<players.length;i++) {
      const p=players[i];
      this.sharedXP(p.game,players.length,(i-offset+players.length)%players.length,()=>Game.prototype.reward.call(p.game,{...e,rewarded:false}));p.revision++;this.dirty=true;
    }
    if(players.length)room.xpTurn=(offset+1)%players.length;
  }
  contributors(r,zone,participants){
    // Room order gives every contributor a turn at indivisible XP remainders.
    // A brief connection loss keeps earned credit; other zones/rooms do not.
    return [...r.members].map(id=>this.state.heroes.get(id)).filter(p=>p&&participants?.has(p.id)&&p.zone===zone&&(p.connected||this.now()-p.disconnectedAt<this.graceMs));
  }
  sharedXP(game,count,index,reward){
    const gain=game.gainXP,emit=game.emit;
    const share=xp=>Math.floor(xp/count)+(index<xp%count?1:0);
    // Preserve the existing personal level scaling, coins, loot and level-ups.
    game.gainXP=xp=>gain.call(game,share(xp));
    game.emit=(type,data)=>emit.call(game,type,(type==='reward'||type==='boss-victory')?{...data,xp:share(data.xp)}:data);
    try{return reward();}finally{game.gainXP=gain;game.emit=emit;}
  }
  active(r,k) {return r.phase==='lobby'?[]:[...r.members].map(id=>this.state.heroes.get(id)).filter(h=>h.connected&&h.zone===k&&!h.game.hero.dead&&!h.game.treeVisit&&(r.code||!h.game.paused));}
  tick() {
    if(this.failed)return;
    this.state.tick++;
    for(const h of this.state.heroes.values()) {
      if(!h.connected||this.state.rooms.get(h.room).phase==='lobby')continue;this.bind(h);
      const g=h.game,k=key(g),shots=g.enemyShots;g.enemyShots=[];
      const pending=this.inputs.get(h.id),action=pending&&this.now()-pending.at<(this.inputMaxAgeMs||250)?pending.input:{};
      // A menu cannot freeze recovery/invulnerability timers in a shared fight.
      const menuPaused=g.paused&&!!this.state.rooms.get(h.room).code&&!g.treeVisit;
      if(menuPaused)g.paused=false;
      g.step(STEP,menuPaused?{}:action);if(menuPaused)g.paused=true;
      if(pending)pending.input=consumeEdges(pending.input);
      if(pending)h.appliedInputSeq=pending.seq;
      if(key(g)===k)g.enemyShots=shots;
      if(g.arenaScene&&g.hero.x<240&&!g.hero.dead)g.leaveBoss();
      this.bind(h);const room=this.state.rooms.get(h.room);for(const w of room.worlds.values())this.reconcileControls(room,w);
    }
    for(const r of this.state.rooms.values())for(const w of r.worlds.values())this.stepWorld(r,w);
    // Vacated public rooms expire only after disconnect grace. Hero state is
    // moved into a private solo room in the SAME subsequent durable transaction.
    for(const h of this.state.heroes.values())if(!h.connected&&this.now()-h.disconnectedAt>=this.graceMs&&this.state.rooms.get(h.room)?.code) {
      const old=this.state.rooms.get(h.room);h.game=clone(h.game);old.members.delete(h.id);this.refreshHost(old);this.newRoom(h,false);this.hook(h);if(!old.members.size)this.state.rooms.delete(old.id);
    }
  }
  reconcileControls(r,w) {
    const games=[...r.members].map(id=>this.state.heroes.get(id)).filter(h=>h.connected&&h.zone===w.key).map(h=>h.game);
    const roots=new Set(),wind=new Set(),rootsMerge=new Set(),windMerge=new Set();
    for(const g of games){for(const id of g.powers.active.roots?.targets||[])roots.add(id);for(const id of g.powers.active.whirlwind?.targets||[])wind.add(id);for(const a of g.mergeEffects)if(!a.ended)for(const id of a.targets||[])if(a.id==='venomis')rootsMerge.add(id);else if(a.id==='air')windMerge.add(id);}
    for(const e of w.enemies){
      e.mergeRooted=rootsMerge.has(e.id);e.mergeLifted=!isBoss(e)&&windMerge.has(e.id);
      e.rooted=e.state!=='dead'&&(roots.has(e.id)||e.mergeRooted);
      const lifted=e.state!=='dead'&&!isBoss(e)&&(wind.has(e.id)||e.mergeLifted);
      if(e.lifted&&!lifted){e.airborne=true;e.vy=0;}e.lifted=lifted;
    }
  }
  stepWorld(r,w) {
    const players=this.active(r,w.key);if(!players.length)return;
    for(const e of [...w.enemies]) {
      const protectedPlayers=e.state==='dead'?players.filter(p=>Math.abs(p.game.hero.x-e.spawnX)<=RESPAWN.safeDistance&&Math.abs(p.game.hero.y-e.spawnSurface.y)<=160):[];
      const candidates=protectedPlayers.length?protectedPlayers:players;
      const target=candidates.reduce((a,b)=>Math.hypot(a.game.hero.x-e.x,a.game.hero.y-e.y)<=Math.hypot(b.game.hero.x-e.x,b.game.hero.y-e.y)?a:b);
      const g=target.game,oldState=e.state;
      const contact=e.attack?.shape==='charge'?e.attack:e.pouncing?e:null;
      if(contact){contact.hitHeroes??=new Set();contact.hit=players.every(p=>contact.hitHeroes.has(p.id));}
      const oldBox=g.heroBox,oldHurt=g.hurt;
      const hits=()=>players.filter(p=>this.inDanger(p.game,e)&&!contact?.hitHeroes.has(p.id));
      // Boss AOE tests use an actual intersecting hero box, then apply the same
      // damage calculation to each intersecting hero, once at the original tick.
      g.heroBox=()=>Game.prototype.heroBox.call((hits()[0]||target).game);
      g.hurt=(amount,x,source)=>{let result=false;for(const p of hits()){contact?.hitHeroes.add(p.id);result=Game.prototype.hurt.call(p.game,amount,x,source)||result;}return result;};
      try{Game.prototype.stepEnemy.call(g,e,STEP);}finally{g.heroBox=oldBox;g.hurt=oldHurt;}
      if(oldState==='dead'&&e.state!=='dead'){e.participants=new Set();}if(!e.pouncing&&e.hitHeroes)delete e.hitHeroes;
    }
    // Sweep each projectile once, against the first eligible hero on its path.
    for(const shot of [...w.shots]) {
      const nx=shot.x+shot.vx*STEP,ny=shot.y+(shot.vy+(shot.gravity||0)*STEP)*STEP;
      let target=players[0],first=Infinity;
      for(const p of players){const t=segmentHit(shot.x,shot.y,nx,ny,p.game.heroBox(),5);if(t!==null&&t<first){target=p;first=t;}}
      const g=target.game,previous=g.enemyShots;g.enemyShots=[shot];stepEnemyProjectiles(g,STEP);g.enemyShots=previous;
    }
    compactProjectiles(w.shots,w.pool);
    if(w.fight&&!w.cleared) {
      const driver=players[0].game,complete=driver.completeBoss;
      driver.completeBoss=()=>false;
      // Hazards are updated below for every intersecting hero, not just driver.
      const hazards=driver.legendaryHazards;driver.legendaryHazards=[];
      try{Game.prototype.stepEncounter.call(driver,STEP);}finally{driver.completeBoss=complete;driver.legendaryHazards=hazards;}
      w.fight=driver.bossEncounter||w.fight;
      if(w.fight.boss.hp<=0&&w.enemies.every(e=>e.state==='dead'))this.completeWorld(r,w);
    }
    for(const a of w.hazards){a.age+=STEP;a.life-=STEP;a.x=Math.max(240,Math.min(1700,a.x+a.vx*STEP));if(a.age>=a.next){a.next+=1;for(const p of players)if(overlaps(a,p.game.heroBox()))p.game.hurt(a.damage,a.x+a.w/2,a.source);}}
    w.hazards.splice(0,w.hazards.length,...w.hazards.filter(a=>a.life>0&&a.source.hp>0));
  }
  inDanger(g,e) {
    if(isBoss(e)) {
      const a=e.attack;if(!a)return false;
      if(a.shape==='charge')return overlaps({x:e.x-e.w/2-18,y:e.y-100,w:e.w+36,h:100},Game.prototype.heroBox.call(g));
      return (a.zones||[]).some(z=>overlaps(z,Game.prototype.heroBox.call(g)));
    }
    const info=TYPES[e.type],h=g.hero,coast=info.region===1,range=info.behavior==='quake'?125:coast?76:85;
    if(e.pouncing)return Math.abs(h.y-e.y)<65&&Math.abs(h.x-e.x)<65;
    return Math.abs(h.y-e.y)<(info.behavior==='slam'?85:65)&&Math.abs(h.x-e.x)<range&&(h.x-e.x)*e.face>-20;
  }
  completeWorld(r,w) {
    const participants=w.fight.boss.participants||new Set();
    const eligible=this.contributors(r,w.key,participants).filter(h=>!h.game.hero.dead&&h.game.arenaScene),offset=(r.xpTurn||0)%Math.max(1,eligible.length);
    for(const id of r.members) {
      const h=this.state.heroes.get(id),g=h.game;if(h.zone!==w.key||!g.arenaScene)continue;
      if(eligible.includes(h)) {
        if(g.arenaScene.legendary){g.pendingLegendaryVictory=g.arenaScene.legendary;g.prepareLegendaryVictory();}
        else this.sharedXP(g,eligible.length,(eligible.indexOf(h)-offset+eligible.length)%eligible.length,()=>Game.prototype.completeBoss.call(g));
        h.revision++;
      }
      g.bossEncounter=null;g.arenaScene.cleared=true;g.pendingLegendaryVictory=null;g.paused=false;
    }
    if(eligible.length)r.xpTurn=(offset+1)%eligible.length;
    w.cleared=true;w.shots.length=0;w.hazards.length=0;w.fight=null;
  }
  view(owner,id) {
    const h=this.owner(owner,id),r=this.state.rooms.get(h.room),g=h.game;
    const visual=Object.assign(Object.create(Game.prototype),g);
    visual.enemies=g.enemies.filter(e=>isBoss(e)||Math.abs(e.x-g.hero.x)<1500);
    visual.world={...g.world,monsters:[]};
    if(g.arenaScene)visual.arenaScene={...g.arenaScene,enemies:[]};
    visual.powers=Object.assign(Object.create(Object.getPrototypeOf(g.powers)),g.powers);
    Object.defineProperty(visual.powers,'game',{value:visual});
    visual.enemyShotPool=new ProjectilePool(64);visual.powers.projectilePool=new ProjectilePool(12);
    // Deliberately excludes other players' inventories, account IDs and saves.
    return {protocol:PROTOCOL,commandResult:h.lastCommand?.result,tick:this.state.tick,revision:this.store.revision,heroRevision:h.revision,commandSeq:h.commandSeq,inputSeq:h.appliedInputSeq||0,id,code:r.code,hostId:r.hostId,phase:r.phase,canStart:!!r.code&&r.phase==='lobby'&&r.hostId===id&&this.connected(r).length>=MIN_ROOM_PLAYERS,capacity:this.capacity,cloud:h.cloud?{slot:h.slot,revision:h.cloud.revision,savedAt:h.cloud.savedAt||null,error:h.cloud.error||null}:null,
      players:[...r.members].map(id=>this.state.heroes.get(id)).filter(p=>p.connected).map(p=>({id:p.id,name:p.game.look.name,region:p.game.regionId})),
      nearby:[...r.members].map(id=>this.state.heroes.get(id)).filter(p=>p.connected&&p.id!==id&&p.zone===h.zone&&Math.abs(p.game.hero.x-g.hero.x)<1500).map(p=>({id:p.id,hero:p.game.hero,look:p.game.look,outfit:p.game.visualOutfit(),powers:{active:p.game.powers.active,projectiles:p.game.powers.projectiles},mergeEffects:p.game.mergeEffects,mergeShots:p.game.mergeShots})),
      game:encodeRuntime(visual)};
  }
}
