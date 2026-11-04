import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdirSync,writeFileSync} from 'node:fs';
import {drawHero,configureStyleC} from '../style-c-hero.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {prepareHeroMaterials} from '../hero-materials.mjs';
import {previewHero} from '../style-c-rig.mjs';
import {HAIR_STYLES} from '../appearance.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {EQUIPMENT} from '../equipment.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
configureStyleC({makeCanvas:createCanvas});
const options={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))};
await prepareStyleCMaterials(options);await prepareHeroMaterials(options);
const out=process.argv[2]||'/workspace/scratch/71f90ede301a/cleanup-fit-before';mkdirSync(out,{recursive:true});
const groups=[['hair',HAIR_STYLES],['helmet',Object.values(EQUIPMENT).filter(x=>x.part==='helmet')]];
for(const [kind,items] of groups)for(const sex of ['male','female'])for(let start=0;start<items.length;start+=12){
 const canvas=createCanvas(1440,Math.ceil(Math.min(12,items.length-start)/3)*320),c=canvas.getContext('2d');c.fillStyle='#dee8e5';c.fillRect(0,0,canvas.width,canvas.height);
 for(let j=start;j<Math.min(start+12,items.length);j++){
  const x=(j-start)%3*480,y=Math.floor((j-start)/3)*320,item=items[j];
  const look={...styleCDefault(sex),hair:kind==='hair'?item:'cornrows',cape:false};
  const outfit=kind==='helmet'?{pieces:{helmet:item,mask:item}}:undefined;
  for(const [i,view] of ['front','side','back','left'].entries())drawHero(c,x+i*116+58,y+270,look,previewHero('idle',0),0,1.6,{view,outfit,layered:true});
  c.fillStyle='#19303c';c.font='13px sans-serif';c.fillText(typeof item==='string'?item:item.name,x+8,y+307);
 }
 writeFileSync(`${out}/${kind}-${sex}-${start}.jpg`,canvas.toBuffer('image/jpeg',85));
}
console.log(JSON.stringify({hair:HAIR_STYLES.length,helmets:groups[1][1].length,out}));
