// Deterministic packing only: image_gen authored every costume pose.
// This script isolates full silhouettes (including tails crossing source tiles),
// removes nearly transparent export noise, scales uniformly and measures keys.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
let sharp;
try { sharp=require('sharp'); }
catch { sharp=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'', 'sharp')); }
const sourceDir=path.join(root,'test-only/four-powers/puppy-source');
const outputDir=path.join(root,'royale-v3-staging/kingjames/puppy/assets');
const sourceFile=process.argv[2]||path.join(sourceDir,'action-source.png');
const approvedFile=process.argv[3]||path.join(sourceDir,'approved-preview.png');
const base=JSON.parse(await readFile(path.join(root,'royale-v3-staging/costumes/assets/stuffed-animal-costume/manifest.json'),'utf8'));
await mkdir(outputDir,{recursive:true});
await mkdir(sourceDir,{recursive:true});
const {data,info}=await sharp(sourceFile).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const W=info.width,H=info.height,CELL=256,SCALE=180/141;
const isKey=(d,i)=>d[i+3]>=32&&d[i]>70&&d[i+2]>70&&d[i]>d[i+1]*1.5&&d[i+2]>d[i+1]*1.5;
const round=n=>Math.round(n*100)/100;

function bounds(d,w,h,test=(d,i)=>d[i+3]>=32){
 let x0=w,y0=h,x1=-1,y1=-1,count=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(test(d,(y*w+x)*4)){
  x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);count++;
 }
 return count?{box:[x0,y0,x1+1,y1+1],count}:null;
}

// The input's grid is a layout guide, not a cropping boundary. Detect complete
// connected silhouettes so a long tail never disappears at a nominal tile edge.
const labels=new Int32Array(W*H),parts=[];
let nextId=0;
for(let n=0;n<W*H;n++){
 if(labels[n]||data[n*4+3]<32)continue;
 const id=++nextId,queue=[n];labels[n]=id;
 let x0=W,y0=H,x1=0,y1=0,keyCount=0,keyX=0,keyY=0;
 for(let q=0;q<queue.length;q++){
  const at=queue[q],x=at%W,y=Math.floor(at/W);
  x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
  if(isKey(data,at*4)){keyCount++;keyX+=x;keyY+=y;}
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const xx=x+dx,yy=y+dy,k=yy*W+xx;
   if(xx<0||yy<0||xx>=W||yy>=H||labels[k]||data[k*4+3]<32)continue;
   labels[k]=id;queue.push(k);
  }
 }
 if(queue.length>5000&&keyCount>500)parts.push({id,area:queue.length,keyCount,keyCenter:[keyX/keyCount,keyY/keyCount],box:[x0,y0,x1+1,y1+1]});
}
if(parts.length!==48)throw Error(`Expected 48 authored silhouettes; found ${parts.length}`);
for(const part of parts)part.index=Math.floor(part.keyCenter[1]/(H/6))*8+Math.floor(part.keyCenter[0]/(W/8));
parts.sort((a,b)=>a.index-b.index);
if(parts.some((p,i)=>p.index!==i))throw Error('Source action cells are not unique');

