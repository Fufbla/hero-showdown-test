import {writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {engine,createCanvas,hero,examples} from './helpers.mjs';
const out=process.argv[2]||await mkdtemp(join(tmpdir(),'starter-suit-review-'));await mkdir(out,{recursive:true});
const e=await engine();
const grid=createCanvas(1400,900),c=grid.getContext('2d');c.fillStyle='#12383c';c.fillRect(0,0,1400,900);c.fillStyle='#f6e8c6';c.font='bold 32px sans-serif';c.fillText('Approved starter suit — actual game renderer',40,48);
for(let i=0;i<4;i++){const x=175+i*350;c.fillStyle='#f6e8c6';c.font='bold 20px sans-serif';c.textAlign='center';c.fillText(examples[i].name,x,90);e.draw(c,x,480,examples[i],hero(),0,{scale:2.5});e.draw(c,x,805,{...examples[i],cape:false},hero({face:-1}),0,{scale:1.65});c.fillText('Cape off · facing left',x,850);}
await writeFile(out+'/color-examples.png',grid.toBuffer('image/png'));
const atlas=createCanvas(2048,1792),a=atlas.getContext('2d');a.fillStyle='#143a3e';a.fillRect(0,0,2048,1792);
for(let i=0;i<116;i++){const col=i%8,row=Math.floor(i/8);if(row>=7)break;const x=col*256+128,y=row*256+246;e.paint(a,x,y,{frame:i,direction:1,look:examples[0]},{scale:1.2});a.fillStyle='#fff0d0';a.font='16px sans-serif';a.fillText(String(i),col*256+10,row*256+22);}
await writeFile(out+'/movement-review.png',atlas.toBuffer('image/png'));
const attacks=createCanvas(2048,2304),b=attacks.getContext('2d');b.fillStyle='#143a3e';b.fillRect(0,0,2048,2304);
for(let i=48;i<116;i++){const n=i-48,col=n%8,row=Math.floor(n/8);e.paint(b,col*256+128,row*256+246,{frame:i,direction:1,look:examples[1]},{scale:1.2});b.fillStyle='#fff0d0';b.font='16px sans-serif';b.fillText(String(i),col*256+10,row*256+22);}
await writeFile(out+'/attack-review.png',attacks.toBuffer('image/png'));
console.log(JSON.stringify({output:out,...e.status()}));
