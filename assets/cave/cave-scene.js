(function(){'use strict';
const {Model,PadEdges,DEFAULTS,CHARACTERS,characterId,outroOpacity,deadzoneAxis,gamepadSteering}=HealthiaCaveCore;
const script=document.currentScript,BASE=script.src?new URL('./',script.src).href:'';
const asset=file=>window.HealthiaCaveEmbedded?.[file]||BASE+file;
const HEART='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21S2 14.7 2 7.8C2 1.8 9 1.6 12 6c3-4.4 10-4.2 10 1.8C22 14.7 12 21 12 21Z"/></svg>';
const ARROW='<svg viewBox="0 0 50 50" aria-hidden="true"><path d="M6 25 26 6v12h18v14H26v12Z"/></svg>';
let current=null;
class Scene{
 constructor(options){this.options=options;this.model=new Model({...options.settings,character:options.character??options.settings?.character});this.portraits={};this.pad=new PadEdges();this.held=new Set();this.touches=new Map();this.audio=new HealthiaCaveAudio(BASE,window.HealthiaCaveEmbedded);this.audio.enabled=options.sound!==false;this.images={};this.closed=false;this.ready=false;this.ui='loading';this.menuIndex=0;this.shownEnd=false;this.accumulator=0;this.last=0;this.stepClock=0;this.uiClock=0;this.started=false;this.completedSent=false;this.padReady=false;this.padSnapshot=[];this.disposers=[];this.assetErrors=[];this.frameSamples=[];
  this.touchAxis=0;this.gamepadAxis=0;this.stickPointer=null;this.introPlayed=false;this.movie=null;
  this.root=document.createElement('section');this.root.id='healthia-cave';this.root.setAttribute('aria-label','Hero Showdown Chapter 2 — The Collapsing Cave');
  this.root.innerHTML=`<canvas class="cave-scene" aria-label="Super Summy running through a dark cave"></canvas>
  <div class="cave-hud"><img class="cave-portrait" alt="Super Summy" src="${asset('summy-portrait.webp')}"><div class="cave-health"><div class="cave-name">SUPER SUMMY</div><div class="cave-health-track" role="meter" aria-label="Health" aria-valuemin="0" aria-valuemax="3" aria-valuenow="3"><div class="cave-health-fill"></div></div><div class="cave-hearts">${HEART.repeat(3)}</div></div></div>
  <div class="cave-map" aria-label="Cave progress"><canvas width="112" height="132"></canvas></div>
  <div class="cave-toolbar"><button class="cave-small" data-action="pause" aria-label="Pause cave">Ⅱ</button><button class="cave-small" data-action="sound" aria-label="Toggle sound">♪</button><button class="cave-small" data-action="fullscreen" aria-label="Fullscreen">⛶</button></div>
  <nav class="cave-controls" aria-label="Earth Whirlwind directions">${['Left','Up','Right'].map((n,i)=>`<button aria-label="${n} whirlwind" data-lane="${i}">${i===0?ARROW:ARROW.replace('<svg ','<svg style="transform:rotate('+ (i===1?'90':'180')+'deg)" ')}<span>${n.toUpperCase()}</span></button>`).join('')}</nav>
  <div class="cave-tip" hidden>Break the shaking stalactites: ← ↑ →</div><div class="cave-progress"><i></i></div><div class="cave-live" role="status" aria-live="polite"></div><div class="cave-modal"><div class="cave-panel"><div class="cave-eyebrow">HERO SHOWDOWN / CHAPTER 02</div><h1>THE COLLAPSING<br>CAVE</h1><p>Preparing the cave…</p></div></div>`;
  this.parent=document.fullscreenElement||document.webkitFullscreenElement||document.body;this.parent.append(this.root);
  this.background=[...this.parent.children].filter(el=>el!==this.root).map(el=>[el,el.inert]);for(const[el]of this.background)el.inert=true;
  this.previousFocus=document.activeElement;this.canvas=this.root.querySelector('.cave-scene');this.modal=this.root.querySelector('.cave-modal');this.map=this.root.querySelector('.cave-map canvas');this.renderer=new HealthiaCaveRenderer(this.canvas,this.images);
  this.bind();this.resize();this.renderer.draw(this.model);this.raf=requestAnimationFrame(ms=>this.frame(ms));this.load();
 }
 on(target,type,fn,options){target.addEventListener(type,fn,options);this.disposers.push(()=>target.removeEventListener(type,fn,options));}
 bind(){
  this.on(window,'resize',()=>this.resize());if(window.visualViewport)this.on(visualViewport,'resize',()=>this.resize());
  this.on(window,'keydown',e=>this.keydown(e),true);this.on(window,'keyup',e=>{if(this.closed||this.ui==='intro')return;if(this.consumeKey(e)){e.preventDefault();e.stopImmediatePropagation();}this.held.delete(e.code);this.updateSteering();},true);
  this.on(window,'blur',()=>{this.release();if(this.model.state==='running')this.pause();});
  this.on(document,'visibilitychange',()=>{if(document.hidden){this.release();if(this.model.state==='running')this.pause();}this.last=0;});
  this.on(window,'gamepaddisconnected',()=>{this.pad.reset();this.padReady=false;this.gamepadAxis=0;this.updateSteering();});
  const controls=this.root.querySelector('.cave-controls');
  this.on(controls,'pointerdown',e=>{
   if(this.model.state!=='running')return;
   const stick=e.target.closest('[data-stick]');if(stick&&this.model.character==='vee'){
    e.preventDefault();if(this.stickPointer)return;this.stickPointer={id:e.pointerId,el:stick};stick.setPointerCapture(e.pointerId);this.moveStick(e);return;
   }
   const button=e.target.closest('button[data-lane]');if(!button)return;e.preventDefault();button.setPointerCapture(e.pointerId);if([...this.touches.values()].includes(button))return;this.touches.set(e.pointerId,button);this.fire(Number(button.dataset.lane));
  });
  this.on(controls,'pointermove',e=>{if(this.stickPointer?.id===e.pointerId){e.preventDefault();this.moveStick(e);}});
  const up=e=>{if(this.stickPointer?.id===e.pointerId)this.endStick();const button=this.touches.get(e.pointerId);this.touches.delete(e.pointerId);button?.classList.remove('pressed');};for(const type of['pointerup','pointercancel','lostpointercapture'])this.on(controls,type,up);
  this.root.querySelector('[data-action="pause"]').onclick=()=>this.model.state==='paused'?this.resume():this.pause();
  this.root.querySelector('[data-action="sound"]').onclick=()=>{this.audio.setEnabled(!this.audio.enabled);this.audio.unlock().then(()=>{if(this.model.state==='running')this.audio.ambience();});this.reflectSound();};
  this.root.querySelector('[data-action="fullscreen"]').onclick=()=>{try{if(document.fullscreenElement)document.exitFullscreen()?.catch(()=>{});else this.root.requestFullscreen?.().catch(()=>{});}catch(_){}};
 }
 consumeKey(e){return /^(Arrow|Key[ADRMPX]|Enter|Space|Escape|Digit|Numpad|Backspace|Tab)/.test(e.code);}
 drawStick(x,y=0){const stick=this.root.querySelector('[data-stick]');if(!stick)return;const thumb=stick.querySelector('.cave-stick-thumb'),radius=stick.clientWidth*.31;thumb.style.transform='translate('+x*radius+'px,'+y*radius+'px)';stick.setAttribute('aria-valuenow',String(Math.round(x*100)));}
 moveStick(e){
  const pointer=this.stickPointer;if(!pointer||this.model.state!=='running')return;
  const b=pointer.el.getBoundingClientRect(),radius=b.width*.31,dx=(e.clientX-b.left-b.width/2)/radius,dy=(e.clientY-b.top-b.height/2)/radius,length=Math.max(1,Math.hypot(dx,dy));
  const x=dx/length,y=dy/length;this.touchAxis=deadzoneAxis(x,.1);this.drawStick(x,y);this.updateSteering();
 }
 endStick(){const pointer=this.stickPointer;this.stickPointer=null;this.touchAxis=0;if(pointer?.el.hasPointerCapture?.(pointer.id))pointer.el.releasePointerCapture(pointer.id);this.drawStick(0);this.updateSteering();}
 updateSteering(){
  if(this.model.character!=='vee')return;
  const left=this.held.has('ArrowLeft')||this.held.has('KeyA'),right=this.held.has('ArrowRight')||this.held.has('KeyD');
  const axis=this.model.state!=='running'?0:this.stickPointer?this.touchAxis:left||right?Number(right)-Number(left):this.gamepadAxis;
  this.model.steer(axis);if(!this.stickPointer)this.drawStick(axis);
 }
 keydown(e){
  if(this.closed||this.ui==='intro')return;
  if(this.consumeKey(e)){e.preventDefault();e.stopImmediatePropagation();}
  if(e.repeat||this.held.has(e.code))return;this.held.add(e.code);
  if(this.ui==='code'){
   if(/^\d$/.test(e.key)){this.code=(this.code+e.key).slice(0,4);this.reflectCode();}
   else if(e.code==='Backspace'){this.code=this.code.slice(0,-1);this.reflectCode();}
   else if(e.code==='Enter')this.submitCode();else if(e.code.startsWith('Arrow'))this.navigate(e.code==='ArrowLeft'||e.code==='ArrowUp'?-1:1);else if(e.code==='Space')this.activate();else if(e.code==='Escape')this.close('exit');else if(e.code==='Tab')this.navigate(e.shiftKey?-1:1);return;
  }
  if(this.model.state==='outro'||(['complete','defeat'].includes(this.model.state)&&!this.shownEnd))return;
  if(this.model.state==='running'){
   if(this.model.character==='vee'&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD'].includes(e.code)){this.updateSteering();return;}
   const lane={ArrowLeft:0,ArrowUp:1,ArrowRight:2}[e.code];if(lane!==undefined)this.fire(lane);else if(this.model.character==='sadie'&&['Space','KeyX','Enter'].includes(e.code))this.fire(1);
   else if(e.code==='Escape'||e.code==='KeyP')this.pause();else if(e.code==='KeyM')this.root.querySelector('[data-action="sound"]').click();
  }else if(e.code==='Enter'||e.code==='Space')this.activate();
  else if(e.code==='KeyR'&&this.ui==='defeat')this.retry();
  else if(e.code==='Escape'){if(this.model.state==='paused')this.resume();else if(this.ui==='ready')this.close('exit');}
  else if(e.code.startsWith('Arrow')||e.code==='Tab')this.navigate(e.code==='ArrowLeft'||e.code==='ArrowUp'||e.shiftKey?-1:1);
 }
 release(){this.held.clear();this.touches.clear();this.gamepadAxis=0;this.endStick();this.model.steer(0);this.root.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));this.padReady=false;}
 resize(){this.endStick();const b=this.root.getBoundingClientRect();this.renderer.resize(b.width,b.height,devicePixelRatio||1);}
 async load(){
  const entries={sadie:'sadie-sheet',vee:'vee-sheet',portraits:'heroes-reference',run:'summy-run',upper:'summy-upper',rocks:'rocks',stalactites:'stalactites',summyFall:'summy-fall',sadieFall:'sadie-fall',veeFall:'vee-fall',damage:'summy-damage',recovery:'summy-recovery'};
  this.assetErrors=[];
  await Promise.all(Object.entries(entries).map(([key,file])=>new Promise(resolve=>{const im=new Image();im.onload=()=>{this.images[key]=im;resolve();};im.onerror=()=>{this.assetErrors.push(file);resolve();};im.src=asset(file+'.webp');})));
  if(this.closed)return;
  if(this.assetErrors.length){this.ui='error';this.panel('<h2>The cave couldn’t load.</h2><p>Keep the HTML beside its assets folder, then retry.</p><button class="cave-primary" data-choice="reload">RETRY LOADING</button><button class="cave-secondary" data-choice="exit">BACK</button>');this.wire({reload:()=>this.load(),exit:()=>this.close('exit')});return;}
  this.ready=true;this.makePortraits();this.syncCharacter();if(this.options.requireCode)this.showCode();else this.afterAccess();
 }
 panel(content){this.modal.hidden=false;this.modal.innerHTML='<div class="cave-panel">'+content+'</div>';this.menuIndex=0;requestAnimationFrame(()=>{if(!this.closed)this.buttons()[0]?.focus({preventScroll:true});});}
 wire(actions){for(const [key,fn]of Object.entries(actions)){const b=this.modal.querySelector('[data-choice="'+key+'"]');if(b)b.onclick=fn;}this.buttons().forEach((b,i)=>b.addEventListener('pointerenter',()=>this.menuIndex=i));}
 buttons(){return [...this.modal.querySelectorAll('button')].filter(b=>!b.disabled);}
 navigate(dir){const b=this.buttons();if(!b.length)return;const focused=b.indexOf(document.activeElement);this.menuIndex=((focused<0?this.menuIndex:focused)+dir+b.length)%b.length;b[this.menuIndex].focus();}
 activate(){const buttons=this.buttons();(buttons.includes(document.activeElement)?document.activeElement:buttons[this.menuIndex]||buttons[0])?.click();}
 showCode(){this.ui='code';this.code='';this.panel(`<div class="cave-eyebrow">STORY MODE / DEVELOPMENT</div><h2>Chapter 2 access</h2><p>Enter the Story Mode development code.</p><label for="cave-code">FOUR-DIGIT CODE</label><input id="cave-code" type="password" inputmode="numeric" maxlength="4" autocomplete="off" aria-label="Four-digit access code" readonly><div class="cave-keypad">${[1,2,3,4,5,6,7,8,9,0].map(n=>'<button data-digit="'+n+'">'+n+'</button>').join('')}<button data-choice="delete" aria-label="Delete digit">⌫</button><button data-choice="submit">ENTER</button></div><p class="cave-error" role="status"></p><button class="cave-secondary" data-choice="exit">BACK</button>`);
  this.modal.querySelectorAll('[data-digit]').forEach(b=>b.onclick=()=>{this.code=(this.code+b.dataset.digit).slice(0,4);this.reflectCode();});this.wire({delete:()=>{this.code=this.code.slice(0,-1);this.reflectCode();},submit:()=>this.submitCode(),exit:()=>this.close('exit')});
 }
 reflectCode(){this.modal.querySelector('#cave-code').value=this.code;this.modal.querySelector('.cave-error').textContent='';}
 submitCode(){if(this.code==='1992'){this.afterAccess();this.audio.unlock();}else{this.code='';this.reflectCode();this.modal.querySelector('.cave-error').textContent='Incorrect code. Try again.';}}
 makePortraits(){this.portraits.summy=asset('summy-portrait.webp');for(const[id,crop]of Object.entries({sadie:[838,35,250,250],vee:[245,630,225,225]})){const canvas=document.createElement('canvas');canvas.width=canvas.height=180;const g=canvas.getContext('2d');g.fillStyle='#102b1d';g.fillRect(0,0,180,180);g.drawImage(this.images.portraits,...crop,0,0,180,180);this.portraits[id]=canvas.toDataURL('image/webp');}}
 afterAccess(){if(this.options.standalone&&this.options.character===undefined)this.showChoice();else if(this.options.autoEnter)this.start();else this.showReady();}
 showChoice(){this.release();this.audio.stopAmbience();if(this.model.state==='running')this.model.pause();this.ui='choose';this.panel('<div class="cave-eyebrow">HERO SHOWDOWN / CHAPTER 02</div><h2>Choose your <br>main hero.</h2><div class="cave-hero-choices">'+Object.keys(CHARACTERS).map(id=>'<button class="cave-hero-choice" data-hero="'+id+'"><img alt="" src="'+this.portraits[id]+'"><span><strong>'+CHARACTERS[id].name+'</strong><small>'+({summy:'Send whirlwinds in three directions.',sadie:'Punch the rocks ahead. No dodging.',vee:'Steer freely. Find the clear path.'}[id])+'</small></span><b aria-hidden="true">→</b></button>').join('')+'</div><button class="cave-secondary" data-choice="exit">BACK</button>');for(const b of this.modal.querySelectorAll('[data-hero]'))b.onclick=()=>this.selectCharacter(b.dataset.hero);this.wire({exit:()=>this.close('exit')});}
 selectCharacter(id){this.introPlayed=false;delete this.root.dataset.ending;this.root.style.removeProperty('--cave-end-fade');this.audio.setSceneLevel(1);this.model=new Model({...this.options.settings,character:characterId(id)});this.renderer.reset();this.shownEnd=false;this.completedSent=false;this.stepClock=0;this.release();this.syncCharacter();this.showReady();this.hud();}
 syncCharacter(){const id=this.model.character,name=CHARACTERS[id].name;this.root.dataset.character=id;this.root.querySelector('.cave-name').textContent=name;const portrait=this.root.querySelector('.cave-portrait');portrait.src=this.portraits[id]||asset('summy-portrait.webp');portrait.alt=name;this.canvas.setAttribute('aria-label',name+' running through a dark cave');const nav=this.root.querySelector('.cave-controls');nav.setAttribute('aria-label',id==='sadie'?'Super Punch':id==='vee'?'Analog steering':'Earth Whirlwind directions');
  nav.innerHTML=id==='vee'?'<div class="cave-stick" data-stick role="slider" tabindex="0" aria-label="Steer Super Vee" aria-orientation="horizontal" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="0"><i class="cave-stick-track" aria-hidden="true"></i><i class="cave-stick-thumb" aria-hidden="true"></i><span>STEER</span></div>':id==='sadie'?'<button data-lane="1" class="cave-punch" aria-label="Punch boulder"><svg viewBox="0 0 50 50" aria-hidden="true"><path d="M10 27V17q0-5 6-5V10q0-5 6-4l3 2q5-4 9 2 7-1 7 7v10q0 5-8 9v8H18v-8l-7-5q-5-4-2-9l7 3v-8h3v11l8 3 2-4 8-2v-3l-10 2-7-4-2 4Z"/></svg><span>PUNCH</span></button>':['Left','Up','Right'].map((n,i)=>'<button data-lane="'+i+'" aria-label="'+(id==='vee'?'Run in '+['left','center','right'][i]+' lane':n+' whirlwind')+'">'+(i===0?ARROW:ARROW.replace('<svg ','<svg style="transform:rotate('+(i===1?'90':'180')+'deg)" '))+'<span>'+(id==='vee'?['LEFT','CENTER','RIGHT'][i]:n.toUpperCase())+'</span></button>').join('');
 }
 showReady(){this.ui='ready';const id=this.model.character,name=CHARACTERS[id].name,description={summy:'Sharp stalactites break loose together. Match each shaking spike with a whirlwind.',sadie:'Punch as the boulder crosses the gold target beside your hands.<br>It keeps falling at full speed. Time your hit. No dodging.',vee:'Steer freely between the ground boulders.<br>Two paths are blocked every time. Find the clear opening.'}[id],instructions=id==='sadie'?'<div><b>✦</b>PUNCH IN THE TARGET</div>':id==='vee'?'<div><b>◉</b>DRAG THE ANALOG TO STEER</div>':'<div><b>←</b>LEFT SPIKE</div><div><b>↑</b>CENTER SPIKE</div><div><b>→</b>RIGHT SPIKE</div>',controls=id==='sadie'?'Space / ↑, controller A / Cross, or tap PUNCH.':id==='vee'?'Drag the analog, hold ← / → or A / D, or use the controller stick / D-pad.':'Arrow keys, D-pad / stick, or the screen buttons.';
  this.panel('<div class="cave-eyebrow">'+name+' / CHAPTER 02</div><h1>THE COLLAPSING<br>CAVE</h1><p>'+description+'</p><div class="cave-instructions">'+instructions+'</div><p class="cave-subtle">Running is automatic. '+controls+'<br>Three hearts. A 1 minute 45 second run. The cave gets harder as you go.</p><button class="cave-primary" data-choice="begin">ENTER THE CAVE</button>'+(this.options.standalone?'<button class="cave-secondary" data-choice="choose">CHANGE HERO</button>':'')+'<button class="cave-secondary" data-choice="exit">BACK</button>');this.wire({begin:()=>this.start(),choose:()=>this.showChoice(),exit:()=>this.close('exit')});this.reflectSound();}
 reflectSound(){const b=this.root.querySelector('[data-action="sound"]');b.textContent=this.audio.enabled?'♪':'×';b.setAttribute('aria-label',this.audio.enabled?'Mute cave sounds':'Enable cave sounds');b.setAttribute('aria-pressed',String(this.audio.enabled));}
 playIntro(){if(this.movie||this.closed)return;this.ui='intro';this.modal.hidden=true;this.release();this.audio.stopAmbience();this.movie=HealthiaCaveIntro.play({parent:this.root,character:this.model.character,sound:this.audio.enabled,onSound:enabled=>{this.audio.setEnabled(enabled);this.reflectSound();},onComplete:()=>{this.movie=null;if(this.closed)return;this.introPlayed=true;this.start();},onExit:()=>this.close('exit')});}
 start(){if(!this.ready||this.closed||this.movie)return;if(!this.introPlayed&&this.options.intro!==false)return this.playIntro();delete this.root.dataset.ending;this.root.style.removeProperty('--cave-end-fade');this.audio.setSceneLevel(1);this.ui='playing';this.modal.hidden=true;this.model.start();this.started=true;this.last=0;this.accumulator=0;this.release();this.audio.unlock().then(()=>{if(!this.closed&&this.model.state==='running')this.audio.ambience();});this.root.querySelector('.cave-tip').textContent={summy:'Break the shaking stalactites: ← ↑ →',sadie:'Punch when the rock enters the gold target.',vee:'Drag the analog to steer through the clear opening.'}[this.model.character];this.root.querySelector('.cave-tip').hidden=false;this.announce('Run started. Three hearts.');this.options.onStart?.();}
 fire(lane){if(this.model.input(lane)){const b=this.root.querySelector('[data-lane="'+lane+'"]');b?.classList.add('pressed');if(b)b.dataset.until=String(this.model.time+.18);}}
 pause(){if(this.model.state!=='running')return;this.model.pause();this.audio.suspend();this.ui='paused';this.release();this.panel('<div class="cave-eyebrow">CHAPTER 02</div><h2>Take a breath.</h2><p>The cave is paused.</p><button class="cave-primary" data-choice="resume">KEEP RUNNING</button><button class="cave-secondary" data-choice="retry">RESTART CAVE</button>'+(this.options.standalone?'<button class="cave-secondary" data-choice="choose">CHANGE HERO</button>':'')+'<button class="cave-secondary" data-choice="exit">BACK TO GAME MODES</button>');this.wire({resume:()=>this.resume(),retry:()=>this.retry(),choose:()=>this.showChoice(),exit:()=>this.close('exit')});}
 resume(){if(this.model.state!=='paused')return;this.ui='playing';this.modal.hidden=true;this.model.resume();this.last=0;this.accumulator=0;this.release();this.audio.unlock().then(()=>this.audio.ambience());}
 retry(){this.model.reset();this.renderer.reset();this.shownEnd=false;this.completedSent=false;this.stepClock=0;this.start();this.hud();}
 announce(text){this.root.querySelector('.cave-live').textContent=text;}
 finish(){if(this.shownEnd)return;this.shownEnd=true;const won=this.model.state==='complete';this.ui=won?'complete':'defeat';this.audio.stopAmbience();
  if(won){this.panel('<div class="cave-eyebrow">HERO SHOWDOWN / CHAPTER 02</div><h2>Cave sequence complete</h2><button class="cave-primary" data-choice="retry">REPLAY CAVE</button><button class="cave-secondary" data-choice="exit">'+(this.options.standalone?'BACK TO CHAPTER 2':'GAME MODES')+'</button>');}
  else this.panel('<div class="cave-eyebrow">CHAPTER 02 / TRY AGAIN</div><h2>'+({vee:'Find the<br>clear lane.',sadie:'Time your<br>next punch.',summy:'Keep your eyes<br>on the ceiling.'}[this.model.character])+'</h2><p>'+({summy:'Match the direction of each shaking stalactite before it reaches you.',sadie:'Wait for the boulder to enter the gold target, then punch as it passes through.',vee:'Steer into the clear opening before the boulders reach you.'}[this.model.character])+'</p><div class="cave-stats"><div><strong>'+(this.model.character==='vee'?this.model.dodged:this.model.destroyed)+'</strong><span>'+(this.model.character==='vee'?'ROCKS DODGED':this.model.character==='summy'?'SPIKES BROKEN':'ROCKS BROKEN')+'</span></div><div><strong>'+this.model.bestCombo+'</strong><span>BEST STREAK</span></div><div><strong>'+this.model.hearts+'</strong><span>HEARTS</span></div></div><button class="cave-primary" data-choice="retry">RETRY</button><button class="cave-secondary" data-choice="exit">'+(this.options.standalone?'BACK TO CHAPTER 2':'GAME MODES')+'</button>');this.wire({retry:()=>this.retry(),exit:()=>this.close(won?'complete':'exit')});this.release();
  if(won&&!this.completedSent){this.completedSent=true;const detail={chapter:2,scene:'collapsing-cave',character:this.model.character,dodged:this.model.dodged,hearts:this.model.hearts,rocksBroken:this.model.destroyed,elapsed:this.model.time};window.dispatchEvent(new CustomEvent('healthia:cave-complete',{detail}));this.options.onComplete?.(detail);}
 }
 hud(){const m=this.model;if(m.outroAge>0){this.root.style.setProperty('--cave-end-fade',Math.min(1,m.outroAge/.5));this.audio.setSceneLevel(1-outroOpacity(m.outroAge,m.config.outro));}this.root.querySelector('.cave-health-fill').style.width=(m.hearts/3*100)+'%';this.root.querySelector('[role="meter"]').setAttribute('aria-valuenow',m.hearts);this.root.querySelectorAll('.cave-hearts svg').forEach((s,i)=>s.classList.toggle('empty',i>=m.hearts));this.root.querySelector('.cave-progress i').style.width=Math.min(100,m.time/m.config.duration*100)+'%';this.renderer.minimap(this.map,Math.min(1,m.time/m.config.duration));const tip=this.root.querySelector('.cave-tip');tip.style.opacity=m.time<4?'1':'0';if(m.time>5)tip.hidden=true;for(const b of this.root.querySelectorAll('[data-lane]'))if(m.time>Number(b.dataset.until||0)&&![...this.touches.values()].includes(b))b.classList.remove('pressed');}
 events(){for(const e of this.model.drain()){this.renderer.event(e,this.model);if(e.type==='outro'){this.ui='outro';this.root.dataset.ending='true';this.release();}if(e.type==='warning')this.audio.play('crack',.58);if(e.type==='fall')this.audio.play('fall',.42);if(e.type==='attack')this.audio.play('whirlwind',.68);if(e.type==='punch')this.audio.play('impact',.23,1.25);if(e.type==='dodge')this.audio.play('footstep-2',.15,1.15);if(e.type==='shatter'){this.audio.play('shatter',.77);this.audio.play('debris',.25);}
   if(e.type==='impact'){this.audio.play('impact',.65);if(e.hurt){this.audio.play('damage',.38);this.announce(this.model.hearts+' hearts remaining.');}}
   if(e.type==='defeat'){this.audio.play('defeat',.5);this.announce('Out of hearts. Retry the cave.');}
  }}
 poll(){if(this.ui==='intro')return;let pads=[];try{pads=Array.from(navigator.getGamepads?.()||[]).filter(Boolean);}catch(_){}this.padSnapshot=pads;
  const edges=this.pad.sample(pads);if(!this.padReady){this.padReady=pads.every(p=>p.buttons.every(b=>!b.pressed&&b.value<.5)&&p.axes.every(a=>Math.abs(a)<.16));this.gamepadAxis=0;this.updateSteering();return;}this.gamepadAxis=gamepadSteering(pads);this.updateSteering();
  for(const key of edges){if(this.model.state==='outro'||(['complete','defeat'].includes(this.model.state)&&!this.shownEnd))continue;if(this.model.state==='running'){if(this.model.character==='vee'&&['left','up','right'].includes(key))continue;if(key==='confirm'&&this.model.character==='sadie')this.fire(1);else if(key==='left')this.fire(0);else if(key==='up')this.fire(1);else if(key==='right')this.fire(2);else if(key==='pause'||key==='back')this.pause();}
   else if(key==='confirm')this.activate();else if(key==='pause'){if(this.model.state==='paused')this.resume();else if(this.ui==='ready')this.start();else if(this.ui==='defeat')this.retry();}else if(['left','up','right'].includes(key))this.navigate(key==='right'?1:-1);else if(key==='back'){if(this.model.state==='paused')this.resume();}}
 }
 frame(ms){if(this.closed)return;let dt=this.last?Math.max(0,(ms-this.last)/1000):0;this.last=ms;const cinematic=['outro','complete','defeat'].includes(this.model.state);if(!cinematic&&dt>.4)dt=0;dt=Math.min(dt,cinematic?.5:.1);this.poll();
  if(this.model.state==='running'||this.model.state==='outro'){this.accumulator+=dt;while(this.accumulator>=DEFAULTS.step){this.model.tick(DEFAULTS.step);this.events();this.accumulator-=DEFAULTS.step;}
   this.stepClock+=dt;if(this.stepClock>(3.6+this.model.speed*.05)/this.model.speed/2){this.stepClock=0;this.audio.play('footstep-'+(Math.floor(this.model.time*3.4)%3+1),.19,1+this.model.phase*.03);}}
  const landed=this.renderer.fallLanded;this.renderer.update(this.model.state==='paused'?0:dt,this.model);if(!landed&&this.renderer.fallLanded&&this.model.state==='defeat')this.audio.play('impact',.28,.8);this.renderer.draw(this.model);this.uiClock+=dt;if(this.uiClock>.08){this.uiClock=0;this.hud();}
  if(['defeat','complete'].includes(this.model.state)&&this.renderer.endAge>(this.model.state==='complete'?.35:1.65))this.finish();
  if(dt>0&&this.model.state==='running'){this.frameSamples.push(dt);if(this.frameSamples.length>300)this.frameSamples.shift();}
  this.raf=requestAnimationFrame(t=>this.frame(t));
 }
 close(reason){if(this.closed)return;this.closed=true;this.movie?.destroy();this.movie=null;cancelAnimationFrame(this.raf);this.disposers.forEach(f=>f());this.audio.dispose();this.renderer.dispose();this.root.remove();for(const[el,inert]of this.background)el.inert=inert;this.previousFocus?.focus?.({preventScroll:true});current=null;api.active=false;this.options.onExit?.(reason);}
}
const api={active:false,open(options={}){if(current)return current;api.active=true;current=new Scene(options);return current;},close(){current?.close('exit');},get scene(){return current;},get settings(){return DEFAULTS;}};
window.HealthiaCave=api;
})();
