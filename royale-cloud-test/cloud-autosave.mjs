// Reuse the approved serializer on a read-only view. Manual saving and combat
// rules on the real Game remain unchanged. An unfinished arena restores its safe
// entrance, as in existing saves; active enemies/boss rewards are not fabricated.
export function cloudCheckpoint(game){
 if(!game.started||game.hero.dead)return null;
 const view=Object.create(game);view.world=structuredClone(game.world);view.bossProgress=structuredClone(game.bossProgress);view.canSave=()=>true;
 return game.save.call(view);
}
export class CloudAutosave{
 constructor(context,{onError=()=>{},interval=5000}={}){this.context=context;this.onError=onError;this.interval=interval;this.last=0;this.lastSnapshot=null;this.running=false;this.queued=null;this.job=null;this.generation=0;}
 save({force=false,now=Date.now()}={}){
  const {store,game,index,blocked}=this.context();
  if(!store?.cloud||blocked||store.failure)return Promise.resolve(false);
  if(!force&&(this.running||store.saving||now-this.last<this.interval))return Promise.resolve(false);
  const snapshot=cloudCheckpoint(game);if(!snapshot)return Promise.resolve(false);
  const entry={store,game,index,snapshot,generation:this.generation};
  if(this.running){if(force)this.queued=entry;return this.job;}
  if(snapshot===this.lastSnapshot?.snapshot&&store===this.lastSnapshot.store&&index===this.lastSnapshot.index)return Promise.resolve(false);
  this.running=true;this.last=now;
  this.job=this.drain(entry).finally(()=>{this.running=false;this.job=null;});return this.job;
 }
 async drain(entry){
  let saved=false;
  while(entry){
   try{
    if(entry.generation!==this.generation)return saved;
    await entry.store.commit(entry.index,entry.snapshot);
    if(entry.generation!==this.generation)return saved;
    this.lastSnapshot=entry;saved=true;
   }catch(error){this.queued=null;if(entry.generation===this.generation)this.onError(error);return false;}
   entry=this.queued;this.queued=null;
   if(entry?.snapshot===this.lastSnapshot.snapshot&&entry.store===this.lastSnapshot.store&&entry.index===this.lastSnapshot.index)entry=null;
  }
  return saved;
 }
 async flush(){await this.job;}
 reset(){this.generation++;this.queued=null;this.last=0;this.lastSnapshot=null;}
}
