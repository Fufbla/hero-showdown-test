import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {prepareStyleCMaterials} from '../../royale/style-c-materials.mjs';
import {drawHero} from '../../royale/style-c-hero.mjs';
import {styleCDefault} from '../../royale/style-c-defaults.mjs';
import {motionFrameSample} from '../../royale/style-c-motion.mjs';
const root=new URL('../../royale/cosmetics/',import.meta.url);
const out=new URL('../../docs/cosmetics/evidence/',import.meta.url);
await fs.mkdir(out,{recursive:true});
await prepareStyleCMaterials({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))});
const catalog=JSON.parse(await fs.readFile(new URL('catalog.json',root)));
const ready=catalog.sets.filter(s=>s.pieces.every(p=>p.assetManifest));
const atlas=new Map();
const motion=process.argv.find(a=>a.startsWith('--motion='))?.split('=')[1]||'idle';
const hair=process.argv.find(a=>a.startsWith('--hair='))?.split('=')[1];
let count=0;
for(let page=0;page<Math.ceil(ready.length/6);page++){
 const sets=ready.slice(page*6,page*6+6),canvas=createCanvas(1000,sets.length*260+45),c=canvas.getContext('2d');
 c.fillStyle='#153839';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#ffe6aa';c.font='bold 22px sans-serif';c.fillText('Wardrobe fitting · 700 coins per complete outfit · '+motion,20,30);
 for(const [row,set]of sets.entries()){
  const clothing=[];
  for(const piece of set.pieces){
   const manifest=JSON.parse(await fs.readFile(new URL(piece.assetManifest,root)));
   if(!atlas.has(manifest.atlas.url))atlas.set(manifest.atlas.url,await loadImage(fileURLToPath(new URL(manifest.atlas.url,root))));
   clothing.push({manifest,image:atlas.get(manifest.atlas.url)});
  }
  const {hero,time,options}=motionFrameSample(motion,motion==='idle'?0:2);
  for(const [col,view]of ['front','right','back','left'].entries()){
   const x=125+250*col,y=285+row*260;c.font='15px sans-serif';c.fillStyle='#f8e8ba';c.textAlign='center';c.fillText(set.name+' · '+view,x,y-215);
   const look={...styleCDefault('female'),cape:false};if(hair)look.hair=hair;
   drawHero(c,x,y,look,hero,time,1.8,{...options,view,clothing});count++;
  }
 }
 const name='collection-'+motion+(hair?'-'+hair:'')+'-'+(page+1)+'.webp';
 await fs.writeFile(new URL(name,out),canvas.toBuffer('image/webp',94));
 console.log(name);
}
console.log(`${count} actual hero views from ${ready.length} outfits.`);
