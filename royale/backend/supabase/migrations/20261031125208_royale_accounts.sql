-- Isolated Royale storage. Existing Healthia tables/auth configuration are untouched.
create table public.royale8_heroes (
 owner_id uuid not null references auth.users(id) on delete cascade,
 slot smallint not null check(slot between 0 and 2),
 hero_id uuid not null default gen_random_uuid(), revision bigint not null default 1 check(revision>0),
 snapshot jsonb, deleted boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 manual_saved_at timestamptz not null default now(),
 primary key(owner_id,slot), unique(hero_id),
 check((deleted and snapshot is null) or (not deleted and snapshot is not null and pg_column_size(snapshot)<=1000000))
);
create table public.royale8_requests (
 owner_id uuid not null references auth.users(id) on delete cascade, request_id uuid not null,
 fingerprint text not null, result jsonb not null, created_at timestamptz not null default now(),
 primary key(owner_id,request_id)
);
create table public.royale8_imports (
 source_hash text primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 hero_id uuid not null, created_at timestamptz not null default now()
);
create index royale8_imports_owner on public.royale8_imports(owner_id);
create table public.royale8_usernames (
 username text primary key check(username ~ '^[a-z][a-z0-9_]{3,23}$'),
 user_id uuid unique references auth.users(id) on delete cascade,
 reservation uuid not null, created_at timestamptz not null default now()
);
create table public.royale8_limits (
 bucket text primary key, hits integer not null, expires_at timestamptz not null
);
create table public.royale8_configuration (
 id integer primary key check(id=1), email_ready boolean not null default false,
 google_ready boolean not null default false, apple_ready boolean not null default false,
 recovery_ready boolean not null default false
);
insert into public.royale8_configuration(id) values(1);
-- No client Data API privileges. Ownership is checked after Auth validation by
-- the Edge Function; only service_role executes the bounded atomic operations.
alter table public.royale8_heroes enable row level security;
alter table public.royale8_requests enable row level security;
alter table public.royale8_imports enable row level security;
alter table public.royale8_usernames enable row level security;
alter table public.royale8_limits enable row level security;
alter table public.royale8_configuration enable row level security;
revoke all on public.royale8_heroes, public.royale8_requests, public.royale8_imports, public.royale8_usernames, public.royale8_limits, public.royale8_configuration from public, anon, authenticated;
grant all on public.royale8_heroes, public.royale8_requests, public.royale8_imports, public.royale8_usernames, public.royale8_limits, public.royale8_configuration to service_role;

