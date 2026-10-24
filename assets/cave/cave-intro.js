(function(){'use strict';
const base=new URL('./',document.currentScript.src).href;
const files=Object.freeze({summy:'summy-cave.mp4',sadie:'sadie-cave.mp4',vee:'vee-cave.mp4'});
class CaveIntro{
 constructor(options){
  this.options=options;this.done=false;this.attempt=0;this.padArmed=false;this.prev={};this.resumeVisible=false;this.listeners=[];
  this.root=document.createElement('section');this.root.className='cave-intro';this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','Super '+options.character+' cave cutscene');
  this.root.innerHTML='<video playsinline webkit-playsinline preload="auto" aria-label="Cave arrival cutscene"></video><div class="cave-intro-controls"><p role="status">LOADING CAVE CUTSCENE…</p><div><button data-movie="back">BACK</button><button data-movie="sound">PLAY VIDEO</button><button data-movie="retry" hidden>RETRY VIDEO</button><button data-movie="skip">SKIP · ENTER THE CAVE</button></div></div>';
  options.parent.append(this.root);this.background=[...options.parent.children].filter(el=>el!==this.root).map(el=>[el,el.inert]);for(const[el]of this.background)el.inert=true;this.video=this.root.querySelector('video');this.status=this.root.querySelector('[role="status"]');this.sound=this.root.querySelector('[data-movie="sound"]');this.retry=this.root.querySelector('[data-movie="retry"]');this.skip=this.root.querySelector('[data-movie="skip"]');
  this.video.src=base+'videos/'+files[options.character];this.video.muted=options.sound===false;this.video.disablePictureInPicture=true;
  this.skip.onclick=()=>this.finish();this.root.querySelector('[data-movie="back"]').onclick=()=>{if(this.done)return;this.destroy();options.onExit?.();};
  this.sound.onclick=()=>{const enabled=this.video.paused||this.video.muted;this.video.muted=!enabled;options.onSound?.(enabled);this.play();this.reflect();};
  this.retry.onclick=()=>{this.retry.hidden=true;this.status.textContent='LOADING CAVE CUTSCENE…';this.video.load();this.play();};
  this.on(this.video,'ended',()=>this.finish());this.on(this.video,'playing',()=>{this.status.textContent='';this.retry.hidden=true;this.reflect();});
  this.on(this.video,'waiting',()=>{this.status.textContent='LOADING CAVE CUTSCENE…';});
  this.on(this.video,'error',()=>{this.status.textContent='The cutscene could not load. Retry or skip to play the cave.';this.retry.hidden=false;this.reflect();});
  this.on(window,'keydown',e=>{e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;if(e.code==='Escape')this.finish();else if(e.code==='Enter'||e.code==='Space')(this.buttons().includes(document.activeElement)?document.activeElement:this.skip).click();else if(e.code.startsWith('Arrow')||e.code==='Tab'){const b=this.buttons(),i=b.indexOf(document.activeElement),dir=e.shiftKey||['ArrowLeft','ArrowUp'].includes(e.code)?-1:1;b[(i+dir+b.length)%b.length]?.focus();}},true);
  this.on(window,'keyup',e=>{e.preventDefault();e.stopImmediatePropagation();},true);
  this.on(document,'visibilitychange',()=>{if(document.hidden){this.resumeVisible=!this.video.paused;++this.attempt;this.video.pause();}else if(this.resumeVisible){this.resumeVisible=false;this.play();}});
  this.skip.focus({preventScroll:true});this.play();this.poll();
 }
 on(target,type,fn,options){target.addEventListener(type,fn,options);this.listeners.push(()=>target.removeEventListener(type,fn,options));}
 buttons(){return [...this.root.querySelectorAll('button')].filter(b=>!b.hidden&&!b.disabled);}
 reflect(){if(!this.done)this.sound.textContent=this.video.paused?'PLAY VIDEO':this.video.muted?'ENABLE SOUND':'MUTE';}
 async play(){if(this.done||document.hidden)return;const attempt=++this.attempt;try{await this.video.play();}catch(_){if(this.done||attempt!==this.attempt)return;this.video.muted=true;try{await this.video.play();}catch(_){/* The play button remains available. */}}if(!this.done&&attempt===this.attempt)this.reflect();}
 poll(){if(this.done)return;let pads=[];try{pads=Array.from(navigator.getGamepads?.()||[]).filter(Boolean);}catch(_){}if(!this.padArmed)this.padArmed=pads.every(p=>p.buttons.every(b=>!b.pressed&&!(b.value>.5))&&p.axes.every(a=>Math.abs(a)<.35));else{const down=i=>pads.some(p=>p.buttons[i]?.pressed||p.buttons[i]?.value>.5),now={skip:down(0)||down(9),back:down(1)||down(8),sound:down(2)};if(now.skip&&!this.prev.skip)this.finish();else if(now.back&&!this.prev.back)this.root.querySelector('[data-movie="back"]').click();else if(now.sound&&!this.prev.sound)this.sound.click();this.prev=now;}if(!this.done)this.raf=requestAnimationFrame(()=>this.poll());}
 finish(){if(this.done)return;this.destroy();this.options.onComplete?.();}
 destroy(){if(this.done)return;this.done=true;++this.attempt;cancelAnimationFrame(this.raf);this.listeners.forEach(fn=>fn());this.video.pause();this.video.removeAttribute('src');this.video.load();this.root.remove();for(const[el,inert]of this.background)el.inert=inert;}
}
window.HealthiaCaveIntro={files,play:options=>new CaveIntro(options)};
})();
