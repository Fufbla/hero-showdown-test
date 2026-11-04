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
import {SUPER_KICK_SUITS,SUPER_KICK_PIECES,matchingSuperKickBonus} from '../super-kick-armor.mjs';
import {powerStats} from '../powers.mjs';
import {validateSnapshot} from '../cloud-validation.mjs';
import {equipmentOutfit} from '../equipment.mjs';
import {inventoryFor} from './style-c-final-fixtures.mjs';
import {SUPER_KICK_REGIONS} from '../assets/power-armor/superKick/regions.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawArmorPiece} from '../power-armor-art.mjs';
import {motionFrameSample} from '../style-c-motion.mjs';
import {STYLE_C_MOTIONS} from '../style-c-clips.mjs';
import {drawHero} from '../hero-art.mjs';
import {previewHero,PREVIEW_POSES} from '../hero-rig.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {LOOK_OPTIONS,LOOK_RANGES,HAIR_STYLES} from '../appearance.mjs';

const totals=[500,1250,2500,4500,7500,12000,18000,27000,40000];
const ids=suit=>COSTUME_PARTS.map(p=>suit.setId+'-'+p);
function shop(level=99,learned=20){
 const g=new Game();g.hero.level=level;g.hero.maxHp=g.hero.hp=15*(level-1)+100;g.hero.coins=99999;
 g.powers.data.levels.superKick=learned;g.powers.data.points=level-1-learned;g.powers.data.equipped=[learned?'superKick':null,null,null];
 assert.ok(g.visitTree());return g;
}
const buy=(g,selection)=>g.buyCostume(selection,{confirmed:true,revision:g.economy.revision});
function target(g,id,dx,props={}){
 const surface=g.surfaces.find(s=>s.y===600);
 const e=g.makeEnemy('bottle',g.hero.x+dx,surface,id);
 Object.assign(e,{protection:0,hp:10000,maxHp:10000,stagger:0},props);g.enemies.push(e);return e;
}
function castScene(learned=20){
 const g=shop(99,learned);g.leaveTree();g.paused=false;g.inventory=inventoryFor(ids(SUPER_KICK_SUITS[8]));g.refreshEquipment();
 g.hero.x=g.hero.prevX=1000;g.hero.y=600;g.hero.grounded=true;g.enemies=[];return g;
}

