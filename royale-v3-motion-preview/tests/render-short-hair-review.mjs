import {createRequire} from 'node:module';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../style-c-hero.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {previewHero} from '../hero-rig.mjs';
import {SHORT_HAIR_REVIEW} from './original-face-fixtures.mjs';
import {originalFaceBaseline} from './original-face-baseline.mjs';
export const BEFORE_SHORT_HAIR='2a435a65444935e8b3524b008932a4ff8f4dc744';
const setup={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))};
await prepareStyleCMaterials(setup);const before=await originalFaceBaseline(setup,BEFORE_SHORT_HAIR);
const out=fileURLToPath(new URL('../qa/original-face-review/',import.meta.url));await mkdir(out,{recursive:true});
const views=['front','right','back','left'],names=['Front','Right','Back','Left'];
function sheet(w,h,title,sub){const canvas=createCanvas(w,h),c=canvas.getContext('2d');c.fillStyle='#123c39';c.fillRect(0,0,w,h);c.fillStyle='#f3e6b3';c.font='bold 26px sans-serif';c.fillText(title,25,40);c.font='16px sans-serif';c.fillStyle='#c8d6bf';c.fillText(sub,25,68);return[canvas,c];}
function head(c,renderer,look,view,x,y){const tile=createCanvas(600,700);renderer(tile.getContext('2d'),290,650,look,previewHero('idle',0),0,4,{view});c.drawImage(tile,120,180,300,260,x,y,270,234);}
{
 const[canvas,c]=sheet(1200,740,'Short hairstyle · reference fit','Original face and outfit · rounded crown, curved hairline and tapered temples');
 for(let row=0;row<2;row++){
  const y=100+row*310;c.fillStyle='#f3e6b3';c.font='bold 19px sans-serif';c.fillText(row?'AFTER · supplied-reference fit':'BEFORE · previous short cut',25,y);
  for(let v=0;v<4;v++){c.fillStyle='#c8d6bf';c.font='15px sans-serif';c.fillText(names[v],v*295+125,y+28);head(c,row?drawHero:before.drawHero,SHORT_HAIR_REVIEW,views[v],15+v*295,y+36);}
 }
 await writeFile(out+'short-hair-comparison.webp',canvas.toBuffer('image/webp',96));
}
{
 const[canvas,c]=sheet(1200,1300,'Short hairstyle · head-shape checks','Original male and female heads · light and dark skin · narrow and wide jaws');
 for(let row=0;row<4;row++){
  const sex=row%2?'male':'female',look={...styleCDefault(sex),hair:'buzz',skin:row<2?'#e99b83':'#34231e',hairColor:'#3e2048',jaw:row<2?.85:1.15};
  for(let v=0;v<4;v++){const y=110+row*295;c.fillStyle='#c8d6bf';c.font='15px sans-serif';c.fillText(`${sex} · ${names[v]} · jaw ${look.jaw}`,25+v*295,y);head(c,drawHero,look,views[v],15+v*295,y+8);}
 }
 await writeFile(out+'short-hair-variants.webp',canvas.toBuffer('image/webp',96));
}
{
 const[canvas,c]=sheet(1200,1010,'Short hairstyle · animation checks','Shared game renderer and head attachment · original face, outfit and cape');
 const poses=['idle','walk','run','jump','double-jump','fall','punch','kick','fireball','strength','superKick','flight'];
 for(let i=0;i<poses.length;i++){
  const x=i%4*300,y=95+Math.floor(i/4)*300,pose=poses[i];c.fillStyle='#e7dfbd';c.font='17px sans-serif';c.fillText(pose,x+90,y+15);
  drawHero(c,x+160,y+275,SHORT_HAIR_REVIEW,previewHero(pose,.18),.18,1.95,{view:'game',poseName:pose});
 }
 await writeFile(out+'short-hair-animation.webp',canvas.toBuffer('image/webp',96));
}
await before.close();console.log('Rendered short-hair comparison, four-view head-shape matrix and twelve animation poses.');
