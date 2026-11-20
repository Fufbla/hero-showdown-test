// Registration and packing of image_gen-authored sprites only. This script
// never redraws limbs, rigs a pose, synthesizes in-betweens, or substitutes art.
// Usage: node tools/pack-new-costume-sprites.mjs [costume-id|all]
// Optional per-costume source/registration-overrides.json contains measured
// sourceHand/sourceHead coordinates (absolute source pixels), headTarget,
// footHeight, translate, uniformScale, targetBodyHeight, and/or hatFit.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
let sharp;
try{sharp=require('sharp');}catch{sharp=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'','sharp'));}
const CELL=256,COLS=8,FOOT=230;
const outfits=[
 {id:'mailman-costume',label:'Mailman Costume',hat:'cap.png'},
 {id:'firefighter-costume',label:'Firefighter Costume',hat:'helmet.png'},
 {id:'ghost-transformation',label:'Ghost Transformation',fullTransform:true,movement:'float'},
 {id:'wolf-transformation',label:'Wolf Transformation',fullTransform:true,movement:'biped-walk-quadruped-run'}
];
const selected=process.argv[2]||'all';
if(selected!=='all'&&!outfits.some(outfit=>outfit.id===selected))throw Error('Unknown costume ID: '+selected);
const round=n=>Math.round(n*100)/100;
const sha=data=>createHash('sha256').update(data).digest('hex');
const clearAlpha=data=>{for(let i=0;i<data.length;i+=4)if(data[i+3]<8)data.fill(0,i,i+4);return data;};
const key=(d,i)=>d[i+3]>=32&&d[i]>70&&d[i+2]>70&&d[i]>d[i+1]*1.5&&d[i+2]>d[i+1]*1.5;
const keyFringe=(d,i)=>d[i+3]>=8&&d[i]>25&&d[i+2]>25&&d[i]>d[i+1]*1.25&&d[i+2]>d[i+1]*1.25;
const skin=(d,i)=>d[i+3]>=64&&d[i+1]>60&&d[i+2]>60&&d[i]<Math.min(d[i+1],d[i+2])*.68;
const poseNames=['idle A','idle B','start crouch','start lean','stop lean','stop settle','run contact A','run down A','run passing A','run contact B','run down B','run passing B','run up A','run up B','jump takeoff','jump rise','jump air','jump apex','double jump tuck','double jump tight','double jump extend','double jump recover','fall A','fall B','land crouch','land recover','punch guard','punch windup','punch contact','punch retract','kick windup','kick extend','kick contact','kick retract','hurt recoil','hurt recover','defeat kneel','defeat down','recovery crouch','recovery stand','cast charge','cast prepare','cast release','cast recover','flight launch','flight lean','flight horizontal A','flight horizontal B','walk contact A','walk passing A','walk contact B','walk passing B','lower torso','forepaws down','raise chest','rise upright'];
function bounds(data,width,height,predicate=(d,i)=>d[i+3]>=32){
 let x0=width,y0=height,x1=-1,y1=-1,count=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(predicate(data,(y*width+x)*4)){
  x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);count++;
 }
 return count?{box:[x0,y0,x1+1,y1+1],count}:null;
}
async function optionalJSON(file){try{return JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return {};throw error;}}

