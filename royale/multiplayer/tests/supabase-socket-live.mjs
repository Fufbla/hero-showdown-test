// Opt-in integration: disposable test identities only, normal validated inputs.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {fixtures,wait} from './supabase-live-test.mjs';
import {EdgeSocketTransport} from '../supabase-test/socket-client.mjs';
import {decodeRuntime} from '../runtime.mjs';
const endpoint='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-mp-stream-test?forceFunctionRegion=us-west-2';
const cs=await fixtures(2),[a,b]=cs,errors=[];
const stats=xs=>{const a=[...xs].sort((a,b)=>a-b);return {samples:a.length,medianMs:Math.round(a[Math.floor(a.length*.5)]||0),p95Ms:Math.round(a[Math.floor(a.length*.95)]||0),maxMs:Math.round(a.at(-1)||0)};};
try{
 for(const c of cs){c.socket=new EdgeSocketTransport(endpoint,c.hero.access);await c.socket.start();c.call=async body=>{const at=performance.now(),r=await c.socket.request(body),d=r.data;c.times.push(performance.now()-at);if(r.status>=400)throw Error(d.error);if(d.state){c.state=d.state;c.game=decodeRuntime(d.state.game);}if(d.checkpoint)c.saves.push(d.checkpoint.saved_at);return d;};await c.call({action:'select'});}
 if(!a.state.code)await a.command('mode',['create']);if(b.state.code!==a.state.code)await b.command('mode',['join',a.state.code]);await a.sync();assert.equal(a.state.players.length,2);assert.match(a.state.code,/^\d{6}$/);if(a.state.phase==='lobby')await a.command('startRoom');for(const c of cs)await c.command('pause',[false]);
 const target=a.game.enemies.find(e=>e.state!=='dead'&&Math.abs(e.y-a.game.hero.y)<30);assert.ok(target);const id=target.id,initial=cs.map(c=>c.game.hero.xp),health=[];let fighting=false;
 for(let i=0;i<150;i++){fighting ||= cs.every(c=>Math.abs(c.game.enemies.find(e=>e.id===id).x-c.game.hero.x)<65);await Promise.all(cs.map(c=>{const e=c.game.enemies.find(e=>e.id===id),dx=e.x-c.game.hero.x;return c.sync({move:Math.abs(dx)>30?Math.sign(dx):c.game.hero.face!==Math.sign(dx)?Math.sign(dx)*.1:0,punchHeld:fighting&&(!cs.some(other=>!e.participants?.has(other.state.id))||!e.participants?.has(c.state.id))});}));health.push(cs.map(c=>c.game.enemies.find(e=>e.id===id).hp));if(health.at(-1).every(h=>h<=0))break;await wait(80);}
 await Promise.all(cs.map(c=>c.sync()));const enemy=a.game.enemies.find(e=>e.id===id),final=cs.map(c=>c.game.hero.xp),share=final[0]-initial[0];assert.equal(enemy.hp,0);assert.equal(enemy.participants.size,2);assert.ok(share>0);assert.equal(final[1]-initial[1],share);
 await Promise.all(cs.map(c=>c.call({action:'sync',input:{punchHeld:true},inputSeq:c.seq})));assert.deepEqual(cs.map(c=>c.game.hero.xp),final);
 console.log(JSON.stringify({combat:true,share,maxHp:enemy.maxHp,health}));
 cs.forEach(c=>c.times=[]);const until=Date.now()+45000;
 while(Date.now()<until){await Promise.all(cs.map(c=>c.sync().catch(e=>errors.push(e.message))));await wait(80);}
 const before=cs.map(c=>({xp:c.game.hero.xp,revision:c.state.cloud.revision,slot:c.state.cloud.slot})),latency=stats(cs.flatMap(c=>c.times));
 await a.call({action:'disconnect'});a.socket.close();await b.sync();assert.equal(b.state.hostId,b.state.id);const x=b.game.hero.x;for(let i=0;i<4;i++)await b.sync({move:-1});assert.notEqual(b.game.hero.x,x);
 a.socket=new EdgeSocketTransport(endpoint,a.hero.access);await a.socket.start();await a.call({action:'select'});await Promise.all(cs.map(c=>c.sync()));assert.ok(a.game.hero.xp>=before[0].xp);assert.ok(b.game.hero.xp>=before[1].xp);
 const report={combat:{type:enemy.type,maxHp:enemy.maxHp,share,participants:enemy.participants.size,health,duplicateRewardPrevented:true},latency,sockets:cs.map(c=>c.socket.metrics),autosaveIntervals:cs.map(c=>c.saves.map((x,i,a)=>i?Date.parse(x)-Date.parse(a[i-1]):0).filter(x=>x>=8000)),creatorDisconnectContinues:true,reconnectPreservesXP:true,errors};await writeFile('/tmp/royale-socket-live.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.equal(errors.length,0);
}finally{for(const c of cs){try{if(c.socket?.ready)await c.call({action:'disconnect'});}catch{}c.socket?.close();}}
