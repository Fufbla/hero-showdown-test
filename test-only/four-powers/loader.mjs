import {resolve as baseResolve,load as baseLoad} from '../../tools/release-build/loader.mjs';
import transform from './transform.cjs';
import ui from '../../tools/staging-ui-transform.cjs';
const root=new URL('../../',import.meta.url);
const overrides={'royale-v3-staging/gameplay/powers.mjs':'test-only/four-powers/powers.mjs','royale/powers.mjs':'test-only/four-powers/powers.mjs','royale/power-art.mjs':'test-only/four-powers/art.mjs','royale/local-coop/cloud.mjs':'test-only/four-powers/profile.mjs'};
export async function resolve(specifier,context,next){
 if(specifier.includes('four-base=1'))return next(specifier,context);
 const r=await baseResolve(specifier,context,next),rel=r.url.slice(root.href.length).split('?')[0];
 return overrides[rel]?{url:new URL(overrides[rel],root).href,shortCircuit:true}:r;
}
export async function load(url,context,next){
 if(url.includes('four-base=1'))return next(url,context);
 const r=await baseLoad(url,context,next);
 if(url.startsWith(root.href)&&r.format==='module'){
  const rel=url.slice(root.href.length).split('?')[0];
  return {...r,source:transform(rel,ui(rel,String(r.source),{production:true}))};
 }
 return r;
}
