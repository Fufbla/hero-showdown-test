// Deterministic registration/packing of 48 image_gen-authored Vice poses.
// This does not draw, rig, synthesize or replace any costume anatomy/artwork.
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
let sharp;
try{sharp=require('sharp');}catch{sharp=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'','sharp'));}
const sourceDir=path.join(root,'test-only/four-powers/vice-source');
const outputDir=path.join(root,'test-only/four-powers/vice/assets');
const sourceFile=path.join(sourceDir,'action-source.png');
await mkdir(sourceDir,{recursive:true});await mkdir(outputDir,{recursive:true});
if(process.argv[2]&&path.resolve(process.argv[2])!==sourceFile)await copyFile(process.argv[2],sourceFile);
const source=await readFile(sourceFile);
const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const W=info.width,H=info.height,CELL=256,TW=W/8,TH=H/6;
if(W!==1448||H!==1086)throw Error(`Unexpected source dimensions ${W}x${H}`);
const round=n=>Math.round(n*100)/100;
const sha=b=>createHash('sha256').update(b).digest('hex');
const isKey=(d,i)=>d[i+3]>=32&&d[i]>100&&d[i+2]>100&&d[i]>d[i+1]*1.7&&d[i+2]>d[i+1]*1.5;
const isKeyFringe=(d,i)=>d[i+3]>=16&&d[i]>30&&d[i+2]>30&&d[i]>d[i+1]*1.35&&d[i+2]>d[i+1]*1.35;
const isSkin=(d,i)=>d[i+3]>=128&&d[i+1]>60&&d[i+2]>60&&d[i]<d[i+1]*.65&&d[i]<d[i+2]*.65;
const isTank=(d,i)=>d[i+3]>=128&&Math.min(d[i],d[i+1],d[i+2])>128&&Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])<36;
function bounds(d,w,h,test=(d,i)=>d[i+3]>=32){
 let x0=w,y0=h,x1=-1,y1=-1,count=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(test(d,(y*w+x)*4)){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);count++;}
 return count?{box:[x0,y0,x1+1,y1+1],count}:null;
}

// Nominal source cells are layout guides. Whole connected silhouettes preserve
// hands/shoes that approach or cross a guide and reject detached export specks.
const labels=new Int32Array(W*H),parts=[];let nextId=0;
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
 if(queue.length>2000&&keyCount>20)parts.push({id,area:queue.length,keyCount,keyCenter:[keyX/keyCount,keyY/keyCount],box:[x0,y0,x1+1,y1+1]});
}
if(parts.length!==48)throw Error(`Expected 48 complete authored silhouettes, found ${parts.length}`);
for(const p of parts)p.index=Math.floor(p.keyCenter[1]/TH)*8+Math.floor(p.keyCenter[0]/TW);
parts.sort((a,b)=>a.index-b.index);
if(parts.some((p,i)=>p.index!==i))throw Error('Source pose indices are not unique');

