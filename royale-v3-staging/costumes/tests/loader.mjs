const root=new URL('../../../',import.meta.url);
const mappings={
 'royale/powers.mjs':'royale-v3-staging/gameplay/powers.mjs','royale/equipment.mjs':'royale-v3-staging/gameplay/equipment.mjs',
 'royale/cloud-validation.mjs':'royale-v3-staging/gameplay/cloud-validation.mjs',
 'royale/cosmetics/state.mjs':'royale-v3-staging/costumes/state.mjs',
 'royale/cosmetics/outfit-policy.mjs':'royale-v3-staging/costumes/outfit-policy.mjs',
 'royale/cosmetics/runtime.mjs':'royale-v3-staging/costumes/runtime.mjs',
 'royale/hero-art.mjs':'royale-v3-staging/costumes/hero-art.mjs',
 'royale/cosmetics/preview.mjs':'royale-v3-staging/costumes/preview.mjs'
};
const map=new Map(Object.entries(mappings).map(([s,t])=>[new URL(s,root).pathname,new URL(t,root).href]));
export async function resolve(specifier,context,next){const r=await next(specifier,context);if(r.url.includes('costume-base='))return r;const target=map.get(new URL(r.url).pathname);return target?{url:target,shortCircuit:true}:r;}
