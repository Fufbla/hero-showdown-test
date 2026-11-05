import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {validateSnapshot,validateProgress,validateUsername,validatePasscode,validSlot,MAX_SAVE_BYTES} from './validation.mjs';
import {recoveryBundle,normalizeRecoveryCode,recoveryHash,verifiedSessionId} from './recovery.mjs';
const URL=Deno.env.get('SUPABASE_URL')!,KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,ANON=Deno.env.get('SUPABASE_ANON_KEY')!;
const SITE='https://fufbla.github.io';
const CALLBACK=SITE+'/hero-showdown-test/royale/account-callback.html';
// Public registration stays closed until recovery, migration and callback tests pass.
const REGISTRATION_READY=Deno.env.get('ROYALE_REGISTRATION_READY')==='true';
const origins=new Set([SITE,'http://localhost:4173','http://127.0.0.1:4173','http://terminal.local:4173',...(Deno.env.get('ROYALE_ALLOWED_ORIGINS')||'').split(',').filter(Boolean)]);
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
// Secret pepper is configured only in the Edge Function environment, never in frontend code.
async function numericVerifier(owner:string,code:string){const pepper=Deno.env.get('ROYALE_NUMERIC_RECOVERY_PEPPER');if(!pepper||pepper.length<32)fail('Numeric recovery is not configured.',503);const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pepper),{name:'HMAC',hash:'SHA-256'},false,['sign']);const sig=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(owner+':'+code));return Array.from(new Uint8Array(sig),x=>x.toString(16).padStart(2,'0')).join('');}
function numericCode(value:unknown){if(typeof value!=='string'||!/^[0-9]{15}$/.test(value))fail('Enter exactly 15 digits.');return value;}
function strongNumeric(code:string){if(new Set(code).size<7)return false;if(/(\d)\1{3,}/.test(code))return false;if(/(?:012345|123456|234567|345678|456789|567890|987654|876543|765432|654321|543210)/.test(code))return false;const chunks=code.match(/.{3}/g)||[];if(new Set(chunks).size<4)return false;return true;}
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
const client=(key=KEY)=>createClient(URL,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const fail=(message:string,status=400)=>{throw Object.assign(Error(message),{status});};
async function limited(db:any,bucket:string,limit:number,seconds:number){const{data,error}=await db.rpc('royale8_rate',{p_bucket:bucket,p_limit:limit,p_seconds:seconds});if(error)fail('Service unavailable. Try again later.',503);if(!data)fail('Too many attempts. Please try again later.',429);}
async function sessionGeneration(db:any,id:string){const r=await db.from('royale8_security_epochs').select('generation').eq('owner_id',id).maybeSingle();if(r.error)fail('Account service unavailable.',503);return r.data?.generation||0;}
async function registerSession(db:any,session:any,generation=0){const sid=verifiedSessionId(session.access_token);if(!sid)fail('Session could not be established.',503);const r=await db.rpc('royale8_register_session',{p_owner:session.user.id,p_session:sid,p_generation:generation});if(r.error){await db.auth.admin.signOut(session.access_token,'local');fail('Account credentials changed. Sign in again.',401);}}
async function reauthenticate(db:any,user:any,password:unknown){if(typeof password!=='string'||password.length>256)fail('Current password required.',401);const r=await client(ANON).auth.signInWithPassword({email:user.email,password});if(r.error||r.data.user?.id!==user.id)fail('Current password was not accepted.',401);await db.auth.admin.signOut(r.data.session!.access_token,'local');}
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin');const headers={'Content-Type':'application/json','Cache-Control':'private, no-store','Vary':'Origin','Access-Control-Allow-Origin':origin&&origins.has(origin)?origin:SITE,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, GET, OPTIONS','X-Content-Type-Options':'nosniff'};
 const respond=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status,headers});
 if(origin&&!origins.has(origin))return respond({error:'Origin is not allowed.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
  const db=client();
  if(req.method==='GET'){
   const{data,error}=await db.from('royale8_configuration').select('email_ready,google_ready,apple_ready,recovery_ready').eq('id',1).single();if(error)fail('Account service unavailable.',503);
   return respond({serverTime:Date.now(),clockReference:Date.UTC(2026,0,1),registrationReady:REGISTRATION_READY,methods:{username:true,email:data.email_ready,google:data.google_ready,apple:data.apple_ready,recovery:data.recovery_ready&&!!Deno.env.get('ROYALE_MAIL_API_KEY')&&Deno.env.get('ROYALE_DUAL_CONFIRMATION_VERIFIED')==='true'},provider:'Supabase'});
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
  if(['forgot-password','forgot-username','resend-verification'].includes(body.action)){
   // Supabase Auth sends through its configured Gmail SMTP. No SMTP password is
   // copied to this function, and the response never exposes account existence.
   await limited(db,'reset-ip:'+ipHash,12,3600);await limited(db,'reset-global',120,3600);
   const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
   await limited(db,'reset-email:'+await hash(email),3,3600);
   if(email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&!email.endsWith('.invalid')){
    try{if(body.action==='resend-verification')await client(ANON).auth.resend({type:'signup',email,options:{emailRedirectTo:CALLBACK}});else await client(ANON).auth.resetPasswordForEmail(email,{redirectTo:CALLBACK});}catch{/* Same response for unavailable or unknown accounts; never log addresses/tokens. */}
   }
   return respond({message:'If that address belongs to an eligible account, a secure recovery link has been requested. Open it to view your username or change your password.'},202);
  }
  if(body.action==='recover-code'){
   await limited(db,'code-ip:'+ipHash,12,3600);await limited(db,'code-global',120,3600);
   const name=validateUsername(body.username);await limited(db,'code-name:'+await hash(name),5,3600);
   validatePasscode(body.passcode);const isNumeric=typeof body.code==='string'&&/^[0-9]{15}$/.test(body.code);const code=isNumeric?numericCode(body.code):normalizeRecoveryCode(body.code);
   const mapping=await db.from('royale8_usernames').select('user_id').eq('username',name).maybeSingle();
   const consumed=code&&mapping.data?.user_id?(isNumeric?await db.rpc('royale8_consume_numeric_code',{p_owner:mapping.data.user_id,p_verifier:await numericVerifier(mapping.data.user_id,code)}):await db.rpc('royale8_consume_code',{p_owner:mapping.data.user_id,p_hash:await recoveryHash(code)})):null;
   if(consumed?.error)fail('Recovery is temporarily unavailable.',503);
   if(!consumed?.data)fail('Username or recovery code was not accepted.',401);
   // Consume BEFORE changing the password. Failure is closed: retry with another
   // unused code. A replay can never change the password twice.
   const changed=await db.auth.admin.updateUserById(mapping.data!.user_id,{password:body.passcode});
   const fenced=await db.rpc('royale8_password_fence',{p_owner:mapping.data!.user_id,p_begin:false});if(fenced.error)fail('Recovery is finishing. Wait two minutes before signing in.',503);
   if(changed.error)fail('The code was consumed, but the password could not change. Use another code or your existing password.',503);
   return respond({message:'Password changed. Sign in with your username and new password.'});
  }
  if(['username-signup','username-login'].includes(body.action)){
   await limited(db,'auth-ip:'+ipHash,60,900);await limited(db,'auth-global',600,900);
   const name=validateUsername(body.username);await limited(db,'auth-name:'+await hash(name),12,900);
   if(body.action==='username-signup'){
    if(!REGISTRATION_READY){
     // Server-held, single-use invitations are the only staging exception.
     const invite=typeof body.invite==='string'&&body.invite.length===64?await db.from('royale8_test_invites').update({used_at:new Date().toISOString()}).eq('verifier',await hash(body.invite)).is('used_at',null).gt('expires_at',new Date().toISOString()).select('verifier').maybeSingle():null;
     if(!invite?.data)fail('Registration is not available until account recovery and save migration are verified.',503);
    }
    validatePasscode(body.passcode);if(body.acknowledgeNoRecovery!==true)fail('Confirm you will save your recovery codes.');
    const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
    if(email&&(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.endsWith('.invalid')))fail('Enter a valid recovery email or leave it blank.');
    await limited(db,'signup-ip:'+ipHash,5,3600);await limited(db,'signup-global',100,3600);
    const reservation=crypto.randomUUID();
    const reserve=await db.from('royale8_usernames').insert({username:name,reservation});if(reserve.error)fail('That username is unavailable. Choose another.');
    let created:string|null=null;
    try{
     const alias=email||crypto.randomUUID()+'@royale.invalid';
     const result=await db.auth.admin.createUser({email:alias,password:body.passcode,email_confirm:!email,app_metadata:{royale_username:true}});
     if(result.error||!result.data.user)fail('Account could not be created. Try again later.',503);created=result.data.user.id;
     const attached=await db.from('royale8_usernames').update({user_id:created}).eq('username',name).eq('reservation',reservation).select('user_id').single();if(attached.error)fail('Account could not be created.',503);
     const recovery=await recoveryBundle();const stored=await db.rpc('royale8_rotate_codes',{p_owner:created,p_hashes:recovery.hashes});if(stored.error)fail('Account created. Sign in to generate recovery codes.',503);
     if(email){const sent=await client(ANON).auth.resend({type:'signup',email,options:{emailRedirectTo:CALLBACK}});return respond({username:name,verificationRequired:true,recoveryCodes:recovery.codes,message:sent.error?'Account created. Verification delivery failed. Request a new verification email before signing in.':'Check your email to verify your account, then sign in with your username.'});}
     const login=await client(ANON).auth.signInWithPassword({email:alias,password:body.passcode});if(login.error||!login.data.session)fail('Account created. Sign in with your username.',503);
     await registerSession(db,login.data.session);
     return respond({session:login.data.session,username:name,recoveryCodes:recovery.codes});
    }catch(error){
     // Only the account created by this reservation may be cleaned up.
     if(created){const linked=await db.from('royale8_usernames').select('user_id').eq('username',name).single();if(linked.data?.user_id===created)throw error;await db.auth.admin.deleteUser(created);}
     await db.from('royale8_usernames').delete().eq('username',name).eq('reservation',reservation).is('user_id',null);throw error;
    }
   }
   if(typeof body.passcode!=='string'||body.passcode.length>256)fail('Username or passcode was not accepted.',401);
   const found=await db.from('royale8_usernames').select('user_id').eq('username',name).maybeSingle();
   const user=found.data?.user_id?(await db.auth.admin.getUserById(found.data.user_id)).data.user:null;
   const generation=user?await sessionGeneration(db,user.id):0;
   const login=await client(ANON).auth.signInWithPassword({email:user?.email||'missing-account@royale.invalid',password:body.passcode});
   if(login.error||!login.data.session||!user||login.data.user.id!==user.id)fail('Username or passcode was not accepted.',401);
   await registerSession(db,login.data.session,generation);
   return respond({session:login.data.session,username:name});
  }
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)fail('Sign in to your account.',401);
  const auth=await db.auth.getUser(token);const user=auth.data.user;if(auth.error||!user||user.is_anonymous)fail('Your session expired. Sign in again.',401);
  if(body.accountId&&body.accountId!==user.id)fail('Account changed. This save belongs to the previous account.',409);
  await limited(db,'user:'+user.id,180,60);
  // Recovery callback may read ONLY its verified identity, never another account.
  if(body.action==='recovery-identity'){
   const mapping=await db.from('royale8_usernames').select('username').eq('user_id',user.id).maybeSingle();if(mapping.error)fail('Account lookup unavailable.',503);
   return respond({username:mapping.data?.username||null});
  }
  if(body.action==='password-updated'){
   const r=await db.rpc('royale8_password_fence',{p_owner:user.id,p_begin:false});if(r.error)fail('Sign-out could not be confirmed.',503);return respond({ok:true});
  }
  if(user.app_metadata?.royale_username){const sid=verifiedSessionId(token!);const s=await db.from('royale8_sessions').select('revoked').eq('owner_id',user.id).eq('session_id',sid||crypto.randomUUID()).maybeSingle();if(s.error||!s.data||s.data.revoked)fail('Sign in again with your username.',401);}
  if(body.action==='set-numeric-recovery'){
   await limited(db,'numeric-setup:'+user.id,3,3600);await reauthenticate(db,user,body.passcode);
   const code=numericCode(body.code);if(body.confirmCode!==code)fail('The confirmation code does not match.');if(!strongNumeric(code))fail('Choose a less predictable 15-digit code. Avoid sequences, repetitions and dates.');
   const verifier=await numericVerifier(user.id,code);
   // Upsert only the numeric verifier. Existing long recovery codes remain valid.
   const stored=await db.from('royale8_numeric_recovery').upsert({owner_id:user.id,verifier,used_at:null},{onConflict:'owner_id'});if(stored.error)fail('Numeric code was not activated. Existing recovery codes are unchanged.',503);
   return respond({message:'Numeric recovery code activated. Existing recovery codes remain available.'});
  }
  if(body.action==='rotate-recovery-codes'){
   await limited(db,'rotate:'+user.id,3,3600);await reauthenticate(db,user,body.passcode);
   const recovery=await recoveryBundle(),r=await db.rpc('royale8_rotate_codes',{p_owner:user.id,p_hashes:recovery.hashes});if(r.error)fail('Recovery codes could not be changed.',503);
   return respond({recoveryCodes:recovery.codes});
  }
  if(body.action==='change-password'){
   await limited(db,'password-change:'+user.id,5,3600);validatePasscode(body.newPassword);await reauthenticate(db,user,body.passcode);
   const begin=await db.rpc('royale8_password_fence',{p_owner:user.id,p_begin:true});if(begin.error)fail('Password could not be changed.',503);
   const changed=await db.auth.admin.updateUserById(user.id,{password:body.newPassword});
   const revoked=await db.rpc('royale8_password_fence',{p_owner:user.id,p_begin:false});if(revoked.error)fail('Account recovery is finishing. Wait two minutes before signing in.',503);if(changed.error)fail('Password could not be changed. Sign in with your existing password.',503);
   await db.auth.admin.signOut(token!,'global');return respond({message:'Password changed. Sign in again.'});
  }
  if(body.action==='logout'){
   const sid=verifiedSessionId(token!);const r=await db.from('royale8_sessions').update({revoked:true}).eq('owner_id',user.id).eq('session_id',sid||crypto.randomUUID());if(r.error)fail('Sign-out could not be confirmed.',503);
   await db.auth.admin.signOut(token!,'local');return respond({ok:true});
  }
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
   const options={redirectTo:CALLBACK};
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