test('protect all five approved armor collections, base hero artwork, creatures and combat geometry',()=>{
 assertCleanupSimulation();const paths=['royale/power-armor.mjs','royale/steel-armor.mjs','royale/roots-armor.mjs','royale/strength-armor.mjs','royale/whirlwind-armor.mjs','royale/assets/power-armor/whirlwind','royale/assets/power-armor/roots','royale/assets/power-armor/strength','royale/assets/power-armor/fireball','royale/assets/power-armor/steel','royale/assets/hero','royale/assets/monsters','royale/assets/boss-sprites','royale/hero-rig.mjs','royale/style-c-rig.mjs'];
 assert.equal(execFileSync('git',['diff','--name-only','15ec1df53ebc613851aa4e62201aa9fddf1494a9','--',...paths],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}),'');
 assert.equal(Object.keys(SUPER_KICK_PIECES).length,27);
});
for(const [i,s] of SUPER_KICK_SUITS.entries())test(s.name+' whole set, piece pricing, save round trip and removal',()=>{
 const low=shop(s.level-1,1);assert.equal(buy(low,{setId:s.setId}).ok,false);assert.equal(buy(low,{catalogId:ids(s)[0]}).ok,false);
 const g=shop(),points=g.powers.data.points,coins=g.hero.coins,purchase=buy(g,{setId:s.setId});assert.ok(purchase.ok);
 const price=totals[i];assert.equal(s.level,10*(i+1));assert.equal(coins-g.hero.coins,price);
 assert.deepEqual(purchase.definitions.map(d=>d.catalogValue),[Math.floor(price/4),price/2,Math.ceil(price/4)]);
 for(const item of purchase.items)assert.ok(g.equipItem(item.uid));
 const stats=g.powers.stats('superKick');assert.equal(stats.level,21+i);assert.equal(stats.damage,159+i*2);
 assert.equal(stats.kicks,6);assert.equal(stats.reach,76);assert.equal(stats.cooldown,6);
 const saved=validateSnapshot(JSON.parse(g.save()));assert.equal(saved.powers.levels.superKick,20);assert.equal(saved.powers.points,points);
 const r=new Game({save:decodeSave(g.save())});assert.equal(r.powers.stats('superKick').level,stats.level);
 for(const piece of purchase.items){const copy=new Game({save:saved});copy.paused=true;assert.ok(copy.equipItem(piece.uid));assert.equal(copy.powers.stats('superKick').level,20);}
 const sale=r.sellItem(purchase.items[1].uid,{confirmed:true,revision:r.economy.revision});assert.ok(sale.ok);assert.equal(sale.value,resaleValue(purchase.definitions[1]));assert.equal(r.powers.stats('superKick').damage,157);
});
function stageCombo(g,health){
 g.hero.face=1;
 return health.map((hp,i)=>target(g,100+i,27+5*i,{hp,maxHp:hp}));
}
function followCombo(g,enemies){
 const hp=enemies.map(e=>e.hp),hits=[],kicks=new Set();
 for(let frame=0;frame<300&&g.powers.active.superKick;frame++){
  if(g.hero.attack?.power==='superKick')kicks.add(g.hero.attack.id);
  assert.ok(!g.powers.cooldowns.superKick);g.step(STEP,{});
  enemies.forEach((e,i)=>{if(e.hp<hp[i]){hits.push({target:i,damage:hp[i]-e.hp});hp[i]=e.hp;}});
 }
 assert.ok(!g.powers.active.superKick);assert.equal(g.powers.cooldowns.superKick,6);
 return {hits,kicks:kicks.size};
}
test('one press performs six equal strikes at effective level 29 and starts cooldown after recovery',()=>{
 const g=castScene(),enemies=stageCombo(g,[10000,10000]);
 assert.ok(g.powers.activateSlot(0));assert.equal(g.powers.activateSlot(0),false);
 const expected=g.powers.stats('superKick').damage,{hits,kicks}=followCombo(g,enemies);
 assert.equal(kicks,6);assert.deepEqual(hits,Array(6).fill({target:0,damage:expected}));
 assert.equal(g.powers.activateSlot(0),false);g.powers.step(5.9);assert.equal(g.powers.activateSlot(0),false);
 g.powers.step(.11);assert.ok(g.powers.activateSlot(0));
});
test('combo retains its living target when another moves closer and retargets on defeat',()=>{
 const g=castScene(),damage=g.powers.stats('superKick').damage,enemies=stageCombo(g,[2*damage,10000]);
 assert.ok(g.powers.activateSlot(0));
 for(let n=0;n<45&&enemies[0].hp===2*damage;n++)g.step(STEP,{});
 assert.equal(enemies[0].hp,damage);enemies[1].x=g.hero.x+20;
 const {hits}=followCombo(g,enemies);assert.deepEqual(hits.map(h=>h.target),[0,1,1,1,1]);assert.ok(hits.every(h=>h.damage===damage));
});
test('a living target moving out of reach never redirects later kicks onto a bystander',()=>{
 const g=castScene(),foes=stageCombo(g,[10000,10000]);g.powers.activateSlot(0);
 for(let n=0;n<45&&foes[0].hp===10000;n++)g.step(STEP,{});
 assert.ok(foes[0].hp<10000);foes[0].x=g.hero.x+450;foes[0].stagger=20;foes[1].stagger=20;
 const {hits}=followCombo(g,foes);assert.deepEqual(hits,[]);assert.equal(foes[1].hp,10000);
});
test('removing a piece before contact updates the pending strike and removes extra queued kicks',()=>{
 const g=castScene(1),enemies=stageCombo(g,[10000]);assert.ok(g.powers.activateSlot(0));const strike=g.hero.attack;
 assert.equal(strike.stats.kicks,4);delete g.inventory.equipped.boots;g.refreshEquipment();
 assert.equal(g.hero.attack,strike);assert.equal(strike.stats.level,1);assert.equal(strike.stats.kicks,2);
 const {hits}=followCombo(g,enemies);assert.deepEqual(hits,Array(2).fill({target:0,damage:g.powers.stats('superKick').damage}));
});
test('losing and restoring equipment after an impact cannot replay a kick or extend a running combination',()=>{
 const g=castScene(1),enemies=stageCombo(g,[10000]);g.powers.activateSlot(0);
 for(let n=0;n<45&&enemies[0].hp===10000;n++)g.step(STEP,{});
 assert.ok(enemies[0].hp<10000);
 const chest=g.inventory.equipped.chest;delete g.inventory.equipped.chest;g.refreshEquipment();
 assert.equal(g.powers.active.superKick.left,1);g.inventory.equipped.chest=chest;g.refreshEquipment();
 assert.equal(g.powers.active.superKick.left,1);const {hits}=followCombo(g,enemies);assert.equal(hits.length,1);
});
test('seven-item limit, 25% resale, mixed tier, mixed collection, and unlearned SuperKick',()=>{
 const g=shop(99,0),s=SUPER_KICK_SUITS[0];const items=buy(g,{setId:s.setId}).items;
 for(const item of items)g.equipItem(item.uid);g.leaveTree();g.paused=false;assert.equal(g.powers.activate('superKick'),false);g.visitTree();
 const others=buy(g,{setId:SUPER_KICK_SUITS[1].setId});assert.ok(g.equipItem(others.items[1].uid));assert.equal(matchingSuperKickBonus(g.inventory,99),0);
 const steel=Object.values(STEEL_PIECES)[0];assert.ok(buy(g,{catalogId:steel.id}).ok);g.equipItem(g.inventory.items[6].uid);
 assert.equal(matchingSuperKickBonus(g.inventory,99),0);assert.equal(g.inventory.items.length,7);assert.equal(buy(g,{catalogId:ids(s)[0]}).ok,false);
 assert.equal(resaleValue(SUPER_KICK_PIECES[ids(s)[0]]),31);
 for(const catalog of [FIREBALL_PIECES,STEEL_PIECES,ROOTS_PIECES,STRENGTH_PIECES,WHIRLWIND_PIECES]){
   const prior=shop();prior.inventory=inventoryFor(Object.keys(catalog).slice(-3));prior.refreshEquipment();
   const restored=new Game({save:decodeSave(prior.save())});assert.equal(restored.equipment.superKickLevels,undefined);assert.deepEqual(restored.inventory,prior.inventory);
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

test('only damage scales above 20, and every kick-count milestone below 20 remains in force',()=>{
 for(let learned=1;learned<=20;learned++)for(let bonus=0;bonus<=9;bonus++){
  const level=learned+bonus,stats=powerStats('superKick',learned,{equipment:{superKickLevels:bonus}});
  assert.equal(stats.damage,21+2*(level-1));assert.equal(stats.kicks,Math.min(6,2+Math.floor(level/5)));
  assert.equal(stats.reach,76);assert.equal(stats.cooldown,6);
 }
 assert.equal(powerStats('superKick',20,{equipment:{superKickLevels:1000}}).level,29);
});

test('81 distinct silver sprite views register to both heroes, every build, all motion clips and saved hairstyles',async()=>{
  const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
  const load=url=>loadImage(fileURLToPath(url)), options={canvasFactory:createCanvas,imageLoader:load};
  assert.ok(await prepareStyleCMaterials(options));assert.equal(Object.keys(SUPER_KICK_REGIONS).length,9);
  const surface=createCanvas(260,260),c=surface.getContext('2d',{willReadFrequently:true});
  const tiles=new Set(),figures=new Set(),silhouettes=[];
  function render(look,hero,outfit,view='game'){
    c.clearRect(0,0,260,260);drawHero(c,137,209,look,hero,.16,1.28,{outfit,view});
    return c.getImageData(0,0,260,260).data;
  }
  for(const suit of SUPER_KICK_SUITS){
    const sheet=await load(new URL('../assets/power-armor/superKick/'+suit.art+'.webp',import.meta.url));
    for(const [x,y,w,h] of SUPER_KICK_REGIONS[suit.art]){
      assert.ok(w>24&&h>24&&x>=0&&y>=0&&x+w<=sheet.width&&y+h<=sheet.height);
      c.clearRect(0,0,260,260);c.drawImage(sheet,x,y,w,h,0,0,w,h);const p=c.getImageData(0,0,w,h).data;
      let silver=0,ink=0;
      for(let i=0;i<p.length;i+=4){if(p[i+3]<100)continue;ink++;if(p[i+1]>78&&Math.max(p[i],p[i+1],p[i+2])-Math.min(p[i],p[i+1],p[i+2])<54)silver++;}
      assert.ok(ink>w*h*.20&&silver/ink>.35,suit.name+' silver metal coverage '+silver/ink);
      tiles.add(createHash('sha256').update(p).digest('hex'));
    }
    // Compare shape independently of color, shading, trim or the original sprite size.
    const outline=[];
    for(const slot of [0,3,6]){
      c.clearRect(0,0,32,32);c.drawImage(sheet,...SUPER_KICK_REGIONS[suit.art][slot],0,0,32,32);
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
      // Inspect the atlas draw transforms at every authored kicking keyframe.
      // A sole-facing contact cel already supplies the foot and must not paint a second toe.
      for(const clip of ['kick','air-kick','superKick']){
        for(let frame=0;frame<STYLE_C_MOTIONS[clip].frames.length;frame++){
          const sample=motionFrameSample(clip,frame);
          const pose=drawHero(c,137,209,base,sample.hero,sample.time,1.28,{outfit,...sample.options});
          for(const side of [0,1]){
            const marks=[],probe={save:()=>c.save(),restore:()=>c.restore(),translate:(...v)=>c.translate(...v),
              rotate:v=>c.rotate(v),scale:(...v)=>c.scale(...v),drawImage:()=>marks.push(c.getTransform())};
            c.save();c.resetTransform();drawArmorPiece(probe,'boots',outfit.pieces.boots,pose,{length:40},side);c.restore();
            const [,knee,ankle]=pose.legs[side],dx=ankle[0]-knee[0],dy=ankle[1]-knee[1],length=Math.hypot(dx,dy);
            assert.equal(marks.length,pose.sole===side?1:2);
            assert.ok(Math.hypot(marks[0].e-knee[0],marks[0].f-knee[1])<.001);
            assert.ok(Math.hypot(marks[0].c-dx/length,marks[0].d-dy/length)<.001);
            if(marks[1])assert.ok(Math.hypot(marks[1].e-ankle[0],marks[1].f-ankle[1])<.001);
          }
        }
      }
      for(const edge of [0,1]){
        const extremes=Object.fromEntries(Object.entries(LOOK_RANGES).map(([k,r])=>[k,r[edge]]));
        const look={...base,...extremes},h=previewHero('superKick',.16);
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
