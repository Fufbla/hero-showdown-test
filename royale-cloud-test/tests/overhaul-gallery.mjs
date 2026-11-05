import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {HAIR_CATALOG} from '../hair-catalog.mjs';
import {drawHero} from '../hero-art.mjs';
import {previewHero} from '../hero-rig.mjs';
import {prepareHeroMaterials} from '../hero-materials.mjs';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
await prepareHeroMaterials({imageLoader:u=>loadImage(fileURLToPath(u)),canvasFactory:createCanvas});
const out=new URL('../qa/world-ui/',import.meta.url),c=createCanvas(1680,1620),x=c.getContext('2d');x.fillStyle='#101e29';x.fillRect(0,0,c.width,c.height);x.fillStyle='#ecdcb5';x.font='bold 30px sans-serif';x.fillText('42 hairstyles · actual customized hero renderer',24,40);x.font='16px sans-serif';x.fillText('Front and back · stable save identifiers · shared colors for silhouette comparison',24,69);
for(let i=0;i<HAIR_CATALOG.length;i++){const s=HAIR_CATALOG[i],left=i%7*240,top=90+Math.floor(i/7)*250;x.fillStyle='#203640';x.fillRect(left+5,top,230,240);for(const [j,view] of ['front','back'].entries()){x.save();x.beginPath();x.rect(left+7,top+5,226,200);x.clip();drawHero(x,left+65+j*110,top+225,{hair:s.id,cape:false,hairColor:'#48332c',presentation:'female'},previewHero('idle',.2),.2,1.7,{view});x.restore();}x.fillStyle='#f2e2bd';x.font='14px sans-serif';x.fillText(s.name,left+12,top+226,220);}
writeFileSync(new URL('hairstyles-42.png',out),c.toBuffer('image/png'));
const b=createCanvas(1440,700),bc=b.getContext('2d');bc.fillStyle='#102530';bc.fillRect(0,0,1440,700);bc.fillStyle='#f3e5c5';bc.font='28px sans-serif';bc.fillText('Custom body presentations · same gameplay scale and combat',25,40);
for(let i=0;i<8;i++){const presentation=i<4?'male':'female',build=['slender','balanced','strong','full'][i%4],left=(i%4)*360,top=Math.floor(i/4)*320;drawHero(bc,left+180,top+320,{presentation,build,hair:i<4?'high-top':'long-locs',waist:i%2?1.1:.9,hips:i%2?1.1:.95,chest:i%2?1.1:.9},previewHero('idle',.2),.2,2,{view:'front'});bc.fillStyle='#f3e5c5';bc.font='16px sans-serif';bc.fillText(presentation+' · '+build,left+90,top+345);}
writeFileSync(new URL('body-presentations.png',out),b.toBuffer('image/png'));
console.log('Rendered 42 hairstyles and 8 body presentations');
