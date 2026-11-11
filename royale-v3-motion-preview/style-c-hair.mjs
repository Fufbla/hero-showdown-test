import {HAIR_FIT_CORRECTIONS} from './hair-fit-corrections.mjs';
import {HAIR_REFERENCE_V3,HAIR_REFERENCE_IDS,hairReferenceURL} from './hair-reference-v3.mjs';
import {createReferenceHair,drawReferenceHair} from './hair-reference-material.mjs';
import {BUZZ_REFERENCE} from './buzz-reference.mjs';
// Each non-bald style has three independently illustrated turnaround sprites.
// Pack rectangles measure source pixels. Draw origins use reference head-space,
// where the eyes are at y=0 and the natural temple width is about 36 units.
import {hairDefinition} from './hair-catalog.mjs';
import {HAIR_DENSITY, HAIR_FRAMES} from './assets/hero/style-c-accurate/hair/frames.mjs';
import {HAIR_FITS} from './assets/hero/style-c-accurate/hair/fit.mjs';

const LEGACY = {
  curls:{texture:'curl',length:8}, locs:{texture:'loc',length:28},
  short:{texture:'straight',length:0}, waves:{texture:'wave',length:4},
  ponytail:{texture:'wave',length:31}, braids:{texture:'braid',length:31},
};
export const styleCHairDefinition = id => hairDefinition(id) || LEGACY[id];
const views = ['front','side','back'];
const materials = new Map();
const ART_ROOT = './assets/hero/style-c-accurate/hair/';
const MAX_MATERIALS = 32;
let atlases, shortReference, referenceImages, makeCanvas, loading, lastError = null;
const clamp = (value,min=0,max=1) => Math.max(min,Math.min(max,value));
const webCanvas = (w,h) => typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w,h) :
  Object.assign(document.createElement('canvas'),{width:w,height:h});
const loadWebImage = url => new Promise((resolve,reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Could not load the illustrated hair atlas.'));
  image.src = url.href;
});

export function styleCHairStatus() {
  return {ready:!!atlases, error:lastError, styles:Object.keys(HAIR_FRAMES.front).length+1,
    directions:4, materials:materials.size, limit:MAX_MATERIALS};
}

