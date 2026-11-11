import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,decodeSave} from '../core.mjs';
import {EQUIPMENT,emptyInventory,itemDefinition,normalizeEquipmentItem,normalizeInventory,equipmentBonuses,equipmentOutfit,armorOutfitKey,armorOutfitForItem,ownedArmorOutfits,armorOutfitStats,armorOutfitPrice,activeArmorShopDefinitions,rollEquipment,isRetiredHeadwear} from '../equipment.mjs';
import {STAT_KEYS,ARMOR_OUTFIT_PARTS,costumeDrop} from '../costume-catalog.mjs';
import {rollHelmetStats} from '../helmet-rolls.mjs';
import {rollChest} from '../boss-state.mjs';
import {spawnLoot,pickupLoot} from '../world-loot.mjs';
import {matchingMerge,mergeEntitlement,legendaryDominates} from '../legendary-state.mjs';
import {MERGE_POWERS} from '../legendary-data.mjs';
import {resolveAbilitySlots} from '../powers.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../saves.mjs';
import {reconcileLegendaryStore,validateLedgerWrite} from '../legendary-ledger.mjs';
import {validateProgress} from '../cloud-validation.mjs';
import {matchingFireballBonus} from '../power-armor.mjs';
import {matchingSteelBonus} from '../steel-armor.mjs';
import {matchingRootsBonus} from '../roots-armor.mjs';
import {matchingStrengthBonus} from '../strength-armor.mjs';
import {matchingWhirlwindBonus} from '../whirlwind-armor.mjs';
import {matchingSuperKickBonus} from '../super-kick-armor.mjs';
import {matchingSpeedBonus} from '../speed-armor.mjs';
import {matchingAgilityBonus} from '../agility-armor.mjs';
import {matchingFlightBonus} from '../flight-armor.mjs';

const piece=(catalogId,id)=>({uid:'drop-'+id,catalogId});
function inventoryFor(setId){
 const definitions=Object.values(EQUIPMENT).filter(d=>armorOutfitKey(d)===setId&&['chest','suit','boots'].includes(d.part));
 const items=definitions.map((d,i)=>piece(d.id,i+1));
 return {...emptyInventory(),items,equipped:Object.fromEntries(items.map(i=>[itemDefinition(i).part,i.uid])),nextId:items.length+1};
}
function legacySave(level=1){
 const game=new Game();if(level===99)game.gainXP(1e9);
 const snapshot=JSON.parse(game.save());snapshot.version=8;snapshot.legendary.configuration=1;delete snapshot.inventory.headwearArchive;
 return snapshot;
}
function legendaryLegacy({claimed=true,states=['owned','owned','owned'],active=true}={}){
 const save=legacySave(99),parts=['helmet','chest','boots'];
 const pieces=parts.map((part,i)=>({...piece('merge-lightning-'+part,i+1),state:claimed?states[i]:'unclaimed'}));
 save.legendary={...save.legendary,revision:claimed?2:1,defeated:{lightning:{claimed,pieces}},active:active&&claimed&&states.every(s=>s==='owned')?'lightning':null};
 save.inventory.items=pieces.filter(p=>p.state==='owned').map(({uid,catalogId})=>({uid,catalogId}));
 save.inventory.retired=Object.fromEntries(pieces.filter(p=>p.state==='discarded').map(p=>[p.uid,'discarded']));
 save.inventory.equipped=save.legendary.active?Object.fromEntries(parts.map((p,i)=>[p,pieces[i].uid])):{};
 save.inventory.nextId=4;
 return save;
}

test('active rewards and quotes contain no headwear while historical definitions stay decodable',()=>{
 const helmet=rollHelmetStats(piece('eris-shore-ordinary-helmet',1),()=>.4);
 assert.equal(normalizeEquipmentItem(helmet),null);assert.deepEqual(normalizeEquipmentItem(helmet,{allowRetired:true}),helmet);
 assert.equal(activeArmorShopDefinitions({catalogId:helmet.catalogId}).length,0);
 for(const def of Object.values(EQUIPMENT).filter(isRetiredHeadwear))assert.notEqual(def.shop,true,def.id);
 for(let region=1;region<=7;region++)for(const random of [()=>0,()=>.2,()=>.6,()=>.999]){
  assert(!isRetiredHeadwear(rollEquipment(region,random,1)));
  for(const item of rollChest(region,random).items)assert(!isRetiredHeadwear(item));
  for(let i=0;i<4;i++)assert(ARMOR_OUTFIT_PARTS.includes(itemDefinition(costumeDrop(region,'ordinary',i,1)).part));
 }
 const game=new Game();assert.equal(spawnLoot(game,game.hero,'equipment',helmet),false);assert.equal(game.loot.length,0);
 game.inventory.pending=[helmet];assert.equal(game.acceptReward(),false);assert.equal(game.resolveReward(null,true),false);
 game.loot=[{id:'loot-2',kind:'equipment',item:helmet,region:1,x:game.hero.x,y:game.hero.y,expiresAt:game.now()+1000}];
 assert.equal(pickupLoot(game,'loot-2'),false);
});

