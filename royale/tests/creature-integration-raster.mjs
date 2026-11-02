import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ROSTER,prepareCreature,drawCreature,checkCreatures} from './creature-review-render.mjs';
const require=createRequire(import.meta.url);let native;try{native=require('@napi-rs/canvas');}catch{native=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');}
const {createCanvas,loadImage}=native;globalThis.document={createElement:()=>createCanvas(1,1)};
const options={imageLoader:url=>loadImage(fileURLToPath(url)),canvasFactory:(w=512,h=w)=>createCanvas(w,h)};
const out=fileURLToPath(new URL('../qa/creature-integration/',import.meta.url));mkdirSync(out,{recursive:true});
const checks=await checkCreatures(createCanvas,options,(n,c)=>{if(n%6===0)console.log(`${n}/36 creatures, ${c} checks`);});
const gallery=createCanvas(1800,1710),ctx=gallery.getContext('2d');ctx.fillStyle='#102c35';ctx.fillRect(0,0,1800,1710);ctx.fillStyle='#edf2dc';ctx.font='bold 36px sans-serif';ctx.fillText('Hero Showdown Royale · All 36 in-game creatures',28,47);ctx.font='18px sans-serif';ctx.fillText('21 regular monsters · 7 regional bosses · 8 Legendary bosses · actual gameplay renderers',28,78);
const metrics=[];
for(const [i,item] of ROSTER.entries()){
 const x=i%6*300,y=100+Math.floor(i/6)*265,p=await prepareCreature(item,options);ctx.fillStyle='#203f48';ctx.fillRect(x+6,y+6,288,253);drawCreature(ctx,p,{x:x+150,y:y+196,scale:item.kind==='monster'?1.35:.6});ctx.fillStyle='#edf2dc';ctx.textAlign='center';ctx.font='16px sans-serif';ctx.fillText(item.name,x+150,y+223);ctx.fillStyle='#b8cbb6';ctx.font='12px sans-serif';ctx.fillText(item.kind==='monster'?`Region ${item.region} · regular`:item.kind==='regional'?`Region ${item.region} · boss`:'Legendary',x+150,y+243);ctx.textAlign='left';
 const canvas=createCanvas(640,480),c=canvas.getContext('2d'),times=[];for(let n=0;n<120;n++){const start=performance.now();c.clearRect(0,0,640,480);drawCreature(c,p,{u:n/121,x:320,y:380});times.push(performance.now()-start);}times.sort((a,b)=>a-b);metrics.push({creature:item.key,draws:120,meanMs:times.reduce((a,b)=>a+b,0)/120,p95Ms:times[114]});p.release();
}
writeFileSync(out+'all-36-game-renderers.png',gallery.toBuffer('image/png'));
writeFileSync(out+'raster-results.json',JSON.stringify({...checks,renderer:'@napi-rs/canvas',physicalDevices:'Not tested'},null,2)+'\n');
writeFileSync(out+'native-render-cost.json',JSON.stringify({scope:'Native creature-only draw cost, not browser FPS',metrics},null,2)+'\n');
console.log(JSON.stringify({passed:checks.passed,creatures:checks.creatures,checks:checks.checks}));
