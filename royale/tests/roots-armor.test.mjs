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
import {ROOTS_SUITS,ROOTS_PIECES,matchingRootsBonus} from '../roots-armor.mjs';
import {powerStats} from '../powers.mjs';
import {validateSnapshot} from '../cloud-validation.mjs';
import {equipmentOutfit} from '../equipment.mjs';
import {inventoryFor} from './style-c-final-fixtures.mjs';
import {ROOTS_REGIONS} from '../assets/power-armor/roots/regions.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../hero-art.mjs';
import {previewHero,PREVIEW_POSES} from '../hero-rig.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {LOOK_OPTIONS,HAIR_STYLES} from '../appearance.mjs';
import {legendaryGame} from './legendary-fixture.mjs';

const totals=[500,1250,2500,4500,7500,12000,18000,27000,40000];
const ids=suit=>COSTUME_PARTS.map(p=>suit.setId+'-'+p);
function shop(level=99,learned=20){
 const g=new Game();g.hero.level=level;g.hero.maxHp=g.hero.hp=15*(level-1)+100;g.hero.coins=99999;
 g.powers.data.levels.roots=learned;g.powers.data.points=level-1-learned;g.powers.data.equipped=[learned?'roots':null,null,null];
 assert.ok(g.visitTree());return g;
}
const buy=(g,selection)=>g.buyCostume(selection,{confirmed:true,revision:g.economy.revision});
function target(g,id,dx,props={}){
 const surface=g.surfaces.find(s=>s.y===600);
 const e=g.makeEnemy('bottle',g.hero.x+dx,surface,id);
 Object.assign(e,{protection:0,hp:10000,maxHp:10000,stagger:0},props);g.enemies.push(e);return e;
}
function castScene(learned=20){
 const g=shop(99,learned);g.leaveTree();g.paused=false;g.inventory=inventoryFor(ids(ROOTS_SUITS[8]));g.refreshEquipment();
 g.hero.x=g.hero.prevX=1000;g.hero.y=600;g.hero.grounded=true;g.enemies=[];return g;
}

