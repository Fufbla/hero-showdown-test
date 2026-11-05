import test from 'node:test';import assert from 'node:assert/strict';
import {classifyRecoveryDraft as classify} from '../cloud-recovery-policy.mjs';
const owner='owner-a',hero='hero-a',requestId='12345678-1234-1234-1234-123456789abc';
function draft(kind='manual',revision=66){return {version:2,status:'pending',pending:{requestId,payload:JSON.stringify({action:'commit',kind,accountId:owner,slot:0,heroId:hero,expectedRevision:revision,snapshot:{level:6,xp:134}})}};}
const server={hero_id:hero,revision:67,deleted:false};
test('superseded ordinary save is archived before loading newer server copy',()=>assert.equal(classify(draft(),server,owner,0).action,'archive-and-load'));
test('same revision remains uncertain and requires archive before loading',()=>assert.equal(classify(draft(),{...server,revision:66},owner,0).action,'archive-and-load'));
test('create/import/delete/irreversible never auto-reconciled',()=>{for(const k of ['create','import','delete','irreversible'])assert.equal(classify(draft(k),server,owner,0).action,'hold',k);});
test('other account, hero, slot or newer local revision never auto-reconciled',()=>{
 assert.equal(classify(draft(),server,'other',0).action,'hold');
 assert.equal(classify(draft(),{...server,hero_id:'other'},owner,0).action,'hold');
 assert.equal(classify(draft(),server,owner,1).action,'hold');
 assert.equal(classify(draft('manual',68),server,owner,0).action,'hold');
});
test('corrupt and unknown drafts remain protected',()=>{
 assert.equal(classify({version:2,status:'pending',pending:{payload:'bad'}},server,owner,0).action,'hold');
 assert.equal(classify({version:3,status:'pending'},server,owner,0).action,'hold');
 assert.equal(classify({version:2,status:'archived'},server,owner,0).action,'ignore');
});
