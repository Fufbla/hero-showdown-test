import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {EnvironmentArt} from '../environment-art.mjs';
import {EnvironmentArt as Before} from './overhaul-before-environment.mjs';
import {WORLD_REGIONS,regionSurfaces} from '../world.mjs';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
const out=new URL('../qa/overhaul/',import.meta.url);mkdirSync(out,{recursive:true});
for(const r of WORLD_REGIONS){for(const [name,Type] of [['before',Before],['after',EnvironmentArt]]){const canvas=createCanvas(1280,720),c=canvas.getContext('2d'),art=new Type();art.sky(c,r,1280,720,0,0,3,false);for(const s of regionSurfaces(r.id).filter(s=>s.x<1280))art.surface(c,s,r);c.fillStyle='#10212ee8';c.fillRect(15,15,475,44);c.fillStyle='#ffe8b8';c.font='bold 22px sans-serif';c.fillText(r.name+' · '+name,28,44);writeFileSync(new URL(`region-${r.id}-${name}.png`,out),canvas.toBuffer('image/png'));}}
const canvas=createCanvas(1400,1010),c=canvas.getContext('2d');c.fillStyle='#142632';c.fillRect(0,0,1400,1010);for(const [i,r] of WORLD_REGIONS.entries()){const art=new EnvironmentArt();c.save();c.translate(i%2*700,Math.floor(i/2)*250);c.fillStyle='#f3e6c2';c.font='20px sans-serif';c.fillText(r.name,20,30);for(const [j,kind] of (r.id===1?['grass','sand','wood']:r.id===3?['factory','metal','wood']:r.id===7?['final','metal']:['wood',r.theme]).entries())art.surface(c,{x:20+j*220,y:95,w:195,h:28,kind,oneWay:true},r);c.restore();}writeFileSync(new URL('terrain-materials.png',out),canvas.toBuffer('image/png'));
console.log('Rendered before/after seven regions and terrain gallery from actual draw code.');
