import fs from 'node:fs/promises';
import path from 'node:path';
import {catalogIndex,saleReady} from '../../royale/cosmetics/state.mjs';
import {validateAsset} from '../../royale/cosmetics/assets.mjs';
const root=path.resolve(import.meta.dirname,'../../royale/cosmetics');
const catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
catalogIndex(catalog);let released=0,blocked=0;const errors=[];
for(const set of catalog.sets){
 if(set.availability!=='released'){blocked++;continue;}
 if(!saleReady(set)){errors.push(set.id+': release reviews, pricing or assets missing');continue;}
 for(const part of set.pieces){
  if(!part.assetManifest?.startsWith('./assets/')){errors.push(part.id+': invalid manifest path');continue;}
  try{const manifest=JSON.parse(await fs.readFile(path.join(root,part.assetManifest),'utf8'));errors.push(...validateAsset(manifest).map(e=>part.id+': '+e));await fs.access(path.join(root,manifest.atlas.url));}catch(e){errors.push(part.id+': '+e.message);}
 }
 released++;
}
console.log(`${catalog.sets.length} registered; ${released} released; ${blocked} blocked pending art/fit review`);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
if(process.argv.includes('--release')&&blocked){console.error('Release blocked: every requested set must pass artwork and fitting review.');process.exitCode=1;}
