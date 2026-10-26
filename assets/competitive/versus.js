/* Opt-in integration. This file is loaded exclusively by playable-villains-test.html. */
'use strict';
window.HealthiaCompetitive=(()=>{
  const Data=HealthiaCompetitiveData,Combat=HealthiaCompetitiveCombat,CPU=HealthiaCompetitiveCPU,Animation=HealthiaCompetitiveAnimation;
  const session={active:false,world:null,ids:['summy','bushman'],kind:'cpu',difficulty:'medium',keyboard:[{},{}],pads:[{},{}],padPrevious:[{},{}],fx:[],selectionSide:0,padSlots:[null,null],heavy:false,resultShown:false};
  const original={showModeSelect,coChooseMode,showSelect,showOpponent,showDifficulty,showVenue,start,update,updateStep,draw,action,directionPress,pollPad,pauseGame,clearInput,result};
  const playerColors=['#b8ffbf','#ffbe8e'];
  function isActive(){return session.active&&!story.active;}
  function resetInputs(){session.keyboard=[{},{}];session.pads=[{},{}];session.padPrevious=[{},{}];session.heavy=false;document.querySelector('[data-competitive-control="heavy"]')?.setAttribute('aria-pressed','false');for(const f of session.world?.fighters||[]){f.previous={};f.queued=[];f.buffer=null;f.chain=null;}session.world&&(session.world.remainder=0);}
  clearInput=function(...args){resetInputs();return original.clearInput(...args);};
  function saveLegacy(){if(!session.legacy)session.legacy={hero,boss,selected,opponent,t,elapsed,ending,phase,effects,particles,shots,hazards};}
  function leave(){session.active=false;session.world=null;session.fx=[];resetInputs();if(session.legacy){({hero,boss,selected,opponent,t,elapsed,ending,phase,effects,particles,shots,hazards}=session.legacy);session.legacy=null;}document.body.classList.remove('competitive');for(const b of document.querySelectorAll('[data-competitive-control]'))b.hidden=true;}
  showModeSelect=function(...args){leave();return original.showModeSelect(...args);};
  function panel(content,screen='competitive-menu'){
    mode=screen;paused=false;clearInput();overlay.classList.remove('hidden');overlay.innerHTML='<section class="panel competitive-panel">'+content+'</section>';menuFocusElement=null;syncMenuFocus();window.HealthiaMenuMusic?.sync();
  }
  coChooseMode=function(){
    coLeave();leave();session.active=true;document.body.classList.add('competitive');
    panel('<div class="eyebrow">VERSUS · 12 FIGHTERS</div><h2>Choose your match.</h2><div class="mode-grid"><button class="mode-tile versus-tile" id="competitive-cpu"><h3>PLAYER VS CPU</h3><p>All heroes and villains. Both fighters start with 100 HP.</p></button><button class="mode-tile" id="competitive-local"><h3>LOCAL PVP</h3><p>Two players. Shared keyboard or two controllers. Mirror matches welcome.</p></button><button class="mode-tile" id="competitive-boss"><h3>CO-OP BOSS BATTLE</h3><p>Original same-device and online co-op boss mode.</p></button></div><button id="competitive-back">← GAME MODES</button>');
    document.getElementById('competitive-cpu').onclick=()=>{session.kind='cpu';chooseDifficulty();};
    document.getElementById('competitive-local').onclick=()=>{session.kind='local';choose(0);};
    document.getElementById('competitive-boss').onclick=()=>{leave();original.coChooseMode();};
    document.getElementById('competitive-back').onclick=showModeSelect;
  };
  function chooseDifficulty(){
    panel('<div class="eyebrow">COMPETITIVE CPU</div><h2>Choose the challenge.</h2><div class="mode-grid">'+['easy','medium','hard'].map((id,i)=>'<button class="mode-tile '+(session.difficulty===id?'selected':'')+'" data-cdifficulty="'+id+'"><h3>'+id.toUpperCase()+'</h3><p>'+['More time to react. Fewer blocks and counters.','Balanced offense, defense, and spacing.','Quicker decisions, stronger defense, and recovery punishes.'][i]+'</p><span class="mode-status">100 HP · SAME DAMAGE RULES</span></button>').join('')+'</div><button id="competitive-back">← MATCH TYPE</button>');
    overlay.querySelectorAll('[data-cdifficulty]').forEach(b=>b.onclick=()=>{session.difficulty=b.dataset.cdifficulty;choose(0);});document.getElementById('competitive-back').onclick=coChooseMode;
  }
  function portrait(c){return c.hero!==undefined?portraitData(c.hero):enemyPortrait(c.villain);}
  function choose(side){
    session.selectionSide=side;
    const label=side?(session.kind==='cpu'?'CPU':'PLAYER 2'):'PLAYER 1';
    panel('<div class="eyebrow">'+label+' · 100 HP</div><h2>Choose your fighter.</h2><div class="cards competitive-roster">'+Data.roster.map(c=>'<button class="card '+(session.ids[side]===c.id?'selected':'')+'" data-fighter="'+c.id+'" aria-pressed="'+(session.ids[side]===c.id)+'"><img class="portrait" src="'+portrait(c)+'" alt="'+c.name+'"><h3>'+c.name+'</h3><span class="tag">'+c.style+'</span></button>').join('')+'</div><div class="menu-action-dock"><button id="competitive-back">← '+(side?'PLAYER 1':'MATCH OPTIONS')+'</button><button class="primary" id="competitive-next">'+(side?'CHOOSE VENUE →':'CHOOSE '+(session.kind==='cpu'?'CPU':'PLAYER 2')+' →')+'</button></div>');
    overlay.querySelectorAll('[data-fighter]').forEach(b=>b.onclick=()=>{session.ids[side]=b.dataset.fighter;overlay.querySelectorAll('[data-fighter]').forEach(el=>{const active=el===b;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));});tone(440,.04);});
    document.getElementById('competitive-next').onclick=()=>side?chooseVenue():choose(1);
    document.getElementById('competitive-back').onclick=()=>side?choose(0):session.kind==='cpu'?chooseDifficulty():coChooseMode();
  }
  function chooseVenue(){
    panel('<div class="eyebrow">'+session.ids.map(id=>Data.byId[id].name).join(' VS ')+'</div><h2>Choose your arena.</h2><div class="cards venues">'+venueNames.map((name,i)=>'<button class="card '+(venue===i?'selected':'')+'" data-competitive-venue="'+i+'"><img class="venue-photo" src="'+venueImages[i].src+'" alt="'+name+'"><h3>'+name+'</h3><p>'+(['Lighthouse · Hampton','Boardwalk · Virginia Beach','Fountain · Norfolk','Dodge the marked monster slams.','Block the sweeping tornado.'][i])+'</p></button>').join('')+'</div><p id="competitive-load-status" role="status"></p><div class="menu-action-dock"><button id="competitive-back">← FIGHTERS</button><button id="competitive-start" class="primary">START MATCH →</button></div>');
    overlay.querySelectorAll('[data-competitive-venue]').forEach(b=>b.onclick=()=>{venue=+b.dataset.competitiveVenue;chooseVenue();});document.getElementById('competitive-back').onclick=()=>choose(1);document.getElementById('competitive-start').onclick=beginMatch;
  }
  function ready(){return loaded&&HealthiaBushman.ready()&&(venue!==3||harborReady())&&(venue!==4||tempestReady());}
  function beginMatch(options){
    if(options&&Array.isArray(options.ids)){session.ids=[...options.ids];session.kind=options.kind||'cpu';session.difficulty=options.difficulty||'medium';venue=options.venue??0;}
    if(!ready()){const note=document.getElementById('competitive-load-status');if(note)note.textContent='Artwork is still loading. Try Start Match again in a moment.';return false;}
    saveLegacy();session.active=true;document.body.classList.add('competitive');coLeave();story.active=false;specialSceneReset();
    session.world=Combat.create({ids:session.ids,controls:['human',session.kind==='cpu'?'cpu':'human'],difficulty:session.difficulty,venue});
    session.fx=[];session.resultShown=false;session.padSlots=[null,null];clearInput();
    // Safe compatibility views for original environment/audio helpers; never run boss update logic.
    hero={...session.world.fighters[0]};boss={...session.world.fighters[1],max:100,state:'idle',dir:-1};selected=Data.byId[session.ids[0]].hero??0;opponent=Data.byId[session.ids[1]].villain??0;
    mode='fight';paused=false;phase=1;elapsed=0;ending=0;t=0;shake=0;hitStop=0;simulationRemainder=0;
    effects=[];particles=[];shots=[];hazards=[];harborHazard.reset();tempestHazard.reset();
    overlay.classList.add('hidden');document.getElementById('pause').textContent='PAUSE';
    for(const b of document.querySelectorAll('[data-competitive-control]'))b.hidden=false;
    audio();scoreTick();layoutBattleControls();return true;
  }
  function inputs(world){
    return world.fighters.map((f,i)=>{
      if(f.control==='cpu')return CPU.input(world,f,Combat.STEP);
      const state=merge(session.keyboard[i],i===0?touchHeld:{});
      // Keyboard/touch presses are queued at event time, so even a complete tap between
      // render frames works. Only gamepads derive action edges during simulation.
      for(const k of ['jump','punch','kick','shoot','skill','special','dash'])delete state[k];
      return {...merge(state,session.pads[i]),heavy:!!(session.keyboard[i].heavy||session.pads[i].heavy||(i===0&&session.heavy))};
    });
  }
  function merge(...list){const out={};for(const v of list)for(const k in v)out[k]=!!(out[k]||v[k]);return out;}
  function stepHazards(w,dt){
    if(w.status!=='fight')return;
    if(venue===3){
      harborHazard.step(dt,slam=>{for(const f of w.fighters)if(HealthiaHarborCore.inSlam(f,slam,GROUND))Combat.hurt(w,f,18,slam.x,{hazard:true,blockable:false,knockdown:true});combatSound('ground',1,'armor');});
      w.hazardWarning=harborHazard.state.phase==='windup'?'slam':'';
    }else if(venue===4){
      tempestHazard.step(dt,{fighters:w.fighters.map(f=>({...f,id:'p'+f.slot})),onContact:e=>{const f=w.fighters[+e.id.slice(1)];if(!e.blocked)Combat.hurt(w,f,18,f.x-e.direction*100,{hazard:true,blockable:false,knockdown:true});else w.events.push({type:'block',slot:f.slot,x:f.x,y:f.y-130});},onPhase:tempestPhaseSound});
      w.hazardWarning=['windup','cast','sweep'].includes(tempestHazard.state.phase)?'wind':'';
    }
    Combat.settle(w);
  }
  function consumeEvents(w){
    for(const e of w.events.splice(0)){
      if(e.type==='hit'||e.type==='block'){session.fx.push({...e,life:.22,max:.22});combatSound(e.type==='block'?'block':e.knockdown?'heavy':'punch',.8,Data.byId[w.fighters[e.slot].id].hero!==undefined?'body':'armor');}
      if(e.type==='attack'||e.type==='dash')combatSound('whoosh',.38);
      if(e.type==='strike')session.fx.push({...e,life:.22,max:.22});
      if(e.type==='finish'){mode=w.winner===0?'victory':'defeat';ending=0;clearInput();scoreTick();}
    }
  }
  function tick(seconds){
    const w=session.world;if(!w||paused)return;
    w.remainder+=Math.min(.25,Math.max(0,seconds));
    while(w.remainder+1e-9>=Combat.STEP){w.remainder-=Combat.STEP;Combat.step(w,inputs(w),Combat.STEP);stepHazards(w,Combat.STEP);consumeEvents(w);for(const fx of session.fx)fx.life-=Combat.STEP;session.fx=session.fx.filter(e=>e.life>0);}
    t=w.clock;elapsed=w.clock;ending=w.endTime;hero={...w.fighters[0]};boss={...w.fighters[1],max:100,dir:w.fighters[1].face,state:'idle'};
    if(w.status==='finished'&&w.endTime>=1.1&&!session.resultShown){session.resultShown=true;showResult();}
  }
  update=function(dt){if(isActive()&&session.world)return tick(dt);return original.update(dt);};
  updateStep=function(dt){if(isActive()&&session.world)return tick(dt);return original.updateStep(dt);};
  function drawHUD(w){
    for(const f of w.fighters){const c=Data.byId[f.id],x=f.slot?780:30,color=playerColors[f.slot],label=(f.slot&&session.kind==='cpu'?'CPU':'P'+(f.slot+1))+' · '+c.name;
      rect(x-8,7,486,92,'#081c27b8');battleText(label,x,26,18,color);rect(x,36,470,20,'#0b2631');rect(x,36,470*f.hp/100,20,color);battleText(Math.ceil(f.hp)+' / 100',x+460,51,13,'#061e25','right');
      const sp=Data.moves[f.id].special,available=Combat.ready({...f,action:null,stun:0,knockdown:0,guardStun:0,dashTime:0},'special');
      if(available){ctx.save();ctx.shadowColor=color;ctx.shadowBlur=10+Math.sin(t*7)*4;battleText('SPECIAL',x+235,83,24,color,'center');ctx.restore();}
      else{const fraction=f.id==='bushman'?f.charge/4:f.power/100;rect(x,66,470,5,'#223d48');rect(x,66,470*fraction,5,color);battleText(f.id==='bushman'?'FIRE BLAST · '+f.charge+'/4':'SPECIAL · '+Math.floor(f.power)+'%',x,88,11,color);}
      if(f.comboTime>0&&f.combo>1)battleText(f.combo+' HITS',x+235,125,25,color,'center');
      const skillCd=f.cooldowns.skill||0,shootCd=f.cooldowns.shoot||0;battleText('SKILL '+(skillCd>0?skillCd.toFixed(1)+'s':'READY')+' · SHOOT '+(shootCd>0?shootCd.toFixed(1)+'s':'READY'),x+470,88,11,color,'right');
    }
    battleText('VS',640,48,28,'#fff3ce','center');
  }
  function render(){
    const w=session.world;if(!w)return original.draw();
    cleanTouch.classList.toggle('battle-controls-active',mode==='fight'&&!paused&&overlay.classList.contains('hidden'));battleShell.classList.toggle('battle-view',true);
    ctx.save();ctx.clearRect(0,0,W,H);sky();
    for(const z of w.zones)Animation.zone(z);
    for(const f of w.fighters){ctx.save();ctx.strokeStyle=playerColors[f.slot];ctx.lineWidth=3;ctx.globalAlpha=.65;ctx.beginPath();ctx.ellipse(f.x,GROUND+6,58,10,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    for(const f of w.fighters){Animation.draw(f,w.fighters[1-f.slot],w);const c=Data.byId[f.id];rect(f.x-19,f.y-c.height-27,38,21,'#092331de');battleText('P'+(f.slot+1),f.x,f.y-c.height-11,13,playerColors[f.slot],'center');}
    for(const p of w.projectiles)Animation.projectile(p);
    for(const f of w.fighters){const a=f.action;if(a&&a.spec.kind==='beam'&&a.age<a.spec.startup){ctx.save();ctx.strokeStyle=Data.byId[f.id].color;ctx.lineWidth=2;ctx.globalAlpha=.45;ctx.setLineDash([8,9]);line([[f.x,f.y-145],[f.x+a.face*a.spec.range,f.y-145]],Data.byId[f.id].color,2);ctx.restore();}}
    for(const e of session.fx){ctx.save();ctx.globalAlpha=e.life/e.max;const q=1-e.life/e.max;if(e.kind==='beam'){if(e.visual==='fire')bushmanFX(5,e.x-e.face*140,e.y,e.face,1.05,.6,480,250);else if(e.visual==='sonic')soundCone(e.x-e.face*140,e.y,e.range,160,e.face,.9);else line([[e.x-e.face*140,e.y],[e.x+e.face*(e.range-140),e.y]],'#e6f9ff',14);}
      else if(e.type==='hit'||e.type==='block'){ctx.strokeStyle=e.type==='block'?'#aaffd9':'#fff4ad';ctx.lineWidth=6;ctx.beginPath();ctx.arc(e.x,e.y,12+q*45,0,Math.PI*2);ctx.stroke();}ctx.restore();}
    drawEnvironmentForeground();drawHUD(w);ctx.restore();
  }
  draw=function(){if(isActive()){if(session.world)return render();cleanTouch.classList.remove('battle-controls-active');battleShell.classList.remove('battle-view');ctx.save();ctx.clearRect(0,0,W,H);sky();ctx.restore();return;}return original.draw();};
  function showResult(){
    const w=session.world;if(!w)return;const winner=w.winner===null?'DOUBLE KNOCKOUT':Data.byId[w.fighters[w.winner].id].name+' WINS';
    // Keep victory/defeat mode for the original ending score.
    const resultMode=mode;panel('<div class="eyebrow">'+(w.winner===null?'DRAW':'VICTORY')+'</div><h2>'+winner+'</h2><p>'+session.ids.map(id=>Data.byId[id].name).join(' vs ')+' · '+Math.floor(w.clock)+' seconds</p><div class="row"><button class="primary" id="competitive-rematch">REMATCH</button><button id="competitive-reselect">CHANGE FIGHTERS</button><button id="competitive-exit">GAME MODES</button></div>',resultMode);
    document.getElementById('competitive-rematch').onclick=()=>beginMatch();document.getElementById('competitive-reselect').onclick=()=>{session.world=null;choose(0);};document.getElementById('competitive-exit').onclick=showModeSelect;
  }
  result=function(...args){if(isActive()&&session.world)return showResult();return original.result(...args);};
  function pauseGuide(slot=0,pageIndex=0){
    const c=Data.byId[session.world.fighters[slot].id],Guide=HealthiaCompetitiveGuide;
    const label=i=>i===1&&session.kind==='cpu'?'CPU':'P'+(i+1);
    const rows=Guide.rows(c.id,session.kind,slot).filter(r=>r.page===pageIndex);
    overlay.classList.remove('hidden');
    overlay.innerHTML='<section class="panel competitive-guide"><div class="guide-actions guide-row"><button id="competitive-resume">RESUME</button><button id="competitive-choose">CHANGE FIGHTERS</button><button id="competitive-exit">GAME MODES</button><button id="guide-scroll-up" aria-label="Scroll move list up">↑ SCROLL</button><button id="guide-scroll-down" aria-label="Scroll move list down">↓ SCROLL</button></div><h2>PAUSED · MOVE LIST</h2><div class="guide-row">'+session.world.fighters.map((f,i)=>'<button data-guide-fighter="'+i+'" aria-pressed="'+(slot===i)+'">'+label(i)+' · '+Data.byId[f.id].name+'</button>').join('')+'</div><h3>'+c.name+' · '+c.role+' · 100 HP</h3><p><strong>Strength:</strong> '+c.strength+' <strong>Weakness:</strong> '+c.weakness+'</p><p>'+c.plan+'</p><div class="guide-row guide-pages">'+Guide.pages.map((name,i)=>'<button data-guide-page="'+i+'" aria-pressed="'+(i===pageIndex)+'">'+name+'</button>').join('')+'</div><p class="guide-hint">'+(slot===1&&session.kind==='cpu'?'Studying the CPU fighter; keyboard inputs below are its solo-player controls. ':'')+'Damage is before combo scaling. Multi-hit damage is the total per activation. Cooldowns start on activation. Match stays paused while browsing.</p><div class="guide-moves">'+rows.map(r=>'<article data-guide-move="'+r.key+'"><h4>'+r.name+(r.damage!==undefined?' · '+r.damage+' HP':'')+'</h4><p><b>Keyboard:</b> '+r.keyboard+'<br><b>Controller:</b> '+r.controller+'<br><b>Touch:</b> '+r.touch+'</p>'+(r.damage!==undefined?'<p>Startup '+r.startup.toFixed(2)+'s · Recovery '+r.recovery.toFixed(2)+'s'+(r.cooldown?' · Cooldown '+r.cooldown.toFixed(1)+'s':'')+'</p>':'')+'<p>'+r.note+'</p></article>').join('')+'</div></section>';
    document.getElementById('competitive-resume').onclick=pauseGame;
    document.getElementById('competitive-choose').onclick=()=>{session.world=null;choose(0);};
    document.getElementById('competitive-exit').onclick=showModeSelect;
    document.getElementById('guide-scroll-up').onclick=()=>overlay.querySelector('.competitive-guide').scrollBy(0,-180);
    document.getElementById('guide-scroll-down').onclick=()=>overlay.querySelector('.competitive-guide').scrollBy(0,180);
    overlay.querySelectorAll('[data-guide-fighter]').forEach(b=>b.onclick=()=>pauseGuide(+b.dataset.guideFighter,pageIndex));
    overlay.querySelectorAll('[data-guide-page]').forEach(b=>b.onclick=()=>pauseGuide(slot,+b.dataset.guidePage));
    menuFocusElement=null;syncMenuFocus();
  }
  pauseGame=function(...args){
    if(!isActive()||!session.world)return original.pauseGame(...args);
    if(session.world.status!=='fight')return;paused=!paused;clearInput();document.getElementById('pause').textContent=paused?'RESUME':'PAUSE';
    if(!paused){overlay.classList.add('hidden');return;}
    pauseGuide();
  };
  action=function(key,...args){if(isActive()&&session.world){if(!paused&&mode==='fight')Combat.queue(session.world,0,key,session.heavy);return;}return original.action(key,...args);};
  directionPress=function(dir,...args){if(isActive()&&session.world){if(mode==='fight'&&!paused)Combat.pressDirection(session.world,0,dir);return;}return original.directionPress(dir,...args);};
  const keySolo={KeyA:'left',KeyD:'right',ArrowLeft:'left',ArrowRight:'right',KeyW:'jump',ArrowUp:'jump',KeyJ:'punch',KeyK:'kick',KeyL:'block',Space:'special',KeyU:'shoot',KeyI:'skill',ShiftLeft:'heavy',ShiftRight:'heavy',KeyQ:'dash'};
  const keyP1={KeyA:'left',KeyD:'right',KeyW:'jump',KeyF:'punch',KeyG:'kick',KeyH:'block',KeyR:'special',KeyT:'shoot',KeyY:'skill',ShiftLeft:'heavy',KeyQ:'dash'};
  const keyP2={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'jump',KeyJ:'punch',KeyK:'kick',KeyL:'block',Enter:'special',KeyU:'shoot',KeyI:'skill',ShiftRight:'heavy',Slash:'dash'};
  function keyboard(event,down){
    if(!isActive()||window.HealthiaIntro?.active)return;
    if(mode!=='fight'||paused){if(!down)return;const dir={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[event.code];if(dir){event.preventDefault();event.stopImmediatePropagation();menuNavigate(dir);}else if(event.code==='Escape'){event.preventDefault();event.stopImmediatePropagation();const b=document.getElementById('competitive-back')||document.getElementById('competitive-resume')||document.getElementById('competitive-reselect');b?.click();}return;}
    if(event.code==='Escape'||event.code==='KeyP'){event.preventDefault();event.stopImmediatePropagation();if(down&&!event.repeat)pauseGame();return;}
    const maps=session.kind==='local'?[keyP1,keyP2]:[keySolo];
    let matched=false;maps.forEach((map,i)=>{const key=map[event.code];if(!key)return;matched=true;const old=session.keyboard[i][key];session.keyboard[i][key]=down;
      if(down&&!event.repeat&&!old){if(['left','right'].includes(key))Combat.pressDirection(session.world,i,key==='left'?-1:1);else if(['jump','punch','kick','shoot','skill','special','dash'].includes(key))Combat.queue(session.world,i,key,!!session.keyboard[i].heavy);}
    });
    if(matched){event.preventDefault();event.stopImmediatePropagation();audio();}
  }
  window.addEventListener('keydown',e=>keyboard(e,true),true);window.addEventListener('keyup',e=>keyboard(e,false),true);
  pollPad=function(){
    if(!isActive())return original.pollPad();
    const pads=battleGamepads().sort((a,b)=>a.index-b.index);
    session.padSlots=session.padSlots.map(id=>pads.some(g=>g.index===id)?id:null);for(const p of pads)if(!session.padSlots.includes(p.index)){const i=session.padSlots.indexOf(null);if(i>=0)session.padSlots[i]=p.index;}
    if(mode!=='fight'||paused){
      // Existing navigation handles spatial menus; intercept its legacy back routes.
      for(const p of pads){const now=readBattleGamepad(p),i=session.padSlots.indexOf(p.index),prior=session.padPrevious[i]||{};
        now.menuBack=now.back||!!p.buttons[1]?.pressed||p.buttons[1]?.value>.5;
        if((now.menuBack&&!prior.menuBack)||(paused&&now.pause&&!prior.pause)){
          const b=document.getElementById('competitive-back')||document.getElementById('competitive-resume')||document.getElementById('competitive-reselect');
          b?.click();session.padPrevious[i]=now;gamepadPrev=now;activePadIndex=p.index;return;
        }session.padPrevious[i]=now;
      }
      return original.pollPad();
    }
    session.pads=[{},{}];
    for(let i=0;i<2;i++){const p=pads.find(g=>g.index===session.padSlots[i]);if(!p)continue;const read=readBattleGamepad(p),b=n=>!!p.buttons[n]?.pressed||p.buttons[n]?.value>.5;
      const now={...read,menuBack:read.back||b(1),shoot:b(1),skill:b(6),heavy:b(7),special:b(5),block:b(4),dash:b(10)};const prior=session.padPrevious[i]||{};
      if(now.pause&&!prior.pause){pauseGame();session.padPrevious[i]=now;gamepadPrev=read;activePadIndex=p.index;return;}
      session.pads[i]=now;session.padPrevious[i]=now;
      if(Object.values(now).some(Boolean))padAudioUnlock();
    }
    document.getElementById('padstatus').textContent=pads.length?pads.length+' CONTROLLER'+(pads.length>1?'S':'')+' CONNECTED':'CONTROLLER READY';
  };
  // Preserve all original controls; add the competitive projectile, technique and modifier buttons.
  const cluster=cleanTouch.querySelector('.cluster:last-child');
  for(const [key,label] of [['shoot','SHOOT'],['skill','SKILL'],['heavy','HEAVY']]){
    const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.competitiveControl=key;b.dataset.key=key;b.hidden=true;cluster.appendChild(b);
    if(key==='heavy')b.onpointerdown=e=>{e.preventDefault();if(isActive()){session.heavy=!session.heavy;b.setAttribute('aria-pressed',String(session.heavy));}};
    else{b.onpointerdown=e=>battleTouchDown(b,e.pointerId,e);b.onpointerup=b.onpointercancel=e=>battleTouchUp(e.pointerId,e);b.onlostpointercapture=e=>{if(!b.hasPointerCapture?.(e.pointerId))battleTouchUp(e.pointerId,e);};}
  }
  const helpOriginal=document.getElementById('help').onclick;
  function help(){
    if(!isActive())return helpOriginal();const wasPaused=paused;if(session.world&&!paused)pauseGame();
    overlay.classList.remove('hidden');overlay.innerHTML='<section class="panel"><h2>COMPETITIVE CONTROLS</h2><p>Solo: A/D or arrows move · W/↑ jump · J punch · K kick · L block · Space special · U shoot · I skill · Shift + punch/kick = heavy.</p><p>Local P1: A/D · W · F punch · G kick · H block · R special · T shoot · Y skill · Left Shift heavy.</p><p>Local P2: arrows · J punch · K kick · L block · Enter special · U shoot · I skill · Right Shift heavy.</p><p>Controller: stick/D-pad move · A/Cross jump · X/Square punch · Y/Triangle kick · LB block · RB special · B/Circle shoot · LT skill · hold RT for heavy · double-tap a direction to dash.</p><p>Touch: analog move · tap JUMP twice for a double jump · SHOOT projectile · SKILL technique · toggle HEAVY, then punch or kick.</p><p>Block while facing incoming attacks. Jump or move out of ground zones. Specials need a full meter; Bushman instead needs four landed punches, kicks or fireballs. Blocked hits and burns do not charge his blast.</p><p>Two touch-only players on one phone are not supported. Local PvP uses a keyboard or a controller for the second player.</p><button id="competitive-close-help">BACK</button></section>';
    document.getElementById('competitive-close-help').onclick=()=>{if(session.world){if(!wasPaused){paused=true;pauseGame();}else{paused=false;pauseGame();}}else choose(session.selectionSide);};
  }
  document.getElementById('help').onclick=help;
  return {session,Data,Combat,beginMatch,choose,chooseVenue,chooseDifficulty,leave,ready,tick,render,help};
})();
