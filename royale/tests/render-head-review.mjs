// Development review only. Uses the same drawHero entry point as the game.
import {createRequire} from 'node:module';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {writeFile,mkdir,readdir,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../style-c-hero.mjs';
import {previewHero} from '../hero-rig.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {HAIR_STYLES} from '../appearance.mjs';
const stage=process.argv[2]||'after';
if(!['before','after'].includes(stage))throw Error('Use before or after as the review stage.');
const out=fileURLToPath(new URL('../qa/head-rebuild/',import.meta.url));
await mkdir(out,{recursive:true});
if(stage==='before'&&await access(`${out}/before-heads-1.webp`).then(()=>true,()=>false))throw Error('The release baseline is already captured; do not overwrite it with development artwork.');
if(!await prepareStyleCMaterials({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))}))throw Error('Hero artwork not ready');
const views=['front','side','back','left'],labels=['Front','Right','Back','Left'];
import {REVIEW_LOOKS} from './head-review-fixtures.mjs';

function base(w,h,title){const canvas=createCanvas(w,h),c=canvas.getContext('2d');c.fillStyle='#102f32';c.fillRect(0,0,w,h);c.fillStyle='#f4e7b1';c.font='bold 23px sans-serif';c.fillText(title,24,34);return [canvas,c];}
function label(c,s,x,y){c.fillStyle='#c1d5c6';c.font='15px sans-serif';c.fillText(s,x,y);}
function head(c,look,view,x,y,size=185,pose='idle',time=0){
 const tile=createCanvas(540,620),tc=tile.getContext('2d');
 drawHero(tc,275,565,look,previewHero(pose,time),time,4,{view,poseName:pose});
 // Fixed camera framing, identical before/after. No altered game pixels.
 c.drawImage(tile,105,100,340,320,x,y,size,size*320/340);
}
for(let page=0;page<2;page++){
 const [canvas,c]=base(1000,1000,`${stage.toUpperCase()} · Style C head rebuild · ${page+1}/2`);
 for(let row=0;row<4;row++){const look=REVIEW_LOOKS[page*4+row];label(c,look.name,24,85+row*225);for(let v=0;v<4;v++){const x=205+v*195,y=65+row*225;label(c,labels[v],x+65,y);head(c,look,views[v],x,y+9,185);}}
 await writeFile(`${out}/${stage}-heads-${page+1}.png`,canvas.toBuffer('image/png'));
}
// Every hairstyle is inspected against the same skull, in every direction.
const styles=[...new Set(HAIR_STYLES)].filter(x=>x!=='none');
for(const sex of ['female','male'])for(let page=0;page<Math.ceil(styles.length/12);page++){
 const [canvas,c]=base(930,12*152+65,`${stage.toUpperCase()} · ${sex} · all hair directions · ${page+1}`);
 for(let row=0;row<12;row++){const hair=styles[page*12+row];if(!hair)break;const look={...styleCDefault(sex),hair,skin:'#bd7955'};label(c,hair,12,110+row*152);for(let v=0;v<4;v++){const x=170+v*186,y=55+row*152;head(c,look,views[v],x,y,155);}}
 await writeFile(`${out}/${stage}-hair-${sex}-${page+1}.png`,canvas.toBuffer('image/png'));
}
const [canvas,c]=base(1200,620,`${stage.toUpperCase()} · Full character · original body and costume art`);
for(let i=0;i<4;i++){const l=REVIEW_LOOKS[i];drawHero(c,150+i*300,555,l,previewHero('idle',0),0,3.6,{view:'front'});label(c,l.name,25+i*300,595);}
await writeFile(`${out}/${stage}-characters.png`,canvas.toBuffer('image/png'));
console.log(`Rendered ${stage} heads and all ${styles.length} hairstyles in four views for both presentations.`);

// Review delivery uses compact high-quality WebP; originals remain local captures.
for(const file of await readdir(out))if(file.startsWith(stage+'-')&&file.endsWith('.png')){
 const im=await loadImage(`${out}/${file}`),canvas=createCanvas(im.width,im.height);canvas.getContext('2d').drawImage(im,0,0);
 await writeFile(`${out}/${file.replace('.png','.webp')}`,canvas.toBuffer('image/webp',94));
}
if(stage==='after'){
 const baseline=await access(`${out}/before-heads-1.png`).then(()=>`${out}/before-heads-1.png`,()=>`${out}/before-heads-1.webp`);
 const before=await loadImage(baseline),after=await loadImage(`${out}/after-heads-1.png`);
 const canvas=createCanvas(1120,1160),c=canvas.getContext('2d');c.fillStyle='#102f32';c.fillRect(0,0,1120,1160);c.fillStyle='#f4e7b1';c.font='bold 26px sans-serif';c.fillText('Style C · Head & hair review',26,38);c.font='16px sans-serif';c.fillStyle='#c1d5c6';c.fillText('Original selections and approved hair artwork · Front / Right / Back / Left',26,65);
 for(let row=0;row<2;row++){
  const top=100+row*510;c.fillStyle='#f4e7b1';c.font='bold 20px sans-serif';c.fillText(row?'Short hairstyle from your screenshot':'Pale skin · curly ponytail from your screenshot',26,top);
  for(let state=0;state<2;state++){
   const y=top+25+state*222;c.fillStyle='#c1d5c6';c.font='bold 17px sans-serif';c.fillText(state?'AFTER':'BEFORE',26,y+110);
   c.drawImage(state?after:before,200,65+row*225,790,205,145,y,948,205*1.2);
  }
 }
 await writeFile(`${out}/comparison-screenshots.webp`,canvas.toBuffer('image/webp',95));
}
