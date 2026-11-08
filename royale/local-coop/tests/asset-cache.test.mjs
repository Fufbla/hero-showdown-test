import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,mkdir} from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createHash} from 'node:crypto';
import {createAssetCache} from '../../../tools/local-coop-asset-cache.mjs';
const commit='02412e2be008c156bd2398ee40854c458871d4ce';
async function fixture(fn){const root=await mkdtemp(path.join(os.tmpdir(),'coop-art-'));try{const data=Buffer.from('verified-art'),name='royale/assets/hero/example.png';await writeFile(path.join(root,'local-coop-assets.json'),JSON.stringify({commit,files:{[name]:{bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')}}}));await fn({root,data,name});}finally{await rm(root,{recursive:true,force:true});}}
test('artifact cache fetches only pinned artwork, coalesces and reuses verified bytes',()=>fixture(async({root,data,name})=>{
 let calls=0;const get=createAssetCache({root,fetcher:async(url,options)=>{calls++;assert.equal(url,'https://raw.githubusercontent.com/Fufbla/hero-showdown-test/'+commit+'/'+name);assert.equal(options.redirect,'error');return {ok:true,arrayBuffer:async()=>data};}});
 const copies=await Promise.all([get(name),get(name)]);assert(copies.every(x=>x.equals(data)));assert.equal(calls,1);assert((await get(name)).equals(data));assert.equal(calls,1);
 for(const bad of ['../private','assets/../private','https://example.org','tools/serve-local-coop.mjs','assets/unknown.png'])assert.equal(await get(bad),null);assert.equal(calls,1);
}));
test('mismatched remote artwork is rejected instead of cached or served',()=>fixture(async({root,name})=>{
 const get=createAssetCache({root,fetcher:async()=>({ok:true,arrayBuffer:async()=>Buffer.from('wrong')})});await assert.rejects(get(name),/verification/);await assert.rejects(readFile(path.join(root,'.local-coop-cache',commit,name)),{code:'ENOENT'});
}));
test('damaged cached bytes are replaced only with verified artwork',()=>fixture(async({root,data,name})=>{
 const file=path.join(root,'.local-coop-cache',commit,name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,'damaged');let calls=0;
 const get=createAssetCache({root,fetcher:async()=>{calls++;return {ok:true,arrayBuffer:async()=>data};}});assert((await get(name)).equals(data));assert.equal(calls,1);assert((await readFile(file)).equals(data));
}));
