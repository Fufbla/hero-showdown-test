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
import {STRENGTH_PIECES} from '../strength-armor.mjs';
import {WHIRLWIND_SUITS,WHIRLWIND_PIECES,matchingWhirlwindBonus} from '../whirlwind-armor.mjs';
import {powerStats} from '../powers.mjs';
import {validateSnapshot} from '../cloud-validation.mjs';
import {equipmentOutfit} from '../equipment.mjs';
import {inventoryFor} from './style-c-final-fixtures.mjs';
import {WHIRLWIND_REGIONS} from '../assets/power-armor/whirlwind/regions.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../hero-art.mjs';
import {previewHero,PREVIEW_POSES} from '../hero-rig.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {LOOK_OPTIONS,LOOK_RANGES,HAIR_STYLES} from '../appearance.mjs';
import {bossFixture} from './boss-fixture.mjs';
import {LEGENDARY_IDS} from '../legendary-data.mjs';
import {legendaryGame} from './legendary-fixture.mjs';

const totals=[500,1250,2500,4500,7500,12000,18000,27000,40000];
const ids=suit=>COSTUME_PARTS.map(p=>suit.setId+'-'+p);
function shop(level=99,learned=20){
 const g=new Game();g.hero.level=level;g.hero.maxHp=g.hero.hp=15*(level-1)+100;g.hero.coins=99999;
 g.powers.data.levels.whirlwind=learned;g.powers.data.points=level-1-learned;g.powers.data.equipped=[learned?'whirlwind':null,null,null];
 assert.ok(g.visitTree());return g;
}
const buy=(g,selection)=>g.buyCostume(selection,{confirmed:true,revision:g.economy.revision});
function target(g,id,dx,props={}){
 const surface=g.surfaces.find(s=>s.y===600);
 const e=g.makeEnemy('bottle',g.hero.x+dx,surface,id);
 Object.assign(e,{protection:0,hp:10000,maxHp:10000,stagger:0},props);g.enemies.push(e);return e;
}
function castScene(learned=20){
 const g=shop(99,learned);g.leaveTree();g.paused=false;g.inventory=inventoryFor(ids(WHIRLWIND_SUITS[8]));g.refreshEquipment();
 g.hero.x=g.hero.prevX=1000;g.hero.y=600;g.hero.grounded=true;g.enemies=[];return g;
}

