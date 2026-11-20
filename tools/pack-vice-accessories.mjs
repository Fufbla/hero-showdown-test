// Deterministic extraction of image_gen-authored cutouts. No artwork is drawn here.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
let sharp;
try{sharp=require('sharp');}catch{sharp=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'','sharp'));}
const source=path.join(root,'test-only/four-powers/vice-source/accessory-source.png');
const out=path.join(root,'test-only/four-powers/vice/assets');
const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
await mkdir(out,{recursive:true});
const report={source:path.relative(root,source),sourceSha256:createHash('sha256').update(await readFile(source)).digest('hex'),sourceSize:[info.width,info.height],assets:{}};
for(const [name,top,bottom] of [['cap',0,650],['glasses',650,1060],['lettering',1060,info.height]]){
 let x0=info.width,y0=bottom,x1=-1,y1=-1,visible=0;
 for(let y=top;y<bottom;y++)for(let x=0;x<info.width;x++){
  if(data[(y*info.width+x)*4+3]<8)continue;
  x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);visible++;
 }
 if(visible<100||x1<x0||y1<y0)throw Error('Missing authored accessory: '+name);
 const left=Math.max(0,x0-2),upper=Math.max(top,y0-2),right=Math.min(info.width,x1+3),lower=Math.min(bottom,y1+3);
 const rect={left,top:upper,width:right-left,height:lower-upper};
 const filename=path.join(out,name+'.png');
 await sharp(source).extract(rect).png().toFile(filename);
 report.assets[name]={rect,visiblePixels:visible,sha256:createHash('sha256').update(await readFile(filename)).digest('hex')};
}
await writeFile(path.join(root,'test-only/four-powers/vice-source/accessory-registration.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
