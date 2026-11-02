import {HERO_MATERIALS} from './assets/hero/material-data.mjs';
import {HERO_FEATURES} from './assets/hero/feature-data.mjs';

// One authored grayscale sheet, recolored once per material/color. No simulation
// object is retained or modified. The bounded cache is shared by previews/game.
const url=new URL('./assets/hero/ink-materials.png',import.meta.url);
const cache=new Map();let source=null,features=null,pending=null,error=null,makeCanvas=null;
export const HERO_MATERIAL_CACHE_LIMIT=48;
export function heroMaterialStatus(){return {ready:!!source,error,cacheEntries:cache.size,source:url.pathname};}
export async function prepareHeroMaterials({imageLoader,canvasFactory}={}){
 if(source)return true;if(pending)return pending;
 makeCanvas=canvasFactory||((w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}));
 const load=imageLoader||(u=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Hero material atlas failed to load'));im.src=u.href;}));
 pending=(async()=>{try{const [im,face]=await Promise.all([load(url),load(new URL('./assets/hero/face-features.png',import.meta.url))]);if(im.width!==HERO_MATERIALS.width||im.height!==HERO_MATERIALS.height||face.width!==HERO_FEATURES.width||face.height!==HERO_FEATURES.height)throw Error('Hero material atlas dimensions mismatch');source=im;features=face;return true;}catch(e){error=e.message;return false;}})();return pending;
}
export function heroMaterial(part,color){
 if(!source)return null;const key=part+color;
 if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
 const facePart=HERO_FEATURES.parts[part],rect=facePart||HERO_MATERIALS.parts[part];if(!rect)throw Error('Unknown hero material '+part);
 const [x,y,sw,sh]=rect,limit=facePart?(part.startsWith('eyes')||part.startsWith('brows')?128:64):160,factor=Math.min(1,limit/Math.max(sw,sh)),w=Math.max(1,Math.round(sw*factor)),h=Math.max(1,Math.round(sh*factor));
 const canvas=makeCanvas(w,h),c=canvas.getContext('2d',{willReadFrequently:true});c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(facePart?features:source,x,y,sw,sh,0,0,w,h);
 const data=c.getImageData(0,0,w,h),rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 for(let i=0;i<data.data.length;i+=4){if(!data.data[i+3])continue;const gray=(data.data[i]*.2126+data.data[i+1]*.7152+data.data[i+2]*.0722)/255;
  const skinFeature=part==='face'||part.startsWith('nose')||part.startsWith('mouth'),shade=gray/(skinFeature?.82:.64);for(let k=0;k<3;k++)data.data[i+k]=shade<=1?rgb[k]*shade:rgb[k]+(255-rgb[k])*Math.min(skinFeature?.25:.84,(shade-1)*(skinFeature?.8:1.45));
 }
 c.putImageData(data,0,0);cache.set(key,canvas);while(cache.size>HERO_MATERIAL_CACHE_LIMIT)cache.delete(cache.keys().next().value);return canvas;
}
export function paintHeroPart(c,part,color,x,y,w,h){const image=heroMaterial(part,color);if(!image)return false;c.drawImage(image,x,y,w,h);return true;}
export function paintHeroBone(c,part,color,a,b,width){
 const image=heroMaterial(part,color);if(!image)return false;const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
 c.save();c.translate(...a);c.rotate(Math.atan2(dy,dx)-Math.PI/2);c.drawImage(image,-width/2,-1,width,length+2);c.restore();return true;
}
// Rows follow the customized shoulder/waist/hip silhouette, keeping painted
// chest and fabric detail attached during torso twist instead of rigid overlays.
export function paintHeroTorso(c,p,color,presentation,back){
 const part=back?'torsoBack':presentation==='female'?'torsoFemale':'torsoMale',im=heroMaterial(part,color);if(!im)return false;
 const [sx,sy]=p.shoulder,[hx,hy]=p.hip,d=p.d,rows=16,start=im.height*.15,total=im.height-start;
 for(let i=0;i<rows;i++){const t=i/rows,mid=(i+.5)/rows,bodyX=sx+(hx-sx)*mid,width=mid<.7?d.shoulder+(d.hip*d.waist-d.shoulder)*Math.sin(mid/.7*Math.PI/2):d.hip*d.waist+(d.hip-d.hip*d.waist)*(mid-.7)/.3;
  const sourceWidth=im.width*(mid<.7?1-.31*mid/.7:.69+.09*(mid-.7)/.3),sourceX=(im.width-sourceWidth)/2;
  c.drawImage(im,sourceX,start+t*total,sourceWidth,total/rows,bodyX-width-1,sy+2+t*(hy-sy-1),width*2+2,(hy-sy-1)/rows+.3);
 }return true;
}
if(typeof Image!=='undefined'&&typeof document!=='undefined')prepareHeroMaterials();
