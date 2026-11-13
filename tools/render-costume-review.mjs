import {createRequire} from 'node:module';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {CostumeEngine} from '../royale-v3-staging/costumes/engine.mjs';import {COSTUMES} from '../royale-v3-staging/costumes/catalog.mjs';import {motionHero} from '../royale-v3-staging/costumes/preview.mjs';import {styleCDefault} from '../royale/style-c-defaults.mjs';import {kingJamesLook} from '../royale-v3-staging/kingjames/selection.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');const e=new CostumeEngine({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u))});
for(const o of COSTUMES)if(!await e.preload(o.id))throw Error(e.error);
const out=new URL('../docs/costumes/review/',import.meta.url);await mkdir(out,{recursive:true});
const look={...kingJamesLook(styleCDefault('male')),hair:'braids'};
function background(c,w,h,title,sub){c.fillStyle='#0b1322';c.fillRect(0,0,w,h);c.fillStyle='#faf4df';c.font='bold 34px sans-serif';c.fillText(title,32,50);c.fillStyle='#a5bbd3';c.font='18px sans-serif';c.fillText(sub,32,80);}
function label(c,text,x,y,width){c.fillStyle='#eee9dc';c.font='bold 16px sans-serif';c.textAlign='center';c.fillText(text,x,y,width);c.textAlign='left';}
const board=createCanvas(1600,850),bc=board.getContext('2d');background(bc,1600,850,'THE APPROVED TEN','Same personalized hero · 700 coins each · Complete authored costumes');
for(const [n,o]of COSTUMES.entries()){const x=160+(n%5)*320,y=390+Math.floor(n/5)*380;bc.fillStyle='#17243a';bc.beginPath();bc.roundRect(x-148,y-282,296,322,18);bc.fill();bc.drawImage(e.compose(o.id,0,look),x-154,y-280,308,308);label(bc,o.name,x,y+30,280);
 const sheet=createCanvas(1536,1220),sc=sheet.getContext('2d');background(sc,1536,1220,o.name,'48 distinct full-body poses · Left-facing playback mirrors complete poses');
 for(let i=0;i<48;i++){const xx=i%8*192,yy=100+Math.floor(i/8)*184;sc.drawImage(e.compose(o.id,i,look),xx+5,yy,182,182);sc.fillStyle='#89a6c6';sc.font='11px sans-serif';sc.fillText(String(i).padStart(2,'0'),xx+7,yy+18);}
 await writeFile(new URL(o.id+'-sprites.png',out),sheet.toBuffer('image/png'));
}
await writeFile(new URL('ten-costumes.png',out),board.toBuffer('image/png'));
const hair=createCanvas(1440,720),hc=hair.getContext('2d');background(hc,1440,720,'HAIR IS HIDDEN, NEVER DELETED','Original hair → universal dolphin hood → original hair restored');
for(const [n,style]of ['braids','ponytail','large-afro'].entries()){const x=n*480;for(const [j,hood]of [false,true,false].entries()){const px=x+j*153;hc.fillStyle='#17243a';hc.fillRect(px+8,120,142,425);const id=hood?'dolphin-costume':'black-business-suit';hc.drawImage(e.compose(id,0,{...look,hair:style}),px-25,250,205,205);label(hc,j===1?'Hood on':j===2?'Hair restored':style,px+78,505,140);} }
await writeFile(new URL('hair-visibility.png',out),hair.toBuffer('image/png'));
if(process.argv.includes('--video')){
 const frames=new URL('motion-frames/',out);await mkdir(frames,{recursive:true});const canvas=createCanvas(1600,900),c=canvas.getContext('2d'),owners=COSTUMES.map(()=>({}));
 const sections=[['run','RUN RIGHT',1],['run','RUN LEFT',-1],['jump','JUMP',1],['doubleJump','DOUBLE JUMP',-1],['punch','PUNCH',1],['kick','KICK',-1],['strength','SUPER STRENGTH',1],['superKick','SUPER KICK',-1],['fireball','FIREBALL',1],['flight','FLIGHT',-1],['steel','STEEL BODY',1],['idle','COSTUMES RESTORED',1]];
 let frame=0;for(const [motion,title,direction]of sections)for(let tick=0;tick<36;tick++){
 background(c,1600,900,'COSTUME ANIMATION REVIEW',title+' · Existing game animator · 24 frames/second');
 for(const [n,o]of COSTUMES.entries()){const x=160+n%5*320,y=450+Math.floor(n/5)*390;c.fillStyle='#17243a';c.beginPath();c.roundRect(x-148,y-335,296,365,18);c.fill();e.draw(c,x,y-15,look,motionHero(motion,tick/24,direction),frame/24,{id:o.id,owner:owners[n],scale:1.9});label(c,o.name,x,y+16,275);}
 await writeFile(new URL(String(frame++).padStart(4,'0')+'.png',frames),canvas.toBuffer('image/png'));
 }
 console.log(JSON.stringify({frames:frame,fps:24,seconds:frame/24}));
}
console.log('Review sheets rendered from actual CostumeEngine compositions.');
