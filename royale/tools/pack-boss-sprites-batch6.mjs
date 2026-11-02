// Packs newly authored RGBA poses only. Never rebuilds regional boss assets.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),dep=n=>{try{return require(n);}catch{return require(require.resolve(n,{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));}};
const {PNG}=dep('pngjs'),sharp=dep('sharp'),root=fileURLToPath(new URL('../assets/boss-sprites/',import.meta.url));
const cell=512,anchor=[224,480],referenceHeight=224;
const specs=[{"id": "venomis", "name": "Venomis", "phaseColors": ["#7aff4a", "#df69f9"], "sheets": [{"file": "venomis-1", "height": 240, "rows": [0, 256, 485, 735, 1024], "cuts": [[0, 384, 768, 1152, 1536], [0, 384, 768, 1152, 1536], [0, 384, 768, 1152, 1536], [0, 390, 775, 1200, 1536]], "centers": [[192, 576, 960, 1344], [192, 576, 960, 1344], [192, 576, 960, 1344], [192, 576, 960, 1344]], "states": ["idle", "walk", "thornShot", "legendVine"]}, {"file": "venomis-2", "height": 240, "rows": [0, 255, 500, 740, 1024], "cuts": [[0, 384, 768, 1152, 1536], [0, 365, 795, 1190, 1536], [0, 365, 775, 1200, 1536], [0, 384, 768, 1152, 1536]], "centers": [[192, 576, 960, 1344], [192, 576, 960, 1344], [192, 576, 960, 1344], [192, 576, 960, 1344]], "states": ["poisonPatch", "thornSweep", "vinePair", "vineField"]}, {"file": "venomis-3", "height": 335, "rows": [0, 362, 724, 1086], "cuts": [[0, 362, 724, 1086, 1448], [0, 362, 724, 1086, 1448], [0, 362, 724, 1086, 1448]], "centers": [[181, 543, 905, 1267], [181, 543, 905, 1267], [181, 543, 905, 1267]], "states": ["poisonFan", "hit", "defeat"]}]}, {"id": "atomdust", "name": "AtomDust", "phaseColors": ["#ffb44a", "#fff0a0"], "sheets": [{"file": "atomdust-1", "height": 240, "rows": [0, 256, 512, 768, 1024], "cuts": [[0, 384, 768, 1152, 1536], [0, 384, 768, 1152, 1536], [0, 384, 768, 1152, 1536], [0, 384, 768, 1152, 1536]], "centers": [[192, 576, 960, 1344], [192, 576, 960, 1344], [192, 576, 960, 1344], [192, 576, 960, 1344]], "states": ["idle", "walk", "atomicShot", "atomicPulse"]}, {"file": "atomdust-2", "height": 240, "rows": [0, 255, 535, 775, 1024], "cuts": [[0, 390, 750, 1190, 1536], [0, 384, 768, 1152, 1536], [0, 384, 768, 1152, 1536], [0, 390, 770, 1200, 1536]], "centers": [[192, 576, 960, 1344], [192, 576, 960, 1344], [192, 576, 960, 1344], [192, 576, 960, 1344]], "states": ["atomicRing", "radioactiveFall", "atomicStorm", "atomicVolley"]}, {"file": "atomdust-3", "height": 420, "rows": [0, 444, 887], "cuts": [[0, 444, 887, 1330, 1774], [0, 444, 887, 1330, 1774]], "centers": [[222, 665, 1109, 1552], [222, 665, 1109, 1552]], "states": ["hit", "defeat"]}]}];
const data={version:6,cell,anchor,referenceHeight,columns:4,bosses:{}};mkdirSync(root+'atlases',{recursive:true});
for(const spec of specs){const states=spec.sheets.flatMap(s=>s.states),out=new PNG({width:cell*4,height:cell*states.length});out.data.fill(0);const frames=[],sources=[];let rowOffset=0;
 for(const sheet of spec.sheets){const bytes=readFileSync(root+`source/batch6/${sheet.file}.png`),source=PNG.sync.read(bytes),scale=referenceHeight/sheet.height;sources.push({file:`source/batch6/${sheet.file}.png`,sha256:createHash('sha256').update(bytes).digest('hex')});
  for(let row=0;row<sheet.states.length;row++)for(let col=0;col<4;col++){
   const x0=sheet.cuts[row][col],x1=sheet.cuts[row][col+1],y0=sheet.rows[row],y1=sheet.rows[row+1],w=x1-x0,h=y1-y0,tile=new PNG({width:w,height:h});
   for(let y=0;y<h;y++)source.data.copy(tile.data,y*w*4,((y0+y)*source.width+x0)*4,((y0+y)*source.width+x1)*4);
   const seen=new Uint8Array(w*h),components=[];
   for(let seed=0;seed<w*h;seed++){if(seen[seed]||tile.data[seed*4+3]<130)continue;const queue=[seed];seen[seed]=1;
    for(let q=0;q<queue.length;q++){const n=queue[q],x=n%w,y=Math.floor(n/w);for(const z of [x>0?n-1:-1,x<w-1?n+1:-1,y>0?n-w:-1,y<h-1?n+w:-1])if(z>=0&&!seen[z]&&tile.data[z*4+3]>=130){seen[z]=1;queue.push(z);}}
    components.push(queue);
   }
   components.sort((a,b)=>b.length-a.length);if(!components[0])throw Error('Empty pose');const keep=new Uint8Array(w*h);for(const n of components[0])keep[n]=1;let frontier=components[0];
   for(let k=0;k<5;k++){const next=[];for(const n of frontier){const x=n%w,y=Math.floor(n/w);for(const z of [x>0?n-1:-1,x<w-1?n+1:-1,y>0?n-w:-1,y<h-1?n+w:-1])if(z>=0&&!keep[z]&&tile.data[z*4+3]>=8){keep[z]=1;next.push(z);}}frontier=next;}
   let bottom=0;for(let n=0;n<w*h;n++){if(!keep[n])tile.data[n*4+3]=0;else if(tile.data[n*4+3]>=130)bottom=Math.max(bottom,Math.floor(n/w));}
   if(sheet.feet?.[`${row}:${col}`]!==undefined)bottom=sheet.feet[`${row}:${col}`]-y0;
   const packed=PNG.sync.read(await sharp(PNG.sync.write(tile)).resize(Math.round(w*scale),Math.round(h*scale)).png().toBuffer()),dx=Math.round(anchor[0]-(sheet.centers[row][col]-x0)*scale),dy=Math.round(anchor[1]-bottom*scale),bounds=[cell,cell,0,0];let ink=0;
   for(let y=0;y<packed.height;y++)for(let x=0;x<packed.width;x++){const i=(y*packed.width+x)*4,a=packed.data[i+3];if(!a)continue;const tx=x+dx,ty=y+dy;if(tx<2||ty<2||tx>=cell-2||ty>=cell-2){if(a>24)throw Error(`Clipped ${spec.id}/${rowOffset+row}/${col} at ${tx},${ty}`);continue;}packed.data.copy(out.data,(((rowOffset+row)*cell+ty)*out.width+col*cell+tx)*4,i,i+4);ink++;if(a>24){bounds[0]=Math.min(bounds[0],tx);bounds[1]=Math.min(bounds[1],ty);bounds[2]=Math.max(bounds[2],tx);bounds[3]=Math.max(bounds[3],ty);}}
   frames.push({id:(rowOffset+row)*4+col,state:sheet.states[row],crop:[col*cell,(rowOffset+row)*cell,cell,cell],source:sheet.file,sourceRect:[x0,y0,w,h],sourceFoot:[sheet.centers[row][col],y0+bottom],bounds,nonzero:ink});
  }rowOffset+=sheet.states.length;
 }
 const bytes=PNG.sync.write(out),file=`royale/assets/boss-sprites/atlases/legendary-${spec.id}.png`;writeFileSync(root+`atlases/legendary-${spec.id}.png`,bytes);
 data.bosses[spec.id]={name:spec.name,design:spec.name,file,cell,columns:4,rows:states.length,anchor,referenceHeight,phaseColors:spec.phaseColors,states,frames,sources,sha256:createHash('sha256').update(bytes).digest('hex')};console.log(`${spec.name}: ${frames.length} RGBA poses, ${out.width}x${out.height}, no cell clipping`);
}
writeFileSync(root+'batch6-atlas-manifest.json',JSON.stringify(data,null,2)+'\n');writeFileSync(root+'batch6-atlas-data.mjs','// Generated by pack-boss-sprites-batch6.mjs\nexport const BATCH6_SPRITE_ATLASES = '+JSON.stringify(data,null,2)+';\n');
