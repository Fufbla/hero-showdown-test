// Explicit live verification using newly created, disposable game profiles.
// Never reads or modifies an existing player's account. No credentials logged.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Game,decodeSave} from '../../royale/core.mjs';
import {CloudProfile,CLOUD_ENDPOINT} from '../../royale/local-coop/cloud.mjs';
import {catalogIndex} from '../../royale/cosmetics/state.mjs';
import {applyClothingAction} from '../../royale/cosmetics/game-adapter.mjs';
if(!process.argv.includes('--live-disposable'))throw Error('Pass --live-disposable to create test-only profiles.');
const checks=[],profiles=[],games=[],snap=g=>JSON.parse(g.save());
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const raw=async(action,body={},access)=>{
 const r=await fetch(CLOUD_ENDPOINT,{method:'POST',headers:{Origin:'https://fufbla.github.io','Content-Type':'application/json',...(access?{Authorization:'Bearer '+access}:{})},body:JSON.stringify({action,...body})});
 return {status:r.status,data:await r.json()};
};
const catalog=JSON.parse(await fs.readFile(new URL('../../royale/cosmetics/catalog.json',import.meta.url)));
for(const set of catalog.sets){set.availability='released';for(const k of Object.keys(set.review))set.review[k]=true;}
const index=catalogIndex(catalog),names=[];
for(let account=0;account<2;account++){
 const created=await raw('create');assert.equal(created.status,200,'Disposable account creation');
 let drop=false;
 const fetcher=async(url,options)=>{const r=await fetch(url,{...options,headers:{...options.headers,Origin:'https://fufbla.github.io'}});if(drop&&JSON.parse(options.body).action==='save'&&r.ok){drop=false;await r.text();throw Error('Simulated lost acknowledgement');}return r;};
 const profile=new CloudProfile({fetcher,storage:storage()});await profile.login(created.data.code);
 assert.equal(profile.slots.length,3);profiles.push({profile,code:created.data.code});games.push([]);
 for(let slot=1;slot<=3;slot++){
  const game=new Game();game.look.name='WardrobeQA'+account+slot;game.hero.coins=1500;game.paused=true;game.visitTree();games[account].push(game);names.push(game.look.name);
  await profile.create(slot,snap(game),profile.slots[slot-1].revision);
  const id=catalog.sets[account*3+slot].id;
  assert(applyClothingAction(game,index,{type:'purchase',id,confirmed:true,revision:game.cosmetics.revision}).ok);
  if(account===0&&slot===1)drop=true;
  await profile.save(slot,snap(game));assert.equal(profile.slots[slot-1].snapshot.coins,800);
  assert(applyClothingAction(game,index,{type:'equip',id,revision:game.cosmetics.revision}).ok);
  await profile.save(slot,snap(game));
  // Unchanged wardrobe + later gameplay is the normal autosave shape.
  game.hero.coins++;await profile.save(slot,snap(game));assert.equal(profile.slots[slot-1].snapshot.coins,801);
  checks.push('Account '+(account+1)+' slot '+slot+': 700 coins once, equip, subsequent progress saved');
 }
 const client=new CloudProfile({fetcher,storage:storage()});await client.login(created.data.code);
 for(let slot=1;slot<=3;slot++){
  const row=client.slots[slot-1],game=games[account][slot-1];
  assert.deepEqual(decodeSave(JSON.stringify(row.snapshot)).cosmetics,decodeSave(game.save()).cosmetics);
  assert.equal(row.snapshot.coins,801);
  const stale=structuredClone(row.snapshot);delete stale.cosmetics;stale.coins=1500;
  assert.equal((await raw('save',{slot,revision:row.revision,snapshot:stale},client.access)).status,409);
  const removed=structuredClone(row.snapshot);removed.cosmetics.revision++;removed.cosmetics.owned=[];removed.cosmetics.equipped={};
  assert.equal((await raw('save',{slot,revision:row.revision,snapshot:removed},client.access)).status,409);
 }
 checks.push('Account '+(account+1)+': all three slots restore; stale tabs and ownership removal rejected');
}
assert.notDeepEqual(profiles[0].profile.slots[0].snapshot.cosmetics,profiles[1].profile.slots[0].snapshot.cosmetics);
checks.push('Separate profile wardrobes stay independent; lost acknowledgement reconciles without a second charge');
const evidence={passed:true,accounts:2,slots:6,checks,note:'Disposable cloud profiles only; no existing player account used.'};
await fs.writeFile(new URL('../../docs/cosmetics/evidence/cloud-clothing-checks.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify(evidence,null,2));
