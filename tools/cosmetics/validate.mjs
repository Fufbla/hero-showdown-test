import fs from 'node:fs/promises';
import path from 'node:path';
import {catalogIndex,saleReady} from '../../royale/cosmetics/state.mjs';
import {OUTFIT_POLICIES,OUTFIT_PRICE,RETIRED_COSMETIC_IDS,historicalPiece} from '../../royale/cosmetics/outfit-policy.mjs';
import {validateAsset} from '../../royale/cosmetics/assets.mjs';
const root=path.resolve(import.meta.dirname,'../../royale/cosmetics');
const catalog=JSON.parse(await fs.readFile(path.join(root,'catalog.json'),'utf8'));
catalogIndex(catalog);let released=0,blocked=0,manifests=0;const errors=[];
for(const set of catalog.sets){
 if(set.coinPrice!==OUTFIT_PRICE)errors.push(set.id+': a complete outfit must cost 700 coins');
 if(OUTFIT_POLICIES[set.id].historicalPieces.reduce((sum,p)=>sum+p.coinPrice,0)!==OUTFIT_PRICE)errors.push(set.id+': historical ownership credit must total 700 coins');
 if(set.availability!=='released')blocked++;
 else if(!saleReady(set))errors.push(set.id+': release reviews, pricing or assets missing');
 for(const part of set.pieces){
  if(RETIRED_COSMETIC_IDS.includes(part.id)||part.category==='headwear')errors.push(part.id+': retired headwear cannot be active');
  if(part.coinPrice!==historicalPiece(part.id)?.coinPrice)errors.push(part.id+': historical piece credit cannot change');
  if(!part.assetManifest&&set.availability==='art-pending')continue;
  if(!part.assetManifest?.startsWith('./assets/')){errors.push(part.id+': invalid manifest path');continue;}
  try{const manifest=JSON.parse(await fs.readFile(path.join(root,part.assetManifest),'utf8'));errors.push(...validateAsset(manifest).map(e=>part.id+': '+e));if(manifest.layers?.some(layer=>layer.attach==='head'||layer.part==='headwear'||layer.pass==='headwear'))errors.push(part.id+': active outfits cannot contain headwear');await fs.access(path.join(root,manifest.atlas.url));manifests++;}catch(e){errors.push(part.id+': '+e.message);}
 }
 if(set.availability==='released')released++;
}
console.log(`${catalog.sets.length} registered; ${manifests} piece manifests checked; ${released} released; ${blocked} blocked pending art/fit review`);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
if(process.argv.includes('--release')&&blocked){console.error('Release blocked: every requested set must pass artwork and fitting review.');process.exitCode=1;}
