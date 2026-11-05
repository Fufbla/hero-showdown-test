import {readFileSync} from 'node:fs';
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
import {STRENGTH_PIECES} from '../strength-armor.mjs';
import {WHIRLWIND_PIECES} from '../whirlwind-armor.mjs';
import {SUPER_KICK_PIECES} from '../super-kick-armor.mjs';
import {FLIGHT_SUITS,FLIGHT_PIECES,matchingFlightBonus,WARDROBE_CATALOG} from '../flight-armor.mjs';
import {AGILITY_PIECES} from '../agility-armor.mjs';
import {SPEED_PIECES} from '../speed-armor.mjs';
import {powerStats} from '../powers.mjs';
import {validateSnapshot} from '../cloud-validation.mjs';
import {equipmentOutfit} from '../equipment.mjs';
import {inventoryFor} from './style-c-final-fixtures.mjs';
import {FLIGHT_REGIONS} from '../assets/power-armor/flight/regions.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../hero-art.mjs';
import {previewHero,PREVIEW_POSES} from '../hero-rig.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {LOOK_OPTIONS,LOOK_RANGES,HAIR_STYLES} from '../appearance.mjs';

const totals=[500,1250,2500,4500,7500,12000,18000,27000,40000];
const ids=suit=>COSTUME_PARTS.map(p=>suit.setId+'-'+p);
function shop(level=99,learned=20){
 const g=new Game();g.hero.level=level;g.hero.maxHp=g.hero.hp=15*(level-1)+100;g.hero.coins=99999;
 g.powers.data.levels.flight=learned;g.powers.data.points=level-1-learned;g.powers.data.equipped=[null,null,null];
 assert.ok(g.visitTree());return g;
}
const buy=(g,selection)=>g.buyCostume(selection,{confirmed:true,revision:g.economy.revision});
test('protect all eight approved armor collections, base hero artwork, creatures and combat geometry',()=>{
 assertCleanupSimulation();
 const cssBase=execFileSync('git',['show','04466d81dc161cded79056177d30861e6831a6e2:royale/world-ui.css'],{encoding:'utf8'});
 const css=readFileSync(new URL('../world-ui.css',import.meta.url),'utf8');
 assert.equal(css.replace('.equipment-card>div>p{display:block;line-height:1.5;overflow-wrap:anywhere}', '.equipment-card>div>p{display:none}').replace('\n.controller-focus{outline:3px solid #f3b83e!important;outline-offset:-3px!important;box-shadow:0 0 0 2px #163f48!important}\n',''),cssBase);
 const paths=['royale/agility-armor.mjs','royale/assets/power-armor/agility','royale/tests/mobile-input.test.mjs','royale/speed-armor.mjs','royale/assets/power-armor/speed','royale/power-armor.mjs','royale/steel-armor.mjs','royale/roots-armor.mjs','royale/strength-armor.mjs','royale/whirlwind-armor.mjs','royale/super-kick-armor.mjs','royale/assets/power-armor/superKick','royale/assets/power-armor/whirlwind','royale/assets/power-armor/roots','royale/assets/power-armor/strength','royale/assets/power-armor/fireball','royale/assets/power-armor/steel','royale/assets/hero','royale/assets/monsters','royale/assets/boss-sprites','royale/hero-rig.mjs','royale/style-c-rig.mjs'];
 assert.equal(execFileSync('git',['diff','--name-only','eebe04a7d862fef40620822a0707e20fca4307fa','--',...paths],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}),'');
 assert.equal(Object.keys(FLIGHT_PIECES).length,27);
 const powers=['fireball','steel','roots','strength','whirlwind','superKick','speed','agility','flight'];
 const pieces=Object.values(WARDROBE_CATALOG).filter(piece=>powers.some(power=>piece[power+'Levels']));
 assert.equal(pieces.length,243);
 assert.equal(new Set(pieces.map(piece=>piece.setId)).size,81);
 for(const power of powers)assert.equal(pieces.filter(piece=>piece[power+'Levels']).length,27);
});
for(const [i,s] of FLIGHT_SUITS.entries())test(s.name+' whole set, piece pricing, save round trip and removal',()=>{
 const low=shop(s.level-1,1);assert.equal(buy(low,{setId:s.setId}).ok,false);assert.equal(buy(low,{catalogId:ids(s)[0]}).ok,false);
 const g=shop(),points=g.powers.data.points,coins=g.hero.coins,purchase=buy(g,{setId:s.setId});assert.ok(purchase.ok);
 const price=totals[i];assert.equal(s.level,10*(i+1));assert.equal(coins-g.hero.coins,price);
 assert.deepEqual(purchase.definitions.map(d=>d.catalogValue),[Math.floor(price/4),price/2,Math.ceil(price/4)]);
 for(const item of purchase.items)assert.ok(g.equipItem(item.uid));
 const stats=g.powers.stats('flight');assert.equal(stats.level,21+i);assert.equal(stats.duration,23+i);
 assert.equal(stats.bossHitChance,.5);assert.equal(stats.cooldown,30);
 const saved=validateSnapshot(JSON.parse(g.save()));assert.equal(saved.powers.levels.flight,20);assert.equal(saved.powers.points,points);
 const r=new Game({save:decodeSave(g.save())});assert.equal(r.powers.stats('flight').level,stats.level);
 for(const piece of purchase.items){const copy=new Game({save:saved});copy.paused=true;assert.ok(copy.equipItem(piece.uid));assert.equal(copy.powers.stats('flight').level,20);}
 assert.equal(r.salePreview(purchase.items[1].uid).ok,false);assert.ok(r.equipItem(purchase.items[1].uid)); const sale=r.sellItem(purchase.items[1].uid,{confirmed:true,revision:r.economy.revision});assert.ok(sale.ok);assert.equal(sale.value,resaleValue(purchase.definitions[1]));assert.equal(r.powers.stats('flight').level,20);
});
test('seven-item limit, 25% resale, mixed tier, mixed collection, and unlearned Flight',()=>{
 const g=shop(99,0),s=FLIGHT_SUITS[0];const items=buy(g,{setId:s.setId}).items;
 for(const item of items)g.equipItem(item.uid);g.leaveTree();g.paused=false;assert.equal(g.powers.activate('flight'),false);g.visitTree();
 const others=buy(g,{setId:FLIGHT_SUITS[1].setId});assert.ok(g.equipItem(others.items[1].uid));assert.equal(matchingFlightBonus(g.inventory,99),0);
 const steel=Object.values(STEEL_PIECES)[0];assert.ok(buy(g,{catalogId:steel.id}).ok);g.equipItem(g.inventory.items[6].uid);
 assert.equal(matchingFlightBonus(g.inventory,99),0);assert.equal(g.inventory.items.length,7);assert.equal(buy(g,{catalogId:ids(s)[0]}).ok,false);
 assert.equal(resaleValue(FLIGHT_PIECES[ids(s)[0]]),31);
 for(const catalog of [FIREBALL_PIECES,STEEL_PIECES,ROOTS_PIECES,STRENGTH_PIECES,WHIRLWIND_PIECES,SUPER_KICK_PIECES,SPEED_PIECES,AGILITY_PIECES]){
   const prior=shop();prior.inventory=inventoryFor(Object.keys(catalog).slice(-3));prior.refreshEquipment();
   const restored=new Game({save:decodeSave(prior.save())});assert.equal(restored.equipment.flightLevels,undefined);assert.deepEqual(restored.inventory,prior.inventory);
 }
});

