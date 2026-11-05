// Explicit real-provider checks against disposable accounts only. No secrets logged.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {PlayerAccountAPI} from '../player-account-client.mjs';
const path=process.env.ROYALE_TEST_RESULT_FILE;if(!path)throw Error('Disposable fixture required.');
const fixture=JSON.parse(await readFile(path,'utf8'));assert.match(fixture.username,/^qatest_[a-f0-9]{12}$/);
const api=new PlayerAccountAPI({persistSession:false});let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS '+name);}
try{
 await api.signIn(fixture.username,fixture.password);
 await check('live callback identity reveals only authenticated username',async()=>{assert.equal((await api.call({action:'recovery-identity'})).username,fixture.username);await assert.rejects(()=>api.call({action:'recovery-identity'},{anonymous:true}),e=>e.status===401);});
 const before=await api.call({action:'list'});let codes;
 await check('live current-password reauthentication rotates eight distinct codes',async()=>{const r=await api.call({action:'rotate-recovery-codes',passcode:fixture.password});codes=r.recoveryCodes;assert.equal(codes.length,8);assert.equal(new Set(codes).size,8);assert.ok(codes.every(code=>!fixture.recoveryCodes.includes(code)));});
 // Preserve the new private fixture immediately; never place codes in test output.
 const retired=fixture.recoveryCodes;fixture.recoveryCodes=codes;await writeFile(path,JSON.stringify(fixture),{mode:0o600});
 await check('live retired recovery code cannot change password',async()=>{await assert.rejects(()=>api.call({action:'recover-code',username:fixture.username,code:retired[1],passcode:crypto.randomUUID()+'-Coast!'},{anonymous:true}),e=>e.status===401);});
 const changed=crypto.randomUUID()+'-Coast!';
 await check('live password change revokes previous application session',async()=>{await api.call({action:'change-password',passcode:fixture.password,newPassword:changed});fixture.password=changed;await writeFile(path,JSON.stringify(fixture),{mode:0o600});await assert.rejects(()=>api.call({action:'list'}),e=>e.status===401);});
 await api.signIn(fixture.username,fixture.password);
 await check('live password change preserves all three hero snapshots',async()=>assert.deepEqual((await api.call({action:'list'})).slots,before.slots));
 await api.logout();
 console.log(JSON.stringify({passed,failed:0,scope:'Live staging recovery/authentication; email inbox/callback interaction still requires owner acceptance'}));
}finally{await api.auth.stopAutoRefresh();}
