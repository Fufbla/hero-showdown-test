import {LegendaryMusic,LEGENDARY_MUSIC} from './legendary-music.mjs';
export const AUDIO_KEY='healthia.royale.audio.v1';
// Original short looping arrangements. No downloaded recordings or shared assets.
export const EXPLORATION_MUSIC=Object.freeze({
 'region-1':{tempo:94,root:196,wave:'sine',notes:[0,4,7,12,9,7,4,2],style:'coastal calypso'},
 'region-2':{tempo:78,root:174.61,wave:'triangle',notes:[0,7,3,10,7,5,3,2],style:'forest folk'},
 'region-3':{tempo:112,root:98,wave:'square',notes:[0,0,7,3,0,-2,5,3],style:'industrial electro'},
 'region-4':{tempo:64,root:130.81,wave:'sine',notes:[0,2,7,9,7,2,-3,0],style:'cavern ambient'},
 'region-5':{tempo:102,root:164.81,wave:'triangle',notes:[0,3,6,10,7,6,3,-2],style:'mutant trip-hop'},
 'region-6':{tempo:120,root:146.83,wave:'sine',notes:[0,7,12,14,10,7,3,5],style:'cosmic synth'},
 'region-7':{tempo:86,root:110,wave:'sawtooth',notes:[0,3,7,10,12,7,5,3],style:'dramatic orchestral pulse'},
 'regional-boss':{tempo:138,root:123.47,wave:'triangle',notes:[0,0,7,3,10,7,3,-2],style:'percussive battle'},
});
export const MUSIC_THEMES=Object.freeze({...EXPLORATION_MUSIC,...LEGENDARY_MUSIC});
export function normalizeAudio(raw={}){const n=(v,d)=>Number.isFinite(Number(v))?Math.max(0,Math.min(1,Number(v))):d;return {music:n(raw.music,.35),effects:n(raw.effects,.65)};}
export const musicScene=g=>g.arenaScene&&!g.arenaScene.cleared?(g.arenaScene.legendary||'regional-boss'):`region-${g.regionId}`;
export class GameAudio {
 constructor(storage){this.storage=storage;try{this.settings=normalizeAudio(JSON.parse(storage.getItem(AUDIO_KEY)||'{}'));}catch{this.settings=normalizeAudio();}this.enabled=false;this.context=null;this.voices=new Set();this.current=null;this.fading=null;}
 async enable(Context){this.context ||= new Context();if(this.context.state==='suspended')await this.context.resume();if(!this.musicBus){this.musicBus=this.context.createGain();this.effectsBus=this.context.createGain();this.musicBus.connect(this.context.destination);this.effectsBus.connect(this.context.destination);}this.enabled=true;this.apply();}
 apply(){if(!this.context||!this.musicBus)return;const t=this.context.currentTime;this.musicBus.gain.setTargetAtTime(this.enabled?this.settings.music:0,t,.08);this.effectsBus.gain.setTargetAtTime(this.enabled?this.settings.effects:0,t,.03);}
 volume(kind,value){if(!['music','effects'].includes(kind))return;this.settings=normalizeAudio({...this.settings,[kind]:value});this.apply();try{this.storage.setItem(AUDIO_KEY,JSON.stringify(this.settings));}catch{}}
 mute(){this.enabled=false;this.stopMusic();this.apply();}
 stopMusic(){for(const record of [this.current,this.fading])if(record){record.player.stop();record.gain.disconnect();}this.current=this.fading=null;}
 update(scene,playing){const c=this.context;if(!c||!this.enabled||!playing||c.state!=='running'){this.stopMusic();return;}const now=c.currentTime;
  if(!MUSIC_THEMES[scene])return;
  if(this.current?.id!==scene){
   if(this.fading){this.fading.player.stop();this.fading.gain.disconnect();this.fading=null;}
   if(this.current){this.fading=this.current;this.fading.until=now+.4;this.fading.gain.gain.setTargetAtTime(0,now,.08);}
   const gain=c.createGain();gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+.35);gain.connect(this.musicBus);this.current={id:scene,gain,player:new LegendaryMusic(MUSIC_THEMES,gain)};
  }
  if(this.fading&&now>=this.fading.until){this.fading.player.stop();this.fading.gain.disconnect();this.fading=null;}
  this.current.player.update(c,scene,true);
 }
 effect(type){const c=this.context,pitches={jump:330,hit:150,swing:95,reward:660,level:880,hurt:85,camp:520,heal:560,power:260,'boss-attack':75,'boss-wave':180,defeat:65};
  if(!this.enabled||!c||c.state!=='running'||!pitches[type]||this.voices.size>=12)return;
  const o=c.createOscillator(),gain=c.createGain(),t=c.currentTime,pitch=pitches[type];o.type=['hit','hurt','swing','boss-attack'].includes(type)?'triangle':'sine';o.frequency.setValueAtTime(pitch,t);o.frequency.exponentialRampToValueAtTime(type==='jump'?600:pitch*.65,t+.1);gain.gain.setValueAtTime(.035,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.13);o.connect(gain);gain.connect(this.effectsBus);this.voices.add(o);o.onended=()=>{this.voices.delete(o);o.disconnect();gain.disconnect();};o.start(t);o.stop(t+.15);
 }
 destroy(){this.stopMusic();for(const o of this.voices){try{o.stop();}catch{}}this.voices.clear();this.musicBus?.disconnect();this.effectsBus?.disconnect();void this.context?.close();}
}
