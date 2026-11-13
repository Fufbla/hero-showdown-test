// Opt-in live check; uses only the two QA accounts created by cloud-live.mjs.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {CloudProfile} from '../../royale/local-coop/cloud.mjs';
import {LocalSession,captureProgress,AUTOSAVE_MS} from '../../royale/local-coop/session.mjs';
import {Game,decodeSave} from '../../royale/core.mjs';
if(process.env.ROYALE_RELEASE_LIVE_QA!=='1')throw Error('Explicit live QA opt-in required');
const fixture=JSON.parse(fs.readFileSync('/tmp/royale-release-cloud-qa.json','utf8'));
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const profiles=await Promise.all(fixture.accounts.map(async a=>new CloudProfile({storage:storage(),fetcher:(url,init)=>fetch(url,{...init,headers:{...init.headers,Origin:'https://fufbla.github.io'}})}).login(a.code)));
for(const p of profiles)assert(p.slots.find(r=>r.slot_number===1)?.snapshot.look.name.startsWith(fixture.prefix),'Refuse existing player data');
const session=new LocalSession(profiles.map(profile=>({profile,slot:1})));
assert.equal(AUTOSAVE_MS,8000);assert.equal(session.leader,0);
const expected=session.games.map((g,i)=>{g.hero.coins+=i+1;return captureProgress(g);});
const saved=await session.saveAll();
assert(saved.every(r=>r.ok));
const reloaded=await Promise.all(fixture.accounts.map(async a=>new CloudProfile({storage:storage(),fetcher:(url,init)=>fetch(url,{...init,headers:{...init.headers,Origin:'https://fufbla.github.io'}})}).login(a.code)));
for(let i=0;i<2;i++){
 const actual=reloaded[i].slots.find(r=>r.slot_number===1).snapshot;
 const restored=new Game({save:decodeSave(JSON.stringify(actual))});
 for(const k of ['coins','level','xp','inventory','powers','look','cosmetics'])assert.deepEqual(JSON.parse(restored.save())[k],JSON.parse(new Game({save:decodeSave(JSON.stringify(expected[i]))}).save())[k],`account ${i+1} ${k}`);
 assert(reloaded[i].slots.filter(r=>r.slot_number!==1).every(r=>r.snapshot===null));
}
const report={at:new Date().toISOString(),passed:true,physicalControllersTested:false,browserEndToEnd:false,existingPlayerWrites:0,checks:['Actual release CloudProfile login for two distinct QA accounts','Actual LocalSession independent cloud saves acknowledged','Independent fresh sessions restore both heroes, inventory, equipment, powers, customization, XP and coins','Other slots unchanged','Player 1 leader and 8000ms autosave configuration']};
fs.writeFileSync('docs/release-20261113/local-coop-live.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
