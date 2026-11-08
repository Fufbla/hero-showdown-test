import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,decodeSave} from '../../core.mjs';
import {TYPES} from '../../world.mjs';
import {LocalSession,captureProgress,AUTOSAVE_MS} from '../session.mjs';
import {CloudProfile,SaveConflict} from '../cloud.mjs';
import {KEYSETS,samplePad,LocalInput} from '../input.mjs';

const snapshot=()=>JSON.parse(new Game().save());
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k),map};};
function profiles(){return [0,1].map(i=>({identity:'profile-'+i,slots:[{slot_number:1,snapshot:snapshot()}],saved:[],async save(slot,snapshot){this.saved.push({slot,snapshot});}}));}
function local(options){const p=profiles();return {p,s:new LocalSession(p.map(profile=>({profile,slot:1})),options)};}
function cloudFixture(){
 const store=memory(),accounts=new Map(),sessions=new Map(),requests=[];let number=0,loseResponse=false,offline=false;
 for(const code of ['1111111111','2222222222'])accounts.set(code,[1,2,3].map(slot_number=>({slot_number,revision:4,snapshot:slot_number<3?snapshot():null})));
 const response=(body,status=200)=>({ok:status<400,status,json:async()=>structuredClone(body)});
 const fetcher=async(_url,options)=>{
  const body=JSON.parse(options.body);requests.push({body,access:options.headers.Authorization});
  if(offline)throw Error('Offline');
  if(body.action==='verify'){if(!accounts.has(body.code))return response({error:'Code unavailable'},404);const token='access-'+ ++number;sessions.set(token,body.code);return response({access:token,refresh:body.code});}
  if(body.action==='renew'){const token='access-'+ ++number;sessions.set(token,body.refresh);return response({access:token,refresh:body.refresh});}
  const code=sessions.get(options.headers.Authorization?.replace('Bearer ',''));if(!code)return response({error:'Expired'},401);
  const slots=accounts.get(code);if(body.action==='slots')return response({slots});
  if(body.action==='save'){
   const row=slots.find(r=>r.slot_number===body.slot);if(row.revision!==body.revision)return response({error:'Revision conflict'},409);
   Object.assign(row,{revision:row.revision+1,snapshot:structuredClone(body.snapshot),updated_at:new Date().toISOString()});
   if(loseResponse){loseResponse=false;throw Error('Response lost');}return response(row);
  }
  throw Error('Unexpected action');
 };
 return {accounts,sessions,requests,store,fetcher,profile:()=>new CloudProfile({fetcher,storage:store}),lose(){loseResponse=true;},setOffline(v){offline=v;}};
}

