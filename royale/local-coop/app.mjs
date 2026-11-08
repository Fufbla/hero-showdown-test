import {CloudProfile} from './cloud.mjs';
import {LocalSession,AUTOSAVE_MS} from './session.mjs';
import {LocalInput,samplePad} from './input.mjs';
import {Game,STEP,decodeSave,xpForLevel} from '../core.mjs';
import {Renderer,drawHero} from '../renderer.mjs';
import {CapeCloth} from '../cape.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {bindStyleCGame} from '../style-c-live.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {drawPowerWorld,drawPowerHero} from '../power-art.mjs';
import {drawMergeWorld} from '../legendary-art.mjs';
import {WORLD_REGIONS} from '../world.mjs';
import {POWERS} from '../powers.mjs';
import {itemDefinition} from '../equipment.mjs';
import {STAT_KEYS,STAT_LABELS,formatStat} from '../costume-catalog.mjs';
import {LEGENDARY,MERGE_POWERS} from '../legendary-data.mjs';
import {BOSSES} from '../boss-data.mjs';
import {nearbyInteractions} from '../world-loot.mjs';
import {GameAudio,musicScene} from '../audio.mjs';

const $=id=>document.getElementById(id),qa=new URLSearchParams(location.search).get('qa')==='1';
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const button=(label,action,disabled=false)=>{const b=el('button',label);b.type='button';b.disabled=disabled;b.onclick=action;return b;};
const statText=stats=>STAT_KEYS.filter(k=>stats?.[k]).map(k=>`${STAT_LABELS[k]} +${formatStat(k,stats[k])}`).join(' · ');
const cloudConfig=await fetch(new URL('./config.json',import.meta.url),{cache:'no-store'}).then(r=>r.json());
const players=[0,1].map(()=>({profile:null,slot:null,ready:false,tab:'stats',focus:0,previous:new Set(),repeat:0,statusText:'',leaving:false}));
let session=null,renderer=null,visual=null,cloth=new CapeCloth(),timer=null,artReady=false,last=performance.now(),accumulator=0,hudTime=0,lastDraw=0,lastControllers=0,padSignature='',frameCap=60;
let testPads=null,measurement=null;const autosaveTimes=[];
const metrics=[];
const getPads=()=>testPads||navigator.getGamepads?.()||[];
const input=new LocalInput({getPads,onMenu:i=>{if(session?.active.has(i)){if(!session.paused)openMenu();else{session.ready[i]=false;renderPanel(i);}}},onDisconnect:i=>{if(session?.active.has(i)){openMenu();panelNote(i,'Controller disconnected. Reconnect it; this assignment stays with you.');}}});
const audio=new GameAudio({getItem:()=>null,setItem:()=>{}});
function note(message){($('setup').hidden?$('session-status'):$('setup-status')).textContent=message;}
function profileStatus(i,message){players[i].status.textContent=message;const status=$('save-'+i);if(status)status.textContent=message;}
function panelNote(i,message){players[i].statusText=message;const n=$('panel-'+i).querySelector('.menu-status');if(n)n.textContent=message;}
function controllersValid(){const pads=getPads(),sources=players.map(p=>p.control.value);return sources.every(s=>/^pad:\d+$/.test(s)&&pads[+s.slice(4)]?.connected)&&sources[0]!==sources[1];}
function updateStart(){
 const duplicate=players.every(p=>p.profile)&&players[0].profile.identity===players[1].profile.identity;
 $('start').disabled=!artReady||!controllersValid()||players.some(p=>!p.profile||!p.slot||!p.ready||p.busy)||duplicate;
 players.forEach((p,i)=>{p.readyButton.disabled=!p.profile||!p.slot||!getPads()[+p.control.value.slice(4)]?.connected||duplicate;p.readyButton.textContent=p.ready?'Ready ✓':'Ready';p.readyButton.setAttribute('aria-pressed',String(p.ready));});
 if(duplicate)note('Each player needs their own 10-digit account code.');
}
function configureInput(){
 const sources=players.map(p=>p.control.value||'keyboard');
 if(sources[0]===sources[1]&&sources[0].startsWith('pad:'))return;
 if(sources.join('|')!==input.sources.join('|'))input.configure(sources);
}
function renderChoices(i){
 const p=players[i];p.choices.replaceChildren();
 for(const row of p.profile.slots){
  const snap=row.snapshot,choice=button(snap?'':`Slot ${row.slot_number} · Empty`,()=>{p.slot=row.slot_number;p.ready=false;renderChoices(i);updateStart();},!snap);
  choice.className='hero-choice';choice.setAttribute('aria-pressed',String(p.slot===row.slot_number));
  if(snap){const canvas=el('canvas');canvas.width=240;canvas.height=180;choice.append(canvas);const g=new Game({save:decodeSave(JSON.stringify(snap))});drawHero(canvas.getContext('2d'),120,170,g.look,g.hero,0,1.45,{outfit:g.visualOutfit()});choice.append(el('span',snap.look.name),el('small',`Slot ${row.slot_number} · Level ${snap.level}`));}p.choices.append(choice);
 }
}
for(let i=0;i<2;i++){
 const p=players[i],card=el('article');card.className='player-card';
 card.innerHTML=`<h2>Player ${i+1}</h2><form class="login"><input id="code-${i}" type="password" inputmode="numeric" autocomplete="off" maxlength="10" placeholder="Your 10-digit code" aria-label="Player ${i+1} ten-digit code" required pattern="[0-9]{10}"><button type="submit">Load Heroes</button></form><p class="profile-status" role="status">Your account stays separate.</p><div class="hero-choices"></div><label for="control-${i}">Assign your controller</label><select id="control-${i}" aria-label="Player ${i+1} controller"><option value="">Connect a controller and press a button</option></select><button class="ready-button" aria-pressed="false" disabled>Ready</button>`;
 $('players').append(card);Object.assign(p,{card,status:card.querySelector('.profile-status'),choices:card.querySelector('.hero-choices'),control:$('control-'+i),readyButton:card.querySelector('.ready-button')});
 p.control.onchange=()=>{p.ready=false;configureInput();updateStart();};p.readyButton.onclick=()=>{p.ready=!p.ready;updateStart();};
 card.querySelector('form').onsubmit=async e=>{
  e.preventDefault();if(p.busy)return;p.busy=true;p.ready=false;updateStart();const submit=e.target.querySelector('button');submit.disabled=true;
  try{
   const profile=new CloudProfile({endpoint:cloudConfig.endpoint,onStatus:message=>profileStatus(i,message)});await profile.login($('code-'+i).value.trim());$('code-'+i).value='';
   for(const row of profile.slots.filter(r=>r.snapshot)){await profile.prepare(row.slot_number);if(!decodeSave(JSON.stringify(row.snapshot)))throw Error('This hero needs recovery in the solo game.');}
   p.profile?.forget();p.profile=profile;p.slot=profile.slots.find(r=>r.snapshot)?.slot_number||null;profileStatus(i,p.slot?'Signed in · choose a hero.':'Create and save a hero in solo play first.');renderChoices(i);
  }catch(e){profileStatus(i,e.message);}finally{p.busy=false;submit.disabled=false;updateStart();}
 };
}
function refreshControllers(now){
 if(now-lastControllers<500)return;lastControllers=now;
 const pads=[...getPads()].filter(p=>p?.connected&&p.mapping==='standard'),signature=pads.map(p=>p.index+':'+p.id).join('|');
 if(signature===padSignature)return;padSignature=signature;
 for(let i=0;i<2;i++){
  const p=players[i],old=p.control.value;p.control.querySelectorAll('option[data-pad]').forEach(o=>o.remove());
  for(const pad of pads){const o=el('option',`${qa?'Simulated c':'C'}ontroller ${pad.index+1} · ${pad.id.slice(0,38)}`);o.value='pad:'+pad.index;o.dataset.pad='';p.control.append(o);}
  if(old&&pads.some(p=>'pad:'+p.index===old))p.control.value=old;
  else if(!session){p.control.value=pads[i]?'pad:'+pads[i].index:'';p.ready=false;}
 }
 if(!session){configureInput();updateStart();}
}
function initHUD(){for(let i=0;i<2;i++){$('hud-'+i).hidden=false;$('hud-'+i).innerHTML=`<strong id="name-${i}"></strong><small id="stats-${i}"></small><div class="health"><span id="hp-${i}"></span></div><small id="xp-${i}"></small><div class="power-status" id="powers-${i}"></div><small class="save-status" id="save-${i}">Autosave every 8 seconds</small>`;}}
async function start(){
 if($('start').disabled)return;$('start').disabled=true;
 try{
  if(!controllersValid())throw Error('Assign two different connected controllers.');input.configure(players.map(p=>p.control.value));
  if(!qa)for(const p of players){await p.profile.load();await p.profile.prepare(p.slot);}
  session=new LocalSession(players);$('setup').hidden=true;$('play').hidden=false;renderer?.destroy();renderer=new Renderer($('world'));visual=Object.create(session.games[0]);bindStyleCGame(renderer.cloth,session.games[0]);bindStyleCGame(cloth,session.games[1]);initHUD();
  const Context=window.AudioContext||window.webkitAudioContext;if(Context)void audio.enable(Context).catch(()=>{});
  session.setPaused(false);input.clear();input.enabled=true;last=performance.now();accumulator=0;lastDraw=0;
  timer=setInterval(()=>{if(qa)autosaveTimes.push(performance.now());void saveAll();},AUTOSAVE_MS);updateHUD();note(qa?'Practice · simulated controllers':'Local co-op · autosave on');
 }catch(e){session=null;$('setup').hidden=false;$('play').hidden=true;note(e.message);updateStart();}
}
$('start').onclick=start;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;$('toast').dataset.until=String(performance.now()+4500);}
async function saveOne(i){
 const active=session;if(!active?.active.has(i))return {ok:true};
 const result=await active.saveOne(i);if(session!==active)return result;
 const label=$('save-'+i);label.textContent=result.ok?(qa?'Practice checkpoint':`Saved ${new Date().toLocaleTimeString()}`):'Save pending · retrying';label.dataset.error=String(!result.ok);
 if(!result.ok){panelNote(i,result.error);if(result.conflict){openMenu();panelNote(i,result.error);}}return result;
}
function saveAll(){return Promise.all([...session?.active||[]].map(saveOne));}
function openMenu(){
 if(!session)return;
 if(!session.paused)session.pause();input.enabled=false;input.clear();accumulator=0;
 if(!$('menu').open)$('menu').showModal();renderPanels();audio.update('',false);
}
function markReady(i){
 if(players[i].leaving)return;
 if(players[i].profile.blocked?.has(players[i].slot)){panelNote(i,'A newer cloud save exists. Reload before continuing. Your checkpoint is retained.');return;}
 const source=input.sources[i],pad=getPads()[+source.slice(4)];if(!pad?.connected){panelNote(i,'Reconnect your assigned controller before selecting Ready.');return;}
 const resumed=session.markReady(i,!session.ready[i]);renderPanels();
 if(resumed){$('menu').close();input.clear();input.enabled=true;last=performance.now();accumulator=0;}
}
async function leave(i){
 if(players[i].leaving)return;players[i].leaving=true;renderPanel(i);
 const result=await session.leave(i);players[i].leaving=false;
 if(!result.ok){panelNote(i,'Final save is pending. Retry Leave when connected. '+result.error);renderPanel(i);return;}
 players[i].profile.forget?.();$('hud-'+i).hidden=true;$('panel-'+i).hidden=true;
 if(!session.active.size){clearInterval(timer);session=null;input.enabled=false;input.clear();$('menu').close();$('play').hidden=true;$('setup').hidden=false;players.forEach((p,i)=>{p.profile=null;p.slot=null;p.ready=false;p.choices.replaceChildren();profileStatus(i,'Signed out. Enter your code to play again.');});updateStart();note('Both heroes saved.');return;}
 if(session.leaving.size){renderPanels();return;}
 $('menu').close();input.clear();input.enabled=true;last=performance.now();accumulator=0;renderer.scene=null;visual=Object.create(session.games[session.leader]);bindStyleCGame(renderer.cloth,session.games[session.leader]);note(`Player ${session.leader+1} continues solo · autosave on`);
}
$('pause').onclick=openMenu;$('menu').addEventListener('cancel',e=>{e.preventDefault();});
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('play').requestFullscreen();}catch{note('Full screen is unavailable in this browser.');}};
$('frame-rate').onchange=()=>{frameCap=+$('frame-rate').value;};
async function act(i,method,args=[]){
 if(!session.active.has(i)||session.ready[i]||players[i].leaving)return false;
 try{const result=session.command(i,method,args);if(result===false||result?.ok===false){panelNote(i,result?.error||'Check this action’s requirements and leave combat first.');return false;}
  renderPanel(i);updateHUD();void saveOne(i);return true;
 }catch(e){panelNote(i,e.message);return false;}
}
function renderPanels(){$('pause-panels').classList.toggle('solo',session.active.size===1);$('menu').querySelector('.pause-header p').textContent=session.active.size===2?'Each controller operates its own menu. Both players select Ready to resume.':'Your hero continues solo. Select Ready to resume.';for(let i=0;i<2;i++)renderPanel(i);}
function renderPanel(i){
 const root=$('panel-'+i),p=players[i],g=session.games[i];root.hidden=!session.active.has(i);if(root.hidden)return;root.replaceChildren();
 root.append(el('h3',`PLAYER ${i+1} · ${g.look.name}`),el('p',`LV ${g.hero.level} · ${g.hero.coins} coins · ${g.powers.data.points} Power Points`));
 if(session.ready[i]){const message=el('p',`PLAYER ${i+1} READY — WAITING FOR PLAYER ${i===0?2:1}`);message.className='ready-message';root.append(message);}
 else{
  const nav=el('nav');nav.className='menu-tabs';
  for(const [id,label] of [['stats','Hero Stats'],['powers','Superpowers'],['gear','Equipment'],['travel','World'],['merge','Villain Merge']]){const b=button(label,()=>{p.tab=id;p.focus=0;renderPanel(i);});b.setAttribute('aria-pressed',String(p.tab===id));nav.append(b);}root.append(nav);
  const content=el('div');content.className='menu-section';root.append(content);
  const row=(label,...controls)=>{const r=el('div');r.className='item-row';r.append(el('span',label),...controls);content.append(r);};
  if(p.tab==='stats'){
   const stats=el('p',`Health ${Math.ceil(g.hero.hp)} / ${g.hero.maxHp}\nXP ${g.hero.xp} / ${xpForLevel(g.hero.level)}\nHealth Roots ${g.healthRoots} / 10\nEquipment ${g.inventory.items.length} / 20\n${g.getRegion().name}`);stats.className='stats';stats.style.whiteSpace='pre-line';content.append(stats);
   content.append(el('p',`Natural strength ${10+2*(g.hero.level-1)} · Running speed +${formatStat('moveSpeed',g.powers.speed)} · Attack speed +${formatStat('attackSpeed',g.powers.attackRate-1)}`),el('p','Equipment bonuses: '+(statText(g.equipment)||'None')));
   content.append(button('Save My Hero',()=>void saveOne(i)),button('Use Health Root',()=>act(i,'useHealthRoot'),!g.healthRoots||g.hero.dead));
   content.append(el('p','Autosave every 8 seconds. If your controller disconnects, reconnect the same controller. Your assignment is retained.'));
  }
  if(p.tab==='powers'){
   content.append(button(g.treeVisit?'At Tree of Eris':'Visit Tree of Eris',()=>act(i,'visitTree'),!g.canTravel()));
   if(!g.canSave())content.append(el('p','Resume and spend five seconds out of combat before changing powers.'));
   for(const [id,def] of Object.entries(POWERS))row(`${def.name} · Lv ${g.powers.data.levels[id]}/20`,button('+1',()=>act(i,'upgradePower',[id,1]),!g.nearTree()||!g.canSave()||!g.powers.data.points||g.powers.data.levels[id]>=20));
   for(let slot=0;slot<3;slot++){const select=el('select');select.setAttribute('aria-label',`Player ${i+1} power ${slot+1}`);select.append(new Option('Empty',''));for(const [id,def] of Object.entries(POWERS))if(!def.passive&&g.powers.data.levels[id])select.append(new Option(def.name,id));select.value=g.powers.data.equipped[slot]||'';select.disabled=!g.canSave();select.onchange=()=>act(i,'equipPower',[slot,select.value||null]);row(`Equipped power ${slot+1}`,select);}
   if(g.treeVisit)content.append(button('Buy Health Root · 50 coins',()=>act(i,'buyHealthRoot'),!g.canSave()));
  }
  if(p.tab==='gear'){
   content.append(el('p',`${g.inventory.items.length}/20 equipment. Sales use your own coin balance.`));
   for(const item of g.inventory.items){const def=itemDefinition(item),worn=Object.values(g.inventory.equipped).includes(item.uid),sale=g.salePreview(item.uid);row(`${def?.name||item.catalogId}${worn?' · equipped':''} · LV ${def?.level||1} · ${def?.rarity||''}\n${statText(def?.stats)}`,button(worn?'Unequip':'Equip',()=>act(i,'equipItem',[item.uid]),!g.canSave()),button(`Sell · ${sale.value||0} coins`,()=>act(i,'sellItem',[item.uid,{confirmed:true,revision:g.economy.revision}]),!sale.ok||worn));}
   for(const hit of nearbyInteractions(g).filter(x=>x.kind==='loot'))row(hit.label,button('Pick up my copy',()=>act(i,'pickupLoot',[hit.id]),hit.loot.kind==='equipment'&&g.inventory.items.length>=20));
   if(g.inventory.pending.length){
    const reward=g.inventory.pending[0];content.append(el('p',`${g.inventory.pending.length} boss rewards waiting. Next: ${itemDefinition(reward)?.name||reward.catalogId}.`),button('Keep next reward',()=>act(i,'acceptReward'),g.inventory.items.length>=20||!g.canSave()));
    const choose=el('select');choose.setAttribute('aria-label',`Player ${i+1} reward replacement`);choose.append(new Option('Discard the new reward',''));
    for(const item of g.inventory.items)choose.append(new Option('Replace '+(itemDefinition(item)?.name||item.catalogId),item.uid));
    content.append(choose,button('Review reward choice',()=>{p.rewardChoice={uid:choose.value||null,reward:reward.uid,revision:g.economy.revision};renderPanel(i);},!g.canSave()));
    if(p.rewardChoice){const choice=p.rewardChoice;content.append(el('p',choice.uid?'Replace the selected carried item? The old item will be permanently discarded.':'Discard this new boss reward? It cannot be recovered.'),button('Confirm reward choice',()=>{p.rewardChoice=null;if(choice.revision!==g.economy.revision||choice.reward!==g.inventory.pending[0]?.uid){renderPanel(i);panelNote(i,'Equipment changed. Review your choice again.');return;}void act(i,'resolveReward',[choice.uid,true]);},!g.canSave()),button('Keep my equipment',()=>{p.rewardChoice=null;renderPanel(i);}));}
   }
   content.append(button('Collect Boss Chest',()=>act(i,'claimChest'),!g.availableChest()||!g.canSave()));
  }
  if(p.tab==='travel'){
   content.append(el('p','Travel moves the shared world for both heroes. Both must be out of combat.'));
   content.append(button('Return to checkpoint',()=>act(i,'returnCheckpoint'),!g.canTravel()),button(g.treeVisit?'At Tree of Eris':'Visit Tree of Eris',()=>act(i,'visitTree'),!g.canTravel()));
   for(const region of WORLD_REGIONS){const b=button(`${region.name} · LV ${region.levels.join('–')}`,()=>act(i,'travel',[region.id]),!g.canTravel());b.className='region-button';content.append(b);}
  }
  if(p.tab==='merge'){
   const id=g.pendingMergeReward();
   if(id){const record=g.legendary.defeated[id],keep=new Set(record.pieces.map(p=>p.uid)),discard=new Set();content.append(el('p','Select new pieces to keep and carried equipment to discard. Unselected new pieces are destroyed when confirmed.'));
    for(const [items,set,verb,checked] of [[record.pieces,keep,'Keep',true],[g.inventory.items,discard,'Discard',false]])for(const item of items){const label=el('label'),check=el('input');check.type='checkbox';check.checked=checked;check.onchange=()=>{check.checked?set.add(item.uid):set.delete(item.uid);};label.append(check,document.createTextNode(`${verb} ${itemDefinition(item)?.name||item.catalogId}`));content.append(label,el('br'));}
    content.append(button('Confirm equipment choices',()=>{if(g.inventory.items.length-discard.size+keep.size>20){panelNote(i,'Choose enough equipment to discard to stay within 20 slots.');return;}void act(i,'claimMergeReward',[id,[...keep],[...discard],{confirmed:true,revision:g.legendary.revision}]);},!g.canSave()));
   }
   for(const [id,def] of Object.entries(LEGENDARY))content.append(button(def.name,()=>act(i,'enterLegendary',[id]),g.hero.level!==99||!g.canTravel()));
   for(const [id,record] of Object.entries(g.legendary.defeated))if(record.claimed)content.append(button('Activate '+LEGENDARY[id].name,()=>act(i,'activateMergeSet',[id]),!g.treeVisit||!g.canSave()));
  }
 }
 const status=el('p',p.statusText);status.className='menu-status';status.setAttribute('role','status');root.append(status);
 const footer=el('footer');footer.className='menu-actions';footer.append(button(session.ready[i]?'Cancel Ready':'Ready / Resume',()=>markReady(i),p.leaving),button(p.leaving?'Saving…':'Leave Local Co-op',()=>void leave(i),p.leaving));root.append(footer);highlight(root,p);
}
function highlight(root,p){const controls=[...root.querySelectorAll('button,select,input')].filter(n=>!n.disabled&&n.getClientRects().length);p.focus=Math.max(0,Math.min(p.focus,controls.length-1));root.querySelectorAll('.controller-focus').forEach(n=>n.classList.remove('controller-focus'));controls[p.focus]?.classList.add('controller-focus');return controls;}
function navigateController(i,now){
 const source=input.sources[i];if(!source?.startsWith('pad:'))return;
 const p=players[i],pad=getPads()[+source.slice(4)];if(!pad?.connected)return;
 const state=samplePad(pad,p.previous);p.previous=state.held;
 const root=session?$('panel-'+i):p.card;if(session&&(!session.paused||!session.active.has(i)))return;
 const controls=highlight(root,p),active=controls[p.focus];
 if(state.edges.has('jump')){
  if(active?.type==='checkbox'){active.checked=!active.checked;active.dispatchEvent(new Event('change'));}
  else if(active?.tagName==='INPUT')active.focus();else if(active?.tagName!=='SELECT')active?.click();return;
 }
 const dy=state.y||Number(state.held.has('down'))-Number(pad.buttons[12]?.pressed),dx=state.x||Number(state.held.has('right'))-Number(state.held.has('left'));
 if(!dy&&!dx){p.repeat=0;return;}if(now<p.repeat)return;p.repeat=now+180;
 if(active?.tagName==='SELECT'&&dx){active.selectedIndex=(active.selectedIndex+(dx>0?1:-1)+active.options.length)%active.options.length;active.dispatchEvent(new Event('change'));return;}
 p.focus=(p.focus+(dy>0||dx>0?1:-1)+controls.length)%controls.length;highlight(root,p);controls[p.focus]?.scrollIntoView({block:'nearest'});
}
function updateHUD(){
 if(!session)return;
 for(const i of session.active){const g=session.games[i];$('name-'+i).textContent=`P${i+1} · ${g.look.name}`;$('stats-'+i).textContent=`LV ${g.hero.level} · HP ${Math.ceil(g.hero.hp)}/${g.hero.maxHp} · ${g.hero.coins} coins`;$('hp-'+i).style.width=100*g.hero.hp/g.hero.maxHp+'%';$('xp-'+i).textContent=g.hero.level===99?'MAX LEVEL':`${g.hero.xp}/${xpForLevel(g.hero.level)} XP`;$('powers-'+i).textContent=g.powers.data.equipped.map((id,n)=>id?`${n+1} ${POWERS[id].name}${g.powers.cooldowns[id]>0?' '+Math.ceil(g.powers.cooldowns[id])+'s':''}`:`${n+1} —`).join(' · ')+(g.legendary.active?' · 4 '+(MERGE_POWERS[g.legendary.active]?.name||'Merge'):'');}
 const g=session.games[session.leader],boss=g.arenaScene?.boss;$('boss').hidden=!boss||boss.hp<=0;if(boss)$('boss').textContent=`${boss.legendaryId?LEGENDARY[boss.legendaryId].name:BOSSES[g.regionId].name} · ${Math.ceil(boss.hp)} / ${boss.maxHp}`;
 $('interaction').textContent=[...session.active].map(i=>{const target=nearbyInteractions(session.games[i])[0];return target?`P${i+1}: ${target.label}`:'';}).filter(Boolean).join(' · ')||g.getRegion().name;
 if(+$('toast').dataset.until<performance.now())$('toast').hidden=true;
}
function drawFollower(g,dt,alpha){
 const c=renderer.c,h=g.hero,pos={x:h.prevX+(h.x-h.prevX)*alpha,y:h.prevY+(h.y-h.prevY)*alpha};c.save();c.setTransform(renderer.dpr*renderer.scale,0,0,renderer.dpr*renderer.scale,0,0);c.translate(-renderer.camera,-renderer.cameraY);drawPowerWorld(c,g);drawMergeWorld(c,g);const pose=drawHero(c,pos.x,pos.y,g.look,h,g.time,1,{outfit:g.visualOutfit(),cloth,dt:session.paused?0:dt});drawPowerHero(c,g,pos,pose);
 if(g.teleportEffectUntil>g.time){const t=(g.teleportEffectUntil-g.time)/.3;c.strokeStyle=`rgba(90,255,150,${t})`;c.lineWidth=4;c.beginPath();c.ellipse(h.x,h.y-h.h/2,25+(1-t)*28,60,0,0,Math.PI*2);c.stroke();}
 c.font='bold 13px system-ui';c.textAlign='center';c.lineWidth=3;c.strokeStyle='#132f29';c.fillStyle='#fff1bb';c.strokeText('P2 · '+g.look.name,pos.x,pos.y-112);c.fillText('P2 · '+g.look.name,pos.x,pos.y-112);c.restore();
}
function events(){
 for(const i of session.active){const g=session.games[i];for(const event of g.drain()){
  renderer.event(event);audio.effect(event.type);
  if(event.type==='tree'){session.command(i,'visitTree');players[i].tab='powers';openMenu();}
  if(['world-portal','chest-preview'].includes(event.type)){players[i].tab=event.type==='chest-preview'?'gear':'travel';openMenu();}
  if(event.message)toast(`P${i+1}: ${event.message}`);
  if(event.type==='level')toast(`P${i+1}: Level ${event.level}!`);
  if(['level','loot-picked','equipment','boss-victory','chest-claimed','legendary-clear-ready'].includes(event.type))void saveOne(i);
 }}
}
function frame(now){
 const wall=Math.max(0,(now-last)/1000),elapsed=Math.min(.1,wall);last=now;const begun=performance.now();input.poll();refreshControllers(now);for(let i=0;i<2;i++)navigateController(i,now);
 if(session&&!document.hidden){
  session.expireLoot();let g=session.games[session.leader],artPending=false;
  for(const enemy of g.enemies)if(enemy.boss||enemy.legendaryHelper)renderer.bossArt.step(enemy,g.time,elapsed,g.hero.x);
  if(g.arenaScene&&!renderer.bossArt.ready)artPending=true;
  const simStart=performance.now();
  if(!session.paused&&!artPending){accumulator+=elapsed;while(accumulator>=STEP&&!session.paused){session.step([input.sample(0),input.sample(1)],{x:renderer.camera,y:renderer.cameraY,width:renderer.width,height:renderer.height});accumulator-=STEP;events();}}else accumulator=0;
  const simMs=performance.now()-simStart;let drawMs=0,drawn=false;
  if(now-lastDraw>=1000/frameCap-1){g=session.games[session.leader];const d=performance.now();if(Object.getPrototypeOf(visual)!==g)Object.setPrototypeOf(visual,g);visual.loot=session.visualLoot();const alpha=session.paused?1:accumulator/STEP;renderer.draw(visual,alpha,Math.min(.1,(now-lastDraw)/1000));if(session.active.size===2)drawFollower(session.games[1],elapsed,alpha);drawMs=performance.now()-d;lastDraw=now;drawn=true;}
  hudTime+=elapsed;if(hudTime>.12){updateHUD();hudTime=0;}audio.update(musicScene(g),!session.paused);
  if(measurement){const sample={intervalMs:wall*1000,simulationMs:simMs,drawMs,cpuMs:performance.now()-begun,drawn,heap:performance.memory?.usedJSHeapSize||null};metrics.push(sample);if(metrics.length>7200)metrics.shift();}
 }
 requestAnimationFrame(frame);
}
window.addEventListener('blur',()=>{if(session)openMenu();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&session){openMenu();void saveAll();}last=performance.now();accumulator=0;});window.addEventListener('beforeunload',e=>{if(session){e.preventDefault();e.returnValue='';}});
requestAnimationFrame(frame);
try{artReady=await prepareStyleCMaterials();if(!artReady)throw Error('Hero artwork did not load. Reload to try again.');}catch(e){note(e.message);}
if(qa){
 const harness=await import('./tests/browser-harness.mjs');
 await harness.install({players,input,getSession:()=>session,getRenderer:()=>renderer,button,el,renderChoices,profileStatus,refreshControllers:()=>{lastControllers=-Infinity;padSignature='';refreshControllers(performance.now());},setPads:p=>testPads=p,updateStart,start,openMenu,act,markReady,leave,saveAll,renderPanels,metrics,autosaveTimes,measure:value=>measurement=value});
}
updateStart();
