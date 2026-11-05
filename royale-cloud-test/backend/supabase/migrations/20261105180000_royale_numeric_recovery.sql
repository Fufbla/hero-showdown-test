-- Additive and isolated to Royale. Existing recovery codes are never removed.
create table if not exists public.royale8_numeric_recovery (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 verifier text not null check(verifier ~ '^[a-f0-9]{64}$'),
 created_at timestamptz not null default now(),
 used_at timestamptz
);
alter table public.royale8_numeric_recovery enable row level security;
revoke all on public.royale8_numeric_recovery from public,anon,authenticated;
grant select,insert,update,delete on public.royale8_numeric_recovery to service_role;
create or replace function public.royale8_consume_numeric_code(p_owner uuid,p_verifier text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare found_owner uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,81));
 update public.royale8_numeric_recovery
 set used_at=now()
 where owner_id=p_owner and verifier=p_verifier and used_at is null
 returning owner_id into found_owner;
 if found_owner is null then return false; end if;
 perform public.royale8_password_fence(p_owner,true);
 return true;
end $$;
revoke all on function public.royale8_consume_numeric_code(uuid,text) from public,anon,authenticated;
grant execute on function public.royale8_consume_numeric_code(uuid,text) to service_role;
