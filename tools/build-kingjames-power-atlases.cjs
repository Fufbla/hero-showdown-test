// Packs complete authored sprites. No limb extraction or procedural character drawing.
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'royale-v3-staging/kingjames');
const cols=[0,158,315,473,630,788,945,1103,1263],rows=[0,177,333,497,660,813,972,1117,1246];
const range=(a,n)=>Array.from({length:n},(_,i)=>a+i);
const clip=(a,n,duration,loop=false)=>({frames:range(a,n),duration,loop});
const animations={idle:clip(0,4,1.8,true),start:clip(4,2,.12),stop:clip(6,2,.16),run:clip(8,8,.52,true),jump:clip(16,4,.5),doubleJump:clip(20,4,.5),fall:clip(24,4,.5),land:clip(28,4,.13),punch:clip(32,4,.27),kick:clip(36,4,.39),strength:clip(40,4,.27),superKick:clip(44,4,.39),flightStart:clip(48,2,.32),fly:clip(50,4,.6,true),hover:clip(54,2,.8,true),hurt:clip(56,2,.16),defeat:clip(58,3,.65),recovery:clip(61,3,.6)};
async function bounds(buf){const {data,info}=await sharp(buf).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>80){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 return {x0,y0,x1,y1};}
(async()=>{
 const dir=path.join(out,'transforms/steel');fs.mkdirSync(dir,{recursive:true});let frames=[],tiles=[];
 const source=path.join(root,'docs/kingjames/art/steel-source.png');
 for(let i=0;i<64;i++){
  const col=i%8,row=Math.floor(i/8),w=cols[col+1]-cols[col],h=rows[row+1]-rows[row];
  const tile=await sharp(source).extract({left:cols[col],top:rows[row],width:w,height:h}).png().toBuffer();
  const b=await bounds(tile),ratio=1.40;
  // Crop each whole character with two pixels of antialiased padding.
  const left=Math.max(0,b.x0-2),top=Math.max(0,b.y0-2),width=Math.min(w,b.x1+3)-left,height=Math.min(h,b.y1+3)-top;
  const nw=Math.round(width*ratio),nh=Math.round(height*ratio);
  let dx=Math.round(128+(left-w/2)*ratio),dy=Math.round(230-(b.y1-top)*ratio);
  if([11,15,18,19,21,22,23,24,25,26,27,49,54,55].includes(i))dy=48;
  if(i>=50&&i<=53)dy=Math.round(155-nh/2);
  dx=Math.max(8,Math.min(248-nw,dx));dy=Math.max(8,Math.min(248-nh,dy));
  const packed=await sharp(tile).extract({left,top,width,height}).resize(nw,nh).png().toBuffer();
  tiles.push({input:packed,left:col*256+dx,top:row*256+dy});
  const state=Object.entries(animations).find(([,v])=>v.frames.includes(i))[0];
  frames.push({rect:[col*256,row*256,256,256],head:[128,dy+65,0],hand:[['punch','strength'].includes(state)&&i%4===2?218:160,dy+100],bounds:[dx,dy,nw,nh]});
 }
 await sharp({create:{width:2048,height:2048,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).webp({lossless:true}).toFile(path.join(dir,'body.webp'));
 const manifest={version:1,id:'steel-universal',label:'Universal Steel Body',rig:'action-chibi-v1',atlas:'body.webp',cell:[256,256],foot:[128,230],worldScale:.62,strideDistance:164,head:{scale:.62,embedded:true},directions:{right:{mirror:false},left:{mirror:true}},frames,animations};
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const fx=path.join(out,'effects');fs.mkdirSync(fx,{recursive:true});
 await sharp(path.join(root,'docs/kingjames/art/motion-fx-source.png')).webp({lossless:true}).toFile(path.join(fx,'motion.webp'));
 fs.writeFileSync(path.join(fx,'manifest.json'),JSON.stringify({version:1,atlas:'motion.webp',cell:[181,181],columns:8,clips:{streak:{row:0,duration:.4},dust:{row:1,duration:.32},takeoff:{row:2,duration:.28},landing:{row:3,duration:.34},impact:{row:4,duration:.22},shimmer:{row:5,duration:.32},airJump:{row:5,duration:.28}}},null,2)+'\n');
 console.log('Packed 64 whole metal characters, 18 clips and 48 motion effect frames.');
})().catch(e=>{console.error(e);process.exitCode=1;});
