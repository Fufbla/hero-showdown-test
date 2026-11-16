import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,decodeSave,STEP} from '../core.mjs';
import {ACTIVE_SLOTS,POWER_IDS,POWERS,normalizePowers,resolveAbilitySlots} from '../powers.mjs';
import {normalizeControls} from '../controls.mjs';
import {Input} from '../input.mjs';
import {KEYSETS,samplePad,LocalInput} from '../local-coop/input.mjs';
import {powerSlots} from '../local-coop/power-hud.mjs';
import {LocalSession,captureProgress} from '../local-coop/session.mjs';
import {inputPacket} from '../multiplayer/protocol.mjs';
import {hudEquipError} from '../power-upgrades.mjs';
import {guardPowerSave,migratePowerSnapshot} from './backend-v3/deploy/power-policy.mjs';
import {preparePowerReset} from './backend-v3/deploy/power-reset.mjs';
import {updatePowerProgress} from '../compact-hud.mjs';

const ids=['strength','fireball','roots','steel'];
function game(){
 const g=new Game();g.hero.level=30;g.hero.coins=2000;g.enemies=[];g.started=true;
 g.powers.data=normalizePowers({levels:Object.fromEntries(POWER_IDS.map(id=>[id,1])),equipped:ids},30);
 return g;
}
function input(){return Object.assign(Object.create(Input.prototype),{enabled:true,controls:normalizeControls(),keys:new Set(),pointers:new Map(),padHeld:new Set(),edges:new Set(),tapCounts:new Map(),axis:0,vertical:0,padX:0,padY:0});}

