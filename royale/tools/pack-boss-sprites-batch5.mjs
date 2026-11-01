// Packs newly authored RGBA poses only. Never rebuilds regional boss assets.
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),dep=n=>{try{return require(n);}catch{return require(require.resolve(n,{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'']}));}};
const {PNG}=dep('pngjs'),sharp=dep('sharp'),root=fileURLToPath(new URL('../assets/boss-sprites/',import.meta.url));
const cell=512,anchor=[224,480],referenceHeight=224;
const specs=[
{id:'sonic',name:'Sonic Tusk',phaseColors:['#70cfff','#dbb4ff'],sheets:[
{file:'sonic-1',height:235,rows:[0,260,510,752,1024],cuts:[[0,384,768,1160,1536],[0,384,768,1160,1536],[0,384,740,1170,1536],[0,390,748,1180,1536]],centers:[[170,555,940,1325],[170,555,940,1325],[170,555,940,1325],[170,555,940,1325]],states:['idle','walk','sonicShot','tuskStrike']},
{file:'sonic-2',height:220,rows:[0,345,610,910,1254],cuts:[[0,315,615,975,1254],[0,330,645,965,1254],[0,310,615,975,1254],[0,330,615,975,1254]],centers:[[145,455,765,1080],[145,455,765,1080],[145,455,765,1080],[145,455,765,1080]],states:['sonicRing','tuskCharge','sonicOverlap','tuskCombo']},
{file:'sonic-3',height:330,rows:[0,480,887],cuts:[[0,455,890,1345,1774],[0,440,890,1320,1774]],centers:[[195,640,1085,1530],[195,640,1085,1530]],states:['hit','defeat']}]},
{id:'styro',name:'Dr. Styro',phaseColors:['#b6e5f0','#a7ff88'],sheets:[
{file:'styro-1',height:305,rows:[0,319,635,930,1254],cuts:[[0,315,630,955,1254],[0,320,635,955,1254],[0,330,635,980,1254],[0,315,615,995,1254]],centers:[[155,475,795,1120],[155,475,795,1120],[155,475,795,1120],[155,475,795,1120]],states:['idle','walk','styroBounce','styroShot']},
{file:'styro-2',height:305,rows:[0,317,634,942,1254],cuts:[[0,315,640,985,1254],[0,315,640,975,1254],[0,315,640,975,1254],[0,315,640,1007,1254]],centers:[[155,475,795,1120],[155,475,795,1120],[155,475,795,1120],[155,475,795,1120]],states:['styroWall','machineTrap','machinery','styroVolley']},
{file:'styro-3',height:420,rows:[0,475,887],cuts:[[0,440,900,1340,1774],[0,430,850,1300,1774]],centers:[[225,670,1120,1570],[225,670,1080,1530]],states:['hit','defeat']}]},
{id:'wastelander',name:'Wastelander',phaseColors:['#d9ca72','#b6ed60'],sheets:[
{file:'wastelander-1',height:250,rows:[0,264,519,767,1024],cuts:[[0,384,768,1170,1536],[0,384,768,1170,1536],[0,384,768,1170,1536],[0,384,768,1190,1536]],centers:[[205,580,960,1340],[205,580,960,1340],[205,580,960,1340],[205,580,960,1340]],states:['idle','walk','legendPunch','toxicShot']},
{file:'wastelander-2',height:240,feet:{'0:2':256,'1:2':520,'2:2':760},rows:[0,270,532,770,1024],cuts:[[0,384,710,1220,1536],[0,384,740,1200,1536],[0,384,755,1200,1536],[0,384,710,1230,1536]],centers:[[185,560,915,1365],[185,560,915,1365],[185,560,915,1365],[185,560,935,1365]],states:['toxicRing','legendSlam','toxicGround','toxicCombo']},
{file:'wastelander-3',height:395,rows:[0,460,887],cuts:[[0,435,895,1345,1774],[0,435,830,1285,1774]],centers:[[225,670,1120,1570],[225,650,1055,1520]],states:['hit','defeat']}]}
];
const data={version:5,cell,anchor,referenceHeight,columns:4,bosses:{}};mkdirSync(root+'atlases',{recursive:true});
for(const spec of specs){const states=spec.sheets.flatMap(s=>s.states),out=new PNG({width:cell*4,height:cell*states.length});out.data.fill(0);const frames=[],sources=[];let rowOffset=0;
 for(const sheet of spec.sheets){const bytes=readFileSync(root+`source/batch5/${sheet.file}.png`),source=PNG.sync.read(bytes),scale=referenceHeight/sheet.height;sources.push({file:`source/batch5/${sheet.file}.png`,sha256:createHash('sha256').update(bytes).digest('hex')});
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
writeFileSync(root+'batch5-atlas-manifest.json',JSON.stringify(data,null,2)+'\n');writeFileSync(root+'batch5-atlas-data.mjs','// Generated by pack-boss-sprites-batch5.mjs\nexport const BATCH5_SPRITE_ATLASES = '+JSON.stringify(data,null,2)+';\n');
