// Deterministic packaging of newly authored Batch 2 poses; Batch 1 files are never rebuilt.
// This does not redraw art or crop the tiny poses from the concept references.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const dependency=name=>{try{return require(name);}catch{return require(require.resolve(name,{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));}};
const {PNG}=dependency('pngjs'),sharp=dependency('sharp');
const root=fileURLToPath(new URL('../assets/boss-sprites/',import.meta.url));
const cell=512,anchor=[208,480],referenceHeight=192;
const specifications=[
 {id:5,key:'regional-venomis',name:'Venomis',design:'Mutant Stalker',standingHeight:164,threshold:80,
  rows:[0,188,367,546,735,920,1117,1312,1536],
  cuts:[[0,256,512,768,1024],[0,258,513,770,1024],[0,256,500,832,1024],[0,256,506,825,1024],[0,256,488,832,1024],[0,255,488,811,1024],[0,255,505,770,1024],[0,256,500,765,1024]],
  centers:[[123,384,636,893],[118,382,629,893],[117,369,575,903],[120,375,589,903],[113,367,576,906],[113,365,581,892],[122,371,624,890],[122,369,594,878]],
  overrides:{11:[795,367,1024,546],15:[804,546,1024,735],19:[810,735,1024,920],31:[735,1312,1024,1536]},
  states:['idle','walk','vine','thorns','poison','roots','hit','defeat']},
 {id:6,key:'regional-atomdust',name:'AtomDust',design:'Energy Phantom',standingHeight:214,threshold:180,
  rows:[0,231,454,685,891,1142,1352,1568,1774],
  cuts:[[0,213,436,664,887],[0,211,438,665,887],[0,213,435,740,887],[0,219,431,693,887],[0,213,437,678,887],[0,212,431,701,887],[0,215,436,685,887],[0,215,436,670,887]],
  centers:[[105,328,550,776],[105,328,552,776],[106,327,538,782],[111,328,536,780],[106,328,548,779],[105,329,543,780],[113,328,552,780],[111,329,550,784]],
  overrides:{11:[685,454,887,685],14:[410,685,702,891],15:[666,685,887,891],19:[666,891,887,1142],22:[406,1142,705,1352],23:[666,1142,887,1352],27:[666,1352,887,1568]},
  states:['idle','walk','blast','expansion','debris','atomic','hit','defeat']},
];
mkdirSync(root+'atlases',{recursive:true});
const manifest={version:2,cell,columns:4,rows:8,anchor,referenceHeight,facing:1,source:'New Batch 2 animation artwork from approved references; base f140ba3083090a6959f3d8951d2bcc063fa5385d',bosses:{}};
for(const spec of specifications){
 const bytes=readFileSync(`${root}source/batch2/${spec.key}.png`),source=PNG.sync.read(bytes),out=new PNG({width:cell*4,height:cell*8});out.data.fill(0);
 const scale=referenceHeight/spec.standingHeight,frames=[];
 for(let row=0;row<8;row++)for(let col=0;col<4;col++){
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
   const offset=((row*cell+ty)*out.width+col*cell+tx)*4;packed.data.copy(out.data,offset,n,n+4);nonzero++;
   if(a>=24){bounds[0]=Math.min(bounds[0],tx);bounds[1]=Math.min(bounds[1],ty);bounds[2]=Math.max(bounds[2],tx);bounds[3]=Math.max(bounds[3],ty);}
  }
  if(clipped)throw Error(`Packing clips ${clipped} pixels: ${spec.key}/${row}/${col}. Adjust cell or anchor.`);
  frames.push({id:row*4+col,state:spec.states[row],sourceRect:[x0,y0,w,h],sourceFoot:[spec.centers[row][col],y0+bottom],crop:[col*cell,row*cell,cell,cell],bounds,nonzero});
 }
 const png=PNG.sync.write(out);writeFileSync(`${root}atlases/${spec.key}.png`,png);
 manifest.bosses[spec.id]={cell,anchor,referenceHeight,name:spec.name,design:spec.design,file:`royale/assets/boss-sprites/atlases/${spec.key}.png`,source:`source/batch2/${spec.key}.png`,sourceSha256:createHash('sha256').update(bytes).digest('hex'),sha256:createHash('sha256').update(png).digest('hex'),bytes:png.length,states:spec.states,frames};
 console.log(`${spec.name}: ${frames.length} frames, ${out.width}x${out.height}, ${png.length} bytes; no packing clipping`);
}
writeFileSync(root+'batch2-atlas-manifest.json',JSON.stringify(manifest,null,2)+'\n');
writeFileSync(root+'batch2-atlas-data.mjs','// Generated by royale/tools/pack-boss-sprites-batch2.mjs.\nexport const BATCH2_SPRITE_ATLASES = '+JSON.stringify(manifest,null,2)+';\n');
