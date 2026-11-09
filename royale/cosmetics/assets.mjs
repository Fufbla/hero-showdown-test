import {TEMPLATE_ID,VIEWS,PARTS,PASSES,MASTER_ANCHORS} from './template.mjs';
const point=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
export function validateAsset(manifest){
 const errors=[];
 if(manifest?.template!==TEMPLATE_ID)errors.push('Unknown fitting template');
 if(!manifest?.atlas||typeof manifest.atlas.url!=='string'||!/^\.\/assets\/[a-zA-Z0-9/_-]+\.(png|webp)$/.test(manifest.atlas.url)||![manifest.atlas.width,manifest.atlas.height].every(n=>Number.isInteger(n)&&n>0&&n<=4096))errors.push('Invalid atlas');
 if(manifest?.covers&&(!Array.isArray(manifest.covers)||manifest.covers.some(k=>!['torso','arms','legs','gloves','belt','emblem','feet','boots','helmet','cape','mask'].includes(k))))errors.push('Invalid coverage regions');
 if(!Array.isArray(manifest?.layers)||!manifest.layers.length)errors.push('Missing layers');
 const directions=new Set(),keys=new Set();
 for(const layer of manifest?.layers||[]){
  directions.add(layer.view);const key=layer.view+':'+layer.part;
  if(keys.has(key))errors.push('Duplicate view/part '+key);keys.add(key);
  if(!VIEWS.includes(layer.view)||!PARTS.includes(layer.part)||!PASSES.includes(layer.pass))errors.push('Invalid layer '+key);
  if(layer.mirror===true)errors.push('Mirrored direction '+key);
  if(!Array.isArray(layer.rect)||layer.rect.length!==4||layer.rect.some(n=>!Number.isInteger(n))||layer.rect[0]<0||layer.rect[1]<0||layer.rect[2]<=0||layer.rect[3]<=0||layer.rect[0]+layer.rect[2]>manifest.atlas?.width||layer.rect[1]+layer.rect[3]>manifest.atlas?.height)errors.push('Out of atlas '+key);
  if(layer.offset&&!point(layer.offset))errors.push('Invalid offset '+key);
  if(layer.drape&&(![0,1].includes(layer.drape.nearHalf)||layer.part!=='skirt'))errors.push('Invalid cloth binding '+key);
  if(!point(layer.pivot)||!Object.hasOwn(MASTER_ANCHORS,layer.attach))errors.push('Invalid anchor '+key);
  if(!Number.isFinite(layer.scale)||layer.scale<=0||layer.scale>4)errors.push('Invalid scale '+key);
  if(layer.joint&&(!layer.end||!Object.hasOwn(MASTER_ANCHORS,layer.joint.attach)||!(layer.joint.fraction>0&&layer.joint.fraction<1)))errors.push('Invalid elbow/knee '+key);
  if(layer.end&&(!point(layer.end.pivot)||!Object.hasOwn(MASTER_ANCHORS,layer.end.attach)||layer.end.pivot.every((x,i)=>x===layer.pivot?.[i])))errors.push('Invalid bone '+key);
 }
 for(const view of VIEWS)if(!directions.has(view))errors.push('Missing direction '+view);
 return errors;
}
// Explicit asset references, lazy loads and bounded decoded image cache. Failed
// loads can be retried and never remove ownership or debit a wallet.
export class ClothingAssets{
 constructor({loadImage,limit=24}={}){this.loadImage=loadImage||((url)=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Clothing artwork unavailable'));image.src=url;}));this.limit=Math.max(1,limit);this.cache=new Map();this.pending=new Map();}
 async load(manifest){
  const errors=validateAsset(manifest);if(errors.length)throw Error(errors.join('; '));
  const key=manifest.atlas.url;
  if(this.cache.has(key)){const entry=this.cache.get(key);this.cache.delete(key);this.cache.set(key,entry);return entry;}
  if(this.pending.has(key))return this.pending.get(key);
  const request=this.loadImage(new URL(key,import.meta.url).href).then(image=>{
   if(image.width!==manifest.atlas.width||image.height!==manifest.atlas.height)throw Error('Atlas size mismatch');
   this.cache.set(key,image);while(this.cache.size>this.limit)this.cache.delete(this.cache.keys().next().value);return image;
  }).finally(()=>this.pending.delete(key));this.pending.set(key,request);return request;
 }
}
