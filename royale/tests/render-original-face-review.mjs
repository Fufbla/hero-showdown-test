import {createRequire} from 'node:module';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../style-c-hero.mjs';
import {drawStyleCFace} from '../style-c-face.mjs';
import {previewHero} from '../hero-rig.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {REVIEW_LOOKS} from './original-face-fixtures.mjs';
import {originalFaceBaseline} from './original-face-baseline.mjs';
const setup={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))};
await prepareStyleCMaterials(setup);const before=await originalFaceBaseline(setup);
const out=fileURLToPath(new URL('../qa/original-face-review/',import.meta.url));await mkdir(out,{recursive:true});
function sheet(w,h,title,subtitle){const canvas=createCanvas(w,h),c=canvas.getContext('2d');c.fillStyle='#102f32';c.fillRect(0,0,w,h);c.fillStyle='#f4e7b1';c.font='bold 26px sans-serif';c.fillText(title,25,38);c.font='16px sans-serif';c.fillStyle='#bdd0bd';c.fillText(subtitle,25,66);return [canvas,c];}
function head(c,renderer,look,view,x,y,size=205){const tile=createCanvas(540,620),tc=tile.getContext('2d');renderer(tc,275,565,look,previewHero('idle',0),0,4,{view});c.drawImage(tile,105,100,340,320,x,y,size,size*320/340);}
const directions=['front','side','back','left'],labels=['Front','Right','Back','Left'];
{
 const [canvas,c]=sheet(1120,1120,'Original faces retained · color correction review','Same original artwork, eye shapes, facial proportions and hair · all four directions');
 for(let row=0;row<2;row++){
  const top=100+row*495;c.fillStyle='#f4e7b1';c.font='bold 20px sans-serif';c.fillText(row?'Short hairstyle from your screenshot':'Pale skin · original curly ponytail',25,top);
  for(let state=0;state<2;state++)for(let v=0;v<4;v++){
   const y=top+25+state*215,x=160+v*233;c.fillStyle='#bdd0bd';c.font='15px sans-serif';if(!state)c.fillText(labels[v],x+75,y);
   if(!v){c.font='bold 17px sans-serif';c.fillText(state?'CORRECTED':'ORIGINAL',25,y+110);}
   head(c,state?drawHero:before.drawHero,REVIEW_LOOKS[row],directions[v],x,y+10,220);
  }
 }
 await writeFile(out+'comparison.webp',canvas.toBuffer('image/webp',96));
}
{
 const [canvas,c]=sheet(1020,1020,'Original facial artwork · customization','Pale complexion reveals any remaining default-color feature outlines');
 let n=0;
 for(const [name,changes]of Object.entries({Original:{},'Soft eyebrows':{brows:'soft'},'Straight eyebrows':{brows:'straight'},Smile:{mouth:'smile'},'Full lips':{mouth:'full'},'Round eyes':{eyeShape:'round'}})){
  const tile=createCanvas(500,500),tc=tile.getContext('2d');tc.translate(250,250);tc.scale(2,2);drawStyleCFace(tc,{...styleCDefault('female'),skin:'#eee7e1',...changes},{center:[0,0],mode:'native-head'});
  const x=n%3*340,y=100+Math.floor(n/3)*440;c.drawImage(tile,135,90,250,290,x,y,340,394);c.fillStyle='#e3d8b4';c.font='19px sans-serif';c.fillText(name,x+65,y+425);n++;
 }
 await writeFile(out+'facial-selections.webp',canvas.toBuffer('image/webp',96));
}
for(let page=0;page<2;page++){
 const [canvas,c]=sheet(1120,1100,'Original Style C faces · additional examples','Male and female · skin tones, facial features and hairstyles');
 for(let row=0;row<4;row++){
  const look=REVIEW_LOOKS[page*4+row];c.fillStyle='#d2dfc5';c.font='16px sans-serif';c.fillText(look.name,18,140+row*235);
  for(let v=0;v<4;v++)head(c,drawHero,look,directions[v],190+v*230,95+row*235,210);
 }
 await writeFile(out+`examples-${page+1}.webp`,canvas.toBuffer('image/webp',95));
}
await before.close();console.log('Rendered original-art comparison, feature selections and both presentation galleries.');
