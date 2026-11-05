// Real rate-limit/enumeration checks; no mail is sent because the test identifier is not an email.
import assert from 'node:assert/strict';
import {CLOUD_CONFIG as c} from '../cloud-config.mjs';
const email='invalid-test-'+crypto.randomUUID(),results=[];
for(let i=0;i<4;i++){
 const response=await fetch(c.url+'/functions/v1/royale-player-accounts-staging',{method:'POST',headers:{apikey:c.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({action:'forgot-password',email})});
 const body=await response.json();
 if(i<3){assert.equal(response.status,202);assert.equal(body.message,'If that address belongs to an eligible account, a password-reset email has been requested.');results.push('generic response '+(i+1));}
 else{assert.equal(response.status,429);results.push('per-identifier rate limit');}
}
console.log(JSON.stringify({passed:results.length,failed:0,skipped:0,checks:results}));
