import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {prepareStyleCMaterials} from '../style-c-materials.mjs';import {drawHero} from '../style-c-hero.mjs';import {styleCDefault} from '../style-c-defaults.mjs';import {previewHero,PREVIEW_POSES} from '../hero-rig.mjs';import {EQUIPMENT,equipmentOutfit,emptyInventory} from '../equipment.mjs';import {sanitizeLook,HAIR_STYLES} from '../appearance.mjs';import {CapeCloth} from '../cape.mjs';
await prepareStyleCMaterials({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))});
const canvas=createCanvas(240,270),c=canvas.getContext('2d');
test('every catalog wearable renders across four directions and every existing motion without changing ownership or appearance',async()=>{
 let frames=0;
 for(const [i,item]of Object.values(EQUIPMENT).entries()){
  const start=Number(process.env.WARDROBE_START||0),limit=Number(process.env.WARDROBE_LIMIT||398);
  if(i<start)continue;if(i>=start+limit)break;
  const inventory=emptyInventory();inventory.items.push({uid:'qa',catalogId:item.id});inventory.equipped[item.part]='qa';
  const cloth=new CapeCloth(),outfit=equipmentOutfit(inventory),look=sanitizeLook({...styleCDefault(i%2?'female':'male'),hair:HAIR_STYLES[i%HAIR_STYLES.length],torso:i%2?.85:1.15,shoulders:i%3?.8:1.2,build:i%3?'slender':'full'});
  const before=JSON.stringify({inventory,look});
  for(const view of ['front','right','back','left'])for(const motion of PREVIEW_POSES){
   const hero=previewHero(motion,.38),beforeHero=JSON.stringify(hero);c.clearRect(0,0,240,270);
   const p=drawHero(c,120,245,look,hero,.38,1.3,{view,poseName:motion,outfit,cloth,dt:0});
   c.getImageData(0,0,1,1); // Flush the native canvas command queue between frames.
   assert.ok(p.head.every(Number.isFinite),`${item.id}/${view}/${motion}`);assert.equal(JSON.stringify(hero),beforeHero);frames++;
  }
  assert.equal(JSON.stringify({inventory,look}),before);if(i%4===0){await new Promise(resolve=>setTimeout(resolve,0));global.gc?.();}
 }
 console.log(`Automated render coverage: ${frames/(4*PREVIEW_POSES.length)} items × 4 directions × ${PREVIEW_POSES.length} motions = ${frames} frames (not visual approval).`);
});
