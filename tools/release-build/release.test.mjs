import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Game,decodeSave} from '../../royale/core.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../../royale/saves.mjs';
import {EQUIPMENT,emptyInventory} from '../../royale/equipment.mjs';
import {selectedOutfit} from '../../royale-v3-staging/kingjames/selection.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=path.join(root,'_site');
const read=p=>fs.readFileSync(path.join(out,p),'utf8');
const manifest=JSON.parse(read('royale/release-manifest.json'));
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),m};};
function progressed(){
 const g=new Game();g.hero.level=73;g.hero.xp=123;g.hero.coins=6874;g.loadRegion(5,{x:2350,y:600});
 g.look={...g.look,name:'Existing Hero',hair:'box-braids',skin:'#59352e',hairColor:'#48302c',mouth:'smile'};
 const defs=Object.values(EQUIPMENT).filter(d=>d.setId==='shore-ordinary'&&['chest','boots'].includes(d.part));
 assert.equal(defs.length,2);const items=defs.map((d,i)=>({uid:'drop-'+(12+i),catalogId:d.id}));g.inventory={...emptyInventory(),items,nextId:14,equipped:Object.fromEntries(items.map((item,i)=>[defs[i].part,item.uid]))};
 g.powers.data.levels.strength=15;g.powers.data.levels.fireball=20;g.powers.data.equipped=['strength','fireball',null];g.powers.data.points=37;g.refreshEquipment();
 return g;
}
test('release keeps existing save version and exact progression, position, appearance and equipped gear',()=>{
 const g=progressed(),before=JSON.parse(g.save()),decoded=decodeSave(JSON.stringify(before));assert(decoded,'fixture is a valid existing save');const restored=new Game({save:decoded}),after=JSON.parse(restored.save());
 for(const key of ['version','look','level','xp','coins','inventory','cosmetics','world','powers','economy','legendary','journey','bossProgress'])assert.deepEqual(after[key],before[key],key);
 assert.equal(restored.hero.x,2350);assert.equal(restored.hero.y,600);assert.equal(restored.regionId,5);assert(restored.equipment.defense>0);
});
test('three occupied original slots survive release loading and one-slot save without touching the other slots',()=>{
 const storage=memory(),store=new LocalHeroStore(storage,{id:()=>`hero-${storage.m.size}-${Math.random()}`});
 for(let i=0;i<3;i++){const g=progressed();g.look.name='Existing Hero '+i;assert(store.writeSlot(i,g.save()).ok);}
 const before=JSON.parse(storage.getItem(PROFILE_KEY));const loaded=new LocalHeroStore(storage);assert.equal(loaded.data.slots.length,3);
 const g=new Game({save:loaded.slot(1).snapshot});g.hero.coins+=17;assert(loaded.writeSlot(1,g.save(),{expectedId:before.slots[1].id}).ok);
 const after=JSON.parse(storage.getItem(PROFILE_KEY));assert.deepEqual(after.slots[0],before.slots[0]);assert.deepEqual(after.slots[2],before.slots[2]);assert.equal(after.slots[1].snapshot.coins,before.slots[1].snapshot.coins+17);
});
test('release rejects stale-tab saves and leaves malformed existing saves untouched',()=>{
 const s=memory(),a=new LocalHeroStore(s);assert(a.writeSlot(0,progressed().save()).ok);const b=new LocalHeroStore(s);
 const next=progressed();next.hero.coins+=2;assert(a.writeSlot(0,next.save()).ok);const latest=s.getItem(PROFILE_KEY);assert.equal(b.writeSlot(0,progressed().save()).ok,false);assert.equal(s.getItem(PROFILE_KEY),latest);
 s.setItem(PROFILE_KEY,'unreadable existing save');const damaged=new LocalHeroStore(s);assert.equal(damaged.writable,false);assert.equal(damaged.writeSlot(0,progressed().save()).ok,false);assert.equal(s.getItem(PROFILE_KEY),'unreadable existing save');
});
test('release constructor refuses the old test-power privilege and arbitrary names use the approved sprite body',()=>{
 const g=new Game({testPowers:true});assert.equal(g.testPowers,false);
 for(const name of ['KingJames','0000000000','Existing Hero'])assert.equal(selectedOutfit(true,{name}),'kingjames-original');
 assert.equal(selectedOutfit(false,{name:'KingJames'}),null);
});
test('published graph contains approved bosses, rewards, armor and cosmetics without developer modules',()=>{
 const sources=Object.keys(manifest.sourceHashes);
 for(const required of ['royale-v3-staging/bosses/art.mjs','royale-v3-staging/bosses/effects.mjs','royale-v3-staging/gameplay/boss-data.mjs','royale-v3-staging/gameplay/economy.mjs','royale-v3-staging/gameplay/portal-layout.mjs','royale-v3-staging/costumes/engine.mjs','royale/release-src/presentation.mjs'])assert(sources.includes(required),required);
 assert(!sources.some(p=>/\/(?:tests|qa|backend-v3)\/|(?:practice|launcher|outfit-wardrobe|v2-test-hero|boss-qa)\.mjs$/.test(p)));
 for(const route of ['royale/character-test/index.html','royale/tests/index.html','royale/app.mjs','royale/local-coop/app.mjs','royale-v3-staging/kingjames/index.html','royale-v3-staging/bosses/launcher.mjs'])assert.equal(fs.existsSync(path.join(out,route)),false,route);
 const code=Object.keys(manifest.bundles).map(read).join('\n');
 for(const marker of ['Boss Test · Choose Opponent','Try Outfits ·','Outfit artwork:','launchCharacterTest','"0000000000"','__ROYAL_QA','window.__royale','mp-review='])assert(!code.includes(marker),marker);
});
test('release menu contains the exact six player actions, with gear only in Eris and no map entry',()=>{
 const html=read('royale/gameplay/index.html');const menu=html.match(/<nav id="pause-primary"[\s\S]*?<\/nav>/)[0];
 assert.deepEqual([...menu.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map(m=>m[1]),['Resume Game','My Hero','Tree of Eris','Save Game','Settings','Exit to Main Menu']);
 assert(!html.includes('id="open-map"'));assert(!menu.includes('open-inventory'));assert.match(html,/<nav[^>]*aria-label="Tree of Eris services"[\s\S]*?id="open-inventory"/);
 assert.match(html,/min-height:48px/);assert(!html.includes('qa-tools'));assert(!html.includes('diagnostics'));
});
test('artifact preserves cloud save contract and does not ship backend migrations or test entrypoints',()=>{
 assert.deepEqual(manifest.saveContract,{endpoint:'royale-v3-staging',profileKey:PROFILE_KEY,cloudPrefix:'royale-v3-play:',databaseMigration:false});
 assert.equal(manifest.developerTools,false);assert(!fs.existsSync(path.join(out,'royale-v3-staging/backend-v3')));
 for(const entry of manifest.entrypoints)assert(fs.statSync(path.join(out,entry)).size>0);
 const home=read('royale/index.html');assert(!home.includes('Test Account'));assert(home.includes('HEROES ON THIS BROWSER'));assert(home.includes('local-coop/'));
});

test('release offers local co-op only and excludes online transports and room routes',async()=>{
 assert.deepEqual(manifest.modes,{singlePlayer:true,localCoop:true,onlineMultiplayer:false});
 assert(!fs.existsSync(path.join(out,'royale/multiplayer')));
 const sources=Object.keys(manifest.sourceHashes);
 assert(!sources.some(p=>/royale\/multiplayer\/(?:client|menu|supabase-test|supabase-live|config)/.test(p)));
 const code=Object.keys(manifest.bundles).map(read).join('\n');
 for(const marker of ['royale-mp-test','royale-mp-stream-test','new WebSocket(','Online Multiplayer — Coming Soon'])assert(!code.includes(marker),marker);
 const {createMultiplayerMenu}=await import('../../royale/multiplayer-gate.mjs');
 let networkLoads=0,domWrites=0;
 const gate=await createMultiplayerMenu({onError(){},getContext:()=>({storage:{getItem:()=>null}})},{enabled:true,loadMenu:()=>{networkLoads++;throw Error('Online code loaded');},document:{createElement(){domWrites++;throw Error('Online button created');}}});
 assert.equal(networkLoads,0);assert.equal(domWrites,0);assert.equal(gate.session,null);assert.equal(gate.connect(),false);assert.equal(gate.isLinked('ordinary-hero'),false);
 assert(read('royale/local-coop/index.html').includes('Player 2'));
});
