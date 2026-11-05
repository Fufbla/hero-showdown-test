import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,decodeSave,STEP} from '../core.mjs';
import {WORLD_CLOCK_REFERENCE} from '../world-state.mjs';
import {TYPES,regionCamps} from '../world.mjs';
import {CLOCK} from '../progression.mjs';
import {CloudHeroStore,CloudAPI} from '../cloud-client.mjs';
import {validateSnapshot,validateProgress,validatePasscode,validateUsername,validSlot} from '../cloud-validation.mjs';
import {legendaryGame,clearLegendary,claimAll} from './legendary-fixture.mjs';
const fresh=()=>JSON.parse(new Game().save());
for(let region=1;region<=7;region++)test(`Phase8: L1 free portal ${region}, safe arrival, unchanged resources and difficulty`,()=>{
 const g=new Game();g.hero.hp=71;g.hero.coins=44;g.hero.xp=12;g.healthRoots=3;const inventory=JSON.stringify(g.inventory),powers=JSON.stringify(g.powers.data);
 assert.ok(g.travel(region));assert.equal(g.hero.level,1);assert.deepEqual([g.hero.hp,g.hero.coins,g.hero.xp,g.healthRoots],[71,44,12,3]);assert.equal(JSON.stringify(g.inventory),inventory);assert.equal(JSON.stringify(g.powers.data),powers);assert.deepEqual(g.world.bossVictories,[]);assert.equal(g.hero.x,regionCamps(region)[0].x);assert.equal(g.hero.y,600);assert.ok(g.enemies.every(e=>Math.abs(e.x-g.hero.x)>160));for(const e of g.enemies)assert.equal(e.maxHp,TYPES[e.type].hp);
 assert.ok(g.nearPortal());g.enemies=[];g.startAttack('punch');assert.equal(g.travel(1),false);for(let i=0;i<301;i++)g.step(STEP,{});assert.ok(g.travel(1));g.bossEncounter={};assert.equal(g.travel(7),false);
});
test('Phase8: old world gates migrate to seven open regions without inventing boss rewards',()=>{
 const raw=fresh();raw.version=7;raw.world.unlocked=[1];raw.world.clockReference=1234;const s=decodeSave(JSON.stringify(raw));assert.deepEqual(s.world.unlocked,[1,2,3,4,5,6,7]);assert.deepEqual(s.world.bossVictories,[]);assert.deepEqual(s.bossProgress,raw.bossProgress);assert.equal(s.world.clockReference,WORLD_CLOCK_REFERENCE);
});
test('Phase8: shared clock ignores personal epochs and advances while closed or at sanctuary',()=>{
 const a=fresh(),b=fresh();a.world.clockReference=1;b.world.clockReference=999999;let now=WORLD_CLOCK_REFERENCE+CLOCK.day;
 for(const raw of[a,b]){const g=new Game({save:decodeSave(JSON.stringify(raw)),now:()=>now});g.travel(7);assert.ok(g.clock().night);g.visitTree();now+=CLOCK.night;assert.equal(g.clock().night,false);now-=CLOCK.night;}
});
test('Phase8: exact manual location and damaged HP survive account snapshot validation',()=>{
 const g=new Game();g.hero.x=3450.25;g.hero.y=500.5;g.hero.hp=42.25;g.hero.vx=20;g.hero.vy=-10;g.hero.jumps=2;const s=validateSnapshot(g.save());const copy=new Game({save:s});assert.deepEqual([copy.hero.x,copy.hero.y,copy.hero.hp,copy.hero.vx,copy.hero.vy,copy.hero.jumps],[3450.25,500.5,42.25,20,-10,2]);
});
test('Phase8: passcodes reject PINs, repetitive strings and excessive UTF8; usernames normalize',()=>{
 for(const v of['123456789012345','short','aaaaaaaaaaaaaaaaa','é'.repeat(37)])assert.throws(()=>validatePasscode(v));assert.equal(validatePasscode('Ocean heroes! 2026 story'),'Ocean heroes! 2026 story');assert.equal(validateUsername('COAST_42'),'coast_42');for(const s of['x','1abc','a<b>','space user'])assert.throws(()=>validateUsername(s));assert.deepEqual([-1,0,1,2,3,1.5,'0'].map(validSlot),[false,true,true,true,false,false,false]);
});
test('Phase8: malformed snapshots cannot become account saves',()=>{
 for(const change of[s=>s.level=100,s=>s.coins=-1,s=>s.xp=999999,s=>s.kills=NaN,s=>s.world.location.x=-99,s=>s.powers.points=999]){const s=fresh();change(s);assert.throws(()=>validateSnapshot(s));}
 const g=legendaryGame('lightning');const entry=g.drain().find(e=>e.type==='boss-entry').snapshot;assert.throws(()=>validateSnapshot(entry));assert.ok(validateSnapshot(entry,{migration:true}));
});
for(const id of['lightning','air','styrodog','sonic','styro','wastelander','venomis','atomdust'])test(`Phase8: ${id} victory, claim and discard validate atomically; stale rollback rejected`,()=>{
 const g=legendaryGame(null),before=validateSnapshot(g.save());g.enterLegendary(id);assert.ok(clearLegendary(g));const victory=validateSnapshot(g.save());assert.ok(validateProgress(before,victory,{kind:'irreversible'}));assert.throws(()=>validateProgress(before,victory));assert.ok(claimAll(g,id));const claimed=validateSnapshot(g.save());assert.ok(validateProgress(victory,claimed,{kind:'irreversible'}));assert.throws(()=>validateProgress(claimed,victory,{kind:'irreversible'}));const uid=g.inventory.items[0].uid;assert.ok(g.discardItem(uid,true));const discarded=validateSnapshot(g.save());assert.ok(validateProgress(claimed,discarded,{kind:'irreversible'}));assert.throws(()=>validateProgress(discarded,claimed));
 // Postgres JSONB key ordering must not manufacture a permanent event.
 const reordered=JSON.parse(JSON.stringify(discarded),(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).reverse()):v);assert.ok(validateProgress(discarded,reordered));
});
test('Phase8: cloud store caches ordinary progress only in memory until explicit manual commit',async()=>{
 const rows=[];let calls=0;const api={pending:null,async call(){return {slots:rows,user:{id:'test'}};},async mutate(b){calls++;const row={slot:b.slot,hero_id:rows[b.slot]?.hero_id||crypto.randomUUID(),revision:(rows[b.slot]?.revision||0)+1,snapshot:structuredClone(b.snapshot),deleted:b.kind==='delete',created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:01:00Z'};rows[b.slot]=row;return {slot:row};}};
 const store=new CloudHeroStore(api);await store.refresh();await store.create(0,fresh());const id=store.slot(0).id,g=new Game({save:store.slot(0).snapshot});g.hero.coins=123;assert.ok(store.writeSlot(0,g.save(),{expectedId:id}).ok);assert.equal(calls,1);assert.equal(rows[0].snapshot.coins,0);await store.commit(0,g.save());assert.equal(calls,2);assert.equal(rows[0].snapshot.coins,123);await store.create(1,fresh());assert.equal(store.slot(1).snapshot.coins,0);await assert.rejects(()=>store.migrate(1,{id:'source-local',snapshot:fresh()}));await store.remove(0,id);assert.equal(store.slot(0),null);assert.ok(store.slot(1));await assert.rejects(()=>store.remove(0,id));
});
test('Phase8: uncertain requests retry the same identifier, block new writes until reload',async()=>{
 const api=Object.create(CloudAPI.prototype),seen=[];let fail=true;api.call=async body=>{seen.push(body);if(fail)throw Error('offline');return {ok:true};};await assert.rejects(()=>api.mutate({kind:'manual',slot:0}));await assert.rejects(()=>api.mutate({kind:'delete',slot:0}));assert.equal(seen.length,1);fail=false;await api.mutate({kind:'manual',slot:0});assert.equal(seen[0].requestId,seen[1].requestId);assert.equal(api.pending,null);
});

test('Phase8: invalid cloud position falls back to last checkpoint without losing other progression',async()=>{
 const {restoreCloudSnapshot}=await import('../cloud-restore.mjs');const s=fresh();s.world.location.x=-99;s.world.location.hp=63;s.coins=75;const result=restoreCloudSnapshot(s);assert.ok(result.recovered);assert.equal(result.snapshot.world.location.x,160);assert.equal(result.snapshot.world.location.hp,63);assert.equal(result.snapshot.coins,75);assert.equal(s.world.location.x,-99);s.inventory.items=Array(8).fill({uid:'duplicate',catalogId:'invalid'});assert.equal(restoreCloudSnapshot(s),null);
});