// Label globally, using the grid only to order complete connected silhouettes.
// A tail or outstretched hand may cross a nominal tile boundary without loss.
function components(data,width,height){
 const labels=new Int32Array(width*height),queue=new Uint32Array(width*height),parts=[];let id=0;
 for(let at=0;at<labels.length;at++){
  if(labels[at]||data[at*4+3]<32)continue;
  const own=++id;let start=0,end=1,x0=width,y0=height,x1=-1,y1=-1,keyCount=0,keyX=0,keyY=0;
  labels[at]=own;queue[0]=at;
  while(start<end){
   const p=queue[start++],x=p%width,y=Math.floor(p/width);
   x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
   if(key(data,p*4)){keyCount++;keyX+=x;keyY+=y;}
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy,k=yy*width+xx;
    if(xx<0||yy<0||xx>=width||yy>=height||labels[k]||data[k*4+3]<32)continue;
    labels[k]=own;queue[end++]=k;
   }
  }
  parts.push({id:own,area:end,box:[x0,y0,x1+1,y1+1],keyCount,keyCenter:keyCount?[keyX/keyCount,keyY/keyCount]:null});
 }
 return {labels,parts};
}
function nearestPixel(data,w,h,point,predicate,maxDistance=Infinity){
 let nearest=null;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(predicate(data,(y*w+x)*4)){
  const distance=Math.hypot(x-point[0],y-point[1]);
  if(distance<=maxDistance&&(!nearest||distance<nearest.distance))nearest={point:[x,y],distance};
 }
 return nearest;
}
function sourceHand(part,fullTransform){
 const {raw,w,h,neck}=part;
 if(!fullTransform){
  // Neck, hands, and legs are separate cyan material regions. Prefer the
  // rightmost region above the knees; this follows the release/impact hand.
  const visited=new Uint8Array(w*h),regions=[];
  for(let n=0;n<visited.length;n++){
   if(visited[n]||!skin(raw,n*4))continue;
   const queue=[n];visited[n]=1;let x0=w,y0=h,x1=-1,y1=-1,nearNeck=false;
   for(let q=0;q<queue.length;q++){
    const p=queue[q],x=p%w,y=Math.floor(p/w);
    x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
    if(Math.hypot(x-neck[0],y-neck[1])<9)nearNeck=true;
    for(const k of[x?p-1:-1,x<w-1?p+1:-1,y?p-w:-1,y<h-1?p+w:-1])if(k>=0&&!visited[k]&&skin(raw,k*4)){visited[k]=1;queue.push(k);}
   }
   if(queue.length>=2&&!nearNeck&&(y0+y1)/2<neck[1]+(part.ink.box[3]-neck[1])*.72)regions.push({pixels:queue,box:[x0,y0,x1+1,y1+1]});
  }
  regions.sort((a,b)=>b.box[2]-a.box[2]);
  if(regions.length){
   const r=regions[0],right=r.pixels.filter(p=>p%w>=r.box[2]-Math.max(3,(r.box[2]-r.box[0])*.25));
   const center=[right.reduce((v,p)=>v+p%w,0)/right.length,right.reduce((v,p)=>v+Math.floor(p/w),0)/right.length];
   return {point:nearestPixel(raw,w,h,center,skin).point,method:'rightmost non-neck upper cyan region'};
  }
 }
 const [x0,y0,x1,y1]=part.ink.box,low=part.index>=6&&part.index<=13||part.index>=44&&part.index<=47;
 const target=[x0+(x1-x0)*.83,y0+(y1-y0)*(low?.73:.60)];
 const nearest=nearestPixel(raw,w,h,target,(d,i)=>d[i+3]>=96);
 if(!nearest)throw Error('Cannot locate an authored effect attachment: '+part.index);
 return {point:nearest.point,method:'nearest authored paw/hand region (review required)'};
}

async function packHat(sourceDir,outDir,outfit,overrides){
 const file=path.join(sourceDir,'headgear-source.png'),source=await readFile(file);
 const decoded=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 clearAlpha(decoded.data);
 const box=bounds(decoded.data,decoded.info.width,decoded.info.height,(d,i)=>d[i+3]>=8)?.box;
 if(!box)throw Error('Headgear image is empty: '+outfit.id);
 const [x0,y0,x1,y1]=box,w=x1-x0,h=y1-y0,scale=Math.min(1,768/w);
 const png=await sharp(decoded.data,{raw:{width:decoded.info.width,height:decoded.info.height,channels:4}})
  .extract({left:x0,top:y0,width:w,height:h}).resize(Math.round(w*scale),Math.round(h*scale)).png().toBuffer();
 await writeFile(path.join(outDir,outfit.hat),png);
 return {headgear:{hat:outfit.hat,...(overrides.hatFit?{hatFit:overrides.hatFit}:{})},report:{source:path.relative(root,file),sourceSha256:sha(source),sourceBounds:box,outputSize:[Math.round(w*scale),Math.round(h*scale)],scale,outputSha256:sha(png)}};
}

