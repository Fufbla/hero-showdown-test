-- REVIEW ONLY: not applied to the live database. Run the local SQL tests first.
-- Existing saves remain in the same rows. A lease only blocks a concurrent writer
-- while that particular hero is controlled by the real-time server.
begin;
create table if not exists public.royale_v3_room_leases (
  profile_id uuid not null,
  slot_number smallint not null check (slot_number between 1 and 3),
  lease_token uuid not null,
  expires_at timestamptz not null,
  primary key (profile_id,slot_number),
  foreign key (profile_id,slot_number) references public.royale_v3_hero_slots(profile_id,slot_number)
);
alter table public.royale_v3_room_leases enable row level security;
revoke all on public.royale_v3_room_leases from public, anon, authenticated;
grant all on public.royale_v3_room_leases to service_role;

create or replace function public.royale_v3_check_room_writer()
returns trigger language plpgsql security invoker set search_path='' as $$
declare lease public.royale_v3_room_leases;
begin
  select * into lease from public.royale_v3_room_leases
    where profile_id=old.profile_id and slot_number=old.slot_number;
  if lease.expires_at>clock_timestamp() and
    coalesce(current_setting('royale.room_writer',true),'')<>lease.lease_token::text then
    raise exception 'Hero is active in multiplayer; reconnect or leave the room first.' using errcode='P0001';
  end if;
  return new;
end $$;
drop trigger if exists royale_v3_room_writer on public.royale_v3_hero_slots;
create trigger royale_v3_room_writer before update of snapshot,revision
on public.royale_v3_hero_slots for each row execute function public.royale_v3_check_room_writer();

create or replace function public.royale_v3_claim_room(p_profile uuid,p_slot smallint,p_token uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare hero public.royale_v3_hero_slots; lease public.royale_v3_room_leases;
begin
  select * into hero from public.royale_v3_hero_slots where profile_id=p_profile and slot_number=p_slot for update;
  if not found or hero.snapshot is null then raise exception 'Saved hero required'; end if;
  select * into lease from public.royale_v3_room_leases where profile_id=p_profile and slot_number=p_slot;
  if found and lease.lease_token<>p_token and lease.expires_at>clock_timestamp() then raise exception 'Hero is already active on another server'; end if;
  insert into public.royale_v3_room_leases values(p_profile,p_slot,p_token,clock_timestamp()+interval '45 seconds')
  on conflict(profile_id,slot_number) do update set lease_token=excluded.lease_token,expires_at=excluded.expires_at;
  return jsonb_build_object('snapshot',hero.snapshot,'revision',hero.revision,'updated_at',hero.updated_at);
end $$;

create or replace function public.royale_v3_save_room(p_profile uuid,p_slot smallint,p_token uuid,p_revision bigint,p_snapshot jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare hero public.royale_v3_hero_slots; lease public.royale_v3_room_leases;
begin
  select * into hero from public.royale_v3_hero_slots where profile_id=p_profile and slot_number=p_slot for update;
  select * into lease from public.royale_v3_room_leases where profile_id=p_profile and slot_number=p_slot;
  if not found or lease.lease_token<>p_token then raise exception 'Room lease changed' using errcode='P0001'; end if;
  -- An exact retry after a lost response returns the existing receipt.
  if hero.revision=p_revision+1 and hero.snapshot=p_snapshot then
    update public.royale_v3_room_leases set expires_at=clock_timestamp()+interval '45 seconds' where profile_id=p_profile and slot_number=p_slot;
    return jsonb_build_object('snapshot',hero.snapshot,'revision',hero.revision,'updated_at',hero.updated_at);
  end if;
  if hero.revision<>p_revision then raise exception 'Revision conflict' using errcode='P0001'; end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot)<>'object' or octet_length(p_snapshot::text)>400000 then raise exception 'Invalid save'; end if;
  perform set_config('royale.room_writer',p_token::text,true);
  update public.royale_v3_hero_slots set snapshot=p_snapshot,revision=p_revision+1,updated_at=clock_timestamp()
    where profile_id=p_profile and slot_number=p_slot returning * into hero;
  update public.royale_v3_room_leases set expires_at=clock_timestamp()+interval '45 seconds' where profile_id=p_profile and slot_number=p_slot;
  return jsonb_build_object('snapshot',hero.snapshot,'revision',hero.revision,'updated_at',hero.updated_at);
end $$;

create or replace function public.royale_v3_release_room(p_profile uuid,p_slot smallint,p_token uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.royale_v3_hero_slots where profile_id=p_profile and slot_number=p_slot for update;
  delete from public.royale_v3_room_leases where profile_id=p_profile and slot_number=p_slot and lease_token=p_token;
  return found;
end $$;
revoke all on function public.royale_v3_check_room_writer() from public,anon,authenticated;
revoke all on function public.royale_v3_claim_room(uuid,smallint,uuid) from public,anon,authenticated;
revoke all on function public.royale_v3_save_room(uuid,smallint,uuid,bigint,jsonb) from public,anon,authenticated;
revoke all on function public.royale_v3_release_room(uuid,smallint,uuid) from public,anon,authenticated;
grant execute on function public.royale_v3_claim_room(uuid,smallint,uuid),public.royale_v3_save_room(uuid,smallint,uuid,bigint,jsonb),public.royale_v3_release_room(uuid,smallint,uuid) to service_role;
commit;