test('protect all four approved armor collections, base hero artwork, creatures and combat geometry',()=>{
 const paths=['royale/power-armor.mjs','royale/steel-armor.mjs','royale/roots-armor.mjs','royale/strength-armor.mjs','royale/assets/power-armor/roots','royale/assets/power-armor/strength','royale/assets/power-armor/fireball','royale/assets/power-armor/steel','royale/assets/hero','royale/assets/monsters','royale/assets/boss-sprites','royale/core.mjs','royale/hero-rig.mjs','royale/style-c-rig.mjs'];
 assert.equal(execFileSync('git',['diff','--name-only','9ff23093ac8e46054c92480966b5a7c07c42f8d6','--',...paths],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}),'');
 assert.equal(Object.keys(WHIRLWIND_PIECES).length,27);
});
for(const [i,s] of WHIRLWIND_SUITS.entries())test(s.name+' whole set, piece pricing, save round trip and removal',()=>{
 const low=shop(s.level-1,1);assert.equal(buy(low,{setId:s.setId}).ok,false);assert.equal(buy(low,{catalogId:ids(s)[0]}).ok,false);
 const g=shop(),points=g.powers.data.points,coins=g.hero.coins,purchase=buy(g,{setId:s.setId});assert.ok(purchase.ok);
 const price=totals[i];assert.equal(s.level,10*(i+1));assert.equal(coins-g.hero.coins,price);
 assert.deepEqual(purchase.definitions.map(d=>d.catalogValue),[Math.floor(price/4),price/2,Math.ceil(price/4)]);
 for(const item of purchase.items)assert.ok(g.equipItem(item.uid));
 const stats=g.powers.stats('whirlwind');assert.equal(stats.level,21+i);assert.equal(stats.damage,70+i*3);
 assert.equal(stats.duration,6);assert.equal(stats.targets,5);assert.equal(stats.cooldown,12);
 const saved=validateSnapshot(JSON.parse(g.save()));assert.equal(saved.powers.levels.whirlwind,20);assert.equal(saved.powers.points,points);
 const r=new Game({save:decodeSave(g.save())});assert.equal(r.powers.stats('whirlwind').level,stats.level);
 for(const piece of purchase.items){const copy=new Game({save:saved});copy.paused=true;assert.ok(copy.equipItem(piece.uid));assert.equal(copy.powers.stats('whirlwind').level,20);}
 const sale=r.sellItem(purchase.items[1].uid,{confirmed:true,revision:r.economy.revision});assert.ok(sale.ok);assert.equal(sale.value,resaleValue(purchase.definitions[1]));assert.equal(r.powers.stats('whirlwind').damage,67);
});
test('level 29 lifts and spins five regular enemies, deals six finite ticks and starts cooldown on release',()=>{
 const g=castScene(),enemies=Array.from({length:6},(_,i)=>target(g,20+i,30+i*12));
 assert.ok(g.powers.activateSlot(0));const effect=g.powers.active.whirlwind;
 assert.deepEqual(effect.targets,enemies.slice(0,5).map(e=>e.id));assert.ok(enemies.slice(0,5).every(e=>e.lifted));assert.ok(!enemies[5].lifted);
 const e=enemies[0],y=e.y;g.powers.step(.5);assert.ok(e.y<y-45);const x=e.x;
 g.powers.step(.5);assert.notEqual(e.x,x);assert.equal(e.hp,9906);
 for(let t=2;t<=6;t++){g.powers.step(1);assert.equal(e.hp,10000-t*94);}
 assert.equal(enemies[5].hp,10000);assert.ok(!g.powers.active.whirlwind);assert.ok(enemies.every(e=>!e.lifted));
 assert.equal(g.powers.cooldowns.whirlwind,12);assert.equal(g.powers.activateSlot(0),false);
 for(let i=0;i<60;i++)g.stepEnemy(e,STEP);assert.ok(!e.airborne);g.powers.step(11);assert.equal(e.hp,9436);assert.equal(g.powers.activateSlot(0),false);
 g.powers.step(1);assert.ok(g.powers.activateSlot(0));
});
test('mid-cast gear removal lowers future damage and releases excess targets without resetting the clock',()=>{
 const g=castScene(1),enemies=[target(g,100,20),target(g,101,35),target(g,102,50)];
 assert.ok(g.powers.activateSlot(0));g.powers.step(1);assert.equal(enemies[0].hp,9963);
 delete g.inventory.equipped.helmet;g.refreshEquipment();const a=g.powers.active.whirlwind;
 assert.deepEqual([a.age,a.level,a.damage,a.duration],[1,1,10,2]);assert.deepEqual(a.targets,[100]);
 assert.ok(!enemies[1].lifted&&!enemies[2].lifted);g.powers.step(1);assert.equal(enemies[0].hp,9953);
 assert.equal(enemies[1].hp,9963);assert.equal(g.powers.cooldowns.whirlwind,12);
 const max=castScene(),e=target(max,10,20);max.powers.activateSlot(0);max.powers.step(1);
 delete max.inventory.equipped.chest;max.refreshEquipment();max.powers.step(1);assert.equal(e.hp,10000-94-67);
});
test('an already-expired shortened cast releases immediately and re-equipping cannot reacquire targets',()=>{
 const g=castScene(1),e=target(g,10,20);g.powers.activateSlot(0);g.powers.step(2.5);
 const boots=g.inventory.equipped.boots;delete g.inventory.equipped.boots;g.refreshEquipment();
 assert.ok(!e.lifted&&!g.powers.active.whirlwind);assert.equal(g.powers.cooldowns.whirlwind,12);
 g.inventory.equipped.boots=boots;g.refreshEquipment();assert.ok(!g.powers.active.whirlwind);
});
test('a grounded Legendary boss takes each armored Whirlwind tick without lift or forced horizontal movement',()=>{
 const g=legendaryGame('lightning',{loadout:'control'}),b=g.arenaScene.boss;
 g.disruptedPower=null;g.powers.data.levels.whirlwind=20;g.powers.data.equipped[0]='whirlwind';g.inventory=inventoryFor(ids(WHIRLWIND_SUITS[8]));g.refreshEquipment();
 g.hero.x=b.x-115;g.hero.y=b.y;const {x,y,hp}=b;assert.ok(g.powers.activateSlot(0));assert.ok(g.powers.active.whirlwind.targets.includes(b.id));
 for(let i=1;i<=6;i++){g.powers.step(1);assert.deepEqual([b.x,b.y,b.hp],[x,y,hp-94*i]);assert.ok(!b.lifted&&!b.airborne);}
 assert.equal(g.powers.cooldowns.whirlwind,12);
});
test('Whirlwind damages every regional and Legendary boss without displacing it',()=>{
 const regional=Array.from({length:7},(_,i)=>{
  const g=new Game({save:bossFixture(i+1,'control')});g.paused=false;g.enterBoss(i+1);return g;
 });
 const legendary=LEGENDARY_IDS.map(id=>legendaryGame(id,{loadout:'control'}));
 for(const g of [...regional,...legendary]){
  g.hero.level=99;g.disruptedPower=null;g.powers.data.levels.whirlwind=20;g.powers.data.equipped[0]='whirlwind';
  g.inventory=inventoryFor(ids(WHIRLWIND_SUITS[8]));g.refreshEquipment();
  const b=g.arenaScene.boss,{x,y,hp}=b;g.hero.x=x-110;g.hero.y=y;
  assert.ok(g.powers.activateSlot(0),b.type);assert.ok(g.powers.active.whirlwind.targets.includes(b.id));
  g.powers.step(1);assert.ok(b.hp<hp,b.type);assert.deepEqual([b.x,b.y],[x,y]);assert.ok(!b.lifted);
 }
});
test('seven-item limit, 25% resale, mixed tier, mixed collection, and unlearned Whirlwind',()=>{
 const g=shop(99,0),s=WHIRLWIND_SUITS[0];const items=buy(g,{setId:s.setId}).items;
 for(const item of items)g.equipItem(item.uid);g.leaveTree();g.paused=false;assert.equal(g.powers.activate('whirlwind'),false);g.visitTree();
 const others=buy(g,{setId:WHIRLWIND_SUITS[1].setId});assert.ok(g.equipItem(others.items[1].uid));assert.equal(matchingWhirlwindBonus(g.inventory,99),0);
 const steel=Object.values(STEEL_PIECES)[0];assert.ok(buy(g,{catalogId:steel.id}).ok);g.equipItem(g.inventory.items[6].uid);
 assert.equal(matchingWhirlwindBonus(g.inventory,99),0);assert.equal(g.inventory.items.length,7);assert.equal(buy(g,{catalogId:ids(s)[0]}).ok,false);
 assert.equal(resaleValue(WHIRLWIND_PIECES[ids(s)[0]]),31);
 for(const catalog of [FIREBALL_PIECES,STEEL_PIECES,ROOTS_PIECES,STRENGTH_PIECES]){
   const prior=shop();prior.inventory=inventoryFor(Object.keys(catalog).slice(-3));prior.refreshEquipment();
   const restored=new Game({save:decodeSave(prior.save())});assert.equal(restored.equipment.whirlwindLevels,undefined);assert.deepEqual(restored.inventory,prior.inventory);
 }
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

test('only damage scales above 20, and every target milestone below 20 remains in force',()=>{
 for(let learned=1;learned<=20;learned++)for(let bonus=0;bonus<=9;bonus++){
  const level=learned+bonus,stats=powerStats('whirlwind',learned,{equipment:{whirlwindLevels:bonus}});
  assert.equal(stats.damage,10+3*(level-1));assert.equal(stats.targets,Math.min(5,1+Math.floor(level/5)));
  assert.equal(stats.duration,stats.targets+1);assert.equal(stats.cooldown,12);
 }
 assert.equal(powerStats('whirlwind',20,{equipment:{whirlwindLevels:1000}}).level,29);
});

test('81 distinct purple sprite views register to both heroes, every build, all motion clips and saved hairstyles',async()=>{
  const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
  const load=url=>loadImage(fileURLToPath(url)), options={canvasFactory:createCanvas,imageLoader:load};
  assert.ok(await prepareStyleCMaterials(options));assert.equal(Object.keys(WHIRLWIND_REGIONS).length,9);
  const surface=createCanvas(260,260),c=surface.getContext('2d',{willReadFrequently:true});
  const tiles=new Set(),figures=new Set(),silhouettes=[];
  function render(look,hero,outfit,view='game'){
    c.clearRect(0,0,260,260);drawHero(c,137,209,look,hero,.16,1.28,{outfit,view});
    return c.getImageData(0,0,260,260).data;
  }
  for(const suit of WHIRLWIND_SUITS){
    const sheet=await load(new URL('../assets/power-armor/whirlwind/'+suit.art+'.webp',import.meta.url));
    for(const [x,y,w,h] of WHIRLWIND_REGIONS[suit.art]){
      assert.ok(w>24&&h>24&&x>=0&&y>=0&&x+w<=sheet.width&&y+h<=sheet.height);
      c.clearRect(0,0,260,260);c.drawImage(sheet,x,y,w,h,0,0,w,h);const p=c.getImageData(0,0,w,h).data;
      let purple=0,ink=0;
      for(let i=0;i<p.length;i+=4){if(p[i+3]<100)continue;ink++;if(p[i+2]>45&&p[i+2]>p[i+1]*1.23&&p[i]>p[i+1]*1.13&&p[i+2]>p[i]*.89)purple++;}
      assert.ok(ink>200&&purple/ink>.35,suit.name+' purple enamel coverage '+purple/ink);
      tiles.add(createHash('sha256').update(p).digest('hex'));
    }
    // Compare shape independently of color, shading, trim or the original sprite size.
    const outline=[];
    for(const slot of [0,3,6]){
      c.clearRect(0,0,32,32);c.drawImage(sheet,...WHIRLWIND_REGIONS[suit.art][slot],0,0,32,32);
      const pixels=c.getImageData(0,0,32,32).data;
      for(let alpha=3;alpha<pixels.length;alpha+=4)outline.push(pixels[alpha]>128);
    }
    for(const prior of silhouettes){
      const changed=outline.reduce((n,on,i)=>n+Number(on!==prior.outline[i]),0);
      assert.ok(changed>outline.length*.04,suit.name+' silhouette too close to '+prior.name);
    }
    silhouettes.push({name:suit.name,outline});
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
        const look={...base,...extremes},h=previewHero('whirlwind',.16);
        const pose=gear=>drawHero(c,137,209,look,h,.16,1.28,{outfit:gear});
        const plain=pose(equipmentOutfit(inventoryFor([]))),equipped=pose(outfit);
        assert.deepEqual(equipped.arms,plain.arms);assert.deepEqual(equipped.legs,plain.legs);assert.deepEqual(equipped.head,plain.head);
      }
      for(const hair of HAIR_STYLES){
        const look={...base,hair},before=JSON.stringify(look);render(look,previewHero('run',.16),outfit,'back');assert.equal(JSON.stringify(look),before);
      }
    }
  }
  assert.equal(tiles.size,81);assert.equal(figures.size,9);
});
