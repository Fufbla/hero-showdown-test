import {createCanvas,loadImage} from '@napi-rs/canvas';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {UniversalHead} from '../../royale/customization/head.mjs';
import {NEW_HAIR,NEW_FEATURES} from '../../royale/customization/catalog.mjs';
import {DEFAULT_LOOK} from '../../royale/appearance.mjs';
import {CostumeEngine} from '../../royale-v3-staging/costumes/engine.mjs';
const options={canvasFactory:createCanvas,imageLoader:url=>loadImage(fileURLToPath(url)),jsonLoader:async url=>JSON.parse(await readFile(url,'utf8'))};
const head=new UniversalHead(options);await head.preload();
const dir=new URL('../../review/customization/',import.meta.url);await mkdir(dir,{recursive:true});
function tile(c,p,x,y,label){c.fillStyle='#f7f5ed';c.fillRect(x,y,230,260);c.drawImage(p.image,60,0,400,440,x+5,y,220,220);c.fillStyle='#172332';c.font='14px sans-serif';c.textAlign='center';c.fillText(label,x+115,y+246,220);}
for(const presentation of ['male','female']){const out=createCanvas(1150,1040),c=out.getContext('2d');NEW_HAIR.filter(h=>h.presentation===presentation).forEach((h,i)=>tile(c,head.plate({...DEFAULT_LOOK,hair:h.id,presentation}),i%5*230,Math.floor(i/5)*260,h.name));await writeFile(new URL(presentation+'-hair.png',dir),out.toBuffer('image/png'));}
for(const [key,choices]of Object.entries(NEW_FEATURES)){const out=createCanvas(920,Math.ceil(choices.length/4)*260),c=out.getContext('2d');choices.forEach((f,i)=>tile(c,head.plate({...DEFAULT_LOOK,hair:'none',[key]:f.id}),i%4*230,Math.floor(i/4)*260,f.name));await writeFile(new URL(key+'.png',dir),out.toBuffer('image/png'));}
const e=new CostumeEngine(options);for(const id of ['zombie-costume','black-business-suit','white-business-suit']){if(!await e.preload(id))throw Error(e.error);const out=createCanvas(1536,512),c=out.getContext('2d');c.fillStyle='#f7f5ed';c.fillRect(0,0,out.width,out.height);for(let i=0;i<6;i++){const f=[0,9,17,24,31,37][i],look={...DEFAULT_LOOK,hair:i%2?'f14-long-locs':'none',facialHair:i%2?'none':'h04-full-beard'};c.drawImage(e.compose(id,f,look),i*256,0,256,256);c.drawImage(e.compose(id,f,{...look,hair:'m01-buzz-cut',facialHair:'none'}),i*256,256,256,256);}await writeFile(new URL(id+'.png',dir),out.toBuffer('image/png'));}
console.log(fileURLToPath(dir));
