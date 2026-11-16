import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,decodeSave,STEP} from '../core.mjs';
import {POWER_IDS,POWERS,normalizePowers,resolveAbilitySlots,powerStats} from '../powers.mjs';
import {Input} from '../input.mjs';
import {normalizeControls} from '../controls.mjs';
import {LocalInput,samplePad} from '../local-coop/input.mjs';
import {LocalSession,captureProgress} from '../local-coop/session.mjs';
import {powerSlots} from '../local-coop/power-hud.mjs';
import {LEGENDARY} from '../legendary-data.mjs';

// Run against the actual production graph, not the legacy source power system.
const now=()=>Date.UTC(2026,10,16,12);
function game(rank=10){
  const g=new Game({now,random:()=>.99});
  Object.assign(g.hero,{level:99,x:1000,prevX:1000,y:600,prevY:600,grounded:true,invulnerable:60});
  g.powers.data=normalizePowers({levels:Object.fromEntries(POWER_IDS.map(id=>[id,id==='flight'?rank:['fireball','steel','animalAllies','roots'].includes(id)?1:0])),equipped:['fireball','steel','animalAllies','roots']},99);
  g.enemies=[];g.started=true;return g;
}
function frames(g,count,input={}){for(let i=0;i<count;i++)g.step(STEP,input);}
function takeoff(g){g.step(STEP,{jump:true});frames(g,4);g.step(STEP,{jump:true});assert.equal(g.powers.flying,false);frames(g,4);g.step(STEP,{jump:true});assert.equal(g.powers.flying,true);}
function input(){return Object.assign(Object.create(Input.prototype),{enabled:true,controls:normalizeControls(),keys:new Set(),pointers:new Map(),padHeld:new Set(),edges:new Set(),tapCounts:new Map(),axis:0,vertical:0,padX:0,padY:0});}

test('Flight frees only its old slot, preserving levels, recovery, points and saved progress',()=>{
  const g=game(),raw=captureProgress(g);raw.powers.equipped=['fireball','flight','steel'];raw.powers.recovery.flight=12;
  const original=structuredClone(raw),decoded=decodeSave(JSON.stringify(raw));assert.ok(decoded);
  assert.deepEqual(raw,original,'reading never mutates the original save');
  assert.deepEqual(decoded.powers.equipped,['fireball',null,'steel',null]);
  assert.deepEqual(decoded.powers.levels,raw.powers.levels);assert.equal(decoded.powers.recovery.flight,12);
  for(const key of ['world','inventory','cosmetics','economy','legendary','level','xp','coins','look'])assert.deepEqual(decoded[key],raw[key]);
  const restored=new Game({save:decoded,now});
  assert.equal(restored.powers.data.points,g.powers.data.points);
  assert.equal(restored.powers.cooldowns.flight,12);
  assert.equal(powerSlots(restored)[1].id,null);
  assert.equal(POWERS.flight.passive,true);
  restored.paused=true;assert.equal(restored.equipPower(1,'flight'),false);
  assert.equal(restored.equipPower(1,'animalAllies'),true);
  assert.equal(resolveAbilitySlots(raw.powers)[1].id,null,'a stale loadout cannot expose an active Flight button');
});

test('first and second jumps stay normal; third press starts Flight with all four combat slots occupied',()=>{
  const g=game(),equipped=[...g.powers.data.equipped];g.step(STEP,{jump:true});
  assert.equal(g.powers.flying,false);assert.equal(g.hero.jumps,1);assert.ok(g.hero.vy<0);
  frames(g,4);g.step(STEP,{jump:true});assert.equal(g.powers.flying,false);assert.equal(g.hero.jumps,2);assert.ok(g.hero.vy<0);
  frames(g,4);g.step(STEP,{jump:true});assert.equal(g.powers.flying,true);
  assert.equal(g.hero.jumps,2);assert.deepEqual(g.powers.data.equipped,equipped);
  assert.equal(g.powers.activate('flight'),false,'Flight is no longer a slotted action');
});

