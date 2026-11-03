import {STYLE_C_FEATURES} from './assets/hero/style-c-features.mjs';
import {STYLE_C_PARTS} from './assets/hero/style-c-parts.mjs';
import {prepareStyleCBody} from './style-c-body.mjs';
import {prepareStyleCFace} from './style-c-face.mjs';
import {prepareStyleCHair} from './style-c-hair.mjs';
import {prepareStyleCMotion} from './style-c-motion.mjs';
import {prepareFireballArt,prepareSteelArt} from './power-armor-art.mjs';
import {prepareStyleCEquipment} from './style-c-equipment.mjs';
import {prepareTurnarounds} from './style-c-turnaround.mjs';
import {prepareDefaultSprites} from './style-c-sprites.mjs';
const url=new URL('./assets/hero/style-c-parts.png',import.meta.url),cache=new Map();
let source=null, features=null, pending=null, makeCanvas=null, error=null, ready=false;
export const STYLE_C_TEXTURE_LIMIT=64;
export const styleCTextureStatus=()=>({ready,error,entries:cache.size,limit:STYLE_C_TEXTURE_LIMIT});
export function setStyleCCanvas(factory){if(factory)makeCanvas=factory;}
export async function prepareStyleCMaterials({imageLoader,canvasFactory}={}){
 if(ready)return true;
 if(pending)return pending;
 makeCanvas=canvasFactory||makeCanvas||((w,h)=>typeof OffscreenCanvas!=='undefined'?
   new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h}));
 const load=imageLoader||(u=>new Promise((resolve,reject)=>{
   const im=new Image(); im.onload=()=>resolve(im); im.onerror=()=>reject(Error('Could not load '+u.pathname.split('/').at(-1))); im.src=u.href;
 }));
 const options={canvasFactory:makeCanvas,imageLoader:load};
 pending=(async()=>{
   try {
     const packs={body:prepareStyleCBody,face:prepareStyleCFace,hair:prepareStyleCHair,motion:prepareStyleCMotion,
       equipment:prepareStyleCEquipment,fireballArmor:prepareFireballArt,steelArmor:prepareSteelArt,turnarounds:prepareTurnarounds,sprites:prepareDefaultSprites};
     const [im,featuresImage,results]=await Promise.all([load(url),load(new URL('./assets/hero/style-c-features.png',import.meta.url)),
       Promise.all(Object.entries(packs).map(async ([name,prepare])=>[name,await prepare(options)]))]);
     const missing=results.filter(([,ok])=>!ok).map(([name])=>name);
     if(missing.length)throw Error('Could not load hero art: '+missing.join(', '));
     if(im.width!==STYLE_C_PARTS.width||im.height!==STYLE_C_PARTS.height)throw Error('Unexpected Style C atlas dimensions');
     source=im;features=featuresImage;ready=true;error=null;return true;
   }catch(e){error=e.message;pending=null;return false;}
 })();return pending;
}
export function styleCMaterial(part,color){
 if(!source)return null;const key=part+color;if(cache.has(key)){const im=cache.get(key);cache.delete(key);cache.set(key,im);return im;}
 const feature=STYLE_C_FEATURES.parts[part],r=feature||STYLE_C_PARTS.parts[part];if(!r)throw Error('Unknown Style C material: '+part);
 const [x,y,sw,sh]=r,f=Math.min(1,160/Math.max(sw,sh)),w=Math.ceil(sw*f),h=Math.ceil(sh*f),canvas=makeCanvas(w,h),c=canvas.getContext('2d',{willReadFrequently:true});
 c.drawImage(feature?features:source,x,y,sw,sh,0,0,w,h);const data=c.getImageData(0,0,w,h),rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)),skin=part.startsWith('face')||part.startsWith('nose')||part.startsWith('mouth')||part==='upperArm';
 for(let i=0;i<data.data.length;i+=4){if(!data.data[i+3])continue;const gray=(data.data[i]*.2126+data.data[i+1]*.7152+data.data[i+2]*.0722)/255,shade=gray/(skin?.69:.59);
  if(part.startsWith('eyes')){if(gray>.12&&gray<.8)for(let k=0;k<3;k++)data.data[i+k]=rgb[k]*gray*1.75;continue;}
  for(let k=0;k<3;k++)data.data[i+k]=shade<=1?rgb[k]*shade:rgb[k]+(255-rgb[k])*Math.min(skin?.23:.8,(shade-1)*(skin?.55:1.15));}
 c.putImageData(data,0,0);cache.set(key,canvas);while(cache.size>STYLE_C_TEXTURE_LIMIT)cache.delete(cache.keys().next().value);return canvas;
}
export function paintStyleCPart(c,part,color,x,y,w,h){const im=styleCMaterial(part,color);if(!im)return false;c.drawImage(im,x,y,w,h);return true;}
export function paintStyleCBone(c,part,color,a,b,width){const im=styleCMaterial(part,color);if(!im)return false;c.save();c.translate(...a);c.rotate(Math.atan2(b[1]-a[1],b[0]-a[0])-Math.PI/2);c.drawImage(im,-width/2,-1,width,Math.hypot(b[0]-a[0],b[1]-a[1])+2);c.restore();return true;}
export function paintStyleCTorso(c,p,color,presentation){const im=styleCMaterial(presentation==='female'?'torsoFemale':'torsoMale',color);if(!im)return false;
 const [sx,sy]=p.shoulder,[hx,hy]=p.hip,d=p.d;
 // Crop the source collar/pauldrons; independent shoulders and neck use the
 // same rig anchors. Twelve strips deform the painted chest into the waist.
 for(let i=0;i<12;i++){const t=i/12,m=(i+.5)/12,half=m<.7?d.shoulder+(d.hip*d.waist-d.shoulder)*m/.7:d.hip*d.waist+(d.hip-d.hip*d.waist)*(m-.7)/.3;
  const sw=im.width*(presentation==='female'?.78:.65),xx=sx+(hx-sx)*m;
  c.drawImage(im,(im.width-sw)/2,im.height*(.23+t*.73),sw,im.height*.73/12,xx-half,sy+2+t*(hy-sy-2),half*2,(hy-sy-2)/12+.25);}
 return true;
}
if(typeof Image!=='undefined')void prepareStyleCMaterials();
