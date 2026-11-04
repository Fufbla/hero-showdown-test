// Local managed preview only. Not imported by server.mjs or a deployment entry.
import {startServer} from '../server.mjs';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
const tokens=new Map(),root=fileURLToPath(new URL('../../',import.meta.url));
const port=Number(process.env.PORT||4173);
startServer({host:'0.0.0.0',port,capacity:32,origins:['http://terminal.local:'+port,'http://localhost:'+port],authenticate:async token=>{const user=tokens.get(token);if(!user)throw Error('Invalid review session.');return user;},serve:async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(url.pathname==='/fixture-session'){
      const player=url.searchParams.get('player');if(!/^[1-4]$/.test(player))throw Error('Invalid test player.');
      const token=randomBytes(32).toString('hex');tokens.set(token,{id:'review-'+player,expiresAt:Date.now()+3600000});res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'}).end(JSON.stringify({token}));return;
    }
    const pathname=url.pathname==='/'?'/multiplayer/tests/review.html':decodeURIComponent(url.pathname),path=resolve(root,'.'+pathname);
    const type={'.mjs':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml'}[extname(path)];
    if(!path.startsWith(root)||!type||path.includes('/node_modules/')||path.includes('/backend/')){res.writeHead(404).end();return;}
    res.writeHead(200,{'content-type':type,'cache-control':'no-cache'}).end(await readFile(path));
  }catch{res.writeHead(404).end();}
}}).server.on('listening',()=>console.log('Disposable Royale multiplayer review ready on '+port));
