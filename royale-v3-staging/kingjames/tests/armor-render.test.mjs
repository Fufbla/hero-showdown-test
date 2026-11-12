import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {prepareStyleCMaterials} from '../../../royale/style-c-materials.mjs';
import {drawHero} from '../../../royale/hero-art.mjs';
import {drawHero as originalDraw} from '../../../royale/style-c-hero.mjs';
import {styleCDefault} from '../../../royale/style-c-defaults.mjs';
import {motionFrameSample,STYLE_C_MOTIONS} from '../../../royale/style-c-motion.mjs';
import {EQUIPMENT} from '../../../royale/equipment.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
assert(await prepareStyleCMaterials({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))}));
const image=await loadImage(fileURLToPath(new URL('../../../royale/cosmetics/assets/royal-kimono/atlas.png',import.meta.url)));
const clothing=['fullbody','footwear'].map(part=>({id:'royal-kimono.'+part,category:part,image,manifest:JSON.parse(readFileSync(new URL('../../../royale/cosmetics/assets/royal-kimono/'+part+'.json',import.meta.url)))}));
const outfit={id:'starter-basic',origin:'starter'},pieces={};
for(const part of ['helmet','chest','boots','cape','gloves','emblem','belt','mask','suit'])pieces[part]=Object.values(EQUIPMENT).find(d=>d.part===part&&d.rarity==='legendary')||Object.values(EQUIPMENT).find(d=>d.part===part&&d.rarity==='rare');
const packet={...outfit,pieces,hideBaseCape:true,armorOutfitId:'old-peer-armor'};
const canvas=createCanvas(300,360),c=canvas.getContext('2d');
function render(draw,look,hero,time,options){c.clearRect(0,0,300,360);draw(c,150,330,look,hero,time,2,options);return Buffer.from(c.getImageData(0,0,300,360).data);}
test('all animation states and views are pixel-identical with or without armor, including old remote packets',()=>{
 let checks=0;
 for(const motion of Object.keys(STYLE_C_MOTIONS).filter(k=>k!=='agility'))for(const view of ['game','front','left','right','back'])for(const layers of [[],clothing]){
  const {hero,time,options}=motionFrameSample(motion,0),look={...styleCDefault('female'),hair:'braids',cape:true};
  const base=render(drawHero,look,hero,time,{...options,view,outfit,clothing:layers});
  assert(base.some((v,i)=>i%4===3&&v>0),'empty '+motion);
  assert.deepEqual(render(drawHero,look,hero,time,{...options,view,outfit:packet,clothing:layers}),base,motion+' '+view+' '+layers.length);checks++;
 }
 console.log(checks+' rendered animation/view/costume cases show zero armor pixel differences');
});
test('render test detects real old armor while preserving a customized hero',()=>{
 const {hero,time,options}=motionFrameSample('idle',0),look={...styleCDefault('male'),cape:true};
 const base=render(drawHero,look,hero,time,{...options,outfit});
 assert.notDeepEqual(render(originalDraw,look,hero,time,{...options,outfit:packet}),base);
 assert.deepEqual(render(drawHero,look,hero,time,{...options,outfit:packet}),base);
});
