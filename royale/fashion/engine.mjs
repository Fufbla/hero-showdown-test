import {CostumeEngine as ExistingCostumeEngine} from '../../royale-v3-staging/costumes/engine.mjs?fashion-base=1';
import {FullBodyAnimator,validateManifest} from '../../royale-v3-staging/kingjames/animation.mjs';
import {STEEL_ID} from '../../royale-v3-staging/kingjames/outfit-engine.mjs';
import {sanitizeLook} from '../appearance.mjs';
import {FASHION_OUTFITS} from './definitions.mjs';

export const FASHION_CACHE_LIMIT=128;
const ids=new Set(FASHION_OUTFITS.map(o=>o.id));
const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));

// Retain the complete connected pose and its antialiased outline. Source PNGs
// remain unchanged; isolated/near-transparent generation residue is not drawn.
function bodyMask(data,w,h){
 const n=w*h,labels=new Int32Array(n),queue=new Uint32Array(n);
 let id=0,best=0,size=0;
 for(let p=0;p<n;p++){
  if(labels[p]||data[p*4+3]<128)continue;
  id++;let start=0,end=1;queue[0]=p;labels[p]=id;
  while(start<end){
   const at=queue[start++],x=at%w,y=Math.floor(at/w);
   for(const next of [x?at-1:-1,x<w-1?at+1:-1,y?at-w:-1,y<h-1?at+w:-1]){
    if(next>=0&&!labels[next]&&data[next*4+3]>=128){labels[next]=id;queue[end++]=next;}
   }
  }
  if(end>size){best=id;size=end;}
 }
 const mask=new Uint8Array(n);
 for(let p=0;p<n;p++)if(labels[p]===best){
  const x=p%w,y=Math.floor(p/w);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)mask[p+dy*w+dx]=1;
  }
 }
 return mask;
}

