import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {IllustratedEnvironment,paintingPlacement,ENVIRONMENT_THEMES} from '../environment-paintings.mjs';
import {EnvironmentArt} from '../environment-art.mjs';
import {WORLD_REGIONS,regionSurfaces} from '../world.mjs';
import {Game} from '../core.mjs';
function context(){
 const calls=[];return new Proxy({calls},{get(o,k){if(k in o)return o[k];if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop(){}});return (...a)=>{for(const n of a)if(typeof n==='number')assert(Number.isFinite(n),String(k)+' coordinates');calls.push([k,...a]);};},set(o,k,v){o[k]=v;return true;}});
}
class ReadyImage{
 constructor(){this.width=1920;this.height=1047;this.naturalWidth=this.width;this.complete=true;}
 set src(value){this.url=value;if(value.endsWith('terrain.webp')){this.width=1024;this.height=1344;}this.onload?.();}
}
test('panorama covers viewport sizes at both world ends and vertical limits',()=>{
 for(const [iw,ih] of [[1920,698],[1699,926],[1672,941]])for(const [w,h] of [[1280,720],[1920,720],[844,390],[440,956],[2560,1080]])for(const x of [0,1940,4020,6160-w])for(const y of [-600,0,300]){
  const p=paintingPlacement({width:iw,height:ih},w,h,x,y);
  assert(p.x<=0&&p.y<=0);assert(p.x+p.w>=w-1e-7&&p.y+p.h>=h-1e-7,'no exposed panorama edges');
 }
});
test('seven production backgrounds and terrain ship within a mobile download budget',()=>{
 let bytes=0;for(const theme of [...ENVIRONMENT_THEMES,'terrain']){
  const data=readFileSync(new URL(`../assets/environments/${theme}.webp`,import.meta.url));
  assert.equal(data.subarray(8,12).toString(),'WEBP');assert(data.length>10000);bytes+=data.length;
 }
 assert(bytes<3_000_000,'complete collection below 3 MB');
});
test('missing image support retains the procedural fallback',()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>({width:0,height:0,getContext:context})};
 try{const art=new EnvironmentArt(),c=context();art.sky(c,WORLD_REGIONS[0],1280,720,0,-600,2,false);assert.equal(art.illustrated.ready(WORLD_REGIONS[0]),false);assert(c.calls.some(x=>x[0]==='fillRect'));}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
test('day/night painting and existing platforms preserve save and collision data',()=>{
 const previous=globalThis.Image;globalThis.Image=ReadyImage;
 try{
  const art=new IllustratedEnvironment(),g=new Game(),snapshot=g.save();
  for(const region of WORLD_REGIONS)for(const night of [false,true]){
   const surfaces=regionSurfaces(region.id).map(Object.freeze),before=JSON.stringify(surfaces),c=context();
   assert(art.sky(c,region,1280,720,2200,-400,3,night));
   for(const surface of surfaces)assert(art.surface(c,surface,region));
   assert.equal(JSON.stringify(surfaces),before);assert(c.calls.some(x=>x[0]==='drawImage'));
   for(const surface of surfaces)assert(c.calls.some(x=>x[0]==='moveTo'&&x[1]===surface.x&&x[2]===surface.y),'painted ledge stays on collision edge');
  }
  assert.equal(g.save(),snapshot);
 }finally{if(previous===undefined)delete globalThis.Image;else globalThis.Image=previous;}
});
