import {assertCleanupSimulation} from './cleanup-preservation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {Game,decodeSave,STEP} from '../core.mjs';
import {COSTUME_PARTS,resaleValue} from '../costume-catalog.mjs';
import {FIREBALL_PIECES} from '../power-armor.mjs';
import {STEEL_PIECES} from '../steel-armor.mjs';
import {ROOTS_PIECES} from '../roots-armor.mjs';
import {STRENGTH_SUITS,STRENGTH_PIECES,matchingStrengthBonus} from '../strength-armor.mjs';
import {powerStats} from '../powers.mjs';
import {validateSnapshot} from '../cloud-validation.mjs';
import {equipmentOutfit} from '../equipment.mjs';
import {inventoryFor} from './style-c-final-fixtures.mjs';
import {STRENGTH_REGIONS} from '../assets/power-armor/strength/regions.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../hero-art.mjs';
import {previewHero,PREVIEW_POSES} from '../hero-rig.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {LOOK_OPTIONS,LOOK_RANGES,HAIR_STYLES} from '../appearance.mjs';
import {legendaryGame} from './legendary-fixture.mjs';

const totals=[500,1250,2500,4500,7500,12000,18000,27000,40000];
const ids=suit=>COSTUME_PARTS.map(p=>suit.setId+'-'+p);
function shop(level=99,learned=20){
 const g=new Game();g.hero.level=level;g.hero.maxHp=g.hero.hp=15*(level-1)+100;g.hero.coins=99999;
 g.powers.data.levels.strength=learned;g.powers.data.points=level-1-learned;g.powers.data.equipped=[learned?'strength':null,null,null];
 assert.ok(g.visitTree());return g;
}
const buy=(g,selection)=>g.buyCostume(selection,{confirmed:true,revision:g.economy.revision});
function target(g,id,dx,props={}){
 const surface=g.surfaces.find(s=>s.y===600);
 const e=g.makeEnemy('bottle',g.hero.x+dx,surface,id);
 Object.assign(e,{protection:0,hp:10000,maxHp:10000,stagger:0},props);g.enemies.push(e);return e;
}
function castScene(learned=20){
 const g=shop(99,learned);g.leaveTree();g.paused=false;g.inventory=inventoryFor(ids(STRENGTH_SUITS[8]));g.refreshEquipment();
 g.hero.x=g.hero.prevX=1000;g.hero.y=600;g.hero.grounded=true;g.enemies=[];return g;
}

