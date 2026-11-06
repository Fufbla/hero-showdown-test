import {MenuGamepad} from './menu-gamepad.mjs';
import {backRoute,hasResumeActions} from './menu-navigation.mjs';
import {createMultiplayerMenu} from './multiplayer-gate.mjs';
import {rewardNotice} from './reward-notice.mjs';
import {installLandscapeLayout} from './landscape-layout.mjs';
import {drawEquipmentPreview} from './eris-ui.mjs';
import {selectedInteraction,nearbyInteractions,expireLoot} from './world-loot.mjs';
import {FrameMetrics,performanceLabel} from './performance.mjs';
import {text as hudText,html as hudHTML,attr as hudAttr} from './hud-dom.mjs';
import {shouldWriteAdventure} from './save-policy.mjs';
import {clockSynchronized} from './shared-clock.mjs';
import {CloudAPI, CloudHeroStore} from './cloud-client.mjs';
import {AccountMenu} from './account-ui.mjs';
import { LegendaryMenu } from './legendary-ui.mjs';
import { LEGENDARY, MERGE_POWERS } from './legendary-data.mjs';
import { LegendaryLedger, reconcileLegendaryStore } from './legendary-ledger.mjs';
import {GameAudio,musicScene} from './audio.mjs';
import { ErisMenu } from './eris-ui.mjs';
import { updateBossHud, openChestMenu } from './boss-ui.mjs';
import { BOSSES, ARENA } from './boss-data.mjs';
import { JourneyMenu } from './journey-menu.mjs';
import { formatClock } from './progression.mjs';
import { equipmentOutfit } from './equipment.mjs';
import { POWERS } from './powers.mjs';
import { PowerMenu, ControlMenu } from './power-menu.mjs';
import {InstantPowerUpgrades} from './power-upgrades.mjs';
import { loadControls } from './controls.mjs';
import { Game, STEP, DEFAULT_LOOK, xpForLevel, LEVEL_CAP } from './core.mjs';
import { regionAt, boardAt } from './world.mjs';
import { Input } from './input.mjs';
import { Renderer, drawHero } from './renderer.mjs';
import { LocalHeroStore, PROFILE_KEY } from './saves.mjs';
import { Creator } from './creator.mjs';
import { previewHero, animationState } from './hero-rig.mjs';
import { STARTER_OUTFIT } from './appearance.mjs';
import {styleCDefault} from './style-c-defaults.mjs';
import {bindStyleCGame} from './style-c-live.mjs';
import {prepareStyleCMaterials,styleCTextureStatus} from './style-c-materials.mjs';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
if(params.has('touch'))document.body.classList.add('force-touch');
if(/^(world|vertical)-practice-/.test(params.get('testSession')||''))document.body.classList.add('practice-world');
function sizeVisibleViewport(){
  const viewport=window.visualViewport;
  if(viewport&&viewport.scale===1){document.documentElement.style.setProperty('--visible-height',`${viewport.height}px`);document.body.classList.toggle('keyboard-open',innerWidth<=700&&viewport.height<innerHeight*.78);}
}
window.visualViewport?.addEventListener('resize',sizeVisibleViewport);sizeVisibleViewport();
// The visible QA harness uses its own session-storage namespace, never real hero slots.
const testPrefix=params.has('qa')&&params.get('testSession')?`royale-test-${params.get('testSession')}:`:'';
const practiceHero = ['male','female'].includes(params.get('practice')) && !testPrefix ? params.get('practice') : null;
const codePlay=['1','v3'].includes(params.get('codePlay'))&&window.parent!==window&&window.parent.location.origin===location.origin;
const storagePrefix = testPrefix || (codePlay?(params.get('codePlay')==='v3'?'royale-v3-play:':'royale-code-play-v1:'):(practiceHero ? `style-c-trial-v1-${practiceHero}:` : ''));
const storage={getItem:key=>(testPrefix||practiceHero?sessionStorage:localStorage).getItem(storagePrefix+key),setItem:(key,value)=>(testPrefix||practiceHero?sessionStorage:localStorage).setItem(storagePrefix+key,value)};
$('hero-art-status').textContent='Opening saved heroes…';
const localStore=new LocalHeroStore(storage);let store=localStore;
let ledger=null,ledgerError='',criticalPending=null,fixtureSaveFailures=0,fixtureOrdinaryFailures=0;
try{ledger=await LegendaryLedger.open(window.indexedDB,storagePrefix?storagePrefix+'permanent':'healthia.royale.permanent.v1');await reconcileLegendaryStore(store,ledger);}catch(error){ledger?.close();ledger=null;ledgerError=error.message||'Permanent storage is unavailable.';}
$('hero-art-status').textContent='Preparing hero artwork…';
const localLedger=ledger,localLedgerError=ledgerError;
const cloudApi=null; // Review build: browser-local persistence; cloud backend unavailable.
let cloudStore=null,accountReturn='roster';
const audio=new GameAudio(storage);
let game=new Game(),screen='roster',editing=false,activeSlot=store.data.activeSlot,activeId=null,creatorSlot=activeSlot,deleteTarget=null;
let soundEnabled=false,toastUntil=0,regionName='',lastHud='',fps=60,drawMs=0,qaClock=0;
// One accessible navigation bar follows the current nested overlay.
const menuExitActions=document.createElement('nav');menuExitActions.id='menu-exit-actions';menuExitActions.className='menu-exit-actions';menuExitActions.setAttribute('aria-label','Return from current menu');menuExitActions.hidden=true;
const menuExitBack=document.createElement('button');menuExitBack.type='button';menuExitBack.className='secondary';menuExitBack.textContent='Back to Pause Menu';menuExitBack.onclick=()=>backToPause();
const menuExitResume=document.createElement('button');menuExitResume.type='button';menuExitResume.className='primary';menuExitResume.textContent='Resume Game';menuExitResume.onclick=()=>resume();
menuExitActions.append(menuExitBack,menuExitResume);
const menuExitOverlays={pause:'pause-menu',tree:'tree-menu',world:'world-menu',inventory:'inventory-menu',chest:'chest-menu',controls:'controls-menu',creator:'creator',account:'account-menu'};
function updateMenuExitActions(next){
 const enabled=hasResumeActions(next,{gameStarted:game.started,editing,pauseSubmenu:$('pause-primary').hidden});
 const overlay=enabled?$(menuExitOverlays[next]):null;
 if(!overlay){menuExitActions.hidden=true;return;}
 overlay.append(menuExitActions);menuExitActions.hidden=true;
}
const input=new Input(document,()=>{
 if(criticalPending||powerUpgrades.busy||screen==='mergeReward')return;
 if(screen==='play')pause();
 else if(game.started)resume();
 else backToPause();
},loadControls(storage),()=>backToPause());
const journeyMenu=new JourneyMenu(()=>game,persist,say,resume,transaction);
const powerUpgrades=new InstantPowerUpgrades(()=>({game,store,index:activeSlot,heroId:activeId,blocked:!online()&&activeId&&multiplayerMenu.isLinked(activeId),remote:online()?multiplayerMenu.session:null}));
const powerMenu=new PowerMenu(()=>game,persist,say,powerUpgrades),controlMenu=new ControlMenu(input,storage,say);
const renderer=new Renderer($('game')),creator=new Creator(),powerButtons=[...document.querySelectorAll('.power-button')];
const creatorHome=document.createComment('Character creator home');$('creator').before(creatorHome);
const erisMenu=new ErisMenu(()=>game,{powerMenu,transaction,say,appearance:()=>openCreator(activeSlot,true),leave:returnAdventure,navigate:()=>{if(!canLeaveMenu())return false;if(screen==='creator'&&editing){abandonUnconfirmedAppearance();setScreen('tree');}return true;}});
const legendaryMenu=new LegendaryMenu(()=>game,{transaction,say,enter:enterLegendary,onClaim:resume});
erisMenu.mergeMenu=legendaryMenu;
let makeoverReview=null,remoteLoaded=false;
const multiplayerMenu=await createMultiplayerMenu({
 getContext:()=>({storage,slot:activeSlot,local:localStore.slot(activeSlot),snapshot:game.started&&!online()?JSON.parse(game.save()||'null'):localStore.slot(activeSlot)?.snapshot}),
 onError:error=>say(typeof error==='string'?error:error.message,7),
 onOpen:()=>{if(game.started)setScreen('pause');},
 onClose:()=>game.started?resume():setScreen('roster'),
 onState:(next,state)=>{game=next;if(!remoteLoaded){remoteLoaded=true;activeId=state.id;startPatrol(true);if(multiplayerMenu.dialog.open)setScreen('pause');}game.paused=screen!=='play';for(const e of game.enemies)if(e.boss||e.legendaryHelper)renderer.bossArt.step(e,game.time,.1,game.hero.x);handleEvents();updateHud();}
});
function online(){return !!multiplayerMenu.session?.active;}

