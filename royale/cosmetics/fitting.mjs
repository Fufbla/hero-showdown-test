// Phase A — shared, render-only garment fitting for every released clothing set.
// Keep the original atlases and saved hero data unchanged. Fit to the *current*
// animated pose, so idle, attacks and all four directions share one body rig.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const distance=(a,b)=>a&&b?Math.hypot(a[0]-b[0],a[1]-b[1]):0;
const safe=(n,otherwise)=>Number.isFinite(n)&&n>0?n:otherwise;

// A garment's registered pivot stays on its bone. Only its cross-sectional
// width is tailored; changing length would pull sleeves/pants away from joints.
export function fitClothingLayer(layer,pose,anchors,baseScale){
 const measured=layer.fit||{};
 const shoulders=distance(anchors.shoulderNear,anchors.shoulderFar);
 const hips=distance(anchors.hipNear,anchors.hipFar);
 const span=safe(shoulders,safe(hips*1.8,28));
 const part=layer.part;
 let target=0,min=.72,max=1.55;
 if(part==='torso'){
   target=span*(layer.view==='right'||layer.view==='left'?.88:.99);
   min=.78;max=1.85;
 }else if(part.startsWith('upperArm')||part.startsWith('forearm')){
   target=span*.40;min=.75;max=1.38;
 }else if(part.startsWith('thigh')||part.startsWith('shin')){
   target=Math.max(hips*.93,span*.46);min=.76;max=1.37;
 }else if(part.startsWith('foot')){
   target=Math.max(hips*.95,span*.50);min=.68;max=1.15;
 }else if(part==='headwear'){
   target=Math.max(20,span*1.06);min=.70;max=1.22;
 }else if((part==='accessory'||part.startsWith('hand'))&&layer.attach==='head'){
   target=Math.max(18,span*.90);min=.73;max=1.25;
 }
 const sourceWidth=layer.rect?.[2]*safe(baseScale,1);
 const automatic=target&&sourceWidth?clamp(target/sourceWidth,min,max):1;
 // A tailor's manual adjustment may narrow an item further, but oversized
 // artwork is still bounded by the animated body. Explicit overrides remain
 // available for intentionally loose styles in future category tuning.
 const custom=Number.isFinite(measured.width)?measured.width:null;
 const width=custom===null?automatic:target?Math.min(custom,automatic*1.09):custom;
 return {
   width:clamp(safe(width,1),.55,2),
   height:safe(measured.height,1),
   offset:Array.isArray(measured.offset)?measured.offset:[0,0]
 };
}

// Public for automated tests and future per-set art fitting. No gameplay,
// armor, coin, ownership, or cloud save data is read or changed here.
export const FITTING_VERSION='all-outfits-body-fit-v1';
