import { installLegendaryQA } from './legendary-qa.mjs';
import { LegendaryMenu } from './legendary-ui.mjs';
import { LEGENDARY, MERGE_POWERS } from './legendary-data.mjs';
import { LegendaryLedger, reconcileLegendaryStore } from './legendary-ledger.mjs';
import { LegendaryMusic } from './legendary-music.mjs';
import { ErisMenu } from './eris-ui.mjs';
import { installBossQA } from './boss-qa.mjs';
import { updateBossHud, openChestMenu } from './boss-ui.mjs';
import { BOSSES, ARENA } from './boss-data.mjs';
import { JourneyMenu } from './journey-menu.mjs';
import { formatClock } from './progression.mjs';
import { equipmentOutfit } from './equipment.mjs';
import { POWERS } from './powers.mjs';
import { PowerMenu, ControlMenu } from './power-menu.mjs';
import { loadControls } from './controls.mjs';
import { Game, STEP, DEFAULT_LOOK, xpForLevel, LEVEL_CAP } from './core.mjs';
import { regionAt, boardAt } from './world.mjs';
import { Input } from './input.mjs';
import { Renderer, drawHero } from './renderer.mjs';
import { LocalHeroStore, PROFILE_KEY } from './saves.mjs';
import { Creator } from './creator.mjs';
import { previewHero, animationState } from './hero-rig.mjs';
import { STARTER_OUTFIT } from './appearance.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
if(params.has('touch'))document.body.classList.add('force-touch');
if(params.get('testSession')?.startsWith('world-practice-'))document.body.classList.add('practice-world');
function sizeVisibleViewport(){
  const viewport=window.visualViewport;
  if(viewport&&viewport.scale===1){document.documentElement.style.setProperty('--visible-height',`${viewport.height}px`);document.body.classList.toggle('keyboard-open',innerWidth<=700&&viewport.height<innerHeight*.78);}
}
window.visualViewport?.addEventListener('resize',sizeVisibleViewport);sizeVisibleViewport();
// The visible QA harness uses its own session-storage namespace, never real hero slots.
const testPrefix=params.has('qa')&&params.get('testSession')?`royale-test-${params.get('testSession')}:`:'';
const storage={getItem:key=>(testPrefix?sessionStorage:localStorage).getItem(testPrefix+key),setItem:(key,value)=>(testPrefix?sessionStorage:localStorage).setItem(testPrefix+key,value)};
const store=new LocalHeroStore(storage);
let ledger=null,ledgerError='',criticalPending=null,fixtureSaveFailures=0;
try{ledger=await LegendaryLedger.open(window.indexedDB,testPrefix?testPrefix+'permanent':'healthia.royale.permanent.v1');await reconcileLegendaryStore(store,ledger);}catch(error){ledger?.close();ledger=null;ledgerError=error.message||'Permanent storage is unavailable.';}
const legendaryMusic=new LegendaryMusic();
let game=new Game(),screen='roster',editing=false,activeSlot=store.data.activeSlot,activeId=null,creatorSlot=activeSlot,deleteTarget=null;
let audioContext,soundEnabled=false,toastUntil=0,saveAge=0,regionName='',lastHud='',fps=60,drawMs=0,qaClock=0;
const input=new Input(document,()=>{if(criticalPending||screen==='mergeReward')return;if(screen==='play')pause();else if(screen==='pause')resume();else if(screen==='creator')cancelCreator();else if(screen==='delete')closeDelete();else if(screen==='tree')returnAdventure();else if(['controls','world','inventory','chest','mergeReward'].includes(screen))showPause();},loadControls(storage));
const journeyMenu=new JourneyMenu(()=>game,persist,say,resume,transaction);
const powerMenu=new PowerMenu(()=>game,persist,say,transaction),controlMenu=new ControlMenu(input,storage,say);
const renderer=new Renderer($('game')),creator=new Creator();
const erisMenu=new ErisMenu(()=>game,{powerMenu,transaction,say,appearance:()=>openCreator(activeSlot,true),leave:returnAdventure});
const legendaryMenu=new LegendaryMenu(()=>game,{transaction,say,enter:enterLegendary,onClaim:resume});
erisMenu.mergeMenu=legendaryMenu;
let makeoverReview=null;
function say(message,seconds=3){$('toast').textContent=message;$('toast').classList.add('visible');toastUntil=performance.now()+seconds*1000;}
function storageNotice(){
  const message=store.durable?store.message||'Saved on this browser only. No account or cloud saving.':store.message;
  $('roster-note').textContent=message;$('save-note').textContent=message;
  $('storage-warning').textContent=!store.durable?message:ledgerError?'Legendary storage: '+ledgerError:'';$('storage-warning').hidden=store.durable&&!ledgerError;
}
function persist(){
  if(criticalPending||!game.started||!game.canSave())return {ok:false,error:'Saving resumes after five seconds outside combat.'};
  return persistSnapshot(game.save());
}
function persistSnapshot(snapshot,requireDurable=false){
  const result=store.writeSlot(activeSlot,snapshot,{region:game.treeVisit?`Tree of Eris · ${game.getRegion().name}`:`${game.getRegion().name} · ${boardAt(game.regionId,game.hero.x).name}`,expectedId:activeId,requireDurable});
  if((result.ok||result.retained)&&store.data.slots[activeSlot])activeId=store.data.slots[activeSlot].id;
  storageNotice();return result;
}
function startCritical(expectedRevision,snapshot){
  const sourceScreen=screen;
  criticalPending={expectedRevision,snapshot,sourceScreen};game.paused=true;input.enabled=false;input.clear();
  $('permanent-save').hidden=false;$('permanent-retry').hidden=true;$('permanent-reload').hidden=true;$('permanent-status').textContent='Saving the complete permanent transaction…';
  void finishCritical();
}
async function finishCritical(){
  const pending=criticalPending;if(!pending||pending.writing)return;pending.writing=true;
  $('permanent-retry').hidden=true;$('permanent-status').textContent='Saving the complete permanent transaction…';
  try{
    if(!ledger||!activeId)throw Error('Durable hero storage is not ready.');
    if(fixtureSaveFailures>0){fixtureSaveFailures--;throw Error('Simulated practice storage failure.');}
    await ledger.commit(activeId,pending.expectedRevision,pending.snapshot);
    const saved=persistSnapshot(pending.snapshot,true);criticalPending=null;$('permanent-save').hidden=true;
    if(!saved.ok){ledgerError='Permanent progress is recorded. Reload to synchronize the ordinary save.';storageNotice();say(ledgerError,8);}
    if(game.pendingMergeReward())showMergeReward();else if(pending.sourceScreen==='tree'){setScreen('tree');erisMenu.open(erisMenu.panel);}else if(pending.sourceScreen==='inventory'){setScreen('inventory');journeyMenu.inventory();}else resume();
    updateHud();
  }catch(error){pending.writing=false;$('permanent-status').textContent='The transaction has not been confirmed. '+error.message+' Gameplay stays paused so nothing can be duplicated.';$('permanent-retry').hidden=false;$('permanent-reload').hidden=false;$('permanent-retry').focus();}
}
$('permanent-retry').onclick=()=>void finishCritical();$('permanent-reload').onclick=()=>location.reload();
function showMergeReward(){setScreen('mergeReward');legendaryMenu.reward();$('merge-reward-title').focus();}
function enterLegendary(id){if(!game.enterLegendary(id)){say('Reach level 99, leave combat and resolve rewards before entering.');return;}handleEvents();setScreen('play');updateHud();}
function transaction(action){
  if(criticalPending)return {ok:false,error:'A permanent transaction is already saving.'};
  if(!game.canSave())return {ok:false,error:'Wait five seconds outside combat.'};
  const before=structuredClone({inventory:game.inventory,economy:game.economy,legendary:game.legendary,look:game.look,powers:game.powers.data,coins:game.hero.coins,hp:game.hero.hp,roots:game.healthRoots}),eventCount=game.events.length;
  const value=action();if(value===false||value?.ok===false){if(value?.error)say(value.error);return value||{ok:false,error:'This action is no longer available.'};}
  if(game.legendary.revision!==before.legendary.revision){if(ledger){startCritical(before.legendary.revision,game.save());return {ok:false,pending:true,error:'Saving permanent progress…'};}game.inventory=before.inventory;game.economy=before.economy;game.legendary=before.legendary;game.hero.coins=before.coins;game.refreshEquipment();return {ok:false,error:'Permanent storage is unavailable. No equipment was destroyed.'};}
  const saved=persistSnapshot(game.save(),true);
  if(!saved.ok){game.inventory=before.inventory;game.economy=before.economy;game.legendary=before.legendary;game.look=before.look;game.powers.data=before.powers;game.hero.coins=before.coins;game.hero.hp=before.hp;game.healthRoots=before.roots;game.events.length=eventCount;game.refreshEquipment();say('No transaction completed. '+saved.error,7);return saved;}
  return typeof value==='object'?value:{ok:true};
}
function updateMakeoverQuote(){
  if(!editing)return;makeoverReview=null;$('makeover-confirm').hidden=true;
  const q=game.makeoverPreview(creator.read());$('makeover-cost').textContent=`${q.cost??0} coins · Balance ${game.hero.coins}${q.makeover?' · Complete makeover price':q.groups?.length?' · '+q.groups.join(', '):' · Starter suit colors are free'}. ${q.ok?'':q.error}`;
}
$('creator-form').addEventListener('input',updateMakeoverQuote);
$('cancel-makeover').onclick=()=>{makeoverReview=null;$('makeover-confirm').hidden=true;};
$('confirm-makeover').onclick=()=>{const q=makeoverReview;if(!q)return;makeoverReview=null;const result=transaction(()=>game.applyMakeover(q.next,{confirmed:true,revision:q.revision}));if(result.ok){editing=false;setScreen('tree');erisMenu.open();say('Appearance updated. Your progress is unchanged.');}else updateMakeoverQuote();};
function setScreen(next){
  if(criticalPending)return;
  screen=next;input.enabled=next==='play';input.clear();game.paused=next!=='play';
  for(const [name,id] of Object.entries({roster:'roster',creator:'creator',pause:'pause-menu',delete:'delete-dialog',tree:'tree-menu',controls:'controls-menu',world:'world-menu',inventory:'inventory-menu',chest:'chest-menu',mergeReward:'merge-reward'}))$(id).hidden=next!==name;
  const inGame=game.started&&(['play','pause','tree','controls','world','inventory','chest','mergeReward'].includes(next)||(next==='creator'&&editing));
  $('hud').hidden=!inGame;$('mission').hidden=!inGame;$('pause').disabled=!inGame;
  $('pause').setAttribute('aria-label',next==='play'?'Pause game':'Resume game');$('pause').textContent=next==='play'?'Ⅱ':'▷';
  document.body.classList.toggle('sanctuary-view',game.treeVisit);document.body.classList.toggle('playing',next==='play');document.body.classList.toggle('game-view',inGame);
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
    if(slot)drawHero(c,180,282,slot.snapshot.look,previewHero('idle',0),0,2.2,{view:'front',outfit:equipmentOutfit(slot.snapshot.inventory,slot.snapshot.outfit)});
    else{c.fillStyle='#b6cda77a';c.font='66px Georgia';c.textAlign='center';c.fillText('✦',180,190);}
  }
  $('back-to-patrol').hidden=!game.started;storageNotice();
}
function openRoster(){if(!game.canSave()){say('Leave combat before switching heroes.');return;}persist();renderRoster();setScreen('roster');$('roster-title').focus();}
function continueHero(index){
  const slot=store.slot(index);if(!slot)return;if(slot.snapshot.legendary.revision&&!ledger){say('This hero needs its permanent progress record. '+ledgerError,9);return;}
  activeSlot=index;activeId=slot.id;game=new Game({save:slot.snapshot});startPatrol(true);
}
function openCreator(index=activeSlot,isEdit=true){
  if(isEdit&&!game.treeVisit&&!game.visitTree()){say('Visit Eris after five safe seconds to change appearance.');return;}
  if(isEdit&&!game.canSave()){say('Leave combat before customizing.');return;}editing=isEdit;creatorSlot=index;
  creator.fill(editing?game.look:DEFAULT_LOOK,editing?game.visualOutfit():STARTER_OUTFIT);
  $('name').disabled=editing;makeoverReview=null;$('makeover-confirm').hidden=true;$('makeover-cost').hidden=!editing;
  $('creator-slot').textContent=`${editing?'CUSTOMIZE':'CREATE'} · HERO SLOT 0${index+1}`;
  $('begin').textContent=editing?'REVIEW APPEARANCE COST →':'BEGIN YOUR ADVENTURE →';$('cancel-look').textContent=editing?'Cancel appearance changes':'Back to heroes';
  setScreen('creator');updateMakeoverQuote();$('creator-title').focus();
}
function cancelCreator(){if(editing){editing=false;setScreen('tree');erisMenu.open('home');}else{renderRoster();setScreen('roster');}}
function startPatrol(continued){
  game.legendaryStorageReady=!!ledger&&store.writable;
  game.onBossVisualStep=(boss,time,dt,x)=>renderer.bossArt.step(boss,time,dt,x);
  if(game.arenaScene)renderer.bossArt.step(game.arenaScene.boss,game.time,0,game.hero.x);
  game.started=true;regionName='';lastHud='';saveAge=0;renderer.camera=Math.max(0,game.hero.x-renderer.width*.37);renderer.cameraY=0;renderer.particles=[];
  setScreen('play');persist();updateHud();if(game.pendingMergeReward())showMergeReward();else if(game.treeVisit){setScreen('tree');erisMenu.open();}else if(game.inventory.pending.length){setScreen('inventory');journeyMenu.inventory();}say(continued?'Welcome back, hero. Your patrol continues.':'Welcome to the coast! Move right to find your first Bottle Critter.',4);
}
function begin(){
  const validation=creator.validate();if(!validation.ok)return;
  const look=creator.read();look.name=validation.name;
  if(editing){const q=game.makeoverPreview(look);if(!q.ok){say(q.error);return;}makeoverReview=q;$('makeover-confirm-text').textContent=`Apply these changes for ${q.cost} coins? ${q.makeover?'Complete makeover price applied.':'Your level, equipment and progress stay the same.'}`;$('makeover-confirm').hidden=false;$('confirm-makeover').focus();}
  else{activeSlot=creatorSlot;activeId=null;game=new Game({look});startPatrol(false);}
}
function pause(){if(!game.started||screen!=='play')return;showPause();persist();}
function showPause(){$('pause-region').textContent=game.getRegion().name.toUpperCase();controlMenu.capture=null;setScreen('pause');powerMenu.loadout();for(const id of ['edit-look','choose-hero','manual-save'])$(id).disabled=!game.canSave();$('return-camp').disabled=!game.canTravel();$('safe-save-note').textContent=game.canSave()?'Saving is available · browser-local only.':'Saving is locked. Resume and spend five seconds without attacking or taking damage.';$('resume').focus();}
function openTree(panel='home'){if(typeof panel!=='string')panel='home';if(!game.visitTree()){say('Leave combat for five seconds before visiting the Tree.');return;}setScreen('tree');persist();erisMenu.open(panel);$('tree-title').focus();}
function returnAdventure(){if(!game.treeVisit)return;game.leaveTree();persist();resume();}
function showChest(){if(!game.availableChest()||!game.canSave())return;setScreen('chest');openChestMenu(game,()=>{if(game.claimChest()){persist();setScreen('inventory');journeyMenu.inventory();say('Coins and Roots collected. Choose which equipment to keep.');}});$('chest-title').focus();}
function resume(){if(criticalPending||!game.started)return;if(game.pendingMergeReward()){showMergeReward();return;}if(game.treeVisit){setScreen('tree');erisMenu.open();return;}if(game.inventory.pending.length&&game.canSave()){setScreen('inventory');journeyMenu.inventory();say('Choose your pending reward before continuing.');return;}setScreen('play');$('pause').blur();}
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
    if(event.type==='legendary-clear-ready'){const revision=game.legendary.revision;if(game.prepareLegendaryVictory())startCritical(revision,game.save());}
    if(event.type==='tree')openTree();
    if(event.type==='boss-entry'&&event.snapshot)persistSnapshot(event.snapshot);
    if(event.type==='arena'&&game.arenaScene)renderer.bossArt.step(game.arenaScene.boss,game.time,0,game.hero.x);
    if(event.type==='arena'||event.type==='arena-exit'){renderer.camera=Math.max(0,game.hero.x-renderer.width*.37);renderer.particles=[];regionName='';lastHud='';}
    if(event.type==='arena-exit'&&event.reason==='retreat')say('You retreated. The encounter has reset; earned XP is kept.',4);
    if(event.type==='boss-phase')say(`Phase ${event.phase} · watch for new attack patterns.`,3);
    if(event.type==='boss-wave')say(`Reinforcement wave ${event.wave} of 3 · three helpers.`,3);
    if(event.type==='boss-down')say('Boss down! Defeat every remaining helper to confirm victory.',5);
    if(event.type==='boss-victory'){persist();tone('level');say(`${event.name} defeated! +${event.coins} coins · +${event.xp} XP.${event.first?' First-victory treasure is ready.':''}`,7);}
    if(event.type==='chest-preview')showChest();
    if(event.type==='gate')say(event.message,6);
    if(event.type==='region'){regionName='';lastHud='';renderer.camera=Math.max(0,game.hero.x-renderer.width*.37);renderer.particles=[];say(`${event.name} · a new path ahead.`);}
    if(event.type==='equipment'&&event.pending&&game.canSave()){setScreen('inventory');journeyMenu.inventory();$('inventory-title').focus();}
    renderer.event(event.type === 'level' ? { ...event, x: game.hero.x, y: game.hero.y - 45 } : event); tone(event.type);
    if (event.type === 'level') say(`Level ${event.level}! Health restored · +1 Power Point.`, 4);
    if (event.type === 'reward' && !leveled) say(`${event.enemy} · +${event.xp} XP · +${event.coins} coin${event.coins===1?'':'s'}${event.root?' · Health Root':''}${event.item?' · Equipment':''}`, 2.3);
    if (event.type === 'camp') { persist(); say(`${event.name} set as your checkpoint. Health restored.`); }
    if (event.type === 'respawn') { persist();input.clear(); say(`Back at ${event.name}. Full health restored. Levels, coins and items kept.`); }
    if (event.type === 'destination') { persist(); say('You reached Lighthouse Point! Use the marked arena entrance to challenge Trash Monster.', 6); }
  }
  if(game.arenaScene)updateBossHud(game,game.started&&['play','pause','tree','controls','world','inventory','chest','mergeReward'].includes(screen));
}
function updateHud() {
  const h = game.hero, region = game.treeVisit?{name:'Tree of Eris'}:game.arenaScene?{name:game.arenaScene.legendary?LEGENDARY[game.arenaScene.legendary].arena:`${BOSSES[game.regionId].name} Arena`}:boardAt(game.regionId,h.x);
  updateBossHud(game,game.started&&['play','pause','tree','controls','world','inventory','chest','mergeReward'].includes(screen));
  if(game.arenaScene&&!renderer.bossArt.ready)$('boss-cue').textContent=renderer.bossArt.errors.length?'Approved art could not load. Reload to retry.':'Loading approved boss artwork…';
  $('world-region').textContent=game.treeVisit?'PEACEFUL SANCTUARY':game.getRegion().name.toUpperCase();$('world-clock').hidden=game.regionId<3;$('world-clock').textContent=formatClock(game.clock());
  $('root-count').textContent=game.healthRoots;$('health-root').querySelector('kbd').textContent=input.controls.keys.heal[0].replace('Key','').replace('Digit','');$('health-root').disabled=screen!=='play'||h.dead||game.healthRoots===0||h.hp>=h.maxHp;
  $('health-root').setAttribute('aria-label',`Use Health Root · ${game.healthRoots} of 4 · restore 25% HP`);
  if (region.name !== regionName) { regionName = region.name; $('region').textContent = region.name;$('stage').setAttribute('aria-label',`${game.getRegion().name} game`);$('game').setAttribute('aria-label',`${game.getRegion().name}, ${region.name}. Move, double-jump, punch, kick and use your equipped powers.`); }
  const snapshot = `${h.hp}|${h.maxHp}|${h.level}|${h.xp}|${h.coins}|${game.look.name}|${game.kills}|${game.species.size}|${game.reachedEnd}`;
  if (snapshot !== lastHud) {
    lastHud = snapshot; $('hero-name').textContent = game.look.name; $('level').textContent = h.level; $('coins').textContent = h.coins.toLocaleString();
    $('hp-fill').style.width = `${100 * h.hp / h.maxHp}%`; $('hp-text').textContent = `${Math.ceil(h.hp)} / ${h.maxHp}`;
    $('xp-fill').style.width = h.level === LEVEL_CAP ? '100%' : `${100 * h.xp / xpForLevel(h.level)}%`;
    const xpLabel=n=>n>=10000?`${(n/1000).toFixed(n<100000?1:0)}k`:String(n);
    $('xp-text').textContent = h.level === LEVEL_CAP ? 'MAX LEVEL' : `${xpLabel(h.xp)} / ${xpLabel(xpForLevel(h.level))} XP`;$('xp-text').title=`${h.xp} / ${xpForLevel(h.level)} XP`;
    const cleared = game.kills >= 6 && game.species.size >= 3;
    $('mission-title').textContent = cleared ? (game.reachedEnd ? 'A hero on the horizon' : 'Follow the coast to the lighthouse') : "Meet the coast's troublemakers";
    $('mission-progress').textContent = cleared ? (game.reachedEnd ? 'Patrol complete · Keep exploring and training' : 'Reach Lighthouse Point at the end of the trail') : `${Math.min(6, game.kills)} / 6 monsters · ${game.species.size} / 3 types discovered`;
    $('mission-count').textContent = cleared ? (game.reachedEnd ? '✓' : '→') : `${Math.min(6, game.kills)}/6`;
  }
  $('visit-tree').hidden=screen!=='play'||!game.nearTree()||game.inCombat();
  updatePowers();
  if(screen==='controls')$('controller-status').textContent=input.gamepadLabel;
  $('rest').hidden = screen !== 'play' || !game.canSave() || h.dead || (game.nearCamp()<0&&Math.abs(h.x-5840)>110&&h.x<5995&&!(game.regionId>1&&h.x<110));
  if(game.arenaScene)$('rest').hidden=screen!=='play'||!game.availableChest()||Math.abs(h.x-ARENA.chestX)>140;
  $('rest').innerHTML=game.arenaScene?'✦ VIEW TREASURE <kbd>E</kbd>':game.nearCamp()>=0?'✦ REST <kbd>E</kbd>':'→ PASSAGE <kbd>E</kbd>';
  $('death').hidden = !h.dead || screen !== 'play'; $('diagnostics').hidden = !params.has('qa');
  if (params.has('qa')) $('diagnostics').textContent = `FPS ${fps.toFixed(0)} · draw ${drawMs.toFixed(2)}ms · ${screen} · t ${game.time.toFixed(2)}\nx ${h.x.toFixed(1)} y ${h.y.toFixed(1)} · ${animationState(h)}\nvx ${h.vx.toFixed(1)} vy ${h.vy.toFixed(1)} · jumps ${h.jumps}\nmonsters ${game.enemies.filter(e => e.state !== 'dead').length} · kills ${game.kills}\nregion ${game.regionId} · roots ${game.healthRoots} · gear ${game.inventory.items.length}/7 · clock ${game.clock().phase}\npowers ${game.powers.data.equipped.join(',')} · points ${game.powers.data.points} · combat ${game.inCombat()}\nviewport ${innerWidth}×${innerHeight} · save ${store.durable ? 'ready' : 'unavailable'}${game.arenaScene?`\nboss ${game.arenaScene.boss.hp.toFixed(0)}/${game.arenaScene.boss.maxHp} · phase ${game.arenaScene.boss.phase} · waves ${game.bossEncounter?.waves||0} · helpers ${game.enemies.filter(e=>e.summoned&&e.state!=='dead').length} · cleared ${game.arenaScene.cleared}`:''}`;
}
function updatePowers(){
  const merge=game.mergeAbility();$('power-bar').classList.toggle('has-merge',!!merge);
  for(const [i,b] of [...document.querySelectorAll('.power-button')].entries()){
    const special=i===3,id=special?merge?.id:game.powers.data.equipped[i],def=special?merge:POWERS[id],active=id&&(special?game.mergeEffects.some(e=>e.id===id&&!e.ended):!!game.powers.active[id]),cooldown=id&&(special?(game.mergeCooldowns[id]||0)>0:(game.powers.cooldowns[id]||0)>0),disrupted=!special&&id===game.disruptedPower;
    b.hidden=special&&!merge;b.querySelector('b').textContent=disrupted?'⊘':def?.icon||'+';b.querySelector('span').textContent=def?.name||'Empty slot';b.querySelector('kbd').textContent=input.controls.keys[`power${i}`][0].replace('Digit','').replace('Key','');
    b.classList.toggle('cooldown',!!cooldown);b.classList.toggle('active',!!active);b.classList.toggle('disrupted',!!disrupted);b.classList.toggle('flight-locked',!!(game.powers.flying&&def?.offensive&&id!=='fireball'));b.disabled=!id||screen!=='play'||game.hero.dead||!!disrupted||!!criticalPending;
    b.setAttribute('aria-label',`${def?.name||`Power slot ${i+1}`}${disrupted?' · disrupted until boss reaches half health':cooldown?' · recovering':active?(id==='flight'?' · flying, press to cancel':' · active'):' · ready'}${special?' · protected fourth power':''}`);b.setAttribute('aria-pressed',String(!!active));
  }
  $('power-context').textContent=game.disruptedPower?'ONE POWER DISRUPTED · restored at half boss HP':game.powers.flying?'FLIGHT · steer ↑ ↓ · press Flight to land':game.inCombat()?'IN COMBAT':game.powers.data.points?`${game.powers.data.points} Power Points · visit the Tree of Eris`:'Learn powers at the Tree of Eris';
}
$('manual-save').onclick=()=>{const result=persist();say(result.ok?'Hero saved on this browser.':result.error||'Save unavailable.');};
$('chest-close').onclick=resume;
$('open-map').onclick=()=>{setScreen('world');journeyMenu.map();legendaryMenu.map();$('map-title').focus();};$('map-close').onclick=showPause;
$('open-inventory').onclick=()=>{setScreen('inventory');journeyMenu.inventory();$('inventory-title').focus();};$('inventory-close').onclick=showPause;
$('tree-from-pause').onclick=()=>openTree();$('close-tree').onclick=returnAdventure;
$('open-controls').onclick=()=>{setScreen('controls');controlMenu.render();$('settings-title').focus();};$('close-controls').onclick=showPause;
$('creator-form').addEventListener('submit',e=>{e.preventDefault();begin();});
$('cancel-look').onclick=cancelCreator;
$('pause').onclick=()=>{if(criticalPending||screen==='mergeReward')return;if(screen==='play')pause();else if(screen==='pause')resume();else if(screen==='tree')returnAdventure();else if(screen==='creator'&&editing)cancelCreator();else if(['controls','world','inventory','chest','mergeReward'].includes(screen))showPause();};
$('resume').onclick=resume;$('edit-look').onclick=()=>openTree('appearance');
$('return-camp').onclick=()=>{if(game.returnCheckpoint()){handleEvents();persist();resume();}else say('Leave combat before returning to your checkpoint.');};
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
  if(e.key!=='Tab'||screen==='play'&&!criticalPending)return;
  const panel=criticalPending?$('permanent-save'):$({creator:'creator',roster:'roster',delete:'delete-dialog',pause:'pause-menu',tree:'tree-menu',controls:'controls-menu',world:'world-menu',inventory:'inventory-menu',chest:'chest-menu',mergeReward:'merge-reward'}[screen]);
  const nodes=[...panel.querySelectorAll('a[href],button,input,select')].filter(n=>!n.disabled&&n.tabIndex!==-1&&n.getClientRects().length);
  if(!nodes.length)return;
  if(e.shiftKey&&(document.activeElement===nodes[0]||!panel.contains(document.activeElement))){e.preventDefault();nodes.at(-1).focus();}
  if(!e.shiftKey&&(document.activeElement===nodes.at(-1)||!panel.contains(document.activeElement))){e.preventDefault();nodes[0].focus();}
});
installLegendaryQA(()=>game,()=>{handleEvents();updateHud();},renderer.bossArt,input,{failSave:()=>{fixtureSaveFailures=1;}});
installBossQA(()=>game,()=>{handleEvents();updateHud();});
renderRoster();setScreen('roster');
let last=performance.now(),accumulator=0,measurement=null;
$('measure-performance').onclick=()=>{if(screen==='pause')resume();if(screen!=='play'){$('performance-result').textContent='Start gameplay before measuring.';return;}measurement={start:performance.now(),frames:0,draw:0,max:0,intervals:[]};$('performance-result').textContent='Measuring 30 seconds of visible gameplay…';};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&measurement){measurement=null;$('performance-result').textContent='Sample cancelled: keep the game visible.';}});
function frame(now){
  input.pollGamepad();
  const wallElapsed=Math.max(0,(now-last)/1000),elapsed=Math.min(.1,wallElapsed);last=now;if(wallElapsed>0)fps=fps*.95+.05/wallElapsed;
  if(game.started&&!game.arenaScene)renderer.bossArt.prepare(game.regionId);
  const waitingForArt=game.arenaScene&&!renderer.bossArt.ready;
  if(screen==='play'&&!waitingForArt&&!criticalPending){
    accumulator+=elapsed;while(accumulator>=STEP){game.step(STEP,input.sample());accumulator-=STEP;}
    handleEvents();if(!criticalPending&&screen==='play'&&game.inventory.pending.length&&game.canSave()){setScreen('inventory');journeyMenu.inventory();}saveAge+=elapsed;if(saveAge>5){persist();saveAge=0;}
  }else accumulator=0;
  legendaryMusic.update(audioContext,game.arenaScene?.legendary,soundEnabled&&screen==='play'&&!game.arenaScene?.cleared&&!criticalPending&&!document.hidden);
  const drawStart=performance.now();if(!game.treeVisit)renderer.draw(game,screen==='play'?accumulator/STEP:1,elapsed);
  const cost=performance.now()-drawStart;drawMs=drawMs*.95+cost*.05;
  if(measurement&&(screen!=='play'||waitingForArt)){measurement=null;$('performance-result').textContent='Sample cancelled: keep gameplay active.';}
  if(measurement){const m=measurement;m.frames++;m.draw+=cost;m.max=Math.max(m.max,cost);m.intervals.push(wallElapsed*1000);if(now-m.start>=30000){const seconds=(now-m.start)/1000,sorted=m.intervals.sort((a,b)=>a-b);$('performance-result').textContent=`${seconds.toFixed(1)}s · ${(m.frames/seconds).toFixed(1)} rendered FPS · draw avg ${(m.draw/m.frames).toFixed(2)}ms / max ${m.max.toFixed(2)}ms · p95 frame ${sorted[Math.floor(sorted.length*.95)].toFixed(1)}ms · Region ${game.regionId} · ${innerWidth}×${innerHeight}. This browser only.`;measurement=null;}}
  qaClock+=elapsed;if(qaClock>=.1){updateHud();if(screen==='tree')erisMenu.update();qaClock=0;}
  if(screen==='creator')creator.draw(now);
  if(toastUntil&&now>toastUntil){$('toast').classList.remove('visible');toastUntil=0;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
