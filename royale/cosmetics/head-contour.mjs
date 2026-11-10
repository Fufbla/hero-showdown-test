// Phase E: contour-fitting 2D headgear directly to the animated skull.
// Instead of pasting one rectangular atlas cutout over a finished character,
// paint narrow fabric bands with distinct crown, temple, cheek and jaw widths.
// The source image stays untouched. The front drawing is mirrored by the game.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const group=names=>new Set(names.split(' ').filter(Boolean));
const wraps=group('ninja-warrior athletic mummy gingerbread cat-burglar');
const hoods=group('mystic-robe werewolf dark-reaper reindeer pumpkin-knight');
const brims=group('explorer witch scarecrow pilgrim-hero toy-soldier');
const ornaments=group('royal-kimono royal-gown harvest-festival festival');
const facialModes=Object.freeze({
 'ninja-warrior.accessory':'mask',
 'street-style.accessory':'glasses',
 'tech-specialist.accessory':'glasses',
 'snow-hero.accessory':'glasses',
 'casual-hoodie.accessory':'headphones'
});
export const HEAD_CONTOUR_VERSION='2d-skull-jaw-wrapping-v1';

export function headContourMode(piece={},layer={}){
 if(layer.view!=='front'||layer.attach!=='head')return null;
 if(piece.category==='headwear'&&layer.part==='headwear'){
  const collection=String(piece.id||'').split('.')[0];
  if(wraps.has(collection))return 'wrap';
  if(hoods.has(collection)||layer.faceOpening)return 'hood';
  if(brims.has(collection))return 'brim';
  if(ornaments.has(collection))return 'ornament';
  return 'cap';
 }
 return facialModes[piece.id]||null;
}
export function contourRowWidth(mode,t){
 t=clamp(t,0,1);
 if(mode==='mask')return 1-.24*Math.pow(t,1.55); // full cheeks, tapered chin
 if(mode==='wrap')return .86+.14*Math.sin(Math.PI*clamp(.12+.80*t,0,1));
 if(mode==='hood')return t<.30?.95+.05*t/.30:1-.09*(t-.30)/.70;
 if(mode==='cap')return t<.50?1-.055*(.50-t)*2:1-.095*(t-.50)*2;
 if(mode==='brim')return t<.65?1:1-.085*(t-.65)/.35; // keep broad brim
 if(mode==='ornament')return t<.50?1:1-.05*(t-.50)*2;
 if(mode==='glasses')return 1-.045*Math.abs(t-.5)*2;
 if(mode==='headphones')return 1-.035*Math.abs(t-.5)*2;
 return 1;
}
// Face accessories share the SAME projected centre as the model's facial
// features, instead of headwear's crown pivot. Eyewear stays above the nose;
// a scarf wraps the cheeks and narrows toward the chin without covering eyes.
export function fitHeadAccessory(layer,fit,piece,pose,facing){
 if(facing!==1&&facing!==-1)return fit;
 const mode=headContourMode(piece,layer);
 if(!['mask','glasses','headphones'].includes(mode))return fit;
 if(!pose?.faceCenter||!pose?.head)return fit;
 const faceWidth=(Number.isFinite(pose.faceWidth)&&Number.isFinite(pose.unitScale))
  ?pose.faceWidth*pose.unitScale:31.5;
 const sourceWidth=layer.rect[2]*layer.scale;
 const sourceHeight=layer.rect[3]*layer.scale;
 if(!(sourceWidth>0&&sourceHeight>0))return fit;
 const desiredWidth=faceWidth*(mode==='mask'?.91:mode==='glasses'?.94:1.06);
 const desiredHeight=faceWidth*(mode==='mask'?.43:mode==='glasses'?.24:.75);
 const mouthOffset=mode==='mask'?8:mode==='glasses'?-5:-8;
 const seatedX=pose.faceCenter[0]-(pose.head[0]||0);
 const seatedY=pose.faceCenter[1]-(pose.head[1]||0)+mouthOffset;
 return {
  ...fit,
  width:clamp(desiredWidth/sourceWidth,.55,2),
  height:clamp(desiredHeight/sourceHeight,.45,1.8),
  offset:[seatedX-(layer.offset?.[0]||0),seatedY-(layer.offset?.[1]||0)]
 };
}
// Drawing returns false for ordinary body accessories and unused side/back art.
export function drawContouredHead(ctx,image,layer,at,fit,piece,pose){
 const mode=headContourMode(piece,layer);
 if(!mode||!image)return false;
 const [sx,sy,w,h]=layer.rect;
 const scaleX=layer.scale*fit.width,scaleY=layer.scale*fit.height;
 if(!(scaleX>0&&scaleY>0))return false;
 const slices=mode==='mask'?18:mode==='hood'?20:14;
 const center=at[0]+(w*.5-layer.pivot[0])*scaleX;
 const top=at[1]-layer.pivot[1]*scaleY;
 const totalWidth=w*scaleX,totalHeight=h*scaleY;
 // All strips share a centre, so no sticker-like side flare when rotating.
 // Draw consecutive horizontal source bands with fractional overlap to avoid
 // hairline seams caused by bilinear scaling on a moving canvas.
 for(let i=0;i<slices;i++){
  const from=Math.round(i*h/slices),to=Math.round((i+1)*h/slices);
  if(to<=from)continue;
  const f=contourRowWidth(mode,(i+.5)/slices);
  const dw=totalWidth*f;
  const y=top+from*scaleY;
  const dh=(to-from)*scaleY+Math.min(.22,scaleY*.5);
  ctx.drawImage(image,sx,sy+from,w,to-from,center-dw/2,y,dw,dh);
 }
 return true;
}