test('preserve all original armor definitions, hero rigs, core combat and creature assets',()=>{
 assertCleanupSimulation();const paths=['royale/power-armor.mjs','royale/steel-armor.mjs','royale/roots-armor.mjs','royale/assets/power-armor/fireball','royale/assets/power-armor/steel','royale/assets/power-armor/roots','royale/assets/hero','royale/assets/monsters','royale/assets/boss-sprites','royale/hero-rig.mjs','royale/style-c-rig.mjs'];
 assert.equal(execFileSync('git',['diff','--name-only','58ded39b47945ffe0b16ce668baf84863c562c0e','--',...paths],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}),'');
 assert.equal(Object.keys(STRENGTH_PIECES).length,27);
});
for(const [i,suit] of STRENGTH_SUITS.entries())test(suit.name+' pricing, matching bonus, save validation and removal',()=>{
 const g=shop(),locked=shop(suit.level-1,1),points=g.powers.data.points;
 assert.equal(buy(locked,{setId:suit.setId}).ok,false);assert.equal(buy(locked,{catalogId:ids(suit)[0]}).ok,false);
 const basic=[g.attackDefinition('punch'),g.attackDefinition('kick'),g.powers.attackRate,g.powers.speed];
 const before=g.powers.stats('strength'),coins=g.hero.coins,result=buy(g,{setId:suit.setId});assert.ok(result.ok);
 const price=totals[i];assert.equal(coins-g.hero.coins,price);
 assert.deepEqual(result.definitions.map(d=>d.catalogValue),[Math.floor(price/4),price/2,Math.ceil(price/4)]);
 for(const [j,item] of result.items.entries()){
  assert.ok(g.equipItem(item.uid));assert.equal(g.powers.stats('strength').level,j===2?21+i:20);
 }
 const stats=g.powers.stats('strength');assert.equal(stats.damage,before.damage+8*(i+1));
 assert.equal(stats.targets,5);assert.equal(stats.reach,59);assert.equal(stats.cooldown,8);assert.equal(stats.bossEffectiveness,1);
 assert.deepEqual([g.attackDefinition('punch'),g.attackDefinition('kick'),g.powers.attackRate,g.powers.speed],basic);
 const snapshot=validateSnapshot(JSON.parse(g.save()));assert.equal(snapshot.powers.levels.strength,20);
 assert.equal(snapshot.powers.points,points);assert.equal(snapshot.inventory.items.length,3);
 const restored=new Game({save:decodeSave(g.save())});assert.deepEqual(restored.powers.stats('strength'),stats);
 for(const item of result.items){const copy=new Game({save:snapshot});copy.paused=true;assert.ok(copy.equipItem(item.uid));assert.deepEqual(copy.powers.stats('strength'),before);}
 const sale=restored.sellItem(result.items[1].uid,{confirmed:true,revision:restored.economy.revision});assert.ok(sale.ok);assert.equal(sale.value,Math.floor(price/2/4));assert.equal(restored.powers.stats('strength').damage,before.damage);assert.equal(restored.visualOutfit().pieces.gloves,undefined);
});
test('effective tiers retain the learned target milestones, reach, boss scaling and cooldown',()=>{
 for(let learned=1;learned<=20;learned++)for(let bonus=0;bonus<=9;bonus++){
  const level=learned+bonus,stats=powerStats('strength',learned,{equipment:{strengthLevels:bonus}});
  assert.equal(stats.targets,Math.min(5,1+Math.floor(level/5)));assert.equal(stats.damage,65+8*(level-1));
  assert.equal(stats.cooldown,8);assert.equal(stats.reach,59);
  assert.equal(stats.bossEffectiveness,.25+.75*(Math.min(level,20)-1)/19);
 }
 assert.equal(powerStats('strength',20,{equipment:{strengthLevels:9999}}).level,29);
});
test('one live level-29 impact hits at most five in reach and cannot hit again during cooldown',()=>{
 const g=castScene(),held=Array.from({length:6},(_,i)=>target(g,100+i,20+4*i));
 const far=target(g,201,180),behind=target(g,202,-100);g.hero.face=1;const damage=g.powers.stats('strength').damage;
 assert.ok(g.powers.activateSlot(0));for(let i=0;i<24;i++)g.step(STEP,{});
 assert.deepEqual(held.map(e=>10000-e.hp),[damage,damage,damage,damage,damage,0]);assert.equal(far.hp,10000);assert.equal(behind.hp,10000);
 assert.equal(g.powers.activateSlot(0),false);
});
test('removing a piece during windup refreshes damage and target budget before impact',()=>{
 const g=castScene(1),enemies=[target(g,0,25),target(g,1,26),target(g,2,27)];
 g.hero.face=1;assert.ok(g.powers.activateSlot(0));assert.equal(g.hero.attack.stats.targets,3);
 delete g.inventory.equipped.helmet;g.refreshEquipment();assert.equal(g.hero.attack.stats.level,1);
 const damage=g.powers.stats('strength').damage;for(let i=0;i<22;i++)g.step(STEP,{});
 assert.equal(g.powers.data.levels.strength,1);assert.deepEqual(enemies.map(e=>10000-e.hp),[damage,0,0]);
});
test('a real Legendary boss takes the full scaled hit once at effective level 29',()=>{
 const g=legendaryGame('lightning',{loadout:'control'}),boss=g.arenaScene.boss;
 g.disruptedPower=null;g.powers.data.levels.strength=20;g.powers.data.equipped[0]='strength';g.inventory=inventoryFor(ids(STRENGTH_SUITS[8]));g.refreshEquipment();
 g.hero.x=boss.x-45;g.hero.face=1;g.hero.y=boss.y;boss.state='idle';boss.age=0;
 const hp=boss.hp,stats=g.powers.stats('strength');assert.ok(g.powers.activateSlot(0));
 for(let i=0;i<25;i++)g.step(STEP,{});
 assert.equal(hp-boss.hp,stats.damage);assert.equal(stats.bossEffectiveness,1);
});
test('seven-item limit, 25% resale, mixed tier, mixed collection, and unlearned Strength',()=>{
 const g=shop(99,0),s=STRENGTH_SUITS[0];const items=buy(g,{setId:s.setId}).items;
 for(const item of items)g.equipItem(item.uid);g.leaveTree();g.paused=false;assert.equal(g.powers.activate('strength'),false);g.visitTree();
 const others=buy(g,{setId:STRENGTH_SUITS[1].setId});assert.ok(g.equipItem(others.items[1].uid));assert.equal(matchingStrengthBonus(g.inventory,99),0);
 const steel=Object.values(STEEL_PIECES)[0];assert.ok(buy(g,{catalogId:steel.id}).ok);g.equipItem(g.inventory.items[6].uid);
 assert.equal(matchingStrengthBonus(g.inventory,99),0);assert.equal(g.inventory.items.length,7);assert.equal(buy(g,{catalogId:ids(s)[0]}).ok,false);
 assert.equal(resaleValue(STRENGTH_PIECES[ids(s)[0]]),31);
 for(const catalog of [FIREBALL_PIECES,STEEL_PIECES,ROOTS_PIECES]){
   const prior=shop();prior.inventory=inventoryFor(Object.keys(catalog).slice(-3));prior.refreshEquipment();
   const restored=new Game({save:decodeSave(prior.save())});assert.equal(restored.equipment.strengthLevels,undefined);assert.deepEqual(restored.inventory,prior.inventory);
 }
});

