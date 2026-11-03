// Approval evidence only: the game's public renderer, no replacement artwork.
import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {drawHero,configureStyleC} from '../style-c-hero.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {previewHero} from '../style-c-rig.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const out=new URL('../qa/style-c/emergency/',import.meta.url);mkdirSync(out,{recursive:true});
configureStyleC({makeCanvas:createCanvas});
await prepareStyleCMaterials({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))});
const ref=await loadImage(fileURLToPath(new URL('../assets/hero/style-c-accurate/reference.jpeg',import.meta.url)));
const figures=['male','female'].map((sex,i)=>{const c=createCanvas(1536,864);drawHero(c.getContext('2d'),i?940:632,590,styleCDefault(sex),previewHero('idle',.2),.2,1/.35,{view:'front'});return c;});
const title=(c,t,x,y,size=18)=>{c.fillStyle='#18353c';c.font=`${size>=24?'bold ':''}${size}px sans-serif`;c.fillText(t,x,y);};
function board(w,h,name,note){const c=createCanvas(w,h),ctx=c.getContext('2d');ctx.fillStyle='#e8ebdf';ctx.fillRect(0,0,w,h);title(ctx,name,28,42,28);title(ctx,note,28,70,15);return [c,ctx];}
function save(name,c){writeFileSync(new URL(name+'.png',out),c.toBuffer('image/png'));}
const full=[[435,250,289,345],[778,250,246,345]],labels=['Original male','In-game male','Original female','In-game female'];
const [comparison,c]=board(1440,550,'STYLE C / DEFAULT APPEARANCE CHECKPOINT','Same source scale and viewing angle. In-game columns are drawn by the public hero renderer.');
for(let i=0;i<4;i++){const sex=i<2?0:1,b=full[sex],k=1.08,x=360*i+(360-b[2]*k)/2;title(c,labels[i],360*i+28,112,20);c.drawImage(i%2?figures[sex]:ref,...b,x,143,b[2]*k,b[3]*k);}
save('reference-comparison',comparison);
const regions=[
 ['Faces',[[570,335,125,95],[877,330,130,112]]],
 ['Hair',[[522,252,185,125],[780,252,244,220]]],
 ['Torso and armor',[[576,412,109,104],[884,426,100,86]]],
 ['Arms and hands',[[549,427,172,88],[869,429,151,86]]],
 ['Legs and boots',[[547,489,160,104],[878,492,132,101]]],
 ['Capes',[[437,418,196,154],[780,441,159,138]]],
];
const [details,d]=board(1440,1660,'REFERENCE / IN-GAME CLOSE-UPS','Visible pixels are retained from the reference. Background removal is not a new drawing.');
labels.forEach((l,i)=>title(d,l,i*360+28,112,20));
regions.forEach(([name,boxes],row)=>{const y=135+row*251;title(d,name,28,y+20,20);for(let i=0;i<4;i++){const sex=i<2?0:1,b=boxes[sex],k=Math.min(320/b[2],192/b[3]),x=i*360+(360-b[2]*k)/2;d.drawImage(i%2?figures[sex]:ref,...b,x,y+36,b[2]*k,b[3]*k);}});save('closeups',details);
for(let i=0;i<2;i++){const b=full[i],sprite=createCanvas(b[2],b[3]);sprite.getContext('2d').drawImage(figures[i],...b,0,0,b[2],b[3]);save((i?'female':'male')+'-default',sprite);}
console.log('Static reference comparison, six detail rows and default sprite exports created. No animation generated.');