test('protect both approved armor collections, base hero artwork, creatures and combat geometry',()=>{
 const paths=['royale/power-armor.mjs','royale/steel-armor.mjs','royale/assets/power-armor/fireball','royale/assets/power-armor/steel','royale/assets/hero','royale/assets/monsters','royale/assets/boss-sprites','royale/core.mjs','royale/hero-rig.mjs','royale/style-c-rig.mjs'];
 assert.equal(execFileSync('git',['diff','--name-only','c00833f530aaf47fda392e746e403b343ea08356','--',...paths],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}),'');
 assert.equal(Object.keys(ROOTS_PIECES).length,27);
});
for(const [i,s] of ROOTS_SUITS.entries())test(s.name+' whole set, piece pricing, save round trip and removal',()=>{
 const low=shop(s.level-1,1);assert.equal(buy(low,{setId:s.setId}).ok,false);assert.equal(buy(low,{catalogId:ids(s)[0]}).ok,false);
 const g=shop(),points=g.powers.data.points,coins=g.hero.coins,purchase=buy(g,{setId:s.setId});assert.ok(purchase.ok);
 const price=totals[i];assert.equal(s.level,10*(i+1));assert.equal(coins-g.hero.coins,price);
 assert.deepEqual(purchase.definitions.map(d=>d.catalogValue),[Math.floor(price/4),price/2,Math.ceil(price/4)]);
 for(const item of purchase.items)assert.ok(g.equipItem(item.uid));
 const stats=g.powers.stats('roots');assert.equal(stats.level,21+i);assert.equal(stats.damage,46+i*2);
 assert.equal(stats.duration,6);assert.equal(stats.targets,5);assert.equal(stats.cooldown,10);
 const saved=validateSnapshot(JSON.parse(g.save()));assert.equal(saved.powers.levels.roots,20);assert.equal(saved.powers.points,points);
 const r=new Game({save:decodeSave(g.save())});assert.equal(r.powers.stats('roots').level,stats.level);
 for(const piece of purchase.items){const copy=new Game({save:saved});copy.paused=true;assert.ok(copy.equipItem(piece.uid));assert.equal(copy.powers.stats('roots').level,20);}
 const sale=r.sellItem(purchase.items[1].uid,{confirmed:true,revision:r.economy.revision});assert.ok(sale.ok);assert.equal(sale.value,resaleValue(purchase.definitions[1]));assert.equal(r.powers.stats('roots').damage,44);
});
test('level 29 catches five ground targets and squeezes exactly six times before release and cooldown',()=>{
 const g=castScene(),ground=Array.from({length:6},(_,i)=>target(g,i,25+i*14));
 const air=target(g,9,1,{airborne:true,y:550}),fly=target(g,10,2,{flying:true,y:560});
 assert.ok(g.powers.activateSlot(0));assert.deepEqual(g.powers.active.roots.targets,ground.slice(0,5).map(e=>e.id));
 const x=ground[0].x;g.stepEnemy(ground[0],STEP);assert.equal(ground[0].x,x);
 for(let i=0;i<6;i++){g.powers.step(1);assert.equal(ground[0].hp,10000-62*(i+1));}
 assert.equal(g.powers.active.roots,undefined);assert.equal(g.powers.cooldowns.roots,10);
 for(const e of ground)assert.ok(!e.rooted);for(const e of [ground[5],air,fly])assert.equal(e.hp,10000);
 g.powers.step(9);assert.equal(ground[0].hp,9628);assert.equal(g.powers.activateSlot(0),false);
});
test('gear refresh releases excess targets and reduces the remaining squeezes without restarting the cast',()=>{
 const g=castScene(1);const enemy=[target(g,1,20),target(g,2,40),target(g,3,60)];
 assert.ok(g.powers.activateSlot(0));g.powers.step(1);assert.equal(enemy[0].hp,9976);
 // Combat locks normal equipment changes; exercise the actual inventory rebuild.
 delete g.inventory.equipped.helmet;g.refreshEquipment();const effect=g.powers.active.roots;
 assert.equal(effect.age,1);assert.equal(effect.duration,2);assert.equal(effect.damage,6);assert.deepEqual(effect.targets,[1]);
 assert.ok(!enemy[1].rooted&&!enemy[2].rooted);g.powers.step(1);
 assert.equal(enemy[0].hp,9970);assert.equal(enemy[1].hp,9976);assert.equal(g.powers.cooldowns.roots,10);
 const max=castScene(20);const foe=target(max,11,10);max.powers.activateSlot(0);max.powers.step(1);
 delete max.inventory.equipped.chest;max.refreshEquipment();max.powers.step(1);assert.equal(foe.hp,10000-62-44);
});
test('airborne targets are immune, including a target leaving the ground between ticks',()=>{
 const g=castScene(),e=target(g,0,15);g.powers.activateSlot(0);g.powers.step(.4);e.airborne=true;e.y-=50;g.powers.step(.7);
 assert.equal(e.hp,10000);assert.ok(!e.rooted);e.airborne=false;e.y=e.surface.y;g.powers.step(2);assert.equal(e.hp,10000);
});
test('armored Roots halves a grounded Legendary boss’s stride, permits an attack, and excludes the flying boss',()=>{
 function prepare(id){
   const g=legendaryGame(id,{loadout:'control'}),b=g.arenaScene.boss;
   g.disruptedPower=null;g.inventory=inventoryFor(ids(ROOTS_SUITS[8]));g.refreshEquipment();
   g.hero.x=b.x-115;g.hero.y=600;b.state='idle';b.age=0;return {g,b};
 }
 const {g,b}=prepare('lightning'),control=prepare('lightning'),x=b.x;
 assert.ok(g.powers.activate('roots'));assert.ok(b.rooted);g.stepEnemy(b,STEP);control.g.stepEnemy(control.b,STEP);
 assert.ok(Math.abs(control.b.x-x)>0);assert.ok(Math.abs((b.x-x)*2-(control.b.x-x))<1e-6);
 b.state='idle';b.age=2;g.stepEnemy(b,STEP);assert.equal(b.state,'windup');
 const hp=b.hp;g.powers.step(1);assert.equal(hp-b.hp,62);
 const air=prepare('air');air.g.powers.activate('roots');const airHp=air.b.hp;air.g.powers.step(1);assert.ok(!air.b.rooted);assert.equal(air.b.hp,airHp);
});
test('seven-item limit, 25% resale, mixed tier, mixed collection, and unlearned Roots',()=>{
 const g=shop(99,0),s=ROOTS_SUITS[0];const items=buy(g,{setId:s.setId}).items;
 for(const item of items)g.equipItem(item.uid);g.leaveTree();g.paused=false;assert.equal(g.powers.activate('roots'),false);g.visitTree();
 const others=buy(g,{setId:ROOTS_SUITS[1].setId});assert.ok(g.equipItem(others.items[1].uid));assert.equal(matchingRootsBonus(g.inventory,99),0);
 const steel=Object.values(STEEL_PIECES)[0];assert.ok(buy(g,{catalogId:steel.id}).ok);g.equipItem(g.inventory.items[6].uid);
 assert.equal(matchingRootsBonus(g.inventory,99),0);assert.equal(g.inventory.items.length,7);assert.equal(buy(g,{catalogId:ids(s)[0]}).ok,false);
 assert.equal(resaleValue(ROOTS_PIECES[ids(s)[0]]),31);
 for(const catalog of [FIREBALL_PIECES,STEEL_PIECES]){
   const prior=shop();prior.inventory=inventoryFor(Object.keys(catalog).slice(-3));prior.refreshEquipment();
   const restored=new Game({save:decodeSave(prior.save())});assert.equal(restored.equipment.rootsLevels,undefined);assert.deepEqual(restored.inventory,prior.inventory);
 }
});

test('81 distinct green sprite views register to both heroes, every build, all motion clips and saved hairstyles',async()=>{
  const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
  const load=url=>loadImage(fileURLToPath(url)), options={canvasFactory:createCanvas,imageLoader:load};
  assert.ok(await prepareStyleCMaterials(options));assert.equal(Object.keys(ROOTS_REGIONS).length,9);
  const surface=createCanvas(260,260),c=surface.getContext('2d',{willReadFrequently:true});
  const tiles=new Set(),figures=new Set();
  function render(look,hero,outfit,view='game'){
    c.clearRect(0,0,260,260);drawHero(c,137,209,look,hero,.16,1.28,{outfit,view});
    return c.getImageData(0,0,260,260).data;
  }
  for(const suit of ROOTS_SUITS){
    const sheet=await load(new URL('../assets/power-armor/roots/'+suit.art+'.webp',import.meta.url));
    for(const [x,y,w,h] of ROOTS_REGIONS[suit.art]){
      assert.ok(w>24&&h>24&&x>=0&&y>=0&&x+w<=sheet.width&&y+h<=sheet.height);
      c.clearRect(0,0,260,260);c.drawImage(sheet,x,y,w,h,0,0,w,h);const p=c.getImageData(0,0,w,h).data;
      let green=0,ink=0;
      for(let i=0;i<p.length;i+=4){if(p[i+3]<100)continue;ink++;if(p[i+1]>45&&p[i+1]>1.17*p[i]&&p[i+1]>1.12*p[i+2])green++;}
      assert.ok(ink>200&&green/ink>.35,suit.name+' green enamel coverage '+green/ink);
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
