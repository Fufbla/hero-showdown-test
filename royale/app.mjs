import { POWERS } from './powers.mjs';
import { PowerMenu, ControlMenu } from './power-menu.mjs';
import { loadControls } from './controls.mjs';
import { Game, STEP, DEFAULT_LOOK, xpForLevel, LEVEL_CAP } from './core.mjs';
import { regionAt } from './world.mjs';
import { Input } from './input.mjs';
import { Renderer, drawHero } from './renderer.mjs';
import { LocalHeroStore, PROFILE_KEY } from './saves.mjs';
import { Creator } from './creator.mjs';
import { previewHero, animationState } from './hero-rig.mjs';
import { STARTER_OUTFIT } from './appearance.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
if(params.has('touch'))document.body.classList.add('force-touch');
function sizeVisibleViewport(){
  const viewport=window.visualViewport;
  if(viewport&&viewport.scale===1){document.documentElement.style.setProperty('--visible-height',`${viewport.height}px`);document.body.classList.toggle('keyboard-open',innerWidth<=700&&viewport.height<innerHeight*.78);}
}
window.visualViewport?.addEventListener('resize',sizeVisibleViewport);sizeVisibleViewport();
// The visible QA harness uses its own session-storage namespace, never real hero slots.
const testPrefix=params.has('qa')&&params.get('testSession')?`royale-test-${params.get('testSession')}:`:'';
const storage={getItem:key=>(testPrefix?sessionStorage:localStorage).getItem(testPrefix+key),setItem:(key,value)=>(testPrefix?sessionStorage:localStorage).setItem(testPrefix+key,value)};
const store=new LocalHeroStore(storage);
let game=new Game(),screen='roster',editing=false,activeSlot=store.data.activeSlot,activeId=null,creatorSlot=activeSlot,deleteTarget=null;
let audioContext,soundEnabled=false,toastUntil=0,saveAge=0,regionName='',lastHud='',fps=60,drawMs=0,qaClock=0;
const input=new Input(document,()=>{if(screen==='play')pause();else if(screen==='pause')resume();else if(screen==='creator')cancelCreator();else if(screen==='delete')closeDelete();else if(['tree','controls'].includes(screen))showPause();},loadControls(storage));
const powerMenu=new PowerMenu(()=>game,persist,say),controlMenu=new ControlMenu(input,storage,say);
const renderer=new Renderer($('game')),creator=new Creator();
function say(message,seconds=3){$('toast').textContent=message;$('toast').classList.add('visible');toastUntil=performance.now()+seconds*1000;}
function storageNotice(){
  const message=store.durable?store.message||'Saved on this browser only. No account or cloud saving.':store.message;
  $('roster-note').textContent=message;$('save-note').textContent=message;
  $('storage-warning').textContent=store.durable?'':message;$('storage-warning').hidden=store.durable;
}
function persist(){
  if(!game.started)return;
  const result=store.writeSlot(activeSlot,game.save(),{region:`Coastal Beginnings · ${regionAt(game.hero.x).name}`,expectedId:activeId});
  if((result.ok||result.retained)&&store.data.slots[activeSlot])activeId=store.data.slots[activeSlot].id;
  storageNotice();return result;
}
function setScreen(next){
  screen=next;input.enabled=next==='play';input.clear();game.paused=next!=='play';
  for(const [name,id] of Object.entries({roster:'roster',creator:'creator',pause:'pause-menu',delete:'delete-dialog',tree:'tree-menu',controls:'controls-menu'}))$(id).hidden=next!==name;
  const inGame=game.started&&['play','pause','tree','controls'].includes(next);
  $('hud').hidden=!inGame;$('mission').hidden=!inGame;$('pause').disabled=!inGame;
  $('pause').setAttribute('aria-label',next==='play'?'Pause game':'Resume game');$('pause').textContent=next==='play'?'Ⅱ':'▷';
  document.body.classList.toggle('playing',next==='play');document.body.classList.toggle('game-view',inGame);
  if(next!=='play'){$('rest').hidden=true;$('visit-tree').hidden=true;$('death').hidden=true;}
}
function dateText(value){const date=new Date(value);return value&&Number.isFinite(date.getTime())?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(date):'Imported from Phase 1';}
function renderRoster(){
  const container=$('hero-slots');container.replaceChildren();
  for(let i=0;i<3;i++){
    const slot=store.slot(i),card=document.createElement('article');card.className='hero-slot';card.dataset.slot=i;
    const number=document.createElement('small');number.className='slot-number';number.textContent=`HERO SLOT 0${i+1}`;card.append(number);
    const canvas=document.createElement('canvas');canvas.width=360;canvas.height=320;canvas.setAttribute('aria-label',slot?`Portrait of ${slot.snapshot.look.name}`:'Empty hero slot');card.append(canvas);
    const name=document.createElement('h2');name.textContent=slot?slot.snapshot.look.name:'A new beginning';card.append(name);
    const detail=document.createElement('p');detail.className='slot-detail';detail.textContent=slot?`Level ${slot.snapshot.level} · ${slot.lastRegion}`:'The coast is waiting for its next hero.';card.append(detail);
    const saved=document.createElement('p');saved.className='last-saved';saved.textContent=slot?`Last saved: ${dateText(slot.updatedAt)}`:'Create your look. Find your courage.';card.append(saved);
    const button=document.createElement('button');button.className=slot?'primary':'secondary';button.dataset.action=slot?'continue':'create';button.textContent=slot?'Continue →':'Create Hero +';button.disabled=!store.writable&&!slot;button.onclick=()=>slot?continueHero(i):openCreator(i,false);card.append(button);
    if(slot){const del=document.createElement('button');del.className='text-button delete-hero';del.textContent='Delete Hero';del.disabled=!store.writable;del.onclick=()=>{deleteTarget={index:i,id:slot.id,name:slot.snapshot.look.name};$('delete-description').textContent=`Delete ${slot.snapshot.look.name}, level ${slot.snapshot.level}?`;setScreen('delete');$('cancel-delete').focus();};card.append(del);}
    container.append(card);
    const c=canvas.getContext('2d');c.fillStyle='#c4d4a41c';c.beginPath();c.ellipse(180,284,62,10,0,0,Math.PI*2);c.fill();
    if(slot)drawHero(c,180,282,slot.snapshot.look,previewHero('idle',0),0,2.2,{view:'front',outfit:slot.snapshot.outfit});
    else{c.fillStyle='#b6cda77a';c.font='66px Georgia';c.textAlign='center';c.fillText('✦',180,190);}
  }
  $('back-to-patrol').hidden=!game.started;storageNotice();
}
function openRoster(){persist();renderRoster();setScreen('roster');$('roster-title').focus();}
function continueHero(index){
  const slot=store.slot(index);if(!slot)return;
  activeSlot=index;activeId=slot.id;game=new Game({save:slot.snapshot});startPatrol(true);
}
function openCreator(index=activeSlot,isEdit=true){
  editing=isEdit;creatorSlot=index;
  creator.fill(editing?game.look:DEFAULT_LOOK,editing?game.outfit:STARTER_OUTFIT);
  $('creator-slot').textContent=`${editing?'CUSTOMIZE':'CREATE'} · HERO SLOT 0${index+1}`;
  $('begin').textContent=editing?'SAVE YOUR LOOK →':'BEGIN YOUR ADVENTURE →';$('cancel-look').textContent=editing?'Cancel appearance changes':'Back to heroes';
  setScreen('creator');$('creator-title').focus();
}
function cancelCreator(){if(editing){editing=false;resume();}else{renderRoster();setScreen('roster');}}
function startPatrol(continued){
  game.started=true;regionName='';lastHud='';saveAge=0;renderer.camera=Math.max(0,game.hero.x-renderer.width*.37);renderer.cameraY=0;renderer.particles=[];
  setScreen('play');persist();updateHud();say(continued?'Welcome back, hero. Your patrol continues.':'Welcome to the coast! Move right to find your first Bottle Critter.',4);
}
function begin(){
  const validation=creator.validate();if(!validation.ok)return;
  const look=creator.read();look.name=validation.name;
  if(editing){game.look=look;persist();editing=false;resume();say('Your hero, your style.');}
  else{activeSlot=creatorSlot;activeId=null;game=new Game({look});startPatrol(false);}
}
function pause(){if(!game.started||screen!=='play')return;showPause();persist();}
function showPause(){controlMenu.capture=null;setScreen('pause');powerMenu.loadout();$('resume').focus();}
function openTree(){if(!game.nearTree()||game.inCombat()){say('Visit the Tree of Eris at Shore camp while outside combat.');return;}setScreen('tree');powerMenu.open();$('tree-title').focus();}
function resume(){if(!game.started)return;setScreen('play');$('pause').blur();}
function closeDelete(){deleteTarget=null;renderRoster();setScreen('roster');}
function tone(type) {
  if (!soundEnabled) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const o = audioContext.createOscillator(), g = audioContext.createGain(), now = audioContext.currentTime;
    const pitches = { jump: 330, hit: 150, swing: 95, reward: 660, level: 880, hurt: 85, camp: 520 };
    o.type = ['hit', 'hurt', 'swing'].includes(type) ? 'triangle' : 'sine';
    o.frequency.setValueAtTime(pitches[type] || 220, now); o.frequency.exponentialRampToValueAtTime(type === 'jump' ? 600 : (pitches[type] || 220) * .65, now + .1);
    g.gain.setValueAtTime(.035, now); g.gain.exponentialRampToValueAtTime(.0001, now + .13);
    o.connect(g); g.connect(audioContext.destination); o.start(now); o.stop(now + .15); o.onended = () => { o.disconnect(); g.disconnect(); };
  } catch { soundEnabled = false; $('sound').setAttribute('aria-pressed', 'false'); }
}
function handleEvents() {
  const events = game.drain(), leveled = events.some(e => e.type === 'level');
  for (const event of events) {
    if(event.type==='tree')openTree();
    renderer.event(event.type === 'level' ? { ...event, x: game.hero.x, y: game.hero.y - 45 } : event); tone(event.type);
    if (event.type === 'level') say(`Level ${event.level}! Health restored · +1 Power Point.`, 4);
    if (event.type === 'reward' && !leveled) say(`${event.enemy} cleared · +${event.xp} XP · +${event.coins} coins`, 2.3);
    if (event.type === 'camp') { persist(); say(`${event.name} set as your checkpoint. Health restored.`); }
    if (event.type === 'respawn') { input.clear(); say(`Back at ${event.name}. Your XP and coins are safe.`); }
    if (event.type === 'destination') { persist(); say('You reached Lighthouse Point! Explore, train, or head back along the coast.', 6); }
  }
}
function updateHud() {
  const h = game.hero, region = regionAt(h.x);
  if (region.name !== regionName) { regionName = region.name; $('region').textContent = region.name; }
  const snapshot = `${h.hp}|${h.maxHp}|${h.level}|${h.xp}|${h.coins}|${game.look.name}|${game.kills}|${game.species.size}|${game.reachedEnd}`;
  if (snapshot !== lastHud) {
    lastHud = snapshot; $('hero-name').textContent = game.look.name; $('level').textContent = h.level; $('coins').textContent = h.coins.toLocaleString();
    $('hp-fill').style.width = `${100 * h.hp / h.maxHp}%`; $('hp-text').textContent = `${Math.ceil(h.hp)} / ${h.maxHp}`;
    $('xp-fill').style.width = h.level === LEVEL_CAP ? '100%' : `${100 * h.xp / xpForLevel(h.level)}%`;
    $('xp-text').textContent = h.level === LEVEL_CAP ? 'MAX LEVEL' : `${h.xp} / ${xpForLevel(h.level)} XP`;
    const cleared = game.kills >= 6 && game.species.size === 3;
    $('mission-title').textContent = cleared ? (game.reachedEnd ? 'A hero on the horizon' : 'Follow the coast to the lighthouse') : "Meet the coast's troublemakers";
    $('mission-progress').textContent = cleared ? (game.reachedEnd ? 'Patrol complete · Keep exploring and training' : 'Reach Lighthouse Point at the end of the trail') : `${Math.min(6, game.kills)} / 6 monsters · ${game.species.size} / 3 types discovered`;
    $('mission-count').textContent = cleared ? (game.reachedEnd ? '✓' : '→') : `${Math.min(6, game.kills)}/6`;
  }
  $('visit-tree').hidden=screen!=='play'||!game.nearTree()||game.inCombat();
  updatePowers();
  if(screen==='controls')$('controller-status').textContent=input.gamepadLabel;
  $('rest').hidden = screen !== 'play' || game.nearCamp() < 0 || h.dead;
  $('death').hidden = !h.dead || screen !== 'play'; $('diagnostics').hidden = !params.has('qa');
  if (params.has('qa')) $('diagnostics').textContent = `FPS ${fps.toFixed(0)} · draw ${drawMs.toFixed(2)}ms · ${screen} · t ${game.time.toFixed(2)}\nx ${h.x.toFixed(1)} y ${h.y.toFixed(1)} · ${animationState(h)}\nvx ${h.vx.toFixed(1)} vy ${h.vy.toFixed(1)} · jumps ${h.jumps}\nmonsters ${game.enemies.filter(e => e.state !== 'dead').length} · kills ${game.kills}\npowers ${game.powers.data.equipped.join(',')} · points ${game.powers.data.points} · combat ${game.inCombat()}\nviewport ${innerWidth}×${innerHeight} · save ${store.durable ? 'ready' : 'unavailable'}`;
}
function updatePowers(){
  for(const [i,b] of [...document.querySelectorAll('.power-button')].entries()){
    const id=game.powers.data.equipped[i],def=POWERS[id],active=id&&!!game.powers.active[id],cooldown=id&&(game.powers.cooldowns[id]||0)>0;
    b.querySelector('b').textContent=def?.icon||'+';b.querySelector('span').textContent=def?.name||'Empty slot';b.querySelector('kbd').textContent=input.controls.keys[`power${i}`][0].replace('Digit','').replace('Key','');
    b.classList.toggle('cooldown',!!cooldown);b.classList.toggle('active',!!active);b.classList.toggle('flight-locked',!!(game.powers.flying&&def?.offensive&&id!=='fireball'));b.disabled=!id||screen!=='play'||game.hero.dead;
    b.setAttribute('aria-label',`${def?.name||`Power slot ${i+1}`}${cooldown?' · recovering':active?(id==='flight'?' · flying, press to cancel':' · active'):' · ready'}`);b.setAttribute('aria-pressed',String(!!active));
  }
  $('power-context').textContent=game.powers.flying?'FLIGHT · steer ↑ ↓ · press Flight to land':game.inCombat()?'IN COMBAT':game.powers.data.points?`${game.powers.data.points} Power Points · visit the Tree of Eris`:'Learn powers at the Tree of Eris';
}
$('tree-from-pause').onclick=openTree;$('close-tree').onclick=showPause;
$('open-controls').onclick=()=>{setScreen('controls');controlMenu.render();$('settings-title').focus();};$('close-controls').onclick=showPause;
$('creator-form').addEventListener('submit',e=>{e.preventDefault();begin();});
$('cancel-look').onclick=cancelCreator;
$('pause').onclick=()=>{if(screen==='play')pause();else if(screen==='pause')resume();};
$('resume').onclick=resume;$('edit-look').onclick=()=>openCreator(activeSlot,true);
$('return-camp').onclick=()=>{game.respawn();handleEvents();persist();resume();};
$('choose-hero').onclick=openRoster;$('back-to-patrol').onclick=resume;
$('cancel-delete').onclick=closeDelete;
$('confirm-delete').onclick=()=>{
  if(!deleteTarget)return;
  const target=deleteTarget,result=store.deleteSlot(target.index,target.id);
  if(result.ok||!store.slot(target.index)){
    if(activeId===target.id){game=new Game();activeId=null;}
    closeDelete();
  }else{closeDelete();say(result.error,6);}
};
$('sound').onclick=()=>{soundEnabled=!soundEnabled;$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').setAttribute('aria-label',soundEnabled?'Mute sound':'Enable sound');tone('camp');};
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(screen==='play')pause();persist();}});
window.addEventListener('blur',()=>{if(screen==='play')pause();});
window.addEventListener('pagehide',persist);
window.addEventListener('storage',e=>{if(testPrefix||e.key!==PROFILE_KEY)return;if(game.started)persist();else{store.load();renderRoster();}});
// Keyboard focus stays in the active panel. Tabs also support arrow-key navigation.
document.addEventListener('keydown',e=>{
  if(e.key!=='Tab'||screen==='play')return;
  const panel=$({creator:'creator',roster:'roster',delete:'delete-dialog',pause:'pause-menu',tree:'tree-menu',controls:'controls-menu'}[screen]);
  const nodes=[...panel.querySelectorAll('a[href],button,input,select')].filter(n=>!n.disabled&&n.tabIndex!==-1&&n.getClientRects().length);
  if(!nodes.length)return;
  if(e.shiftKey&&(document.activeElement===nodes[0]||!panel.contains(document.activeElement))){e.preventDefault();nodes.at(-1).focus();}
  if(!e.shiftKey&&(document.activeElement===nodes.at(-1)||!panel.contains(document.activeElement))){e.preventDefault();nodes[0].focus();}
});
renderRoster();setScreen('roster');
let last=performance.now(),accumulator=0;
function frame(now){
  input.pollGamepad();
  const wallElapsed=Math.max(0,(now-last)/1000),elapsed=Math.min(.1,wallElapsed);last=now;if(wallElapsed>0)fps=fps*.95+.05/wallElapsed;
  if(screen==='play'){
    accumulator+=elapsed;while(accumulator>=STEP){game.step(STEP,input.sample());accumulator-=STEP;}
    handleEvents();saveAge+=elapsed;if(saveAge>5){persist();saveAge=0;}
  }else accumulator=0;
  const drawStart=performance.now();renderer.draw(game,screen==='play'?accumulator/STEP:1,elapsed);
  drawMs=drawMs*.95+(performance.now()-drawStart)*.05;
  qaClock+=elapsed;if(qaClock>=.1){updateHud();qaClock=0;}
  if(screen==='creator')creator.draw(now);
  if(toastUntil&&now>toastUntil){$('toast').classList.remove('visible');toastUntil=0;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