// Existing game's authored grounded/airborne foot heights. Grounded frames use
// the common 230px foot; airborne offsets preserve jump/flight body placement.
const footHeight=Array(48).fill(230);
Object.assign(footHeight,{14:164,15:194,16:196,17:185,18:170,19:163,20:192,21:205,22:187,23:166,44:202,45:185,46:179,47:154});
// Measured glove landmarks in each SOURCE tile, independent of bear anchors.
const hands=[
 [118,133],[111,132],[102,133],[97,132],[97,134],[97,137],[101,128],[96,126],
 [91,132],[94,135],[97,129],[82,140],[87,137],[86,133],[98,113],[96,109],
 [116,99],[116,99],[108,99],[108,100],[116,99],[109,104],[117,103],[117,96],
 [103,148],[109,141],[109,132],[110,123],[126,117],[115,118],[120,111],[125,106],
 [62,117],[106,107],[142,97],[119,119],[100,162],[103,162],[102,161],[116,124],
 [118,118],[124,108],[131,108],[118,124],[109,110],[117,100],[98,102],[101,105],
];
const poseNames=['idle A','idle B','start crouch','start lean','stop lean','stop settle','run contact A','run down A','run passing A','run contact B','run down B','run passing B','run up A','run up B','jump takeoff','jump rise','jump air','jump apex','double jump tuck','double jump tight','double jump extend','double jump recover','fall A','fall B','land crouch','land recover','punch guard','punch windup','punch contact','punch retract','kick windup','kick extend','kick contact','kick retract','hurt recoil','hurt recover','defeat kneel','defeat down','recovery crouch','recovery stand','cast charge','cast prepare','cast release','cast recover','flight launch','flight lean','flight horizontal A','flight horizontal B'];
const frames=[],images=[],report=[];
let flightFaceBottom=null;
for(const part of parts){
 const index=part.index,[bx0,by0,bx1,by1]=part.box;
 const x0=Math.max(0,bx0-2),y0=Math.max(0,by0-2),x1=Math.min(W,bx1+2),y1=Math.min(H,by1+2),cw=x1-x0,ch=y1-y0;
 const raw=Buffer.alloc(cw*ch*4);
 for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
  const gx=x+x0,gy=y+y0,at=gy*W+gx,i=at*4,j=(y*cw+x)*4;
  if(data[i+3]<16)continue;
  let keep=labels[at]===part.id;
  if(!keep&&data[i+3]<32)for(let dy=-1;dy<=1&&!keep;dy++)for(let dx=-1;dx<=1;dx++){
   const xx=gx+dx,yy=gy+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H&&labels[yy*W+xx]===part.id){keep=true;break;}
  }
  if(keep)data.copy(raw,j,i,i+4);
 }
 const rw=Math.round(cw*SCALE),rh=Math.round(ch*SCALE),sx=rw/cw,sy=rh/ch;
 const resized=await sharp(raw,{raw:{width:cw,height:ch,channels:4}}).resize(rw,rh,{fit:'fill',kernel:'lanczos3'}).raw().toBuffer();
 // Strip interpolation's effectively transparent RGB fringe too.
 for(let i=0;i<resized.length;i+=4)if(resized[i+3]<8){resized[i]=resized[i+1]=resized[i+2]=resized[i+3]=0;}
 const ownInk=bounds(resized,rw,rh),ownKey=bounds(resized,rw,rh,isKey);
 if(!ownKey||ownKey.count<1000)throw Error(`Missing face key in ${index}`);
 // Flight's forward hood sits ahead of the torso. Its full tail is registered
 // inside the cell rather than cropped to the old rotated bear's head anchor.
 const targetFaceX=index>=46?164:index===45?150:base.frames[index].face[0]+base.frames[index].face[2]/2;
 const dx=Math.round(targetFaceX-(ownKey.box[0]+ownKey.box[2])/2);
 let dy=footHeight[index]-ownInk.box[3];
 // The old suit's last flight frame changed tilt. These two new horizontal
 // poses share the same torso/hood height, with just 1px breathing motion.
 if(index===46)flightFaceBottom=dy+ownKey.box[3];
 if(index===47){dy=flightFaceBottom+1-ownKey.box[3];footHeight[index]=dy+ownInk.box[3];}
 if(dx<0||dy<0||dx+rw>CELL||dy+rh>CELL)throw Error(`Packed frame crop outside cell ${index}: ${[dx,dy,rw,rh]}`);
 const packed=await sharp({create:{width:CELL,height:CELL,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
  .composite([{input:await sharp(resized,{raw:{width:rw,height:rh,channels:4}}).png().toBuffer(),left:dx,top:dy}]).raw().toBuffer();
 const ink=bounds(packed,CELL,CELL),key=bounds(packed,CELL,CELL,isKey),[fx,fy,fr,fb]=key.box,fw=fr-fx,fh=fb-fy;
 let hand=[round(dx+(hands[index][0]+index%8*(W/8)-x0)*sx),round(dy+(hands[index][1]+Math.floor(index/8)*(H/6)-y0)*sy)];
 // Small anti-alias quantization may put a hand marker just outside the glove.
 // Snap only to neighboring visible suit ink, never to the keyed face opening.
 const valid=(x,y)=>x>=0&&x<CELL&&y>=0&&y<CELL&&packed[(y*CELL+x)*4+3]>64&&!isKey(packed,(y*CELL+x)*4);
 if(!valid(Math.round(hand[0]),Math.round(hand[1]))){
  let best=null;for(let oy=-10;oy<=10;oy++)for(let ox=-10;ox<=10;ox++){
   const x=Math.round(hand[0])+ox,y=Math.round(hand[1])+oy,d=ox*ox+oy*oy;
   if(valid(x,y)&&(!best||d<best.d))best={x,y,d};
  }
  if(!best)throw Error(`Glove landmark misses suit ${index}`);hand=[best.x,best.y];
 }
 const head=[round((fx+fr)/2),fb-1,0],headBox=[fx-8,fy-30,fw+16,fh+30];
 if(headBox[0]<0||headBox[1]<0||headBox[0]+headBox[2]>CELL||headBox[1]+headBox[3]>CELL)throw Error(`Head registration outside frame ${index}`);
 const frame={rect:[index%8*CELL,Math.floor(index/8)*CELL,CELL,CELL],head,face:[fx,fy,fw,fh],headBox,hand};
 frames.push(frame);
 images.push({input:await sharp(packed,{raw:{width:CELL,height:CELL,channels:4}}).png().toBuffer(),left:frame.rect[0],top:frame.rect[1]});
 const clearance=Math.min(...ink.box.slice(0,2),CELL-ink.box[2],CELL-ink.box[3]);
 if(clearance<2)throw Error(`Sprite reaches cell border ${index}`);
 report.push({frame:index,pose:poseNames[index],sourceBounds:part.box,inkBounds:ink.box,face:frame.face,hand,footHeight:footHeight[index],clearance,keyPixels:key.count,opaquePixels:ink.count,hash:createHash('sha256').update(packed).digest('hex')});
}

const animations=JSON.parse(JSON.stringify(base.animations));
// Horizontal forward flight retains its authored perspective and secondary motion.
animations.flightStart={frames:[44,45],duration:.24};
animations.hover={frames:[46,47],duration:.7,loop:true};
animations.fly={frames:[46,47],duration:.6,loop:true};
// Distinct crouch / airborne windup / deep impact / standing recovery phases.
animations.seismicSmash={frames:[24,18,36,25],duration:.6};
const manifest={version:1,id:'golden-puppy-costume',label:'Golden Puppy',rig:'action-chibi-v1',atlas:'body.webp',cell:[CELL,CELL],foot:[128,230],worldScale:.62,strideDistance:164,head:{scale:.62,mode:'face-only'},materialKeys:{face:'#ff00ff',skin:'#00ffff'},directions:{right:{mirror:false},left:{mirror:true}},flightPose:'authored-horizontal',frames,animations};
const atlas=sharp({create:{width:8*CELL,height:6*CELL,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(images);
await atlas.clone().webp({lossless:true,effort:6}).toFile(path.join(outputDir,'body.webp'));
await writeFile(path.join(outputDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');

// Approval thumbnail is an exact crop of the already approved first character.
// The game QA renderer may replace this with its actual composed idle frame.
const approved=await sharp(approvedFile).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const aw=approved.info.width,ah=approved.info.height,tileWidth=Math.floor(aw/3);
const crop=await sharp(approvedFile).extract({left:0,top:0,width:tileWidth,height:ah}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const ib=bounds(crop.data,tileWidth,ah,(d,i)=>d[i+3]>=64),[ax,ay,ar,ab]=ib.box;
const thumbHeight=180,thumbWidth=Math.round((ar-ax)*thumbHeight/(ab-ay));
await sharp({create:{width:CELL,height:CELL,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:await sharp(approvedFile).extract({left:ax,top:ay,width:ar-ax,height:ab-ay}).resize(thumbWidth,thumbHeight).png().toBuffer(),left:Math.round((CELL-thumbWidth)/2),top:230-thumbHeight}]).png().toFile(path.join(outputDir,'preview.png'));

// Audit sheet records exact game-size packed frames, face keys, hand origins and
// common ground reference. It is QA evidence, not another authored game asset.
let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1728">`;
for(let i=0;i<48;i++){
 const x=i%8*256,y=Math.floor(i/8)*288,f=frames[i],q=report[i];
 svg+=`<rect x="${x+1}" y="${y+1}" width="254" height="286" fill="none" stroke="#485466"/>`;
 svg+=`<path d="M${x+4} ${y+230}h248" stroke="#708198" stroke-dasharray="4 4"/>`;
 svg+=`<rect x="${x+f.face[0]}" y="${y+f.face[1]}" width="${f.face[2]}" height="${f.face[3]}" fill="none" stroke="#58ee9c"/>`;
 svg+=`<circle cx="${x+f.hand[0]}" cy="${y+f.hand[1]}" r="3.2" fill="#61ddff" stroke="#113943"/>`;
 svg+=`<text x="${x+10}" y="${y+271}" fill="#edf2f8" font-size="14" font-family="sans-serif">${i}: ${q.pose}</text>`;
}svg+='</svg>';
await sharp({create:{width:2048,height:1728,channels:4,background:'#202b3c'}})
 .composite([...images.map((im,i)=>({...im,top:Math.floor(i/8)*288})),{input:Buffer.from(svg)}]).png().toFile(path.join(sourceDir,'registration-contact-sheet.png'));
const validation={version:1,source:path.relative(root,sourceFile),sourceSha256:createHash('sha256').update(await readFile(sourceFile)).digest('hex'),approvedSourceSha256:createHash('sha256').update(await readFile(approvedFile)).digest('hex'),spriteCount:frames.length,clipCount:Object.keys(animations).length,uniformNominalScale:SCALE,minimumClearance:Math.min(...report.map(r=>r.clearance)),allFramesDistinct:new Set(report.map(r=>r.hash)).size===48,allKeysMeasured:report.every(r=>r.keyPixels>1000),contactFrameIndices:{punch:animations.punch.frames[2],kick:animations.kick.frames[2],fireball:animations.fireball.frames[2]},frames:report};
if(!validation.allFramesDistinct||!validation.allKeysMeasured)throw Error('Frame uniqueness or face-mask registration failed');
await writeFile(path.join(sourceDir,'registration-report.json'),JSON.stringify(validation,null,2)+'\n');
console.log(JSON.stringify({...validation,frames:undefined},null,2));
