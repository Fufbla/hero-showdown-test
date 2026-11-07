// Disposable LOCAL review only. Fake identities and cloud rows must never ship.
import {startServer} from '../server.mjs';
import {MemoryV3Bridge} from './v3-fixture.mjs';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
const portFlag=process.argv.indexOf('--port');
const root=fileURLToPath(new URL('../../../',import.meta.url)),port=Number(process.env.PORT||(portFlag>=0?process.argv[portFlag+1]:4175)),bridge=new MemoryV3Bridge();
const identities=Array.from({length:6},(_,i)=>bridge.identity('Co-op Hero '+(i+1)));
const reviewPrefix='royale-review-'+randomUUID()+':';
const app=startServer({port,host:'127.0.0.1',capacity:5,maxConnections:12,origins:['http://localhost:'+port,'http://127.0.0.1:'+port],v3Bridge:bridge,serve:async(req,res)=>{
  const json=(body,status=200)=>res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify(body));
  try{
    const url=new URL(req.url,'http://localhost:'+port);
    if(url.pathname==='/'){res.writeHead(302,{Location:'/royale-v3-staging/?player='+url.searchParams.get('player')}).end();return;}
    if(url.pathname==='/royale/multiplayer/config.json'){json({endpoint:'ws://'+req.headers.host+'/royale'});return;}
    if(url.pathname==='/fixture-api'){
      let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw),token=req.headers.authorization?.replace('Bearer ',''),identity=identities.find(i=>i.token===token);
      if(['create','verify','renew'].includes(body.action)){
        const i=Number(String(body.code||body.refresh||'1')[0])-1,chosen=identities[Math.max(0,Math.min(5,i))];json({code:String(i+1).repeat(10),access:chosen.token,refresh:String(i+1),expires_in:900});return;
      }
      if(!identity){json({error:'Fixture authentication required'},401);return;}
      const profile=identity.account.profile;
      if(body.action==='slots'){
        const row=await bridge.read(profile,0);json({slots:[{slot_number:1,...row},{slot_number:2,snapshot:null,revision:0},{slot_number:3,snapshot:null,revision:0}]});return;
      }
      if(body.action==='save'){const row=await bridge.write(profile,body.slot-1,body.revision,body.snapshot);json(row);return;}
      json({error:'Unsupported fixture action'},400);return;
    }
    if(url.pathname==='/fixture-checkpoints'){json(bridge.writes.map(w=>({profile:w.profile,slot:w.slot,revision:w.revision,coins:w.snapshot.coins,x:w.snapshot.world.location.x,updated_at:w.updated_at})));return;}
    const pathname=decodeURIComponent(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname),path=resolve(root,'.'+pathname);
    const types={'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
    if(!path.startsWith(root)||!types[extname(path)]||pathname.includes('/node_modules/')||pathname.includes('/backend/')||pathname.includes('/.')){res.writeHead(404).end();return;}
    let bytes=await readFile(path);
    if(pathname==='/royale-v3-staging/app.mjs')bytes=Buffer.from(bytes.toString().replace('https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-v3-staging','/fixture-api').replaceAll('royale-v3-play:',reviewPrefix));
    if(pathname==='/royale/app.mjs')bytes=Buffer.from(bytes.toString().replaceAll('royale-v3-play:',reviewPrefix));
    if(pathname==='/royale-v3-staging/index.html')bytes=Buffer.from(bytes.toString().replace('V3 isolated test — original saves remain untouched.','LOCAL REVIEW · Disposable test heroes only. Codes 1111111111 through 6666666666. No live saves.'));
    res.writeHead(200,{'Content-Type':types[extname(path)],'Cache-Control':'no-store'}).end(bytes);
  }catch(error){json({error:error.message},409);}
}});
app.server.on('listening',()=>console.log('Local V3 five-player review: http://localhost:'+port));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{await app.close();process.exit(0);});
