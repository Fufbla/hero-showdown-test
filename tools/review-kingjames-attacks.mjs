import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile} from 'node:fs/promises';
import {OutfitEngine} from '../royale-v3-staging/kingjames/outfit-engine.mjs';
import {kingJamesLook} from '../royale-v3-staging/kingjames/selection.mjs';
import {DEFAULT_LOOK} from '../royale/core.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const engine=new OutfitEngine({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u))});
if(!await engine.preload())throw Error(engine.error);
const {manifest:m,atlases}=engine.outfits.get('kingjames-original'),look=kingJamesLook(DEFAULT_LOOK);
const canvas=createCanvas(1280,7*220),c=canvas.getContext('2d');c.fillStyle='#233c4d';c.fillRect(0,0,canvas.width,canvas.height);
const indices=[0,32,34,36,...Array.from({length:52},(_,i)=>i+48)];
for(const [i,id]of indices.entries()){
 const f=m.frames[id],x=i%8*160,y=Math.floor(i/8)*220;c.save();c.translate(x,y+25);c.scale(.62,.62);
 c.drawImage(atlases[f.atlas||'default'],...f.rect,0,0,256,256);engine.head.draw(c,look,f.head,m.head.scale);c.restore();
 c.fillStyle='#e5eff5';c.font='12px sans-serif';c.fillText('Frame '+id,x+8,y+205);
}
await writeFile(process.argv[2]||'/tmp/kingjames-attack-contact.png',canvas.toBuffer('image/png'));
