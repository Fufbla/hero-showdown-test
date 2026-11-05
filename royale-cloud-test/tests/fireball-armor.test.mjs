import {expectedDamage,near as balanceNear} from './expected-balance.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {Game,decodeSave} from '../core.mjs';
import {FIREBALL_SUITS,FIREBALL_PIECES} from '../power-armor.mjs';
import {resaleValue} from '../costume-catalog.mjs';
import {validateSnapshot} from '../cloud-validation.mjs';
import {isFireballFile} from './power-armor-preservation.mjs';
import {FIREBALL_REGIONS} from '../assets/power-armor/fireball/regions.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../style-c-hero.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {HAIR_STYLES,LOOK_OPTIONS} from '../appearance.mjs';
import {previewHero,PREVIEW_POSES} from '../hero-rig.mjs';
import {equipmentOutfit} from '../equipment.mjs';
const root=new URL('../../',import.meta.url),git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const approved='dad657dfa04b2b3ac7a3b8612fa728621cad7c4b';
test('Fireball batch stays within the approved Style C extension points',()=>{
 const changed=git('diff','--name-only',approved).split('\n').filter(Boolean);
 assert.deepEqual(changed.filter(p=>!isFireballFile(p)),[]);
 assert.equal(Object.keys(FIREBALL_PIECES).length,27);
});
function shop(level=99){
 const g=new Game();g.hero.level=level;g.hero.coins=99999;g.hero.hp=g.hero.maxHp=100+15*(level-1);
 g.powers.data.levels.fireball=Math.min(20,level-1);g.powers.data.points=level-1-g.powers.data.levels.fireball;
 g.powers.data.equipped=['fireball',null,null];assert.ok(g.visitTree());return g;
}
const buy=(g,selection)=>g.buyCostume(selection,{confirmed:true,revision:g.economy.revision});
for(const suit of FIREBALL_SUITS)test(suit.name+' purchase, save, cast and immediate removal',()=>{
 const locked=shop(suit.level-1);assert.equal(buy(locked,{setId:suit.setId}).ok,false);
 const g=shop(),start=JSON.stringify(g.powers.data),p=buy(g,{setId:suit.setId});assert.ok(p.ok);
 assert.equal(g.hero.coins,99999-suit.price);assert.equal(p.items.length,3);
 assert.deepEqual(p.definitions.map(d=>d.catalogValue),[Math.floor(suit.price/4),suit.price/2,Math.ceil(suit.price/4)]);
 for(const i of p.items)assert.ok(g.equipItem(i.uid));
 const stats=g.powers.stats('fireball');assert.equal(stats.level,20+suit.fireballLevels);assert.equal(stats.projectiles,3);
 assert.equal(stats.pierce,2);assert.equal(stats.cooldown,5);assert.equal(stats.damage,expectedDamage('fireball',stats.level,g.hero.level,{fireball:4}));
 assert.equal(JSON.stringify(g.powers.data),start);
 const snapshot=decodeSave(g.save());assert.ok(snapshot);assert.equal(validateSnapshot(JSON.parse(g.save())).inventory.items.length,3);
 const clone=new Game({save:snapshot});assert.equal(clone.powers.stats('fireball').level,stats.level);
 g.leaveTree();g.paused=false;assert.ok(g.powers.activateSlot(0));assert.equal(g.powers.bursts[0].damage,stats.damage);
 for(const piece of p.items){
   const r=new Game({save:snapshot});r.paused=true;assert.ok(r.equipItem(piece.uid));
   assert.equal(r.powers.stats('fireball').level,20);
   assert.equal(r.equipment.fireball,4-FIREBALL_PIECES[piece.catalogId].stats.fireball);
 }
 assert.equal(clone.salePreview(p.items[0].uid).ok,false);assert.ok(clone.equipItem(p.items[0].uid)); const resale=clone.salePreview(p.items[0].uid);assert.equal(resale.value,resaleValue(p.definitions[0]));
 assert.ok(clone.sellItem(p.items[0].uid,{confirmed:true,revision:clone.economy.revision}).ok);
 assert.equal(clone.powers.stats('fireball').level,20);assert.equal(clone.equipment.fireball,3);
});
test('mixed tiers, incomplete sets, unlearned power, effective milestones and seven carried pieces',()=>{
 const g=shop();const items=FIREBALL_SUITS.slice(0,2).map(s=>buy(g,{setId:s.setId}).items);
 for(const piece of [items[0][0],items[0][1],items[1][2]])g.equipItem(piece.uid);
 assert.equal(g.powers.stats('fireball').level,20);
 assert.ok(!buy(g,{setId:FIREBALL_SUITS[2].setId}).ok);
 const def=FIREBALL_PIECES[items[0][0].catalogId];assert.ok(buy(g,{catalogId:def.id}).ok);assert.equal(g.inventory.items.length,7);
 assert.equal(buy(g,{catalogId:def.id}).ok,false);
 g.equipItem(items[0][2].uid);
 for(const [learned,expectedShots,pierce] of [[8,1,1],[9,2,1],[18,2,1],[19,3,2],[20,3,2]]){
  g.powers.data.levels.fireball=learned;const s=g.powers.stats('fireball');assert.equal(s.projectiles,expectedShots);assert.equal(s.pierce,pierce);
 }
 g.powers.data.levels.fireball=0;g.powers.data.equipped=[null,null,null];g.leaveTree();g.paused=false;assert.equal(g.powers.activate('fireball'),false);
});
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const artOptions={canvasFactory:createCanvas,imageLoader:url=>loadImage(fileURLToPath(url))};
function worn(suit,omit){
 const items=Object.values(FIREBALL_PIECES).filter(d=>d.setId===suit.setId&&d.part!==omit).map((d,i)=>({uid:'drop-'+(i+1),catalogId:d.id}));
 return {items,equipped:Object.fromEntries(items.map(i=>[FIREBALL_PIECES[i.catalogId].part,i.uid]))};
}
test('all 81 armor views contain separate red artwork; all outfits follow both heroes through every authored pose',async()=>{
 assert.equal(Object.keys(FIREBALL_REGIONS).length,9);
 assert.ok(await prepareStyleCMaterials(artOptions));const hashes=new Set(),fronts=new Set();
 const c=createCanvas(210,220),ctx=c.getContext('2d',{willReadFrequently:true});
 for(const suit of FIREBALL_SUITS){
  const image=await artOptions.imageLoader(new URL('../assets/power-armor/fireball/'+suit.art+'.webp',import.meta.url));
  for(const [x,y,w,h] of FIREBALL_REGIONS[suit.art]){
   assert.ok(x>=0&&y>=0&&x+w<=image.width&&y+h<=image.height);
   ctx.clearRect(0,0,210,220);ctx.drawImage(image,x,y,w,h,0,0,w,h);
   const p=ctx.getImageData(0,0,w,h).data;let red=0,ink=0;
   for(let i=0;i<p.length;i+=4){if(p[i+3]<100)continue;ink++;if(p[i]>p[i+1]*1.4&&p[i]>p[i+2]*1.3&&p[i]>55)red++;}
   assert.ok(ink>200&&red/ink>.36,suit.name+' red coverage '+red/ink);
   hashes.add(createHash('sha256').update(p).digest('hex'));
  }
  const full=equipmentOutfit(worn(suit));
  for(const sex of ['male','female'])for(const build of LOOK_OPTIONS.build)for(const state of PREVIEW_POSES){
   const look={...styleCDefault(sex),build},hero=previewHero(state,.16);ctx.clearRect(0,0,210,220);
   drawHero(ctx,109,176,look,hero,.16,1.05,{view:'game',outfit:full});
   const px=ctx.getImageData(0,0,210,220).data;let red=0,edge=0;
   for(let i=0;i<px.length;i+=4){if(px[i+3]<64)continue;const n=i/4;if(!Math.floor(n/210)||n%210===0||n%210===209||n>=210*219)edge++;if(px[i]>100&&px[i]>px[i+1]*1.6&&px[i]>px[i+2]*1.4)red++;}
   assert.ok(red>25&&!edge,suit.name+'/'+sex+'/'+build+'/'+state);
   if(sex==='male'&&build==='balanced'&&state==='idle')fronts.add(createHash('sha256').update(px).digest('hex'));
  }
  for(const hair of HAIR_STYLES)for(const sex of ['male','female']){
    const look={...styleCDefault(sex),hair};const before=JSON.stringify(look);ctx.clearRect(0,0,210,220);
    drawHero(ctx,104,180,look,previewHero('run',.14),.14,1,{view:'back',outfit:full});assert.equal(JSON.stringify(look),before);
  }
 }
 assert.equal(hashes.size,81);assert.equal(fronts.size,9);
});
