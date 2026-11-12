// Pack approved complete outfit frames; the contact artwork travels with each pose.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..');
const out=path.join(root,'royale-v3-staging/kingjames/outfits/kingjames-original');
const specs=[
 {id:'punch',scale:.43,necks:[[204,130],[202,134],[204,132],[216,148],[198,140],[203,141],[201,144],[205,139]]},
 {id:'kick',scale:.40,necks:[[206,128],[207,129],[207,125],[207,126],[201,136],[204,139],[208,143],[210,136]]}
];
async function bounds(buffer){
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let x0=info.width,y0=info.height,x1=0,y1=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>32){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 return {x0,y0,x1,y1};
}
async function build(){
 const manifestPath=path.join(out,'manifest.json'),m=JSON.parse(fs.readFileSync(manifestPath));
 const existing=m.frames.findIndex(f=>f.atlas==='basic'),first=existing<0?m.frames.length:existing;
 const frames=[],tiles=[];
 for(const spec of specs){
  const src=path.join(root,'docs/kingjames/art/basic-'+spec.id+'-source.webp');
  const meta=await sharp(src).metadata();
  if(meta.width!==1536||meta.height!==1024||!meta.hasAlpha)throw Error('Unexpected approved source '+spec.id);
  const start=first+frames.length;
  for(let i=0;i<8;i++){
   const raw=await sharp(src).extract({left:i%4*384,top:Math.floor(i/4)*512,width:384,height:512}).png().toBuffer();
   const b=await bounds(raw),s=spec.scale,[nx,ny]=spec.necks[i];
   const headY=Math.round(230-(b.y1-ny)*s),dx=Math.round(132-nx*s),dy=Math.round(headY-ny*s);
   const x=Math.max(0,b.x0-3),y=Math.max(0,b.y0-3),w=Math.min(384,b.x1+4)-x,h=Math.min(512,b.y1+4)-y;
   const left=dx+Math.round(x*s),top=dy+Math.round(y*s),width=Math.round(w*s),height=Math.round(h*s);
   if(left<3||top<3||left+width>253||top+height>253)throw Error('Clipped basic attack '+spec.id+':'+i);
   const n=frames.length,tile=await sharp(raw).extract({left:x,top:y,width:w,height:h}).resize(width,height).png().toBuffer();
   tiles.push({input:tile,left:n%8*256+left,top:Math.floor(n/8)*256+top});
   frames.push({rect:[n%8*256,Math.floor(n/8)*256,256,256],atlas:'basic',head:[132,headY,0],hand:[132+(spec.id==='punch'&&i===4?64:18),headY+35],bounds:[left,top,width,height]});
  }
  m.animations[spec.id]={frames:Array.from({length:8},(_,i)=>start+i),duration:spec.id==='punch'?.27:.39,phases:[0,4,5,8],embeddedImpact:true};
 }
 m.frames.splice(first,existing<0?0:16,...frames);
 m.atlases={...m.atlases,basic:'basic-attacks-v1.webp'};
 await sharp({create:{width:2048,height:512,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).webp({lossless:true}).toFile(path.join(out,'basic-attacks-v1.webp'));
 fs.writeFileSync(manifestPath,JSON.stringify(m,null,2)+'\n');
 console.log('Packed 8 ordinary punch + 8 ordinary kick frames with attached contact artwork.');
}
exports.build=build;
if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
