-- Additive, Royale-only. No changes to shared Auth configuration or existing saves.
create table public.royale8_recovery_codes (
 owner_id uuid not null references auth.users(id) on delete cascade,
 verifier text not null check(verifier ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(), used_at timestamptz,
 primary key(owner_id,verifier)
);
create table public.royale8_sessions (
 owner_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null, revoked boolean not null default false,
 primary key(owner_id,session_id)
);
create table public.royale8_security_epochs (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 generation bigint not null default 0, changing_until timestamptz
);
-- Private, short-lived invitations allow staging signup tests while public signup is shut.
create table public.royale8_test_invites (
 verifier text primary key check(verifier ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz not null, used_at timestamptz
);
alter table public.royale8_recovery_codes enable row level security;
alter table public.royale8_sessions enable row level security;
alter table public.royale8_security_epochs enable row level security;
alter table public.royale8_test_invites enable row level security;
revoke all on public.royale8_recovery_codes,public.royale8_sessions,public.royale8_test_invites from public,anon,authenticated;
revoke all on public.royale8_security_epochs from public,anon,authenticated;
grant select,insert,update,delete on public.royale8_recovery_codes,public.royale8_sessions,public.royale8_test_invites to service_role;
grant select,insert,update,delete on public.royale8_security_epochs to service_role;

create function public.royale8_password_fence(p_owner uuid,p_begin boolean) returns void
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,81));
 insert into public.royale8_security_epochs(owner_id,generation,changing_until) values(p_owner,1,case when p_begin then now()+interval '2 minutes' end)
 on conflict(owner_id) do update set generation=public.royale8_security_epochs.generation+1,changing_until=excluded.changing_until;
 update public.royale8_sessions set revoked=true where owner_id=p_owner;
end $$;
create function public.royale8_register_session(p_owner uuid,p_session uuid,p_generation bigint) returns void
language plpgsql security invoker set search_path='' as $$
declare epoch public.royale8_security_epochs;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,81));
 select * into epoch from public.royale8_security_epochs where owner_id=p_owner;
 if p_generation is null or coalesce(epoch.generation,0)<>p_generation or epoch.changing_until>now() then raise exception 'Credentials changed. Sign in again.'; end if;
 insert into public.royale8_sessions(owner_id,session_id) values(p_owner,p_session);
end $$;

create function public.royale8_rotate_codes(p_owner uuid,p_hashes text[]) returns void
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,81));
 if p_hashes is null or cardinality(p_hashes)<>8 or (select count(distinct h) from unnest(p_hashes) h)<>8 then raise exception 'Invalid codes'; end if;
 delete from public.royale8_recovery_codes where owner_id=p_owner;
 insert into public.royale8_recovery_codes(owner_id,verifier) select p_owner,h from unnest(p_hashes) h;
end $$;
create function public.royale8_consume_code(p_owner uuid,p_hash text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare found_code text;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,81));
 update public.royale8_recovery_codes set used_at=now() where owner_id=p_owner and verifier=p_hash and used_at is null returning verifier into found_code;
 if found_code is null then return false; end if;
 perform public.royale8_password_fence(p_owner,true);
 return true;
end $$;
revoke all on function public.royale8_rotate_codes(uuid,text[]),public.royale8_consume_code(uuid,text) from public,anon,authenticated;
grant execute on function public.royale8_rotate_codes(uuid,text[]),public.royale8_consume_code(uuid,text) to service_role;
revoke all on function public.royale8_password_fence(uuid,boolean),public.royale8_register_session(uuid,uuid,bigint) from public,anon,authenticated;
grant execute on function public.royale8_password_fence(uuid,boolean),public.royale8_register_session(uuid,uuid,bigint) to service_role;
