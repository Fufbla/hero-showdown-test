// Packs newly authored RGBA poses only. Never rebuilds regional boss assets.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),dep=n=>{try{return require(n);}catch{return require(require.resolve(n,{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));}};
const {PNG}=dep('pngjs'),sharp=dep('sharp'),root=fileURLToPath(new URL('../assets/boss-sprites/',import.meta.url));
const cell=512,anchor=[224,480],referenceHeight=224;
const specs=[
 {id:'lightning',name:'Lightning Spree',phaseColors:['#a5dfff','#fff4a3'],sheets:[
  {file:'lightning-3',height:440,rows:[0,512,1024],cuts:[[0,384,768,1152,1536],[0,384,768,1152,1536]],centers:[[195,580,965,1350],[195,580,965,1350]],states:['idle','walk']},
  {file:'lightning-1',height:280,rows:[585,913,1177,1448],cuts:[[0,272,555,820,1086],[0,260,515,860,1086],[0,260,515,865,1086]],centers:[[140,415,685,965],[130,390,640,970],[130,390,640,970]],states:['lightningStrike','crystalBeam','chainLightning']},
  {file:'lightning-2',height:310,rows:[0,340,663,965,1254],cuts:[[0,330,650,990,1254],[0,330,620,990,1254],[0,330,650,990,1254],[0,330,625,930,1254]],centers:[[180,495,810,1120],[180,495,810,1120],[180,495,810,1120],[180,480,780,1090]],states:['conductive','lightningStorm','hit','defeat']}]},
 {id:'air',name:'Air Pollution Monster',phaseColors:['#a6b9aa','#f0a34a'],sheets:[
  {file:'air-1',height:280,rows:[0,296,559,842,1126,1448],cuts:[[0,272,543,815,1086],[0,279,553,825,1086],[0,272,530,870,1086],[0,272,540,860,1086],[0,272,535,860,1086]],centers:[[135,405,675,950],[135,405,675,950],[135,405,675,965],[135,405,675,965],[135,405,675,965]],states:['idle','walk','smog','pollutionClaw','gust']},
  {file:'air-2',height:305,rows:[0,315,624,943,1254],cuts:[[0,310,600,970,1254],[0,310,630,965,1254],[0,310,665,970,1254],[0,310,620,960,1254]],centers:[[155,465,785,1110],[155,465,785,1110],[155,485,805,1110],[155,465,785,1110]],states:['cloud','smogTornado','hit','defeat']}]},
 {id:'styrodog',name:'Styrodog',phaseColors:['#d9e5ed','#ff8866'],sheets:[
  {file:'styrodog-1',height:270,rows:[0,297,578],cuts:[[0,270,540,815,1086],[0,270,545,825,1086]],centers:[[135,405,675,950],[135,405,675,950]],states:['idle','walk']},
  {file:'styrodog-3',height:330,rows:[0,480,887],cuts:[[0,440,825,1415,1774],[0,405,805,1415,1774]],centers:[[190,640,1115,1600],[185,620,1110,1590]],states:['beastClaw','lunge']},
  {file:'styrodog-1',height:270,rows:[1132,1448],cuts:[[0,270,540,825,1086]],centers:[[135,405,675,950]],states:['leap']},
  {file:'styrodog-2',height:280,rows:[0,320,603,869,1170,1448],cuts:[[0,270,575,825,1086],[0,270,540,860,1086],[0,270,540,870,1086],[0,270,540,825,1086],[0,270,510,805,1086]],centers:[[135,420,695,955],[135,405,675,955],[135,405,675,955],[135,405,675,955],[135,405,660,945]],states:['impact','beastCombo','beastCharge','hit','defeat']}]}
];
const data={version:4,cell,anchor,referenceHeight,columns:4,bosses:{}};mkdirSync(root+'atlases',{recursive:true});
for(const spec of specs){const states=spec.sheets.flatMap(s=>s.states),out=new PNG({width:cell*4,height:cell*states.length});out.data.fill(0);const frames=[],sources=[];let rowOffset=0;
 for(const sheet of spec.sheets){const bytes=readFileSync(root+`source/batch4/${sheet.file}.png`),source=PNG.sync.read(bytes),scale=referenceHeight/sheet.height;sources.push({file:`source/batch4/${sheet.file}.png`,sha256:createHash('sha256').update(bytes).digest('hex')});
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
   const packed=PNG.sync.read(await sharp(PNG.sync.write(tile)).resize(Math.round(w*scale),Math.round(h*scale)).png().toBuffer()),dx=Math.round(anchor[0]-(sheet.centers[row][col]-x0)*scale),dy=Math.round(anchor[1]-bottom*scale),bounds=[cell,cell,0,0];let ink=0;
   for(let y=0;y<packed.height;y++)for(let x=0;x<packed.width;x++){const i=(y*packed.width+x)*4,a=packed.data[i+3];if(!a)continue;const tx=x+dx,ty=y+dy;if(tx<2||ty<2||tx>=cell-2||ty>=cell-2){if(a>24)throw Error(`Clipped ${spec.id}/${rowOffset+row}/${col}`);continue;}packed.data.copy(out.data,(((rowOffset+row)*cell+ty)*out.width+col*cell+tx)*4,i,i+4);ink++;if(a>24){bounds[0]=Math.min(bounds[0],tx);bounds[1]=Math.min(bounds[1],ty);bounds[2]=Math.max(bounds[2],tx);bounds[3]=Math.max(bounds[3],ty);}}
   frames.push({id:(rowOffset+row)*4+col,state:sheet.states[row],crop:[col*cell,(rowOffset+row)*cell,cell,cell],source:sheet.file,sourceRect:[x0,y0,w,h],sourceFoot:[sheet.centers[row][col],y0+bottom],bounds,nonzero:ink});
  }rowOffset+=sheet.states.length;
 }
 const bytes=PNG.sync.write(out),file=`royale/assets/boss-sprites/atlases/legendary-${spec.id}.png`;writeFileSync(root+`atlases/legendary-${spec.id}.png`,bytes);
 data.bosses[spec.id]={name:spec.name,design:spec.name,file,cell,columns:4,rows:states.length,anchor,referenceHeight,phaseColors:spec.phaseColors,states,frames,sources,sha256:createHash('sha256').update(bytes).digest('hex')};console.log(`${spec.name}: ${frames.length} RGBA poses, ${out.width}x${out.height}, no cell clipping`);
}
writeFileSync(root+'batch4-atlas-manifest.json',JSON.stringify(data,null,2)+'\n');writeFileSync(root+'batch4-atlas-data.mjs','// Generated by pack-boss-sprites-batch4.mjs\nexport const BATCH4_SPRITE_ATLASES = '+JSON.stringify(data,null,2)+';\n');
