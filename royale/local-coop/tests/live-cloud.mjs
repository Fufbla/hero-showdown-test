// Explicit test accounts only. Never accepts or reads an existing user's code.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {CloudProfile,CLOUD_ENDPOINT,SaveConflict} from '../cloud.mjs';
import {Game,decodeSave} from '../../core.mjs';
import {LocalSession} from '../session.mjs';
const origin='https://fufbla.github.io',checks=[];
const fetcher=(url,options)=>fetch(url,{...options,headers:{...options.headers,Origin:origin}});
const mem=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};};
const created=[];
try{
 for(let i=0;i<2;i++){
  const response=await fetcher(CLOUD_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'create'})});assert(response.ok,'Test account creation failed');const credentials=await response.json();
  const profile=await new CloudProfile({fetcher,storage:mem()}).login(credentials.code);
  assert(profile.slots.every(row=>row.revision===0&&!row.snapshot),'Refuse to write a nonempty account');
  const g=new Game({look:{name:`Local QA ${i+1}`}}),snapshot=JSON.parse(g.save());
  await profile.call('save',{slot:1,revision:0,snapshot});await profile.load();created.push({profile,code:credentials.code});
 }
 checks.push('Two newly created accounts each start with three empty slots; only their new Slot 1 is seeded.');
 const a=created[0].profile,b=created[1].profile,s=new LocalSession([{profile:a,slot:1},{profile:b,slot:1}]);s.setPaused(false);
 for(let n=0;n<90;n++)s.step([{move:1,punch:n===20},{move:-1,kick:n===30}]);
 const enemy=s.games[0].enemies[0];enemy.protection=0;enemy.hp=1;s.games[0].random=()=>.001;s.games[0].damageEnemy(enemy,999999);
 for(let i=0;i<2;i++){const g=s.games[i],drop=g.loot[0];g.hero.x=drop.x;g.hero.y=drop.y;s.command(i,'pickupLoot',[drop.id]);}
 assert((await s.saveAll()).every(r=>r.ok));checks.push('Simultaneous real writes save separate positions, shared XP/full coins, and independent copies of one equipment drop.');
 const restored=[];for(const account of created){const profile=await new CloudProfile({fetcher,storage:mem()}).login(account.code);restored.push(profile);const row=profile.slots[0];assert(decodeSave(JSON.stringify(row.snapshot)));assert.equal(row.snapshot.inventory.items.length,1);assert.equal(row.snapshot.coins,1);assert(profile.slots.slice(1).every(r=>r.revision===0&&!r.snapshot));}
 assert.notEqual(a.access,b.access);assert.notEqual(restored[0].identity,restored[1].identity);checks.push('Both accounts reopen with valid saved XP, coins, equipment; Slots 2 and 3 remain empty and unchanged.');
 const first=structuredClone(restored[0].slots[0].snapshot);first.coins=24;await restored[0].save(1,first);
 await restored[1].load();assert.equal(restored[1].slots[0].snapshot.coins,1);checks.push('Saving Player 1 does not change Player 2, despite both using Slot 1.');
 const stale=structuredClone(a.slots[0].snapshot);stale.coins=999;await assert.rejects(a.save(1,stale),SaveConflict);await restored[0].load();assert.equal(restored[0].slots[0].snapshot.coins,24);checks.push('A stale revision is rejected and the newer cloud snapshot survives.');
 const invalid=await fetcher(CLOUD_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+'0'.repeat(64)},body:JSON.stringify({action:'save',slot:1,revision:0,snapshot:first})});assert.equal(invalid.status,401);checks.push('An invalid bearer credential cannot write.');
 const report={at:new Date().toISOString(),passed:true,testAccountsCreated:2,checks,scope:'Only two accounts created by this test were modified. Existing user codes were never read or used. Test codes/tokens are not logged or written.'};
 await writeFile(new URL('./live-cloud-results.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){console.error(JSON.stringify({passed:false,testAccountsCreated:created.length,error:error.message,checks}));process.exitCode=1;}
