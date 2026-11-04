import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '../../node_modules/@electric-sql/pglite/dist/index.js';
import {AuthorityStore} from '../store.mjs';
import {Authority} from '../authority.mjs';
import {MigrationService} from '../migration.mjs';
import {MemoryMigrationBridge} from './migration-fixture.mjs';
import {Game} from '../../core.mjs';
const fresh=()=>JSON.parse(new Game().save());
test('migration review and confirmation are owner-bound, idempotent and recover from a lost response',async()=>{
 const store=new AuthorityStore(),authority=new Authority(store,{capacity:4}),bridge=new MemoryMigrationBridge(),service=new MigrationService(authority,bridge),snapshot=fresh();snapshot.coins=123;
 const preview=await service.preview('a',{slot:0,sourceId:'legacy-hero-A',snapshot});assert.equal(authority.list('a').length,0);
 await assert.rejects(()=>service.confirm('b',preview.ticket),/expired/);
 const first=await service.confirm('a',preview.ticket),again=await service.confirm('a',preview.ticket);assert.equal(first.id,again.id);assert.equal(authority.owner('a',first.id).game.hero.coins,123);assert.equal(authority.list('a').length,1);
 const restarted=new MigrationService(authority,bridge),resume=await restarted.preview('a',{slot:0,sourceId:'legacy-hero-A',snapshot});assert.equal((await restarted.confirm('a',resume.ticket)).id,first.id);store.close();
});
test('migration preserves newer cloud saves and refuses concurrent revision changes',async()=>{
 const store=new AuthorityStore(),authority=new Authority(store,{capacity:4}),bridge=new MemoryMigrationBridge(),service=new MigrationService(authority,bridge),cloud=fresh();cloud.coins=900;
 bridge.rows.set('a:0',{id:crypto.randomUUID(),revision:6,snapshot:cloud});
 await assert.rejects(()=>service.preview('a',{slot:0,sourceId:'legacy-hero-A',snapshot:fresh()}),/account hero already/);
 const p=await service.preview('a',{slot:0,sourceId:'legacy-hero-A',snapshot:fresh(),choice:'cloud'});bridge.rows.get('a:0').revision++;
 await assert.rejects(()=>service.confirm('a',p.ticket),/changed/);assert.equal(authority.list('a').length,0);
 const q=await service.preview('a',{slot:0,sourceId:'legacy-hero-A',snapshot:fresh(),choice:'cloud'}),h=await service.confirm('a',q.ticket);assert.equal(authority.owner('a',h.id).game.hero.coins,900);store.close();
});
test('a reservation survives authority adoption failure and rejects duplicate imports into another slot',async()=>{
 const store=new AuthorityStore(),a=new Authority(store,{capacity:4}),bridge=new MemoryMigrationBridge(),service=new MigrationService(a,bridge),original=a.adopt.bind(a);
 const p=await service.preview('a',{slot:0,sourceId:'legacy-recovery',snapshot:fresh()});a.adopt=()=>{throw Error('disk unavailable');};await assert.rejects(()=>service.confirm('a',p.ticket),/disk/);a.adopt=original;
 const q=await service.preview('a',{slot:0,sourceId:'legacy-recovery',snapshot:fresh()});await service.confirm('a',q.ticket);assert.equal(a.list('a').length,1);
 const duplicate=await service.preview('b',{slot:1,sourceId:'legacy-recovery',snapshot:fresh()});await assert.rejects(()=>service.confirm('b',duplicate.ticket),/Already/);store.close();
});
test('Postgres migration atomically fences legacy writers, checks revisions and protects transfers',async()=>{
 const db=new PGlite();await db.exec('create schema auth;create table auth.users(id uuid primary key);create role anon;create role authenticated;create role service_role bypassrls;');
 for(const name of ['20261031125208_royale_accounts.sql','20261104161434_royale_multiplayer_fence.sql'])await db.exec(await readFile(new URL('../../backend/supabase/migrations/'+name,import.meta.url),'utf8'));
 const owner=crypto.randomUUID(),other=crypto.randomUUID();await db.query('insert into auth.users values($1),($2)',[owner,other]);
 const reserve=async(o,slot,rev,source='a'.repeat(64),choice='local')=>(await db.query('select public.royale_mp_reserve($1,$2,$3,$4,$5,$6) as r',[o,slot,rev,source,fresh(),choice])).rows[0].r;
 const first=await reserve(owner,0,0);assert.deepEqual(await reserve(owner,0,0),first);
 await assert.rejects(()=>reserve(other,0,0),/Local hero was already imported/);
 await assert.rejects(()=>db.query('update public.royale8_heroes set revision=revision+1 where owner_id=$1',[owner]),/multiplayer/);
 await assert.rejects(()=>db.query('delete from public.royale8_heroes where owner_id=$1',[owner]),/multiplayer/);
 const inspect=(await db.query('select public.royale_mp_inspect($1,0) as r',[owner])).rows[0].r;assert.equal(inspect.migration,true);assert.equal(inspect.id,first.id);
 await assert.rejects(()=>reserve(other,1,4,'b'.repeat(64)),/changed/);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(()=>reserve(owner,1,0,'c'.repeat(64)),/permission/);await assert.rejects(()=>db.query('select * from public.royale_mp_transfers'),/permission/);await db.exec('reset role');}
 assert.equal((await db.query('select count(*)::int as n from public.royale_mp_transfers')).rows[0].n,1);await db.close();
});


test('cloud-only heroes can migrate on a new browser without a local snapshot or cross-account source collision',async()=>{
 const store=new AuthorityStore(),a=new Authority(store,{capacity:4}),bridge=new MemoryMigrationBridge(),service=new MigrationService(a,bridge);
 try{
  for(const [owner,coins] of [['one',101],['two',202]]){
   const save=fresh();save.coins=coins;bridge.rows.set(owner+':0',{id:crypto.randomUUID(),revision:3,snapshot:save});
   const p=await service.preview(owner,{slot:0,sourceId:'cloud-slot-0',choice:'cloud'}),h=await service.confirm(owner,p.ticket);
   assert.equal(a.owner(owner,h.id).game.hero.coins,coins);
  }
  assert.equal(a.state.heroes.size,2);
 }finally{store.close();}
});
