import {GameAudio as EffectsAudio,musicScene} from '../audio.mjs?media-base=1';
import {getSoundtrack} from './controller.mjs';
export {musicScene};
// Preserve combat effects; replace only the old scene-specific music scheduler.
export class GameAudio extends EffectsAudio {
 constructor(storage){
  super(storage);this.track=getSoundtrack();
  if(!this.track)return;
  this.settings.music=this.track.settings.volume;
  const activate=()=>{this.track.unlock();void this.enable().catch(()=>{});};
  for(const type of ['pointerdown','keydown','touchend'])window.addEventListener(type,activate,{capture:true,passive:true});
  this.cleanup=()=>{for(const type of ['pointerdown','keydown','touchend'])window.removeEventListener(type,activate,true);};
  if(this.track.context)void this.enable().catch(()=>{});
 }
 async enable(){
  if(!this.track)return;this.track.unlock();if(!this.track.context)return;
  this.context=this.track.context;this.enabled=true;
  if(!this.effectsBus){this.effectsBus=this.context.createGain();this.effectsBus.connect(this.context.destination);}
  this.apply();
 }
 apply(){if(this.effectsBus)this.effectsBus.gain.setTargetAtTime(this.enabled?this.settings.effects:0,this.context.currentTime,.03);}
 volume(kind,value){if(kind==='music'){this.settings.music=Number(value);this.track?.setVolume(value);}else super.volume(kind,value);}
 mute(){this.track?.toggle();}
 stopMusic(){}
 update(){if(this.track?.context&&!this.effectsBus)void this.enable().catch(()=>{});}
 effect(type){super.effect(type);if(this.enabled)this.track?.duck(type);}
 destroy(){this.cleanup?.();for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();this.effectsBus?.disconnect();}
}
