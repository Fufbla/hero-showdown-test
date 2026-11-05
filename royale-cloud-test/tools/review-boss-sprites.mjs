// Headless raster QA of the exact runtime adapter; not browser or device testing.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {BossArt} from '../boss-art.mjs';
import {BOSS_SPRITE_DATA as data} from '../boss-sprites.mjs';
import {makeBoss,arenaSurfaces} from '../bosses.mjs';
import {attackFor} from '../boss-data.mjs';
const require=createRequire(import.meta.url);
let canvasModule;try{canvasModule=require('@napi-rs/canvas');}catch{canvasModule=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));}
const {createCanvas,loadImage}=canvasModule;
const out=fileURLToPath(new URL('../qa/boss-sprites/',import.meta.url));mkdirSync(out,{recursive:true});
export function fixture(region,state,column=0){
 const b=makeBoss(region,arenaSurfaces()[0]);b.face=1;b.x=b.prevX=170;b.y=b.prevY=235;let time=column*.5;
 if(state==='walk'){b.prevX=b.x-1;time=column/6+.001;}
 else if(state==='hit'){b.flash=.12-column*.03-.0001;}
 else if(state==='defeat'){b.state='dead';b.age=column*.24;}
 else if(state==='surge'){b.phase=3;time=column*.1;}
 else if(state!=='idle'){b.attack=attackFor(b,state);b.state=['windup','windup','active','recover'][column];b.age=column===1?b.attack.warning*.7:column===3?b.attack.recovery*.2:0;}
 return {b,time};
}
const metrics=[];
for(const region of [1,2,3]){
 const art=new BossArt({spriteImageLoader:url=>loadImage(fileURLToPath(url)),spriteCanvasFactory:()=>createCanvas(data.cell,data.cell),loadImages:true});await art.prepare(region);
 const canvas=createCanvas(1600,2240),c=canvas.getContext('2d');c.fillStyle='#111e29';c.fillRect(0,0,1600,2240);
 for(const [row,state] of data.bosses[region].states.entries())for(let col=0;col<4;col++){
  c.save();c.translate(col*400,row*280);c.fillStyle=(row+col)%2?'#1c303b':'#213a43';c.fillRect(2,2,396,276);
  c.fillStyle='#d7e8d6';c.font='16px sans-serif';c.fillText(`${state} · ${col+1}`,14,24);
  c.strokeStyle='#8db0a777';c.beginPath();c.moveTo(8,235);c.lineTo(392,235);c.stroke();
  const {b,time}=fixture(region,state,col);
  if(state==='surge'){const v=fixture(region,'idle').b;v.phase=1;art.step(v,0,0);v.phase=3;art.step(v,.01,0);art.step(v,time+.01,0);art.draw(c,v,{time:time+.06});}
  else{art.step(b,time,0);art.draw(c,b,{time:time+.06});}
  c.restore();
 }
 const path=out+`regional-${region}-contact-sheet.png`;writeFileSync(path,canvas.toBuffer('image/png'));console.log(path);
 // Use desktop and phone-shaped canvases, preserving game world scale as the game does.
 for(const [name,w,h] of [['desktop',1280,720],['mobile-sized',390,844]]){
  const view=createCanvas(w,h),ctx=view.getContext('2d'),worldScale=w/1280,b=makeBoss(region,arenaSurfaces()[0]);b.x=b.prevX=920;b.face=-1;b.phase=3;
  const draw=time=>{ctx.resetTransform();ctx.fillStyle='#1d3b45';ctx.fillRect(0,0,w,h);ctx.save();ctx.scale(worldScale,worldScale);ctx.fillStyle='#7c977c';ctx.fillRect(0,600,1280,120);art.step(b,time,1/60);art.draw(ctx,b,{time});ctx.restore();};
  for(let i=0;i<60;i++)draw(i/60);const timings=[];
  for(let i=0;i<600;i++){const start=performance.now();draw((i+60)/60);timings.push(performance.now()-start);}
  timings.sort((a,b)=>a-b);metrics.push({region,name,width:w,height:h,frames:600,mean_ms:timings.reduce((a,b)=>a+b)/timings.length,p95_ms:timings[Math.floor(timings.length*.95)],scope:'Headless raster boss renderer only; no browser FPS or physical-device claim'});
  writeFileSync(out+`regional-${region}-${name}.png`,view.toBuffer('image/png'));
 }
}
writeFileSync(out+'raster-performance.json',JSON.stringify(metrics,null,2)+'\n');console.log(JSON.stringify(metrics));
