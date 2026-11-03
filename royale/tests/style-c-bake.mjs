// Run from any directory with the runtime's @napi-rs/canvas available. The
// generated pages are the exact 2× cels used by the default playable heroes.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdirSync, writeFileSync, renameSync} from 'node:fs';
import {resolve} from 'node:path';
import {prepareStyleCMaterials,styleCTextureStatus} from '../style-c-materials.mjs';
import {drawHero} from '../style-c-hero.mjs';
import {STYLE_C_MOTIONS,motionFrameSample} from '../style-c-motion.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';

const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const loaded=await prepareStyleCMaterials({canvasFactory:createCanvas, imageLoader:url=>loadImage(fileURLToPath(url))});
if(!loaded)throw Error(styleCTextureStatus().error);
const out=fileURLToPath(new URL('../assets/hero/style-c-accurate/sprites/',import.meta.url));
mkdirSync(out,{recursive:true});
const size=2048, pad=2, scale=2, anchor=[240,344], scratch=createCanvas(480,408), c=scratch.getContext('2d');
const manifest={scale,pages:[],characters:{male:{},female:{}},clips:Object.fromEntries(Object.entries(STYLE_C_MOTIONS).map(([id,clip])=>
  [id,{duration:clip.duration,loop:clip.loop,stops:clip.stops}]))};
function install(name,bytes){
  const path=resolve(out,name);
  writeFileSync(path+'.partial',bytes);renameSync(path+'.partial',path);
}
function bounds(d,w,h){
  let l=w,t=h,r=-1,b=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d[(y*w+x)*4+3]>1){
    if(x<l)l=x;if(x>r)r=x;if(y<t)t=y;if(y>b)b=y;
  }
  if(r<l||l<2||t<2||r>w-3||b>h-3)throw Error('Missing or clipped baked hero');
  return [l-1,t-1,r-l+3,b-t+3];
}
let total=0;
for(const sex of ['male','female']){
  const cells=[],look=styleCDefault(sex),prefix=sex==='male'?'guardian':'sentinel';
  for(const [clip,track] of Object.entries(STYLE_C_MOTIONS)){
    const frames=[];manifest.characters[sex][clip]=frames;
    for(let i=0;i<track.frames.length;i++){
      const {hero,time,options}=motionFrameSample(clip,i);
      hero.face=1;if(hero.attack)hero.attack.face=1;
      c.clearRect(0,0,scratch.width,scratch.height);
      const pose=drawHero(c,...anchor,look,hero,time,scale,{...options,view:'game',bake:true});
      if(pose.clip!==clip||pose.frame!==i)throw Error(clip+' selected wrong key '+i);
      const [l,t,w,h]=bounds(c.getImageData(0,0,scratch.width,scratch.height).data,scratch.width,scratch.height);
      const cut=createCanvas(w,h);cut.getContext('2d').drawImage(scratch,l,t,w,h,0,0,w,h);
      cells.push({cut,frames,frame:i,w,h,px:anchor[0]-l,py:anchor[1]-t});total++;
    }
  }
  cells.sort((a,b)=>b.h-a.h||b.w-a.w);
  let page,pc,heights,x,y,rowH,pageIndex,num=0;
  function newPage(){
    page=createCanvas(size,size);pc=page.getContext('2d');x=y=pad;rowH=heights=0;
    pageIndex=manifest.pages.length;manifest.pages.push(prefix+'-'+(++num)+'.png');
  }
  function flush(){
    const crop=createCanvas(size,heights+pad);
    crop.getContext('2d').drawImage(page,0,0);
    install(manifest.pages[pageIndex],crop.toBuffer('image/png'));
  }
  newPage();
  for(const cell of cells){
    if(x+cell.w+pad>size){x=pad;y+=rowH+pad*2;rowH=0;}
    if(y+cell.h+pad>size){flush();newPage();}
    pc.drawImage(cell.cut,x,y);cell.frames[cell.frame]=[pageIndex,x,y,cell.w,cell.h,cell.px,cell.py];
    rowH=Math.max(rowH,cell.h);heights=Math.max(heights,y+cell.h);x+=cell.w+pad*2;
  }
  flush();
}
install('frames.json',JSON.stringify(manifest,null,1)+'\n');
console.log(total+' transparent cels on '+manifest.pages.length+' pages');
