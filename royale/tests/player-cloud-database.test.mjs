import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {Game} from '../core.mjs';
import {createEquipment} from '../equipment.mjs';
import {AutomaticCloudStore} from '../player-account-client.mjs';
import {CloudAutosave} from '../cloud-autosave.mjs';
import {CloudAPI} from '../cloud-client.mjs';
import {validateSnapshot,validateProgress} from '../cloud-validation.mjs';
import {PROFILE_KEY} from '../saves.mjs';
import {inspectLocalHeroes} from '../save-recovery.mjs';
import {prepareLegacyImport} from '../player-save-migration.mjs';
const hash=text=>createHash('sha256').update(text).digest('hex');
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};};
const identity=s=>({level:s.level,xp:s.xp,look:s.look,inventory:s.inventory,powers:s.powers,world:s.world,coins:s.coins});
export function progressedHero(i){
 const g=new Game({look:{name:'Migration Hero '+(i+1)}});g.hero.level=12+i;g.hero.xp=20+i;g.hero.coins=250+i;g.hero.maxHp=100+(g.hero.level-1)*15;g.hero.hp=70+i;
 g.powers.data.levels.fireball=3+i;g.powers.data.levels.strength=2;g.powers.data.points=g.hero.level-1-(5+i);g.powers.data.equipped=['fireball','strength',null];
 g.inventory.items=[createEquipment(1,'ordinary',1,1),createEquipment(1,'ordinary',3,2)];g.inventory.nextId=3;g.inventory.equipped={suit:'drop-1',boots:'drop-2'};
 g.hero.x=3450.125+i;g.hero.y=500.5;g.hero.face=-1;g.hero.vx=12.25;g.hero.vy=-1.25;g.hero.jumps=1;
 return validateSnapshot(g.save());
}
test('actual PostgreSQL transactions: three-slot import, autosave, second client and conflict/security checks',async t=>{
 const db=new PGlite();await db.exec('create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role bypassrls;');await db.exec(await readFile(new URL('../backend/supabase/migrations/20261031125208_royale_accounts.sql',import.meta.url),'utf8'));
 const owner=crypto.randomUUID(),other=crypto.randomUUID();await db.query('insert into auth.users values($1),($2)',[owner,other]);
 const api=id=>({pending:null,mutate:CloudAPI.prototype.mutate,async call(body){
  if(body.action==='list')return {user:{id},slots:(await db.query("select to_jsonb(h)-'owner_id' as slot from public.royale8_heroes h where owner_id=$1 order by h.slot",[id])).rows.map(r=>r.slot)};
  assert.equal(body.accountId,id);const old=(await db.query('select snapshot from public.royale8_heroes where owner_id=$1 and slot=$2 and not deleted',[id,body.slot])).rows[0]?.snapshot;
  const snapshot=body.kind==='delete'?null:validateSnapshot(body.snapshot,{migration:body.kind==='import'});if(old&&['manual','irreversible'].includes(body.kind))validateProgress(old,snapshot,{kind:body.kind});
  const values=[id,body.slot,body.heroId,body.expectedRevision,body.kind,snapshot,body.requestId,hash(JSON.stringify(body)),body.sourceId?hash(body.sourceId):null];
  return {slot:(await db.query('select public.royale8_commit($1,$2,$3,$4,$5,$6,$7,$8,$9) as slot',values)).rows[0].slot};
 }});
 const storage=memory(),original=JSON.stringify({version:2,slots:[0,1,2].map(i=>({id:crypto.randomUUID(),snapshot:progressedHero(i)}))});storage.setItem(PROFILE_KEY,original);
 const first=new AutomaticCloudStore(api(owner),{backup:memory()});await first.refresh();const heroes=inspectLocalHeroes(storage).heroes;
 for(const [i,hero] of heroes.entries())await t.test('import slot '+(i+1)+' with verified read-back and untouched source',async()=>{await prepareLegacyImport(hero,{storage,ledger:{all:async()=>[]}});assert.equal((await first.migrate(i,hero)).verified,true);assert.equal(storage.getItem(PROFILE_KEY),original);assert.deepEqual(identity(first.slot(i).snapshot),identity(hero.snapshot));});
 const second=new AutomaticCloudStore(api(owner),{backup:memory()});await second.refresh();
 for(let i=0;i<3;i++)await t.test('second independent client restores and resaves exact hero '+(i+1),async()=>{const loaded=new Game({save:second.slot(i).snapshot});assert.equal(loaded.hero.level,12+i);assert.deepEqual(loaded.inventory.equipped,{suit:'drop-1',boots:'drop-2'});assert.deepEqual(loaded.powers.data.equipped,['fireball','strength',null]);assert.equal(loaded.hero.x,3450.125+i);assert.equal(loaded.hero.y,500.5);loaded.started=true;loaded.hero.x+=100;const auto=new CloudAutosave(()=>({store:second,game:loaded,index:i}));assert.equal(await auto.save({force:true}),true);const third=new AutomaticCloudStore(api(owner));await third.refresh();assert.deepEqual(identity(third.slot(i).snapshot),identity(validateSnapshot(loaded.save())));});
 await t.test('stale browser cannot overwrite any of the three updated slots',async()=>{for(let i=0;i<3;i++){const stale=new AutomaticCloudStore(api(owner));stale.user={id:owner};stale.meta=structuredClone(first.meta);await assert.rejects(()=>stale.commit(i,heroes[i].snapshot),/conflict/i);}});
 await t.test('another account cannot reimport the same source or see these heroes',async()=>{const isolated=new AutomaticCloudStore(api(other));await isolated.refresh();assert.equal(isolated.meta.filter(Boolean).length,0);await assert.rejects(()=>isolated.migrate(0,heroes[0]),/already imported/);});
 await t.test('simultaneous imports into an empty slot preserve exactly one winner',async()=>{const a=new AutomaticCloudStore(api(other)),b=new AutomaticCloudStore(api(other));await a.refresh();await b.refresh();const result=await Promise.allSettled([a.migrate(1,{id:crypto.randomUUID(),snapshot:progressedHero(0)}),b.migrate(1,{id:crypto.randomUUID(),snapshot:progressedHero(1)})]);assert.equal(result.filter(r=>r.status==='fulfilled').length,1);});
 await t.test('direct browser roles cannot read rows or invoke write RPC',async()=>{for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(()=>db.query('select * from public.royale8_heroes'));await assert.rejects(()=>db.query('select public.royale8_commit($1,0,null,0,\'create\',$2,$3,\'test\',null)',[owner,progressedHero(0),crypto.randomUUID()]));await db.exec('reset role');}});
 await db.close();
});
