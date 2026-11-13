// Repack only missing costume files from the unchanged approved 48-pose sheets.
// Existing recovered atlases and metadata are never overwritten.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const sharp=require('sharp');
const root=path.resolve(__dirname,'..'),assetRoot=path.join(root,'royale-v3-staging/costumes/assets');
const checksum=b=>crypto.createHash('sha256').update(b).digest('hex');
const rows=[
 ['dolphin-costume','Dolphin Costume',true],['pink-shark-costume','Pink Shark Costume',true],
 ['hamburger-costume','Hamburger Costume',true],['stuffed-animal-costume','Stuffed Animal Costume',true],
 ['zombie-costume','Zombie Costume',false],['reaper-costume','Reaper Costume',true],
 ['fishsticks-costume','I Love Fishsticks Costume',true],['pizza-slice-costume','Pizza Slice Costume',true],
 ['black-business-suit','Black Business Suit',false],['white-business-suit','White Business Suit',false],
];
const CELL=256,COLS=8,COUNT=48,SOURCE_CELL=181,SCALE=252/229;
const template=JSON.parse(fs.readFileSync(path.join(assetRoot,'dolphin-costume/manifest.json')));
const fullHead=JSON.parse(fs.readFileSync(path.join(assetRoot,'black-business-suit/manifest.json'))).head;
function components(pixels,w,h,predicate){
 const labels=new Int32Array(w*h),items=[];let number=0;const queue=new Int32Array(w*h);
 for(let at=0;at<w*h;at++){
  if(labels[at]||!predicate(pixels,at*4))continue;
  const id=++number;let read=0,write=1;queue[0]=at;labels[at]=id;
  const item={id,area:0,minX:w,minY:h,maxX:0,maxY:0,sumX:0,sumY:0};
  while(read<write){const pos=queue[read++],x=pos%w,y=Math.floor(pos/w);item.area++;item.sumX+=x;item.sumY+=y;
   item.minX=Math.min(item.minX,x);item.minY=Math.min(item.minY,y);item.maxX=Math.max(item.maxX,x);item.maxY=Math.max(item.maxY,y);
   for(const next of [x>0?pos-1:-1,x<w-1?pos+1:-1,y>0?pos-w:-1,y<h-1?pos+w:-1]){
    if(next>=0&&!labels[next]&&predicate(pixels,next*4)){labels[next]=id;queue[write++]=next;}
   }
  }
  items.push(item);
 }
 return {labels,items};
}
const isFace=(p,i)=>p[i+3]>96&&p[i]>170&&p[i+2]>130&&p[i+1]<105&&p[i]>p[i+1]*1.4&&p[i+2]>p[i+1]*1.4;
function readPixels(image){const c=createCanvas(image.width,image.height),ctx=c.getContext('2d');ctx.drawImage(image,0,0);return {canvas:c,pixels:ctx.getImageData(0,0,c.width,c.height).data};}
function faceIn(pixels,w,h){
 const part=components(pixels,w,h,isFace).items.sort((a,b)=>b.area-a.area)[0];
 if(!part||part.area<350)throw Error('Missing substantial connected face marker');
 return part;
}
function metadataForAtlas(id,name,hideHair,atlas){
 const manifest={...structuredClone(template),id,label:name,head:hideHair?{scale:.62,mode:'face-only'}:{...fullHead},frames:[]};
 const registration={sourceSize:[1448,1086],extraction:'complete-connected-pose',sourceCell:181,padding:24,cells:48,recoveredMetadataFromAtlas:true,frames:[]};
 const tile=createCanvas(CELL,CELL),ctx=tile.getContext('2d');
 for(let i=0;i<COUNT;i++){
  const rect=[i%COLS*CELL,Math.floor(i/COLS)*CELL,CELL,CELL];ctx.clearRect(0,0,CELL,CELL);ctx.drawImage(atlas,...rect,0,0,CELL,CELL);
  const pixels=ctx.getImageData(0,0,CELL,CELL).data,face=faceIn(pixels,CELL,CELL),box=[face.minX,face.minY,face.maxX-face.minX+1,face.maxY-face.minY+1],cx=(face.minX+face.maxX)/2,neck=face.maxY;
  let minX=256,minY=256,maxX=0,maxY=0;for(let n=0;n<pixels.length;n+=4)if(pixels[n+3]>96){const x=n/4%CELL,y=Math.floor(n/4/CELL);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  manifest.frames.push({rect,head:[cx,neck,0],face:box,headBox:[cx-36,neck-72,72,72],hand:[Math.min(224,cx+47),170]});
  registration.frames.push({index:i,faceMaskPixels:face.area,sourceBounds:null,packedBounds:[minX,minY,maxX,maxY],face:box});
 }
 return {manifest,registration};
}
async function packSource(source,id,name,hideHair){
 const image=await loadImage(source);if(image.width!==1448||image.height!==1086)throw Error(id+': source size differs from approved 8x6 layout');
 const {pixels}=readPixels(image),poses=components(pixels,image.width,image.height,(p,i)=>p[i+3]>96);
 const big=poses.items.filter(p=>p.area>500);if(big.length!==COUNT)throw Error(id+': expected 48 complete connected poses, found '+big.length);
 const indexed=Array(COUNT);
 for(const part of big){
  const cx=part.sumX/part.area,cy=part.sumY/part.area,index=Math.floor(cy/SOURCE_CELL)*COLS+Math.floor(cx/SOURCE_CELL);
  if(index<0||index>=COUNT||indexed[index])throw Error(id+': ambiguous source pose at '+index);indexed[index]=part;
 }
 const atlas=createCanvas(CELL*COLS,CELL*6),a=atlas.getContext('2d'),sourceRecords=[];
 for(let i=0;i<COUNT;i++){
  const part=indexed[i],left=Math.max(0,part.minX-2),top=Math.max(0,part.minY-2),right=Math.min(image.width-1,part.maxX+2),bottom=Math.min(image.height-1,part.maxY+2),w=right-left+1,h=bottom-top+1;
  const piece=createCanvas(w,h),p=piece.getContext('2d'),im=p.createImageData(w,h);
  // Preserve edge antialiasing only within 2px of this entire connected pose.
  // Neighboring source cells and low-alpha colored background noise are omitted.
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const sx=x+left,sy=y+top,at=sy*image.width+sx;if(!pixels[at*4+3])continue;
   let belongs=poses.labels[at]===part.id;
   if(!belongs)for(let dy=-2;dy<=2&&!belongs;dy++)for(let dx=-2;dx<=2;dx++){
    const nx=sx+dx,ny=sy+dy;if(nx>=0&&ny>=0&&nx<image.width&&ny<image.height&&poses.labels[ny*image.width+nx]===part.id){belongs=true;break;}
   }
   if(belongs&&pixels[at*4+3]>8)im.data.set(pixels.subarray(at*4,at*4+4),(y*w+x)*4);
  }
  p.putImageData(im,0,0);const face=faceIn(im.data,w,h),cx=(face.minX+face.maxX)/2,cy=(face.minY+face.maxY)/2;
  const air=i>=14&&i<=23||i>=44;
  let dx=128-cx*SCALE,dy=air?85.5-cy*SCALE:230-(part.maxY-top)*SCALE;
  // Fully authored poses may extend across a nominal cell boundary. Preserve
  // all pixels and shift the complete pose if an accessory reaches the gutter.
  dx=Math.max(4,Math.min(CELL-4-w*SCALE,dx));dy=Math.max(4,Math.min(CELL-4-h*SCALE,dy));
  a.drawImage(piece,i%COLS*CELL+dx,Math.floor(i/COLS)*CELL+dy,w*SCALE,h*SCALE);
  sourceRecords.push({index:i,sourceBounds:[part.minX,part.minY,part.maxX,part.maxY],sourceComponentPixels:part.area,packing:{scale:SCALE,offset:[dx,dy],sourceOrigin:[left,top]},air});
 }
 const {manifest,registration}=metadataForAtlas(id,name,hideHair,atlas);delete registration.recoveredMetadataFromAtlas;
 for(let i=0;i<COUNT;i++)Object.assign(registration.frames[i],sourceRecords[i]);
 registration.sourceSHA256=checksum(fs.readFileSync(source));registration.packerVersion='recovered-sources-20261113';
 const bytes=await sharp(atlas.toBuffer('image/png')).webp({lossless:true,effort:6}).toBuffer();
 return {manifest,registration,bytes};
}
async function verify(id){
 const dir=path.join(assetRoot,id),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'))),image=await loadImage(path.join(dir,'body.webp'));
 if(image.width!==2048||image.height!==1536||manifest.frames.length!==48)throw Error(id+': incomplete atlas');
 const c=createCanvas(CELL,CELL),ctx=c.getContext('2d'),hashes=new Set();let minimumFace=Infinity,edgePixels=0;
 for(let i=0;i<48;i++){
  const f=manifest.frames[i];ctx.clearRect(0,0,CELL,CELL);ctx.drawImage(image,...f.rect,0,0,CELL,CELL);
  const pixels=ctx.getImageData(0,0,CELL,CELL).data,face=faceIn(pixels,CELL,CELL);minimumFace=Math.min(minimumFace,face.area);hashes.add(checksum(pixels));
  for(let n=0;n<pixels.length;n+=4){const x=n/4%CELL,y=Math.floor(n/4/CELL);if(pixels[n+3]>96&&(x===0||y===0||x===255||y===255))edgePixels++;}
  if(!f.face?.every(Number.isFinite)||!f.head?.every(Number.isFinite)||!f.headBox?.every(Number.isFinite))throw Error(id+': missing face registration '+i);
 }
 if(hashes.size!==48||edgePixels)throw Error(id+': duplicate or clipped poses: '+hashes.size+' unique, '+edgePixels+' border pixels');
 return {id,frames:48,uniqueFrames:hashes.size,minFacePixels:minimumFace,borderPixels:edgePixels,sha256:checksum(fs.readFileSync(path.join(dir,'body.webp')))};
}
(async()=>{
 const results=[],changed=[],verifyOnly=process.argv.includes('--verify-only');
 for(const [id,name,hideHair]of rows){
  const source=path.join(root,'docs/costumes/art/'+id+'-source.png'),before=checksum(fs.readFileSync(source)),dir=path.join(assetRoot,id),files=['body.webp','manifest.json','registration.json'],missing=files.filter(f=>!fs.existsSync(path.join(dir,f)));
  if(missing.length&&!verifyOnly){
   let built;
   if(!missing.includes('body.webp'))built=metadataForAtlas(id,name,hideHair,await loadImage(path.join(dir,'body.webp')));
   else built=await packSource(source,id,name,hideHair);
   fs.mkdirSync(dir,{recursive:true});
   for(const file of missing){const content=file==='body.webp'?built.bytes:JSON.stringify(file==='manifest.json'?built.manifest:built.registration,null,2)+'\n';fs.writeFileSync(path.join(dir,file),content,{flag:'wx'});changed.push(path.relative(root,path.join(dir,file)));}
  }
  if(checksum(fs.readFileSync(source))!==before)throw Error(id+': original source changed');
  results.push(await verify(id));
 }
 console.log(JSON.stringify({changed,results,sourceArtPreserved:true},null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