test('a legacy Flight-only hero can resume an unfinished legendary encounter and save again',()=>{
  const g=game();g.powers.data.equipped=['flight',null,null];g.startLegendaryScene(Object.keys(LEGENDARY)[0]);
  const old=captureProgress(g),decoded=decodeSave(JSON.stringify(old));assert.ok(decoded);
  assert.deepEqual(decoded.powers.equipped,[null,null,null,null]);
  const restored=new Game({save:decoded,now});assert.ok(restored.arenaScene?.legendary);
  assert.ok(decodeSave(JSON.stringify(captureProgress(restored))));
});

test('unlearned, recovering, disrupted and stunned Flight keep the ordinary double jump',()=>{
  for(const reason of ['unlearned','cooldown','disrupted','stun']){
    const g=game(reason==='unlearned'?0:10);
    if(reason==='cooldown')g.powers.cooldowns.flight=10;
    if(reason==='disrupted')g.disruptedPower='flight';
    g.step(STEP,{jump:true});frames(g,3);
    if(reason==='stun')g.hero.stun=.2;
    g.step(STEP,{jump:true});assert.equal(g.powers.flying,false,reason);
    if(reason!=='stun'){assert.equal(g.hero.jumps,2);assert.ok(g.hero.vy<0);}
    g.step(STEP,{jump:true});assert.equal(g.powers.flying,false,reason+' blocks the third press');
  }
});

test('directions steer Flight left, right, up and down; releasing directions hovers',()=>{
  const g=game();takeoff(g);frames(g,30);
  for(const [move,vertical] of [[1,-1],[-1,1]]){
    frames(g,20,{move,vertical});assert.equal(Math.sign(g.hero.vx),move);assert.equal(Math.sign(g.hero.vy),vertical);
  }
  frames(g,20);assert.equal(g.hero.vx,0);assert.equal(g.hero.vy,0);
  let portals=0;g.enterPortal=()=>portals++;g.step(STEP,{portal:true,vertical:-1});assert.equal(portals,0);
});

test('two new Jump presses cancel Flight; one tap, holding or a slow pair cannot cancel',()=>{
  const g=game();takeoff(g);g.step(STEP,{jump:true});assert.equal(g.powers.flying,true);
  frames(g,30);g.step(STEP,{jump:true});assert.equal(g.powers.flying,true,'the first tap expired');
  frames(g,3);g.step(STEP,{jump:true});assert.equal(g.powers.flying,false);
  assert.equal(g.powers.cooldowns.flight,10);assert.equal(g.hero.jumps,2);assert.ok(g.hero.vy>0);
  g.step(STEP,{jump:true});assert.equal(g.powers.flying,false);assert.equal(g.hero.jumps,2);
  frames(g,598);assert.ok(g.powers.cooldowns.flight>0,'Flight is still recovering before ten seconds');
  frames(g,1);assert.ok(g.powers.cooldowns.flight<1e-8,'Flight recovers after ten seconds');
  takeoff(g);
});

test('duration, armor bonus, expiry and recovery debt still use the learned Flight level',()=>{
  for(const rank of [1,20]){
    const g=game(rank);g.equipment.flightLevels=3;takeoff(g);
    assert.equal(g.powers.active.flight.duration,powerStats('flight',rank,{equipment:{flightLevels:3}}).duration);
    const saved=captureProgress(g),restored=new Game({save:decodeSave(JSON.stringify(saved)),now});
    assert.equal(restored.powers.flying,false);assert.ok(restored.powers.cooldowns.flight>10);
    const duration=g.powers.active.flight.duration;frames(g,Math.ceil(duration/STEP));
    assert.equal(g.powers.flying,false);assert.ok(g.powers.cooldowns.flight>9);
  }
});

test('pause, death and landing do not produce stale cancellation or extra air jumps',()=>{
  const g=game();takeoff(g);g.step(STEP,{jump:true});g.paused=true;
  frames(g,60,{jump:true});assert.equal(g.powers.flying,true);
  g.paused=false;frames(g,30);g.step(STEP,{jump:true});assert.equal(g.powers.flying,true);
  g.defeat();assert.equal(g.powers.flying,false);assert.equal(g.hero.dead,true);
  const landed=game();takeoff(landed);frames(landed,90,{vertical:1});assert.equal(landed.hero.grounded,true);
  landed.step(STEP,{jump:true});landed.step(STEP,{jump:true});assert.equal(landed.powers.flying,false);
  landed.step(STEP,{jump:true});assert.equal(landed.hero.jumps,1,'landing restores an ordinary jump during recovery');
});