test('new heroes have four empty regular slots; Flight stays passive with ten-second recovery',()=>{
 const g=new Game();assert.equal(ACTIVE_SLOTS,4);assert.deepEqual(g.powers.data.equipped,[null,null,null,null]);
 assert.equal(resolveAbilitySlots(g.powers.data).length,4);assert.equal(powerSlots(g).length,4);
 assert.equal(POWERS.flight.passive,true);assert.equal(POWERS.flight.cooldown,10);
});
test('legacy three-slot saves gain an empty fourth slot without losing any saved progression',()=>{
 const before=captureProgress(game());before.powers.equipped=ids.slice(0,3);const original=structuredClone(before);
 const loaded=new Game({save:decodeSave(JSON.stringify(before))}),after=captureProgress(loaded);
 assert.deepEqual(after.powers.equipped,[...ids.slice(0,3),null]);
 for(const field of ['look','cosmetics','coins','level','xp','inventory','economy','legendary'])assert.deepEqual(after[field],before[field],field);
 assert.deepEqual(after.powers.levels,before.powers.levels);assert.deepEqual(before,original);
});
test('fourth slot can equip, swap and clear; passives and a fifth regular slot are rejected',()=>{
 const g=game();g.paused=true;assert.equal(hudEquipError(g,3,'superKick'),'');
 assert(g.equipPower(3,'superKick'));assert.equal(g.powers.data.equipped[3],'superKick');
 assert(g.equipPower(3,'strength'));assert.deepEqual(g.powers.data.equipped,['superKick','fireball','roots','strength']);
 assert(g.equipPower(3,null));assert.equal(g.powers.data.equipped[3],null);
 assert.equal(g.equipPower(3,'flight'),false);assert.equal(g.equipPower(3,'speed'),false);assert.equal(g.equipPower(4,'steel'),false);
 g.powers.cooldowns.steel=5;assert.match(hudEquipError(g,3,'steel'),/ready/);
});
test('slot four casts its own power even with Villain Merge active; Merge moves to slot five',()=>{
 const g=game();g.legendary.active='styro';
 assert(g.powers.activateSlot(3));assert(g.powers.active.steel);assert.equal(g.mergeEffects.length,0);
 assert(g.powers.activateSlot(4));assert(g.mergeEffects.some(e=>e.id==='styro'));
 const slots=powerSlots(g);assert.equal(slots.length,5);assert.equal(slots[3].id,'steel');assert.equal(slots[4].id,'styro');assert.equal(slots[4].merge,true);
 assert.equal(resolveAbilitySlots(g.powers.data,{completePieces:2,ability:'merge:styro',level:1}).length,5);
});
test('solo cooldown rendering treats slot four as ordinary and slot five as Merge',()=>{
 const g=game();g.legendary.active='styro';g.powers.cooldowns.steel=7.5;g.mergeCooldowns.styro=2;
 const button=()=>({style:{setProperty(k,v){this[k]=v;}},dataset:{},classList:{contains:()=>false},getAttribute:()=>''});
 const fourth=button(),merge=button();updatePowerProgress(fourth,3,g);updatePowerProgress(merge,4,g);
 assert.equal(fourth.style['--cooldown-remaining'],.5);assert.equal(merge.style['--cooldown-remaining'],2/g.mergeAbility().cooldown);
});
test('keyboard, touch and controller route slot four independently from Merge',()=>{
 const controls=normalizeControls();assert.deepEqual(controls.keys.power3,['Digit4']);assert.deepEqual(controls.keys.power4,['Digit5']);assert.equal(controls.pad.power3,6);assert.equal(controls.pad.power4,8);assert.equal(controls.pad.run,-1);
 for(const source of ['keyboard','touch','pad']){
  const i=input();if(source==='touch')i.tapCounts.set('power3',1);else i.edges.add('power3');
  const action=inputPacket(i.sample());assert.deepEqual(action.powers,[false,false,false,true,false]);
  const g=game();g.step(STEP,action);assert(g.powers.active.steel,source);
 }
 const pad={connected:true,axes:[1,0],buttons:Array.from({length:17},()=>({pressed:false}))};pad.buttons[6].pressed=true;
 const sampled=samplePad(pad),local=Object.assign(Object.create(LocalInput.prototype),{enabled:true,sources:['pad:0','pad:1'],pad:[sampled,{}],keys:new Set(),pointers:new Map(),edges:[sampled.edges,new Set()]});
 assert.deepEqual(local.sample(0).powers,[false,false,false,true,false]);assert.equal(local.sample(1).powers[3],false);
 pad.buttons[6].pressed=false;pad.buttons[8].pressed=true;assert(samplePad(pad).edges.has('power4'));
 assert.equal(new Set(KEYSETS.flatMap(keys=>Object.values(keys))).size,KEYSETS.flatMap(keys=>Object.values(keys)).length);
});
test('saved controls migrate once and preserve custom Merge and other action bindings',()=>{
 const old={version:2,keys:{power3:['KeyM'],jump:['KeyB']},pad:{run:11,power3:8,heal:6}};
 const original=structuredClone(old),next=normalizeControls(old);
 assert.equal(next.version,3);assert.deepEqual(next.keys.power4,['KeyM']);assert.deepEqual(next.keys.jump,['KeyB']);assert.equal(next.pad.power3,11);assert.equal(next.pad.power4,8);assert.equal(next.pad.heal,6);assert.equal(next.pad.run,-1);
 assert.deepEqual(normalizeControls(next),next);assert.deepEqual(old,original);
});
test('cloud policy preserves all four powers and fences old three-slot clients after slot four is equipped',()=>{
 const before=captureProgress(game()),after=guardPowerSave(before,before);assert.deepEqual(after.powers.equipped,ids);
 assert.deepEqual(migratePowerSnapshot(before).powers.equipped,ids);
 const stale=structuredClone(before);stale.powers.equipped=stale.powers.equipped.slice(0,3);assert.throws(()=>guardPowerSave(before,stale),/Reload/);
 const legacy=structuredClone(stale);assert.deepEqual(guardPowerSave(legacy,legacy).powers.equipped,[...ids.slice(0,3),null]);
 const cleared=structuredClone(before);cleared.powers.equipped[3]=null;assert.equal(guardPowerSave(before,cleared).powers.equipped[3],null);
 const reset=preparePowerReset(before);assert.deepEqual(reset.snapshot.powers.equipped,[null,null,null,null]);assert.equal(reset.points,29);
});
for(const player of [0,1])test('co-op player '+(player+1)+' can cast and persist slot four independently',async()=>{
 const saves=[[],[]],profiles=[0,1].map(i=>({identity:'four-slots-'+i,slots:[{slot_number:1,snapshot:captureProgress(game())}],async save(_slot,snapshot){saves[i].push(snapshot);}}));
 const session=new LocalSession(profiles.map(profile=>({profile,slot:1})));session.paused=false;session.games.forEach(g=>{g.paused=false;g.enemies=[];});
 const actions=[{},{}];actions[player]={powers:[false,false,false,true,false]};session.step(actions);
 assert(session.games[player].powers.active.steel);assert(!session.games[1-player].powers.active.steel);
 await session.saveAll('four-slots');
 for(const snapshots of saves){assert(snapshots.length);const loaded=new Game({save:decodeSave(JSON.stringify(snapshots.at(-1)))});assert.deepEqual(loaded.powers.data.equipped,ids);}
});
