// Native raster evidence; not browser FPS or device testing.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {BossArt} from '../boss-art.mjs';
import {LEGENDARY_SPRITE_DATA as D} from '../legendary-sprites.mjs';
import {makeLegendary} from '../legendary-bosses.mjs';
import {LEGENDARY_ATTACKS} from '../legendary-data.mjs';
import {arenaSurfaces} from '../bosses.mjs';
const require=createRequire(import.meta.url);let canvas;try{canvas=require('@napi-rs/canvas');}catch{canvas=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));}
const {createCanvas,loadImage}=canvas,out=fileURLToPath(new URL('../qa/boss-sprites/batch4/',import.meta.url));mkdirSync(out,{recursive:true});
const metrics=[];
for(const [id,p] of Object.entries(D.bosses)){
 const art=new BossArt({loadImages:true,spriteImageLoader:u=>loadImage(fileURLToPath(u)),spriteCanvasFactory:s=>createCanvas(s,s)});if(!await art.prepare(id))throw Error(`Load ${id}`);
 const sheet=createCanvas(1600,p.rows*280),c=sheet.getContext('2d');
 for(const [row,state] of p.states.entries())for(let col=0;col<4;col++){
  const b=makeLegendary(id,arenaSurfaces()[0]);b.x=b.prevX=200;b.y=b.prevY=250;b.face=1;let time=col*.5;
  if(state==='walk'){b.prevX-=1;time=col/6+.001;}else if(state==='hit')b.flash=.12-col*.031;else if(state==='defeat'){b.state='dead';b.age=col*.24;}else if(!['idle','walk'].includes(state)){
   const kind=state==='impact'?'leap':state;b.attack={...LEGENDARY_ATTACKS[kind],kind,targetX:350};b.state=['windup','windup','active','recover'][col];b.age=col===1?b.attack.warning*.7:col===3?.1:0;
   if(state==='impact'){b.state=col<2?'active':'recover';b.age=col===0?b.attack.duration*.97:col===1?b.attack.duration*.99:col===2?.01:b.attack.recovery*.5;}
  }
  art.step(b,time,1/60);c.save();c.translate(col*400,row*280);c.fillStyle=(row+col)%2?'#223d4b':'#19323f';c.fillRect(0,0,400,280);c.fillStyle='#ecf0dc';c.font='14px sans-serif';c.fillText(`${p.name} · ${state} · ${col+1}`,10,22);c.strokeStyle='#69897d';c.beginPath();c.moveTo(4,250);c.lineTo(396,250);c.stroke();art.draw(c,b,{time:time+.1});c.restore();
 }
 writeFileSync(out+`${id}-contact-sheet.png`,sheet.toBuffer('image/png'));
 for(const [label,w,h] of [['desktop',1280,720],['mobile-sized',390,844]]){
  const frame=createCanvas(w,h),ctx=frame.getContext('2d'),b=makeLegendary(id,arenaSurfaces()[0]);b.x=b.prevX=850;b.face=-1;b.phase=3;
  const draw=t=>{ctx.resetTransform();ctx.fillStyle='#102d39';ctx.fillRect(0,0,w,h);ctx.save();const s=Math.min(w/1280,h/720);ctx.translate(0,(h-720*s)/2);ctx.scale(s,s);ctx.fillStyle='#48616a';ctx.fillRect(0,600,1280,120);art.step(b,t,1/60);art.draw(ctx,b,{time:t});ctx.restore();};
  for(let i=0;i<60;i++)draw(i/60);const times=[];for(let i=0;i<600;i++){const start=performance.now();draw((i+60)/60);times.push(performance.now()-start);}times.sort((a,b)=>a-b);metrics.push({id,viewport:[w,h],frames:600,meanMs:times.reduce((a,b)=>a+b,0)/600,p95Ms:times[570],scope:'Native boss renderer cost only; not browser FPS'});writeFileSync(out+`${id}-${label}.png`,frame.toBuffer('image/png'));
 }
 console.log(`${p.name}: all states and two viewport shapes rendered`);
}
writeFileSync(out+'raster-performance.json',JSON.stringify(metrics,null,2)+'\n');
