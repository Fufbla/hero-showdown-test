#!/usr/bin/env node
import http from 'node:http';import {readFile,stat} from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';import {createAssetCache} from './local-coop-asset-cache.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),port=Number(process.env.PORT||(process.argv.includes('--port')?process.argv[process.argv.indexOf('--port')+1]:4173));
const cachedAsset=createAssetCache({root});
const endpoint='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-v3-staging';
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.wav':'audio/wav','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{
 try{
  const origin=`http://${req.headers.host}`;
  if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){res.writeHead(403);res.end('Local access only');return;}
  const url=new URL(req.url,origin);
  if(url.pathname==='/__local-coop_cloud'){
   if(req.method!=='POST'||req.headers.origin!==origin){res.writeHead(403);res.end('Local browser requests only');return;}
   let body='';for await(const chunk of req){body+=chunk;if(body.length>410000){res.writeHead(413);res.end();return;}}
   const data=JSON.parse(body);if(!['verify','slots','renew','save'].includes(data.action)){res.writeHead(400);res.end('Unsupported action');return;}
   const result=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://fufbla.github.io',...(req.headers.authorization?{Authorization:req.headers.authorization}:{})},body,signal:AbortSignal.timeout(20000)});
   res.writeHead(result.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(await result.text());return;
  }
  if(url.pathname==='/royale/local-coop/config.json'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({endpoint:'/__local-coop_cloud'}));return;}
  if(url.pathname==='/'){res.writeHead(302,{Location:'/royale/local-coop/'});res.end();return;}
  const decoded=decodeURIComponent(url.pathname),file=path.resolve(root,'.'+decoded);if(!file.startsWith(root+path.sep)||decoded.split('/').some(p=>p.startsWith('.'))){res.writeHead(403);res.end();return;}
  let target=file,data;try{if((await stat(target)).isDirectory())target=path.join(target,'index.html');data=await readFile(target);}catch(e){if(e.code!=='ENOENT')throw e;data=await cachedAsset(path.relative(root,target));if(!data)throw e;}
  res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:502,{'Content-Type':'text/plain'});res.end(e.code==='ENOENT'?'Not found':'Request failed. Retry when connected.');}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'The test is already running, or port 4173 is busy. Close the earlier test window before starting again.':'The local test server could not start.');process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
 const url=`http://127.0.0.1:${port}/royale/local-coop/`;console.log(`Local co-op: ${url}`);
 console.log('Keep this window open while playing. Choose Leave Local Co-op for both heroes before closing it.');
 if(process.argv.includes('--open-browser')&&process.platform==='darwin'){const child=spawn('/usr/bin/open',[url],{stdio:'ignore'});child.on('error',()=>console.log('Open the address above in your browser.'));child.unref();}
});
