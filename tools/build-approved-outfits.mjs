// Packs complete AI-authored cells. Does not rig or independently move limbs.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require('sharp'),{createCanvas,loadImage}=require('@napi-rs/canvas');
import {APPROVED_OUTFITS} from '../royale-v3-staging/kingjames/outfit-catalog.mjs';
import {UniversalHead} from '../royale-v3-staging/kingjames/head.mjs';
import {kingJamesLook} from '../royale-v3-staging/kingjames/selection.mjs';
import {DEFAULT_LOOK} from '../royale/appearance.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base=path.join(root,'royale-v3-staging/kingjames/outfits');
const original=JSON.parse(await fs.readFile(path.join(base,'kingjames-original/manifest.json')));
const necks=[[106,59],[104,54],[103,54],[101,53],[117,78],[121,69],[111,66],[105,57],[109,55],[113,58],[116,56],[118,48],[112,59],[114,61],[113,55],[119,52],[109,84],[116,56],[111,33],[108,20],[108,78],[103,43],[109,20],[108,20],[104,44],[104,48],[103,56],[106,71],[107,83],[108,96],[103,72],[102,54],[103,52],[107,48],[96,52],[103,48],[97,45],[86,50],[84,46],[101,42],[63,43],[111,68],[107,74],[115,92],[144,117],[127,88],[102,64],[104,39]];
const bottoms=[173,174,173,173,173,171,173,173,165,164,164,141,165,164,165,149,170,170,148,114,170,152,107,135,143,152,167,170,169,170,170,170,168,167,167,167,166,166,166,165,158,158,157,159,159,160,159,160];
const head=new UniversalHead({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))});await head.preload();
const look=kingJamesLook(DEFAULT_LOOK);
function findNeck(data,w,h,expected){
 let pts=[];for(let y=Math.max(0,Math.round(expected[1]-17));y<Math.min(h,expected[1]+13);y++)for(let x=Math.max(0,Math.round(expected[0]-17));x<Math.min(w,expected[0]+17);x++){
  const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2];if(data[i+3]>180&&r>70&&r>g*1.18&&g>b*1.13&&r-g>12&&g-b>8&&r<g*2.35)pts.push([x,y]);
 }
 if(pts.length<6)return expected;
 // The neck is the nearest connected skin component, not gold trim or a hand.
 const keys=new Set(pts.map(([x,y])=>y*w+x)),groups=[];
 while(keys.size){const seed=keys.values().next().value;keys.delete(seed);const todo=[seed],group=[];
  while(todo.length){const k=todo.pop(),x=k%w,y=Math.floor(k/w);group.push([x,y]);for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const n=(y+dy)*w+x+dx;if(keys.delete(n))todo.push(n);}}if(group.length>5)groups.push(group);
 }
 const best=groups.map(g=>({g,x:g.reduce((s,p)=>s+p[0],0)/g.length,y:g.reduce((s,p)=>s+p[1],0)/g.length})).sort((a,b)=>Math.hypot(a.x-expected[0],a.y-expected[1])-Math.hypot(b.x-expected[0],b.y-expected[1]))[0];
 return best?[Math.round(best.x),Math.round(best.y)]:expected;
}
async function preview(id,m){const atlas=await loadImage(path.join(base,id,'body.webp')),f=m.frames[0],canvas=createCanvas(256,256),c=canvas.getContext('2d');c.drawImage(atlas,...f.rect,0,0,...m.cell);head.draw(c,look,f.head,m.head.scale);await sharp(canvas.toBuffer('image/png')).resize(256,256).webp({quality:88}).toFile(path.join(base,id,'preview.webp'));}
function alphaBounds(data,w,h){let x0=w,y0=h,x1=0,y1=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>32){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}if(x0>x1)throw Error('Empty artwork cell');return{x0,y0,x1,y1};}
await preview('kingjames-original',original);
const selected=process.argv.slice(2);
for(const outfit of APPROVED_OUTFITS){
 if(selected.length&&!selected.includes(outfit.id))continue;
 const source=path.join(root,'docs/approved-outfits',outfit.id+'-body.png'),out=path.join(base,outfit.id);await fs.mkdir(out,{recursive:true});
 const normalized=await sharp(source).resize(1448,1086,{fit:'fill'}).ensureAlpha().png().toBuffer(),overlays=[],m=structuredClone(original);m.id=outfit.id;m.label=outfit.label;
 for(let i=0;i<48;i++){
  const tile=await sharp(normalized).extract({left:i%8*181,top:Math.floor(i/8)*181,width:181,height:181}).png().toBuffer();
  const pixels=await sharp(tile).ensureAlpha().raw().toBuffer(),neck=findNeck(pixels,181,181,necks[i]);
  let dx=28,dy=230-bottoms[i],angle=0;
  if([11,15,18,19,21,22,23,24,25,26,27].includes(i))dy=112-neck[1];
  if(i===44){dx=10;angle=1.22;}else if(i===43)angle=.72;else if(i===45)angle=.5;else if(i===40)angle=-.20;
  overlays.push({input:tile,left:i%8*256+dx,top:Math.floor(i/8)*256+dy});
  m.frames[i].head=[neck[0]+dx,neck[1]+dy,angle];m.frames[i].hand=[neck[0]+dx+18,neck[1]+dy+58];if(i===34)m.frames[i].hand=[dx+163,dy+64];
 }
 await sharp({create:{width:2048,height:1536,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(overlays).webp({quality:92,alphaQuality:100}).toFile(path.join(out,'body.webp'));
 const attackSource=path.join(root,'docs/approved-outfits',outfit.id+'-attacks.png');
 try{
  const attacks=await sharp(attackSource).resize(2048,1792,{fit:'fill'}).ensureAlpha().png().toBuffer();
  for(let i=48;i<100;i++){const f=m.frames[i],tile=await sharp(attacks).extract({left:f.rect[0],top:f.rect[1],width:256,height:256}).ensureAlpha().raw().toBuffer();const neck=findNeck(tile,256,256,f.head);f.head=[...neck,f.head[2]];}
  await sharp(attacks).webp({quality:92,alphaQuality:100}).toFile(path.join(out,'attacks.webp'));
 }catch(e){throw new Error(outfit.id+': missing or invalid power atlas',{cause:e});}
 const basicSource=path.join(root,'docs/approved-outfits',outfit.id+'-basic.png');
 const bm=await sharp(basicSource).metadata(),basicTiles=[];
 for(let i=100;i<116;i++){
  const n=i-100,f=m.frames[i],x=Math.round(n%8*bm.width/8),y=Math.round(Math.floor(n/8)*bm.height/2),w=Math.round((n%8+1)*bm.width/8)-x,h=Math.round((Math.floor(n/8)+1)*bm.height/2)-y;
  const raw=await sharp(basicSource).extract({left:x,top:y,width:w,height:h}).ensureAlpha().raw().toBuffer(),b=alphaBounds(raw,w,h),s=2048/bm.width;
  const neck=findNeck(raw,w,h,[132/s,b.y1-(230-f.head[1])/s]),dx=132-neck[0]*s,dy=230-b.y1*s;
  const crop={left:Math.max(0,b.x0-3),top:Math.max(0,b.y0-3),width:Math.min(w,b.x1+4)-Math.max(0,b.x0-3),height:Math.min(h,b.y1+4)-Math.max(0,b.y0-3)};
  const left=Math.round(dx+crop.left*s),top=Math.round(dy+crop.top*s),width=Math.round(crop.width*s),height=Math.round(crop.height*s);
  if(left<0||top<0||left+width>256||top+height>256)throw Error(outfit.id+': clipped ordinary attack '+n);
  const input=await sharp(raw,{raw:{width:w,height:h,channels:4}}).extract(crop).resize(width,height).png().toBuffer();
  basicTiles.push({input,left:n%8*256+left,top:Math.floor(n/8)*256+top});
  f.head=[132,Math.round(dy+neck[1]*s),0];f.bounds=[left,top,width,height];
 }
 await sharp({create:{width:2048,height:512,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(basicTiles).webp({quality:92,alphaQuality:100}).toFile(path.join(out,'basic-attacks-v1.webp'));
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(m,null,2)+'\n');await preview(outfit.id,m);console.log(outfit.id+': packed body and registered custom head');
}