test('default browser fetch keeps its Window receiver through login, renewal and independent saves',async t=>{
 const f=cloudFixture();let calls=0;
 t.mock.method(globalThis,'fetch',function(...args){
  assert.equal(this,globalThis,'Can only call Window.fetch on instances of Window');calls++;return f.fetcher(...args);
 });
 const a=new CloudProfile({storage:f.store}),b=new CloudProfile({storage:f.store});
 await Promise.all([a.login('1111111111'),b.login('2222222222')]);
 assert.equal(a.slots.length,3);assert.equal(b.slots.length,3);assert.notEqual(a.access,b.access);
 f.sessions.delete(a.access);const x=snapshot(),y=snapshot();x.coins=31;y.coins=72;
 await Promise.all([a.save(1,x),b.save(1,y)]);await Promise.all([a.load(),b.load()]);
 assert.equal(a.slots[0].snapshot.coins,31);assert.equal(b.slots[0].snapshot.coins,72);
 assert(f.requests.some(r=>r.body.action==='renew'));assert(calls>=9);
});
test('both codes retain distinct sessions, heroes, revisions and journals',async()=>{
 const f=cloudFixture(),a=f.profile(),b=f.profile();await Promise.all([a.login('1111111111'),b.login('2222222222')]);
 assert.notEqual(a.access,b.access);assert.notEqual(a.key(1),b.key(1));
 const x=snapshot(),y=snapshot();x.coins=23;y.coins=78;
 await Promise.all([a.save(1,x),b.save(1,y)]);
 assert.equal(f.accounts.get('1111111111')[0].snapshot.coins,23);assert.equal(f.accounts.get('2222222222')[0].snapshot.coins,78);
 assert.equal(f.accounts.get('1111111111')[2].snapshot,null);assert.equal(f.store.map.size,0);
 assert(![...f.store.map.keys()].some(k=>k.includes('1111111111')));
});
test('expired session renewal stays with its own account',async()=>{
 const f=cloudFixture(),a=f.profile(),b=f.profile();await a.login('1111111111');await b.login('2222222222');const other=b.access;f.sessions.delete(a.access);
 const value=snapshot();value.coins=49;await a.save(1,value);assert.equal(b.access,other);assert.equal(f.accounts.get('2222222222')[0].snapshot.coins,0);
});
test('back-to-back writes serialize per hero and preserve newest state',async()=>{
 const f=cloudFixture(),p=await f.profile().login('1111111111'),a=snapshot(),b=snapshot();a.coins=3;b.coins=4;
 await Promise.all([p.save(1,a),p.save(1,b)]);assert.equal(p.slots[0].revision,6);assert.equal(p.slots[0].snapshot.coins,4);
});
test('a lost save response is reconciled without writing twice',async()=>{
 const f=cloudFixture(),p=await f.profile().login('1111111111'),value=snapshot();value.coins=18;f.lose();await p.save(1,value);
 assert.equal(p.slots[0].revision,5);assert.equal(f.requests.filter(r=>r.body.action==='save').length,1);assert.equal(f.store.map.size,0);
});
test('newer cloud revision fences old sessions and keeps recovery copy',async()=>{
 const f=cloudFixture(),p=await f.profile().login('1111111111'),value=snapshot();value.coins=99;const remote=f.accounts.get('1111111111')[0];remote.revision++;remote.snapshot.coins=72;
 await assert.rejects(p.save(1,value),SaveConflict);assert.equal(remote.snapshot.coins,72);assert(p.blocked.has(1));assert(f.store.getItem(p.key(1)));
 await assert.rejects(p.save(1,value),SaveConflict);
 const fresh=await f.profile().login('1111111111');await fresh.prepare(1);assert.equal(fresh.slots[0].snapshot.coins,72);assert.equal(f.store.getItem(p.key(1)),null);assert([...f.store.map.keys()].some(k=>k.includes(':conflict:')));
});
test('offline write recovers only under the original account and revision',async()=>{
 const f=cloudFixture(),p=await f.profile().login('1111111111'),value=snapshot();value.coins=31;f.setOffline(true);await assert.rejects(p.save(1,value));assert(f.store.getItem(p.key(1)));
 f.setOffline(false);const p2=await f.profile().login('2222222222');await p2.prepare(1);assert.equal(p2.slots[0].snapshot.coins,0);
 const same=await f.profile().login('1111111111');await same.prepare(1);assert.equal(same.slots[0].snapshot.coins,31);
});
test('all three existing slots are preserved; populated Slot 3 can save independently',async()=>{const f=cloudFixture();f.accounts.get('1111111111')[2].snapshot=snapshot();const p=await f.profile().login('1111111111'),value=snapshot();value.coins=17;await p.save(3,value);assert.equal(p.slots[2].snapshot.coins,17);assert.equal(p.slots[0].snapshot.coins,0);});
test('newer offline progress remains durable across repeated failures and reopening',async()=>{
 const f=cloudFixture(),p=await f.profile().login('1111111111');f.setOffline(true);
 for(const coins of [8,16,24]){const value=snapshot();value.coins=coins;await assert.rejects(p.save(1,value));}
 f.setOffline(false);const reopened=await f.profile().login('1111111111');await reopened.prepare(1);
 assert.equal(reopened.slots[0].snapshot.coins,24);assert.equal(f.store.map.size,0);
});
test('offline follow-up checkpoints cannot overwrite a newer foreign save',async()=>{
 const f=cloudFixture(),p=await f.profile().login('1111111111');f.setOffline(true);
 for(const coins of [8,24]){const value=snapshot();value.coins=coins;await assert.rejects(p.save(1,value));}
 const remote=f.accounts.get('1111111111')[0];remote.revision++;remote.snapshot.coins=99;f.setOffline(false);
 const reopened=await f.profile().login('1111111111');await reopened.prepare(1);assert.equal(reopened.slots[0].snapshot.coins,99);
 assert.equal(f.store.getItem(p.key(1)+':latest'),null);assert.equal([...f.store.map.keys()].filter(k=>k.includes(':conflict:')).length,2);
});
test('duplicate hero and shared account are rejected',()=>{
 const p=profiles()[0];p.slots.push({slot_number:2,snapshot:snapshot()});assert.throws(()=>new LocalSession([{profile:p,slot:1},{profile:p,slot:1}]),/different heroes/);
 assert.throws(()=>new LocalSession([{profile:p,slot:1},{profile:p,slot:2}]),/own account/);
});
test('two independent inputs move heroes simultaneously in one shared world',()=>{
 const {s}=local();s.setPaused(false);const start=s.games.map(g=>g.hero.x);for(let i=0;i<20;i++)s.step([{move:1,jump:i===0},{move:-1,punch:i===0}]);
 assert(s.games[0].hero.x>start[0]);assert(s.games[1].hero.x<start[1]);assert(s.games[0].hero.y<600);assert.equal(s.games[0].enemies,s.games[1].enemies);
 const before=s.games.map(g=>g.hero.x);s.setPaused(true);s.step([{move:1},{move:1}]);assert.deepEqual(s.games.map(g=>g.hero.x),before);
});
test('joint kill splits base XP, one monster health, one reward per hero',()=>{
 const {s}=local(),[a,b]=s.games,e=a.enemies[0];e.protection=0;e.hp=12;e.maxHp=12;a.random=b.random=()=>.9;
 a.damageEnemy(e,1);b.damageEnemy(e,999999);assert.equal(e.hp,0);assert.equal(e.state,'dead');assert(a.hero.xp>0&&b.hero.xp>0);assert.equal(a.hero.xp+b.hero.xp,TYPES[e.type].xp);assert(Math.abs(a.hero.xp-b.hero.xp)<=1);
 const xp=a.hero.xp+b.hero.xp;s.authority.reward(s.heroes[0],e);assert.equal(a.hero.xp+b.hero.xp,xp);
});
test('both active heroes earn XP even if only one attacks',()=>{const {s}=local(),[a,b]=s.games,e=a.enemies[0];e.protection=0;a.damageEnemy(e,99999);assert(a.hero.xp>0);assert(b.hero.xp>0);assert.equal(a.hero.xp+b.hero.xp,TYPES[e.type].xp);});
test('shared boss preserves object identity and receives combined damage',()=>{
 const {s}=local();s.command(0,'enterBoss');const [a,b]=s.games;assert.equal(a.arenaScene.boss,b.arenaScene.boss);const e=a.arenaScene.boss,before=e.hp;a.damageEnemy(e,10);const mid=e.hp;b.damageEnemy(e,10);assert(mid<before&&e.hp<mid);
});
test('checkpoints capture combat without changing the live game and restore coordinates',async()=>{
 const {s,p}=local();s.setPaused(false);for(let i=0;i<5;i++)s.step([{move:1,punch:i===0},{move:-1}]);
 const [g]=s.games;assert.equal(g.canSave(),false);const time=g.time,attack=g.hero.attack,position=g.hero.x,save=captureProgress(g);assert.equal(g.time,time);assert.equal(g.hero.attack,attack);assert.equal(new Game({save:decodeSave(JSON.stringify(save))}).hero.x,position);
 const results=await s.saveAll();assert(results.every(x=>x.ok));assert.equal(p[0].saved.length,1);assert.equal(p[1].saved.length,1);assert.notEqual(p[0].saved[0].snapshot.world.location.x,p[1].saved[0].snapshot.world.location.x);assert.equal(AUTOSAVE_MS,8000);
});
test('a save failure in one account never prevents the other account saving',async()=>{const {s,p}=local();p[0].save=async()=>{throw Error('Offline P1');};const result=await s.saveAll();assert.equal(result[0].ok,false);assert.equal(result[1].ok,true);assert.equal(p[1].saved.length,1);});
test('unfinished arena checkpoint restarts fight instead of granting victory',()=>{const {s}=local();s.command(0,'enterBoss');const data=captureProgress(s.games[0]);assert.equal(data.arena.mode,'restart');assert.equal(new Game({save:decodeSave(JSON.stringify(data))}).arenaScene.cleared,false);});
test('leader location is preserved and companion joins nearby with own progress',()=>{
 const p=profiles();p[0].slots[0].snapshot.world.location.x=900;p[1].slots[0].snapshot.world.location.x=1100;p[1].slots[0].snapshot.coins=23;
 const s=new LocalSession(p.map(profile=>({profile,slot:1})),{together:false});assert.equal(s.games[0].hero.x,900);assert(Math.abs(s.games[1].hero.x-900)<400);assert.equal(s.games[1].hero.coins,23);
});
test('keyboard maps never share a physical key',()=>{const a=new Set(Object.values(KEYSETS[0]));assert(Object.values(KEYSETS[1]).every(x=>!a.has(x)));});
test('gamepad edges are independent and a held button triggers once',()=>{
 const pad={connected:true,axes:[.8,0],buttons:Array.from({length:17},(_,i)=>({pressed:i===0}))};const first=samplePad(pad),second=samplePad(pad,first.held);assert(first.edges.has('jump'));assert(!second.edges.has('jump'));assert.equal(first.x,.8);assert.equal(samplePad(null).held.size,0);
});
test('stable controller indices prevent the remaining pad taking over after disconnect',()=>{
 globalThis.window=new EventTarget();globalThis.document=new EventTarget();let pads=[0,1].map(()=>({connected:true,axes:[0,0],buttons:[]}));let disconnected=[];
 const input=new LocalInput({getPads:()=>pads,onDisconnect:i=>disconnected.push(i)});input.configure(['pad:0','pad:1']);input.enabled=true;input.poll();pads[1].axes[0]=1;input.poll();assert.equal(input.sample(0).move,0);assert.equal(input.sample(1).move,1);
 pads[0]=null;input.poll();assert.deepEqual(disconnected,[0]);assert.deepEqual(input.sources,['pad:0','pad:1']);assert.throws(()=>input.configure(['pad:1','pad:1']),/different controller/);input.destroy();
});