test('complete modern outfits preserve every authored three-piece total and price',()=>{
 const families=new Set(Object.values(EQUIPMENT).filter(d=>!d.legacy).map(armorOutfitKey));
 for(const setId of families){
  const all=Object.values(EQUIPMENT).filter(d=>d.setId===setId),inv=inventoryFor(setId);
  const expected=Object.fromEntries(STAT_KEYS.map(k=>[k,Number(all.reduce((n,d)=>n+(d.stats[k]||0),0).toFixed(4))]));
  assert.deepEqual(equipmentBonuses(inv,99),expected,setId);
  assert.deepEqual(armorOutfitStats(setId),expected,setId);
  assert.equal(armorOutfitPrice(setId),all.reduce((n,d)=>n+d.catalogValue,0));
  const shop=activeArmorShopDefinitions({setId});
  if(all.some(d=>d.shop)){assert.deepEqual(shop.map(d=>d.part),['chest','boots']);assert.equal(armorOutfitPrice(shop),armorOutfitPrice(setId));}
 }
 assert.equal(armorOutfitStats('fireball-flare').fireball,4);
});

test('equip, switch, and unequip are atomic; mismatched or incomplete outfits cannot grant stats or visuals',()=>{
 const g=new Game();g.gainXP(1e9);g.paused=true;
 g.inventory.items=[piece('fireball-flare-chest',1),piece('fireball-flare-boots',2),piece('steel-rivet-chest',3),piece('steel-rivet-boots',4),piece('roots-seed-chest',5)];g.inventory.nextId=6;
 assert(g.equipItem('drop-1'));assert.deepEqual(g.inventory.equipped,{chest:'drop-1',boots:'drop-2'});
 assert(g.equipItem('drop-4'));assert.deepEqual(g.inventory.equipped,{chest:'drop-3',boots:'drop-4'});
 const before=JSON.stringify(g.inventory);assert.equal(g.equipItem('drop-5'),false);assert.equal(JSON.stringify(g.inventory),before);
 assert(g.equipItem('drop-3'));assert.deepEqual(g.inventory.equipped,{});
 g.inventory.equipped={chest:'drop-1',boots:'drop-4'};
 assert.equal(normalizeInventory(g.inventory),null);assert(Object.values(equipmentBonuses(g.inventory)).every(n=>n===0));assert.deepEqual(equipmentOutfit(g.inventory).pieces,{});
 g.inventory.equipped={};assert(g.equipItem('drop-1'));assert(g.discardItem('drop-2',true));assert.deepEqual(g.inventory.equipped,{});
 assert(g.inventory.items.some(i=>i.uid==='drop-1'),'surviving body remains owned');
});

test('owned outfit cards include incomplete families and prefer the equipped duplicate pair',()=>{
 const inv=inventoryFor('fireball-flare');inv.items.unshift(piece('fireball-flare-chest',10));inv.items.push(piece('steel-rivet-chest',11));inv.nextId=12;
 const rows=ownedArmorOutfits(inv,99),worn=rows.find(r=>r.setId==='fireball-flare'),missing=rows.find(r=>r.setId==='steel-rivet');
 assert(worn.ok&&worn.equipped);assert.equal(worn.uid,'drop-1');assert.equal(rows.length,2);
 assert.equal(missing.ok,false);assert.equal(missing.items.length,1);assert.equal(missing.definitions.length,1);assert.deepEqual(missing.missing,['boots']);
 assert.equal(armorOutfitForItem(inv,'drop-1',1).ok,false,'required level still applies');
});

test('legacy body and boots match by region and rarity without manufacturing or mixing pieces',()=>{
 const g=new Game();g.paused=true;g.inventory.items=[piece('r1-ordinary-suit',1),piece('r1-ordinary-boots',2),piece('r2-ordinary-gloves',3),piece('r2-ordinary-boots',4)];g.inventory.nextId=5;
 assert(g.equipItem('drop-1'));assert.deepEqual(g.inventory.equipped,{suit:'drop-1',boots:'drop-2'});
 const saved=JSON.stringify(g.inventory.items);assert.equal(g.equipItem('drop-3'),false);assert.equal(g.equipItem('drop-4'),false);assert.equal(JSON.stringify(g.inventory.items),saved);
 assert.equal(equipmentOutfit(g.inventory).hideBaseCape,true);
 assert.equal(decodeSave(g.save()).inventory.items.length,4);
});

