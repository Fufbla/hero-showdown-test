import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {ContinuousTestBridge} from '../continuous-cloud.mjs';
import {SaveConflict} from '../v3-checkpoints.mjs';
const migration=new URL('../supabase-test/backend/supabase/migrations/20261108080611_royale_continuous_test.sql',import.meta.url);
const hash=s=>createHash('sha256').update(s).digest('hex');
test('isolated cloud copies, eight-second-compatible CAS, lease takeover and public access rejection',async()=>{
 const db=new PGlite();
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create table public.royale_mp_test_heroes(id uuid,token_hash text,slot smallint,snapshot jsonb);');
  await db.exec(await readFile(migration,'utf8'));
  const source=randomBytes(32).toString('hex'),token=randomBytes(32).toString('hex'),id=randomUUID(),snapshot={coins:17,level:5};
  await db.query('insert into public.royale_mp_test_heroes values($1,$2,0,$3)',[randomUUID(),hash(source),snapshot]);
  const calls=[];
  const fetcher=async(url,options)=>{
   const fn=new URL(url).pathname.split('/').at(-1),values=Object.values(JSON.parse(options.body));calls.push(fn);
   assert.match(fn,/^royale_continuous_test_(copy|open|checkpoint)$/);
   try{const r=await db.query(`select public.${fn}(${values.map((_,i)=>'$'+(i+1)).join(',')}) as value`,values);return Response.json(r.rows[0].value);}
   catch(e){return Response.json({code:e.code},{status:409});}
  };
  const a=new ContinuousTestBridge({key:'fixture-only',fetcher}),b=new ContinuousTestBridge({key:'fixture-only',fetcher});
  assert.deepEqual(await a.copyTestHero(source,{id,token}),{id,slot:0});
  assert.deepEqual(await a.copyTestHero(source,{id,token}),{id,slot:0});
  await assert.rejects(()=>a.authenticate(source,{slot:0}));
  await assert.rejects(()=>a.authenticate(token,{slot:2}));
  await a.authenticate(token,{slot:0});await assert.rejects(()=>b.authenticate(token,{slot:0}));
  const initial=await a.read(id,0);assert.deepEqual(initial.snapshot,snapshot);
  const next={...snapshot,coins:24};const saved=await a.write(id,0,0,next);assert.equal(saved.revision,1);
  assert.deepEqual(await a.write(id,0,0,next),saved,'lost response retry is idempotent');
  await assert.rejects(()=>a.write(id,0,0,{coins:999}),SaveConflict);
  await db.query("update public.royale_continuous_test_heroes set lease_until=now()-interval '1 second' where id=$1",[id]);
  await b.authenticate(token,{slot:0});
  await assert.rejects(()=>a.write(id,0,1,{coins:100}),SaveConflict);
  assert.deepEqual((await b.read(id,0)).snapshot,next);
  assert.deepEqual((await db.query('select snapshot from public.royale_mp_test_heroes')).rows[0].snapshot,snapshot);
  const permissions=await db.query("select has_table_privilege('anon','public.royale_continuous_test_heroes','SELECT') as readable,has_function_privilege('authenticated','public.royale_continuous_test_open(text,integer,uuid)','EXECUTE') as callable");
  assert.deepEqual(permissions.rows[0],{readable:false,callable:false});
  assert.equal((await db.query("select count(*)::int n from information_schema.tables where table_name like 'royale_v3_%'")).rows[0].n,0);
 }finally{await db.close();}
});