test('Flight launches only grounded, permits Fireball, cancels with cooldown and falls naturally',()=>{
 const g=shop(),purchase=buy(g,{setId:FLIGHT_SUITS[8].setId});
 for(const item of purchase.items)g.equipItem(item.uid);
 g.powers.data.levels.fireball=1;g.powers.data.levels.strength=1;g.powers.data.points-=2;
 g.powers.data.equipped=['flight','fireball','strength'];g.leaveTree();g.paused=false;g.enemies=[];
 g.hero.grounded=false;assert.equal(g.powers.activate('flight'),false);g.hero.grounded=true;
 assert.ok(g.powers.activate('flight'));assert.equal(g.powers.active.flight.duration,31);
 assert.ok(g.powers.activate('fireball'));assert.equal(g.powers.activate('strength'),false);
 g.step(STEP,{punch:true,kick:true});assert.equal(g.hero.attack,null);
 assert.equal(g.powers.incoming(20,{}),null);
 g.random=()=>.49;assert.equal(g.powers.incoming(20,{boss:true}),20);
 g.random=()=>.5;assert.equal(g.powers.incoming(20,{legendary:true}),null);
 for(let i=0;i<60;i++)g.step(STEP,{vertical:-1});
 const y=g.hero.y;assert.ok(y<600);assert.ok(g.powers.activate('flight'));
 assert.equal(g.powers.cooldowns.flight,30);assert.equal(g.hero.flying,false);
 for(let i=0;i<10;i++)g.step(STEP,{});
 assert.ok(g.hero.y>y);assert.equal(g.powers.activate('flight'),false);
});
test('removing Flight gear preserves elapsed time, expires the bonus and retains learned levels',()=>{
 const g=shop(),purchase=buy(g,{setId:FLIGHT_SUITS[8].setId});
 for(const item of purchase.items)g.equipItem(item.uid);
 g.powers.data.equipped=['flight',null,null];g.leaveTree();g.paused=false;
 assert.ok(g.powers.activate('flight'));
 const effect=g.powers.active.flight;effect.age=12;
 delete g.inventory.equipped.chest;g.refreshEquipment();
 assert.equal(effect.age,12);assert.equal(effect.duration,22);assert.equal(effect.level,20);
 g.inventory.equipped.chest=purchase.items[1].uid;g.refreshEquipment();
 assert.equal(effect.age,12);assert.equal(effect.duration,31);
 effect.age=24;delete g.inventory.equipped.chest;g.refreshEquipment();
 assert.equal(g.powers.active.flight,undefined);assert.equal(g.powers.cooldowns.flight,30);
 assert.equal(g.powers.data.levels.flight,20);assert.equal(g.hero.flying,false);
});
test('each suit expires after a finite flight and keeps all lower-level duration milestones',()=>{
 for(let level=1;level<=20;level++)assert.equal(powerStats('flight',level).duration,level+2);
 for(const suit of FLIGHT_SUITS){
   const g=shop(),purchase=buy(g,{setId:suit.setId});
   for(const item of purchase.items)g.equipItem(item.uid);
   g.powers.data.equipped=['flight',null,null];g.leaveTree();g.paused=false;g.enemies=[];
   assert.ok(g.powers.activate('flight'));
   const duration=g.powers.active.flight.duration;
   for(let i=0;i<Math.ceil(duration/STEP)+1;i++)g.step(STEP,{vertical:-1});
   assert.equal(g.powers.active.flight,undefined);assert.ok(g.powers.cooldowns.flight>29);
 }
});
test('81 distinct sky-blue sprite views register to both heroes, every build, all motion clips and saved hairstyles',async()=>{
  const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
  const load=url=>loadImage(fileURLToPath(url)), options={canvasFactory:createCanvas,imageLoader:load};
  assert.ok(await prepareStyleCMaterials(options));assert.equal(Object.keys(FLIGHT_REGIONS).length,9);
  const surface=createCanvas(260,260),c=surface.getContext('2d',{willReadFrequently:true});
  const tiles=new Set(),figures=new Set(),silhouettes=[];
  function render(look,hero,outfit,view='game'){
    c.clearRect(0,0,260,260);drawHero(c,137,209,look,hero,.16,1.28,{outfit,view});
    return c.getImageData(0,0,260,260).data;
  }
  for(const suit of FLIGHT_SUITS){
    const sheet=await load(new URL('../assets/power-armor/flight/'+suit.art+'.webp',import.meta.url));
    for(const [x,y,w,h] of FLIGHT_REGIONS[suit.art]){
      assert.ok(w>24&&h>24&&x>=0&&y>=0&&x+w<=sheet.width&&y+h<=sheet.height);
      c.clearRect(0,0,260,260);c.drawImage(sheet,x,y,w,h,0,0,w,h);const p=c.getImageData(0,0,w,h).data;
      let skyBlue=0,ink=0;
      for(let i=0;i<p.length;i+=4){if(p[i+3]<100)continue;ink++;if(p[i+2]>90&&p[i+2]>p[i]*1.15&&p[i+1]>p[i]*1.1)skyBlue++;}
      assert.ok(ink>w*h*.20&&skyBlue/ink>.25,suit.name+' sky-blue metal coverage '+skyBlue/ink);
      tiles.add(createHash('sha256').update(p).digest('hex'));
    }
    // Compare shape independently of color, shading, trim or the original sprite size.
    const outline=[];
    for(const slot of [0,3,6]){
      c.clearRect(0,0,32,32);c.drawImage(sheet,...FLIGHT_REGIONS[suit.art][slot],0,0,32,32);
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
        const look={...base,...extremes},h=previewHero('flight',.16);
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
