// Pack approved complete character frames. Gameplay and existing locomotion art stay intact.
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'royale-v3-staging/kingjames/outfits/kingjames-original');
const art=path.join(root,'docs/kingjames/art');
const necks={
 strength:[[205,100],[211,111],[218,124],[233,143],[229,139],[211,139],[205,140],[203,140],[205,130],[209,124],[203,112],[202,103]],
 superKick:[[147,79],[150,81],[151,80],[149,80],[146,81],[149,81],[151,82],[148,81],[144,93],[149,94],[159,101],[144,93],[146,71],[151,72],[152,73],[149,73],[145,73],[147,75],[152,76],[148,75],[144,70],[147,72],[153,72],[147,70]],
 fireball:[[171,78],[170,77],[177,76],[169,77],[171,65],[172,65],[175,69],[172,69],[170,56],[171,57],[174,60],[166,60],[165,59],[168,58],[174,62],[169,61]]
};
const specs=[{id:'strength',file:'attack-strength-source.png',cols:4,rows:3,scale:.52},
 {id:'superKick',file:'attack-kick-source.png',cols:4,rows:6,scale:.73},
 {id:'fireball',file:'attack-fireball-source.png',cols:4,rows:4,scale:.59}];
async function bounds(buffer){const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=info.width,y0=info.height,x1=0,y1=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>80){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return {x0,y0,x1,y1};}
(async()=>{
 const m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json')));m.frames=m.frames.slice(0,48);
 for(const id of ['strength','superKick','fireball','fireballAir'])delete m.animations[id];
 m.atlases={attacks:'attacks.webp'};const tiles=[];
 for(const spec of specs){
  const src=path.join(art,spec.file),meta=await sharp(src).metadata(),first=m.frames.length;
  for(let i=0;i<spec.cols*spec.rows;i++){
   const col=i%spec.cols,row=Math.floor(i/spec.cols),left=Math.round(col*meta.width/spec.cols),top=Math.round(row*meta.height/spec.rows);
   const width=Math.round((col+1)*meta.width/spec.cols)-left,height=Math.round((row+1)*meta.height/spec.rows)-top;
   const raw=await sharp(src).extract({left,top,width,height}).png().toBuffer(),b=await bounds(raw),s=spec.scale,[nx,ny]=necks[spec.id][i];
   const air=spec.id==='fireball'&&i>=8;
   const headY=air?116:Math.round(230-(b.y1-ny)*s);
   const dx=Math.round(132-nx*s),dy=Math.round(headY-ny*s);
   // Tight whole-character crop preserves every authored limb within the fixed cell.
   const x=Math.max(0,b.x0-2),y=Math.max(0,b.y0-2),w=Math.min(width,b.x1+3)-x,h=Math.min(height,b.y1+3)-y;
   const destX=dx+Math.round(x*s),destY=dy+Math.round(y*s),nw=Math.round(w*s),nh=Math.round(h*s);
   if(destX<3||destY<3||destX+nw>253||destY+nh>253)throw Error('Clipped attack cell '+spec.id+':'+i);
   const tile=await sharp(raw).extract({left:x,top:y,width:w,height:h}).resize(nw,nh).png().toBuffer(),n=tiles.length;
   tiles.push({input:tile,left:n%8*256+destX,top:Math.floor(n/8)*256+destY});
   const reach=spec.id==='strength'&&i>=5&&i<=7?b.x1:spec.id==='fireball'&&[3,4].includes(i%8)?b.x1:nx+40;
   m.frames.push({rect:[n%8*256,Math.floor(n/8)*256,256,256],atlas:'attacks',head:[132,headY,0],hand:[dx+reach*s,headY+(spec.id==='fireball'?28:35)],bounds:[destX,destY,nw,nh]});
  }
  const frames=Array.from({length:spec.cols*spec.rows},(_,i)=>first+i);
  if(spec.id==='fireball'){
   m.animations.fireball={frames:frames.slice(0,8),duration:.60};m.animations.fireballAir={frames:frames.slice(8),duration:.60};
  }else m.animations[spec.id]={frames,duration:spec.id==='strength'?.27:.39,...(spec.id==='strength'?{phases:[0,5,8,12]}:{comboStride:4})};
 }
 // The low combo-kick pose has a sloping neck; register the chin on its
 // actual exposed neck instead of the old point above and to the right.
 m.frames[70].head=[127,144,0];
 await sharp({create:{width:2048,height:Math.ceil(tiles.length/8)*256,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).webp({lossless:true}).toFile(path.join(dir,'attacks.webp'));
 await sharp(path.join(art,'attack-fx-source.png')).webp({lossless:true}).toFile(path.join(root,'royale-v3-staging/kingjames/effects/attacks.webp'));
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(m,null,2)+'\n');
 await require('./build-kingjames-basic-attacks.cjs').build();
 console.log('Packed 12 strength, 24 combo-kick and 16 ground/air fireball frames.');
})().catch(e=>{console.error(e);process.exitCode=1;});