test('a remaining basic attack cannot be cancelled by Flight and only allowed air powers fire',()=>{
  const g=game();g.step(STEP,{jump:true});g.startAttack('punch');g.step(STEP,{jump:true});g.step(STEP,{jump:true});assert.equal(g.powers.flying,false);
  const flying=game();takeoff(flying);assert.equal(flying.powers.activate('fireball'),true);assert.equal(flying.powers.activate('animalAllies'),true);
  flying.step(STEP,{punch:true,kick:true});assert.equal(flying.hero.attack,null);
});

test('keyboard arrows, touch stick and queued touch taps produce the same flight controls',()=>{
  const controls=input(),g=game();
  controls.tapCounts.set('jump',3);g.step(STEP,controls.sample());g.step(STEP,controls.sample());assert.equal(g.powers.flying,false);g.step(STEP,controls.sample());assert.equal(g.powers.flying,true);
  assert.equal(controls.sample().jump,false,'holding the button cannot add jump edges');
  controls.keys.add('ArrowUp');controls.keys.add('ArrowRight');assert.equal(controls.sample().vertical,-1);assert.equal(controls.sample().move,1);
  controls.keys.clear();controls.keys.add('ArrowDown');controls.keys.add('ArrowLeft');assert.equal(controls.sample().vertical,1);assert.equal(controls.sample().move,-1);
  controls.axis=.8;controls.vertical=-.7;assert.equal(controls.sample().vertical,-.7);assert.equal(controls.sample().move,.8);
  controls.tapCounts.set('jump',2);g.step(STEP,controls.sample());g.step(STEP,controls.sample());assert.equal(g.powers.flying,false);
});

test('controller D-pad up steers upward and held Jump creates only one edge',()=>{
  const pad={connected:true,axes:[0,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===12||i===0}))};
  const first=samplePad(pad),second=samplePad(pad,first.held);
  assert.equal(first.edges.has('jump'),true);assert.equal(second.edges.has('jump'),false);
  const local=Object.assign(Object.create(LocalInput.prototype),{enabled:true,pad:[first,{}],sources:['pad:0','pad:1'],keys:new Set(),pointers:new Map(),edges:[first.edges,new Set()]});
  assert.equal(local.sample(0).vertical,-1);assert.equal(local.sample(1).vertical,0);
  const solo=input();solo.padHeld=first.held;assert.equal(solo.sample().vertical,-1);
});

for(const player of [0,1])test(`local co-op player ${player+1} flies and cancels independently, then saves and reloads`,async()=>{
  const saved=[[],[]],profiles=[0,1].map(i=>({identity:`flight-${i}`,slots:[{slot_number:1,snapshot:captureProgress(game())}],async save(_slot,snapshot){saved[i].push(snapshot);}}));
  const session=new LocalSession(profiles.map(profile=>({profile,slot:1})),{now});
  session.games.forEach(g=>{g.enemies=[];g.hero.invulnerable=60;});session.setPaused(false);
  const jump=()=>session.step([0,1].map(i=>({jump:i===player})));
  jump();session.step([{},{}]);jump();assert.equal(session.games[player].powers.flying,false);jump();assert.equal(session.games[player].powers.flying,true);assert.equal(session.games[1-player].powers.flying,false);
  jump();assert.equal(session.games[player].powers.flying,true);jump();assert.equal(session.games[player].powers.flying,false);
  assert.equal(session.games[1-player].powers.cooldowns.flight||0,0);
  assert.ok((await session.saveAll()).every(r=>r.ok));
  for(const snapshots of saved){const decoded=decodeSave(JSON.stringify(snapshots[0]));assert.ok(decoded);assert.equal(decoded.powers.levels.flight,10);assert.deepEqual(decoded.powers.equipped,['fireball','steel','animalAllies','roots']);}
});
