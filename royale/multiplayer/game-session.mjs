import {MultiplayerClient} from './client.mjs';
import {drawHero} from '../hero-art.mjs';
import {drawPowerHero,drawPowerWorld} from '../power-art.mjs';
import {drawMergeWorld} from '../legendary-art.mjs';
import {pickupLoot} from '../world-loot.mjs';
import {Game,STEP} from '../core.mjs';
import {PeerMotion,zoneOf} from './supabase-test/motion.mjs';
export const REMOTE_METHODS=['travel','enterBoss','enterLegendary','visitTree','leaveTree','upgradePower','equipPower','equipItem','buyCostume','buyHealthRoot','useHealthRoot','applyMakeover','sellItem','discardItem','resolveReward','acceptReward','claimChest','claimMergeReward','equipMergeMix','activateMergeSet','returnNormalEquipment','returnCheckpoint','pickupLoot'];
export const MIGRATION_KEY='healthia.royale.multiplayer.links.v1';
export class GameSession extends EventTarget {
  constructor({url,getToken,storage=localStorage,onState,onError,client=null}){
    super();this.client=client||new MultiplayerClient(url,getToken);this.storage=storage;this.onState=onState;this.onError=onError;this.active=false;this.queue=Promise.resolve();this.receivedAt=0;this.peerMotion=new PeerMotion();this.enemyMotion=new Map();
    this.client.addEventListener('state',({detail:s})=>{
      const before=this.game,previousHero=this.client.fastMotion&&before?this.presentHero():null,previousPeers=new Map((this.state?.nearby||[]).map(p=>[p.id,p]));
      if(this.client.localPrediction&&s.phase==='playing'&&s.code)for(const packet of this.client.unacked)this.predict(s.game,packet.input);
      s.game.events=s.game.events.filter(e=>e.netId>(this.eventSeq||0));for(const e of s.game.events)this.eventSeq=Math.max(this.eventSeq||0,e.netId);
      this.state=s;this.game=s.game;this.receivedAt=performance.now();
      // Interpolate presentation only; all physics/combat remain server-owned.
      if(before&&before.regionId===s.game.regionId&&!!before.arenaScene===!!s.game.arenaScene){s.game.hero.prevX=before.hero.x;s.game.hero.prevY=before.hero.y;for(const e of s.game.enemies){const prior=before.enemies.find(p=>p.id===e.id);if(prior){e.prevX=prior.x;e.prevY=prior.y;}}}
      if(this.client.fastMotion){
        const h=s.game.hero,dx=(previousHero?.x??h.x)-h.x,dy=(previousHero?.y??h.y)-h.y;
        this.correction=before&&zoneOf(before)===zoneOf(s.game)&&Math.hypot(dx,dy)<200&&before.hero.dead===h.dead?{x:dx,y:dy,at:performance.now()}:null;
        h.prevX=h.x;h.prevY=h.y;this.trackEnemies(s.game.enemies);
      }
      for(const p of s.nearby){const prev=previousPeers.get(p.id);p.hero.prevX=prev?.hero.x??p.hero.x;p.hero.prevY=prev?.hero.y??p.hero.y;}
      for(const method of REMOTE_METHODS)s.game[method]=(...args)=>this.command(method,args).catch(e=>{this.onError(e.message);return false;});
      this.active=true;if(this.pauseGeneration!==this.client.generation){this.pauseGeneration=this.client.generation;if(this.desiredPause!==undefined&&s.game.paused!==this.desiredPause)void this.command('pause',[this.desiredPause]).catch(this.onError);}
      this.onState(s.game,s);
      if(this.sourceId){try{const links=this.links(),link=links[this.sourceId];if(link?.heroId===s.id){link.confirmedRevision=s.revision;link.status='confirmed';this.storage.setItem(MIGRATION_KEY,JSON.stringify(links));}}catch(error){this.onError('Account progress is safe; this browser could not record the migration receipt. '+error.message);}}
      this.dispatchEvent(new CustomEvent('state',{detail:s}));
    });
    for(const type of ['heroes','status','error','checkpoint'])this.client.addEventListener(type,e=>this.dispatchEvent(new CustomEvent(type,{detail:e.detail})));
    this.client.addEventListener('motion',({detail:p})=>{if(this.state&&this.game)this.peerMotion.push(p,this.state.nearby,zoneOf(this.game));});
    this.client.addEventListener('visual',({detail:f})=>{
      if(!this.state||!this.game)return;const s=this.state,g=this.game,zone=`${g.regionId}:${g.arenaScene?(g.arenaScene.legendary||'boss'):'world'}`,previous=new Map(s.nearby.map(p=>[p.id,p]));
      s.players=f.players;s.phase=f.phase;s.hostId=f.hostId;s.canStart=f.phase==='lobby'&&f.hostId===s.id&&f.players.length>=2;
      s.nearby=f.peers.filter(p=>p.id!==s.id&&p.zone===zone).map(p=>{const old=previous.get(p.id);p.hero.prevX=old?.hero.x??p.hero.x;p.hero.prevY=old?.hero.y??p.hero.y;return p;});
      for(const enemy of f.worlds.find(w=>w.key===zone)?.enemies||[]){const e=g.enemies.find(e=>e.id===enemy.id);if(e)Object.assign(e,{prevX:e.x,prevY:e.y},enemy);}
      if(this.client.fastMotion)this.trackEnemies(g.enemies);else this.receivedAt=performance.now();this.dispatchEvent(new CustomEvent('state',{detail:s}));
    });
  }
  links(){return JSON.parse(this.storage.getItem(MIGRATION_KEY)||'{}');}
  link(sourceId){return this.links()[sourceId];}
  // Backup + fence are written BEFORE requesting a server transfer. Never delete
  // or rewrite the original local slot. A pending transfer is retryable.
  retain(local,slot){const links=this.links();if(!links[local.id])links[local.id]={status:'review',slot,backup:local};this.storage.setItem(MIGRATION_KEY,JSON.stringify(links));this.sourceId=local.id;}
  async migrate(local,slot,choice='local'){
    this.retain(local,slot);
    const preview=await this.client.request('migration-preview',{slot,sourceId:local.id,snapshot:local.snapshot,choice});return preview;
  }
  reviewCloud(slot){this.sourceId=null;return this.client.request('migration-preview',{slot,sourceId:'cloud-slot-'+slot,choice:'cloud'});}
  async confirmMigration(ticket){
    if(this.sourceId){const before=this.links();before[this.sourceId].status='pending';this.storage.setItem(MIGRATION_KEY,JSON.stringify(before));}
    const result=await this.client.request('migration-confirm',{ticket});if(this.sourceId){const links=this.links();links[this.sourceId]={...links[this.sourceId],heroId:result.id,status:'transferred'};this.storage.setItem(MIGRATION_KEY,JSON.stringify(links));}this.client.select(result.id);return result;
  }
  connect(){return this.client.connect();}
  select(id,sourceId){this.sourceId=sourceId;this.client.select(id);}
  command(method,args=[]){const result=this.queue.then(()=>this.client.command(method,args));this.queue=result.catch(()=>{});return result;}
  pause(paused){if(this.active&&this.desiredPause!==paused){this.desiredPause=paused;void this.command('pause',[paused]).catch(this.onError);}}
  input(action){
    if(this.client.fastMotion&&performance.now()-this.client.lastServerAt>2500){this.client.ready=false;this.client.emit('status','Reconnecting · waiting for confirmed progress');return;}
    this.client.input(action);if(this.client.localPrediction&&this.state?.phase==='playing'&&this.state.code){this.predict(this.game,action);this.predictedAt=performance.now();this.client.present?.(this.game);}
  }
  predict(game,action){
    // Presentation only. Server snapshots alone grant HP, damage, XP and loot.
    const methods=['stepEnemy','stepEncounter','damageEnemy','hurt','reward','completeBoss','gainXP'],prior=methods.map(k=>game[k]);
    for(const key of methods)game[key]=()=>false;
    const x=game.hero.x,y=game.hero.y;
    try{const input={...action,interact:false,portal:false,tree:false,heal:false};Game.prototype.step.call(game,STEP,input);Game.prototype.step.call(game,STEP,{move:input.move,vertical:input.vertical,run:input.run,punchHeld:input.punchHeld,kickHeld:input.kickHeld});if(this.client.fastMotion){game.hero.prevX=x;game.hero.prevY=y;}}
    finally{methods.forEach((k,i)=>game[k]=prior[i]);}
  }
  alpha(){return this.client.fastMotion?1:Math.min(1,Math.max(0,(performance.now()-this.receivedAt)/100));}
  presentHero(now=performance.now()){
    const h=this.game.hero,t=Math.min(1,Math.max(0,(now-(this.predictedAt||0))/(STEP*2000))),decay=Math.max(0,1-(now-(this.correction?.at||0))/120);
    const x=h.prevX+(h.x-h.prevX)*t+(this.correction?.x||0)*decay,y=h.prevY+(h.y-h.prevY)*t+(this.correction?.y||0)*decay;
    return {...h,x,y,prevX:x,prevY:y};
  }
  trackEnemies(enemies){
    const now=performance.now(),zone=zoneOf(this.game);if(this.enemyZone!==zone){this.enemyMotion.clear();this.enemyZone=zone;}
    for(const e of enemies){const old=this.enemyMotion.get(e.id);if(old?.x===e.x&&old?.y===e.y)continue;
      const t=old?Math.min(1,(now-old.at)/old.duration):1;
      this.enemyMotion.set(e.id,{fromX:old?old.fromX+(old.x-old.fromX)*t:e.x,fromY:old?old.fromY+(old.y-old.fromY)*t:e.y,x:e.x,y:e.y,at:now,duration:Math.max(70,Math.min(250,old?now-old.at:100))});
    }
  }
  drawGame(renderer,alpha,elapsed){
    if(!this.client.fastMotion){renderer.draw(this.game,alpha,elapsed);return;}
    const now=performance.now(),view=Object.assign(Object.create(Game.prototype),this.game,{hero:this.presentHero(now),enemies:this.game.enemies.map(e=>{
      const p=this.enemyMotion.get(e.id);if(!p)return e;const t=Math.min(1,Math.max(0,(now-p.at)/p.duration)),x=p.fromX+(p.x-p.fromX)*t,y=p.fromY+(p.y-p.fromY)*t;return {...e,x,y,prevX:x,prevY:y};
    })});renderer.draw(view,1,elapsed);
  }
  drawPeers(renderer,alpha){
    if(!this.active)return;const c=renderer.c;c.save();c.setTransform(renderer.dpr*renderer.scale,0,0,renderer.dpr*renderer.scale,0,0);c.translate(-renderer.camera,-renderer.cameraY);
    for(const p of this.state?.nearby||[]){const h=(this.client.fastMotion&&this.peerMotion.sample(p,zoneOf(this.game)))||p.hero,pos={x:h.prevX+(h.x-h.prevX)*alpha,y:h.prevY+(h.y-h.prevY)*alpha};
      const visual={...p,hero:h,time:this.game.time,enemies:[],powers:p.powers||{active:{},projectiles:[]},mergeEffects:p.mergeEffects||[],mergeShots:p.mergeShots||[]};
      drawPowerWorld(c,visual);drawMergeWorld(c,visual);const pose=drawHero(c,pos.x,pos.y,p.look,h,this.game.time,1,{outfit:p.outfit});drawPowerHero(c,visual,pos,pose);
      c.font='bold 13px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#122b32';c.fillStyle='#fff6d8';c.strokeText(p.look.name,pos.x,pos.y-112);c.fillText(p.look.name,pos.x,pos.y-112);
    }c.restore();
  }
}
export function pickupForGame(game,...args){return game.pickupLoot?game.pickupLoot(...args):pickupLoot(game,...args);}
