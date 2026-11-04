// Local managed preview only. Not imported by server.mjs or a deployment entry.
import {BOSS_ART_DEPENDENCIES} from '../../boss-art.mjs';
import {MemoryMigrationBridge} from './migration-fixture.mjs';
import {startServer} from '../server.mjs';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const tokens=new Map(),root=fileURLToPath(new URL('../../',import.meta.url));
const shared=new Set(['assets/animation/motion-core.js',...BOSS_ART_DEPENDENCIES]);
const port=Number(process.env.PORT||4173);
startServer({allowNewHeroes:true,migrationBridge:new MemoryMigrationBridge(),host:'0.0.0.0',port,capacity:32,origins:['http://terminal.local:'+port,'http://localhost:'+port],authenticate:async token=>{const user=tokens.get(token);if(!user)throw Error('Invalid review session.');return user;},serve:async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/fixture-session'){
      const player=url.searchParams.get('player');if(!/^[1-4]$/.test(player))throw Error('Invalid test player.');
      const token=randomBytes(32).toString('hex');tokens.set(token,{id:'review-'+player,expiresAt:Date.now()+3600000});res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify({token}));return;
    }
    if(url.pathname==='/multiplayer/config.json'){res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify({endpoint:'ws://'+req.headers.host+'/royale',review:true}));return;}
    const pathname=url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname),path=resolve(root,'.'+pathname);
    const type={'.js':'text/javascript','.mjs':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'}[extname(path)];
    if(!path.startsWith(root)||!type||path.includes('/node_modules/')||path.includes('/backend/')){res.writeHead(404).end();return;}
    let bytes;
    if(shared.has(pathname.slice(1))){try{bytes=await readFile(resolve(root,'..',pathname.slice(1)));}catch{/* A packaged preview keeps the same assets inside its root. */}}
    bytes??=await readFile(path);res.writeHead(200,{'content-type':type,'cache-control':'no-cache'}).end(bytes);
  }catch{res.writeHead(404).end();}
}}).server.on('listening',()=>console.log('Disposable Royale multiplayer review ready on '+port));
