import {createCanvas,loadImage} from '@napi-rs/canvas';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {CostumeEngine} from '../engine.mjs';
import {FASHION_OUTFITS} from '../definitions.mjs';
import {DEFAULT_LOOK} from '../../appearance.mjs';
export {createCanvas,FASHION_OUTFITS};
export const look={...DEFAULT_LOOK,presentation:'female',skin:'#b4774b',hair:'braids',hairColor:'#291c20',facialHair:'none'};
export const options={canvasFactory:createCanvas,imageLoader:url=>loadImage(fileURLToPath(url)),jsonLoader:async url=>JSON.parse(await readFile(url,'utf8'))};
export async function engine(){const e=new CostumeEngine(options);for(const o of FASHION_OUTFITS)if(!await e.preload(o.id))throw Error(o.id+': '+e.error);return e;}
export const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
