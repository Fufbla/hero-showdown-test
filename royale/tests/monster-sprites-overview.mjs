// Render every integrated regular monster through the same atlas used by gameplay.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {MonsterAtlas} from '../monster-art.mjs';
import {MONSTER_ANIMATIONS} from '../monster-animation-catalog.mjs';
import {TYPES} from '../world.mjs';
const require=createRequire(import.meta.url);
let canvasModule;try{canvasModule=require('@napi-rs/canvas');}catch{canvasModule=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');}
const {createCanvas,loadImage}=canvasModule;
globalThis.document={createElement:()=>createCanvas(1,1)};
assert.equal(Object.keys(MONSTER_ANIMATIONS).length,21);
const canvas=createCanvas(1200,1820),c=canvas.getContext('2d');
c.fillStyle='#102832';c.fillRect(0,0,1200,1820);c.fillStyle='#f1e4c4';c.font='bold 30px sans-serif';c.fillText('Hero Showdown Royale · 21 in-game monsters',30,45);
c.font='16px sans-serif';c.fillText('Actual sprite adapter · idle frame · all seven regions',30,75);
for(let region=1;region<=7;region++){
 const atlas=new MonsterAtlas({loadImages:false});
 const types=Object.keys(TYPES).filter(t=>TYPES[t].region===region);
 for(const [column,type] of types.entries()){
  const meta=MONSTER_ANIMATIONS[type];const image=await loadImage(fileURLToPath(new URL('../assets/monsters/'+meta.file,import.meta.url)));
  atlas.sources.set(type,{image,promise:Promise.resolve(true)});
  const x=column*400+200,y=region*240+50;
  c.fillStyle='#213e46';c.fillRect(column*400+15,y-185,370,220);
  c.save();c.translate(x,y);c.scale(1.55,1.55);atlas.draw(c,Object.freeze({type,id:0,state:'idle'}),0,false);c.restore();
  c.fillStyle='#f1e4c4';c.font='18px sans-serif';c.textAlign='center';c.fillText(meta.name,x,y+25);c.textAlign='left';
 }
 atlas.destroy();
}
const dir=fileURLToPath(new URL('./evidence/monster-sprites/',import.meta.url));mkdirSync(dir,{recursive:true});writeFileSync(dir+'all-21.png',canvas.toBuffer('image/png'));console.log('Rendered all 21 actual in-game monsters.');
