import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {validateSnapshot,validateProgress,validateUsername,validatePasscode,validSlot,MAX_SAVE_BYTES} from './validation.mjs';
const URL=Deno.env.get('SUPABASE_URL')!,KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,ANON=Deno.env.get('SUPABASE_ANON_KEY')!;
const SITE='https://healthia-showdown-royale-phase1.gladcreek512.chatgpt.site';
const origins=new Set([SITE,'http://localhost:4173','http://terminal.local:4173',...(Deno.env.get('ROYALE_ALLOWED_ORIGINS')||'').split(',').filter(Boolean)]);
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const client=(key=KEY)=>createClient(URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const fail=(message:string,status=400)=>{throw Object.assign(Error(message),{status});};
async function limited(db:any,bucket:string,limit:number,seconds:number){const{data,error}=await db.rpc('royale8_rate',{p_bucket:bucket,p_limit:limit,p_seconds:seconds});if(error)fail('Service unavailable. Try again later.',503);if(!data)fail('Too many attempts. Please try again later.',429);}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin');const headers={'Content-Type':'application/json','Cache-Control':'private, no-store','Vary':'Origin','Access-Control-Allow-Origin':origin&&origins.has(origin)?origin:SITE,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, GET, OPTIONS','X-Content-Type-Options':'nosniff'};
 const respond=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!origins.has(origin))return respond({error:'Origin is not allowed.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
  const db=client();
  if(req.method==='GET'){
   const{data,error}=await db.from('royale8_configuration').select('email_ready,google_ready,apple_ready,recovery_ready').eq('id',1).single();if(error)fail('Account service unavailable.',503);
   return respond({serverTime:Date.now(),clockReference:Date.UTC(2026,0,1),methods:{username:true,email:data.email_ready,google:data.google_ready,apple:data.apple_ready,recovery:data.recovery_ready&&!!Deno.env.get('ROYALE_MAIL_API_KEY')&&Deno.env.get('ROYALE_DUAL_CONFIRMATION_VERIFIED')==='true'},provider:'Supabase'});
  }
  if(req.method!=='POST')return respond({error:'Method not allowed.'},405);
  if(Number(req.headers.get('content-length'))>MAX_SAVE_BYTES+4096)fail('Request too large.',413);
  const reader=req.body?.getReader();let size=0,chunks:Uint8Array[]=[];if(!reader)fail('Request body required.');
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>MAX_SAVE_BYTES+4096){await reader.cancel();fail('Request too large.',413);}chunks.push(part.value);}
  const raw=new Uint8Array(size);let off=0;for(const p of chunks){raw.set(p,off);off+=p.length;}let body:any;try{body=JSON.parse(new TextDecoder().decode(raw));}catch{fail('Invalid request.');}
  // The platform supplies forwarded client IP. Per-identifier and global limits
  // still apply if a deployment proxy cannot supply a client address.
  const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
  const ipHash=await hash(ip+KEY.slice(-24));
  if(['username-signup','username-login'].includes(body.action)){
   await limited(db,'auth-ip:'+ipHash,60,900);await limited(db,'auth-global',600,900);
   const name=validateUsername(body.username);await limited(db,'auth-name:'+await hash(name),12,900);
   if(body.action==='username-signup'){
    validatePasscode(body.passcode);if(body.acknowledgeNoRecovery!==true)fail('Acknowledge the no-recovery warning first.');
    await limited(db,'signup-ip:'+ipHash,5,3600);await limited(db,'signup-global',100,3600);
    const reservation=crypto.randomUUID();
    const reserve=await db.from('royale8_usernames').insert({username:name,reservation});if(reserve.error)fail('That username is unavailable. Choose another.');
    let created:string|null=null;
    try{
     const alias=crypto.randomUUID()+'@royale.invalid';
     const result=await db.auth.admin.createUser({email:alias,password:body.passcode,email_confirm:true,app_metadata:{royale_username:true}});
     if(result.error||!result.data.user)fail('Account could not be created. Try again later.',503);created=result.data.user.id;
     const attached=await db.from('royale8_usernames').update({user_id:created}).eq('username',name).eq('reservation',reservation).select('user_id').single();if(attached.error)fail('Account could not be created.',503);
     const login=await client(ANON).auth.signInWithPassword({email:alias,password:body.passcode});if(login.error||!login.data.session)fail('Account created. Sign in with your username.',503);
     return respond({session:login.data.session,username:name});
    }catch(error){
     // Only the account created by this reservation may be cleaned up.
     if(created){const linked=await db.from('royale8_usernames').select('user_id').eq('username',name).single();if(linked.data?.user_id===created)throw error;await db.auth.admin.deleteUser(created);}
     await db.from('royale8_usernames').delete().eq('username',name).eq('reservation',reservation).is('user_id',null);throw error;
    }
   }
   if(typeof body.passcode!=='string'||body.passcode.length>256)fail('Username or passcode was not accepted.',401);
   const found=await db.from('royale8_usernames').select('user_id').eq('username',name).maybeSingle();
   const user=found.data?.user_id?(await db.auth.admin.getUserById(found.data.user_id)).data.user:null;
   const login=await client(ANON).auth.signInWithPassword({email:user?.email||'missing-account@royale.invalid',password:body.passcode});
   if(login.error||!login.data.session||!user||login.data.user.id!==user.id)fail('Username or passcode was not accepted.',401);
   return respond({session:login.data.session,username:name});
  }
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)fail('Sign in to your account.',401);
  const auth=await db.auth.getUser(token);const user=auth.data.user;if(auth.error||!user||user.is_anonymous)fail('Your session expired. Sign in again.',401);
  await limited(db,'user:'+user.id,180,60);
  if(body.action==='list'){
   const rows=await db.from('royale8_heroes').select('slot,hero_id,revision,snapshot,deleted,created_at,updated_at,manual_saved_at').eq('owner_id',user.id).order('slot');if(rows.error)fail('Heroes could not be loaded.',503);
   const username=await db.from('royale8_usernames').select('username').eq('user_id',user.id).maybeSingle();
   return respond({slots:rows.data,user:{id:user.id,username:username.data?.username||null,recoveryEmail:user.email&&!user.email.endsWith('@royale.invalid')&&user.email_confirmed_at?user.email:null},serverTime:Date.now()});
  }
  if(body.action==='recovery-email'){
   // This adapter stays disabled until mail delivery AND provider dual-confirmation
   // configuration have been independently verified on this shared project.
   const cfg=await db.from('royale8_configuration').select('recovery_ready').eq('id',1).single();
   if(!cfg.data?.recovery_ready||!Deno.env.get('ROYALE_MAIL_API_KEY')||Deno.env.get('ROYALE_DUAL_CONFIRMATION_VERIFIED')!=='true')fail('Recovery email linking awaits verified email-provider configuration.',503);
   const mapping=await db.from('royale8_usernames').select('username').eq('user_id',user.id).single();
   if(!mapping.data||!user.email?.endsWith('@royale.invalid'))fail('Use the provider email-change flow for an existing email account.');
   if(typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email)||body.email.endsWith('.invalid'))fail('Enter a valid recovery email.');
   await limited(db,'email-link:'+user.id,3,3600);
   const reauth=await client(ANON).auth.signInWithPassword({email:user.email,password:body.passcode});if(reauth.error||reauth.data.user?.id!==user.id)fail('Reauthentication failed.',401);
   await db.auth.admin.signOut(reauth.data.session!.access_token,'local');
   // Acquire a short per-account lock. Failure leaves the account unchanged.
   await limited(db,'email-link-lock:'+user.id,1,120);
   const options={redirectTo:SITE+'/royale/?emailVerified=1'};
   const current=await db.auth.admin.generateLink({type:'email_change_current',email:user.email,newEmail:body.email,options});
   const next=await db.auth.admin.generateLink({type:'email_change_new',email:user.email,newEmail:body.email,options});
   if(current.error||next.error)fail('Email linking could not be started. The address may already belong to an account.');
   const verify=await client(ANON).auth.verifyOtp({token_hash:current.data.properties.hashed_token,type:'email_change'});if(verify.error)fail('Email linking could not be started.');
   const unchanged=await db.auth.admin.getUserById(user.id);if(unchanged.data.user?.email!==user.email)fail('Provider confirmation configuration needs administrator review.',503);
   const link=next.data.properties.action_link;
   const mailed=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+Deno.env.get('ROYALE_MAIL_API_KEY'),'Content-Type':'application/json'},body:JSON.stringify({from:Deno.env.get('ROYALE_MAIL_FROM'),to:body.email,subject:'Verify your Hero Showdown recovery email',text:'Verify your recovery email using this single-use link. Your account and three heroes stay the same.\n\n'+link})});
   if(!mailed.ok)fail('Verification email could not be sent. Recovery is not enabled yet.',503);
   return respond({message:'Check your new email. Recovery becomes available only after verification.'});
  }
  if(body.action!=='commit'||!validSlot(body.slot)||!uuid(body.requestId)||!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0||body.heroId!==null&&!uuid(body.heroId))fail('Invalid save request.');
  if(!['create','import','manual','irreversible','delete'].includes(body.kind))fail('Invalid save action.');
  const fingerprint=await hash(JSON.stringify(body));
  const retry=await db.from('royale8_requests').select('fingerprint,result').eq('owner_id',user.id).eq('request_id',body.requestId).maybeSingle();
  if(retry.data){if(retry.data.fingerprint!==fingerprint)fail('Request identifier was reused.',409);const current=await db.from('royale8_heroes').select('hero_id,revision').eq('owner_id',user.id).eq('slot',body.slot).single();if(current.error||current.data.hero_id!==retry.data.result.hero_id||current.data.revision!==retry.data.result.revision)fail('Result superseded. Reload your heroes.',409);return respond({slot:retry.data.result});}
  const previous=await db.from('royale8_heroes').select('*').eq('owner_id',user.id).eq('slot',body.slot).maybeSingle();if(previous.error)fail('Save service unavailable.',503);
  const old=previous.data;if((old?.revision||0)!==body.expectedRevision||(old?.hero_id||null)!==body.heroId)fail('Heroes changed in another session. Reload before saving.',409);
  let state=null,source=null;
  if(body.kind==='delete'){if(body.confirmed!==true)fail('Confirm permanent hero deletion first.');}
  else{
   state=validateSnapshot(body.snapshot,{migration:body.kind==='import'});
   if(body.kind==='create'){
    if(state.level!==1||state.coins||state.xp||state.inventory.items.length||state.inventory.pending.length||state.legendary.revision||state.world.region!==1||Object.keys(state.bossProgress.records).length||state.healthRoots)fail('New heroes must begin fresh in Coastal Beginnings.');
   }else if(body.kind==='import'){
    if(body.confirmed!==true||typeof body.sourceId!=='string'||body.sourceId.length<8||body.sourceId.length>160)fail('Confirm a valid local hero migration.');
    source=await hash('royale-local-v1:'+body.sourceId);
   }else{if(!old||old.deleted)fail('Hero no longer exists.',409);validateProgress(old.snapshot,state,{kind:body.kind});}
  }
  const result=await db.rpc('royale8_commit',{p_owner:user.id,p_slot:body.slot,p_hero:body.heroId,p_expected:body.expectedRevision,p_kind:body.kind,p_snapshot:state,p_request:body.requestId,p_fingerprint:fingerprint,p_source:source});
  if(result.error)fail('Save conflict or invalid progression. Reload your heroes; nothing was overwritten.',409);
  return respond({slot:result.data,serverTime:Date.now()});
 }catch(error){return respond({error:error instanceof Error?error.message:'Account service unavailable.'},Number((error as any)?.status)||400);}
});
