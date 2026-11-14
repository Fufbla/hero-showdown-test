import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import {migratePowerSnapshot,guardPowerSave} from '../../power-policy.mjs';
import {guardEconomySave} from '../../gameplay/economy-save-guard.mjs';
import {checkCosmeticSave} from '../cosmetics/save-guard.mjs';
import {checkAppearanceSave} from '../../customization/migration.mjs';
const origin='https://fufbla.github.io',project='royale-v3-staging';
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type,authorization,apikey','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const out=(body:any,status=200,extra={})=>new Response(JSON.stringify(body),{status,headers:{...headers,...extra}});
async function hash(s:string){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function token(){const b=crypto.getRandomValues(new Uint8Array(32));return [...b].map(x=>x.toString(16).padStart(2,'0')).join('');}
function digits(){const b=new Uint8Array(10);let s='';while(s.length<10){crypto.getRandomValues(b);for(const n of b){if(n<250)s+=n%10;if(s.length===10)break;}}return s;}
async function rate(key:string,limit:number){const r=await db.rpc('royale_code_rate_limit',{p_key:await hash('v3:'+key),p_limit:limit});return !r.error&&r.data===true;}
async function session(profile_id:string){const access=token(),refresh=token();const r=await db.from('royale_v3_sessions').insert({profile_id,token_hash:await hash(access),refresh_hash:await hash(refresh),expires_at:new Date(Date.now()+15*60000).toISOString(),refresh_expires_at:new Date(Date.now()+30*86400000).toISOString()});if(r.error)throw Error('Session unavailable');return {access,refresh,expires_in:900};}
async function authenticate(req:Request){const access=(req.headers.get('authorization')||'').replace(/^Bearer /,'');if(!/^[a-f0-9]{64}$/.test(access))return null;const r=await db.from('royale_v3_sessions').select('profile_id').eq('token_hash',await hash(access)).gt('expires_at',new Date().toISOString()).maybeSingle();return r.data?.profile_id||null;}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST'||req.headers.get('origin')!==origin)return out({error:'Invalid request'},403);
 let body:any;try{body=await req.json();}catch{return out({error:'Invalid JSON'},400);}
 const action=body?.action;const ip=(req.headers.get('cf-connecting-ip')||'unknown').split(',')[0].trim();
 try{
  if(action==='create'||action==='verify'){
   if(action==='create'&&!await rate('ip:'+ip+':create',20))return out({error:'Account creation temporarily limited'},429,{'Retry-After':'60'});
   let profile:any,code:string|undefined;
   if(action==='create'){
    for(let n=0;n<5;n++){code=digits();const r=await db.from('royale_code_profiles').insert({code_hash:await hash('royale-code-v1:'+code)}).select('id').single();if(!r.error){profile=r.data;break;}if(r.error.code!=='23505')throw Error('Code creation failed');}
   }else{
    code=String(body.code||'');if(!/^\d{10}$/.test(code))return out({error:'Invalid code'},400);
    const r=await db.from('royale_code_profiles').select('id').eq('code_hash',await hash('royale-code-v1:'+code)).maybeSingle();
    if(r.error)throw Error('Login unavailable');
    profile=r.data;
    // Successful logins never consume a custom hourly quota. Limit only invalid guesses.
    if(!profile){
     if(!await rate('ip:'+ip+':invalid-verify',240)||!await rate('code:'+await hash(code)+':invalid-verify',12))
      return out({error:'Too many incorrect code attempts. Try later.'},429,{'Retry-After':'60'});
    }
   }
   if(!profile)return out({error:'Code unavailable'},404);
   for(let i=1;i<=3;i++)await db.from('royale_v3_hero_slots').upsert({profile_id:profile.id,slot_number:i},{onConflict:'profile_id,slot_number',ignoreDuplicates:true});
   const auth=await session(profile.id);return out({...(action==='create'?{code}:{}),...auth});
  }
  if(action==='renew'){
   const refresh=String(body.refresh||'');if(!/^[a-f0-9]{64}$/.test(refresh))return out({error:'Invalid renewal'},401);
   const r=await db.from('royale_v3_sessions').select('profile_id').eq('refresh_hash',await hash(refresh)).gt('refresh_expires_at',new Date().toISOString()).maybeSingle();
   if(!r.data)return out({error:'Renewal expired'},401);
   if(!await rate('renew:'+r.data.profile_id,500))return out({error:'Try later'},429,{'Retry-After':'60'});
   return out(await session(r.data.profile_id));
  }
  const profile=await authenticate(req);if(!profile)return out({error:'Session expired'},401);
  if(action==='slots'){
   const r=await db.from('royale_v3_hero_slots').select('slot_number,snapshot,revision,updated_at').eq('profile_id',profile).order('slot_number');if(r.error)throw Error('Load failed');return out({slots:r.data.map(row=>({...row,snapshot:row.snapshot?migratePowerSnapshot(row.snapshot):null})),power_policy:1});
  }
  if(action==='save'){
   const slot=Number(body.slot),revision=Number(body.revision);let snapshot=body.snapshot;
   if(!Number.isInteger(slot)||slot<1||slot>3||!Number.isSafeInteger(revision)||revision<0||!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))return out({error:'Invalid save'},400);
   if(JSON.stringify(snapshot).length>400000)return out({error:'Save too large'},413);
   if(!await rate('save:'+profile,1200))return out({error:'Save temporarily limited'},429,{'Retry-After':'60'});
   const current=await db.from('royale_v3_hero_slots').select('snapshot,revision').eq('profile_id',profile).eq('slot_number',slot).maybeSingle();
   if(current.error)throw Error('Save read failed');
   if(!current.data||current.data.revision!==revision)return out({error:'Revision conflict'},409);
   try{snapshot=guardPowerSave(current.data.snapshot,snapshot);snapshot=guardEconomySave(current.data.snapshot,snapshot);}catch(error){return out({error:error.message},409);}
   // The shared guard also blocks pre-v9 tabs from overwriting an upgraded
   // hero and checks the raw matching-outfit selection before storing it.
   const clothing=checkCosmeticSave(current.data.snapshot,snapshot);
   if(!clothing.ok)return out({error:clothing.error},409);
   const appearance=checkAppearanceSave(current.data.snapshot,snapshot);
   if(!appearance.ok)return out({error:appearance.error},409);
   const r=await db.from('royale_v3_hero_slots').update({snapshot,revision:revision+1,updated_at:new Date().toISOString()}).eq('profile_id',profile).eq('slot_number',slot).eq('revision',revision).select('revision,updated_at').maybeSingle();
   if(r.error)throw Error('Save failed');if(!r.data)return out({error:'Revision conflict'},409);
   return out(r.data);
  }
  return out({error:'Invalid action'},400);
 }catch(e){return out({error:'Service unavailable'},503);}
});

