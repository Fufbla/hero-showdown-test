// Prepare the live function from its exact retrieved v10 baseline. No database
// migrations or account writes. The sole behavior change is six allowed IDs.
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url),base=new URL('royale/fashion/backend-v3/baseline/',root);
const dest=new URL('royale/fashion/backend-v3/deploy/',root);
async function walk(dir,prefix=''){
 const results=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const name=prefix+entry.name;
  if(entry.isDirectory())results.push(...await walk(new URL(entry.name+'/',dir),name+'/'));
  else results.push({name,content:await readFile(new URL(entry.name,dir),'utf8')});
 }
 return results;
}
const files=await walk(base);
const policy='cloud/cosmetics/outfit-policy.mjs';
const old=files.find(f=>f.name===policy);
if(!old)throw Error('Live policy baseline missing');
old.name='cloud/cosmetics/outfit-policy-base.mjs';
files.push({name:policy,content:`import * as base from './outfit-policy-base.mjs';
import {extendPolicy} from '../../fashion/extend-policy.mjs';
export const {OUTFIT_PRICE,CLOTHING_SLOTS,LEGACY_CLOTHING_SLOTS,RETIRED_COSMETIC_IDS,isRetiredCosmeticId}=base;
export const OUTFIT_POLICY_VERSION='approved-collection-v4-fashion';
export const {OUTFIT_POLICIES,historicalPiece,outfitForPiece}=extendPolicy(base);
`});
for(const name of ['definitions.mjs','extend-policy.mjs'])files.push({name:'fashion/'+name,content:await readFile(new URL('royale/fashion/'+name,root),'utf8')});
for(const file of files){const url=new URL(file.name,dest);await mkdir(path.dirname(fileURLToPath(url)),{recursive:true});await writeFile(url,file.content);}
const manifest={projectId:'adakwbhxiuatjvphutgo',functionName:'royale-v3-staging',baselineVersion:10,
 entrypoint:'cloud/backend-v3/index.ts',verifyJWT:false,databaseMigration:false,
 files:Object.fromEntries(files.map(f=>[f.name,createHash('sha256').update(f.content).digest('hex')]))};
await writeFile(new URL('royale/fashion/backend-v3/package.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared '+files.length+' live save-service files. No remote changes made.');
