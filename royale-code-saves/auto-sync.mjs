// Optional, non-destructive browser-to-cloud autosave.
// Only starts after the player explicitly chooses a local hero and empty cloud
// slot. Cloud revision conflicts stop syncing; local saves are never modified.
export class CodeAutosync {
 constructor({readLocal,readRemote,save,onStatus,interval=6000}){
  Object.assign(this,{readLocal,readRemote,save,onStatus,interval});
  this.timer=null;this.running=false;this.lastSnapshot=null;this.stopped=true;
 }
 async start({browserSlot,cloudSlot}){
  this.stop();this.stopped=false;this.browserSlot=browserSlot;this.cloudSlot=cloudSlot;
  const local=this.readLocal(browserSlot);if(!local?.snapshot)throw Error('Browser hero is missing.');
  const remote=await this.readRemote();
  if(remote.slots[cloudSlot]!==null)throw Error('Cloud slot must be empty before enabling sync.');
  this.revision=remote.revision;
  await this.tick(true);
  if(!this.stopped)this.timer=setInterval(()=>void this.tick(),this.interval);
 }
 async tick(force=false){
  if(this.stopped||this.running)return;
  const local=this.readLocal(this.browserSlot);if(!local?.snapshot){this.stop();this.onStatus('Sync stopped: browser hero missing.');return;}
  const snapshot=JSON.stringify(local.snapshot);
  if(!force&&snapshot===this.lastSnapshot)return;
  this.running=true;
  try{
   const result=await this.save({slot:this.cloudSlot,revision:this.revision,snapshot:local.snapshot});
   if(this.stopped)return;
   this.revision=result.revision;this.lastSnapshot=snapshot;
   this.onStatus('Cloud saved · revision '+this.revision);
  }catch(error){this.stop();this.onStatus('Cloud sync paused: '+(error.message||String(error))+'. Browser hero unchanged.');}
  finally{this.running=false;}
 }
 stop(){this.stopped=true;if(this.timer)clearInterval(this.timer);this.timer=null;}
}
