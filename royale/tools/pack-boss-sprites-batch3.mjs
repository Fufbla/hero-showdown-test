// Deterministic packaging of newly authored Batch 3 poses; Prior batch files are never rebuilt.
// This does not redraw art or crop the tiny poses from the concept references.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const dependency=name=>{try{return require(name);}catch{return require(require.resolve(name,{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));}};
const {PNG}=dependency('pngjs'),sharp=dependency('sharp');
const root=fileURLToPath(new URL('../assets/boss-sprites/',import.meta.url));
const cell=384,anchor=[192,352],referenceHeight=192;
const specifications=[
 {file:'movement-punch',rows:[0,344,670,1024],cuts:[[0,384,768,1152,1536],[0,384,768,1152,1536],[0,384,768,1200,1536]],centers:[[195,578,960,1348],[195,578,960,1348],[195,578,940,1348]],states:['idle','walk','punch']},
 {file:'pollution-environment-slam',rows:[0,340,667,1024],cuts:[[0,384,728,1208,1536],[0,384,768,1160,1536],[0,384,728,1180,1536]],centers:[[195,578,910,1355],[195,578,960,1355],[195,578,960,1355]],states:['pollution','environment','slam']},
 {file:'cataclysm-hit-defeat',rows:[0,356,704,1024],cuts:[[0,384,768,1200,1536],[0,410,820,1180,1536],[0,384,768,1160,1536]],centers:[[210,600,990,1370],[210,615,990,1370],[195,580,960,1340]],states:['cataclysm','hit','defeat']}
];
mkdirSync(root+'atlases',{recursive:true});
const manifest={version:3,cell,columns:4,rows:9,anchor,referenceHeight,facing:1,source:'Approved Corrupted Guardian reference; new 36-pose artwork',bosses:{}};
const out=new PNG({width:cell*4,height:cell*9});out.data.fill(0);
const frames=[],sources=[];
for(const [sheet,spec] of specifications.entries()){
 const bytes=readFileSync(`${root}source/batch3/${spec.file}.png`),source=PNG.sync.read(bytes),scale=referenceHeight/330;
 spec.threshold=100;
 sources.push({file:`source/batch3/${spec.file}.png`,sha256:createHash('sha256').update(bytes).digest('hex')});
 for(let row=0;row<3;row++)for(let col=0;col<4;col++){
  const [x0,y0,x1,y1]=spec.overrides?.[row*4+col]||[spec.cuts[row][col],spec.rows[row],spec.cuts[row][col+1],spec.rows[row+1]],w=x1-x0,h=y1-y0;
  const tile=new PNG({width:w,height:h});
  for(let y=0;y<h;y++)source.data.copy(tile.data,y*w*4,((y0+y)*source.width+x0)*4,((y0+y)*source.width+x1)*4);
  // Keep the connected character silhouette and attached effects. Detached debris
  // is supplied by gameplay effects; neighboring source-pose fragments must not leak.
  const seen=new Uint8Array(w*h),components=[];
  for(let seed=0;seed<w*h;seed++){
   if(seen[seed]||tile.data[seed*4+3]<spec.threshold)continue;
   const queue=[seed];seen[seed]=1;
   for(let q=0;q<queue.length;q++){const n=queue[q],x=n%w,y=Math.floor(n/w);for(const z of [x>0?n-1:-1,x<w-1?n+1:-1,y>0?n-w:-1,y<h-1?n+w:-1])if(z>=0&&!seen[z]&&tile.data[z*4+3]>=spec.threshold){seen[z]=1;queue.push(z);}}
   components.push(queue);
  }
  components.sort((a,b)=>b.length-a.length);if(!components.length)throw Error(`Empty ${spec.key}/${row}/${col}`);
  const keep=new Uint8Array(w*h);
  for(const n of components[0])keep[n]=1;
  // Restore the antialiased edge and nearby translucent energy around this
  // character, without reconnecting neighboring figures through a broad aura.
  let frontier=components[0];
  for(let pass=0;pass<6;pass++){
   const next=[];
   for(const n of frontier){const x=n%w,y=Math.floor(n/w);for(const z of [x>0?n-1:-1,x<w-1?n+1:-1,y>0?n-w:-1,y<h-1?n+w:-1])if(z>=0&&!keep[z]&&tile.data[z*4+3]>=8){keep[z]=1;next.push(z);}}
   frontier=next;
  }
  for(let n=0;n<w*h;n++)if(!keep[n])tile.data[n*4+3]=0;
  let bottom=0;for(let n=0;n<w*h;n++)if(keep[n]&&tile.data[n*4+3]>=100)bottom=Math.max(bottom,Math.floor(n/w));
  const resized=await sharp(PNG.sync.write(tile)).resize(Math.round(w*scale),Math.round(h*scale),{kernel:'lanczos3'}).png().toBuffer();
  const packed=PNG.sync.read(resized),dx=Math.round(anchor[0]-(spec.centers[row][col]-x0)*scale),dy=Math.round(anchor[1]-bottom*scale);
  let clipped=0,nonzero=0,bounds=[cell,cell,0,0];
  for(let y=0;y<packed.height;y++)for(let x=0;x<packed.width;x++){
   const n=(y*packed.width+x)*4,a=packed.data[n+3];if(!a)continue;const tx=x+dx,ty=y+dy;
   if(tx<2||ty<2||tx>=cell-2||ty>=cell-2){if(a>=24)clipped++;continue;}
   const offset=(((sheet*3+row)*cell+ty)*out.width+col*cell+tx)*4;packed.data.copy(out.data,offset,n,n+4);nonzero++;
   if(a>=24){bounds[0]=Math.min(bounds[0],tx);bounds[1]=Math.min(bounds[1],ty);bounds[2]=Math.max(bounds[2],tx);bounds[3]=Math.max(bounds[3],ty);}
  }
  if(clipped)throw Error(`Packing clips ${clipped} pixels: ${spec.key}/${row}/${col}. Adjust cell or anchor.`);
  frames.push({id:(sheet*3+row)*4+col,state:spec.states[row],sourceRect:[x0,y0,w,h],sourceFoot:[spec.centers[row][col],y0+bottom],crop:[col*cell,(sheet*3+row)*cell,cell,cell],bounds,nonzero});
 }
}
const png=PNG.sync.write(out),file='royale/assets/boss-sprites/atlases/regional-ultimate-pollution.png';
writeFileSync(`${root}atlases/regional-ultimate-pollution.png`,png);
manifest.bosses[7]={cell,columns:4,rows:9,anchor,referenceHeight,name:'Ultimate Pollution Boss',design:'Corrupted Guardian',file,sources,sha256:createHash('sha256').update(png).digest('hex'),bytes:png.length,states:specifications.flatMap(s=>s.states),frames};
writeFileSync(root+'batch3-atlas-manifest.json',JSON.stringify(manifest,null,2)+'\n');
writeFileSync(root+'batch3-atlas-data.mjs','// Generated by royale/tools/pack-boss-sprites-batch3.mjs.\nexport const BATCH3_SPRITE_ATLASES = '+JSON.stringify(manifest,null,2)+';\n');
console.log(`Ultimate Pollution Boss: ${frames.length} unique authored poses; ${out.width}x${out.height}; ${png.length} bytes; no packing clipping`);
