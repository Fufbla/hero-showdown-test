import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {Game} from '../../royale/core.mjs';
import {migratePowerSnapshot} from '../power-policy.mjs';
import transform from '../../tools/staging-ui-transform.cjs';
const source=transform('royale-v3-staging/app.mjs','');
const start=source.indexOf('async function save('),saveSource=source.slice(start,source.indexOf("window.addEventListener('message'",start));
function writer({fail=false,pending=false,revision=0}={}){
 const records=new Map(),writes=[],ctx=vm.createContext({migratePowerSnapshot,console:{info(){},error(){}},status(){},localStorage:{setItem:(k,v)=>records.set(k,v),getItem:k=>records.get(k),removeItem:k=>records.delete(k)},call:async(action,data)=>{if(fail)throw Error('Simulated conflict');writes.push(structuredClone(data));return {revision:data.revision+1};}});
 vm.runInContext(`const clothingSavesPending=new Set(${pending?'[0]':'[]'});let characterTestSession=false,blocked=false,access='test-only',prefix='fixture:',slots=[{revision:5,snapshot:{cosmetics:{revision:${revision}}}},{revision:9}],last=[null,null],queue=Promise.resolve();`+saveSource+';globalThis.saveTest=save;',ctx);
 return {save:ctx.saveTest,writes,records};
}
test('cloud acknowledgement preserves exact hero snapshot and deduplicates concurrent saves',async()=>{
 const snapshot=JSON.parse(new Game().save());snapshot.coins=1234;snapshot.world.location.x=407;const w=writer();const results=await Promise.all([w.save(0,snapshot),w.save(0,snapshot)]);assert(results.every(r=>r.ok));assert.equal(w.writes.length,1);assert.equal(w.writes[0].snapshot.coins,1234);assert.equal(w.writes[0].snapshot.world.location.x,407);assert.equal(w.writes[0].revision,5);assert.equal(w.records.size,0);
});
test('pending clothing acknowledgements suspend ordinary autosaves but permit the purchase save',async()=>{
 const snapshot=JSON.parse(new Game().save()),w=writer({pending:true});assert.equal((await w.save(0,snapshot)).skipped,true);assert.equal(w.writes.length,0);assert.equal((await w.save(0,snapshot,{clothingAction:true})).ok,true);assert.equal(w.writes.length,1);
});
test('cloud conflict preserves recovery journal and refuses later stale writes',async()=>{
 const snapshot=JSON.parse(new Game().save()),w=writer({fail:true});snapshot.coins=500;assert.equal((await w.save(0,snapshot)).ok,false);assert.equal(w.records.size,1);assert.equal((await w.save(0,{...snapshot,coins:900})).ok,false);assert.equal(JSON.parse([...w.records.values()][0]).snapshot.coins,500);assert.equal(w.writes.length,0);
});
test('out-of-date clothing revision cannot overwrite a newer purchase',async()=>{
 const snapshot=JSON.parse(new Game().save()),w=writer({revision:9});assert.equal((await w.save(0,snapshot)).skipped,true);assert.equal(w.writes.length,0);assert.equal(w.records.size,0);
});
