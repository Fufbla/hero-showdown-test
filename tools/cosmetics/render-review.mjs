import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {prepareStyleCMaterials} from '../../royale/style-c-materials.mjs';
import {drawHero} from '../../royale/style-c-hero.mjs';
import {styleCDefault} from '../../royale/style-c-defaults.mjs';
import {motionFrameSample} from '../../royale/style-c-motion.mjs';
const out=new URL('../../docs/cosmetics/evidence/',import.meta.url);await fs.mkdir(out,{recursive:true});
await prepareStyleCMaterials({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))});
const atlas=await loadImage(fileURLToPath(new URL('../../royale/cosmetics/assets/royal-kimono/atlas.png',import.meta.url)));
const clothing=await Promise.all(['fullbody','footwear','headwear'].map(async part=>({image:atlas,manifest:JSON.parse(await fs.readFile(new URL('../../royale/cosmetics/assets/royal-kimono/'+part+'.json',import.meta.url)))})));
for(const sex of ['male','female']){
 const canvas=createCanvas(1200,2100),c=canvas.getContext('2d');c.fillStyle='#143638';c.fillRect(0,0,1200,2100);c.fillStyle='#f7e4a8';c.font='bold 26px sans-serif';c.fillText('Royal Kimono · shared body · '+sex,25,40);
 for(const [row,[motion,key]]of [['idle',0],['run',2],['jump',2],['punch',2],['kick',2],['fireball',2]].entries()){
  const {hero,time,options}=motionFrameSample(motion,key);
  for(const [col,view]of ['front','right','back','left'].entries()){
   const x=145+300*col,y=360+row*340;c.font='16px sans-serif';c.fillStyle='#dfe1bd';c.textAlign='center';c.fillText(motion+' · '+view,x,y-290);
   drawHero(c,x,y,{...styleCDefault(sex),cape:false},hero,time,2,{...options,view,clothing});
  }
 }
 await fs.writeFile(new URL('kimono-'+sex+'-motions.webp',out),canvas.toBuffer('image/webp',93));
}
console.log('Rendered 48 fixed-key views from the actual universal clothing renderer.');
