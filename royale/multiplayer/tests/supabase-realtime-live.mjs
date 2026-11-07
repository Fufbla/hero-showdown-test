// Opt-in test against disposable heroes; no production saves are read or written.
import {createClient} from '@supabase/supabase-js';
import {fixtures,wait} from './supabase-live-test.mjs';
import {CLOUD_CONFIG} from '../../cloud-config.mjs';
import {writeFile} from 'node:fs/promises';
const [actor]=await fixtures();await actor.call({action:'select'});
const supa=createClient(CLOUD_CONFIG.url,CLOUD_CONFIG.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
let frames=0,statuses=[];
const channel=supa.channel('test-evidence-'+actor.state.roomId).on('postgres_changes',{event:'*',schema:'public',table:'royale_mp_test_frames',filter:'id=eq.'+actor.state.roomId},()=>frames++).subscribe(s=>statuses.push(s));
const until=Date.now()+15000;while(!statuses.includes('SUBSCRIBED')&&Date.now()<until)await wait(100);
for(let i=0;i<5&&statuses.includes('SUBSCRIBED');i++){await actor.sync();await wait(250);}
await wait(1000);await supa.removeAllChannels();const report={statuses,frames};await writeFile('/tmp/royale-realtime-result.json',JSON.stringify(report));console.log(JSON.stringify(report));
if(!frames)process.exitCode=1;
