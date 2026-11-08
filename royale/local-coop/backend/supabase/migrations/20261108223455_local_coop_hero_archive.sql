-- Local co-op deletion retains the complete prior snapshot. No account rows,
-- existing heroes or online multiplayer tables are deleted by this migration.
create table public.royale_local_hero_archive (
 profile_id uuid not null, slot_number smallint not null check(slot_number between 1 and 3),
 revision bigint not null, snapshot jsonb not null, archived_at timestamptz not null default now(),
 primary key(profile_id,slot_number,revision)
);
alter table public.royale_local_hero_archive enable row level security;
revoke all on public.royale_local_hero_archive from public, anon, authenticated;
grant select,insert on public.royale_local_hero_archive to service_role;

create function public.royale_local_delete_hero(p_token_hash text,p_slot smallint,p_revision bigint,p_name text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare owner_id uuid; current_row public.royale_v3_hero_slots%rowtype; changed_at timestamptz:=now();
begin
 select profile_id into owner_id from public.royale_v3_sessions where token_hash=p_token_hash and expires_at>now();
 if owner_id is null then return jsonb_build_object('error','Session expired','status',401); end if;
 if p_slot not between 1 and 3 or p_revision<0 then return jsonb_build_object('error','Invalid slot','status',400); end if;
 select * into current_row from public.royale_v3_hero_slots where profile_id=owner_id and slot_number=p_slot for update;
 -- Exact retries are idempotent. A later replacement can never match this fence.
 if current_row.snapshot is null and current_row.revision=p_revision+1 and exists(select 1 from public.royale_local_hero_archive where profile_id=owner_id and slot_number=p_slot and revision=p_revision and snapshot->'look'->>'name'=p_name) then
  return jsonb_build_object('revision',current_row.revision,'updated_at',current_row.updated_at);
 end if;
 if not found or current_row.revision<>p_revision or current_row.snapshot is null or current_row.snapshot->'look'->>'name' is distinct from p_name then
  return jsonb_build_object('error','This hero changed. Reload the list before deleting.','status',409);
 end if;
 insert into public.royale_local_hero_archive(profile_id,slot_number,revision,snapshot) values(owner_id,p_slot,p_revision,current_row.snapshot);
 update public.royale_v3_hero_slots set snapshot=null,revision=p_revision+1,updated_at=changed_at where profile_id=owner_id and slot_number=p_slot;
 return jsonb_build_object('revision',p_revision+1,'updated_at',changed_at);
end $$;
revoke all on function public.royale_local_delete_hero(text,smallint,bigint,text) from public,anon,authenticated;
grant execute on function public.royale_local_delete_hero(text,smallint,bigint,text) to service_role;
