// Actual Chromium + Supabase browser SDK, with an isolated simulated HTTP provider.
// This checks application wiring and responsive UI, not live email/Auth acceptance.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {Game} from '../core.mjs';
import {createEquipment} from '../equipment.mjs';
import {validateSnapshot,validateProgress} from '../cloud-validation.mjs';
import {PROFILE_KEY} from '../saves.mjs';
const modulePath=process.env.ROYALE_PLAYWRIGHT_MODULE||`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright/index.mjs`;
const {chromium}=await import(pathToFileURL(modulePath));
const output=process.env.ROYALE_QA_OUTPUT||'/tmp/royale-account-qa';await mkdir(output,{recursive:true});
const base=process.env.ROYALE_QA_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({executablePath:process.env.ROYALE_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
let checks=0;const check=(ok,message)=>{assert.ok(ok,message);checks++;console.log('PASS '+message);};
const users=new Map(),sessions=new Map(),rows=new Map(),requests=new Map();let loseResponse=false;
function session(user){const token=['eyJhbGciOiJIUzI1NiJ9',Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,session_id:crypto.randomUUID()})).toString('base64url'),'testsignature'].join('.');sessions.set(token,user);return {access_token:token,refresh_token:crypto.randomUUID(),token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user};}
async function context(viewport,{required=false}={}){
 const ctx=await browser.newContext({viewport,isMobile:viewport.width<900,hasTouch:viewport.width<900});
 await ctx.route('**/player-accounts-config.mjs',async route=>{const source=await readFile(new URL('../player-accounts-config.mjs',import.meta.url),'utf8');await route.fulfill({contentType:'text/javascript',body:source.replace('PLAYER_ACCOUNTS_ENABLED=false','PLAYER_ACCOUNTS_ENABLED=true').replace('PLAYER_ACCOUNTS_REQUIRED=false','PLAYER_ACCOUNTS_REQUIRED='+required)});});
 await ctx.route('https://*.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),body=req.postDataJSON()||{},token=req.headers().authorization?.replace('Bearer ',''),user=sessions.get(token);let status=200,data;
  try{
   if(url.pathname.endsWith('/auth/v1/user')){status=user?200:401;data=user||{message:'expired'};}
   else if(url.pathname.endsWith('/auth/v1/logout')){sessions.delete(token);data={};}
   else if(req.method()==='OPTIONS'){data={};}
   else if(req.method()==='GET')data={methods:{username:true},registrationReady:true,serverTime:Date.now()};
   else if(body.action==='username-signup'){if(users.has(body.username))throw Error('Username unavailable.');const u={id:crypto.randomUUID(),email:body.username+'@royale.invalid',username:body.username};users.set(body.username,{user:u,password:body.passcode});rows.set(u.id,[]);data={session:session(u),recoveryCodes:Array.from({length:8},()=>crypto.randomUUID()),username:u.username};}
   else if(body.action==='username-login'){const entry=users.get(body.username);if(!entry||entry.password!==body.passcode){status=401;data={error:'Username or passcode was not accepted.'};}else data={session:session(entry.user),username:body.username};}
   else if(body.action==='forgot-username'){status=202;data={message:'If eligible, a recovery link has been requested.'};}
   else if(!user){status=401;data={error:'Your session expired. Sign in again.'};}
   else if(body.action==='logout'){sessions.delete(token);data={ok:true};}
   else if(body.action==='list')data={user:{id:user.id,username:user.username},slots:rows.get(user.id)};
   else if(body.action==='commit'){
    if(body.accountId!==user.id)throw Error('Wrong owner');const list=rows.get(user.id),old=list.find(r=>r.slot===body.slot),key=user.id+':'+body.requestId;
    if(requests.has(key))data={slot:requests.get(key)};
    else{
     if((old?.revision||0)!==body.expectedRevision||(old?.hero_id||null)!==body.heroId){status=409;throw Error('Save conflict');}
     if(['import','create'].includes(body.kind)&&old&&!old.deleted){status=409;throw Error('Slot occupied');}
     const snapshot=body.kind==='delete'?null:validateSnapshot(body.snapshot,{migration:body.kind==='import'});if(old&&['manual','irreversible'].includes(body.kind))validateProgress(old.snapshot,snapshot,{kind:body.kind});
     const row={slot:body.slot,hero_id:old?.hero_id||crypto.randomUUID(),revision:(old?.revision||0)+1,snapshot,deleted:body.kind==='delete',updated_at:new Date().toISOString(),created_at:old?.created_at||new Date().toISOString()};rows.set(user.id,[...list.filter(r=>r.slot!==row.slot),row]);requests.set(key,row);data={slot:row};
     if(loseResponse){loseResponse=false;await route.abort('connectionfailed');return;}
    }
   }else throw Error('Unexpected action: '+body.action);
  }catch(error){if(status===200)status=400;data={error:error.message};}
  await route.fulfill({status,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'},body:JSON.stringify(data)});
 });
 return ctx;
}
function legacy(i){const g=new Game({look:{name:'Browser Hero '+(i+1)}});g.hero.level=12+i;g.hero.hp=80+i;g.hero.maxHp=100+(g.hero.level-1)*15;g.hero.x=3450.125+i;g.hero.y=500.5;g.hero.face=-1;g.powers.data.levels.fireball=3;g.powers.data.points=g.hero.level-4;g.powers.data.equipped=['fireball',null,null];g.inventory.items=[createEquipment(1,'ordinary',1,1)];g.inventory.nextId=2;g.inventory.equipped.suit='drop-1';return {id:crypto.randomUUID(),snapshot:validateSnapshot(g.save())};}
const originals=[0,1,2].map(legacy),envelope=JSON.stringify({version:2,revision:0,activeSlot:0,slots:originals});
const passcode='An isolated browser QA passphrase!';
const click=async(p,name)=>p.getByRole('button',{name,exact:true}).click();
const ready=async p=>{await p.locator('#account-panel[aria-busy]').waitFor({state:'detached'}).catch(()=>{});};
try{
 const a=await context({width:1440,height:900}),p=await a.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'/royale/');await p.evaluate(({key,envelope})=>localStorage.setItem(key,envelope),{key:PROFILE_KEY,envelope});await p.reload();await p.locator('[data-action=continue]').first().waitFor();
 check(await p.locator('[data-action=continue]').count()===3,'optional accounts preserve all browser hero slots');
 await p.locator('#account-open').click();await click(p,'Create Account');await p.locator('#player-username').fill('browser_hero');await p.locator('#player-password').fill(passcode);await p.locator('#player-confirm').fill(passcode);await p.locator('#player-ack').check();await click(p,'Create Account');await p.getByRole('textbox',{name:'One-time recovery codes'}).waitFor();check(true,'account creation displays recovery codes');await click(p,'I Saved My Codes — Continue');await p.locator('#roster:not([hidden])').waitFor();
 const owner=users.get('browser_hero').user.id;
 for(let i=0;i<3;i++){
  await p.locator('#account-open').click();await click(p,'Import Existing Hero');const card=p.locator('.account-imports article').filter({has:p.getByRole('heading',{name:'Browser Hero '+(i+1)+' · Level '+(12+i),exact:true})}).first();await card.getByRole('combobox').selectOption(String(i));await card.getByRole('button',{name:'Review Import',exact:true}).click();await card.getByRole('button',{name:'Confirm Import Into Empty Slot',exact:true}).click();await p.getByText('Cloud import verified. Original browser saves and backups are retained.',{exact:true}).waitFor();check(JSON.stringify(rows.get(owner).find(r=>r.slot===i).snapshot)===JSON.stringify(originals[i].snapshot),'imported slot '+(i+1)+' preserves full snapshot');await click(p,'My Heroes');await p.locator('#roster:not([hidden])').waitFor();
 }
 check(await p.evaluate(key=>localStorage.getItem(key),PROFILE_KEY)===envelope,'all three original local heroes remain byte-for-byte intact');
 // A second browser context has independent storage and uses a fresh SDK session.
 const b=await context({width:390,height:844}),phone=await b.newPage();await phone.goto(base+'/royale/');await click(phone,'Log In');await phone.locator('#player-username').fill('browser_hero');await phone.locator('#player-password').fill(passcode);await click(phone,'Log In');await phone.locator('#roster:not([hidden]) [data-action=continue]').first().waitFor();check(await phone.locator('[data-action=continue]').count()===3,'independent mobile browser logs in and loads all three cloud heroes');
 for(let i=0;i<3;i++){await phone.locator('#account-open').click();await click(phone,'My Heroes');check(await phone.locator(`[data-slot="${i}"] h2`).textContent()===originals[i].snapshot.look.name,'mobile roster retains hero '+(i+1)+' identity');}
 await phone.screenshot({path:output+'/mobile-cloud-heroes.png'});
 // Lose a save acknowledgement, reload the browser, then recover the exact request.
 await p.locator('[data-action=continue]').first().click();await p.locator('#pause').click();await p.waitForTimeout(500);await p.locator('#manual-save').click();await p.waitForTimeout(300);
 loseResponse=true;await p.locator('#manual-save').click();await p.waitForTimeout(400);await p.reload();await p.getByRole('button',{name:'Retry Unconfirmed Save',exact:true}).waitFor();const revision=rows.get(owner).find(r=>r.slot===0).revision;await click(p,'Retry Unconfirmed Save');await p.getByText('Save confirmed. You may return to your hero.',{exact:true}).waitFor();check(rows.get(owner).find(r=>r.slot===0).revision===revision,'reopened browser safely retries a lost acknowledgement without duplicate revision');await click(p,'My Heroes');
 await p.locator('#account-open').click();await click(p,'Log Out');await p.getByRole('button',{name:'Log In',exact:true}).waitFor();check(await p.locator('#account-title').textContent()==='WELCOME TO HERO SHOWDOWN ROYALE','logout returns to account welcome');await click(p,'Continue with Browser Heroes');await p.locator('#roster:not([hidden])').waitFor();check(await p.locator('[data-action=continue]').count()===3,'logout leaves original browser heroes playable');
 check(errors.length===0,'laptop application has no uncaught JavaScript errors');
 await a.close();await b.close();
 for(const [width,height] of [[1440,900],[844,390],[390,844],[568,320]]){
  const c=await context({width:Math.max(width,1000),height:Math.max(height,950)},{required:true}),page=await c.newPage();await page.goto(base+'/royale/tests/player-accounts-browser.html');await page.locator('#game').evaluate((f,{width,height})=>{f.width=width;f.height=height;},{width,height});await page.waitForFunction(()=>document.querySelector('#game').contentDocument?.querySelector('#account-title')?.textContent==='WELCOME TO HERO SHOWDOWN ROYALE');await page.locator('#run').click();await page.waitForFunction(()=>/COMPLETE:|STOP:/.test(document.querySelector('#result').textContent),null,{timeout:90000});const result=await page.locator('#result').textContent();check(result.includes('COMPLETE:'),width+'×'+height+' keyboard/touch/controller account checks');checks+=(result.match(/^PASS /gm)||[]).length;await page.locator('#game').screenshot({path:output+`/accounts-${width}x${height}.png`});await c.close();
 }
 console.log(JSON.stringify({passed:checks,failed:0,scope:'Chromium, real browser SDK, simulated HTTP Auth/save service; no physical-device or live-mail claim'}));
}finally{await browser.close();}
