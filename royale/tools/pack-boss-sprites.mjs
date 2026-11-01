// Deterministic atlas packaging of the recovered, newly drawn animation poses.
// This does not redraw art or crop the tiny poses from the concept references.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url);
const dependency=name=>{try{return require(name);}catch{return require(require.resolve(name,{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));}};
const {PNG}=dependency('pngjs'),sharp=dependency('sharp');
const root=fileURLToPath(new URL('../assets/boss-sprites/',import.meta.url));
const cell=416,anchor=[176,384],referenceHeight=192;
const specifications=[
 {id:1,key:'regional-trash-monster',name:'Trash Monster',design:'Trash Monster',standingHeight:191,
  rows:[0,224,447,651,873,1106,1316,1534,1774],
  cuts:[[0,223,442,666,887],[0,228,447,675,887],[0,221,441,707,887],[0,224,433,702,887],[0,226,409,666,887],[0,233,448,669,887],[0,222,422,660,887],[0,226,445,672,887]],
  centers:[[109,333,551,777],[109,333,552,777],[109,331,525,786],[108,327,535,782],[111,325,529,782],[117,338,554,779],[110,328,530,778],[111,333,549,781]],
  overrides:{11:[666,447,887,651],15:[666,651,887,873],17:[221,873,438,1106],26:[410,1316,667,1510]},
  states:['idle','walk','swipe','throw','slam','hit','defeat','surge']},
 {id:2,key:'regional-bushman',name:'Bushman',design:'Thorn Beast',standingHeight:176,
  rows:[0,181,365,553,744,921,1131,1326,1535],
  cuts:[[0,254,510,780,1025],[0,254,511,780,1025],[0,253,481,780,1025],[0,247,484,810,1025],[0,254,491,819,1025],[0,251,483,784,1025],[0,254,512,782,1025],[0,253,509,776,1025]],
  centers:[[129,384,644,895],[126,379,639,898],[126,373,597,893],[124,376,599,910],[128,375,612,907],[128,375,615,902],[128,377,637,899],[127,374,625,893]],
  states:['idle','walk','branch','vine','thorns','roots','hit','defeat']},
 {id:3,key:'regional-wastelander',name:'Wastelander',design:'Sludge Beast',standingHeight:203,
  rows:[0,227,447,665,869,1118,1331,1557,1774],
  cuts:[[0,224,442,666,887],[0,222,438,662,887],[0,214,429,702,887],[0,216,422,711,887],[0,224,421,667,887],[0,227,443,664,887],[0,225,440,665,887],[0,224,420,660,887]],
  centers:[[117,331,551,776],[112,327,544,775],[110,327,539,781],[111,324,512,781],[116,324,529,776],[113,328,542,778],[114,329,548,778],[115,326,531,777]],
  overrides:{9:[214,447,459,665],11:[666,447,887,665],15:[666,665,887,869]},
  states:['idle','walk','punch','toxic','slam','hazard','hit','defeat']},
];
mkdirSync(root+'atlases',{recursive:true});
const manifest={version:1,cell,columns:4,rows:8,anchor,referenceHeight,facing:1,source:'Recovered local checkpoint d6b667ef3a8a8a6af7637ac4290c8b0dd3e8dbc9',bosses:{}};
for(const spec of specifications){
 const bytes=readFileSync(`${root}source/${spec.key}.png`),source=PNG.sync.read(bytes),out=new PNG({width:cell*4,height:cell*8});out.data.fill(0);
 const scale=referenceHeight/spec.standingHeight,frames=[];
 for(let row=0;row<8;row++)for(let col=0;col<4;col++){
  const [x0,y0,x1,y1]=spec.overrides?.[row*4+col]||[spec.cuts[row][col],spec.rows[row],spec.cuts[row][col+1],spec.rows[row+1]],w=x1-x0,h=y1-y0;
  const tile=new PNG({width:w,height:h});
  for(let y=0;y<h;y++)source.data.copy(tile.data,y*w*4,((y0+y)*source.width+x0)*4,((y0+y)*source.width+x1)*4);
  // Keep the connected character silhouette and attached effects. Detached debris
  // is supplied by gameplay effects; neighboring source-pose fragments must not leak.
  const seen=new Uint8Array(w*h),components=[];
  for(let seed=0;seed<w*h;seed++){
   if(seen[seed]||tile.data[seed*4+3]<24)continue;
   const queue=[seed];seen[seed]=1;
   for(let q=0;q<queue.length;q++){const n=queue[q],x=n%w,y=Math.floor(n/w);for(const z of [x>0?n-1:-1,x<w-1?n+1:-1,y>0?n-w:-1,y<h-1?n+w:-1])if(z>=0&&!seen[z]&&tile.data[z*4+3]>=24){seen[z]=1;queue.push(z);}}
   components.push(queue);
  }
  components.sort((a,b)=>b.length-a.length);if(!components.length)throw Error(`Empty ${spec.key}/${row}/${col}`);
  const keep=new Uint8Array(w*h);
  for(const n of components[0])keep[n]=1;
  // Preserve the antialiased edge adjoining retained components.
  for(let n=0;n<w*h;n++)if(!keep[n]){const x=n%w,y=Math.floor(n/w);if(tile.data[n*4+3]>=24||![x>0?n-1:-1,x<w-1?n+1:-1,y>0?n-w:-1,y<h-1?n+w:-1].some(z=>z>=0&&keep[z]))tile.data[n*4+3]=0;}
  let bottom=0;for(let n=0;n<w*h;n++)if(keep[n])bottom=Math.max(bottom,Math.floor(n/w));
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
 manifest.bosses[spec.id]={name:spec.name,design:spec.design,file:`royale/assets/boss-sprites/atlases/${spec.key}.png`,source:`source/${spec.key}.png`,sourceSha256:createHash('sha256').update(bytes).digest('hex'),sha256:createHash('sha256').update(png).digest('hex'),bytes:png.length,states:spec.states,frames};
 console.log(`${spec.name}: ${frames.length} frames, ${out.width}x${out.height}, ${png.length} bytes; no packing clipping`);
}
writeFileSync(root+'atlas-manifest.json',JSON.stringify(manifest,null,2)+'\n');
writeFileSync(root+'atlas-data.mjs','// Generated by royale/tools/pack-boss-sprites.mjs.\nexport const BOSS_SPRITE_ATLASES = '+JSON.stringify(manifest,null,2)+';\n');
