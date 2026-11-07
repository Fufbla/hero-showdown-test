// Opt-in live combat with disposable test heroes; never writes original saves.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {fixtures,wait} from './supabase-live-test.mjs';
const cs=await fixtures(),[a,b]=cs;
for(const c of cs)await c.call({action:'select'});
if(!a.state.code)await a.command('mode',['create']);
if(b.state.code!==a.state.code)await b.command('mode',['join',a.state.code]);
await a.sync();if(a.state.phase==='lobby')await a.command('startRoom');
for(const c of cs)await c.command('pause',[false]);
const target=a.game.enemies.find(e=>e.state!=='dead'&&Math.abs(e.y-a.game.hero.y)<30);
assert.ok(target,'A ground monster is available');const id=target.id,initial=cs.map(c=>c.game.hero.xp),updates=[];let fighting=false;
for(let i=0;i<120;i++){
 fighting ||= cs.every(c=>Math.abs(c.game.enemies.find(e=>e.id===id).x-c.game.hero.x)<65);
 await Promise.all(cs.map(c=>{const e=c.game.enemies.find(e=>e.id===id),dx=e.x-c.game.hero.x;return c.sync({move:Math.abs(dx)>30?Math.sign(dx):c.game.hero.face!==Math.sign(dx)?Math.sign(dx)*.1:0,punchHeld:fighting});}));
 updates.push(cs.map(c=>c.game.enemies.find(e=>e.id===id).hp));
 if(updates.at(-1).every(h=>h<=0))break;await wait(100);
}
await Promise.all(cs.map(c=>c.sync()));
const e=a.game.enemies.find(e=>e.id===id),final=cs.map(c=>c.game.hero.xp),share=final[0]-initial[0];
assert.equal(e.hp,0);assert.equal(e.participants.size,2);assert.ok(share>0);assert.equal(final[1]-initial[1],share);
const seq=cs.map(c=>c.seq);await Promise.all(cs.map((c,i)=>c.call({action:'sync',input:{punchHeld:true},inputSeq:seq[i]})));
assert.deepEqual(cs.map(c=>c.game.hero.xp),final);
const report={monster:{type:e.type,maxHp:e.maxHp},initialXP:initial,finalXP:final,share,participants:e.participants.size,sharedHealth:updates,duplicateRewardPrevented:true};
await writeFile('/tmp/royale-lag-combat.json',JSON.stringify(report));console.log(JSON.stringify(report));
for(const c of cs)await c.call({action:'disconnect'});
