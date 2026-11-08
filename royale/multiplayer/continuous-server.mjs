import {resolve,dirname} from 'node:path';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {startServer} from './server.mjs';
import {ContinuousTestBridge} from './continuous-cloud.mjs';

export function startContinuousServer({bridge=new ContinuousTestBridge(),origins=[],path,host='127.0.0.1',port=0,...options}={}){
 if(!path||path===':memory:')throw Error('A persistent test data path is required.');
 if(!origins.length||origins.some(o=>{try{return new URL(o).origin!==o;}catch{return true;}}))throw Error('Set exact allowed test website origins.');
 mkdirSync(dirname(resolve(path)),{recursive:true,mode:0o700});
 let windowAt=Date.now(),copies=0;
 return startServer({...options,snapshotHz:30,path,host,port,origins,capacity:5,maxConnections:5,v3Bridge:bridge,allowNewHeroes:false,migrationBridge:null,
  authenticate:async()=>{throw Error('This endpoint accepts isolated continuous-test heroes only.');},
  serve:async(req,res)=>{
   const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
   const reply=(code,body)=>res.writeHead(code,headers).end(JSON.stringify(body));
   if(!origins.includes(req.headers.origin)){reply(403,{error:'Test origin required.'});return;}
   headers['Access-Control-Allow-Origin']=req.headers.origin;
   headers['Access-Control-Allow-Headers']='Authorization, Content-Type';headers['Access-Control-Allow-Methods']='POST, OPTIONS';
   if(req.url!=='/test/copy'){reply(404,{error:'Not found.'});return;}
   if(req.method==='OPTIONS'){res.writeHead(204,headers).end();return;}
   if(req.method!=='POST'){reply(405,{error:'POST required.'});return;}
   if(Date.now()-windowAt>3600000){windowAt=Date.now();copies=0;}
   if(++copies>30){reply(429,{error:'Copy limit reached. Reuse an existing test hero.'});return;}
   try{
    let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4096){reply(413,{error:'Request too large.'});return;}}
    const body=JSON.parse(raw),source=req.headers.authorization?.replace(/^Bearer /,'');
    // Client retains this receipt before requesting; retry cannot create another hero.
    const result=await bridge.copyTestHero(source,{id:body.id,token:body.token});reply(200,result);
   }catch{reply(400,{error:'Could not copy that test hero. Check the source session and retained receipt.'});}
  }
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const app=startContinuousServer({path:process.env.ROYALE_DATA,host:process.env.HOST||'0.0.0.0',port:Number(process.env.PORT||8080),origins:(process.env.ROYALE_ALLOWED_ORIGINS||'').split(',').filter(Boolean)});
 app.server.on('listening',()=>console.log('Isolated continuous test authority listening.'));
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,async()=>{await app.close();process.exit(0);});
}
