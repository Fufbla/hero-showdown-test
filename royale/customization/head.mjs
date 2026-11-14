import {sanitizeLook} from '../appearance.mjs';
import {NEW_HAIR,NEW_FEATURES} from './catalog.mjs';
import {ARTWORK} from './asset-map.mjs';
import {removeDetachedPixels} from './connected-art.mjs';
const browserCanvas=(w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h});
const browserImage=url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Character artwork unavailable'));image.src=url.href;});
// The former male head's 212 × 194 ink dimensions are shared by every hero.
// Hair and beards never participate in neck registration or body dimensions.
export const HEAD_BOUNDS=Object.freeze([150,112,212,194]);
export const HEAD_ORIGIN=Object.freeze([256,301]);
const keys=['age','skin','eyes','hair','hairColor','face','jaw','eyeShape','brows','nose','mouth','facialHair'];
const rgb=color=>[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
const memo=(map,key,value,limit=12)=>{map.set(key,value);while(map.size>limit)map.delete(map.keys().next().value);return value;};
const sets=new WeakMap();
export class UniversalHead{
 constructor({canvasFactory=browserCanvas,imageLoader=browserImage}={}){this.factory=canvasFactory;this.imageLoader=imageLoader;this.cache=new Map();this.faces=new Map();this.parts=new Map();this.ready=false;}
 async preload(){
  let pending=sets.get(this.imageLoader);
  if(!pending){pending=Promise.all(Object.keys(ARTWORK).map(async name=>[name,await this.imageLoader(new URL('./assets/'+name+'.png',import.meta.url))])).then(Object.fromEntries);sets.set(this.imageLoader,pending);}
  try{this.images=await pending;this.ready=true;return true;}catch(error){sets.delete(this.imageLoader);throw error;}
 }
 part(name,index,color,mode='hair'){
  const key=[name,index,color,mode].join('|');if(this.parts.has(key))return this.parts.get(key);
  const rect=ARTWORK[name].frames[index],w=name==='head'?212:rect[2],h=name==='head'?194:rect[3],canvas=this.factory(w,h),c=canvas.getContext('2d',{willReadFrequently:true});
  c.drawImage(this.images[name],...rect,0,0,w,h);const pixels=c.getImageData(0,0,w,h),d=pixels.data,tint=color?rgb(color):null;
  for(let i=0;i<d.length;i+=4){
   if(d[i+3]<24){d[i+3]=0;continue;}if(!tint)continue;
   const r=d[i],g=d[i+1],b=d[i+2],hi=Math.max(r,g,b);
   if(mode==='eyes'){
    if(g>r*1.35&&g>b*1.25&&g>35){const shade=g/185;for(let k=0;k<3;k++)d[i+k]=Math.min(255,tint[k]*shade);}
   }else if(mode==='skin'){
    if(r>35&&r>g*1.08){const shade=r/222;for(let k=0;k<3;k++)d[i+k]=Math.min(255,tint[k]*shade);}
   }else if(hi>20){
    // Golden braid cuffs remain gold. All actual strands retain their shading.
    if(name.includes('hair')&&r>150&&g>90&&b<g*.65)continue;
    const shade=(r+g+b)/210;for(let k=0;k<3;k++)d[i+k]=Math.min(255,tint[k]*shade+(shade>1?(shade-1)*28:0));
   }
  }
  if(name.includes('hair'))removeDetachedPixels(d,w,h);
  c.putImageData(pixels,0,0);return memo(this.parts,key,canvas,64);
 }
 feature(c,name,index,color,mode,cx,cy,maxW,maxH){
  const p=this.part(name,index,color,mode),s=Math.min(maxW/p.width,maxH/p.height),w=p.width*s,h=p.height*s;c.drawImage(p,cx-w/2,cy-h/2,w,h);
 }
 skin(c,look){
  const p=this.part('head',0,look.skin,'skin'),[x,y,w,h]=HEAD_BOUNDS;
  if(look.face==='oval'&&look.jaw===1){c.drawImage(p,x,y,w,h);return;}
  // Shape choices affect only the lower cheek contour. Crown, overall ink
  // dimensions and neck anchor stay fixed for both presentations.
  for(let row=0;row<h;row++){
   const t=Math.max(0,(row-140)/(h-140)),shape=(look.face==='round'?.055:look.face==='angular'?.035:0)*Math.sin(t*Math.PI);
   const scale=1+shape+(look.jaw-1)*.22*Math.sin(t*Math.PI),width=w*scale;
   c.drawImage(p,0,row*p.height/h,p.width,p.height/h,x+(w-width)*.66,y+row,width,1);
  }
 }
 facePlate(raw,closed=false){
  const look=sanitizeLook(raw),key=keys.filter(k=>k!=='hair').map(k=>look[k]).join('|')+'|'+closed;if(this.faces.has(key))return this.faces.get(key);
  const canvas=this.factory(512,512),c=canvas.getContext('2d');this.skin(c,look);
  const index=k=>NEW_FEATURES[k].find(v=>v.id===look[k]).index;
  this.feature(c,'brows-noses',Math.floor(index('brows')/3)*6+index('brows')%3,look.hairColor,'hair',276,201,134,18);
  this.feature(c,'eyes',index('eyeShape'),look.eyes,'eyes',276,232,135,closed?3:44);
  if(look.age==='older'){c.save();c.strokeStyle='#4c2d2566';c.lineWidth=1.4;for(const x of [220,321]){c.beginPath();c.moveTo(x,257);c.quadraticCurveTo(x+7,260,x+13,257);c.stroke();}c.restore();}
  this.feature(c,'brows-noses',Math.floor(index('nose')/3)*6+3+index('nose')%3,look.skin,'skin',290,259,22,24);
  if(look.facialHair!=='none'){
   const i=index('facialHair'),p=this.part('beards',i,look.hairColor),width=[174,174,174,180,178,178,178,174,76,82,104,24,68,80,112,180][i],s=width/p.width;
   const center=i<8||i===15?263:288,bottom=i<8?[311,312,315,321,317,319,333,313][i]:i===15?309:i===11?304:i>=12?279:315;
   const holes={2:[163,84],3:[170,97],4:[162,81],5:[160,86],6:[160.5,96],9:[95.5,57]},hole=holes[i];
   c.save();if(i<2){c.beginPath();c.moveTo(203,246);c.lineTo(350,246);c.quadraticCurveTo(363,292,289,307);c.quadraticCurveTo(223,308,203,281);c.closePath();c.clip();}
   c.drawImage(p,hole?288-hole[0]*s:center-width/2,hole?281-hole[1]*s:bottom-p.height*s,width,p.height*s);c.restore();
  }
  this.feature(c,'mouths',index('mouth'),null,'',288,281,48,22);
  return memo(this.faces,key,{image:canvas,bounds:[...HEAD_BOUNDS],origin:[...HEAD_ORIGIN]});
 }
 hair(look){
  if(look.hair==='none')return null;const item=NEW_HAIR.find(h=>h.id===look.hair),name=item.presentation+'-hair',p=this.part(name,item.index,look.hairColor),r=ARTWORK[name].frames[item.index];
  const col=item.index%5,row=Math.floor(item.index/5),cellX=Math.round(col*1402/5),cellY=Math.round(row*1122/4);
  const female=item.presentation==='female',s=female?1.2:1.1,sx=female&&[8,9,12,14].includes(item.index)?1.3:s,dx=female?66:256-140*s,dy=female?18+[0,65,65,60][row]+({15:-25,16:-10,19:-5}[item.index]||0):187-160*s;
  return {image:p,x:dx+(r[0]-cellX)*sx,y:dy+(r[1]-cellY)*s,w:p.width*sx,h:p.height*s};
 }
 plate(raw,closed=false){
  const look=sanitizeLook(raw),key=keys.map(k=>look[k]).join('|')+'|'+closed;if(this.cache.has(key))return this.cache.get(key);
  const canvas=this.factory(512,512),c=canvas.getContext('2d'),hair=this.hair(look);
  if(hair)c.drawImage(hair.image,hair.x,hair.y,hair.w,hair.h);
  c.drawImage(this.facePlate(look,closed).image,0,0);
  if(hair)c.drawImage(hair.image,hair.x,hair.y,hair.w,hair.h);
  return memo(this.cache,key,{image:canvas,origin:[...HEAD_ORIGIN]});
 }
 rearPlate(raw){
  const look=sanitizeLook(raw),key='rear|'+keys.map(k=>look[k]).join('|');if(this.cache.has(key))return this.cache.get(key);
  const canvas=this.factory(512,512),c=canvas.getContext('2d');this.skin(c,look);const hair=this.hair(look);
  if(hair){
   const scalp=this.factory(512,512),sc=scalp.getContext('2d');this.skin(sc,look);sc.globalCompositeOperation='source-in';sc.fillStyle=look.hairColor;sc.fillRect(150,112,212,167);sc.globalCompositeOperation='destination-in';sc.fillRect(150,112,212,167);c.drawImage(scalp,0,0);c.drawImage(hair.image,hair.x,hair.y,hair.w,hair.h);
  }
  return memo(this.cache,key,{image:canvas,origin:[...HEAD_ORIGIN]});
 }
 draw(c,look,anchor,scale,{closed=false}={}){
  if(!this.ready)return false;const p=this.plate(look,closed);c.save();c.translate(anchor[0],anchor[1]);c.rotate(anchor[2]||0);c.scale(scale,scale);c.drawImage(p.image,-p.origin[0],-p.origin[1]);c.restore();return true;
 }
}