async function pack(outfit){
 const sourceDir=path.join(root,'test-only/four-powers/new-costumes-source',outfit.id),outDir=path.join(root,'test-only/four-powers/new-costumes/assets',outfit.id);
 const sourceFile=path.join(sourceDir,'action-source.png'),source=await readFile(sourceFile),overrides=await optionalJSON(path.join(sourceDir,'registration-overrides.json'));
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});clearAlpha(data);
 const W=info.width,H=info.height,ROWS=outfit.id==='wolf-transformation'?7:6,N=COLS*ROWS,TW=W/COLS,TH=H/ROWS;
 const {labels,parts:allParts}=components(data,W,H),parts=allParts.filter(p=>p.area>500);
 if(parts.length!==N)throw Error(`${outfit.id}: expected ${N} complete authored silhouettes, found ${parts.length}; component areas: ${parts.map(p=>p.area).join(',')}`);
 for(const p of parts){
  const center=!outfit.fullTransform&&p.keyCenter?p.keyCenter:[(p.box[0]+p.box[2])/2,(p.box[1]+p.box[3])/2];
  p.index=Math.floor(center[1]/TH)*COLS+Math.floor(center[0]/TW);
 }
 parts.sort((a,b)=>a.index-b.index);
 if(parts.some((p,i)=>p.index!==i))throw Error(`${outfit.id}: source cells must be unique 0–${N-1}; got ${parts.map(p=>p.index).join(',')}`);
 const prepared=[];
 for(const p of parts){
  const o=overrides.frames?.[p.index]||{},[bx0,by0,bx1,by1]=p.box,x0=Math.max(0,bx0-2),y0=Math.max(0,by0-2),x1=Math.min(W,bx1+2),y1=Math.min(H,by1+2),w=x1-x0,h=y1-y0;
  const raw=Buffer.alloc(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const gx=x+x0,gy=y+y0,at=gy*W+gx,i=at*4,j=(y*w+x)*4;if(data[i+3]<8)continue;
   let keep=labels[at]===p.id;
   if(!keep&&data[i+3]<32)for(let dy=-1;dy<=1&&!keep;dy++)for(let dx=-1;dx<=1;dx++){
    const xx=gx+dx,yy=gy+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H&&labels[yy*W+xx]===p.id){keep=true;break;}
   }
   if(keep)data.copy(raw,j,i,i+4);
  }
  let removedMarkerPixels=0,neck=null,marker=p.keyCenter?[p.keyCenter[0]-x0,p.keyCenter[1]-y0]:null;
  if(!outfit.fullTransform){
   if(!marker&&!o.sourceHead)throw Error(`${outfit.id}: missing neck registration marker in pose ${p.index}`);
   if(marker){
    let radius=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(key(raw,(y*w+x)*4))radius=Math.max(radius,Math.hypot(x-marker[0],y-marker[1]));
    const remove=new Uint8Array(w*h);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(Math.hypot(x-marker[0],y-marker[1])<=radius+4&&keyFringe(raw,(y*w+x)*4)){
     // One authored source pixel of antialias fringe is included around the
     // registration disk; no missing neck or fabric is painted beneath it.
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<w&&yy<h)remove[yy*w+xx]=1;
     }
    }
    for(let n=0;n<remove.length;n++)if(remove[n]){if(raw[n*4+3])removedMarkerPixels++;raw.fill(0,n*4,n*4+4);}
    const found=nearestPixel(raw,w,h,marker,skin,Math.max(24,TH*.2));
    if(found)neck=found.point;
   }
   if(o.sourceHead)neck=[o.sourceHead[0]-x0,o.sourceHead[1]-y0];
   if(!neck)throw Error(`${outfit.id}: marker has no intact cyan neck in pose ${p.index}`);
  }
  const ink=bounds(raw,w,h);if(!ink)throw Error('Empty source pose: '+p.index);
  if(!neck){
   const [ix,iy,ir,ib]=ink.box;
   neck=o.sourceHead?[o.sourceHead[0]-x0,o.sourceHead[1]-y0]:[ix+(ir-ix)*.64,iy+(ib-iy)*.30];
  }
  const preparedPart={...p,x0,y0,w,h,raw,neck,marker,ink,removedMarkerPixels,o};
  preparedPart.hand=o.sourceHand?{point:[o.sourceHand[0]-x0,o.sourceHand[1]-y0],method:'measured source override'}:sourceHand(preparedPart,outfit.fullTransform);
  prepared.push(preparedPart);
 }
 const standing=prepared[0],nominal=outfit.fullTransform?(overrides.targetBodyHeight||178)/(standing.ink.box[3]-standing.ink.box[1]):118/(standing.ink.box[3]-standing.neck[1]);
 const SCALE=overrides.uniformScale??nominal;
 if(!(SCALE>0)||!Number.isFinite(SCALE))throw Error('Invalid uniform costume scale');
 const frames=[],images=[],reports=[];
 for(const p of prepared){
  const i=p.index,o=p.o,rw=Math.round(p.w*SCALE),rh=Math.round(p.h*SCALE),sx=rw/p.w,sy=rh/p.h;
  const resized=clearAlpha(await sharp(p.raw,{raw:{width:p.w,height:p.h,channels:4}}).resize(rw,rh,{fit:'fill',kernel:'lanczos3'}).raw().toBuffer());
  const ink=bounds(resized,rw,rh),flight=i>=46&&i<=47;
  let dx,dy;
  if(outfit.fullTransform){
   dx=Math.round(128-(ink.box[0]+ink.box[2])/2);
   dy=flight?Math.round(150-(ink.box[1]+ink.box[3])/2):(o.footHeight??FOOT)-ink.box[3];
  }else{
   const target=o.headTarget||[flight?176:i===45?150:133,flight?150:null,0];
   dx=Math.round(target[0]-p.neck[0]*sx);
   dy=target[1]!==null&&target[1]!==undefined?Math.round(target[1]-p.neck[1]*sy):(o.footHeight??FOOT)-ink.box[3];
  }
  if(o.translate){dx+=o.translate[0];dy+=o.translate[1];}
  if(dx<0||dy<0||dx+rw>CELL||dy+rh>CELL)throw Error(`${outfit.id}: pose ${i} exceeds 256px cell (${[dx,dy,rw,rh]}); supply measured registration override or adjust uniformScale`);
  const png=await sharp(resized,{raw:{width:rw,height:rh,channels:4}}).png().toBuffer();
  const packed=await sharp({create:{width:CELL,height:CELL,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:png,left:dx,top:dy}]).raw().toBuffer();
  clearAlpha(packed);
  const point=([x,y])=>[round(dx+x*sx),round(dy+y*sy)],head=[...point(p.neck),o.headTarget?.[2]||0],hand=point(p.hand.point);
  if([...head.slice(0,2),...hand].some(n=>n<0||n>CELL))throw Error(`${outfit.id}: attachment outside pose ${i}`);
  // Lanczos can amplify a subpixel registration fringe. Remove only keyed
  // residue near the former disk, leaving every unkeyed authored pixel alone.
  if(!outfit.fullTransform&&p.marker){
   const marker=point(p.marker);
   for(let y=0;y<CELL;y++)for(let x=0;x<CELL;x++)if(Math.hypot(x-marker[0],y-marker[1])<24&&key(packed,(y*CELL+x)*4))packed.fill(0,(y*CELL+x)*4,(y*CELL+x)*4+4);
  }
  const remainingKey=!outfit.fullTransform?bounds(packed,CELL,CELL,key):null;
  if(remainingKey)throw Error(`${outfit.id}: magenta marker remains in pose ${i}: ${JSON.stringify(remainingKey)}`);
  const outputInk=bounds(packed,CELL,CELL),clearance=Math.min(...outputInk.box.slice(0,2),CELL-outputInk.box[2],CELL-outputInk.box[3]);
  if(clearance<2)throw Error(`${outfit.id}: pose ${i} touches a destination cell boundary`);
  const rect=[i%COLS*CELL,Math.floor(i/COLS)*CELL,CELL,CELL],frame={rect,head,hand};frames.push(frame);
  const image=await sharp(packed,{raw:{width:CELL,height:CELL,channels:4}}).png().toBuffer();images.push({input:image,left:rect[0],top:rect[1]});
  reports.push({frame:i,pose:poseNames[i],sourceBounds:p.box,sourceMarker:p.keyCenter?.map(round)||null,sourceHead:[round(p.neck[0]+p.x0),round(p.neck[1]+p.y0)],sourceHand:[round(p.hand.point[0]+p.x0),round(p.hand.point[1]+p.y0)],handMethod:p.hand.method,head,hand,inkBounds:outputInk.box,footHeight:outputInk.box[3],clearance,removedMarkerPixels:p.removedMarkerPixels,magentaPixels:0,opaquePixels:outputInk.count,hash:sha(packed)});
 }
 const puppy=JSON.parse(await readFile(path.join(root,'royale-v3-staging/kingjames/puppy/assets/manifest.json'),'utf8')),animations=structuredClone(puppy.animations);
 if(outfit.id==='wolf-transformation')Object.assign(animations,{
  walk:{frames:[48,49,50,51],duration:.8,loop:true},walkStart:{frames:[48,49],duration:.12},walkStop:{frames:[50,51],duration:.16},
  runStart:{frames:[52,53],duration:.16},rise:{frames:[54,55],duration:.16},stop:{frames:[54,55],duration:.16}
 });
 await mkdir(outDir,{recursive:true});
 const hat=outfit.hat?await packHat(sourceDir,outDir,outfit,overrides):null;
 const manifest={version:1,id:outfit.id,label:outfit.label,rig:'action-chibi-v1',atlas:'body.webp',cell:[CELL,CELL],foot:[128,FOOT],worldScale:.62,strideDistance:164,
  head:outfit.fullTransform?{scale:0,mode:'full-transform'}:{scale:.62,mode:'costume-hat'},
  ...(outfit.fullTransform?{fullTransform:true,movement:outfit.movement}:{materialKeys:{skin:'#00ffff'},headgear:hat.headgear}),
  ...(outfit.id==='ghost-transformation'?{floatAmplitude:4,floatPeriod:1.8,floatHeight:16}:{}),
  ...(outfit.id==='wolf-transformation'?{walkStrideDistance:118}:{}),
  directions:{right:{mirror:false},left:{mirror:true}},flightPose:'authored-horizontal',frames,animations};
 await sharp({create:{width:COLS*CELL,height:ROWS*CELL,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(images).webp({lossless:true,effort:6}).toFile(path.join(outDir,'body.webp'));
 await writeFile(path.join(outDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 // Temporary thumbnail is exact frame zero. The review renderer can replace
 // this with the actual game composition, including customized head and hat.
 await writeFile(path.join(outDir,'preview.png'),images[0].input);
 const sheetHeight=ROWS*288;let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="${sheetHeight}">`;
 for(const [i,frame]of frames.entries()){
  const x=i%COLS*CELL,y=Math.floor(i/COLS)*288;
  svg+=`<rect x="${x+1}" y="${y+1}" width="254" height="286" fill="none" stroke="#526177"/><path d="M${x+4} ${y+FOOT}h248" stroke="#96a8bc" stroke-dasharray="4 4"/>`;
  svg+=`<circle cx="${x+frame.head[0]}" cy="${y+frame.head[1]}" r="3" fill="#ffb74d"/><circle cx="${x+frame.hand[0]}" cy="${y+frame.hand[1]}" r="3" fill="#63ffac"/>`;
  svg+=`<text x="${x+9}" y="${y+271}" fill="#edf2f8" font-size="14" font-family="sans-serif">${i}: ${poseNames[i]}</text>`;
 }
 svg+='</svg>';
 await sharp({create:{width:COLS*CELL,height:sheetHeight,channels:4,background:'#253245'}}).composite([...images.map((im,i)=>({...im,top:Math.floor(i/COLS)*288})),{input:Buffer.from(svg)}]).png().toFile(path.join(sourceDir,'registration-contact-sheet.png'));
 const validation={version:1,id:outfit.id,source:path.relative(root,sourceFile),sourceSha256:sha(source),sourceSize:[W,H],spriteCount:N,clipCount:Object.keys(animations).length,uniformNominalScale:SCALE,
  minimumClearance:Math.min(...reports.map(r=>r.clearance)),allFramesDistinct:new Set(reports.map(r=>r.hash)).size===N,magentaPixels:0,
  inferredHandFrames:reports.filter(r=>r.handMethod!=='measured source override').map(r=>r.frame),headgear:hat?.report||null,
  contactFrameIndices:{punch:animations.punch.frames[2],kick:animations.kick.frames[2],fireball:animations.fireball.frames[2]},frames:reports};
 if(!validation.allFramesDistinct)throw Error(`${outfit.id}: source contains duplicate packed poses`);
 await writeFile(path.join(sourceDir,'registration-report.json'),JSON.stringify(validation,null,2)+'\n');
 console.log(JSON.stringify({...validation,frames:undefined},null,2));
}

for(const outfit of outfits.filter(outfit=>selected==='all'||outfit.id===selected))await pack(outfit);