// Source-local hand/palm landmarks, inspected against each authored action.
// The impact/release hand is selected, including the stretched punch/cast hand.
const hands=[
 [145,96],[141,96],[142,100],[137,102],[129,89],[139,97],[142,78],[142,91],
 [148,78],[144,72],[148,81],[144,78],[149,66],[146,53],[138,102],[139,73],
 [145,70],[144,77],[139,74],[142,54],[145,58],[139,83],[143,69],[146,81],
 [151,122],[143,105],[121,57],[135,100],[152,55],[130,71],[132,62],[44,73],
 [50,75],[125,59],[140,73],[141,82],[62,137],[133,136],[60,147],[139,98],
 [122,69],[146,55],[148,51],[140,87],[142,56],[134,80],[159,87],[160,86],
];
// Measured chest decal planes on the white tank: cx,cy,width,height,angle(rad).
// Arm-over-chest poses retain anatomical placement; the runtime's white-fabric
// mask correctly occludes the decal behind the cyan arm instead of moving it.
const chestLandmarks=[
 [108,57,31,15,-.03],[107,56,31,15,-.02],[104,65,31,15,.04],[112,67,27,14,.24],
 [87,53,34,15,-.28],[101,57,31,15,-.08],[101,61,29,15,.10],[109,69,28,14,.19],
 [111,65,28,14,.22],[113,61,28,14,.08],[118,67,27,14,.17],[117,62,26,14,.06],
 [102,55,28,14,.13],[105,51,28,14,.18],[101,83,29,14,.24],[104,44,29,15,.08],
 [107,50,29,15,.06],[107,46,29,15,.02],[105,56,27,14,.04],[99,57,28,13,.18],
 [96,52,29,14,.12],[99,47,29,14,-.08],[95,71,29,14,.14],[96,72,29,14,0],
 [106,87,29,14,.22],[104,69,29,14,.12],[87,59,29,15,-.10],[91,63,31,15,.11],
 [87,62,31,15,0],[98,58,28,14,-.07],[95,45,29,14,-.08],[76,57,29,15,-.12],
 [85,55,29,15,-.11],[101,44,29,14,-.06],[73,55,35,15,-.28],[96,60,29,15,0],
 [100,84,28,14,.20],[99,89,29,15,-.06],[101,87,28,14,.20],[98,60,32,15,.10],
 [102,57,31,15,0],[88,59,29,15,-.08],[81,58,31,15,-.08],[94,58,31,15,-.11],
 [107,46,29,15,.22],[107,66,28,14,.30],[74,94,22,10,.93],[76,94.5,22,10,.93],
];
// The approved lettering artwork has a tall1.29:1 aspect. Enlarge its measured
// fabric plane and move3.5 source pixels down the torso so aspect-fit produces
// a legible ~29px-wide idle word. The exact tank mask retains folds/occlusion.
const chests=chestLandmarks.map(([x,y,w,h,a])=>[round(x-Math.sin(a)*3.5),round(y+Math.cos(a)*3.5),round(w*1.16),round(h*1.73),a]);
const poseNames=['idle A','idle B','start crouch','start lean','stop lean','stop settle','run contact A','run down A','run passing A','run contact B','run down B','run passing B','run up A','run up B','jump takeoff','jump rise','jump air','jump apex','double jump tuck','double jump tight','double jump extend','double jump recover','fall A','fall B','land crouch','land recover','punch guard','punch windup','punch contact','punch retract','kick windup','kick extend','kick contact','kick retract','hurt recoil','hurt recover','defeat kneel','defeat down','recovery crouch','recovery stand','cast charge','cast prepare','cast release','cast recover','flight launch','flight lean','flight horizontal A','flight horizontal B'];
const prepared=[];
for(const part of parts){
 const [bx0,by0,bx1,by1]=part.box,x0=Math.max(0,bx0-2),y0=Math.max(0,by0-2),x1=Math.min(W,bx1+2),y1=Math.min(H,by1+2),w=x1-x0,h=y1-y0;
 const raw=Buffer.alloc(w*h*4),marker=[part.keyCenter[0]-x0,part.keyCenter[1]-y0];
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const gx=x+x0,gy=y+y0,at=gy*W+gx,i=at*4,j=(y*w+x)*4;
  if(data[i+3]<16)continue;
  let keep=labels[at]===part.id;
  if(!keep&&data[i+3]<32)for(let dy=-1;dy<=1&&!keep;dy++)for(let dx=-1;dx<=1;dx++){
   const xx=gx+dx,yy=gy+dy;if(xx>=0&&yy>=0&&xx<W&&yy<H&&labels[yy*W+xx]===part.id){keep=true;break;}
  }
  if(keep)data.copy(raw,j,i,i+4);
 }
 // Remove only the source's registration disk plus one pixel of its purple
 // antialias fringe. No skin is painted or reconstructed beneath the marker.
 const remove=new Uint8Array(w*h);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(Math.hypot(x-marker[0],y-marker[1])<12&&isKeyFringe(raw,(y*w+x)*4)){
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h)remove[yy*w+xx]=1;
  }
 }
 let removedMarkerPixels=0;
 for(let n=0;n<remove.length;n++)if(remove[n]){if(raw[n*4+3])removedMarkerPixels++;raw.fill(0,n*4,n*4+4);}
 // The disk center is above the actual neck. Locate surviving central cyan
 // neck pixels so the game head's opaque chin overlaps authored skin cleanly.
 const neckX=Math.round(marker[0]);let neckY=null;
 for(let y=Math.ceil(marker[1]);y<Math.min(h,Math.ceil(marker[1])+19);y++){
  let count=0;for(let x=neckX-1;x<=neckX+1;x++)if(x>=0&&x<w&&isSkin(raw,(y*w+x)*4))count++;
  if(count>=2){neckY=y;break;}
 }
 if(neckY===null)throw Error(`No intact neck attachment found for pose ${part.index}`);
 const ink=bounds(raw,w,h);
 if(bounds(raw,w,h,isKey))throw Error(`Registration marker remains in source pose ${part.index}`);
 prepared.push({...part,x0,y0,w,h,raw,marker,neck:[marker[0],neckY],ink,removedMarkerPixels});
}
// One scale for all 48 poses, derived from the actual standing neck and sole.
const SCALE=118/(prepared[0].ink.box[3]-prepared[0].neck[1]);
// Passing/air poses retain bent-leg lift. Grounded contact/support frames share
// y230; horizontal flight shares a neck height with only1px authored loop bob.
const airborneHeadY={8:121,11:121,13:117,15:112,16:112,17:113,18:114,19:113,20:112,21:113,22:116,23:117,44:114,45:124,46:139,47:140};
const frames=[],images=[],reports=[];
for(const p of prepared){
 const i=p.index,rw=Math.round(p.w*SCALE),rh=Math.round(p.h*SCALE),sx=rw/p.w,sy=rh/p.h;
 const resized=await sharp(p.raw,{raw:{width:p.w,height:p.h,channels:4}}).resize(rw,rh,{fit:'fill',kernel:'lanczos3'}).raw().toBuffer();
 for(let n=0;n<resized.length;n+=4)if(resized[n+3]<8)resized.fill(0,n,n+4);
 const ink=bounds(resized,rw,rh),headTargetX=i>=46?164:i===45?150:133;
 const dx=Math.round(headTargetX-p.neck[0]*sx),dy=airborneHeadY[i]===undefined?230-ink.box[3]:Math.round(airborneHeadY[i]-p.neck[1]*sy);
 if(dx<0||dy<0||dx+rw>CELL||dy+rh>CELL)throw Error(`Pose ${i} crop is outside destination cell: ${[dx,dy,rw,rh]}`);
 const packed=await sharp({create:{width:CELL,height:CELL,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:await sharp(resized,{raw:{width:rw,height:rh,channels:4}}).png().toBuffer(),left:dx,top:dy}]).raw().toBuffer();
 const xy=([x,y])=>[round(dx+(x+i%8*TW-p.x0)*sx),round(dy+(y+Math.floor(i/8)*TH-p.y0)*sy)];
 const head=[round(dx+p.neck[0]*sx),round(dy+p.neck[1]*sy),0];
 let hand=xy(hands[i]),handSnapDistance=0;
 const validHand=(x,y)=>x>=0&&x<CELL&&y>=0&&y<CELL&&isSkin(packed,(y*CELL+x)*4);
 if(!validHand(Math.round(hand[0]),Math.round(hand[1]))){
  let best=null;for(let oy=-6;oy<=6;oy++)for(let ox=-6;ox<=6;ox++){
   const x=Math.round(hand[0])+ox,y=Math.round(hand[1])+oy,d=ox*ox+oy*oy;
   if(validHand(x,y)&&(!best||d<best.d))best={x,y,d};
  }
  if(!best)throw Error(`Measured fist/palm ${i} does not intersect neighboring cyan skin`);
  hand=[best.x,best.y];handSnapDistance=round(Math.sqrt(best.d));
 }
 const chest=[...xy(chests[i]),round(chests[i][2]*sx),round(chests[i][3]*sy),chests[i][4]];
 let fabricSamples=0,samples=0;
 for(let y=-chest[3]/2;y<chest[3]/2;y++)for(let x=-chest[2]/2;x<chest[2]/2;x++){
  const px=Math.round(chest[0]+Math.cos(chest[4])*x-Math.sin(chest[4])*y),py=Math.round(chest[1]+Math.sin(chest[4])*x+Math.cos(chest[4])*y);
  samples++;if(px>=0&&py>=0&&px<CELL&&py<CELL&&isTank(packed,(py*CELL+px)*4))fabricSamples++;
 }
 const frame={rect:[i%8*CELL,Math.floor(i/8)*CELL,CELL,CELL],head,hand,chest};frames.push(frame);
 const outputInk=bounds(packed,CELL,CELL),clearance=Math.min(...outputInk.box.slice(0,2),CELL-outputInk.box[2],CELL-outputInk.box[3]);
 if(clearance<2)throw Error(`Pose ${i} reaches a cell boundary`);
 const remainingKey=bounds(packed,CELL,CELL,isKey);
 if(remainingKey)throw Error(`Magenta registration pixels remain in pose ${i}`);
 const png=await sharp(packed,{raw:{width:CELL,height:CELL,channels:4}}).png().toBuffer();
 images.push({input:png,left:frame.rect[0],top:frame.rect[1]});
 reports.push({frame:i,pose:poseNames[i],sourceBounds:p.box,sourceMarker:p.keyCenter.map(round),sourceNeck:[round(p.neck[0]+p.x0),p.neck[1]+p.y0],sourceHand:hands[i],sourceChest:chests[i],head,hand,chest,handSnapDistance,tankCoverage:round(fabricSamples/samples),inkBounds:outputInk.box,footHeight:outputInk.box[3],registration:airborneHeadY[i]===undefined?'ground support at230':'airborne neck registration',clearance,removedMarkerPixels:p.removedMarkerPixels,magentaPixels:0,opaquePixels:outputInk.count,hash:sha(packed)});
}
const puppy=JSON.parse(await readFile(path.join(root,'royale-v3-staging/kingjames/puppy/assets/manifest.json'),'utf8'));
const animations=structuredClone(puppy.animations);
const manifest={version:1,id:'vice-costume',label:'Vice Costume',rig:'action-chibi-v1',atlas:'body.webp',cell:[CELL,CELL],foot:[128,230],worldScale:.62,strideDistance:164,head:{scale:.62,mode:'vice-cap'},headgear:{cap:'cap.png',glasses:'glasses.png',capFit:{crown:[66.89,2,656.11,336.6],width:1.14,seatAboveEyes:.22},glassesFit:{eyes:[[274.853,104.2],[525.98,93.16]],width:1.06}},lettering:{atlas:'lettering.png',text:'Vice',color:'#ff2f9a'},materialKeys:{skin:'#00ffff'},directions:{right:{mirror:false},left:{mirror:true}},flightPose:'authored-horizontal',frames,animations};
await sharp({create:{width:8*CELL,height:6*CELL,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(images).webp({lossless:true,effort:6}).toFile(path.join(outputDir,'body.webp'));
await writeFile(path.join(outputDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');

// Annotated diagnostic evidence only. The parent renderer composes the actual
// customized heads, accessories and lettering into a separate review image.
let svg='<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1728">';
for(let i=0;i<48;i++){
 const x=i%8*256,y=Math.floor(i/8)*288,f=frames[i];
 svg+=`<rect x="${x+1}" y="${y+1}" width="254" height="286" fill="none" stroke="#526177"/>`;
 svg+=`<path d="M${x+4} ${y+230}h248" stroke="#96a8bc" stroke-dasharray="4 4"/>`;
 svg+=`<circle cx="${x+f.head[0]}" cy="${y+f.head[1]}" r="3" fill="#ffb74d"/><circle cx="${x+f.hand[0]}" cy="${y+f.hand[1]}" r="3" fill="#63ffac"/>`;
 svg+=`<g transform="translate(${x+f.chest[0]} ${y+f.chest[1]}) rotate(${f.chest[4]*180/Math.PI})"><rect x="${-f.chest[2]/2}" y="${-f.chest[3]/2}" width="${f.chest[2]}" height="${f.chest[3]}" fill="none" stroke="#ff63b8"/></g>`;
 svg+=`<text x="${x+9}" y="${y+271}" fill="#edf2f8" font-size="14" font-family="sans-serif">${i}: ${poseNames[i]}</text>`;
}
svg+='</svg>';
await sharp({create:{width:2048,height:1728,channels:4,background:'#253245'}}).composite([...images.map((im,i)=>({...im,top:Math.floor(i/8)*288})),{input:Buffer.from(svg)}]).png().toFile(path.join(sourceDir,'registration-contact-sheet.png'));
const validation={version:1,source:path.relative(root,sourceFile),sourceSha256:sha(source),spriteCount:frames.length,clipCount:Object.keys(animations).length,uniformNominalScale:SCALE,idleNeckToFoot:round(reports[0].footHeight-frames[0].head[1]),minimumClearance:Math.min(...reports.map(r=>r.clearance)),allFramesDistinct:new Set(reports.map(r=>r.hash)).size===48,magentaPixels:0,allHandAnchorsOnSkin:true,flightHeadBob:round(frames[47].head[1]-frames[46].head[1]),contactFrameIndices:{punch:animations.punch.frames[2],kick:animations.kick.frames[2],fireball:animations.fireball.frames[2]},frames:reports};
if(!validation.allFramesDistinct||Object.keys(animations).length!==21)throw Error('Unique pose count or21-state animation coverage failed');
await writeFile(path.join(sourceDir,'registration-report.json'),JSON.stringify(validation,null,2)+'\n');
console.log(JSON.stringify({...validation,frames:undefined},null,2));
