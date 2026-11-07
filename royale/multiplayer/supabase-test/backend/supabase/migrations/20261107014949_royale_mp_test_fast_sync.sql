-- Only isolated multiplayer test rows change. Existing snapshots are untouched.
alter table public.royale_mp_test_heroes
 add column input_seq bigint not null default 0,
 add column input_packets jsonb not null default '[]',
 add column input_at timestamptz;
create index royale_mp_test_heroes_room on public.royale_mp_test_heroes(room_id);

-- Authenticate, enqueue validated intentions, and load the room in one trip.
-- Any contender can simulate all pending inputs. Losing a room CAS no longer
-- means losing a tap, or repeatedly re-running ten expensive transactions.
create function public.royale_mp_test_sync_load(p_token text,p_seq bigint,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor public.royale_mp_test_heroes; room public.royale_mp_test_rooms; pending jsonb;
begin
 select * into actor from public.royale_mp_test_heroes where token_hash=p_token for update;
 if not found then raise exception 'Test session expired. Choose a test hero again.'; end if;
 if p_seq>actor.input_seq and p_input is not null then
  select coalesce(jsonb_agg(value order by ord),'[]') into pending
   from jsonb_array_elements(actor.input_packets) with ordinality as packet(value,ord)
   where ord>jsonb_array_length(actor.input_packets)-15;
  update public.royale_mp_test_heroes set input_seq=p_seq,input_at=clock_timestamp(),
   input_packets=pending||jsonb_build_array(jsonb_build_object('seq',p_seq,'input',p_input,'at',extract(epoch from clock_timestamp())*1000))
   where id=actor.id returning * into actor;
 end if;
 select * into room from public.royale_mp_test_rooms where id=actor.room_id;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'packets',input_packets,'seen',extract(epoch from input_at)*1000)),'[]')
  into pending from public.royale_mp_test_heroes where room_id=actor.room_id;
 return jsonb_build_object('hero',to_jsonb(actor)-'token_hash'-'input_packets'-'creation_ip','room',case when room.id is null then null else to_jsonb(room) end,'inputs',pending);
end $$;
revoke all on function public.royale_mp_test_sync_load(text,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.royale_mp_test_sync_load(text,bigint,jsonb) to service_role;
