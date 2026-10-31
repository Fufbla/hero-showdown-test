import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {MONSTER_SPRITES} from '../monster-sprite-catalog.mjs';
import {SPRITE_CLIPS,SPRITE_CELL,spriteFrame,spritePose,ReferenceMonsterAtlas} from '../monster-sprites.mjs';
import {TYPES} from '../world.mjs';
const manifest=JSON.parse(readFileSync(new URL('../assets/monsters/manifest.json',import.meta.url)));
for(const [type,info] of Object.entries(TYPES))test(`Sprite provenance and stable geometry: ${info.name}`,()=>{
 const m=manifest.sprites[type],c=MONSTER_SPRITES[type];assert.equal(m.region,info.region);assert.equal(m.name,info.name);assert.equal(c.file,m.file);assert.equal(c.width,m.width);assert.equal(c.height,m.height);
 const source=readFileSync(new URL('../assets/monsters/'+m.source,import.meta.url));assert.equal(createHash('sha256').update(source).digest('hex'),m.sourceSHA256);
 const png=readFileSync(new URL('../assets/monsters/'+m.file,import.meta.url));assert.equal(png.readUInt32BE(16),m.width);assert.equal(png.readUInt32BE(20),m.height);assert.equal(png[25],6,'RGBA PNG, not an opaque checkerboard');
 assert.equal(m.anchor[1],m.height-4);assert.equal(m.anchor[0],m.width/2);assert.ok(m.width<200&&m.height<160);assert.ok(m.eyes.every(([x,y])=>x>0&&x<1&&y>0&&y<1));
 const e=Object.freeze({type,id:5,state:'chase',walkCycle:.9,age:.2,hp:50,maxHp:100});assert.ok(spriteFrame(e,.5)>=4&&spriteFrame(e,.5)<12);
});
test('Sprite timelines keep motion, attacks, reactions and defeat distinct without simulation mutation',()=>{
 const seen=new Set();for(const [clip,{start,count}]of Object.entries(SPRITE_CLIPS)){for(let i=0;i<count;i++)seen.add(start+i);for(let i=0;i<=100;i++){const p=spritePose('scuttle',clip,i/100);assert.equal(p.anchorY,0);assert.ok(Object.values(p).every(Number.isFinite));assert.ok(p.sy>.9&&p.sy<1.1);}}
 assert.ok(spritePose('scuttle','warn',1).shear>0,'windup leans away from facing direction');assert.ok(spritePose('scuttle','attack',.5).shear<0,'strike leans toward target with the feet anchored');
 assert.equal(seen.size,28);assert.equal(Math.max(...seen),SPRITE_CELL.columns*SPRITE_CELL.rows-1);
 assert.equal(spriteFrame({state:'dead',deadAge:20}),27);assert.equal(spriteFrame({state:'strike',age:.99}),18);assert.equal(spriteFrame({state:'warn',age:20}),14);
 for(const flash of [.12,.07,.001])assert.ok([21,22].includes(spriteFrame({flash,state:'chase'})));
 const rooted={state:'desperation',rooted:true,walkCycle:.4,id:1};assert.ok(spriteFrame(rooted,.1)<4,'roots do not animate a walk');
 const e={state:'chase',walkCycle:.25,id:1};assert.equal(spriteFrame(e,0),spriteFrame(e,9999),'gait follows distance, not render FPS');
});
test('Loading fails safely without a browser, never modifies enemies, and cleans caches',async()=>{
 let calls=0;const fallback={entries:new Map(),draw:()=>calls++},a=new ReferenceMonsterAtlas({fallback,loadImages:false});assert.equal(await a.preload(1),false);a.draw({},Object.freeze({type:'bottle'}),0,false);assert.equal(calls,1);assert.equal(a.entries.size,0);assert.equal(a.textureBytes,0);a.destroy();assert.equal(a.disposed,true);assert.equal(await a.load('bottle'),false);
});
