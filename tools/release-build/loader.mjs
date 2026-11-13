// Node tests use the same approved import graph and release-only transformations.
import {readFileSync} from 'node:fs';
import transform from './transform.cjs';
import fashionMap from './fashion-map.cjs';
const root=new URL('../../',import.meta.url);
const html=readFileSync(new URL('royale-v3-staging/kingjames/index.html',root),'utf8');
const entries=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const map=new Map(Object.entries(entries).filter(([key])=>!key.includes('?')).map(([key,value])=>[new URL(key,new URL('royale/',root)).href.split('?')[0],new URL(value,new URL('royale/',root)).href.split('?')[0]]));
map.delete(new URL('royale/app.mjs',root).href);
map.set(new URL('royale/renderer.mjs',root).href,new URL('royale-v3-staging/kingjames/renderer.mjs',root).href);
map.set(new URL('royale/hero-art.mjs',root).href,new URL('royale/release-src/presentation.mjs',root).href);
export async function resolve(specifier,context,next){
 const r=await next(specifier,context);if(/[?&](?:costume-base|fashion-base|bossFallback)=1/.test(r.url))return r;
 let target=map.get(r.url.split('?')[0])||r.url;
 const rel=target.slice(root.href.length).split('?')[0];
 if(fashionMap[rel])target=new URL(fashionMap[rel],root).href;
 return target!==r.url?{url:target,shortCircuit:true}:r;
}
export async function load(url,context,next){
 const result=await next(url,context);
 if(url.startsWith(root.href)&&result.format==='module')return {...result,source:transform(url.slice(root.href.length).split('?')[0],String(result.source))};
 return result;
}