test('whole outfit purchase keeps the old full price and consumes only two capacity slots',()=>{
 const g=new Game();g.gainXP(1e9);g.hero.coins=10000;g.visitTree();
 const q=g.costumePreview({setId:'fireball-flare'});assert(q.ok);assert.equal(q.cost,4500);assert.equal(q.definitions.length,2);
 const r=g.buyCostume({setId:'fireball-flare'},{confirmed:true,revision:q.revision});assert(r.ok);assert.equal(g.hero.coins,5500);assert.equal(g.inventory.items.length,2);
 assert(g.inventory.items.every(i=>!isRetiredHeadwear(i)));assert(g.equipItem(g.inventory.items[0].uid));
 assert.equal(g.salePreview(g.inventory.items[1].uid).ok,false,'a worn component cannot be sold');
 assert.equal(g.costumePreview({catalogId:'fireball-flare-helmet'}).ok,false);
});

test('all nine power armor bonuses use a matching two-piece outfit and retain their effective levels',()=>{
 const functions={fireball:matchingFireballBonus,steel:matchingSteelBonus,roots:matchingRootsBonus,strength:matchingStrengthBonus,whirlwind:matchingWhirlwindBonus,superKick:matchingSuperKickBonus,speed:matchingSpeedBonus,agility:matchingAgilityBonus,flight:matchingFlightBonus};
 for(const [power,bonus] of Object.entries(functions))for(const chest of Object.values(EQUIPMENT).filter(d=>d.part==='chest'&&d[power+'Levels'])){
  const inv=inventoryFor(chest.setId);assert.equal(bonus(inv,chest.level),chest[power+'Levels']);assert.equal(bonus(inv,chest.level-1),0);
  const other=Object.values(EQUIPMENT).find(d=>d.part==='boots'&&d[power+'Levels']&&d.setId!==chest.setId);
  inv.items.push(piece(other.id,99));inv.equipped.boots='drop-99';assert.equal(bonus(inv,99),0);
 }
});

test('v8 migration retires owned, pending, world, and boss-chest headwear without changing progression',()=>{
 const old=legacySave(),rolled=rollHelmetStats(piece('eris-shore-ordinary-helmet',1),()=>.4);
 old.coins=321;old.xp=17;old.inventory.items=[rolled,piece('eris-shore-ordinary-chest',2),piece('eris-shore-ordinary-boots',3),piece('r1-ordinary-mask',4),piece('r2-ordinary-gloves',5)];
 old.inventory.equipped={helmet:'drop-1',chest:'drop-2',boots:'drop-3'};old.inventory.pending=[piece('eris-shore-ordinary-helmet',6),piece('eris-shore-ordinary-boots',7)];old.inventory.nextId=20;
 old.loot=[{id:'loot-9',kind:'equipment',item:piece('r1-ordinary-mask',8),region:1,x:300,y:600,expiresAt:Date.now()+100000},{id:'loot-11',kind:'equipment',item:piece('eris-shore-ordinary-chest',10),region:1,x:310,y:600,expiresAt:Date.now()+100000}];
 old.world.bossVictories=[1];old.bossProgress.records[1]={wins:1,chest:{state:'available',coins:25,roots:1,items:[{uid:'chest-1-0',catalogId:'eris-shore-ordinary-helmet'},{uid:'chest-1-1',catalogId:'eris-shore-ordinary-boots'}]}};
 const raw=JSON.stringify(old),next=decodeSave(raw);assert(next);assert.equal(JSON.stringify(old),raw);
 assert.equal(next.version,9);assert.equal(next.coins,321);assert.equal(next.xp,17);assert.deepEqual(next.world.location,old.world.location);assert.equal(next.legendary.revision,old.legendary.revision);assert.equal(next.economy.revision,old.economy.revision);
 assert.deepEqual(next.inventory.items.map(i=>i.uid),['drop-2','drop-3','drop-5']);assert.deepEqual(next.inventory.pending.map(i=>i.uid),['drop-7']);assert.deepEqual(next.inventory.equipped,{chest:'drop-2',boots:'drop-3'});
 assert.equal(next.inventory.nextId,20);assert.deepEqual(next.loot.map(l=>l.id),['loot-11']);assert.deepEqual(next.bossProgress.records[1].chest.items.map(i=>i.uid),['chest-1-1']);
 assert.deepEqual(next.inventory.headwearArchive.find(i=>i.uid==='drop-1').stats,rolled.stats);
 for(const uid of ['drop-1','drop-4','drop-6','drop-8'])assert.equal(next.inventory.retired[uid],'discarded');
 // Use an already bounded expiry for an exact, deterministic second decode.
 next.loot[0].expiresAt=Date.now()+10000;
 assert.deepEqual(decodeSave(JSON.stringify(next)),next);
 assert.equal(decodeSave(JSON.stringify({...next,inventory:{...next.inventory,items:[...next.inventory.items,rolled]}})),null,'v9 cannot reintroduce a retired helmet');
});

