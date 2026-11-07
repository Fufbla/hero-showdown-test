import http from 'node:http';
import {PROTOCOL} from './protocol.mjs';
import {MigrationService} from './migration.mjs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {mkdirSync} from 'node:fs';
import {performance,monitorEventLoopDelay} from 'node:perf_hooks';
import {WebSocketServer} from 'ws';
import {AuthorityStore} from './store.mjs';
import {Authority} from './authority.mjs';
import {runtimeDelta} from './delta.mjs';
import {encodeRuntime} from './runtime.mjs';
import {CLOUD_CONFIG} from '../cloud-config.mjs';
import {V3CloudBridge,V3Checkpoints,SaveConflict} from './v3-checkpoints.mjs';
import {MAX_ROOM_PLAYERS} from './room-rules.mjs';

// Verify identity with the existing Supabase project. No secret/service-role key
// is needed; a client-selected owner ID is never accepted.
export async function authenticateSupabase(token) {
  if(typeof token!=='string'||token.length>8192)throw Error('Sign in to your account.');
  const response=await fetch(CLOUD_CONFIG.url+'/auth/v1/user',{headers:{apikey:CLOUD_CONFIG.publishableKey,Authorization:'Bearer '+token},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Your account session expired. Sign in again.');
  const user=await response.json();if(!user.id||user.is_anonymous)throw Error('A permanent account is required.');
  // getUser validated the JWT; decode only its expiry to bound this connection.
  const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
  if(!Number.isFinite(claims.exp)||claims.exp*1000<=Date.now())throw Error('Session expired.');
  return {id:user.id,expiresAt:claims.exp*1000};
}
export function startServer({port=0,host='127.0.0.1',path=':memory:',capacity=MAX_ROOM_PLAYERS,maxConnections=capacity,origins=[],authenticate=authenticateSupabase,autoTick=true,serve=null,migrationBridge=null,allowNewHeroes=false,v3Bridge=null,checkpointNow=Date.now}={}) {
  const store=new AuthorityStore(path),authority=new Authority(store,{capacity,maxConnections});
  const migrations=new MigrationService(authority,migrationBridge);
  const checkpoints=v3Bridge?new V3Checkpoints(authority,v3Bridge,{now:checkpointNow,
    onSaved:(h,result)=>{const ws=authority.connections.get(h.id);if(ws)send(ws,{type:'checkpoint',...result});},
    onError:(h,error)=>{const ws=authority.connections.get(h.id);if(ws){send(ws,{type:'checkpoint-error',message:error.message});if(error instanceof SaveConflict){authority.detach(h.id,ws);ws.close(4009,'Cloud save conflict. Recovery retained.');}}}
  }):null;
  const stats={ticks:0,frames:0,bytesOut:0,bytesIn:0,maxTickMs:0,commitMs:0,tickSamples:[],startedAt:Date.now()};
  const eventLoop=monitorEventLoopDelay({resolution:10});eventLoop.enable();
  const server=http.createServer((req,res)=>{
    if(req.url!=='/health'){if(serve){serve(req,res);return;}res.writeHead(404).end();return;}
    res.writeHead(authority.failed?503:200,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify({ready:!authority.failed,protocol:PROTOCOL}));
  });
  // Bound compression work and discard dictionaries between messages. Browsers
  // negotiate this transparently; clients without it keep the same protocol.
  const wss=new WebSocketServer({noServer:true,maxPayload:1024*1024,perMessageDeflate:{serverNoContextTakeover:true,clientNoContextTakeover:true,concurrencyLimit:4,threshold:1024,zlibDeflateOptions:{level:3,memLevel:4}}});
  server.on('upgrade',(req,socket,head)=>{
    if(req.url!=='/royale'||!origins.includes(req.headers.origin)||wss.clients.size>=maxConnections){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  });
  function send(ws,message) {
    if(ws.readyState!==1)return;
    if(ws.bufferedAmount>2*1024*1024){ws.close(4008,'Connection too slow. Reconnect to resume.');return;}
    if(message.type==='state'){
      message={...message,cloudPending:ws.cloudCommand||null};
      const reset=!ws.stateSerial||ws.stateSerial%200===0;
      const {next,delta}=runtimeDelta(reset?null:ws.baseline,message.game);ws.baseline=next;
      const peers=runtimeDelta(reset?null:ws.peerBaseline,encodeRuntime(message.nearby));ws.peerBaseline=peers.next;
      message={...message,game:undefined,nearby:undefined,delta,peerDelta:peers.delta,base:ws.stateSerial||0,serial:(ws.stateSerial||0)+1};ws.stateSerial=message.serial;
    }
    const data=JSON.stringify(message);stats.bytesOut+=Buffer.byteLength(data);ws.send(data);
  }
  function save() {const start=performance.now();authority.commit();stats.commitMs+=performance.now()-start;}
  function publish(commit=true) {
    if(commit)save();
    for(const [id,ws] of authority.connections){const h=authority.state.heroes.get(id);send(ws,{type:'state',...authority.view(h.owner,id)});}
    for(const h of authority.state.heroes.values())h.game.drain();stats.frames++;
  }
  function step() {
    const start=performance.now(),zones=checkpoints?new Map([...authority.state.heroes.values()].map(h=>[h.id,h.zone])):null;authority.tick();stats.ticks++;
    if(checkpoints)for(const h of authority.state.heroes.values())if(h.cloud&&h.zone!==zones.get(h.id))void checkpoints.saveHero(h,{latest:true}).catch(()=>{});
    if(authority.dirty||stats.ticks%6===0)save();
    if(stats.ticks%6===0)publish(false);
    const ms=performance.now()-start;stats.maxTickMs=Math.max(stats.maxTickMs,ms);stats.tickSamples.push(ms);if(stats.tickSamples.length>3600)stats.tickSamples.shift();
  }
  let last=performance.now(),lag=0,timer=null;
  if(autoTick)timer=setInterval(()=>{
    try {
      const now=performance.now();lag+=now-last;last=now;
      authority.overloaded=lag>100||eventLoop.percentile(99)/1e6>100;
      // Slow simulation under load, never run an unbounded catch-up spiral.
      let steps=0;while(lag>=1000/60&&steps++<6){step();lag-=1000/60;}
      lag=Math.min(lag,100);
    }catch(error){console.error(JSON.stringify({event:'authority_failure',message:error.message}));authority.failed=true;for(const ws of wss.clients)ws.close(1011,'Persistence unavailable. Last confirmed state is preserved.');clearInterval(timer);}
  },8);
  const checkpointTimer=checkpoints?setInterval(()=>void checkpoints.due(),250):null;
  const overloadWindow=setInterval(()=>eventLoop.reset(),1000);
  const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);
  wss.on('connection',ws=>{
    ws.alive=true;ws.on('pong',()=>ws.alive=true);
    let account=null,heroId=null,authenticating=false,accountReady=false,windowAt=Date.now(),messages=0,closed=false;
    const deadline=setTimeout(()=>ws.close(4003,'Authentication timed out.'),10000);
    let expires=null,joinWindowAt=Date.now(),joinAttempts=0;
    ws.on('message',async buffer=>{
      let requestId=null;
      try {
        stats.bytesIn+=buffer.length;
        if(Date.now()-windowAt>1000){windowAt=Date.now();messages=0;}
        if(++messages>90){ws.close(4008,'Input rate exceeded.');return;}
        const m=JSON.parse(buffer.toString());requestId=typeof m?.requestId==='string'?m.requestId:null;if(!m||typeof m!=='object'||Array.isArray(m))throw Error('Invalid message.');
        if(!account) {
          if(m.type==='auth'&&m.protocol!==PROTOCOL){send(ws,{type:'error',fatal:true,message:'Game version mismatch. Reload the game before connecting.'});ws.close(4003);return;}
          if(m.type!=='auth'||authenticating)throw Error('Authenticate first.');authenticating=true;
          try{account=m.kind==='v3'?(v3Bridge?await v3Bridge.authenticate(m.token,{slot:m.slot}):null):await authenticate(m.token);}finally{authenticating=false;}
          if(closed)return;
          if(!account?.id||!Number.isFinite(account.expiresAt))throw Error('Authentication failed.');
          clearTimeout(deadline);expires=setTimeout(()=>ws.close(4003,'Session expired. Reconnect with a refreshed session.'),Math.min(2147483647,Math.max(0,account.expiresAt-Date.now())));
          if(account.kind==='v3'){
            const hero=await checkpoints.open(account);if(closed)return;account.heroId=hero.id;
          }
          accountReady=true;send(ws,{type:'heroes',heroes:authority.list(account.id).filter(h=>!account.heroId||h.id===account.heroId)});return;
        }
        if(!accountReady)throw Error('Wait for your hero to finish loading.');
        if(account.kind==='v3'&&['create','migration-preview','migration-confirm'].includes(m.type))throw Error('Use the hero selected in your V3 game.');
        if(m.type==='list'){send(ws,{type:'heroes',heroes:authority.list(account.id)});return;}
        if(m.type==='migration-preview'||m.type==='migration-confirm'){
          if(heroId)throw Error('Select or migrate one hero at a time.');
          const result=m.type==='migration-preview'?await migrations.preview(account.id,m):await migrations.confirm(account.id,m.ticket);
          send(ws,{type:'migration-result',requestId:m.requestId,...result});return;
        }
        if(m.type==='create') {
          if(!allowNewHeroes)throw Error('Create a local hero first, then review its account transfer.');
          if(heroId)throw Error('Disconnect this hero before creating another.');
          const hero=authority.create(account.id,{slot:m.slot,look:m.look,legacy:m.legacy,sourceId:m.sourceId,confirmed:m.confirmed});
          send(ws,{type:'heroes',heroes:authority.list(account.id),created:hero.id});return;
        }
        if(m.type==='select') {
          if(account.heroId&&m.id!==account.heroId)throw Error('Choose a different hero from the hero selection screen.');
          if(heroId&&heroId!==m.id)throw Error('Reconnect before switching heroes.');
          authority.attach(account.id,m.id,ws);heroId=m.id;send(ws,{type:'state',...authority.view(account.id,heroId)});return;
        }
        if(!heroId)throw Error('Select your hero first.');
        if(authority.connections.get(heroId)!==ws)throw Error('This connection has been superseded.');
        if(m.type==='input'){authority.input(account.id,heroId,m.seq,m.input);return;}
        if(m.type==='release'&&account.kind==='v3'){
          if(ws.cloudCommand)throw Error('Wait for your save to finish.');
          const hero=authority.owner(account.id,heroId);
          if(!hero.game.canSave())throw Error('Leave combat for five seconds before returning to heroes. Eight-second autosave is still active.');
          heroId=null;let result;
          try{result=await checkpoints.release(hero,ws);}catch(error){if(authority.state.heroes.has(hero.id))heroId=hero.id;ws.close(4008,'Reconnect to confirm your save.');throw error;}
          send(ws,{type:'released',requestId:m.requestId,...result});return;
        }
        if(m.type==='command') {
          if(ws.cloudCommand)throw Error('Wait for your save to finish.');
          if(m.method==='mode'&&m.args?.[0]==='join'){
            if(Date.now()-joinWindowAt>60000){joinWindowAt=Date.now();joinAttempts=0;}
            if(++joinAttempts>10)throw Error('Too many room-code attempts. Wait a minute and try again.');
          }
          const beforeZone=authority.owner(account.id,heroId).zone;
          const result=authority.command(account.id,heroId,m.seq,m.method,m.args);
          if(account.kind==='v3'&&(['save','mode'].includes(m.method)||beforeZone!==authority.owner(account.id,heroId).zone)){
            ws.cloudCommand=m.seq;try{await checkpoints.saveHero(authority.owner(account.id,heroId),{latest:true});}finally{ws.cloudCommand=null;}
          }
          send(ws,{type:'ack',seq:m.seq,result});send(ws,{type:'state',...authority.view(account.id,heroId)});return;
        }
        throw Error('Unsupported message.');
      } catch(error) {send(ws,{type:'error',message:error.message,requestId});}
    });
    ws.on('error',()=>{});
    ws.on('close',()=>{closed=true;clearTimeout(deadline);clearTimeout(expires);if(heroId&&!authority.failed&&authority.connections.get(heroId)===ws)try{const hero=authority.owner(account.id,heroId);authority.detach(heroId,ws);if(checkpoints)void checkpoints.saveHero(hero).catch(()=>{});}catch{authority.failed=true;}});
  });
  server.listen(port,host);
  return {server,wss,authority,stats,step,publish,checkpoints,
    metrics(){const sorted=[...stats.tickSamples].sort((a,b)=>a-b);return {...stats,tickSamples:undefined,tickP95Ms:sorted[Math.floor(sorted.length*.95)]||0,eventLoopP99Ms:eventLoop.percentile(99)/1e6,rssBytes:process.memoryUsage().rss};},
    async close(){clearInterval(checkpointTimer);clearInterval(overloadWindow);clearInterval(timer);clearInterval(heartbeat);eventLoop.disable();for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>server.close(resolve));if(checkpoints)await Promise.allSettled([...authority.state.heroes.values()].filter(h=>h.cloud).map(h=>checkpoints.saveHero(h)));if(!authority.failed)authority.commit();store.close();}
  };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const capacity=MAX_ROOM_PLAYERS,maxConnections=Number(process.env.ROYALE_SERVER_CAPACITY);
  const origins=(process.env.ROYALE_ALLOWED_ORIGINS||'').split(',').filter(Boolean);
  if(!origins.length)throw Error('Set the exact allowed website origins.');
  if(!process.env.ROYALE_DATA||!process.env.ROYALE_V3_SUPABASE_URL||!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error('Set the durable data path, approved V3 backend URL and server-only cloud credential.');
  const path=resolve(process.env.ROYALE_DATA);mkdirSync(dirname(path),{recursive:true,mode:0o700});
  const app=startServer({port:Number(process.env.PORT||8080),host:process.env.HOST||'127.0.0.1',path,capacity,maxConnections,origins,v3Bridge:new V3CloudBridge(),authenticate:async()=>{throw Error('Use your existing V3 ten-digit code and select a hero.');}});
  app.server.on('listening',()=>console.log('Royale authority listening; room capacity '+capacity+'.'));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
}
