import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('real PostgreSQL lease SQL fences solo/duplicate writers, preserves other slots, retries receipts and releases safely',async()=>{
  const db=new PGlite(),profile='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',one='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',two='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  try{
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create table public.royale_v3_hero_slots(profile_id uuid,slot_number smallint,snapshot jsonb,revision bigint default 0,updated_at timestamptz default now(),primary key(profile_id,slot_number));
      grant usage on schema public to service_role,anon,authenticated;grant all on public.royale_v3_hero_slots to service_role;`);
    for(let slot=1;slot<=3;slot++)await db.query('insert into public.royale_v3_hero_slots(profile_id,slot_number,snapshot) values($1,$2,$3)',[profile,slot,{coins:slot,look:{name:'Slot '+slot}}]);
    await db.exec(await readFile(new URL('../deploy/v3-session-fence.sql',import.meta.url),'utf8'));
    const original=(await db.query('select * from public.royale_v3_hero_slots order by slot_number')).rows;
    await db.exec('set role service_role');
    const claim=token=>db.query('select public.royale_v3_claim_room($1,$2::smallint,$3) as result',[profile,1,token]);
    const save=(token,rev,snapshot)=>db.query('select public.royale_v3_save_room($1,$2::smallint,$3,$4,$5) as result',[profile,1,token,rev,snapshot]);
    assert.equal((await claim(one)).rows[0].result.revision,0);
    await assert.rejects(()=>claim(two),/already active/);
    await assert.rejects(()=>db.query('update public.royale_v3_hero_slots set snapshot=$1,revision=1 where profile_id=$2 and slot_number=1',[{coins:999},profile]),/active in multiplayer/);
    await assert.rejects(()=>save(two,0,{coins:999}),/lease changed/);
    const snapshot={coins:50,look:{name:'Together'}},saved=(await save(one,0,snapshot)).rows[0].result;assert.equal(saved.revision,1);
    const retry=(await save(one,0,{look:{name:'Together'},coins:50})).rows[0].result;assert.deepEqual(retry,saved);
    await assert.rejects(()=>save(one,0,{coins:999}),/Revision conflict/);
    await db.query('update public.royale_v3_hero_slots set revision=revision+1 where profile_id=$1 and slot_number=2',[profile]);
    const slot3=(await db.query('select * from public.royale_v3_hero_slots where slot_number=3')).rows[0];assert.deepEqual(slot3,original[2]);
    await db.query("update public.royale_v3_room_leases set expires_at=now()-interval '1 second'");
    await db.query('update public.royale_v3_hero_slots set snapshot=$1,revision=2 where profile_id=$2 and slot_number=1',[{coins:55},profile]);
    await assert.rejects(()=>save(one,1,{coins:60}),/Revision conflict/);
    await claim(two);await assert.rejects(()=>save(one,2,{coins:90}),/lease changed/);
    assert.equal((await db.query('select public.royale_v3_release_room($1,$2::smallint,$3) as released',[profile,1,one])).rows[0].released,false);
    assert.equal((await db.query('select public.royale_v3_release_room($1,$2::smallint,$3) as released',[profile,1,two])).rows[0].released,true);
    await db.query('update public.royale_v3_hero_slots set revision=3 where profile_id=$1 and slot_number=1',[profile]);
    await db.exec('reset role;set role anon');await assert.rejects(()=>claim(one),/permission denied/);
    await assert.rejects(()=>db.query('select * from public.royale_v3_room_leases'),/permission denied/);
    await db.exec('reset role;set role authenticated');await assert.rejects(()=>claim(one),/permission denied/);
  }finally{await db.close();}
});
