// Namespace the complete, hash-verified static build; never package a site root index.
import {buildPlaytest} from './build-playtest.mjs';
import {createHash} from 'node:crypto';
import {MULTIPLAYER_ENABLED} from '../release-config.mjs';
import {mkdir,rename,writeFile,readFile,rm,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export async function buildSolo(destination){
 if(MULTIPLAYER_ENABLED)throw Error('Solo deployment requires MULTIPLAYER_ENABLED=false');
 if(!destination||!path.isAbsolute(destination))throw Error('Pass an absolute empty output directory');
 await mkdir(destination,{recursive:true});if((await readdir(destination)).length)throw Error('Output must be empty');
 const root=path.join(destination,'royale');const result=await buildPlaytest(root);
 await rename(path.join(root,'royale'),path.join(root,'game'));
 const manifest=JSON.parse(await readFile(path.join(root,'build-manifest.json'),'utf8'));
 for(const file of manifest.files)file.path='royale/'+file.path.replace(/^royale\//,'game/');
 // The standalone release returns to Healthia instead of redirecting into itself.
 const entryPath=path.join(root,'game/index.html');
 const entry=(await readFile(entryPath,'utf8')).replace('href="../index.html"','href="https://healthia.me/"').replace('Return to Hero Showdown','Return to Healthia');
 await writeFile(entryPath,entry);
 const record=manifest.files.find(f=>f.path==='royale/game/index.html');
 record.bytes=Buffer.byteLength(entry);record.sha256=createHash('sha256').update(entry).digest('hex');
 manifest.multiplayerEnabled=false;
 await writeFile(path.join(root,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 await writeFile(path.join(root,'index.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=game/"><title>Hero Showdown Royale</title><a href="game/">Play Hero Showdown Royale</a></html>\n');
 await rm(path.join(root,'START-HERE.txt'));
 await writeFile(path.join(root,'START-HERE.txt'),'SOLO RELEASE\nServe the parent directory with a static HTTP server, then open /royale/. For local testing: python3 -m http.server 8000; open http://localhost:8000/royale/. On a phone on the same Wi-Fi use the computer IP instead. This is static HTML/JS/assets; no Node backend or WebSocket service is required.\nUpload only the royale/ directory to a verified static host. Do not replace an existing site root. Hostinger AI Builder cannot import this archive directly; see SOLO-DEPLOYMENT.md in the source repository.\nSaves stay in the same browser and origin. Pause > Save Game outside combat. Changing domain, browser, or using private browsing does not transfer saves. Account-linked heroes remain protected and require their account backend.\n');
 return {...result,output:destination,multiplayerEnabled:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildSolo(process.argv[2])));