test('old mismatches select only an owned matching pair and keep all other body items',()=>{
 const old=legacySave(99);old.inventory.items=[piece('fireball-flare-chest',1),piece('steel-rivet-boots',2),piece('fireball-flare-boots',3),piece('r1-ordinary-gloves',4)];old.inventory.equipped={chest:'drop-1',boots:'drop-2',gloves:'drop-4'};old.inventory.nextId=5;
 const next=decodeSave(JSON.stringify(old));assert(next);assert.deepEqual(next.inventory.items,old.inventory.items);assert.deepEqual(next.inventory.equipped,{chest:'drop-1',boots:'drop-3'});
 old.inventory.items.splice(2,1);const incomplete=decodeSave(JSON.stringify(old));assert(incomplete);assert.deepEqual(incomplete.inventory.equipped,{});assert.deepEqual(incomplete.inventory.items,old.inventory.items);
});

test('old active, unclaimed, and discarded Merge rewards migrate without changing permanent revision',()=>{
 for(const options of [{},{claimed:false,active:false},{states:['discarded','owned','owned'],active:false},{states:['owned','discarded','owned'],active:false}]){
  const old=legendaryLegacy(options),next=decodeSave(JSON.stringify(old));assert(next,JSON.stringify(options));
  assert.equal(next.legendary.configuration,2);assert.equal(next.legendary.revision,old.legendary.revision);assert.equal(next.legendary.defeated.lightning.claimed,old.legendary.defeated.lightning.claimed);
  assert.deepEqual(next.legendary.defeated.lightning.pieces,old.legendary.defeated.lightning.pieces.slice(1));assert.equal(next.inventory.retired['drop-1'],'discarded');
  assert(legendaryDominates(next.legendary,old.legendary));assert.deepEqual(decodeSave(JSON.stringify(next)),next);
 }
 const next=decodeSave(JSON.stringify(legendaryLegacy()));assert.equal(matchingMerge(next.inventory,99),'lightning');assert.equal(matchingMerge(next.inventory,98),null);
 const entitlement=mergeEntitlement('lightning');assert.equal(entitlement.completePieces,2);assert.equal(entitlement.cooldown,MERGE_POWERS.lightning.cooldown/2);assert.equal(resolveAbilitySlots(next.powers,entitlement).length,4);
 const g=new Game({save:next});g.paused=true;assert.equal(g.equipItem('drop-2'),false,'Merge changes stay at Eris');g.visitTree();assert(g.equipItem('drop-2'));assert.deepEqual(g.inventory.equipped,{});assert(g.activateMergeSet('lightning'));assert.equal(g.legendary.active,'lightning');
 assert.equal(g.equipMergeMix({chest:'drop-2'}),false);assert.equal(g.equipMergeMix({helmet:'drop-1',chest:'drop-2',boots:'drop-3'}),false);
});

test('old local slots and permanent ledgers reconcile at the same event revision',async()=>{
 const old=legendaryLegacy(),snapshot=decodeSave(JSON.stringify(old)),record={heroId:'kept-hero',revision:old.legendary.revision,snapshot:old};
 const profile={version:2,revision:3,activeSlot:0,legacyImported:true,slots:[{id:'kept-hero',createdAt:null,updatedAt:null,lastRegion:'Cloud',snapshot:old},null,null]};
 const data=new Map([[PROFILE_KEY,JSON.stringify(profile)]]),store=new LocalHeroStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)});
 assert.equal(store.writable,true);assert.equal(store.slot(0).snapshot.version,9);assert.equal(store.slot(0).id,'kept-hero');
 await reconcileLegendaryStore(store,{all:async()=>[record]});assert.equal(store.slot(0).snapshot.legendary.revision,record.revision);
 assert.doesNotThrow(()=>validateProgress(old,snapshot,{kind:'manual'}));
 const changed=structuredClone(snapshot);changed.inventory.equipped={};changed.inventory.items=changed.inventory.items.filter(i=>i.uid!=='drop-3');changed.inventory.retired['drop-3']='discarded';changed.legendary.defeated.lightning.pieces[1].state='discarded';changed.legendary.active=null;changed.legendary.revision++;
 const result=validateLedgerWrite(record,'kept-hero',record.revision,changed);assert.equal(result.revision,record.revision+1);
 assert.equal(result.snapshot.inventory.retired['drop-1'],'discarded');
});

