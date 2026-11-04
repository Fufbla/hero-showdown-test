import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {mkdirSync} from 'node:fs';
import {performance,monitorEventLoopDelay} from 'node:perf_hooks';
import {WebSocketServer} from 'ws';
import {AuthorityStore} from './store.mjs';
import {Authority} from './authority.mjs';
import {runtimeDelta} from './delta.mjs';
import {CLOUD_CONFIG} from '../cloud-config.mjs';

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
export function startServer({port=0,host='127.0.0.1',path=':memory:',capacity,maxConnections=capacity,origins=[],authenticate=authenticateSupabase,autoTick=true,serve=null}={}) {
  const store=new AuthorityStore(path),authority=new Authority(store,{capacity,maxConnections});
  const stats={ticks:0,frames:0,bytesOut:0,bytesIn:0,maxTickMs:0,commitMs:0,tickSamples:[],startedAt:Date.now()};
  const eventLoop=monitorEventLoopDelay({resolution:10});eventLoop.enable();
  const server=http.createServer((req,res)=>{
    if(req.url!=='/health'){if(serve){serve(req,res);return;}res.writeHead(404).end();return;}
    res.writeHead(authority.failed?503:200,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify({ready:!authority.failed,protocol:1}));
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:1024*1024,perMessageDeflate:false});
  server.on('upgrade',(req,socket,head)=>{
    if(req.url!=='/royale'||!origins.includes(req.headers.origin)||wss.clients.size>=maxConnections){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}
    wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  });
  function send(ws,message) {
    if(ws.readyState!==1)return;
    if(ws.bufferedAmount>2*1024*1024){ws.close(4008,'Connection too slow. Reconnect to resume.');return;}
    if(message.type==='state'){
      const {next,delta}=runtimeDelta(ws.stateSerial%200===0?null:ws.baseline,message.game);ws.baseline=next;
      message={...message,game:undefined,delta,base:ws.stateSerial||0,serial:(ws.stateSerial||0)+1};ws.stateSerial=message.serial;
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
    const start=performance.now();authority.tick();stats.ticks++;
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
    }catch{authority.failed=true;for(const ws of wss.clients)ws.close(1011,'Persistence unavailable. Last confirmed state is preserved.');clearInterval(timer);}
  },8);
  const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},15000);
  wss.on('connection',ws=>{
    ws.alive=true;ws.on('pong',()=>ws.alive=true);
    let account=null,heroId=null,authenticating=false,windowAt=Date.now(),messages=0,closed=false;
    const deadline=setTimeout(()=>ws.close(4003,'Authentication timed out.'),10000);
    let expires=null;
    ws.on('message',async buffer=>{
      try {
        stats.bytesIn+=buffer.length;
        if(Date.now()-windowAt>1000){windowAt=Date.now();messages=0;}
        if(++messages>90){ws.close(4008,'Input rate exceeded.');return;}
        const m=JSON.parse(buffer.toString());if(!m||typeof m!=='object'||Array.isArray(m))throw Error('Invalid message.');
        if(!account) {
          if(m.type!=='auth'||authenticating)throw Error('Authenticate first.');authenticating=true;
          try{account=await authenticate(m.token);}finally{authenticating=false;}
          if(closed)return;
          if(!account?.id||!Number.isFinite(account.expiresAt))throw Error('Authentication failed.');
          clearTimeout(deadline);expires=setTimeout(()=>ws.close(4003,'Session expired. Reconnect with a refreshed session.'),Math.min(2147483647,Math.max(0,account.expiresAt-Date.now())));
          send(ws,{type:'heroes',heroes:authority.list(account.id)});return;
        }
        if(m.type==='list'){send(ws,{type:'heroes',heroes:authority.list(account.id)});return;}
        if(m.type==='create') {
          if(heroId)throw Error('Disconnect this hero before creating another.');
          const hero=authority.create(account.id,{slot:m.slot,look:m.look,legacy:m.legacy,sourceId:m.sourceId,confirmed:m.confirmed});
          send(ws,{type:'heroes',heroes:authority.list(account.id),created:hero.id});return;
        }
        if(m.type==='select') {
          if(heroId&&heroId!==m.id)throw Error('Reconnect before switching heroes.');
          authority.attach(account.id,m.id,ws);heroId=m.id;send(ws,{type:'state',...authority.view(account.id,heroId)});return;
        }
        if(!heroId)throw Error('Select your hero first.');
        if(authority.connections.get(heroId)!==ws)throw Error('This connection has been superseded.');
        if(m.type==='input'){authority.input(account.id,heroId,m.seq,m.input);return;}
        if(m.type==='command') {
          const result=authority.command(account.id,heroId,m.seq,m.method,m.args);send(ws,{type:'ack',seq:m.seq,result});send(ws,{type:'state',...authority.view(account.id,heroId)});return;
        }
        throw Error('Unsupported message.');
      } catch(error) {send(ws,{type:'error',message:error.message});}
    });
    ws.on('error',()=>{});
    ws.on('close',()=>{closed=true;clearTimeout(deadline);clearTimeout(expires);if(heroId&&!authority.failed)try{authority.detach(heroId,ws);}catch{authority.failed=true;}});
  });
  server.listen(port,host);
  return {server,wss,authority,stats,step,publish,
    metrics(){const sorted=[...stats.tickSamples].sort((a,b)=>a-b);return {...stats,tickSamples:undefined,tickP95Ms:sorted[Math.floor(sorted.length*.95)]||0,eventLoopP99Ms:eventLoop.percentile(99)/1e6,rssBytes:process.memoryUsage().rss};},
    async close(){clearInterval(timer);clearInterval(heartbeat);eventLoop.disable();for(const ws of wss.clients)ws.terminate();await new Promise(resolve=>server.close(resolve));if(!authority.failed)authority.commit();store.close();}
  };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const capacity=Number(process.env.ROYALE_ROOM_CAPACITY),maxConnections=Number(process.env.ROYALE_SERVER_CAPACITY);
  const origins=(process.env.ROYALE_ALLOWED_ORIGINS||'').split(',').filter(Boolean);
  if(!origins.length)throw Error('Set the exact allowed website origins.');
  const path=resolve(process.env.ROYALE_DATA||'./data/authority.sqlite');mkdirSync(dirname(path),{recursive:true,mode:0o700});
  const app=startServer({port:Number(process.env.PORT||8080),host:process.env.HOST||'127.0.0.1',path,capacity,maxConnections,origins});
  app.server.on('listening',()=>console.log('Royale authority listening; room capacity '+capacity+'.'));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,async()=>{await app.close();process.exit(0);});
}
