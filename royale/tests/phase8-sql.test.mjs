import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {Game} from '../core.mjs';
import {legendaryGame,clearLegendary,claimAll} from './legendary-fixture.mjs';
const migration=new URL('../backend/supabase/migrations/20261031125208_royale_accounts.sql',import.meta.url);
test('Phase8 PostgreSQL: atomic slots, permissions, idempotency, conflicts, permanent ledger and deletion',async t=>{
 const db=new PGlite();await db.exec('create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role bypassrls;');await db.exec(await readFile(migration,'utf8'));
 const a=crypto.randomUUID(),b=crypto.randomUUID();await db.query('insert into auth.users values($1),($2)',[a,b]);
 const fresh=()=>JSON.parse(new Game().save());
 const call=async(owner,slot,old,kind,snapshot,{request=crypto.randomUUID(),fingerprint=crypto.randomUUID(),source=null}={})=>(await db.query('select public.royale8_commit($1,$2,$3,$4,$5,$6,$7,$8,$9) as result',[owner,slot,old?.hero_id||null,old?.revision||0,kind,snapshot,request,fingerprint,source])).rows[0].result;
 let first,second;
 await t.test('three fixed slots; fourth rejected; owners cannot use another hero reference',async()=>{
  first=await call(a,0,null,'create',fresh());second=await call(a,1,null,'create',fresh());await call(a,2,null,'create',fresh());await assert.rejects(()=>call(a,3,null,'create',fresh()));await assert.rejects(()=>call(b,0,first,'manual',fresh()));const own=await call(b,0,null,'create',fresh());assert.notEqual(first.hero_id,own.hero_id);
 });
 await t.test('atomic retry once, conflicting payload and stale revisions rejected',async()=>{
  const request=crypto.randomUUID(),fingerprint='manual-a',s=fresh();s.coins=45;const old=first;first=await call(a,0,old,'manual',s,{request,fingerprint});const retry=await call(a,0,old,'manual',s,{request,fingerprint});assert.equal(retry.revision,first.revision);assert.equal(retry.snapshot.coins,45);await assert.rejects(()=>call(a,0,old,'manual',s,{request,fingerprint:'changed'}));await assert.rejects(()=>call(a,0,old,'manual',s));first=await call(a,0,first,'manual',s);await assert.rejects(()=>call(a,0,old,'manual',s,{request,fingerprint}));
 });
 await t.test('anon/authenticated cannot read private tables or call privileged RPCs',async()=>{
  for(const role of['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(()=>db.query('select * from public.royale8_heroes'));await assert.rejects(()=>db.query("select public.royale8_rate('test',1,60)"));await assert.rejects(()=>call(a,0,first,'delete',null));await db.exec('reset role');}
  const r=await db.query("select count(*)::int as n from pg_class where relname like 'royale8_%' and relkind='r' and relrowsecurity");assert.equal(r.rows[0].n,6);
 });
 await t.test('bounded atomic rate limit and window expiry',async()=>{const q=()=>db.query("select public.royale8_rate('fixture',2,60) as ok");assert.equal((await q()).rows[0].ok,true);assert.equal((await q()).rows[0].ok,true);assert.equal((await q()).rows[0].ok,false);await db.exec("update public.royale8_limits set expires_at=now()-interval '1 second' where bucket='fixture'");assert.equal((await q()).rows[0].ok,true);});
 await t.test('delete only selected slot; stale request cannot resurrect deleted or recreated hero',async()=>{
  const old=first;first=await call(a,0,first,'delete',null);assert.equal(first.deleted,true);assert.equal(first.snapshot,null);await assert.rejects(()=>call(a,0,old,'manual',fresh()));const replacement=await call(a,0,first,'create',fresh());assert.notEqual(replacement.hero_id,old.hero_id);await assert.rejects(()=>call(a,0,first,'delete',null));const row=await db.query('select hero_id from public.royale8_heroes where owner_id=$1 and slot=1',[a]);assert.equal(row.rows[0].hero_id,second.hero_id);first=replacement;
 });
 await t.test('migration only empty slots, once per local hero across owners and deletion',async()=>{
  const old=first;first=await call(a,0,first,'delete',null);const imported=await call(a,0,first,'import',fresh(),{source:'source-hash'});await assert.rejects(()=>call(a,0,imported,'import',fresh(),{source:'different'}));first=await call(a,0,imported,'delete',null);await assert.rejects(()=>call(a,0,first,'import',fresh(),{source:'source-hash'}));await assert.rejects(()=>call(b,1,null,'import',fresh(),{source:'source-hash'}));assert.notEqual(old.hero_id,imported.hero_id);
 });
 await t.test('Legendary victory, claim and permanent discard reject rollback and duplicate claims',async()=>{
  const g=legendaryGame(null);let row=await call(a,0,first,'import',JSON.parse(g.save()),{source:'legendary-fixture'});g.enterLegendary('lightning');clearLegendary(g);row=await call(a,0,row,'irreversible',JSON.parse(g.save()));claimAll(g,'lightning');const claimed=JSON.parse(g.save());row=await call(a,0,row,'irreversible',claimed);const uid=g.inventory.items[0].uid;g.discardItem(uid,true);row=await call(a,0,row,'irreversible',JSON.parse(g.save()));await assert.rejects(()=>call(a,0,row,'manual',claimed));await assert.rejects(()=>call(a,0,row,'irreversible',claimed));const unchanged=(await db.query('select snapshot from public.royale8_heroes where owner_id=$1 and slot=0',[a])).rows[0].snapshot;assert.equal(unchanged.inventory.retired[uid],'discarded');assert.equal(unchanged.legendary.defeated.lightning.pieces[0].state,'discarded');
 });
 await db.close();
});
