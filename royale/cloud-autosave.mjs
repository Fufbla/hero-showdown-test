// Reuse the approved serializer on a read-only view. Manual saving and combat
// rules on the real Game remain unchanged. An unfinished arena restores its safe
// entrance, as in existing saves; active enemies/boss rewards are not fabricated.
export function cloudCheckpoint(game){
 if(!game.started||game.hero.dead)return null;
 const view=Object.create(game);view.world=structuredClone(game.world);view.bossProgress=structuredClone(game.bossProgress);view.canSave=()=>true;
 return game.save.call(view);
}
export class CloudAutosave{
 constructor(context,{onError=()=>{},interval=5000}={}){this.context=context;this.onError=onError;this.interval=interval;this.last=0;this.lastSnapshot=null;this.running=false;}
 async save({force=false,now=Date.now()}={}){
  const {store,game,index,blocked}=this.context();if(!store?.cloud||blocked||this.running||store.saving||store.failure)return false;
  if(!force&&now-this.last<this.interval)return false;
  const snapshot=cloudCheckpoint(game);if(!snapshot||snapshot===this.lastSnapshot)return false;
  this.running=true;this.last=now;
  try{await store.commit(index,snapshot);this.lastSnapshot=snapshot;return true;}catch(e){this.onError(e);return false;}finally{this.running=false;}
 }
 reset(){this.last=0;this.lastSnapshot=null;}
}