create function public.royale8_rate(p_bucket text,p_limit integer,p_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if p_limit<1 or p_seconds<1 or length(p_bucket)>180 then return false; end if;
 insert into public.royale8_limits(bucket,hits,expires_at) values(p_bucket,1,now()+make_interval(secs=>p_seconds))
 on conflict(bucket) do update set hits=case when royale8_limits.expires_at<=now() then 1 else royale8_limits.hits+1 end,
 expires_at=case when royale8_limits.expires_at<=now() then now()+make_interval(secs=>p_seconds) else royale8_limits.expires_at end
 returning hits into n;
 delete from public.royale8_limits where expires_at<now()-interval '1 day';
 return n<=p_limit;
end $$;
revoke all on function public.royale8_rate(text,integer,integer) from public,anon,authenticated;
grant execute on function public.royale8_rate(text,integer,integer) to service_role;

create function public.royale8_commit(p_owner uuid,p_slot integer,p_hero uuid,p_expected bigint,p_kind text,p_snapshot jsonb,p_request uuid,p_fingerprint text,p_source text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare h public.royale8_heroes; prior public.royale8_requests; result jsonb; pair record; incoming jsonb; piece jsonb; old_piece jsonb;
begin
 if p_owner is null or p_slot not between 0 and 2 or p_expected<0 or p_request is null then raise exception 'Invalid slot request'; end if;
 -- Serializes all three slots and idempotency records for this authenticated owner.
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,8708));
 select * into prior from public.royale8_requests where owner_id=p_owner and request_id=p_request;
 if found then
  if prior.fingerprint<>p_fingerprint then raise exception 'Request key was reused'; end if;
  select * into h from public.royale8_heroes where owner_id=p_owner and slot=p_slot;
  if h.hero_id::text is distinct from prior.result->>'hero_id' or h.revision is distinct from (prior.result->>'revision')::bigint then raise exception 'Result superseded. Reload your heroes.'; end if;
  return prior.result;
 end if;
 select * into h from public.royale8_heroes where owner_id=p_owner and slot=p_slot for update;
 if coalesce(h.revision,0)<>p_expected or h.hero_id is distinct from p_hero then raise exception 'Save conflict. Reload your heroes.'; end if;
 if p_kind in ('create','import') then
  if h.hero_id is not null and not h.deleted then raise exception 'Slot is occupied'; end if;
  if p_kind='import' and (p_source is null or exists(select 1 from public.royale8_imports where source_hash=p_source)) then raise exception 'This local hero was already imported'; end if;
 elsif p_kind not in ('manual','irreversible','delete') or h.hero_id is null or h.deleted then raise exception 'Hero no longer exists'; end if;
 if p_kind<>'delete' then
  if p_snapshot is null or pg_column_size(p_snapshot)>1000000 or (p_snapshot->>'level')::int not between 1 and 99 or jsonb_array_length(p_snapshot#>'{inventory,items}')>7 then raise exception 'Invalid snapshot'; end if;
  if p_kind in ('manual','irreversible') then
   if (p_snapshot#>>'{legendary,revision}')::bigint<(h.snapshot#>>'{legendary,revision}')::bigint then raise exception 'Permanent revision rollback'; end if;
   if p_kind='manual' and (p_snapshot#>'{legendary,defeated}'<>h.snapshot#>'{legendary,defeated}' or p_snapshot#>'{legendary,revision}'<>h.snapshot#>'{legendary,revision}') then raise exception 'Permanent event required'; end if;
   if p_kind='irreversible' and (p_snapshot#>>'{legendary,revision}')::bigint<>(h.snapshot#>>'{legendary,revision}')::bigint+1 then raise exception 'Permanent event conflict'; end if;
   for pair in select * from jsonb_each(h.snapshot#>'{inventory,retired}') loop
    if p_snapshot#>array['inventory','retired',pair.key] is distinct from pair.value then raise exception 'Destroyed item rollback'; end if;
   end loop;
   for pair in select * from jsonb_each(h.snapshot#>'{legendary,defeated}') loop
    incoming:=p_snapshot#>array['legendary','defeated',pair.key];
    if incoming is null or (pair.value->>'claimed')::boolean and not (incoming->>'claimed')::boolean then raise exception 'Legendary defeat rollback'; end if;
    for old_piece in select * from jsonb_array_elements(pair.value->'pieces') loop
     select value into piece from jsonb_array_elements(incoming->'pieces') where value->>'uid'=old_piece->>'uid';
     if piece is null or piece->>'catalogId'<>old_piece->>'catalogId' or old_piece->>'state'='discarded' and piece->>'state'<>'discarded' then raise exception 'Legendary ownership rollback'; end if;
    end loop;
   end loop;
  end if;
 end if;
 if p_kind in ('create','import') then
  insert into public.royale8_heroes(owner_id,slot,hero_id,revision,snapshot,deleted) values(p_owner,p_slot,gen_random_uuid(),p_expected+1,p_snapshot,false)
  on conflict(owner_id,slot) do update set hero_id=excluded.hero_id,revision=excluded.revision,snapshot=excluded.snapshot,deleted=false,created_at=now(),updated_at=now(),manual_saved_at=now() returning * into h;
  if p_kind='import' then insert into public.royale8_imports(source_hash,owner_id,hero_id) values(p_source,p_owner,h.hero_id); end if;
 else
  update public.royale8_heroes set snapshot=case when p_kind='delete' then null else p_snapshot end,deleted=p_kind='delete',revision=revision+1,updated_at=now(),manual_saved_at=case when p_kind='manual' then now() else manual_saved_at end where owner_id=p_owner and slot=p_slot returning * into h;
 end if;
 if p_kind='delete' then delete from public.royale8_requests r where r.owner_id=p_owner and r.result->>'hero_id'=h.hero_id::text; end if;
 result:=to_jsonb(h)-'owner_id';
 insert into public.royale8_requests values(p_owner,p_request,p_fingerprint,result,now());
 -- Retain stale-request rejection via hero UUID + revision after cache expiry.
 delete from public.royale8_requests where owner_id=p_owner and created_at<now()-interval '7 days';
 return result;
end $$;
revoke all on function public.royale8_commit(uuid,integer,uuid,bigint,text,jsonb,uuid,text,text) from public,anon,authenticated;
grant execute on function public.royale8_commit(uuid,integer,uuid,bigint,text,jsonb,uuid,text,text) to service_role;
