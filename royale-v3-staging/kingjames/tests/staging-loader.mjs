const replacements=new Map(['powers.mjs','cloud-validation.mjs','local-coop/serialize.mjs'].map(file=>[new URL('../../../royale/'+file,import.meta.url).pathname,new URL('../../gameplay/'+file.split('/').at(-1),import.meta.url).href]));
export async function resolve(specifier,context,next){
 const resolved=await next(specifier,context),target=replacements.get(new URL(resolved.url).pathname);
 return target?{url:target,shortCircuit:true}:resolved;
}
