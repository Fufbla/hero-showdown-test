import {readFileSync} from 'node:fs';
// Exercise the actual browser import map, including costume and armor adapters.
const root=new URL('../../../',import.meta.url);
const html=readFileSync(new URL('../../kingjames/index.html',import.meta.url),'utf8');
const entries=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const map=new Map(Object.entries(entries).map(([key,value])=>[new URL(key,new URL('royale/',root)).href,new URL(value,new URL('royale/',root)).href]));
export async function resolve(specifier,context,next){
 const r=await next(specifier,context);if(r.url.includes('costume-base='))return r;
 const target=map.get(r.url);return target?{url:target,shortCircuit:true}:r;
}
