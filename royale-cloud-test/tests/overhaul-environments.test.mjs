import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {EnvironmentArt} from '../environment-art.mjs';
import {surfaceMaterial} from '../environment-detail.mjs';
import {WORLD_REGIONS,regionSurfaces} from '../world.mjs';
const {createCanvas}=createRequire(import.meta.url)('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
for(const r of WORLD_REGIONS)test(`environment ${r.id}: actual day/night parallax animates, caches stay bounded and collision data is immutable`,()=>{
 const art=new EnvironmentArt(),canvas=createCanvas(1280,720),c=canvas.getContext('2d'),ss=regionSurfaces(r.id),before=JSON.stringify(ss),hash=()=>createHash('sha256').update(canvas.toBuffer('image/png')).digest('hex');
 art.sky(c,r,1280,720,0,0,0,false);const day=hash();art.sky(c,r,1280,720,0,0,2,false);assert.notEqual(hash(),day,'environment is animated');art.sky(c,r,1280,720,500,-150,2,true);assert.notEqual(hash(),day,'night and parallax');
 for(const s of ss)art.surface(c,Object.freeze(s),r);assert.equal(JSON.stringify(ss),before);
 for(const other of WORLD_REGIONS)art.sky(c,other,1280,720,0,0,1,true);assert.ok(art.scenes.size<=2);assert.ok(art.terrain.size<=48);assert.deepEqual([...new Set(ss.filter(s=>s.tier).map(s=>s.y))],[480,320,160,0]);
});
test('material identity follows rendered surfaces including wood, concrete, stone, grass, sand and metal',()=>{for(const [kind,expected] of [['wood','wood'],['metal','metal'],['sand','sand'],['grass','grass'],['factory','concrete'],['final','concrete'],['cave','stone'],['energy','stone'],['forest','dirt'],['mutant','dirt']])assert.equal(surfaceMaterial({kind}),expected);});
