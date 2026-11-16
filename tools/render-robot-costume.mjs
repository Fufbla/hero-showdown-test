import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {CostumeEngine} from '../royale/fashion/engine.mjs';
import {motionHero} from '../royale-v3-staging/costumes/preview.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const engine=new CostumeEngine({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u))});
const id='robot-costume';
if(!await engine.preload(id))throw Error(engine.error);
const preview=createCanvas(256,256);
engine.draw(preview.getContext('2d'),128,238,{},motionHero('idle',0,1),0,{id,scale:1.7});
await writeFile(new URL('../royale/fashion/assets/robot-costume/preview.png',import.meta.url),preview.toBuffer('image/png'));
const sheet=createCanvas(1200,720),c=sheet.getContext('2d');c.fillStyle='#e4f2ff';c.fillRect(0,0,1200,720);
const motions=['idle','run','jump','doubleJump','punch','kick','flight','fireball','hurt','defeat','steel','idle'];
for(let i=0;i<motions.length;i++){
 const x=(i%6)*200+100,y=Math.floor(i/6)*340+280,dir=i<6?1:-1;
 engine.draw(c,x,y,{presentation:i%2?'female':'male'},motionHero(motions[i],.48,dir),.48,{id,scale:1.7});
 c.fillStyle='#113c61';c.textAlign='center';c.font='bold 16px sans-serif';c.fillText(motions[i]+' '+(dir>0?'right':'left'),x,y+32);
}
await mkdir(new URL('../docs/robot-costume-20261116/',import.meta.url),{recursive:true});
await writeFile(new URL('../docs/robot-costume-20261116/render-review.png',import.meta.url),sheet.toBuffer('image/png'));
