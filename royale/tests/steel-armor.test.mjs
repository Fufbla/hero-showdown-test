import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {Game,decodeSave} from '../core.mjs';
import {COSTUME_PARTS,resaleValue} from '../costume-catalog.mjs';
import {FIREBALL_PIECES} from '../power-armor.mjs';
import {STEEL_SUITS,STEEL_PIECES,matchingSteelBonus} from '../steel-armor.mjs';
import {powerStats} from '../powers.mjs';
import {validateSnapshot} from '../cloud-validation.mjs';
import {equipmentOutfit} from '../equipment.mjs';
import {inventoryFor} from './style-c-final-fixtures.mjs';
import {STEEL_REGIONS} from '../assets/power-armor/steel/regions.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../hero-art.mjs';
import {previewHero,PREVIEW_POSES} from '../hero-rig.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {LOOK_OPTIONS,HAIR_STYLES} from '../appearance.mjs';

const prices=[500,1250,2500,4500,7500,12000,18000,27000,40000];
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} ≠ ${expected}`);
const ids=suit=>COSTUME_PARTS.map(part=>suit.setId+'-'+part);
function hero(level=99,learned=20){
  const g=new Game();
  g.hero.level=level;g.hero.maxHp=g.hero.hp=100+15*(level-1);g.hero.coins=99999;
  g.powers.data.levels.steel=learned;g.powers.data.points=level-1-learned;
  g.powers.data.equipped=[learned?'steel':null,null,null];
  assert.ok(g.visitTree());
  return g;
}
function buy(g,selection){return g.buyCostume(selection,{confirmed:true,revision:g.economy.revision});}
function wear(g,suit){
  const purchase=buy(g,{setId:suit.setId});assert.ok(purchase.ok);
  for(const item of purchase.items)assert.ok(g.equipItem(item.uid));
  return purchase.items;
}

test('Batch 1 definitions, all approved Fireball sheets, underlying heroes and all creature files are byte-identical',()=>{
  const base='6da32e740a96ccfa86b91b047581c91114b82300';
  const protectedPaths=['royale/power-armor.mjs','royale/assets/power-armor/fireball','royale/assets/hero','royale/assets/boss-sprites','royale/assets/monsters'];
  const diff=execFileSync('git',['diff','--name-only',base,'--',...protectedPaths],{cwd:new URL('../../',import.meta.url),encoding:'utf8'});
  assert.equal(diff,'');assert.equal(Object.keys(FIREBALL_PIECES).length,27);
});

for(const [i,suit] of STEEL_SUITS.entries())test(suit.name+' level gate, real transaction, temporary power, and resale',()=>{
  const locked=hero(suit.level-1,1);
  assert.equal(buy(locked,{setId:suit.setId}).ok,false);
  assert.equal(buy(locked,{catalogId:ids(suit)[0]}).ok,false);
  const g=hero(),balance=g.hero.coins,points=g.powers.data.points;
  const pieces=wear(g,suit),price=prices[i];
  assert.equal(suit.level,(i+1)*10);assert.equal(g.hero.coins,balance-price);
  assert.deepEqual(pieces.map(p=>STEEL_PIECES[p.catalogId].catalogValue),[Math.floor(price/4),price/2,Math.ceil(price/4)]);
  const saved=validateSnapshot(JSON.parse(g.save()));
  assert.equal(saved.powers.levels.steel,20);assert.equal(saved.powers.points,points);
  assert.equal(saved.inventory.items.length,3);assert.equal(saved.equipment,undefined);
  const restored=new Game({save:decodeSave(g.save())});
  const stats=restored.powers.stats('steel');
  assert.equal(stats.level,21+i);near(stats.reduction,.75+(1+i)*.01);near(stats.duration,8+(1+i)*.25);
  restored.leaveTree();restored.paused=false;assert.ok(restored.powers.activateSlot(0));
  assert.equal(restored.hero.steel,true);near(restored.powers.incoming(100,{}),100*(1-stats.reduction));
  const oldVx=restored.hero.vx;restored.hero.invulnerable=0;restored.hurt(100,restored.hero.x-100,{type:'armor-test'});
  assert.equal(restored.hero.vx,oldVx);assert.equal(restored.hero.stun,0);assert.ok(restored.hero.hp<restored.hero.maxHp);
  restored.powers.step(stats.duration);assert.equal(restored.hero.steel,false);near(restored.powers.cooldowns.steel,15);
  for(const piece of pieces){const copy=new Game({save:saved});copy.paused=true;assert.ok(copy.equipItem(piece.uid));assert.equal(copy.powers.stats('steel').level,20);}
  assert.equal(g.salePreview(pieces[1].uid).ok,false);assert.ok(g.equipItem(pieces[1].uid)); const sale=g.sellItem(pieces[1].uid,{confirmed:true,revision:g.economy.revision});assert.ok(sale.ok);assert.equal(sale.value,Math.floor(price/8));assert.equal(g.powers.stats('steel').level,20);
  assert.equal(resaleValue(STEEL_PIECES[pieces[0].catalogId]),Math.floor(Math.floor(price/4)/4));
});
test('changing gear during Steel Body immediately shortens or ends it and retains elapsed time and cooldown',()=>{
  for(const elapsed of [2,9]){
    const g=hero(),items=wear(g,STEEL_SUITS[8]);g.leaveTree();g.paused=false;
    assert.ok(g.powers.activateSlot(0));g.powers.step(elapsed);g.paused=true;assert.ok(g.equipItem(items[0].uid));
    if(elapsed===2){
      near(g.powers.active.steel.age,2);near(g.powers.active.steel.duration,8);near(g.powers.incoming(100,{}),25);
      g.powers.step(6);
    }
    assert.equal(g.hero.steel,false);near(g.powers.cooldowns.steel,15);
    assert.ok(g.equipItem(items[0].uid));assert.equal(g.powers.active.steel,undefined);near(g.powers.cooldowns.steel,15);
  }
});
test('mixed suits, unlearned power, piece purchases, capacity, and Fireball save migration',()=>{
  const g=hero(99,0),one=wear(g,STEEL_SUITS[0]);
  const other=buy(g,{setId:STEEL_SUITS[1].setId});assert.ok(other.ok);
  assert.ok(g.equipItem(other.items[1].uid));assert.equal(matchingSteelBonus(g.inventory,99),0);
  assert.ok(g.equipItem(one[1].uid));g.leaveTree();g.paused=false;assert.equal(g.powers.activate('steel'),false);
  assert.ok(g.visitTree());const fire=Object.values(FIREBALL_PIECES)[0];
  assert.ok(buy(g,{catalogId:fire.id}).ok);assert.equal(g.inventory.items.length,7);assert.equal(buy(g,{catalogId:ids(STEEL_SUITS[0])[2]}).ok,false);
  assert.ok(g.equipItem(g.inventory.items[6].uid));assert.equal(matchingSteelBonus(g.inventory,99),0);
  const previous=hero(),old=Object.values(FIREBALL_PIECES).slice(-3);
  previous.inventory=inventoryFor(old.map(p=>p.id));previous.refreshEquipment();
  const restored=new Game({save:decodeSave(previous.save())});
  assert.equal(restored.equipment.fireballLevels,9);assert.equal(restored.equipment.steelLevels,undefined);
  for(let level=1;level<=20;level++){
    const base=powerStats('steel',level);
    for(let bonus=1;bonus<=9;bonus++){const s=powerStats('steel',level,{equipment:{steelLevels:bonus}});assert.ok(s.reduction>=base.reduction&&s.reduction<1);assert.equal(s.cooldown,15);}
  }
});

test('81 distinct blue sprite views register to both heroes, every build, all motion clips and saved hairstyles',async()=>{
  const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
  const load=url=>loadImage(fileURLToPath(url)), options={canvasFactory:createCanvas,imageLoader:load};
  assert.ok(await prepareStyleCMaterials(options));assert.equal(Object.keys(STEEL_REGIONS).length,9);
  const surface=createCanvas(260,260),c=surface.getContext('2d',{willReadFrequently:true});
  const tiles=new Set(),figures=new Set();
  function render(look,hero,outfit,view='game'){
    c.clearRect(0,0,260,260);drawHero(c,137,209,look,hero,.16,1.28,{outfit,view});
    return c.getImageData(0,0,260,260).data;
  }
  for(const suit of STEEL_SUITS){
    const sheet=await load(new URL('../assets/power-armor/steel/'+suit.art+'.webp',import.meta.url));
    for(const [x,y,w,h] of STEEL_REGIONS[suit.art]){
      assert.ok(w>24&&h>24&&x>=0&&y>=0&&x+w<=sheet.width&&y+h<=sheet.height);
      c.clearRect(0,0,260,260);c.drawImage(sheet,x,y,w,h,0,0,w,h);const p=c.getImageData(0,0,w,h).data;
      let blue=0,ink=0;
      for(let i=0;i<p.length;i+=4){if(p[i+3]<100)continue;ink++;if(p[i+2]>55&&p[i+2]>1.35*p[i]&&p[i+2]>1.09*p[i+1])blue++;}
      assert.ok(ink>200&&blue/ink>.35,suit.name+' blue enamel coverage '+blue/ink);
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
      for(const hair of HAIR_STYLES){
        const look={...base,hair},before=JSON.stringify(look);render(look,previewHero('run',.16),outfit,'back');assert.equal(JSON.stringify(look),before);
      }
    }
  }
  assert.equal(tiles.size,81);assert.equal(figures.size,9);
});
