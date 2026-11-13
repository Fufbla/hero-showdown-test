import {createCanvas,loadImage} from '@napi-rs/canvas';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {StarterSuitEngine} from '../engine.mjs';
import {DEFAULT_LOOK} from '../../../royale/appearance.mjs';
export {createCanvas};
export const factory=(w,h)=>createCanvas(w,h);
export const imageLoader=url=>loadImage(fileURLToPath(url));
export const jsonLoader=async url=>JSON.parse(await readFile(url,'utf8'));
export async function engine(){const e=new StarterSuitEngine({canvasFactory:factory,imageLoader,jsonLoader});if(!await e.preload())throw Error(e.error);return e;}
export const hero=(extra={})=>({face:1,grounded:true,vx:0,vy:0,jumps:0,jumpAge:100,respawnAge:10,landing:0,stun:0,dead:false,invulnerable:0,castAge:100,...extra});
export const examples=[
 {...DEFAULT_LOOK,name:'Demo A',presentation:'male',hair:'waves',skin:'#b4774b',suit:'#2445af',trim:'#ffc044',emblem:'star',emblemColor:'#ffffff',cape:true,capeColor:'#a10d35'},
 {...DEFAULT_LOOK,name:'Demo B',presentation:'male',hair:'curls',skin:'#945330',suit:'#c72036',trim:'#252525',emblem:'bolt',emblemColor:'#ffd44d',cape:false,capeColor:'#004444'},
 {...DEFAULT_LOOK,name:'Demo C',presentation:'female',hair:'braids',skin:'#59352e',suit:'#087c54',trim:'#ffe7be',emblem:'leaf',emblemColor:'#ffd44d',cape:true,capeColor:'#652183'},
 {...DEFAULT_LOOK,name:'Demo D',presentation:'female',hair:'short',hairColor:'#a54427',skin:'#dba780',suit:'#792899',trim:'#00625c',emblem:'shield',emblemColor:'#ffffff',cape:true,capeColor:'#00c4bd'}
];
