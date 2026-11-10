import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import path from 'node:path';

// Optional download package support. Normal repository checkouts use local assets.
// Only named artwork from one immutable commit is fetched; no user data is sent.
export function createAssetCache({root,fetcher=fetch}){
 let manifestPromise;const pending=new Map();let running=0;const waiters=[];
 const manifest=()=>manifestPromise??=readFile(path.join(root,'local-coop-assets.json'),'utf8').then(JSON.parse).then(m=>{
  if(!/^[a-f0-9]{40}$/.test(m.commit)||!m.files||typeof m.files!=='object')throw Error('Invalid asset manifest.');return m;
 }).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 async function limited(fn){if(running<4)running++;else await new Promise(r=>waiters.push(r));try{return await fn();}finally{const next=waiters.shift();if(next)next();else running--;}}
 return async relative=>{
  if(!/^(assets|royale\/assets)\//.test(relative)||relative.split('/').some(p=>p.startsWith('.')))return null;
  const m=await manifest(),spec=m?.files[relative];if(!spec)return null;
  if(!/^[a-f0-9]{64}$/.test(spec.sha256)||!Number.isSafeInteger(spec.bytes)||spec.bytes<1||spec.bytes>64*1024*1024)throw Error('Invalid asset entry.');
  if(pending.has(relative))return pending.get(relative);
  const valid=bytes=>bytes.length===spec.bytes&&createHash('sha256').update(bytes).digest('hex')===spec.sha256;
  const work=(async()=>{
   const target=path.join(root,'.local-coop-cache',m.commit,relative);
   try{const cached=await readFile(target);if(valid(cached))return cached;}catch(e){if(e.code!=='ENOENT')throw e;}
   return limited(async()=>{
    const url='https://raw.githubusercontent.com/Fufbla/hero-showdown-test/'+m.commit+'/'+relative.split('/').map(encodeURIComponent).join('/');
    const response=await fetcher(url,{signal:AbortSignal.timeout(45000),redirect:'error'});if(!response.ok)throw Error('Artwork download failed.');
    const data=Buffer.from(await response.arrayBuffer());if(!valid(data))throw Error('Artwork verification failed.');
    await mkdir(path.dirname(target),{recursive:true});const temp=target+'.'+randomUUID()+'.tmp';await writeFile(temp,data);await rename(temp,target);return data;
   });
  })().finally(()=>pending.delete(relative));pending.set(relative,work);return work;
 };
}
