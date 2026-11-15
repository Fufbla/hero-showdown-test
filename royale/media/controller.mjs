// One soundtrack per Royale launch. Scene documents share their owner's player.
export const MUSIC_KEY='healthia.royale.soundtrack.v1';
export const AUDIO_KEY='healthia.royale.audio.v1';
const clamp=(n,fallback)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):fallback;
export function preferences(storage){
 try{const saved=JSON.parse(storage.getItem(MUSIC_KEY)||'null');if(saved)return {volume:clamp(saved.volume,.2),muted:saved.muted===true};
  const old=JSON.parse(storage.getItem(AUDIO_KEY)||'null');if(old&&Number.isFinite(old.music))return {volume:clamp(old.music,.2),muted:false};
 }catch{}return {volume:.2,muted:false};
}
export class Soundtrack {
 constructor(win){
  this.win=win;try{this.storage=win.localStorage;}catch{this.storage={getItem:()=>null,setItem:()=>{}};}
  this.settings=preferences(this.storage);this.context=null;this.source=null;this.ready=false;this.loading=null;this.failed=false;this.listeners=new Set();this.duckUntil=0;this.startedAt=0;
 }
 unlock(){
  try{const Context=this.win.AudioContext||this.win.webkitAudioContext;if(!Context)return;
   if(!this.context){this.context=new Context();this.gain=this.context.createGain();this.gain.gain.value=0;this.gain.connect(this.context.destination);}
   if(this.context.state!=='running')void this.context.resume().then(()=>this.start()).catch(()=>{});
   this.start();
  }catch{}
 }
 async start(){
  if(!this.ready||!this.context||this.context.state!=='running'||this.source||this.loading||this.failed)return;
  this.loading=true;
  try{
   // Decoded once: the audio clock loops the same buffer without an ended-event gap.
   const response=await this.win.fetch(new URL('soundtrack.mp3',import.meta.url),{signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error('Soundtrack unavailable');
   const buffer=await this.context.decodeAudioData(await response.arrayBuffer());
   if(this.source)return;
   const source=this.context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(this.gain);
   this.source=source;this.startedAt=this.context.currentTime;source.start();this.apply(.24);this.notify();
  }catch{this.failed=true;this.notify();}finally{this.loading=false;}
 }
 finishIntro(){this.ready=true;this.start();}
 setVolume(value){this.settings.volume=clamp(Number(value),.2);this.save();}
 toggle(){this.settings.muted=!this.settings.muted;this.save();this.unlock();}
 save(){try{this.storage.setItem(MUSIC_KEY,JSON.stringify(this.settings));}catch{}this.apply();this.notify();}
 apply(time=.06){
  if(!this.gain)return;const now=this.context.currentTime;
  // The legacy effects are quiet synthesized tones. Leave mixing headroom for them.
  const target=this.ready&&!this.settings.muted?this.settings.volume*.18*(now<this.duckUntil?.45:1):0;
  this.gain.gain.cancelScheduledValues(now);this.gain.gain.setTargetAtTime(target,now,time);
 }
 duck(type){
  if(!['hit','hurt','power','boss-attack','boss-wave','defeat','level'].includes(type)||!this.context)return;
  this.duckUntil=this.context.currentTime+.28;this.apply(.025);clearTimeout(this.duckTimer);
  this.duckTimer=setTimeout(()=>this.apply(.16),300);
 }
 subscribe(fn){this.listeners.add(fn);fn();return()=>this.listeners.delete(fn);}
 notify(){for(const fn of this.listeners)fn();}
}
export function getSoundtrack(win=globalThis.window){
 if(!win)return null;
 try{if(win.parent!==win&&win.parent.location.origin===win.location.origin&&win.parent.royaleSoundtrack)return win.parent.royaleSoundtrack;}catch{}
 return win.royaleSoundtrack ||= new Soundtrack(win);
}
