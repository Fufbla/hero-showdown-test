begin;
do $$
declare sid uuid:=gen_random_uuid(); hid uuid:=gen_random_uuid(); owner_a uuid:=gen_random_uuid(); owner_b uuid:=gen_random_uuid(); source_hash text:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''); test_hash text:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-',''); opened jsonb; saved jsonb; refused boolean:=false;
begin
 insert into public.royale_mp_test_heroes(id,token_hash,slot,snapshot,creation_ip) values(sid,source_hash,0,'{"coins":17}','continuous-verification');
 perform public.royale_continuous_test_copy(source_hash,hid,test_hash);
 perform public.royale_continuous_test_copy(source_hash,hid,test_hash);
 opened:=public.royale_continuous_test_open(test_hash,0,owner_a);
 begin perform public.royale_continuous_test_open(test_hash,0,owner_b); exception when others then refused:=true; end;
 if not refused then raise exception 'Second writer accepted'; end if;
 saved:=public.royale_continuous_test_checkpoint(hid,owner_a,(opened->>'epoch')::bigint,0,'{"coins":24}');
 if saved->>'revision'<>'1' then raise exception 'Revision mismatch'; end if;
 if saved<>public.royale_continuous_test_checkpoint(hid,owner_a,(opened->>'epoch')::bigint,0,'{"coins":24}') then raise exception 'Retry mismatch'; end if;
 update public.royale_continuous_test_heroes set lease_until=clock_timestamp()-interval '1 second' where id=hid;
 perform public.royale_continuous_test_open(test_hash,0,owner_b);
 refused:=false;
 begin perform public.royale_continuous_test_checkpoint(hid,owner_a,(opened->>'epoch')::bigint,1,'{"coins":999}'); exception when sqlstate 'P0002' then refused:=true; end;
 if not refused then raise exception 'Old server overwrote save'; end if;
 if (select snapshot from public.royale_mp_test_heroes where id=sid)<>'{"coins":17}'::jsonb then raise exception 'Source changed'; end if;
 if has_table_privilege('anon','public.royale_continuous_test_heroes','SELECT') or has_function_privilege('authenticated','public.royale_continuous_test_open(text,integer,uuid)','EXECUTE') then raise exception 'Public access allowed'; end if;
end $$;
rollback;
select 'copy, retry, exclusive lease, stale-writer rejection, source isolation, and access checks passed; fixtures rolled back' as verification;
