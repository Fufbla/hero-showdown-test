-- Deploy only to the chosen staging database after the existing Royale migration.
-- Account-to-authority transfer is an idempotent reservation/outbox, not a
-- distributed transaction. Keep every reservation until its authority is retired.
create table public.royale_mp_transfers (
 owner_id uuid not null references auth.users(id), slot smallint not null check(slot between 0 and 2),
 hero_id uuid not null unique, source_hash text not null unique,
 snapshot jsonb not null, source_revision bigint not null, created_at timestamptz not null default now(),
 primary key(owner_id,slot), check(pg_column_size(snapshot)<=1000000)
);
alter table public.royale_mp_transfers enable row level security;
revoke all on public.royale_mp_transfers from public,anon,authenticated;
grant select,insert on public.royale_mp_transfers to service_role;

create function public.royale_mp_fence() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.royale_mp_transfers where owner_id=old.owner_id and slot=old.slot) then
  raise exception 'This hero uses multiplayer account saving. Reload the current game.';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function public.royale_mp_fence() from public,anon,authenticated;
create trigger royale_mp_writer_fence before update or delete on public.royale8_heroes
for each row execute function public.royale_mp_fence();

create function public.royale_mp_inspect(p_owner uuid,p_slot integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare h public.royale8_heroes; t public.royale_mp_transfers;
begin
 if p_owner is null or p_slot not between 0 and 2 then raise exception 'Invalid account slot'; end if;
 select * into t from public.royale_mp_transfers where owner_id=p_owner and slot=p_slot;
 if found then return jsonb_build_object('migration',true,'id',t.hero_id,'slot',t.slot,'revision',t.source_revision,'snapshot',t.snapshot); end if;
 select * into h from public.royale8_heroes where owner_id=p_owner and slot=p_slot;
 return jsonb_build_object('revision',coalesce(h.revision,0),'snapshot',case when h.deleted then null else h.snapshot end,'id',h.hero_id);
end $$;
revoke all on function public.royale_mp_inspect(uuid,integer) from public,anon,authenticated;
grant execute on function public.royale_mp_inspect(uuid,integer) to service_role;

create function public.royale_mp_reserve(p_owner uuid,p_slot integer,p_expected bigint,p_source text,p_snapshot jsonb,p_choice text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare h public.royale8_heroes; t public.royale_mp_transfers; saved jsonb; target uuid;
begin
 if p_owner is null or p_slot not between 0 and 2 or p_expected<0 or p_source !~ '^[a-f0-9]{64}$' or p_choice not in ('local','cloud','resume') then raise exception 'Invalid transfer'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,8708));
 select * into t from public.royale_mp_transfers where owner_id=p_owner and slot=p_slot;
 if found then
  -- Only this account can resume; the immutable snapshot and UUID always win.
  return jsonb_build_object('id',t.hero_id,'slot',t.slot,'snapshot',t.snapshot);
 end if;
 select * into h from public.royale8_heroes where owner_id=p_owner and slot=p_slot for update;
 if coalesce(h.revision,0)<>p_expected then raise exception 'Account save changed. Review the newer version.'; end if;
 if p_choice='cloud' then
  if h.hero_id is null or h.deleted then raise exception 'Cloud hero no longer exists'; end if;
  saved:=h.snapshot; target:=h.hero_id;
 elsif p_choice='local' then
  if h.hero_id is not null and not h.deleted then raise exception 'Account slot occupied. Local save cannot overwrite it.'; end if;
  if exists(select 1 from public.royale8_imports where source_hash=p_source) then raise exception 'Local hero was already imported'; end if;
  saved:=p_snapshot; target:=gen_random_uuid();
  if saved is null or (saved->>'version')::int<>8 or (saved->>'level')::int not between 1 and 99 or pg_column_size(saved)>1000000 then raise exception 'Invalid snapshot'; end if;
  insert into public.royale8_heroes(owner_id,slot,hero_id,revision,snapshot) values(p_owner,p_slot,target,p_expected+1,saved)
  on conflict(owner_id,slot) do update set hero_id=excluded.hero_id,revision=excluded.revision,snapshot=excluded.snapshot,deleted=false,updated_at=now();
  insert into public.royale8_imports(source_hash,owner_id,hero_id) values(p_source,p_owner,target);
 else raise exception 'No reserved transfer exists';
 end if;
 insert into public.royale_mp_transfers(owner_id,slot,hero_id,source_hash,snapshot,source_revision) values(p_owner,p_slot,target,p_source,saved,p_expected);
 return jsonb_build_object('id',target,'slot',p_slot,'snapshot',saved);
end $$;
revoke all on function public.royale_mp_reserve(uuid,integer,bigint,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.royale_mp_reserve(uuid,integer,bigint,text,jsonb,text) to service_role;
