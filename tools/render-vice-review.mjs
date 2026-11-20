// Render verification images using the actual isolated Vice runtime.
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

globalThis.location={pathname:'/hero-showdown-test/four-powers-test/gameplay/',search:'?testAccount=0000000000'};
const [{ViceHead},{styleCDefault}]=await Promise.all([
 import('../test-only/four-powers/vice/head.mjs'),import('../royale/style-c-defaults.mjs')
]);

const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=process.argv[2]||path.resolve(root,'../vice-qa');
await mkdir(output,{recursive:true});
const options={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u))};
const head=new ViceHead(options);
if(!await head.preload())throw Error(head.error);
const styles=['none','short-locs','box-braids','long-locs','curly-ponytail','high-ponytail','afro-puff','large-afro','high-top','long-straight'];
const sheet=createCanvas(1500,1120),c=sheet.getContext('2d');
c.fillStyle='#edf3f8';c.fillRect(0,0,sheet.width,sheet.height);
const metrics=[];
for(let i=0;i<styles.length*2;i++){
 const presentation=i<styles.length?'male':'female';
 const look={...styleCDefault(presentation),hair:styles[i%styles.length],hairColor:i%3===0?'#753c26':'#262131'};
 const x=(i%5)*300+150,y=Math.floor(i/5)*280+183;
 head.draw(c,look,[x,y,0],.9);
 c.fillStyle='#172a42';c.font='14px sans-serif';c.textAlign='center';c.fillText(presentation+' · '+look.hair,x,Math.floor(i/5)*280+269);
 metrics.push({presentation,hair:look.hair,...head.geometry(look)});
}
await writeFile(path.join(output,'vice-head-fit.png'),sheet.toBuffer('image/png'));
await writeFile(path.join(output,'vice-head-fit.json'),JSON.stringify(metrics,null,2)+'\n');
console.log(JSON.stringify({headReview:path.join(output,'vice-head-fit.png'),examples:metrics.length}));

const [{CostumeEngine},{motionHero}]=await Promise.all([
 import('../test-only/four-powers/vice/engine.mjs'),import('../royale-v3-staging/costumes/preview.mjs')
]);
const engine=new CostumeEngine(options),id='vice-costume';
if(!await engine.preload(id))throw Error(engine.error);
const male={...styleCDefault('male'),hair:'short-locs'},female={...styleCDefault('female'),hair:'box-braids',hairColor:'#753c26'};
const thumbnail=createCanvas(256,256);
engine.draw(thumbnail.getContext('2d'),128,238,male,motionHero('idle',0,1),0,{id,scale:1.65});
await writeFile(path.join(root,'test-only/four-powers/vice/assets/preview.png'),thumbnail.toBuffer('image/png'));
const frames=engine.outfits.get(id).manifest.frames;
const all=createCanvas(2048,1728),ac=all.getContext('2d');ac.fillStyle='#edf3f8';ac.fillRect(0,0,all.width,all.height);
for(let i=0;i<frames.length;i++){
 const x=i%8*256,y=Math.floor(i/8)*288,look=i%2?female:male;
 ac.drawImage(engine.compose(id,i,look,false,1),x,y);
 ac.fillStyle='#172a42';ac.font='15px sans-serif';ac.textAlign='left';ac.fillText('Pose '+i+' · '+look.presentation,x+10,y+277);
}
await writeFile(path.join(output,'vice-all-poses.png'),all.toBuffer('image/png'));
const motions=['idle','run','jump','doubleJump','punch','kick','flight','fireball'];
const review=createCanvas(1600,1280),rc=review.getContext('2d');rc.fillStyle='#edf3f8';rc.fillRect(0,0,review.width,review.height);
for(let i=0;i<16;i++){
 const presentation=i<8?'male':'female',look=presentation==='male'?male:female;
 const x=i%4*400+200,y=Math.floor(i/4)*320+275,direction=i%2?-1:1,motion=motions[i%8];
 engine.draw(rc,x,y,look,motionHero(motion,.48,direction),.48,{id,scale:1.75});
 rc.fillStyle='#172a42';rc.font='17px sans-serif';rc.textAlign='center';rc.fillText(presentation+' · '+motion+' · '+(direction>0?'right':'left'),x,y+30);
}
await writeFile(path.join(output,'vice-action-fit.png'),review.toBuffer('image/png'));
console.log(JSON.stringify({thumbnail:'test-only/four-powers/vice/assets/preview.png',poses:path.join(output,'vice-all-poses.png'),actions:path.join(output,'vice-action-fit.png')}));
