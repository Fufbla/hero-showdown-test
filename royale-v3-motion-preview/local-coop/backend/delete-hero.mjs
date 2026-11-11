// Dedicated local co-op management endpoint. Existing V3 login/autosave and
// online multiplayer functions are unchanged. Only explicit deletion uses this.
export function makeHandler({url,key,fetcher=(...args)=>globalThis.fetch(...args)}) {
 return async request=>{
  const origin=request.headers.get('Origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'https://fufbla.github.io','Access-Control-Allow-Headers':'authorization, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&origin!=='https://fufbla.github.io')return reply({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS')return reply({ok:true});
  if(request.method!=='POST')return reply({error:'Use POST'},405);
  try{
   const raw=await request.text();if(raw.length>1500)return reply({error:'Request too large'},413);
   const body=JSON.parse(raw),token=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
   if(!/^[a-f0-9]{64}$/.test(token))return reply({error:'Session expired'},401);
   if(body.action!=='delete-hero'||body.confirmed!==true||![1,2,3].includes(body.slot)||!Number.isSafeInteger(body.revision)||body.revision<0||typeof body.name!=='string'||body.name.length>100)return reply({error:'Confirm the selected hero before deleting.'},400);
   const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)),hash=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
   const response=await fetcher(url+'/rest/v1/rpc/royale_local_delete_hero',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_token_hash:hash,p_slot:body.slot,p_revision:body.revision,p_name:body.name}),signal:AbortSignal.timeout(12000)});
   if(!response.ok)return reply({error:'Hero deletion could not be confirmed. Retry without changing the selected hero.'},503);
   const data=await response.json();return reply(data,data.status||200);
  }catch{return reply({error:'Hero deletion could not be confirmed. Your save is retained.'},503);}
 };
}
