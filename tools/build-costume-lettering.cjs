// Recover a print mask from the approved fishstick cloth. Never alter source art.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');const sharp=require('sharp');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf','Lettering Preview');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'royale-v3-staging/costumes/assets/fishsticks-costume');
const sum=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'))),atlasPath=path.join(dir,'body.webp'),sourcePath=path.join(root,'docs/costumes/art/fishsticks-costume-source.png');
 const immutable=Object.fromEntries([sourcePath,atlasPath,path.join(dir,'manifest.json'),path.join(dir,'registration.json')].map(p=>[path.relative(root,p),sum(fs.readFileSync(p))]));
 const image=await loadImage(atlasPath),mask=createCanvas(2048,1536),mc=mask.getContext('2d'),preview=createCanvas(2048,1536),pc=preview.getContext('2d'),composite=createCanvas(2048,1536),cc=composite.getContext('2d');
 pc.fillStyle=cc.fillStyle='#e4e9ef';pc.fillRect(0,0,2048,1536);cc.fillRect(0,0,2048,1536);pc.drawImage(image,0,0);cc.drawImage(image,0,0);
 const frames=[],areas=[],clearBounds=[];
 for(let i=0;i<48;i++){
  const f=manifest.frames[i],tile=createCanvas(256,256),tc=tile.getContext('2d');tc.drawImage(image,...f.rect,0,0,256,256);const p=tc.getImageData(0,0,256,256).data,[fx,fy,fw,fh]=f.face;
  const white=new Uint8Array(256*256),obstacle=new Uint8Array(256*256),rowMin=Array(256).fill(256),rowMax=Array(256).fill(-1);
  let xmin=256,xmax=0,ymin=256,ymax=0;
  const margin=[34,35].includes(i)?30:13;
  for(let y=Math.ceil(fy+fh+([34,35].includes(i)?-4:2));y<Math.min(254,fy+fh+64);y++)for(let x=Math.max(0,Math.floor(fx-margin));x<Math.min(255,fx+fw+margin);x++){
   const n=y*256+x,j=n*4,r=p[j],g=p[j+1],b=p[j+2];if(p[j+3]<96)continue;
   const bright=Math.min(r,g,b)>155&&Math.max(r,g,b)-Math.min(r,g,b)<50;
   if(bright)white[n]=1;
   const blue=b>65&&(b>r*1.35&&g>r*1.2||b>g*1.6&&r<110);
   const redPrint=r>g*1.3&&r>b*1.3&&(b>g*.5||g<70);
   const gold=!redPrint&&r>140&&g>65&&r>g*1.08&&b<g*.78;
   if(blue||gold)obstacle[n]=1;
  }
  // Ignore isolated glints on gloves/cape; retain every substantial visible
  // white cloth island when authored arms split the shirt into several pieces.
  const seen=new Uint8Array(65536),queue=new Int32Array(65536);
  for(let n=0;n<65536;n++)if(white[n]&&!seen[n]){
   let a=0,z=1;queue[0]=n;seen[n]=1;
   while(a<z){const at=queue[a++],x=at%256,y=Math.floor(at/256);for(const k of [x?at-1:-1,x<255?at+1:-1,y?at-256:-1,y<255?at+256:-1])if(k>=0&&white[k]&&!seen[k]){seen[k]=1;queue[z++]=k;}}
   if(z<12){for(let a=0;a<z;a++)white[queue[a]]=0;continue;}
   for(let a=0;a<z;a++){const at=queue[a],x=at%256,y=Math.floor(at/256);rowMin[y]=Math.min(rowMin[y],x);rowMax[y]=Math.max(rowMax[y],x);xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
  }
  // Interpolate cloth edges across dark printing: a line of old lettering can
  // temporarily contain no white pixels, but is still part of the same shirt.
  const smoothMin=rowMin.map((_,y)=>{const v=rowMin.slice(Math.max(0,y-4),Math.min(256,y+5)).filter((x,i)=>x<256).sort((a,b)=>a-b);return v.length?v[Math.floor((v.length-1)*.25)]:256;});
  const smoothMax=rowMax.map((_,y)=>{const v=rowMax.slice(Math.max(0,y-4),Math.min(256,y+5)).filter(x=>x>=0).sort((a,b)=>a-b);return v.length?v[Math.ceil((v.length-1)*.75)]:-1;});
  // Keep the white neckline and hem outside the print whenever possible.
  // The mask, not this bounding rectangle, provides exact arm/cloth occlusion.
  const box=[xmin,Math.min(ymin,ymax-8),xmax-xmin+1,Math.max(8,ymax-ymin-1)];clearBounds.push(box);
  const im=tc.createImageData(256,256),printedX=[];let area=0;
  for(let y=box[1];y<box[1]+box[3];y++)for(let x=Math.max(box[0],smoothMin[y]);x<=Math.min(box[0]+box[2]-1,smoothMax[y]);x++){
   const n=y*256+x,j=n*4;if(p[j+3]<96)continue;
   let blocked=false;for(let yy=Math.max(0,y-2);yy<=Math.min(255,y+2)&&!blocked;yy++)for(let xx=Math.max(0,x-2);xx<=Math.min(255,x+2);xx++)if(obstacle[yy*256+xx]){blocked=true;break;}
   if(!blocked){im.data[j]=im.data[j+1]=im.data[j+2]=255;im.data[j+3]=255;area++;printedX.push(x);}
  }
  const maskTile=createCanvas(256,256),mt=maskTile.getContext('2d');mt.putImageData(im,0,0);mc.drawImage(maskTile,i%8*256,Math.floor(i/8)*256);areas.push(area);
  printedX.sort((a,b)=>a-b);const printLeft=printedX[Math.floor(printedX.length*.08)],printRight=printedX[Math.min(printedX.length-1,Math.floor(printedX.length*.94))],printBox=[printLeft,box[1],Math.max(20,printRight-printLeft+1),box[3]];frames.push(printBox);
  const [x,y,w,h]=printBox,ox=i%8*256,oy=Math.floor(i/8)*256;pc.strokeStyle='#e23266';pc.lineWidth=1;pc.strokeRect(ox+x,oy+y,w,h);pc.fillStyle='#173246';pc.font='bold 18px sans-serif';pc.fillText(String(i),ox+10,oy+24);
  const decal=createCanvas(256,256),dc=decal.getContext('2d');dc.fillStyle='#fff';dc.fillRect(0,0,256,256);dc.textAlign='center';dc.fillStyle='#17151b';dc.font=Math.max(8,h*.34)+'px "Lettering Preview"';dc.fillText('I',x+w*.31,y+h*.42);dc.fillStyle='#e3324a';dc.fillText('♥',x+w*.63,y+h*.42);dc.fillStyle='#17151b';dc.font=Math.max(7,h*.28)+'px "Lettering Preview"';dc.fillText('FISHSTICKS',x+w/2,y+h*.82,w*.96);dc.globalCompositeOperation='destination-in';dc.drawImage(maskTile,0,0);cc.drawImage(decal,ox,oy);cc.fillStyle='#173246';cc.font='bold 18px sans-serif';cc.fillText(String(i),ox+10,oy+24);
 }
 const data={version:1,id:'fishsticks-costume',label:'I ♥ FISHSTICKS',atlas:'lettering-mask.webp',cell:[256,256],mask:'white-cloth-print-with-authored-arm-occlusion',frames,clearBounds,maskPixels:areas,sourceSHA256:immutable[path.relative(root,sourcePath)],bodySHA256:immutable[path.relative(root,atlasPath)]};
 fs.writeFileSync(path.join(dir,'lettering.json'),JSON.stringify(data,null,2)+'\n');await sharp(mask.toBuffer('image/png')).webp({lossless:true,effort:6}).toFile(path.join(dir,'lettering-mask.webp'));
 const scratch=path.dirname(root);fs.writeFileSync(path.join(scratch,'fishsticks-lettering-rectangles.png'),preview.toBuffer('image/png'));fs.writeFileSync(path.join(scratch,'fishsticks-lettering-composite.png'),composite.toBuffer('image/png'));
 for(const [p,sha]of Object.entries(immutable))if(sum(fs.readFileSync(path.join(root,p)))!==sha)throw Error('Recovered file changed: '+p);
 fs.writeFileSync(path.join(scratch,'fishsticks-lettering-source-hashes.json'),JSON.stringify(immutable,null,2)+'\n');
 console.log(JSON.stringify({frames:frames.length,minimumMaskPixels:Math.min(...areas),maximumMaskPixels:Math.max(...areas),immutable},null,2));
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
