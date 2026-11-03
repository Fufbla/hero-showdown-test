import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {drawHero,configureStyleC,styleCCacheStatus} from '../style-c-hero.mjs';
import {prepareStyleCMaterials,styleCTextureStatus} from '../style-c-materials.mjs';
import {prepareHeroMaterials} from '../hero-materials.mjs';
import {drawHero as drawBefore} from './style-c-before-art.mjs';
import {previewHero} from '../style-c-rig.mjs';
import {HAIR_STYLES} from '../appearance.mjs';
import {HAIR_CATALOG} from '../hair-catalog.mjs';
import {STYLE_C_SAMPLES,styleCOutfit} from './style-c-scenes.mjs';
import {checkCreatures,prepareCreature,ROSTER,drawCreature} from './creature-review-render.mjs';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
globalThis.document={createElement:()=>createCanvas(1,1)};
const options={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))};
configureStyleC({makeCanvas:createCanvas});await prepareStyleCMaterials(options);await prepareHeroMaterials(options);
const out=fileURLToPath(new URL('../qa/style-c/',import.meta.url));mkdirSync(out,{recursive:true});
function board(w,h,title,sub){const canvas=createCanvas(w,h),c=canvas.getContext('2d');c.fillStyle='#e4e7dc';c.fillRect(0,0,w,h);c.fillStyle='#1d3440';c.font='bold 25px sans-serif';c.fillText(title,25,36);c.font='15px sans-serif';c.fillText(sub,25,62);return {canvas,c};}
function label(c,text,x,y){c.fillStyle='#1d3440';c.font='15px sans-serif';c.fillText(text,x,y);}
function save(name,b){writeFileSync(out+name+'.png',b.canvas.toBuffer('image/png'));}
const before=board(1400,520,'Checkpoint C → Style C approval prototype','Same saved appearances and equal magnification. Camera and physical hitboxes are unchanged.');
for(let i=0;i<4;i++){const l=STYLE_C_SAMPLES[Math.floor(i/2)],x=175+i*350; (i%2?drawHero:drawBefore)(before.c,x,450,l,previewHero('idle',.2),.2,2.7,{view:'front'});label(before.c,(i%2?'STYLE C':'CHECKPOINT C')+' · '+l.presentation,x-100,485);}save('before-after',before);
const comparison=board(1700,650,'Approved reference / original-pixel implementation','Reference at left. Right: actual renderer using source RGB and an extracted alpha mask. Animation approval pending.');
const ref=await loadImage(new URL('../assets/hero/style-c-reference.jpeg',import.meta.url));comparison.c.drawImage(ref,24,108,790,445);
for(let i=0;i<2;i++){drawHero(comparison.c,1100+i*350,545,STYLE_C_SAMPLES[i],previewHero('idle',.2),.2,3.1,{view:'front'});label(comparison.c,STYLE_C_SAMPLES[i].presentation,1050+i*350,590);}save('reference-comparison',comparison);
const close=board(1500,880,'Face, hair, costume and proportions · source / renderer','The original source is shown with its background; extracted default idle at the same native pixel scale.');
for(const [i,l]of STYLE_C_SAMPLES.entries()){const box=i?[778,250,246,345]:[435,250,289,345],origin=i?940:632,y=100+i*375;close.c.drawImage(ref,...box,35,y,box[2],box[3]);drawHero(close.c,405+origin-box[0],y+590-box[1],l,previewHero('idle',.2),.2,1/.35,{view:'front'});const faceBox=i?[875,330,135,113]:[572,331,125,98];close.c.drawImage(ref,...faceBox,805,y+25,faceBox[2]*2,faceBox[3]*2);close.c.save();close.c.beginPath();close.c.rect(1140,y+25,faceBox[2]*2,faceBox[3]*2);close.c.clip();drawHero(close.c,1140+(origin-faceBox[0])*2,y+25+(590-faceBox[1])*2,l,previewHero('idle',.2),.2,2/.35,{view:'front'});close.c.restore();label(close.c,l.presentation+' source',35,y+361);label(close.c,'renderer · same proportions',405,y+361);label(close.c,'source face · 2×',805,y+285);label(close.c,'rendered face · 2×',1140,y+285);}save('source-closeups',close);
const idle=board(1000,530,'Style C · male and female','Actual renderer · original reference pixels · isolated silhouette requires visual approval.');for(let i=0;i<2;i++)drawHero(idle.c,260+i*480,465,STYLE_C_SAMPLES[i],previewHero('idle',.2),.2,3.2,{view:'front'});save('idle-previews',idle);
const hair=board(1540,1510,'49 saved hairstyles · Style C','42 expanded styles and all 7 legacy choices. Every selection keeps its original saved identifier.');
for(let i=0;i<HAIR_STYLES.length;i++){const id=HAIR_STYLES[i],x=i%7*220,y=80+Math.floor(i/7)*200;drawHero(hair.c,x+110,y+176,{...STYLE_C_SAMPLES[i%2],hair:id,cape:false},previewHero('idle',.2),.2,1.2,{view:'front'});label(hair.c,HAIR_CATALOG.find(h=>h.id===id)?.name||id,x+12,y+193);}save('hairstyles-49',hair);
const gear=board(1500,800,'Equipment on the new rig','Fixed catalog colors; white rare outlines; green Legendary Merge outlines.');
for(const [i,kind]of ['ordinary','rare','merge:lightning','merge:air','merge:styrodog','merge:sonic','merge:styro','merge:wastelander','merge:venomis','merge:atomdust'].entries()){const x=i%5*300,y=390+Math.floor(i/5)*350;drawHero(gear.c,x+145,y,STYLE_C_SAMPLES[i%2],previewHero(i%2?'kick':'idle',.15),.15,2.05,{view:'game',outfit:styleCOutfit(kind)});label(gear.c,kind,x+38,y+28);}save('equipment',gear);
const builds=board(1200,780,'Body builds and age appearances','Male/female • slender, balanced, strong, full • teen, young adult, older adult');
for(let i=0;i<8;i++){const build=['slender','balanced','strong','full'][i%4],age=['teen','young','older','young'][i%4],l={...STYLE_C_SAMPLES[i<4?0:1],build,age};drawHero(builds.c,150+i%4*300,385+Math.floor(i/4)*340,l,previewHero('idle',.2),.2,2.3,{view:'front'});label(builds.c,l.presentation+' · '+build+' · '+age,35+i%4*300,418+Math.floor(i/4)*340);}save('body-builds',builds);
const moves=board(1500,760,'Movement approval poses','Source artwork / prototype articulation. Joint seams and cape edges still require correction.');
for(let i=0;i<10;i++){const kind=['idle','walk','run','punch','kick'][i%5],t=kind==='punch'?.09:kind==='kick'?.15:.18,x=i%5*300,y=375+Math.floor(i/5)*340;drawHero(moves.c,x+145,y,STYLE_C_SAMPLES[i<5?0:1],previewHero(kind,t),t,2.2,{view:'game'});label(moves.c,kind,x+110,y+27);}save('movement-poses',moves);
const monster=await prepareCreature(ROSTER.find(v=>v.key==='monster-bottle'),options);
const scale=board(1100,370,'Actual world-unit scale beside an integrated monster','Left: gameplay size (1×). Right: equally magnified 2× detail. Not a new camera zoom.');
for(let i=0;i<2;i++){drawHero(scale.c,130+i*520,300,STYLE_C_SAMPLES[i],previewHero('idle',.2),.2,i?2:1);drawCreature(scale.c,monster,{x:290+i*520,y:300,scale:i?2:1,face:-1});}monster.release();save('with-integrated-monster',scale);
const timingCanvas=createCanvas(480,360),tc=timingCanvas.getContext('2d'),timings=[];
for(let i=0;i<360;i++){const start=performance.now();tc.clearRect(0,0,480,360);drawHero(tc,200,330,STYLE_C_SAMPLES[i%2],previewHero('run',i/60),i/60,2.3,{artState:{}});if(i>=60)timings.push(performance.now()-start);}
timings.sort((a,b)=>a-b);writeFileSync(out+'native-performance.json',JSON.stringify({scope:'Hero-only native canvas raster cost, not browser FPS',renderer:'@napi-rs/canvas',samples:timings.length,meanMs:timings.reduce((a,b)=>a+b,0)/timings.length,p95Ms:timings[Math.floor(timings.length*.95)],textures:styleCTextureStatus(),faces:styleCCacheStatus()},null,2));
if(process.argv.includes('--creatures')){const result=await checkCreatures(createCanvas,options,(count)=>{if(count%6===0)console.log('Creature render checks: '+count+'/36');});writeFileSync(out+'creature-results.json',JSON.stringify(result,null,2));}
if(process.argv.includes('--video')){
 const canvas=createCanvas(1280,720),c=canvas.getContext('2d');const ff=spawn('ffmpeg',['-y','-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','png','-framerate','30','-i','-','-an','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p',out+'movement-previews.mp4'],{stdio:['pipe','ignore','inherit']});
 for(let frame=0;frame<360;frame++){const t=frame/30,pose=['idle','walk','run','punch','kick'][Math.min(4,Math.floor(t/2.4))];c.fillStyle='#e4e7dc';c.fillRect(0,0,1280,720);c.fillStyle='#1d3440';c.font='bold 34px sans-serif';c.fillText('STYLE C · '+pose.toUpperCase(),35,55);c.font='18px sans-serif';c.fillText('Actual renderer · initial visual approval · original attack timing',35,88);
  for(let i=0;i<2;i++){drawHero(c,340+i*600,625,STYLE_C_SAMPLES[i],previewHero(pose,t),t,4,{view:'game',artState:STYLE_C_SAMPLES[i]});label(c,STYLE_C_SAMPLES[i].presentation,310+i*600,670);}
  if(!ff.stdin.write(canvas.toBuffer('image/png')))await once(ff.stdin,'drain');}
 ff.stdin.end();const [code]=await once(ff,'close');if(code!==0)throw Error('Animation export failed: '+code);
}
console.log('Style C approval artifacts rendered.');