test('chest-linked gauntlets respect separately worn legacy gloves and do not create saved items',()=>{
 const suit=STRENGTH_SUITS[2],inventory=inventoryFor([...ids(suit),'r1-ordinary-gloves']);
 assert.equal(equipmentOutfit(inventory).pieces.gloves.id,'r1-ordinary-gloves');
 delete inventory.equipped.gloves;
 const linked=equipmentOutfit(inventory).pieces.gloves;
 assert.equal(linked.id,suit.setId+'-chest');assert.equal(linked.part,'gloves');assert.equal(inventory.items.length,4);
 assert.equal(inventory.equipped.gloves,undefined);
});

test('armored and unarmored heroes have identical travel, jump arcs, basic hitboxes and attack timings',()=>{
 const reference=castScene(),armored=castScene();reference.inventory=inventoryFor([]);reference.refreshEquipment();
 for(let i=0;i<175;i++){
  const keys={move:i<90?1:0,run:i>=30&&i<90,jump:i===70||i===87,punch:i===105,kick:i===147};
  for(const g of [reference,armored])g.step(STEP,keys);
  const sample=g=>{
   const h=g.hero;
   return [h.x,h.y,h.vx,h.vy,h.grounded,h.jumps,h.attack?.kind,h.attack?.age,h.attack?g.attackBox():null];
  };
  assert.deepEqual(sample(armored),sample(reference),'frame '+i);
 }
});

