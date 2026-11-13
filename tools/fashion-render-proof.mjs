// Uses the actual runtime renderer for shop thumbnails and review screenshots.
import {writeFile,mkdir} from 'node:fs/promises';
import {engine,look,createCanvas,FASHION_OUTFITS} from '../royale/fashion/tests/helpers.mjs';
import {motionHero} from '../royale-v3-staging/costumes/preview.mjs';
const e=await engine(),root=new URL('../',import.meta.url);
const sheet=createCanvas(1440,660),c=sheet.getContext('2d');c.fillStyle='#f4eee3';c.fillRect(0,0,1440,660);
c.fillStyle='#251e2a';c.font='bold 30px sans-serif';c.fillText('HERO SHOWDOWN ROYALE • LIVE FASHION',35,45);
for(const [i,o] of FASHION_OUTFITS.entries()){
 const thumb=createCanvas(256,280),tc=thumb.getContext('2d');
 e.draw(tc,128,263,look,motionHero('idle'),0,{id:o.id,scale:1.65});
 await writeFile(new URL('royale/fashion/assets/'+o.id+'/preview.png',root),thumb.toBuffer('image/png'));
 const x=20+i*236;
 c.drawImage(thumb,x,62,220,240);c.font='bold 15px sans-serif';c.fillStyle='#251e2a';c.fillText(o.name,x+5,330);
 e.draw(c,x+113,570,look,motionHero(i<3?'run':'kick',.48,-1),.48,{id:o.id,scale:1.45});
 c.font='13px sans-serif';c.fillStyle='#5b5263';c.fillText(i<3?'Run • left':'Kick • left',x+55,615);
}
await mkdir(new URL('docs/fashion-six/',root),{recursive:true});
await writeFile(new URL('docs/fashion-six/runtime-proof.png',root),sheet.toBuffer('image/png'));
console.log('Rendered six live shop thumbnails and runtime review sheet.');
