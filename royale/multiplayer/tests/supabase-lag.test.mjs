import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {RoomRuntime,freshSnapshot} from '../supabase-test/room-runtime.mjs';
import {makeHandler} from '../supabase-test/edge.mjs';
import {PeerMotion,motionPacket,readMotion,movementHz} from '../supabase-test/motion.mjs';
import {GameSession} from '../game-session.mjs';
import {decodeRuntime} from '../runtime.mjs';
import {SupabaseTestClient} from '../supabase-test/client.mjs';

test('durable input queue authenticates once, is bounded, idempotent, and inaccessible to browsers',async()=>{
 const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
 for(const name of ['20261107005540_royale_mp_test.sql','20261107014949_royale_mp_test_fast_sync.sql'])await db.exec((await readFile(new URL('../supabase-test/backend/supabase/migrations/'+name,import.meta.url),'utf8')).replace('alter publication supabase_realtime add table public.royale_mp_test_frames;',''));
 const id=crypto.randomUUID(),token='a'.repeat(64);
 await db.query('select public.royale_mp_test_new_hero($1,$2,0::smallint,$3,$4)',[id,token,freshSnapshot(),'qa']);
 const load=async(seq,input)=> (await db.query('select public.royale_mp_test_sync_load($1,$2,$3) value',[token,seq,input])).rows[0].value;
 const initial=(await load(1,{jump:true})).hero.snapshot;
 await load(1,{jump:false});assert.deepEqual((await db.query('select input_packets from public.royale_mp_test_heroes')).rows[0].input_packets[0].input,{jump:true});
 for(let i=2;i<=40;i++)await load(i,{move:1});
 const row=(await db.query('select * from public.royale_mp_test_heroes')).rows[0];assert.equal(row.input_packets.length,16);assert.equal(row.input_seq,40);assert.deepEqual(row.snapshot,initial);assert.equal(row.revision,0);
 const result=await load(0,null);assert.equal(result.hero.token_hash,undefined);assert.equal(result.hero.creation_ip,undefined);assert.equal(result.hero.input_packets,undefined);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(()=>load(41,{}),/permission/);await db.exec('reset role');}
 await assert.rejects(()=>db.query('select public.royale_mp_test_sync_load($1,1,$2)',['b'.repeat(64),{}]),/expired/);await db.close();
});

