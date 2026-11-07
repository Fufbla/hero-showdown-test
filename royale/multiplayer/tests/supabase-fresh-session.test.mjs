import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {makeHandler} from '../supabase-test/edge.mjs';
import {RoomRuntime} from '../supabase-test/room-runtime.mjs';
import {startFreshSession,restoreSession} from '../supabase-test/session-book.mjs';

const memory=()=>{const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};
test('fresh-session recovery retries one identity, retains both slots, and can restore either session',async()=>{
 const storage=memory(),key='test:sessions',old={id:'old',access:'old-access',slot:0,snapshot:{xp:1}},other={id:'other',slot:1};
 storage.setItem(key,JSON.stringify([old,other]));const attempts=[];
 const create=async(access,body)=>{attempts.push(body);assert.equal(access,old.access);if(attempts.length===1)throw Error('Lost response');return {id:body.freshId,access:body.nextAccess,slot:0,snapshot:{xp:52},previous:{snapshot:{xp:52}}};};
 await assert.rejects(()=>startFreshSession(storage,key,0,create),/Lost response/);assert.deepEqual(JSON.parse(storage.getItem(key)),[old,other]);
 const fresh=await startFreshSession(storage,key,0,create);assert.deepEqual(attempts[0],attempts[1]);assert.deepEqual(JSON.parse(storage.getItem(key)),[fresh,other]);
 assert.equal(JSON.parse(storage.getItem(key+':history'))[0].snapshot.xp,52);assert.equal(storage.getItem(key+':fresh:0'),null);
 restoreSession(storage,key,old.id);assert.equal(JSON.parse(storage.getItem(key))[0].id,old.id);restoreSession(storage,key,fresh.id);assert.deepEqual(JSON.parse(storage.getItem(key)),[fresh,other]);
});
test('a failed local activation keeps the old receipt and retry credentials',async()=>{
 const storage=memory(),key='test:sessions',old={id:'old',access:'token',slot:0};storage.setItem(key,JSON.stringify([old,null]));const set=storage.setItem;
 storage.setItem=(k,v)=>{if(k===key)throw Error('Storage full');set(k,v);};
 await assert.rejects(()=>startFreshSession(storage,key,0,async(_,b)=>({id:b.freshId,access:b.nextAccess,slot:0})),/Storage full/);
 assert.equal(JSON.parse(storage.getItem(key))[0].id,'old');assert.ok(storage.getItem(key+':fresh:0'));assert.equal(JSON.parse(storage.getItem(key+':history'))[0].id,'old');
});

async function databaseFixture(){
 const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 for(const name of ['20261107005540_royale_mp_test.sql','20261107014949_royale_mp_test_fast_sync.sql'])await db.exec((await readFile(new URL('../supabase-test/backend/supabase/migrations/'+name,import.meta.url),'utf8')).replace('alter publication supabase_realtime add table public.royale_mp_test_frames;',''));
 const types={new_hero:{p_id:'uuid',p_token:'text',p_slot:'smallint',p_snapshot:'jsonb',p_ip:'text'},commit:{p_room:'uuid',p_code:'text',p_expected:'bigint',p_runtime:'text',p_frame:'jsonb',p_actor:'uuid',p_join:'boolean',p_leave:'boolean',p_saves:'jsonb'},sync_load:{p_token:'text',p_seq:'bigint',p_input:'jsonb'}};
 const fetcher=async(url,options)=>{
  const u=new URL(url),name=u.pathname.split('/').at(-1);assert.ok(name.startsWith('royale_mp_test_'),'Only isolated prototype tables are accessed');
  try{
   if(u.pathname.includes('/rpc/')){const args=JSON.parse(options.body),type=types[name.replace('royale_mp_test_','')],keys=Object.keys(args);const result=await db.query(`select public.${name}(${keys.map((k,i)=>`${k} => $${i+1}::${type[k]}`).join(',')}) value`,keys.map(k=>type[k]==='jsonb'?JSON.stringify(args[k]):args[k]));return Response.json(result.rows[0].value);}
   const field=[...u.searchParams.keys()].find(k=>k!=='select'),value=u.searchParams.get(field).slice(3);assert.ok(['id','code','token_hash'].includes(field));return Response.json((await db.query(`select * from public.${name} where ${field}=$1`,[value])).rows);
  }catch(e){return Response.json({message:e.message},{status:400});}
 };
 const handler=makeHandler({url:'https://fixture',key:'fixture',fetcher,now:()=>1000});
 const call=async(body,access='')=>{const response=await handler(new Request('https://fixture',{method:'POST',headers:{Authorization:'Bearer '+access},body:JSON.stringify(body)})),data=await response.json();assert.equal(response.status,200,data.error);return data;};
 return {db,call};
}
test('fresh rooms preserve the latest combat progress, old room host migration, and idempotent retries',async()=>{
 const {db,call}=await databaseFixture();
 try{
  const a=await call({action:'new',slot:0,name:'Fresh A'}),b=await call({action:'new',slot:1,name:'Fresh B'});
  const first=await call({action:'command',seq:1,method:'mode',args:['create']},a.access),code=first.state.code;
  await call({action:'command',seq:1,method:'mode',args:['join',code]},b.access);await call({action:'command',seq:2,method:'startRoom'},a.access);
  const row=(await db.query('select * from public.royale_mp_test_rooms where code=$1',[code])).rows[0],runtime=new RoomRuntime(row,1000),hero=runtime.a.state.heroes.get(a.id);
  hero.game.hero.xp=32;hero.game.hero.coins=29;hero.game.combatTimer=4;assert.equal(hero.game.canSave(),false);
  await db.query('update public.royale_mp_test_rooms set runtime=$1 where id=$2',[runtime.encode(),row.id]);
  const body={action:'fresh-session',freshId:crypto.randomUUID(),nextAccess:'b'.repeat(64),snapshot:{xp:999999}},fresh=await call(body,a.access);
  assert.equal(fresh.roomId,null);assert.equal(fresh.snapshot.xp,32);assert.equal(fresh.snapshot.coins,29);assert.equal(fresh.previous.snapshot.xp,32);assert.deepEqual(fresh.snapshot.powers,a.snapshot.powers);assert.deepEqual(fresh.snapshot.inventory,a.snapshot.inventory);
  const created=await call({action:'command',seq:1,method:'mode',args:['create']},fresh.access);fresh.roomId=created.state.roomId;fresh.code=created.state.code;assert.notEqual(fresh.code,code);assert.match(fresh.code,/^\d{6}$/);
  const retry=await call(body,a.access);assert.equal(retry.id,fresh.id);assert.equal(retry.code,fresh.code);assert.equal((await db.query('select count(*) n from public.royale_mp_test_heroes')).rows[0].n,3);
  const remaining=await call({action:'select'},b.access);assert.equal(remaining.state.hostId,b.id);assert.equal(remaining.state.code,code);
  const before=(await db.query('select version from public.royale_mp_test_rooms where id=$1',[fresh.roomId])).rows[0].version;
  await call({action:'sync',inputSeq:1,input:{move:1}},a.access);
  assert.equal((await db.query('select version from public.royale_mp_test_rooms where id=$1',[fresh.roomId])).rows[0].version,before);
  const restored=await call({action:'profile'},a.access);assert.equal(restored.snapshot.xp,32);assert.equal(restored.snapshot.coins,29);
 }finally{await db.close();}
});
