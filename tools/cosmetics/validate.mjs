import fs from 'node:fs/promises';
import path from 'node:path';
import {catalogIndex,saleReady} from '../../royale/cosmetics/state.mjs';
import {validateAsset} from '../../royale/cosmetics/assets.mjs';
const root=path.resolve(import.meta.dirname,'../../royale/cosmetics');
const catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
catalogIndex(catalog);let released=0,blocked=0,manifests=0;const errors=[];
for(const set of catalog.sets){
 if(set.coinPrice!==700)errors.push(set.id+': a complete outfit must cost 700 coins');
 if(set.pieces.reduce((sum,p)=>sum+p.coinPrice,0)!==700)errors.push(set.id+': individual piece prices must total 700 coins');
 if(set.availability!=='released')blocked++;
 else if(!saleReady(set))errors.push(set.id+': release reviews, pricing or assets missing');
 for(const part of set.pieces){
  if(!part.assetManifest&&set.availability==='art-pending')continue;
  if(!part.assetManifest?.startsWith('./assets/')){errors.push(part.id+': invalid manifest path');continue;}
  try{const manifest=JSON.parse(await fs.readFile(path.join(root,part.assetManifest),'utf8'));errors.push(...validateAsset(manifest).map(e=>part.id+': '+e));await fs.access(path.join(root,manifest.atlas.url));manifests++;}catch(e){errors.push(part.id+': '+e.message);}
 }
 if(set.availability==='released')released++;
}
console.log(`${catalog.sets.length} registered; ${manifests} piece manifests checked; ${released} released; ${blocked} blocked pending art/fit review`);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
if(process.argv.includes('--release')&&blocked){console.error('Release blocked: every requested set must pass artwork and fitting review.');process.exitCode=1;}
