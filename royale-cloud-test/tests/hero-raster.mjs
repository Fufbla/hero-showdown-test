import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {prepareHeroMaterials} from '../hero-materials.mjs';
import {HERO_SAMPLES,renderHeroCard,checkHeroRendering,heroOutfit} from './hero-review-checks.mjs';
import {ROSTER,prepareCreature,drawCreature} from './creature-review-render.mjs';
import {PREVIEW_POSES} from '../hero-rig.mjs';
const require=createRequire(import.meta.url);let native;try{native=require('@napi-rs/canvas');}catch{native=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');}
const {createCanvas,loadImage}=native;globalThis.document={createElement:()=>createCanvas(1,1)};
const options={imageLoader:url=>loadImage(fileURLToPath(url)),canvasFactory:createCanvas};
await prepareHeroMaterials(options);
const output=fileURLToPath(new URL('../qa/hero-animation/',import.meta.url));mkdirSync(output,{recursive:true});
const checks=await checkHeroRendering(createCanvas,{progress:r=>{if(r.draws%460===0)console.log(`${r.draws} hero draws, ${r.assertions} assertions`);}});
writeFileSync(output+'raster-results.json',JSON.stringify({...checks,renderer:'@napi-rs/canvas',physicalDevices:'Not tested'},null,2)+'\n');
function board(w,h,title,subtitle){const canvas=createCanvas(w,h),c=canvas.getContext('2d');c.fillStyle='#132d37';c.fillRect(0,0,w,h);c.fillStyle='#f8e9c4';c.font='bold 28px sans-serif';c.fillText(title,26,40);c.font='16px sans-serif';c.fillStyle='#b7cdbf';c.fillText(subtitle,26,69);return {canvas,c};}
const comparison=board(1600,880,'Custom heroes · before and after','Same saved appearance and world scale. Both rows magnified equally; actual integrated monsters.');
for(let i=0;i<4;i++){
 const monster=ROSTER.find(v=>v.key===['monster-bottle','monster-crawler','monster-slime','monster-beetle'][i]),prepared=await prepareCreature(monster,options);
 for(let row=0;row<2;row++){const x=i*400,y=420+row*390,c=comparison.c;c.fillStyle='#203e46';c.fillRect(x+10,row*390+95,380,360);renderHeroCard(c,HERO_SAMPLES[i],'idle',.8,{before:!row,x:x+120,y,scale:1.8});drawCreature(c,prepared,{x:x+290,y,scale:1.8,face:-1});c.fillStyle='#f8e9c4';c.font='16px sans-serif';c.fillText((row?'AFTER':'BEFORE')+' · '+HERO_SAMPLES[i].name,x+22,y+28);}
 prepared.release();
}
writeFileSync(output+'before-after-with-monsters.png',comparison.canvas.toBuffer('image/png'));
const gallery=board(1600,900,'Your hero, still yours','Eight saved appearances · four body builds · all three age settings · unchanged gameplay scale');
for(let i=0;i<HERO_SAMPLES.length;i++){const x=i%4*400,y=425+Math.floor(i/4)*400;renderHeroCard(gallery.c,HERO_SAMPLES[i],'idle',.7,{x:x+200,y,scale:2.6});gallery.c.fillStyle='#f8e9c4';gallery.c.font='18px sans-serif';gallery.c.fillText(HERO_SAMPLES[i].name,x+60,y+28);}
writeFileSync(output+'customization-gallery.png',gallery.canvas.toBuffer('image/png'));
const poses=board(1500,1550,'Articulated action poses','Actual hero renderer · original attack windows and reach · no gameplay changes');
for(const [i,state] of PREVIEW_POSES.entries()){const x=i%5*300,y=365+Math.floor(i/5)*285;renderHeroCard(poses.c,HERO_SAMPLES[0],state,state.includes('kick')?.15:state.includes('punch')?.09:.22,{x:x+140,y,scale:2});poses.c.fillStyle='#f8e9c4';poses.c.font='16px sans-serif';poses.c.fillText(state,x+80,y+25);}
writeFileSync(output+'animation-poses.png',poses.canvas.toBuffer('image/png'));
const gear=board(1500,750,'Equipment follows the hero','Original catalog colors, emblems, rarity outlines and Legendary Merge designs retained');
for(const [i,mode] of ['starter','rare','merge:lightning','merge:venomis','merge:styrodog'].entries())for(let j=0;j<2;j++){const x=i*300,y=365+j*310;renderHeroCard(gear.c,HERO_SAMPLES[0],j?'kick':'idle',.15,{x:x+130,y,scale:2,outfit:heroOutfit(mode)});gear.c.fillStyle='#f8e9c4';gear.c.font='15px sans-serif';gear.c.fillText(mode,x+60,y+24);}
writeFileSync(output+'equipment-gallery.png',gear.canvas.toBuffer('image/png'));
const metrics=[];const canvas=createCanvas(480,360),c=canvas.getContext('2d');for(const sample of HERO_SAMPLES){for(let n=0;n<30;n++){c.clearRect(0,0,480,360);renderHeroCard(c,sample,'run',n/60);}const times=[];for(let n=0;n<180;n++){const start=performance.now();c.clearRect(0,0,480,360);renderHeroCard(c,sample,n%60<30?'run':'punch',n/60);times.push(performance.now()-start);}times.sort((a,b)=>a-b);metrics.push({hero:sample.name,draws:180,meanMs:times.reduce((a,b)=>a+b,0)/times.length,p95Ms:times[Math.floor(times.length*.95)]});}
writeFileSync(output+'native-performance.json',JSON.stringify({scope:'Native hero-only raster draw cost, not browser FPS',metrics},null,2)+'\n');
console.log(JSON.stringify(checks));
