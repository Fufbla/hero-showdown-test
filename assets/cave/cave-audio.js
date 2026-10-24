(function(){'use strict';
class CaveAudio{
 constructor(base,embedded){this.base=base;this.embedded=embedded;this.buffers={};this.enabled=true;this.sceneLevel=1;this.voices=new Set();this.failed=[];this.names=['footstep-1','footstep-2','footstep-3','crack','pebbles','fall','impact','shatter','debris','whirlwind','damage','defeat','rumble'];}
 async unlock(){
  const A=window.AudioContext||window.webkitAudioContext;if(!A)return;
  if(!this.ctx){this.ctx=new A();this.gain=this.ctx.createGain();this.gain.gain.value=this.enabled?.32:0;
   const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=8;this.gain.connect(limiter);limiter.connect(this.ctx.destination);
   this.loading=Promise.all(this.names.map(async n=>{try{const response=await fetch(this.embedded?.['audio/'+n+'.wav']||this.base+'audio/'+n+'.wav');if(!response.ok)throw Error(response.status);this.buffers[n]=await this.ctx.decodeAudioData(await response.arrayBuffer());}catch(e){this.failed.push(n);}}));
  }
  try{await this.ctx.resume();await this.loading;}catch(_){};
 }
 setEnabled(value){this.enabled=value;if(this.gain)this.gain.gain.setTargetAtTime(value?.32*this.sceneLevel:0,this.ctx.currentTime,.08);}
 setSceneLevel(value){this.sceneLevel=Math.max(0,Math.min(1,value));if(this.gain)this.gain.gain.setTargetAtTime(this.enabled?.32*this.sceneLevel:0,this.ctx.currentTime,.08);}
 play(name,volume=1,rate=1){
  if(!this.ctx||!this.enabled||!this.buffers[name]||this.voices.size>20)return;
  const s=this.ctx.createBufferSource(),g=this.ctx.createGain();s.buffer=this.buffers[name];s.playbackRate.value=rate;g.gain.value=Math.min(1,volume);s.connect(g);g.connect(this.gain);this.voices.add(s);
  s.onended=()=>{this.voices.delete(s);s.disconnect();g.disconnect();};s.start();return s;
 }
 ambience(){if(this.loop||!this.buffers.rumble||!this.enabled)return;this.loop=this.play('rumble',.17);if(this.loop)this.loop.loop=true;}
 stopAmbience(){if(this.loop){try{this.loop.stop();}catch(_){}this.loop=null;}}
 suspend(){this.stopAmbience();for(const s of this.voices){try{s.stop();}catch(_){}}}
 dispose(){this.suspend();if(this.ctx){this.ctx.close().catch(()=>{});this.ctx=null;}}
}
window.HealthiaCaveAudio=CaveAudio;
})();
