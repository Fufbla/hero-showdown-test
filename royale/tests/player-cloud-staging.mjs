// Explicit live staging test; uses only disposable accounts from player-accounts-staging.mjs.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Game} from '../core.mjs';
import {createEquipment} from '../equipment.mjs';
import {validateSnapshot} from '../cloud-validation.mjs';
import {PlayerAccountAPI,AutomaticCloudStore} from '../player-account-client.mjs';
import {CloudAutosave} from '../cloud-autosave.mjs';
import {PROFILE_KEY} from '../saves.mjs';
import {inspectLocalHeroes} from '../save-recovery.mjs';
import {prepareLegacyImport} from '../player-save-migration.mjs';
if(!process.env.ROYALE_TEST_RESULT_FILE)throw Error('Disposable staging fixture required. Never supply player credentials.');
const fixture=JSON.parse(await readFile(process.env.ROYALE_TEST_RESULT_FILE,'utf8'));
assert.match(fixture.otherUsername,/^qatest_[a-f0-9]{12}_b$/);
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
const apis=[];
async function client(){const api=new PlayerAccountAPI({persistSession:false,storageKey:crypto.randomUUID()});apis.push(api);await api.signIn(fixture.otherUsername,fixture.otherPassword);return api;}
let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
function progressedHero(i){
 const g=new Game({look:{name:'Migration Hero '+(i+1)}});g.hero.level=12+i;g.hero.xp=20+i;g.hero.coins=250+i;g.hero.maxHp=100+(g.hero.level-1)*15;g.hero.hp=70+i;
 g.powers.data.levels.fireball=3+i;g.powers.data.levels.strength=2;g.powers.data.points=g.hero.level-1-(5+i);g.powers.data.equipped=['fireball','strength',null];
 g.inventory.items=[createEquipment(1,'ordinary',1,1),createEquipment(1,'ordinary',3,2)];g.inventory.nextId=3;g.inventory.equipped={suit:'drop-1',boots:'drop-2'};
 g.hero.x=3450.125+i;g.hero.y=500.5;g.hero.face=-1;g.hero.vx=12.25;g.hero.vy=-1.25;g.hero.jumps=1;
 return validateSnapshot(g.save());
}

try{
 const firstAPI=await client(),first=new AutomaticCloudStore(firstAPI,{backup:memory()});await first.refresh();
 assert.equal(first.meta.filter(Boolean).length,0,'Fixture must have empty slots; never replace existing heroes.');
 const storage=memory(),original=JSON.stringify({version:2,slots:[0,1,2].map(i=>({id:crypto.randomUUID(),snapshot:progressedHero(i)}))});storage.setItem(PROFILE_KEY,original);
 const heroes=inspectLocalHeroes(storage).heroes;
 for(const [i,hero] of heroes.entries())await check('live import '+(i+1)+' preserves complete snapshot and original browser bytes',async()=>{
  await prepareLegacyImport(hero,{storage,ledger:{all:async()=>[]}});
  assert.equal((await first.migrate(i,hero)).verified,true);
  assert.equal(storage.getItem(PROFILE_KEY),original);
  assert.deepEqual(first.slot(i).snapshot,hero.snapshot);
 });
 const secondAPI=await client(),second=new AutomaticCloudStore(secondAPI,{backup:memory()});await second.refresh();
 for(let i=0;i<3;i++)await check('live automatic save '+(i+1)+' and independent restoration preserve complete hero',async()=>{
  const game=new Game({save:second.slot(i).snapshot});game.started=true;game.hero.x+=123.125;
  const auto=new CloudAutosave(()=>({store:second,game,index:i}));assert.equal(await auto.save({force:true}),true);await auto.flush();await second.flush();
  await first.refresh();assert.deepEqual(first.slot(i).snapshot,validateSnapshot(game.save()));
  const restored=new Game({save:first.slot(i).snapshot});assert.equal(restored.hero.level,12+i);assert.equal(restored.hero.xp,20+i);assert.equal(restored.hero.x,3573.25+i);assert.equal(restored.hero.y,500.5);
  assert.deepEqual(restored.inventory.equipped,{suit:'drop-1',boots:'drop-2'});assert.deepEqual(restored.powers.data.equipped,['fireball','strength',null]);
 });
 await check('live uncertain-response journal recovers idempotently after reopening',async()=>{
  const backup=memory(),writer=new AutomaticCloudStore(secondAPI,{backup});await writer.refresh();
  const snapshot=structuredClone(writer.slot(0).snapshot);snapshot.world.location.x+=20;
  const call=secondAPI.call.bind(secondAPI);let dropped=false;
  secondAPI.call=async body=>{const result=await call(body);if(body.action==='commit'&&!dropped){dropped=true;throw Error('Simulated lost response after REAL server commit');}return result;};
  await assert.rejects(()=>writer.commit(0,snapshot),/lost response/);secondAPI.call=call;
  const reopened=new AutomaticCloudStore(firstAPI,{backup});await reopened.refresh();assert.ok(reopened.failure);const revision=reopened.meta[0].revision;
  await reopened.retry();assert.equal(reopened.meta[0].revision,revision);assert.deepEqual(reopened.slot(0).snapshot,snapshot);assert.equal(storage.getItem(PROFILE_KEY),original);
 });
 console.log(JSON.stringify({passed,failed:0,scope:'Real staging backend, production client and autosaver; synthetic browser storage and independent API sessions, not physical devices'}));
}finally{for(const api of apis)await api.auth.stopAutoRefresh();}
