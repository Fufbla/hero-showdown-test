import {separateNativeHair} from './native-hair-mattes.mjs';
import {headRegistration} from './style-c-head.mjs';
import {STYLE_C_DEFAULTS} from './style-c-defaults.mjs';
import {HAIR_FIT_CORRECTIONS} from './hair-fit-corrections.mjs';
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
let atlases, nativeFront, nativeTurns, makeCanvas, loading, lastError = null;
const clamp = (value,min=0,max=1) => Math.max(min,Math.min(max,value));
const webCanvas = (w,h) => typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w,h) :
  Object.assign(document.createElement('canvas'),{width:w,height:h});
const loadWebImage = url => new Promise((resolve,reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Could not load the illustrated hair atlas.'));
  image.src = url.href;
});

// Original direction plates are separated with alpha mattes; material IDs
// remove neck/costume remnants. Hair and gold cuffs retain their original RGB.
export function registerNativeTurnaroundHair(art,mask,models){nativeTurns={art,mask,models};materials.clear();}

export function styleCHairStatus() {
  return {ready:!!atlases, error:lastError, styles:Object.keys(HAIR_FRAMES.front).length+1,
    directions:views.length, materials:materials.size, limit:MAX_MATERIALS};
}

export async function prepareStyleCHair({imageLoader=loadWebImage,canvasFactory=webCanvas}={}) {
  if (atlases) return true;
  if (loading) return loading;
  makeCanvas = canvasFactory;
  loading = (async () => {
    try {
      const images = await Promise.all(views.map(view => imageLoader(new URL(ART_ROOT+view+'.webp',import.meta.url))));
      // The approved default ponytail/locs have exact transparent hair plates.
      // Keep that artwork, but never draw the old face or full-character sprite.
      const originals=await Promise.all(['male','female'].map(sex=>imageLoader(new URL('./assets/hero/style-c-accurate/face/'+sex+'.png',import.meta.url))));
      nativeFront=Object.fromEntries(['male','female'].map((sex,i)=>[sex,originals[i]]));
      atlases = Object.fromEntries(views.map((view,i) => [view,images[i]]));
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

function hairMaterial(look,view) {
  const frame = HAIR_FRAMES[view][look.hair];
  if (!atlases || !frame) return null;
  const key = view+'|'+look.hair+'|'+look.hairColor+'|'+look.presentation;
  if (materials.has(key)) {
    const cached=materials.get(key);
    materials.delete(key); materials.set(key,cached);
    return cached;
  }
  let [sx,sy,w,h,rawLeft,rawTop] = frame;
  const fit=HAIR_FITS[view][look.hair], offset=look.presentation==='female'?4:0;
  let [ex,ey,dx,dy]=fit.slice(offset,offset+4);
  let source=atlases[view],native=false,turnMask=null,turnModel=null;
  let correction=HAIR_FIT_CORRECTIONS[look.hair]?.[view];
  if(view==='front'&&look.hair===STYLE_C_DEFAULTS[look.presentation].hair){
    native=true;source=nativeFront[look.presentation];w=source.width/3;h=source.height/3;sx=w;sy=h*2;
    const unit=headRegistration(look,view).unit;
    ex=ey=HAIR_DENSITY/(2*unit);dx=dy=0;correction=null;
    const origin=look.presentation==='female'?[-172,-148]:[-130,-139];
    rawLeft=origin[0]/unit/ex;rawTop=origin[1]/unit/ey;
  }
  if(view!=='front'&&nativeTurns&&look.hair===STYLE_C_DEFAULTS[look.presentation].hair){
    native=true;source=nativeTurns.art;turnMask=nativeTurns.mask;turnModel=nativeTurns.models[look.presentation+'-'+view];
    let left,top;[sx,sy,w,h,left,top]=turnModel.parts.head;
    const unit=headRegistration(look,view).unit;ex=ey=HAIR_DENSITY/unit;dx=dy=0;correction=null;
    rawLeft=(left-turnModel.head[0])/HAIR_DENSITY;rawTop=(top-turnModel.head[1])/HAIR_DENSITY;
  }
  const left=rawLeft*ex+dx+(correction?.x||0), top=rawTop*ey+dy+(correction?.y||0);
  const front=makeCanvas(w,h), rear=makeCanvas(w,h);
  const fc=front.getContext('2d',{willReadFrequently:true}), rc=rear.getContext('2d');
  fc.save();if(correction?.mirror){fc.translate(w,0);fc.scale(-1,1);}
  fc.drawImage(source,sx,sy,w,h,0,0,w,h);fc.restore();
  if(turnMask)separateNativeHair(fc,look.presentation,view);
  const f=fc.getImageData(0,0,w,h), r=rc.createImageData(w,h), colors=colorRamp(look.hairColor);
  const target=[1,3,5].map(j=>parseInt(look.hairColor.slice(j,j+2),16));
  const nativeBase=[1,3,5].map(j=>parseInt(STYLE_C_DEFAULTS[look.presentation].hairColor.slice(j,j+2),16));
  for (let y=0,i=0;y<h;y++) {
    const localY=top+(y+.5)*ey/HAIR_DENSITY;
    for (let x=0;x<w;x++,i+=4) {
      if(turnMask&&view==='back'){
        const id=turnMask[((sy+y)*source.width+sx+x)*4];
        // The rear plates also included a few pixels of the original neck and
        // cape. Those belong to body layers, never to the hairstyle.
        if(look.presentation==='male'&&y>139&&id===1||look.presentation==='female'&&y>173&&[3,4,5].includes(id))f.data[i+3]=0;
      }
      const alpha=f.data[i+3];
      if (!alpha) continue;
      // Lossless grayscale encodes fiber luminance. Colored pixels encode the
      // metal cuffs, which retain their own material under every hair color.
      const metal=f.data[i]-f.data[i+2]>40 && f.data[i+1]-f.data[i+2]>14;
      if (!metal) {
        if(native){
          for(let k=0;k<3;k++)f.data[i+k]=clamp(f.data[i+k]*(target[k]+17)/(nativeBase[k]+17),0,255);
        }else{
          const rgb=colors[f.data[i]];
          for(let k=0;k<3;k++)f.data[i+k]=rgb[k];
        }
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
  const view=direction===true || direction==='back' ? 'back' :
    direction==='side' || direction==='left' || direction==='right' || direction==='game' ? 'side' : 'front';
  const art=hairMaterial(look,view);
  if (!art) return false;
  if (look.helmet && layer==='front') return true;
  context.save();
  if(look.headwearCoverage==='tucked'){context.beginPath();context.rect(-200,0,400,400);context.clip();}
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