export async function prepareStyleCHair({imageLoader=loadWebImage,canvasFactory=webCanvas}={}) {
  if (atlases) return true;
  if (loading) return loading;
  makeCanvas = canvasFactory;
  loading = (async () => {
    try {
      const images = await Promise.all([...views.map(view => imageLoader(new URL(ART_ROOT+view+'.webp',import.meta.url))),imageLoader(new URL(BUZZ_REFERENCE.file,import.meta.url)),...HAIR_REFERENCE_IDS.map(id=>imageLoader(hairReferenceURL(id)))]);
      atlases = Object.fromEntries(views.map((view,i) => [view,images[i]]));
      shortReference=images[3];
      referenceImages=Object.fromEntries(HAIR_REFERENCE_IDS.map((id,i)=>[id,images[i+4]]));
      lastError = null;
      return true;
    } catch (error) {
      lastError = error.message;
      return false;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

function colorRamp(color) {
  const target = [1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
  const outline = target.map((channel,i)=>Math.min([16,13,22][i],3+channel*.115));
  const highlight = target.map((channel,i)=>channel+(255-channel)*[.46,.41,.48][i]);
  return Array.from({length:256},(_,v)=>{
    if (v<=112) {
      const light = v/112;
      return target.map((channel,i)=>outline[i]+(channel-outline[i])*light);
    }
    const light = (v-112)/143;
    return target.map((channel,i)=>channel+(highlight[i]-channel)*light);
  });
}

function band(y, top, bottom) {
  return clamp((bottom-y)/(bottom-top));
}
function sections(view, x, y) {
  // All of the rear crown, down to the nape, covers the bare occiput.
  // Forward views leave both eye sockets clear while retaining the temples.
  const temple = clamp((Math.abs(x)-9)/10);
  const threshold = view==='back' ? 19 : -9.5+temple*temple*20;
  return [band(y,threshold,threshold+1),1-band(y,threshold-1.5,threshold-.5)];
}

function referenceShortMaterial(look,view){
  const [sx,sy,sw,sh]=BUZZ_REFERENCE.frames[view];
  const [left,top,width,height]=BUZZ_REFERENCE.fits[view][look.presentation];
  // Cache at four pixels per head unit rather than retaining full-sheet-sized
  // tinted copies for every color. Registration and tinting happen only once.
  const w=Math.ceil(width*4),h=Math.ceil(height*4),front=makeCanvas(w,h),rear=makeCanvas(w,h);
  const c=front.getContext('2d',{willReadFrequently:true});c.drawImage(shortReference,sx,sy,sw,sh,0,0,w,h);
  const im=c.getImageData(0,0,w,h),px=im.data,colors=colorRamp(look.hairColor);
  // Feed the illustrated lighting through the existing hair-color ramp. The
  // saved color remains authoritative, with the original controls unchanged.
  for(let i=0;i<px.length;i+=4)if(px[i+3]){
    const light=px[i]*.2126+px[i+1]*.7152+px[i+2]*.0722;
    const color=colors[Math.round(clamp(light*112/40,0,255))];
    for(let k=0;k<3;k++)px[i+k]=color[k];
  }
  c.putImageData(im,0,0);
  let fitted=front;
  if(view==='front'){
    fitted=makeCanvas(w,h);
    const fc=fitted.getContext('2d'),split=-left/width*w;
    fc.drawImage(front,0,0,split,h,0,0,split,h);
    fc.drawImage(front,split,0,w-split,h,split,0,(w-split)*BUZZ_REFERENCE.farTempleScale[look.presentation],h);
  }
  // This close cut already has authored forehead/ear openings. A generic
  // long-hair split would cut through its curved hairline and temple points.
  return {front:fitted,rear,left,top,w:width,h:height};
}

function hairMaterial(look,view) {
  const frame = HAIR_FRAMES[view==='left'?'side':view][look.hair];
  if (!atlases || !frame) return null;
  const key = view+'|'+look.hair+'|'+look.hairColor+'|'+look.presentation;
  if (materials.has(key)) {
    const cached=materials.get(key);
    materials.delete(key); materials.set(key,cached);
    return cached;
  }
  if(HAIR_REFERENCE_V3[look.hair]){
    const value=createReferenceHair(look,view,referenceImages[look.hair],makeCanvas,colorRamp);
    while(materials.size>=MAX_MATERIALS)materials.delete(materials.keys().next().value);
    materials.set(key,value);return value;
  }
  if(look.hair==='buzz'){
    const value=referenceShortMaterial(look,view);
    while(materials.size>=MAX_MATERIALS)materials.delete(materials.keys().next().value);
    materials.set(key,value);return value;
  }
  const [sx,sy,w,h,rawLeft,rawTop] = frame;
  const fit=HAIR_FITS[view][look.hair], offset=look.presentation==='female'?4:0;
  const [ex,ey,dx,dy]=fit.slice(offset,offset+4);
  const correction=HAIR_FIT_CORRECTIONS[look.hair]?.[view];
  const originalLeft=rawLeft*ex+dx;
  const left=originalLeft+(correction?.x||0), top=rawTop*ey+dy;
  const front=makeCanvas(w,h), rear=makeCanvas(w,h);
  const fc=front.getContext('2d',{willReadFrequently:true}), rc=rear.getContext('2d');
  fc.save();if(correction?.mirror){fc.translate(w,0);fc.scale(-1,1);}
  fc.drawImage(atlases[view],sx,sy,w,h,0,0,w,h);fc.restore();
  const f=fc.getImageData(0,0,w,h), r=rc.createImageData(w,h), colors=colorRamp(look.hairColor);
  for (let y=0,i=0;y<h;y++) {
    const localY=top+(y+.5)*ey/HAIR_DENSITY;
    for (let x=0;x<w;x++,i+=4) {
      const alpha=f.data[i+3];
      if (!alpha) continue;
      // Lossless grayscale encodes fiber luminance. Colored pixels encode the
      // metal cuffs, which retain their own material under every hair color.
      const metal=f.data[i]-f.data[i+2]>40 && f.data[i+1]-f.data[i+2]>14;
      if (!metal) {
        const rgb=colors[f.data[i]];
        for (let k=0;k<3;k++) f.data[i+k]=rgb[k];
      }
      const [frontAlpha,rearAlpha]=sections(view,left+(x+.5)*ex/HAIR_DENSITY,localY);
      for (let k=0;k<3;k++) r.data[i+k]=f.data[i+k];
      f.data[i+3]=alpha*frontAlpha; r.data[i+3]=alpha*rearAlpha;
    }
  }
  fc.putImageData(f,0,0); rc.putImageData(r,0,0);
  const value={front,rear,left,top,w:w*ex/HAIR_DENSITY,h:h*ey/HAIR_DENSITY};
  while (materials.size>=MAX_MATERIALS) materials.delete(materials.keys().next().value);
  materials.set(key,value);
  return value;
}

export function drawStyleCHair(context,look,motion,time,layer='front',direction='front') {
  if (look.hair==='none') return true;
  const view=direction==='left' && HAIR_REFERENCE_V3[look.hair] ? 'left' : direction===true || direction==='back' ? 'back' :
    direction==='side' || direction==='left' || direction==='right' || direction==='game' ? 'side' : 'front';
  const art=hairMaterial(look,view);
  if (!art) return false;
  if (look.helmet && layer==='front') return true;
  context.save();
  if(look.headwearCoverage==='tucked'){context.beginPath();context.rect(-200,0,400,400);context.clip();}
  if(art.reference){drawReferenceHair(context,art,layer,motion,time);context.restore();return true;}
  if (layer==='rear') {
    const length=styleCHairDefinition(look.hair)?.length??0;
    // The root stays seated against the scalp as long ends lag during turns.
    const flex=clamp(length/30), shear=clamp(motion?.wind||0,-7,7)*.014*flex;
    const stretch=1+clamp(motion?.bounce||0,-2,2)*.012*flex;
    context.transform(1,0,shear,stretch,shear*6,(stretch-1)*6);
  }
  context.drawImage(art[layer],art.left,art.top,art.w,art.h);
  context.restore();
  return true;
}
