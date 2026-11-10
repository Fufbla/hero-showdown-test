// Derive a restrained fabric backing from the *approved* costume artwork.
// One read per decoded atlas layer, cached by image identity. Nothing is saved,
// uploaded or recolored in the garment itself.
const tones=new WeakMap();
const clamp=n=>Math.max(0,Math.min(255,Math.round(n)));
const hex=n=>clamp(n).toString(16).padStart(2,'0');
const paint=(color,amount)=>'#'+color.map(v=>hex(v*amount)).join('');

// A weighted, opacity-aware swatch prefers actual fabric over transparent
// atlas margins. Brightness is reduced for the invisible seam underlay only.
export function fabricColorsFromPixels(data){
 if(!data||!data.length)return null;
 let red=0,green=0,blue=0,count=0;
 for(let i=0;i+3<data.length;i+=4){
  const alpha=data[i+3]/255;
  if(alpha<.65)continue;
  const r=data[i],g=data[i+1],b=data[i+2];
  // Skip tiny specular whites and nearly pure black ink linework; retain
  // real black fabric by accepting low chroma when a material is dark.
  const brightest=Math.max(r,g,b),darkest=Math.min(r,g,b);
  if(brightest>247&&darkest>235)continue;
  if(brightest<18)continue;
  red+=r*alpha;green+=g*alpha;blue+=b*alpha;count+=alpha;
 }
 if(count<4)return null;
 const rgb=[red/count,green/count,blue/count];
 return Object.freeze({suit:paint(rgb,.83),trim:paint(rgb,1.05),emblemColor:paint(rgb,.83)});
}
function canvas(){
 if(typeof OffscreenCanvas==='function')return new OffscreenCanvas(12,12);
 if(typeof document!=='undefined'&&typeof document.createElement==='function'){
  const el=document.createElement('canvas');el.width=12;el.height=12;return el;
 }
 return null;
}
function sample(image,layer){
 const surface=canvas();if(!surface)return null;
 try{
  const c=surface.getContext('2d',{willReadFrequently:true});
  if(!c)return null;
  const [x,y,w,h]=layer.rect;
  c.clearRect(0,0,12,12);
  c.drawImage(image,x,y,w,h,0,0,12,12);
  return fabricColorsFromPixels(c.getImageData(0,0,12,12).data);
 }catch{return null;}
}
const regionPart=Object.freeze({
 torso:['torso'],arms:['upperArmNear','upperArmFar','forearmNear','forearmFar'],
 legs:['thighNear','thighFar','shinNear','shinFar','skirt']
});
export function garmentLining(piece,region,fallback){
 const {image,manifest}=piece||{};
 if(!image||!manifest?.layers)return fallback;
 let cache=tones.get(image);
 if(!cache){cache=new Map();tones.set(image,cache);}
 const key=String(piece.id||'')+':'+region;
 if(cache.has(key))return cache.get(key)||fallback;
 const preferred=regionPart[region]||[];
 const layer=manifest.layers.find(l=>l.view==='front'&&preferred.includes(l.part));
 const tone=layer?sample(image,layer):null;
 cache.set(key,tone);
 return tone||fallback;
}
export const FABRIC_TONE_VERSION='approved-atlas-contact-lining-v1';