export class CostumeEngine extends ExistingCostumeEngine{
 constructor(options={}){super(options);this.fashionFrames=new Map();}
 async preload(id){
  if(!ids.has(id))return super.preload(id);
  if(this.outfits.has(id))return true;
  if(this.pending.has(id))return this.pending.get(id);
  const task=(async()=>{try{
   const url=new URL('./assets/'+id+'/manifest.json',import.meta.url);
   const manifest=validateManifest(await this.jsonLoader(url));
   if(manifest.id!==id||manifest.frames.length!==116||manifest.skinMask!=='magenta-v1')throw Error('Invalid fashion costume manifest');
   const images=Object.fromEntries(await Promise.all(Object.entries({default:manifest.atlas,...manifest.atlases})
    .map(async([key,path])=>[key,await this.imageLoader(new URL(path,url))])));
   const [,steel]=await Promise.all([this.approved.head.preload(),this.steel.preload(STEEL_ID)]);
   if(!steel)throw Error(this.steel.error);
   for(const f of manifest.frames){
    const im=images[f.atlas||'default'],r=f.sourceRect,p=f.paintRect;
    if(!im||!r?.every(Number.isFinite)||!p?.every(Number.isFinite)||r[0]<0||r[1]<0||r[2]<=0||r[3]<=0||r[0]+r[2]>im.width||r[1]+r[3]>im.height)throw Error('Fashion pose exceeds its atlas');
   }
   this.outfits.set(id,{fashion:true,manifest,images,templates:new Map()});this.error=null;return true;
  }catch(e){this.error=e.message;return false;}finally{this.pending.delete(id);}})();
  this.pending.set(id,task);return task;
 }
 template(id,index){
  const loaded=this.outfits.get(id);
  if(loaded.templates.has(index))return loaded.templates.get(index);
  const f=loaded.manifest.frames[index],[,,w,h]=f.sourceRect;
  const plate=this.factory(w,h),c=plate.getContext('2d',{willReadFrequently:true});
  c.drawImage(loaded.images[f.atlas||'default'],...f.sourceRect,0,0,w,h);
  const pixels=c.getImageData(0,0,w,h),d=pixels.data,keep=bodyMask(d,w,h),skin=[];
  const skinMask=new Uint8Array(w*h),queue=[];
  for(let p=0;p<keep.length;p++){
   const i=p*4;
   if(!keep[p]||d[i+3]<32){d[i+3]=0;continue;}
   const [r,g,b]=d.subarray(i,i+3);
   const key=r>g*1.4&&b>g*1.4&&r>b*.7&&b>r*.65&&r>35&&b>35;
   const highlight=r>150&&b>150&&Math.min(r,b)>g*1.1&&r>b*.85&&b>r*.85;
   // Summer Chic uses mint, ivory and gold only. Its toe/arm marker shades
   // also include warm pink, which must follow skin color like the magenta.
   // Keep this palette-specific so coral/ruby fabric on other outfits stays fixed.
   const summerPink=id==='summer-chic'&&r>g+2&&b>g+2&&r>20&&b>15;
   if(key||highlight||summerPink){skinMask[p]=1;queue.push(p);}
  }
  // Include warm antialiased/highlight pixels connected to a magenta skin
  // region. Dark authored outlines separate skin from coral/ruby fabric.
  for(let q=0;q<queue.length;q++){
   const p=queue[q],x=p%w,y=Math.floor(p/w);
   if(skinMask[p]>=5)continue;
   for(const next of [x?p-1:-1,x<w-1?p+1:-1,y?p-w:-1,y<h-1?p+w:-1]){
    if(next<0||skinMask[next])continue;
    const i=next*4,[r,g,b,a]=d.subarray(i,i+4);
    if(a>32&&r>50&&b>50&&r>g*1.25&&b>g*1.15&&r>b*.7&&b>r*.55){skinMask[next]=skinMask[p]+1;queue.push(next);}
   }
  }
  for(const p of queue){const i=p*4;skin.push([i,(d[i]+d[i+2])/510]);}
  const result={pixels,w,h,skin};loaded.templates.set(index,result);return result;
 }
 frame(id,index,raw){
  const look=sanitizeLook(raw),key=id+'|'+index+'|'+look.skin;
  if(this.fashionFrames.has(key)){
   const old=this.fashionFrames.get(key);this.fashionFrames.delete(key);this.fashionFrames.set(key,old);return old;
  }
  const loaded=this.outfits.get(id),m=loaded.manifest,f=m.frames[index],t=this.template(id,index);
  const body=this.factory(t.w,t.h),bc=body.getContext('2d'),pixels=bc.createImageData(t.w,t.h),color=rgb(look.skin);
  pixels.data.set(t.pixels.data);
  for(const [i,shade] of t.skin)for(let k=0;k<3;k++)pixels.data[i+k]=Math.min(255,color[k]*(.48+.57*shade));
  bc.putImageData(pixels,0,0);
  const plate=this.factory(...m.cell),c=plate.getContext('2d');c.drawImage(body,...f.paintRect);
  this.fashionFrames.set(key,plate);
  while(this.fashionFrames.size>FASHION_CACHE_LIMIT)this.fashionFrames.delete(this.fashionFrames.keys().next().value);
  return plate;
 }
 draw(c,x,y,raw,hero,time,{id,owner=hero,scale=1}={}){
  const loaded=this.outfits.get(id);
  if(!loaded?.fashion||hero.steel)return super.draw(c,x,y,raw,hero,time,{id,owner,scale});
  const look=sanitizeLook(raw),m=loaded.manifest;
  let animator=this.states.get(owner);
  if(!animator||animator.manifest!==m){animator=new FullBodyAnimator(m);this.states.set(owner,animator);}
  const sample=animator.sample(hero,time),f=sample.frame;
  c.save();c.translate(x,y);c.scale(sample.direction*m.worldScale*scale,m.worldScale*scale);c.translate(-m.foot[0],-m.foot[1]);
  if(hero.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha*=.78;
  c.drawImage(this.frame(id,sample.frameIndex,look),0,0);
  this.approved.head.draw(c,look,f.head,m.head.scale,{closed:sample.state==='defeat'||sample.state==='idle'&&time%3.9>3.73});
  c.restore();
  const world=p=>[(p[0]-m.foot[0])*m.worldScale,(p[1]-m.foot[1])*m.worldScale];
  const neck=world(f.head),hand=world(f.hand),elbow=[(neck[0]+hand[0])*.5,(neck[1]+hand[1])*.5+8];
  this.lastFrame={outfit:id,state:sample.state,frame:sample.frameIndex,direction:sample.direction,hairVisible:true,hairContained:false,head:[...f.head],foot:[...m.foot]};
  return {artSource:'full-body-costume',clip:sample.state,head:neck,faceCenter:neck,shoulder:neck,hip:[0,-35],arms:[[neck,elbow,hand],[neck,elbow,hand]],legs:[],opacity:1};
 }
}
export const costumeSprites=new CostumeEngine();
