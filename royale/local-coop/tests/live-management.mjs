// Opt-in test: only newly generated disposable accounts, never user codes.
import assert from 'node:assert/strict';import {writeFile} from 'node:fs/promises';
import {CloudProfile,CLOUD_ENDPOINT,HERO_ENDPOINT} from '../cloud.mjs';import {LocalSession,captureProgress} from '../session.mjs';import {Game,decodeSave} from '../../core.mjs';import {createEquipment} from '../../equipment.mjs';
const fetcher=(url,options)=>fetch(url,{...options,headers:{...options.headers,Origin:'https://fufbla.github.io'}});
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const accounts=[],checks=[];const profile=()=>new CloudProfile({fetcher,storage:memory()});
try{
 for(let i=0;i<2;i++){
  const p=profile(),newAccount=await p.request('create',{},false);await p.login(newAccount.code);assert(p.slots.every(r=>r.snapshot===null&&r.revision===0),'Only new empty accounts allowed');
  const g=new Game({look:{name:`Coop Menu Test ${i+1}`}});
  if(i===0){g.world.bossVictories=[1];g.world.unlocked=[1,2];g.bossProgress.records[1]={wins:1,chest:{state:'claimed',coins:0,roots:0,items:[]}};}
  else for(let n=0;n<20;n++)g.inventory.items.push(createEquipment(1,'ordinary',0,g.inventory.nextId++));
  await p.create(1,JSON.parse(g.save()),0);accounts.push({p,code:newAccount.code});
 }
 checks.push('Two new accounts create their own valid heroes through the existing revision-checked save endpoint.');
 const [a,b]=accounts.map(x=>x.p),before=structuredClone(b.slots);
 const disposable=JSON.parse(new Game({look:{name:'Disposable Slot Three'}}).save());await a.create(3,disposable,0);
 await assert.rejects(a.remove(3,{confirmed:false,revision:1,name:disposable.look.name}));await a.load();assert(a.slots[2].snapshot);
 await a.remove(3,{confirmed:true,revision:1,name:disposable.look.name});assert.equal(a.slots[2].snapshot,null);assert.equal(a.slots[2].revision,2);
 const retry=await a.call('delete-hero',{slot:3,revision:1,name:disposable.look.name,confirmed:true},HERO_ENDPOINT);assert.equal(retry.revision,2);
 await b.load();assert.deepEqual(b.slots,before);assert(a.slots[0].snapshot);assert.equal(a.slots[1].snapshot,null);
 checks.push('Cancel preserves the disposable hero; confirmed deletion clears only its slot; retry is idempotent; other account/slots unchanged.');
 const replacement=JSON.parse(new Game({look:{name:'Replacement Test Hero'}}).save());await a.create(3,replacement,2);
 await assert.rejects(a.call('delete-hero',{slot:3,revision:1,name:disposable.look.name,confirmed:true},HERO_ENDPOINT),e=>e.status===409);
 await assert.rejects(a.call('save',{slot:3,revision:1,snapshot:disposable}),e=>e.status===409);
 await a.load();assert.equal(a.slots[2].snapshot.look.name,replacement.look.name);
 checks.push('Stale deletion and stale save cannot overwrite the replacement hero.');
 const s=new LocalSession([{profile:a,slot:1},{profile:b,slot:1}]);await assert.rejects(a.remove(1,{confirmed:true,revision:a.slots[0].revision,name:a.slots[0].snapshot.look.name}),/Leave/);
 s.command(0,'enterBoss');const room=s.authority.state.rooms.get(s.heroes[0].room),world=room.worlds.get(s.heroes[0].zone);for(const e of world.enemies){e.hp=0;e.state='dead';}s.authority.completeWorld(room,world);s.games.forEach(g=>g.combatTimer=0);
 assert.equal(s.command(0,'claimChest'),false);assert.equal(s.command(1,'claimChest'),true);assert(s.games[1].inventory.pending.length>0);assert.equal(s.command(1,'acceptReward'),false);assert.equal(s.command(1,'claimChest'),false);
 assert((await s.saveAll()).every(r=>r.ok));
 for(let i=0;i<2;i++){const reopened=await profile().login(accounts[i].code),snap=reopened.slots[0].snapshot;assert(decodeSave(JSON.stringify(snap)));assert.equal(snap.bossProgress.records[1].chest.state,'claimed');assert.equal(snap.coins,s.games[i].hero.coins);if(i===1){assert.equal(snap.inventory.items.length,20);assert(snap.inventory.pending.length>0);}reopened.forget();}
 checks.push('Mixed boss eligibility awards only the unclaimed chest; full inventory retains pending equipment; both accounts restore their own reward histories.');
 assert((await s.leave(0)).ok);assert(!a.activeSlots.has(1)&&b.activeSlots.has(1));assert((await s.saveAll()).every(r=>r.ok));assert((await s.leave(1)).ok);
 checks.push('Active hero deletion is blocked; departure saves and remaining-hero saves still succeed.');
 const report={at:new Date().toISOString(),passed:true,checks,testAccountsCreated:2,scope:'Only newly generated disposable accounts. No existing player accounts accessed or changed. No credentials recorded.'};
 await writeFile(new URL('./live-management-results.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(e){console.error(JSON.stringify({passed:false,error:e.message,checks}));process.exitCode=1;}finally{for(const a of accounts){a.p.forget();a.code='';}}