function roomFixture(now=1000){
 const r=new RoomRuntime(null,now),hs=[0,1].map(i=>r.adopt({id:crypto.randomUUID(),slot:i,snapshot:freshSnapshot(),revision:0}));
 r.command(hs[0],1,'mode',['create']);r.command(hs[1],1,'mode',['join',r.view(hs[0]).code]);r.command(hs[0],2,'startRoom');
 for(const h of hs)h.game.paused=false;
 return {r,hs,row:{id:hs[0].room,code:r.view(hs[0]).code,runtime:r.encode(),version:1}};
}
test('one request applies both players queued intentions once and ignores pre-disconnect input',()=>{
 const {row,hs}=roomFixture(),r=new RoomRuntime(row,1200),[a,b]=hs.map(h=>r.a.state.heroes.get(h.id));
 const pending=hs.map(h=>({id:h.id,seen:1190,packets:[{seq:1,at:1190,input:{jump:true,move:1}}]}));
 r.pending(pending);r.advance();assert.equal(a.game.hero.jumps,1);assert.equal(b.game.hero.jumps,1);assert.ok(a.game.hero.x>150);
 const next=new RoomRuntime({runtime:r.encode(),version:2},1300);next.pending(pending);next.advance();assert.equal(next.a.state.heroes.get(a.id).game.hero.jumps,1);
 const disconnected=next.a.state.heroes.get(b.id);next.a.detach(b.id,next.a.connections.get(b.id));disconnected.netSeen=0;
 next.pending([{id:b.id,seen:1200,packets:[{seq:2,at:1200,input:{jump:true}}]}]);assert.equal(disconnected.connected,false);
});
test('frequent requests retain fractional ticks instead of slowing the shared simulation',()=>{
 let {row}=roomFixture();
 for(let now=1020;now<=3000;now+=20){const r=new RoomRuntime(row,now);r.advance();row={...row,runtime:r.encode()};}
 const r=new RoomRuntime(row,3000);assert.equal(r.a.state.tick,120);assert.ok(Math.abs(r.lastStep-3000)<.001);
 const wake=new RoomRuntime(row,30000);wake.advance();assert.equal(wake.a.state.tick,180);
});
test('two failed sync commits return committed state without a ten-attempt retry storm or false acknowledgement',async()=>{
 const {hs,row}=roomFixture(),h=hs[0],hero={id:h.id,slot:0,snapshot:freshSnapshot(),room_id:row.id},calls=[];
 const handler=makeHandler({url:'https://fixture',key:'fixture',now:()=>1200,fetcher:async(url,opt)=>{
   const method=url.split('/').at(-1);calls.push(method);
   if(method==='royale_mp_test_sync_load')return Response.json({hero,room:row,inputs:[{id:h.id,seen:1190,packets:[{seq:7,input:{jump:true},at:1190}]}]});
   if(method==='royale_mp_test_commit')return Response.json(false);throw Error('Unexpected separate lookup');
 }});
 const response=await handler(new Request('https://fixture',{method:'POST',headers:{Authorization:'Bearer '+'a'.repeat(64)},body:JSON.stringify({action:'sync',inputSeq:7,input:{jump:true}})}));
 const result=await response.json();assert.equal(response.status,200);assert.equal(result.queued,true);assert.equal(result.state.inputSeq,0);assert.equal(calls.length,5);assert.equal(decodeRuntime(result.state.game).hero.jumps,0);
});
test('movement packets interpolate independently and cannot change HP, XP, equipment or simulation',()=>{
 const {r,hs}=roomFixture(),g=hs[1].game,peer={id:hs[1].id,hero:g.hero},motion=new PeerMotion(),known=[peer],zone=hs[1].zone,originalX=g.hero.x;
 const packet=(seq,x)=>motionPacket(peer.id,seq,zone,{...g.hero,x,vx:100});
 assert.equal(motion.push(packet(1,100),known,zone,1000),true);assert.equal(motion.push(packet(2,120),known,zone,1200),true);
 const presented=motion.sample(peer,zone,1200);assert.equal(presented.x,110);assert.equal(g.hero.x,originalX);
 const forged={...packet(3,140),hero:{...packet(3,140).hero,hp:999,xp:999,inventory:['forged']}};
 assert.equal(readMotion(forged).hero.hp,undefined);motion.push(forged,known,zone,1300);assert.equal(motion.sample(peer,zone,1300).hp,g.hero.hp);
 assert.equal(motion.push(packet(1,1),known,zone,1400),false);assert.equal(motion.push(packet(4,1),[],zone,1400),false);assert.equal(motion.push(packet(4,1),known,'other',1400),false);
 assert.equal(motion.sample(peer,zone,2100),null);assert.equal(readMotion({...packet(5,1),hero:{...g.hero,x:Infinity}}),null);
 for(let n=2;n<=5;n++)assert.ok(movementHz(n)*n*n<=100);
});
test('Realtime visual updates never reset local interpolation or predict damage/rewards',()=>{
 const client=new EventTarget();Object.assign(client,{fastMotion:true,localPrediction:true,unacked:[],generation:1});
 const s=new GameSession({client,storage:{getItem:()=>null},onState(){},onError(){}}),{r,hs}=roomFixture();
 const state=r.view(hs[0]);state.game=decodeRuntime(state.game);client.dispatchEvent(new CustomEvent('state',{detail:state}));const received=s.receivedAt,xp=s.game.hero.xp;
 const enemy=s.game.enemies[0],hp=enemy.hp;s.predict(s.game,{punch:true,powers:[true]});assert.equal(enemy.hp,hp);assert.equal(s.game.hero.xp,xp);
 client.dispatchEvent(new CustomEvent('visual',{detail:r.frame(r.a.state.rooms.get(hs[0].room))}));assert.equal(s.receivedAt,received);assert.equal(s.alpha(),1);
 const actual=s.game.hero.x;let displayed; s.drawGame({draw:g=>displayed=g},1,1/60);assert.notEqual(displayed,s.game);assert.equal(s.game.hero.x,actual);
});
test('a lost response retries the same input and preserves newer taps for the next request',async()=>{
 const c=new SupabaseTestClient({},()=>{});Object.assign(c,{closed:false,state:{roomId:'room'},lastServerAt:performance.now(),schedule(){}});
 const seen=[];c.exchange=async body=>{seen.push(structuredClone(body));if(seen.length===1)throw Error('Lost response');};
 c.input({jump:true});await c.sync();c.input({punch:true});await c.sync();await c.sync();
 assert.deepEqual(seen[0],seen[1]);assert.equal(seen[2].input.punch,true);assert.ok(seen[2].inputSeq>seen[1].inputSeq);c.closed=true;
});
test('menu commands get the next request slot ahead of an automatically scheduled sync',async()=>{
 const c=new SupabaseTestClient({},()=>{});Object.assign(c,{closed:false,busy:true,state:{roomId:'room',commandSeq:2},schedule(){}});
 const seen=[];c.exchange=async body=>{seen.push(body);return {result:true};};const command=c.command('pause',[false]);
 await c.sync();assert.equal(seen.length,0);c.busy=false;await command;assert.equal(seen.length,1);assert.equal(seen[0].method,'pause');c.closed=true;
});
test('late snapshots do not replay movement time the server already simulated',()=>{
 const client=new EventTarget();Object.assign(client,{fastMotion:true,localPrediction:true,unacked:[],generation:1,lastServerAt:performance.now(),input(input){this.unacked.push({input});}});
 const session=new GameSession({client,storage:{getItem:()=>null},onState(){},onError(){}}),{r,hs}=roomFixture();
 const first=r.view(hs[0]);first.game=decodeRuntime(first.game);client.dispatchEvent(new CustomEvent('state',{detail:first}));
 for(let i=0;i<30;i++)session.input({move:1});const predicted=session.game.hero.x;assert.ok(client.unacked.every(p=>Number.isFinite(p.predictedTime)));
 const confirmed=r.view(hs[0]);confirmed.game=decodeRuntime(confirmed.game);for(let i=0;i<15;i++)session.predict(confirmed.game,{move:1});
 client.dispatchEvent(new CustomEvent('state',{detail:confirmed}));
 assert.ok(Math.abs(session.game.time-1)<.00001,'Only 0.5s beyond the confirmed 0.5s is replayed');assert.ok(Math.abs(session.game.hero.x-predicted)<.00001,'No duplicate movement or corrective jump');
});
test('relay interruptions recover immediately through the same idempotent authority request',async()=>{
 const original=globalThis.fetch,seen=[],c=new SupabaseTestClient({endpoint:'https://fixture'},()=>{});c.token='a'.repeat(64);let status=503;
 c.socket={request:async body=>{seen.push(body);return {status,data:{error:'Interrupted'}};}};
 globalThis.fetch=async(url,options)=>{seen.push(JSON.parse(options.body));return Response.json({result:true});};
 try{const body={action:'command',seq:42,method:'save',args:[]};assert.equal((await c.api(body)).result,true);assert.deepEqual(seen[0],seen[1]);assert.equal(c.metrics.transportFallbacks,1);status=401;await assert.rejects(()=>c.api(body));assert.equal(seen.length,3);}finally{globalThis.fetch=original;}
});
