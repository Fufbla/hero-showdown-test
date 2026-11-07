import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {RoomRuntime,freshSnapshot} from '../supabase-test/room-runtime.mjs';
import {makeHandler} from '../supabase-test/edge.mjs';

test('request authority restores shared references, inputs, lobby and exact runtime between stateless invocations',()=>{
 let r=new RoomRuntime(null,1000),h=r.adopt({id:'one',slot:0,snapshot:freshSnapshot(),revision:0});r.command(h,1,'mode',['create']);const code=r.view(h).code;
 let next=new RoomRuntime({runtime:r.encode(),version:1},1200);const one=next.a.state.heroes.get(h.id),two=next.adopt({id:'two',slot:1,snapshot:freshSnapshot(),revision:0});
 next.command(two,1,'mode',['join',code]);next.command(one,2,'startRoom');assert.equal(one.game.enemies,two.game.enemies);
 next.a.input(one.owner,one.id,1,{move:1,run:true});next.checkpoints(true);
 r=new RoomRuntime({runtime:next.encode(),version:2},1400);r.advance();h=r.a.state.heroes.get('one');assert.ok(h.game.hero.x>150);assert.equal(r.view(h).players.length,2);
});

test('test authority divides base XP equally for mixed-level contributors without changing monster health',()=>{
 const r=new RoomRuntime(),hs=[0,1].map(i=>r.adopt({id:'hero-'+i,slot:i,snapshot:freshSnapshot(),revision:0}));
 r.command(hs[0],1,'mode',['create']);r.command(hs[1],1,'mode',['join',r.view(hs[0]).code]);r.command(hs[0],2,'startRoom');
 const e=hs[0].game.enemies[0],hp=e.maxHp;e.protection=0;hs[0].game.hero.level=8;
 for(const h of hs)h.game.damageEnemy(e,hp/2+1);
 assert.equal(e.maxHp,hp);assert.deepEqual(hs.map(h=>h.game.hero.xp),[7,7]);
 r.a.reward(hs[0],e);assert.deepEqual(hs.map(h=>h.game.hero.xp),[7,7]);
});

test('isolated Postgres commits reject stale XP and forbid public writes, secrets, inventories and original-save access',async()=>{
 const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 const sql=(await readFile(new URL('../supabase-test/backend/supabase/migrations/20261107005540_royale_mp_test.sql',import.meta.url),'utf8')).replace('alter publication supabase_realtime add table public.royale_mp_test_frames;','');await db.exec(sql);
 const hero=crypto.randomUUID(),room=crypto.randomUUID(),snap=freshSnapshot();
 await db.query('select public.royale_mp_test_new_hero($1,$2,0::smallint,$3,$4)',[hero,'a'.repeat(64),snap,'ip']);
 const commit=async(expected,joinRoom,coins)=>{const save={...snap,coins};return (await db.query('select public.royale_mp_test_commit($1,$2,$3,$4,$5,$6,$7,false,$8) as ok',[room,'012345',expected,'runtime',{players:[]},hero,joinRoom,[{id:hero,snapshot:save,revision:expected+2,command_seq:1,saved_at:new Date().toISOString()}]])).rows[0].ok;};
 assert.equal(await commit(-1,true,1),true);assert.equal(await commit(0,false,2),true);assert.equal(await commit(0,false,99),false);
 assert.equal((await db.query('select snapshot from public.royale_mp_test_heroes')).rows[0].snapshot.coins,2);
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  for(const table of ['heroes','rooms'])await assert.rejects(()=>db.query('select * from public.royale_mp_test_'+table),/permission/);
  assert.equal((await db.query('select * from public.royale_mp_test_frames')).rows.length,1);
  await assert.rejects(()=>db.query("update public.royale_mp_test_frames set frame='{}'"),/permission/);
  await assert.rejects(()=>commit(1,false,100),/permission/);await db.exec('reset role');
 }
 assert.equal((await db.query("select count(*)::int n from information_schema.tables where table_name like 'royale_v3_%'")).rows[0].n,0);
 await db.close();
});

test('HTTP endpoint rejects missing credentials and hidden Slot 3 before any private data lookup',async()=>{
 let reads=0;const handler=makeHandler({url:'https://fixture',key:'fixture',fetcher:async()=>{reads++;throw Error('Unexpected lookup');}});
 let response=await handler(new Request('https://fixture',{method:'POST',body:JSON.stringify({action:'new',slot:2})}));assert.equal(response.status,400);assert.match((await response.json()).error,/Slot 3/);
 response=await handler(new Request('https://fixture',{method:'POST',body:JSON.stringify({action:'sync',xp:999})}));assert.equal(response.status,400);assert.equal(reads,0);
});

test('test hero creation accepts an empty successful RPC response and a menu pause does not consume a non-durable command',async()=>{
 const row={id:crypto.randomUUID(),slot:0,snapshot:freshSnapshot(),revision:0,command_seq:0,saved_at:new Date().toISOString(),room_id:null};
 const handler=makeHandler({url:'https://fixture',key:'fixture',fetcher:async url=>url.includes('/rpc/')?new Response(null,{status:204}):Response.json([row])});
 const request=body=>handler(new Request('https://fixture',{method:'POST',headers:{Authorization:'Bearer '+'a'.repeat(64)},body:JSON.stringify(body)}));
 let response=await request({action:'new',slot:0});assert.equal(response.status,200);assert.match((await response.json()).access,/^[a-f0-9]{64}$/);
 response=await request({action:'command',seq:1,method:'pause',args:[true]});const data=await response.json();assert.equal(data.state.commandSeq,0);assert.equal(data.checkpoint,undefined);
});

test('a 100-XP shared reward gives exactly 50 each',()=>{
 const r=new RoomRuntime();r.a.pool=100;const hs=[0,1].map(i=>r.adopt({id:'xp-'+i,slot:i,snapshot:freshSnapshot()}));
 for(let i=0;i<2;i++)r.a.sharedXP(hs[i].game,2,i,()=>hs[i].game.gainXP(100));
 assert.deepEqual(hs.map(h=>h.game.hero.level===2&&h.game.hero.xp===0),[true,true]);
});
