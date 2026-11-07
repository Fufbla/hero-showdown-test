-- Additive, isolated prototype tables. Never writes royale_v3_* or legacy saves.
create table public.royale_mp_test_heroes (
 id uuid primary key, token_hash text unique not null check (token_hash ~ '^[a-f0-9]{64}$'),
 slot smallint not null check (slot in (0,1)), snapshot jsonb not null,
 revision bigint not null default 0, command_seq bigint not null default 0,
 room_id uuid, saved_at timestamptz not null default now(), created_at timestamptz not null default now(),
 creation_ip text not null
);
create index royale_mp_test_hero_creation on public.royale_mp_test_heroes(creation_ip,created_at);
create table public.royale_mp_test_rooms (
 id uuid primary key, code text unique not null check (code ~ '^[0-9]{6}$'),
 version bigint not null default 0, runtime text not null,
 updated_at timestamptz not null default now()
);
-- Public visual state only: no account IDs, credentials, inventories or saves.
create table public.royale_mp_test_frames (
 id uuid primary key references public.royale_mp_test_rooms(id) on delete cascade,
 version bigint not null, frame jsonb not null, updated_at timestamptz not null default now()
);
alter table public.royale_mp_test_heroes enable row level security;
alter table public.royale_mp_test_rooms enable row level security;
alter table public.royale_mp_test_frames enable row level security;
revoke all on public.royale_mp_test_heroes,public.royale_mp_test_rooms,public.royale_mp_test_frames from public,anon,authenticated;
grant all on public.royale_mp_test_heroes,public.royale_mp_test_rooms,public.royale_mp_test_frames to service_role;
grant select on public.royale_mp_test_frames to anon,authenticated;
create policy "Read recent test visuals" on public.royale_mp_test_frames for select to anon,authenticated using (updated_at > now()-interval '1 day');
alter publication supabase_realtime add table public.royale_mp_test_frames;

create function public.royale_mp_test_new_hero(p_id uuid,p_token text,p_slot smallint,p_snapshot jsonb,p_ip text) returns void
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(786412038);
 if (select count(*) from public.royale_mp_test_heroes where creation_ip=p_ip and created_at>now()-interval '1 hour')>=30 then
  raise exception 'Test hero creation limit reached. Reuse your saved test heroes.';
 end if;
 insert into public.royale_mp_test_heroes(id,token_hash,slot,snapshot,creation_ip) values(p_id,p_token,p_slot,p_snapshot,p_ip);
end $$;

create function public.royale_mp_test_commit(p_room uuid,p_code text,p_expected bigint,p_runtime text,p_frame jsonb,p_actor uuid,p_join boolean,p_leave boolean,p_saves jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
declare current_version bigint; actor_room uuid; item jsonb;
begin
 -- Only this prototype's short commits serialize. Simulation runs outside SQL;
 -- stale simulations retry rather than double-applying damage or rewards.
 perform pg_advisory_xact_lock(786412039);
 select room_id into actor_room from public.royale_mp_test_heroes where id=p_actor for update;
 if not found then raise exception 'Unknown test hero'; end if;
 if p_join and actor_room is not null then return false; end if;
 if not p_join and actor_room is distinct from p_room then return false; end if;
 if p_expected=-1 then
  if exists(select 1 from public.royale_mp_test_rooms where code=p_code or id=p_room) then return false; end if;
  insert into public.royale_mp_test_rooms(id,code,runtime,version) values(p_room,p_code,p_runtime,0);
  current_version:=0;
 else
  select version into current_version from public.royale_mp_test_rooms where id=p_room for update;
  if not found or current_version<>p_expected then return false; end if;
  current_version:=current_version+1;
  update public.royale_mp_test_rooms set runtime=p_runtime,version=current_version,updated_at=now() where id=p_room;
 end if;
 if p_join then update public.royale_mp_test_heroes set room_id=p_room where id=p_actor; end if;
 for item in select value from jsonb_array_elements(p_saves) loop
  update public.royale_mp_test_heroes set snapshot=item->'snapshot',revision=(item->>'revision')::bigint,
    command_seq=(item->>'command_seq')::bigint,saved_at=(item->>'saved_at')::timestamptz
  where id=(item->>'id')::uuid and room_id=p_room;
 end loop;
 if p_leave then update public.royale_mp_test_heroes set room_id=null where id=p_actor; end if;
 insert into public.royale_mp_test_frames(id,version,frame) values(p_room,current_version,p_frame)
 on conflict(id) do update set version=excluded.version,frame=excluded.frame,updated_at=now();
 return true;
end $$;
revoke all on function public.royale_mp_test_new_hero(uuid,text,smallint,jsonb,text) from public,anon,authenticated;
revoke all on function public.royale_mp_test_commit(uuid,text,bigint,text,jsonb,uuid,boolean,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.royale_mp_test_new_hero(uuid,text,smallint,jsonb,text) to service_role;
grant execute on function public.royale_mp_test_commit(uuid,text,bigint,text,jsonb,uuid,boolean,boolean,jsonb) to service_role;