function say(message,seconds=3){$('toast').textContent=message;$('toast').classList.add('visible');toastUntil=performance.now()+seconds*1000;}
function storageNotice(){
  const message=online()?'Account progress and exact position are saved by the server.':store.cloud?store.message:store.durable?store.message||'Local heroes stay on this browser. Use Pause → Save Game before leaving.':store.message;
  $('roster-note').textContent=message;$('save-note').textContent=message;
  $('storage-warning').textContent=!store.durable?message:ledgerError?'Legendary storage: '+ledgerError:'';$('storage-warning').hidden=store.durable&&!ledgerError;
}
function persist({manual=false}={}){
  if(online())return {ok:true,account:true};
  if(activeId&&multiplayerMenu.isLinked(activeId))return {ok:false,error:'This hero uses account saving. Reconnect to continue.'};
  if(criticalPending||powerUpgrades.busy||!game.started||!game.canSave())return {ok:false,error:'Saving resumes after five seconds outside combat.'};
  if(!shouldWriteAdventure({manual,heroId:activeId,safe:true}))return {ok:true,skipped:true};
  return persistSnapshot(game.save());
}
function persistSnapshot(snapshot,requireDurable=false){
  if(online())return {ok:true,account:true};
  if(activeId&&multiplayerMenu.isLinked(activeId))return {ok:false,error:'This hero uses account saving. Reconnect to continue.'};
  if(testPrefix&&fixtureOrdinaryFailures>0){fixtureOrdinaryFailures--;return {ok:false,error:'Simulated practice cache failure.'};}
  const result=store.writeSlot(activeSlot,snapshot,{region:game.treeVisit?`Tree of Eris · ${game.getRegion().name}`:`${game.getRegion().name} · ${boardAt(game.regionId,game.hero.x).name}`,expectedId:activeId,requireDurable});
  if((result.ok||result.retained)&&store.data.slots[activeSlot])activeId=store.data.slots[activeSlot].id;
  storageNotice();if(codePlay&&result.ok)queueMicrotask(sendCodeProgress);return result;
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
async function enterLegendary(id){if(!await game.enterLegendary(id)){say('Reach level 99, leave combat and resolve rewards before entering.');return;}handleEvents();setScreen('play');updateHud();}
async function transaction(action){
  if(online()){try{const value=await action();return value===false?{ok:false,error:'This action is not available.'}:typeof value==='object'?value:{ok:true};}catch(e){say(e.message,7);return {ok:false,error:e.message};}}
  if(activeId&&multiplayerMenu.isLinked(activeId))return {ok:false,error:'This hero uses account saving. Reconnect to continue.'};
  if(powerUpgrades.busy)return {ok:false,error:'An upgrade is being saved.'};
  if(criticalPending)return {ok:false,error:'A permanent transaction is already saving.'};
  if(!game.canSave())return {ok:false,error:'Wait five seconds outside combat.'};
  const before=structuredClone({inventory:game.inventory,economy:game.economy,legendary:game.legendary,bossProgress:game.bossProgress,look:game.look,powers:game.powers.data,coins:game.hero.coins,hp:game.hero.hp,roots:game.healthRoots}),eventCount=game.events.length;
  const value=action();if(value===false||value?.ok===false){if(value?.error)say(value.error);return value||{ok:false,error:'This action is no longer available.'};}
  if(game.legendary.revision!==before.legendary.revision){if(ledger){startCritical(before.legendary.revision,game.save());return {ok:false,pending:true,error:'Saving permanent progress…'};}game.inventory=before.inventory;game.economy=before.economy;game.legendary=before.legendary;game.bossProgress=before.bossProgress;game.hero.coins=before.coins;game.refreshEquipment();return {ok:false,error:'Permanent storage is unavailable. No equipment was destroyed.'};}
  const saved=persistSnapshot(game.save(),true);
  if(!saved.ok){game.inventory=before.inventory;game.economy=before.economy;game.legendary=before.legendary;game.bossProgress=before.bossProgress;game.look=before.look;game.powers.data=before.powers;game.hero.coins=before.coins;game.hero.hp=before.hp;game.healthRoots=before.roots;game.events.length=eventCount;game.refreshEquipment();say('No transaction completed. '+saved.error,7);return saved;}
  return typeof value==='object'?value:{ok:true};
}
function updateMakeoverQuote(){
  if(!editing)return;makeoverReview=null;$('makeover-confirm').hidden=true;
  const q=game.makeoverPreview(creator.read());$('makeover-cost').textContent=`${q.cost??0} coins · Balance ${game.hero.coins}${q.makeover?' · Complete makeover price':q.groups?.length?' · '+q.groups.join(', '):' · Starter suit colors are free'}. ${q.ok?'':q.error}`;
}
$('creator-form').addEventListener('input',updateMakeoverQuote);
$('cancel-makeover').onclick=()=>{makeoverReview=null;$('makeover-confirm').hidden=true;};
$('confirm-makeover').onclick=async()=>{const q=makeoverReview;if(!q)return;makeoverReview=null;const result=await transaction(()=>game.applyMakeover(q.next,{confirmed:true,revision:q.revision}));if(result.ok){editing=false;setScreen('tree');erisMenu.open();say('Appearance updated. Your progress is unchanged.');}else updateMakeoverQuote();};
function setScreen(next){
  if(codePlay&&next==='roster'&&game.started)sendCodeProgress(true);
  if(criticalPending||powerUpgrades.busy)return;
  if(next==='play'&&screen!=='play')input.waitForNeutralPad=true;
  screen=next;if(online())multiplayerMenu.session.pause(next!=='play');input.enabled=next==='play';input.clear();game.paused=next!=='play';
  const embeddedAppearance=next==='creator'&&editing&&game.treeVisit;
  if(embeddedAppearance)$('eris-appearance-panel').append($('creator'));else creatorHome.after($('creator'));
  $('creator').classList.toggle('overlay',!embeddedAppearance);
  for(const [name,id] of Object.entries({account:'account-menu',roster:'roster',creator:'creator',pause:'pause-menu',delete:'delete-dialog',tree:'tree-menu',controls:'controls-menu',world:'world-menu',inventory:'inventory-menu',chest:'chest-menu',mergeReward:'merge-reward'}))$(id).hidden=next!==name;
  const inGame=game.started&&(['play','powerPicker','pause','tree','controls','world','inventory','chest','mergeReward','account'].includes(next)||(next==='creator'&&editing));
  if(embeddedAppearance)$('tree-menu').hidden=false;
  $('hud').hidden=!inGame;$('mission').hidden=!inGame;$('pause').disabled=!inGame;
  $('pause').setAttribute('aria-label',next==='play'?'Pause game':'Resume game');$('pause').textContent=next==='play'?'Ⅱ':'▷';
  document.body.classList.toggle('sanctuary-view',game.treeVisit);document.body.classList.toggle('playing',next==='play');document.body.classList.toggle('game-view',inGame);
  if(next!=='play'){$('world-portal').hidden=true;$('rest').hidden=true;$('visit-tree').hidden=true;$('death').hidden=true;}
   updateMenuExitActions(next);
}
function dateText(value){const date=new Date(value);return value&&Number.isFinite(date.getTime())?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(date):'Imported from Phase 1';}
function renderRoster(){
  const container=$('hero-slots');container.replaceChildren();
  // V3 exposes two reliable hero slots; Slot 3 data remains stored untouched.
  for(let i=0;i<(codePlay&&params.get('codePlay')==='v3'?2:3);i++){
    const slot=store.slot(i),card=document.createElement('article');card.className='hero-slot';card.dataset.slot=i;
    const number=document.createElement('small');number.className='slot-number';number.textContent=`HERO SLOT 0${i+1}`;card.append(number);
    const canvas=document.createElement('canvas');canvas.width=360;canvas.height=320;canvas.setAttribute('aria-label',slot?`Portrait of ${slot.snapshot.look.name}`:'Empty hero slot');card.append(canvas);
    const name=document.createElement('h2');name.textContent=slot?slot.snapshot.look.name:'A new beginning';card.append(name);
    const detail=document.createElement('p');detail.className='slot-detail';detail.textContent=slot?`Level ${slot.snapshot.level} · ${slot.lastRegion}`:'The coast is waiting for its next hero.';card.append(detail);
    const saved=document.createElement('p');saved.className='last-saved';saved.textContent=slot?`Last saved: ${dateText(slot.updatedAt)}`:'Create your look. Find your courage.';card.append(saved);
    const button=document.createElement('button');button.className=slot?'primary':'secondary';button.dataset.action=slot?'continue':'create';button.textContent=slot?'Continue →':'Create Hero +';button.disabled=!store.writable&&!slot;button.onclick=()=>slot?continueHero(i):openCreator(i,false);card.append(button);
    if(slot){const del=document.createElement('button');del.className='text-button delete-hero';del.textContent='Delete Hero';del.disabled=!store.writable||multiplayerMenu.isLinked(slot.id);del.onclick=()=>{deleteTarget={index:i,id:slot.id,name:slot.snapshot.look.name};$('delete-description').textContent=`Delete ${slot.snapshot.look.name}, level ${slot.snapshot.level}?`;setScreen('delete');$('cancel-delete').focus();};card.append(del);}
    container.append(card);
    const c=canvas.getContext('2d');c.fillStyle='#c4d4a41c';c.beginPath();c.ellipse(180,284,62,10,0,0,Math.PI*2);c.fill();
    if(slot)drawHero(c,180,282,slot.snapshot.look,previewHero('idle',0),0,2.2,{view:'front',outfit:equipmentOutfit(slot.snapshot.inventory,slot.snapshot.outfit)});
    else{c.fillStyle='#b6cda77a';c.font='66px Georgia';c.textAlign='center';c.fillText('✦',180,190);}
  }
  $('back-to-patrol').hidden=!game.started;storageNotice();
}
function openRoster(){if(online()){multiplayerMenu.open();return;}if(!game.canSave()){say('Leave combat before switching heroes.');return;}persist();renderRoster();setScreen('roster');$('roster-title').focus();}
function continueHero(index){
  const linked=localStore.slot(index);if(linked&&multiplayerMenu.isLinked(linked.id)){activeSlot=index;multiplayerMenu.open();void multiplayerMenu.run(()=>multiplayerMenu.connect());return;}
  const slot=store.slot(index);if(!slot)return;if(slot.snapshot.legendary.revision&&!ledger){say('This hero needs its permanent progress record. '+ledgerError,9);return;}
  activeSlot=index;activeId=slot.id;game=new Game({save:slot.snapshot});startPatrol(true);
}
async function openCreator(index=activeSlot,isEdit=true){
  if(isEdit&&!canLeaveMenu())return;
  if(isEdit&&!game.treeVisit&&!await game.visitTree()){say('Visit Eris after five safe seconds to change appearance.');return;}
  if(isEdit&&!game.canSave()){say('Leave combat before customizing.');return;}editing=isEdit;creatorSlot=index;
  creator.fill(editing?game.look:styleCDefault('male'),editing?game.visualOutfit():STARTER_OUTFIT,!editing);
  $('name').disabled=editing;makeoverReview=null;$('makeover-confirm').hidden=true;$('makeover-cost').hidden=!editing;
  $('creator-slot').textContent=`${editing?'CUSTOMIZE':'CREATE'} · HERO SLOT 0${index+1}`;
  $('begin').textContent=editing?'REVIEW APPEARANCE COST →':'BEGIN YOUR ADVENTURE →';$('cancel-look').textContent=editing?'Cancel appearance changes':'Back to heroes';
  setScreen('creator');if(editing)erisMenu.selectPanel('appearance');updateMakeoverQuote();$('creator-title').focus();
}
function cancelCreator(){if(editing){editing=false;setScreen('tree');erisMenu.open('home');}else{renderRoster();setScreen('roster');}}
function startPatrol(continued){
  bindStyleCGame(renderer.cloth,game);
  game.legendaryStorageReady=online()||!!ledger&&store.writable;
  game.onBossVisualStep=(boss,time,dt,x)=>renderer.bossArt.step(boss,time,dt,x);
  if(game.arenaScene)renderer.bossArt.step(game.arenaScene.boss,game.time,0,game.hero.x);
  game.started=true;regionName='';lastHud='';renderer.camera=Math.max(0,game.hero.x-renderer.width*.37);renderer.cameraY=0;renderer.clearParticles();
  setScreen('play');persist();if(codePlay)queueMicrotask(sendCodeProgress);updateHud();if(game.pendingMergeReward())showMergeReward();else if(game.treeVisit){setScreen('tree');erisMenu.open();}else if(game.inventory.pending.length){setScreen('inventory');journeyMenu.inventory();}say(continued?'Welcome back, hero. Your patrol continues.':'Welcome to the coast! Move right to find your first Bottle Critter.',4);
}
async function begin(){
  const validation=creator.validate();if(!validation.ok)return;
  const look=creator.read();look.name=validation.name;
  if(editing){const q=game.makeoverPreview(look);if(!q.ok){say(q.error);return;}makeoverReview=q;$('makeover-confirm-text').textContent=`Apply these changes for ${q.cost} coins? ${q.makeover?'Complete makeover price applied.':'Your level, equipment and progress stay the same.'}`;$('makeover-confirm').hidden=false;$('confirm-makeover').focus();}
  else{activeSlot=creatorSlot;activeId=null;game=new Game({look});if(store.cloud){$('begin').disabled=true;try{await store.create(activeSlot,game.save());activeId=store.slot(activeSlot).id;}catch(e){say(e.message,8);return;}finally{$('begin').disabled=false;}}startPatrol(false);}
}
function pause(){if(!game.started||screen!=='play')return;if(codePlay)sendCodeProgress(true);showPause();persist();}
function showPause(){pausePanel('home');$('pause-region').textContent=game.getRegion().name.toUpperCase();controlMenu.capture=null;setScreen('pause');powerMenu.loadout();for(const id of ['edit-look','choose-hero','manual-save'])$(id).disabled=!game.canSave();$('return-camp').disabled=!game.canTravel();$('safe-save-note').textContent=game.canSave()?(online()?'Server saving is active. Save Game confirms your current position.':store.cloud?'Manual cloud saving is available.':'Saving is available · browser-local only.'):'Saving is locked. Resume and spend five seconds without attacking or taking damage.';$('resume').focus();}
async function openTree(panel='home'){if(powerUpgrades.busy)return;if(typeof panel!=='string')panel='home';if(!await game.visitTree()){say('Leave combat for five seconds before visiting the Tree.');return;}setScreen('tree');persist();erisMenu.open(panel);$('tree-title').focus();}
function openConfirmation(){
 const overlay=$(menuExitOverlays[screen]||'');
 if(document.querySelector('.sale-dialog[open]'))return true;
 return !!overlay&&[...overlay.querySelectorAll('.upgrade-confirm:not([hidden]), #shop-confirm:not([hidden]), #equipment-confirm:not([hidden]), #makeover-confirm:not([hidden])')].some(node=>node.getClientRects().length>0);
}
function canLeaveMenu(){
 if(criticalPending){say('Complete or retry the permanent save before leaving this menu.',7);return false;}
 if(powerUpgrades.busy){say('Finish the superpower upgrade before leaving this menu.',7);return false;}
 if(openConfirmation()){say('Confirm or cancel the pending action before leaving this menu.',7);return false;}
 return true;
}
function leaveTreeForNavigation(){
 if(!game.treeVisit)return true;
 // Game.leaveTree restores the exact suspended world location.
 if(!game.leaveTree()){say('Could not leave the sanctuary. Try again.',7);return false;}
 persist();return true;
}
function abandonUnconfirmedAppearance(){
 if(screen!=='creator'||!editing)return;
 makeoverReview=null;$('makeover-confirm').hidden=true;editing=false;
}
function backToPause(){
 const route=backRoute(screen,{pauseSubmenu:$('pause-primary').hidden,editing,gameStarted:game.started});
 if(route==='pause-home'){pausePanel('home');$('resume').focus();return;}
 if(route==='resume'){resume();return;}
 if(route==='close-picker'){closePowerPicker();return;}
 if(route==='cancel-creator'){cancelCreator();return;}
 if(route==='close-delete'){closeDelete();return;}
 if(route==='close-account'){accountMenu?.hooks.close();return;}
 if(route==='resolve-reward'){say('Finish or cancel the Villain Merge reward choices first.',7);return;}
 if(route==='pause'){
  if(!canLeaveMenu())return;
  abandonUnconfirmedAppearance();
  if(!leaveTreeForNavigation())return;
  showPause();return;
 }
}
function returnAdventure(){resume();}
function showChest(){if(!game.availableChest()||!game.canSave())return;setScreen('chest');openChestMenu(game,async()=>{if((await transaction(()=>game.claimChest())).ok){setScreen('inventory');journeyMenu.inventory();say('Coins and Roots collected. Choose which equipment to keep.');}});$('chest-title').focus();}
function resume(){
 if(!game.started||!canLeaveMenu())return;
 if(game.pendingMergeReward()){showMergeReward();return;}
 if(game.inventory.pending.length&&game.canSave()){setScreen('inventory');journeyMenu.inventory();say('Keep or leave your pending reward before resuming.',7);return;}
 abandonUnconfirmedAppearance();
 if(screen==='powerPicker'&&$('slot-picker').open){$('slot-picker').close();pickerReturn=null;}
 if(!leaveTreeForNavigation())return;
 setScreen('play');$('pause').blur();document.activeElement?.blur?.();resetFrameClock();
}
function closeDelete(){deleteTarget=null;renderRoster();setScreen('roster');}
function tone(type){audio.effect(type);}
function handleEvents() {
  const events = game.drain(), leveled = events.some(e => e.type === 'level');
  if(codePlay&&events.some(e=>['level','boss-defeated','legendary-clear-ready','loot-picked','world-portal','tree'].includes(e.type)))queueMicrotask(sendCodeProgress);
  for (const event of events) {
    if(event.type==='legendary-clear-ready'&&!online()){const revision=game.legendary.revision;if(game.prepareLegendaryVictory())startCritical(revision,game.save());}
    if(event.type==='tree')openTree();
    if(event.type==='world-portal')openWorld();
    if(event.type==='loot-picked')say(event.message);
    if(event.type==='loot-full'){say(event.message);if(event.id&&game.canSave()){journeyMenu.groundReward=event.id;setScreen('inventory');journeyMenu.inventory();}}
    // Entering a boss is not a manual save. Reload restores the last saved scene.
    if(event.type==='arena'&&game.arenaScene)renderer.bossArt.step(game.arenaScene.boss,game.time,0,game.hero.x);
    if(event.type==='arena'||event.type==='arena-exit'){renderer.camera=Math.max(0,game.hero.x-renderer.width*.37);renderer.clearParticles();regionName='';lastHud='';}
    if(event.type==='arena-exit'&&event.reason==='retreat')say('You retreated. The encounter has reset; earned XP is kept.',4);
    if(event.type==='boss-phase')say(`Phase ${event.phase} · watch for new attack patterns.`,3);
    if(event.type==='boss-wave')say(`Reinforcement wave ${event.wave} of 3 · three helpers.`,3);
    if(event.type==='boss-down')say('Boss down! Defeat every remaining helper to confirm victory.',5);
    if(event.type==='boss-victory'){persist();tone('level');say(`${event.name} defeated! +${event.coins} coins · +${event.xp} XP.${event.first?' First-victory treasure is ready.':''}`,7);}
    if(event.type==='chest-preview')showChest();
    if(event.type==='gate')say(event.message,6);
    if(event.type==='region'){regionName='';lastHud='';renderer.camera=Math.max(0,game.hero.x-renderer.width*.37);renderer.clearParticles();say(`${event.name} · a new path ahead.`);}
    if(event.type==='equipment'&&event.pending&&game.canSave()){setScreen('inventory');journeyMenu.inventory();$('inventory-title').focus();}
    renderer.event(event.type === 'level' ? { ...event, x: game.hero.x, y: game.hero.y - 45 } : event); tone(event.type);
    if (event.type === 'level') say(`Level ${event.level}! Health restored · +1 Power Point.`, 4);
    if (event.type === 'reward' && !leveled) { const notice=rewardNotice(event,game.loot); if(notice)say(notice,2.3); }
    if (event.type === 'camp') { persist(); say(`${event.name} set as your checkpoint.`); }
    if (event.type === 'respawn') { persist();input.clear(); say(`Back at ${event.name}. Full health restored. Levels, coins and items kept.`); }
    if (event.type === 'destination') { persist(); say('You reached Lighthouse Point! Use the marked arena entrance to challenge Trash Monster.', 6); }
  }
  if(game.arenaScene)updateBossHud(game,game.started&&['play','pause','tree','controls','world','inventory','chest','mergeReward'].includes(screen));
}
function updateHud() {
  const h = game.hero, region = game.treeVisit?{name:'Tree of Eris'}:game.arenaScene?{name:game.arenaScene.legendary?LEGENDARY[game.arenaScene.legendary].arena:`${BOSSES[game.regionId].name} Arena`}:boardAt(game.regionId,h.x);
  document.getElementById('boss-hud').dataset.cleared=String(!!game.arenaScene?.cleared);
  updateBossHud(game,game.started&&['play','pause','tree','controls','world','inventory','chest','mergeReward'].includes(screen));

  hudText($('world-region'),game.treeVisit?'PEACEFUL SANCTUARY':game.getRegion().name.toUpperCase());$('world-clock').hidden=game.regionId<3;hudText($('world-clock'),formatClock(game.clock()));$('world-clock').title=clockSynchronized()?'Synchronized with account server time':'Offline clock uses this device time; server synchronization awaits the account service.';
  hudText($('root-count'),game.healthRoots);hudText($('health-root').querySelector('kbd'),input.controls.keys.heal[0].replace('Key','').replace('Digit',''));$('health-root').disabled=screen!=='play'||h.dead||game.healthRoots===0||h.hp>=h.maxHp;
  hudAttr($('health-root'),'aria-label',`Use Health Root · ${game.healthRoots} of 10 · restore 25% HP`);
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
  $('account-open').disabled=!!cloudApi?.writing||!!criticalPending||screen==='mergeReward'||game.started&&!game.canSave();
  const travelTarget=selectedInteraction(game,'travel');
  $('world-portal').hidden=screen!=='play'||!travelTarget;
  $('world-portal').textContent=travelTarget?'↑ Enter Portal':'';
  $('visit-tree').hidden=screen!=='play'||!game.nearTree()||game.inCombat();
  updatePowers();
  if(screen==='world')journeyMenu.updateClock();
  if(screen==='controls')hudText($('controller-status'),input.gamepadLabel);
  const target=selectedInteraction(game,'loot');
  $('rest').hidden=screen!=='play'||!target;
  // Target cycling remains available through the configured keyboard/controller input; no gameplay banner.
  $('cycle-interaction').hidden=true;
  $('rest').textContent=target?`${target.label} · ${input.controls.keys.interact[0].replace('Key','')}`:'';
  $('death').hidden = !h.dead || screen !== 'play'; $('diagnostics').hidden = !params.has('qa');
  if (params.has('qa')) $('diagnostics').textContent = `FPS ${fps.toFixed(0)} · draw ${drawMs.toFixed(2)}ms · ${screen} · t ${game.time.toFixed(2)}\nx ${h.x.toFixed(1)} y ${h.y.toFixed(1)} · ${animationState(h)}\nvx ${h.vx.toFixed(1)} vy ${h.vy.toFixed(1)} · jumps ${h.jumps}\nmonsters ${game.enemies.filter(e => e.state !== 'dead').length} · kills ${game.kills}\nregion ${game.regionId} · roots ${game.healthRoots} · gear ${game.inventory.items.length}/20 · clock ${game.clock().phase}\npowers ${game.powers.data.equipped.join(',')} · points ${game.powers.data.points} · combat ${game.inCombat()}\nviewport ${innerWidth}×${innerHeight} · save ${store.durable ? 'ready' : 'unavailable'}${game.arenaScene?`\nboss ${game.arenaScene.boss.hp.toFixed(0)}/${game.arenaScene.boss.maxHp} · phase ${game.arenaScene.boss.phase} · waves ${game.bossEncounter?.waves||0} · helpers ${game.enemies.filter(e=>e.summoned&&e.state!=='dead').length} · cleared ${game.arenaScene.cleared}`:''}`;
  if(params.has('qa')&&online())$('diagnostics').textContent+='\nnetwork '+(multiplayerMenu.session.client.ready?'ready':'reconnecting')+' · confirmed '+multiplayerMenu.session.state.revision+' · peers '+multiplayerMenu.session.state.nearby.length+' · code '+(multiplayerMenu.session.state.code||'solo');
  if(params.has('qa')&&!game.arenaScene)$('diagnostics').textContent+='\nplatforms '+game.surfaces.filter(s=>s.tier===2||s.tier===3).map(s=>s.id+':'+game.enemies.filter(e=>e.spawnSurface?.id===s.id&&e.state!=='dead').length).join(' ');

}
function updatePowers(){
  const merge=game.mergeAbility();$('power-bar').classList.toggle('has-merge',!!merge);
  const canEdit = screen==='play' && game.canSave() && !criticalPending && !powerUpgrades.busy;
  $('edit-hud-powers').disabled = !canEdit;
  for(const [i,b] of powerButtons.entries()){
    const special=i===3,id=special?merge?.id:game.powers.data.equipped[i],def=special?merge:POWERS[id],active=id&&(special?game.mergeEffects.some(e=>e.id===id&&!e.ended):!!game.powers.active[id]),cooldown=id&&(special?(game.mergeCooldowns[id]||0)>0:(game.powers.cooldowns[id]||0)>0),disrupted=!special&&!!id&&id===game.disruptedPower;
    b.hidden=special&&!merge;hudText(b.querySelector('b'),disrupted?'⊘':def?.icon||'+');hudText(b.querySelector('span'),def?.name||'Empty slot');hudText(b.querySelector('kbd'),input.controls.keys[`power${i}`][0].replace('Digit','').replace('Key',''));
    b.classList.toggle('cooldown',!!cooldown);b.classList.toggle('active',!!active);b.classList.toggle('disrupted',!!disrupted);b.classList.toggle('flight-locked',!!(game.powers.flying&&def?.offensive&&id!=='fireball'));b.disabled=screen!=='play'||game.hero.dead||!!disrupted||!!criticalPending||(!id&&(special||!canEdit));
    hudAttr(b,'aria-label',!id&&!special?`Choose a power for empty slot ${i+1}`:`${def?.name||`Power slot ${i+1}`}${disrupted?' · disrupted until boss reaches half health':cooldown?' · recovering':active?(id==='flight'?' · flying, press to cancel':' · active'):' · ready'}${special?' · protected fourth power':''}`);hudAttr(b,'aria-pressed',String(!!active));
  }
  updateCompactSlots(canEdit,game);
  hudText($('power-context'),game.disruptedPower?'ONE POWER DISRUPTED · restored at half boss HP':game.powers.flying?'FLIGHT · steer ↑ ↓ · press Flight to land':game.inCombat()?'IN COMBAT':game.powers.data.points?`${game.powers.data.points} Power Points · ↑ in Superpowers`:'Tap + to equip a learned power');
}
let pickerReturn = null;
function openPowerPicker(slot, trigger = powerButtons[slot]) {
  if (screen !== 'play' || !game.canSave() || criticalPending || powerUpgrades.busy) return;
  pickerReturn = trigger;
  setScreen('powerPicker');
  powerMenu.showHudSlot(slot, closePowerPicker);
}
function closePowerPicker() {
  if (powerUpgrades.busy || screen !== 'powerPicker') return;
  $('slot-picker').close();
  resume(); updatePowers();
  pickerReturn?.focus({preventScroll:true}); pickerReturn = null;
}
$('slot-picker').oncancel = event => { event.preventDefault(); closePowerPicker(); };
$('picker-close').onclick = closePowerPicker;
$('edit-hud-powers').onclick = event => openPowerPicker(0, event.currentTarget);
const updateCompactSlots=installLandscapeLayout(input,openPowerPicker);
$('manual-save').onclick=async()=>{if(online()){try{await multiplayerMenu.session.command('save');say('Account progress and exact location confirmed.');}catch(e){say(e.message);}return;}if(!game.canSave()||criticalPending||powerUpgrades.busy)return;const b=$('manual-save');b.disabled=true;try{const result=store.cloud?await store.commit(activeSlot,game.save()):persist({manual:true});say(result.ok?(store.cloud?'Game saved to your account.':'Hero saved on this browser.'):result.error||'Save unavailable.');}catch(e){say(e.message,9);}finally{b.disabled=!game.canSave();}};
$('chest-close').onclick=resume;
function openWorld(){setScreen('world');journeyMenu.map();legendaryMenu.map();$('map-title').focus();}
$('open-map').onclick=openWorld;$('map-close').onclick=showPause;
$('open-inventory').onclick=()=>{journeyMenu.groundReward=null;setScreen('inventory');journeyMenu.inventory();$('inventory-title').focus();};$('inventory-close').onclick=()=>{journeyMenu.groundReward=null;showPause();};
$('tree-from-pause').onclick=()=>openTree();$('close-tree').onclick=returnAdventure;
$('open-controls').onclick=()=>{setScreen('controls');controlMenu.render();$('settings-title').focus();};$('close-controls').onclick=showPause;
$('creator-form').addEventListener('submit',e=>{e.preventDefault();begin();});
$('cancel-look').onclick=cancelCreator;
$('pause').onclick=()=>{if(screen==='play')pause();else if(game.started)resume();else backToPause();};
$('return-menu').onclick=()=>backToPause();
$('resume').onclick=resume;$('edit-look').onclick=()=>openTree('appearance');
$('return-camp').onclick=async()=>{if(await game.returnCheckpoint()){handleEvents();persist();resume();}else say('Leave combat before returning to your checkpoint.');};
$('choose-hero').onclick=openRoster;$('back-to-patrol').onclick=resume;
$('cancel-delete').onclick=closeDelete;
$('confirm-delete').onclick=async()=>{
  if(!deleteTarget)return;
  const target=deleteTarget;deleteTarget=null;$('confirm-delete').disabled=true;let result;try{
    if(store.cloud)result=await store.remove(target.index,target.id);
    else{const slot=store.slot(target.index);if(!ledger||slot?.id!==target.id)throw Error('Durable deletion is unavailable. The hero was not removed.');await ledger.deleteHero(target.id,slot.snapshot.legendary.revision);result=store.deleteSlot(target.index,target.id);if(!result.ok){store.data.slots[target.index]=null;say('Deletion is permanently recorded. Reload to synchronize the hero list.',8);}}
  }catch(e){closeDelete();say(e.message,8);return;}finally{$('confirm-delete').disabled=false;}
  if(result.ok||!store.slot(target.index)){
    if(activeId===target.id){game=new Game();activeId=null;}
    closeDelete();
  }else{closeDelete();say(result.error,6);}
};
$('sound').onclick=async()=>{try{if(soundEnabled){audio.mute();soundEnabled=false;}else{await audio.enable(window.AudioContext||window.webkitAudioContext);soundEnabled=true;tone('camp');}$('sound').setAttribute('aria-pressed',String(soundEnabled));$('sound').setAttribute('aria-label',soundEnabled?'Mute sound':'Enable sound');}catch{say('Audio is unavailable in this browser.');}};
for(const kind of ['music','effects']){const slider=$('volume-'+kind);slider.value=Math.round(audio.settings[kind]*100);const update=()=>{audio.volume(kind,Number(slider.value)/100);$('volume-'+kind+'-value').textContent=slider.value+'%';};slider.oninput=update;update();}
document.addEventListener('visibilitychange',()=>{
  if (document.hidden) { audio.update(musicScene(game),false);persist(); }
});
window.addEventListener('pagehide',persist);
window.addEventListener('storage',e=>{if(storagePrefix||store.cloud||e.key!==PROFILE_KEY)return;if(game.started)persist();else{store.load();renderRoster();}});
// Keyboard focus stays in the active panel. Tabs also support arrow-key navigation.
document.addEventListener('keydown',e=>{
  if(e.key!=='Tab'||screen==='play'&&!criticalPending)return;
  const panel=criticalPending?$('permanent-save'):$( { account:'account-menu',creator:'creator',roster:'roster',delete:'delete-dialog',pause:'pause-menu',tree:'tree-menu',controls:'controls-menu',world:'world-menu',inventory:'inventory-menu',chest:'chest-menu',mergeReward:'merge-reward'}[screen]);
  if(!panel)return;
  const nodes=[...panel.querySelectorAll('a[href],button,input,select')].filter(n=>!n.disabled&&n.tabIndex!==-1&&n.getClientRects().length);
  if(!nodes.length)return;
  if(e.shiftKey&&(document.activeElement===nodes[0]||!panel.contains(document.activeElement))){e.preventDefault();nodes.at(-1).focus();}
  if(!e.shiftKey&&(document.activeElement===nodes.at(-1)||!panel.contains(document.activeElement))){e.preventDefault();nodes[0].focus();}
});

let accountMenu=null;
async function useCloud(){
 if(!cloudApi)return;const candidate=new CloudHeroStore(cloudApi);await candidate.refresh();cloudStore=candidate;store=candidate;ledger={commit:(id,rev,snapshot)=>candidate.irreversible(id,rev,snapshot)};ledgerError='';game=new Game();activeId=null;activeSlot=0;document.body.classList.add('cloud-mode');renderRoster();setScreen('roster');
}
function useLocal(){store=localStore;ledger=localLedger;ledgerError=localLedgerError;game=new Game();activeId=null;activeSlot=store.data.activeSlot;document.body.classList.remove('cloud-mode');renderRoster();setScreen('roster');}
if(cloudApi){cloudApi.auth.onAuthStateChange((event,session)=>{if(store.cloud&&(event==='SIGNED_OUT'||session&&session.user.id!==store.user?.id))queueMicrotask(()=>{if(criticalPending||powerUpgrades.busy){location.reload();return;}useLocal();say('Account changed. Open Account to load that account’s heroes.',7);});});accountMenu=new AccountMenu(cloudApi,{show:()=>{accountReturn=game.started?'pause':'roster';setScreen('account');$('account-title').focus();},close:()=>{if(accountReturn==='pause')showPause();else{renderRoster();setScreen('roster');}},local:useLocal,cloud:useCloud,currentCloud:()=>store.cloud?store:null,localStore:()=>localStore,localLedgerReady:()=>!!localLedger,refreshRoster:renderRoster});$('account-open').onclick=()=>{if(!powerUpgrades.busy&&!cloudApi.writing)void accountMenu.open();};}
else $('account-open').hidden=true;
if(cloudApi){void(async()=>{try{await cloudApi.configure();const{data}=await cloudApi.auth.getSession();if(data.session){if(game.started||screen!=='roster'){say('Account connected. Open Account to switch to cloud heroes.',6);}else await useCloud();}if(params.has('accountRecovery'))await accountMenu.open('reset');}catch(e){$('storage-warning').hidden=false;$('storage-warning').textContent=e.message;}})();setInterval(()=>void cloudApi.configure().catch(()=>{}),60000);}
let phase10QA=null;
if(testPrefix){
 const {installInputQA}=await import('./input-qa.mjs');installInputQA(()=>game,input,renderer,()=>{handleEvents();updateHud();});
 const [{installVerticalQA},{installLegendaryQA},{installBossQA}]=await Promise.all([import('./vertical-qa.mjs'),import('./legendary-qa.mjs'),import('./boss-qa.mjs')]);
 installVerticalQA(()=>game,input,renderer,()=>{handleEvents();updateHud();});
 installLegendaryQA(()=>game,()=>{handleEvents();updateHud();},renderer.bossArt,input,{failSave:()=>{fixtureSaveFailures=1;}});
 installBossQA(()=>game,()=>{handleEvents();updateHud();},{failSave:()=>{fixtureOrdinaryFailures=1;}});
 if(/^p10-(checks|benchmark)-/.test(params.get('testSession')||'')){const {installPhase10QA}=await import('./phase10-qa.mjs');phase10QA=installPhase10QA(()=>game,next=>{game=next;startPatrol(true);},input,renderer,()=>{handleEvents();updateHud();},audio,seconds=>beginMeasurement(seconds));}
}
if (practiceHero) {
  if (!store.slot(0) && store.writable) {
    const {styleCPracticeSnapshot} = await import('./tests/style-c-scenes.mjs');
    store.writeSlot(0, styleCPracticeSnapshot(practiceHero), {expectedId:null});
  }
  document.querySelector('.phase-label').textContent = 'STYLE C PRACTICE';
}
renderRoster();setScreen('roster');
if (practiceHero && store.slot(0)) {
  continueHero(0);
  say('Practice patrol · Use ⇄ to change powers or tap + to fill an empty slot.', 7);
}
void prepareStyleCMaterials().then(ready=>{
  const notice=$('hero-art-status');
  notice.hidden=ready;
  if(!ready)notice.textContent='Hero artwork could not load. Reload the game to try again.';
  if(screen==='roster')renderRoster();
  if(screen==='creator'){creator.draw();creator.refreshHairGallery();}
});
for(const link of document.querySelectorAll('#roster a[href^="tests/"]'))link.hidden=!params.has('qa');
let last=performance.now(),accumulator=0,measurement=null,backgroundSignature='';
function resetFrameClock(){last=performance.now();accumulator=0;}
window.addEventListener('focus',resetFrameClock);
document.addEventListener('visibilitychange',resetFrameClock);
function beginMeasurement(duration=30){if(screen==='pause')resume();if(screen!=='play'){$('performance-result').textContent='Start gameplay before measuring.';return;}last=performance.now();measurement=new FrameMetrics(last,{duration,heap:performance.memory?.usedJSHeapSize??null});measurement.gameTime=game.time;$('performance-result').dataset.measurement='';$('performance-result').textContent=`Measuring ${duration} seconds of visible gameplay…`;}
$('measure-performance').onclick=()=>beginMeasurement();
document.addEventListener('visibilitychange',()=>{if(document.hidden&&measurement){measurement=null;$('performance-result').textContent='Sample cancelled: keep the game visible.';}});
const menuGamepad=new MenuGamepad({active:()=>screen!=='play'&&!criticalPending&&!powerUpgrades.busy,back:()=>backToPause()});
function frame(now){
  if(screen==='play'&&!online()&&activeId&&multiplayerMenu.isLinked(activeId)){showPause();say('This hero was transferred to account saving. Open Solo & Multiplayer to reconnect.',8);}
  if (input.interrupted || document.hidden) {
    accumulator=0;last=now;requestAnimationFrame(frame);return;
  }
  if(game.started&&!online()&&expireLoot(game)){
    backgroundSignature='';
    if(screen==='inventory'&&journeyMenu.groundReward&&!game.loot.some(o=>o.id===journeyMenu.groundReward)){journeyMenu.groundReward=null;journeyMenu.inventory();}
  }
  const menuScreen=screen;menuGamepad.poll(now);
  if(menuScreen!==screen){input.waitForNeutralPad=true;input.clear();}
  if(menuGamepad.consumePause)input.waitForNeutralPad=true;
  input.pollGamepad();
  const wallElapsed=Math.max(0,(now-last)/1000),elapsed=Math.min(.1,wallElapsed);last=now;if(wallElapsed>0)fps=fps*.95+.05/wallElapsed;
  if(game.started&&!game.arenaScene&&game.hero.x>5600)renderer.bossArt.prepare(game.regionId);
  const waitingForArt=!styleCTextureStatus().ready||(game.arenaScene&&!renderer.bossArt.ready);
  const simulationStart=performance.now();
  if(screen==='play'&&!waitingForArt&&!criticalPending){
    accumulator+=elapsed;while(accumulator>=(online()?STEP*2:STEP)){
      const action = phase10QA?.sample() || input.sample();
      const empty = action.powers?.findIndex((pressed,i) => pressed && i<3 && !game.powers.data.equipped[i]) ?? -1;
      if (empty!==-1 && game.canSave()) {openPowerPicker(empty);accumulator=0;break;}
      if(online()){if(!multiplayerMenu.session.client.ready){accumulator=0;break;}multiplayerMenu.session.input(action);}else game.step(STEP,action);accumulator-=online()?STEP*2:STEP;
    }
    handleEvents();if(!criticalPending&&screen==='play'&&game.inventory.pending.length&&game.canSave()){setScreen('inventory');journeyMenu.inventory();}
  }else accumulator=0;
  const simulationCost=performance.now()-simulationStart;
  audio.update(musicScene(game),game.started&&!['roster','delete','account'].includes(screen)&&!document.hidden&&!criticalPending);
  const drawStart=performance.now(),signature=`${screen}:${renderer.canvas.width}:${renderer.canvas.height}:${game.regionId}:${game.clock().night}`;if(!game.treeVisit&&(screen==='play'||signature!==backgroundSignature)){const alpha=online()?multiplayerMenu.session.alpha():screen==='play'?accumulator/STEP:1;renderer.draw(game,alpha,elapsed);if(online())multiplayerMenu.session.drawPeers(renderer,alpha);}backgroundSignature=signature;
  const cost=performance.now()-drawStart;drawMs=drawMs*.95+cost*.05;
  if(measurement&&(screen!=='play'||waitingForArt)){measurement=null;$('performance-result').textContent='Sample cancelled: keep gameplay active.';}
  const hudStart=performance.now();qaClock+=elapsed;if(qaClock>=.1){updateHud();if(screen==='tree')erisMenu.update();qaClock=0;}
  const hudCost=performance.now()-hudStart;
  if(measurement&&measurement.record(now,{interval:wallElapsed*1000,simulation:simulationCost,draw:cost,hud:hudCost})){const result=measurement.finish(now,{simulationSeconds:game.time-measurement.gameTime,region:game.regionId,width:innerWidth,height:innerHeight,heapEndBytes:performance.memory?.usedJSHeapSize??null,userAgent:navigator.userAgent,monsters:game.enemies.length,scene:game.arenaScene?.legendary|| (game.arenaScene?'regional':'world')});$('performance-result').textContent=performanceLabel(result);$('performance-result').dataset.measurement=JSON.stringify(result);measurement=null;}
  if(screen==='creator')creator.draw(now);
  if(toastUntil&&now>toastUntil){$('toast').classList.remove('visible');toastUntil=0;}
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// The code-save game is opt-in and isolated from ordinary browser hero slots.
// Send exact in-memory progress every eight seconds; the parent owns cloud writes.
function sendCodeProgress(force=false){
 if(!codePlay||!game.started||(!force&&screen!=='play')||criticalPending||powerUpgrades.busy||online())return;
 try{const selected=Number(activeSlot);if(!Number.isInteger(selected)||selected<0||selected>2)return;const snapshot=game.save();if(!snapshot)return;const parsed=JSON.parse(snapshot);console.info('[V3 live hero]',{slot:selected+1,x:game.hero.x,y:game.hero.y,savedX:parsed.world?.location?.x,savedY:parsed.world?.location?.y,xp:game.hero.xp,coins:game.hero.coins});window.parent.postMessage({type:'royale-code-progress',slot:selected,snapshot,heroId:activeId},location.origin);}catch{}
}
if(codePlay)setInterval(sendCodeProgress,8000);

function pausePanel(panel){
 $('pause-primary').hidden=panel!=='home';$('pause-hero').hidden=panel!=='hero';$('pause-powers').hidden=panel!=='powers';$('pause-back').hidden=panel==='home';
 if(panel==='hero'){drawEquipmentPreview($('pause-hero-preview'),game);const h=game.hero;$('pause-hero-stats').textContent=`${game.look.name} · Level ${h.level} · HP ${Math.ceil(h.hp)}/${h.maxHp} · XP ${h.xp}/${xpForLevel(h.level)} · Strength ${10+2*(h.level-1)} · ${game.getRegion().name}`;}
 updateMenuExitActions('pause');
}
$('open-my-hero').onclick=()=>pausePanel('hero');$('open-loadout').onclick=()=>openTree('powers');$('pause-back').onclick=()=>pausePanel('home');

const brightness=$('display-brightness');brightness.value=storage.getItem('healthia.royale.brightness')||100;const setBrightness=()=>{$('game').style.filter=`brightness(${Number(brightness.value)/100})`;try{storage.setItem('healthia.royale.brightness',brightness.value);}catch{}};brightness.oninput=setBrightness;setBrightness();
