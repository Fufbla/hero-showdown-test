-- Additive: separate copies, never write original or HTTP-test hero progress.
create table public.royale_continuous_test_heroes (
 id uuid primary key,
 token_hash text unique not null check(token_hash ~ '^[a-f0-9]{64}$'),
 slot smallint not null check(slot in (0,1)), snapshot jsonb not null,
 revision bigint not null default 0 check(revision>=0),
 updated_at timestamptz not null default now(),
 lease_owner uuid, lease_epoch bigint not null default 0,
 lease_until timestamptz not null default '-infinity'
);
alter table public.royale_continuous_test_heroes enable row level security;
revoke all on public.royale_continuous_test_heroes from public,anon,authenticated;
grant all on public.royale_continuous_test_heroes to service_role;

-- Caller retains p_id/p_token across retries. Copies only a confirmed HTTP-test
-- snapshot. The destination credential is independent of the source credential.
create function public.royale_continuous_test_copy(p_source text,p_id uuid,p_token text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare source_row public.royale_mp_test_heroes; target public.royale_continuous_test_heroes;
begin
 select * into source_row from public.royale_mp_test_heroes where token_hash=p_source;
 if not found then raise exception 'Invalid source test session'; end if;
 insert into public.royale_continuous_test_heroes(id,token_hash,slot,snapshot)
 values(p_id,p_token,source_row.slot,source_row.snapshot) on conflict(id) do nothing;
 select * into target from public.royale_continuous_test_heroes where id=p_id;
 if target.token_hash is distinct from p_token then raise exception 'Conflicting copy receipt'; end if;
 return jsonb_build_object('id',target.id,'slot',target.slot);
end $$;

create function public.royale_continuous_test_open(p_token text,p_slot integer,p_owner uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare h public.royale_continuous_test_heroes;
begin
 if p_owner is null then raise exception 'Missing server identity'; end if;
 select * into h from public.royale_continuous_test_heroes where token_hash=p_token and slot=p_slot for update;
 if not found then raise exception 'Invalid continuous test session'; end if;
 if h.lease_until>clock_timestamp() and h.lease_owner is distinct from p_owner then
  raise exception 'Test hero is active on another server';
 end if;
 update public.royale_continuous_test_heroes set
 lease_epoch=lease_epoch+case when lease_owner is distinct from p_owner or lease_until<=clock_timestamp() then 1 else 0 end,
 lease_owner=p_owner,lease_until=clock_timestamp()+interval '120 seconds'
 where id=h.id returning * into h;
 return jsonb_build_object('id',h.id,'slot',h.slot,'epoch',h.lease_epoch);
end $$;

-- A null expected revision is a read/renew. All reads and writes require the
-- current unexpired lease; an old server cannot save after a takeover.
create function public.royale_continuous_test_checkpoint(p_id uuid,p_owner uuid,p_epoch bigint,p_expected bigint,p_snapshot jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare h public.royale_continuous_test_heroes;
begin
 select * into h from public.royale_continuous_test_heroes where id=p_id for update;
 if not found or p_owner is null or h.lease_owner is distinct from p_owner or h.lease_epoch is distinct from p_epoch or h.lease_until<=clock_timestamp() then
  raise exception 'Lost test hero lease' using errcode='P0002';
 end if;
 if p_expected is not null then
  if p_expected<0 or p_snapshot is null or jsonb_typeof(p_snapshot)<>'object' then raise exception 'Invalid checkpoint'; end if;
  if h.revision=p_expected then
   update public.royale_continuous_test_heroes set snapshot=p_snapshot,revision=revision+1,updated_at=clock_timestamp() where id=p_id returning * into h;
  elsif not(h.revision=p_expected+1 and h.snapshot=p_snapshot) then
   raise exception 'Newer test progress preserved' using errcode='P0002';
  end if;
 end if;
 update public.royale_continuous_test_heroes set lease_until=clock_timestamp()+interval '120 seconds' where id=p_id;
 return jsonb_build_object('snapshot',h.snapshot,'revision',h.revision,'updated_at',h.updated_at);
end $$;
revoke all on function public.royale_continuous_test_copy(text,uuid,text),public.royale_continuous_test_open(text,integer,uuid),public.royale_continuous_test_checkpoint(uuid,uuid,bigint,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.royale_continuous_test_copy(text,uuid,text),public.royale_continuous_test_open(text,integer,uuid),public.royale_continuous_test_checkpoint(uuid,uuid,bigint,bigint,jsonb) to service_role;