test('old ledger headwear retirement preserves a later sale and accepts the next real permanent event',async()=>{
 const old=legendaryLegacy();old.inventory.items.push(piece('eris-shore-ordinary-helmet',4));old.inventory.nextId=6;old.inventory.retired['drop-5']='sold';
 const record={heroId:'sold-headwear-hero',revision:old.legendary.revision,snapshot:old};
 const later=structuredClone(old);later.inventory.items=later.inventory.items.filter(i=>i.uid!=='drop-4');later.inventory.retired['drop-4']='sold';later.economy.revision++;
 const current=decodeSave(JSON.stringify(later));assert(current);assert.equal(current.legendary.revision,record.revision);
 assert.doesNotThrow(()=>validateProgress(old,current,{kind:'manual'}));
 const profile={version:2,revision:1,activeSlot:0,legacyImported:true,slots:[{id:record.heroId,snapshot:later},null,null]};
 const data=new Map([[PROFILE_KEY,JSON.stringify(profile)]]),store=new LocalHeroStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)});
 assert.equal(await reconcileLegendaryStore(store,{all:async()=>[record]}),false);assert.equal(store.slot(0).snapshot.inventory.retired['drop-4'],'sold');
 const changed=structuredClone(current);changed.inventory.equipped={};changed.inventory.items=changed.inventory.items.filter(i=>i.uid!=='drop-3');changed.inventory.retired['drop-3']='discarded';changed.legendary.defeated.lightning.pieces[1].state='discarded';changed.legendary.active=null;changed.legendary.revision++;
 const result=validateLedgerWrite(record,record.heroId,record.revision,changed);assert.equal(result.revision,record.revision+1);assert.equal(result.snapshot.inventory.retired['drop-4'],'sold');
 assert.doesNotThrow(()=>validateProgress(old,changed,{kind:'irreversible'}));
 const missing=structuredClone(changed);delete missing.inventory.retired['drop-4'];
 assert.throws(()=>validateLedgerWrite(record,record.heroId,record.revision,missing),/destroyed item/);assert.throws(()=>validateProgress(old,missing,{kind:'irreversible'}),/Destroyed equipment/);
 const altered=structuredClone(changed);altered.inventory.retired['drop-5']='discarded';
 assert.throws(()=>validateLedgerWrite(record,record.heroId,record.revision,altered),/destroyed item/);assert.throws(()=>validateProgress(old,altered,{kind:'irreversible'}),/Destroyed equipment/);
});

test('new Legendary victories reserve and claim exactly the two active outfit pieces',()=>{
 const g=new Game();g.gainXP(1e9);g.pendingLegendaryVictory='lightning';g.bossEncounter={legendary:'lightning',boss:{hp:0}};g.arenaScene={legendary:'lightning',cleared:false};g.enemies=[];
 assert(g.prepareLegendaryVictory());const r=g.legendary.defeated.lightning;
 assert.deepEqual(r.pieces.map(p=>itemDefinition(p).part),['chest','boots']);assert.equal(g.inventory.nextId,3);
 assert(g.claimMergeReward('lightning',r.pieces.map(p=>p.uid),[],{confirmed:true,revision:g.legendary.revision}));assert.equal(g.inventory.items.length,2);assert(g.inventory.items.every(i=>!isRetiredHeadwear(i)));
});

test('a malformed live three-piece Merge reward cannot reintroduce headwear',()=>{
 const g=new Game();g.gainXP(1e9);const pieces=['helmet','chest','boots'].map((part,i)=>({...piece('merge-lightning-'+part,i+1),state:'unclaimed'}));
 g.legendary.defeated.lightning={claimed:false,pieces};g.legendary.revision=1;g.inventory.nextId=4;
 const before=JSON.stringify({inventory:g.inventory,legendary:g.legendary});
 assert.equal(g.claimMergeReward('lightning',pieces.map(p=>p.uid),[],{confirmed:true,revision:1}),false);assert.equal(JSON.stringify({inventory:g.inventory,legendary:g.legendary}),before);
});
