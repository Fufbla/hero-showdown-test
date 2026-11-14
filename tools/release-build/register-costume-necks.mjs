import {createCanvas,loadImage} from '@napi-rs/canvas';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {CostumeEngine} from '../../royale-v3-staging/costumes/engine.mjs';
const e=new CostumeEngine({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u,'utf8'))});
for(const id of ['zombie-costume','black-business-suit','white-business-suit']){
 if(!await e.preload(id))throw Error(e.error);const m=e.outfits.get(id).manifest,deltas=[];
 for(let i=0;i<m.frames.length;i++){
  const f=m.frames[i],body=e.masks(id,i).body,d=body.getContext('2d').getImageData(0,0,256,256).data,x=Math.round(f.head[0]);let top=null;
  for(let y=Math.floor(f.head[1]-10);y<f.head[1]+20;y++){
   let n=0;for(let dx=-2;dx<=2;dx++)if(d[(y*256+x+dx)*4+3]>160)n++;
   if(n>=3){top=y;break;}
  }
  if(top===null)throw Error(id+' neck missing '+i);
  f.faceAnchor=[f.head[0],top+3,f.head[2]];deltas.push(f.faceAnchor[1]-f.head[1]);
 }
 await writeFile(new URL('../../royale-v3-staging/costumes/assets/'+id+'/manifest.json',import.meta.url),JSON.stringify(m,null,2)+'\n');
 console.log(id,'anchor corrections',Math.min(...deltas),Math.max(...deltas));
}