test('108 distinct gold sprite views register to both heroes, every build, all motion clips and saved hairstyles',async()=>{
  const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
  const load=url=>loadImage(fileURLToPath(url)), options={canvasFactory:createCanvas,imageLoader:load};
  assert.ok(await prepareStyleCMaterials(options));assert.equal(Object.keys(STRENGTH_REGIONS).length,9);
  const surface=createCanvas(260,260),c=surface.getContext('2d',{willReadFrequently:true});
  const tiles=new Set(),figures=new Set();
  function render(look,hero,outfit,view='game'){
    c.clearRect(0,0,260,260);drawHero(c,137,209,look,hero,.16,1.28,{outfit,view});
    return c.getImageData(0,0,260,260).data;
  }
  for(const suit of STRENGTH_SUITS){
    assert.equal(STRENGTH_REGIONS[suit.art].length,12);
    const sheet=await load(new URL('../assets/power-armor/strength/'+suit.art+'.webp',import.meta.url));
    for(const [x,y,w,h] of STRENGTH_REGIONS[suit.art]){
      assert.ok(w>24&&h>24&&x>=0&&y>=0&&x+w<=sheet.width&&y+h<=sheet.height);
      c.clearRect(0,0,260,260);c.drawImage(sheet,x,y,w,h,0,0,w,h);const p=c.getImageData(0,0,w,h).data;
      let gold=0,ink=0;
      for(let i=0;i<p.length;i+=4){if(p[i+3]<100)continue;ink++;if(p[i]>70&&p[i]>=p[i+1]*.98&&p[i+1]>p[i]*.49&&p[i+1]>p[i+2]*1.25)gold++;}
      assert.ok(ink>200&&gold/ink>.35,suit.name+' gold metal coverage '+gold/ink);
      tiles.add(createHash('sha256').update(p).digest('hex'));
    }
    const all=ids(suit),outfit=equipmentOutfit(inventoryFor(all));
    for(const sex of ['male','female']){
      const base=styleCDefault(sex);
      for(const view of ['front','back','side']){
        const uncovered={...base,cape:false},h=previewHero('idle',0);
        const full=render(uncovered,h,outfit,view);
        for(const id of all){
          const partial=render(uncovered,h,equipmentOutfit(inventoryFor(all.filter(p=>p!==id))),view);
          let changed=0;for(let i=0;i<full.length;i+=4)if(Math.abs(full[i]-partial[i])+Math.abs(full[i+1]-partial[i+1])+Math.abs(full[i+2]-partial[i+2])>45)changed++;
          assert.ok(changed>12,`${suit.name} ${sex} ${view} missing ${id}`);
        }
      }
      const noGauntlets={...outfit,pieces:{...outfit.pieces,gloves:undefined}};
      for(const state of ['idle','run','punch','strength','flight']){
        const hero=previewHero(state,.16);
        assert.notDeepEqual(render(base,hero,outfit),render(base,hero,noGauntlets),suit.name+' knuckle and bracer layer '+state);
      }
      for(const build of LOOK_OPTIONS.build)for(const state of PREVIEW_POSES){
        const h=previewHero(state,.16),look={...base,build},before=JSON.stringify([h,look]);
        const p=render(look,h,outfit);let ink=0,clipped=false;
        for(let i=3;i<p.length;i+=4)if(p[i]>100){
          ink++;const n=(i-3)/4;
          if(n<260||n>=259*260||n%260===0||n%260===259)clipped=true;
        }
        assert.ok(ink>150&&!clipped,`${suit.name} ${sex} ${build} ${state}`);assert.equal(JSON.stringify([h,look]),before);
        if(sex==='male'&&build==='balanced'&&state==='idle')figures.add(createHash('sha256').update(p).digest('hex'));
      }
      for(const edge of [0,1]){
        const extremes=Object.fromEntries(Object.entries(LOOK_RANGES).map(([k,r])=>[k,r[edge]]));
        const look={...base,...extremes},h=previewHero('strength',.16);
        const pose=gear=>drawHero(c,137,209,look,h,.16,1.28,{outfit:gear});
        const plain=pose(equipmentOutfit(inventoryFor([]))),equipped=pose(outfit);
        assert.deepEqual(equipped.arms,plain.arms);assert.deepEqual(equipped.legs,plain.legs);assert.deepEqual(equipped.head,plain.head);
      }
      for(const hair of HAIR_STYLES){
        const look={...base,hair},before=JSON.stringify(look);render(look,previewHero('run',.16),outfit,'back');assert.equal(JSON.stringify(look),before);
      }
    }
  }
  assert.equal(tiles.size,108);assert.equal(figures.size,9);
});
