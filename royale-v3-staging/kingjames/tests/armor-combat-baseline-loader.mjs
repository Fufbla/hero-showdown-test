// Read the runtime from the exact commit before the armor appearance update.
// Only the new measurement harness is taken from the working tree.
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=new URL('../../../',import.meta.url),ref='bba835f089f2664fd9605b4a8c44309fcad6178e';
const map=new Map(['powers.mjs','cloud-validation.mjs','local-coop/serialize.mjs','eris-ui.mjs'].map(file=>[new URL('royale/'+file,root).pathname,new URL('royale-v3-staging/gameplay/'+file.split('/').at(-1),root).href]));
export async function resolve(specifier,context,next){const r=await next(specifier,context),target=map.get(new URL(r.url).pathname);return target?{url:target,shortCircuit:true}:r;}
export async function load(url,context,next){
 const u=new URL(url);
 if(u.protocol==='file:'&&u.pathname.startsWith(root.pathname)&&u.pathname.endsWith('.mjs')&&!u.pathname.includes('/tests/')){
  const path=u.pathname.slice(root.pathname.length);
  return {format:'module',source:execFileSync('git',['show',ref+':'+path],{cwd:fileURLToPath(root),encoding:'utf8',maxBuffer:4e6}),shortCircuit:true};
 }
 return next(url,context);
}
