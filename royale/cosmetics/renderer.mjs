import {attachmentPoints} from './template.mjs';
import {fitClothingLayer} from './fitting.mjs';
import {fitGameplayHeadwear} from './headwear-2d.mjs';
import {fitHeadAccessory,drawContouredHead} from './head-contour.mjs';
import {jointClipShift,drawContactShadow,garmentLight} from './polish.mjs';
// Coverage is computed only for fully loaded garments, never preview state.
export {clothingCoverage} from './visibility.mjs';
export const clothingHair=layers=>layers.some(({manifest,image})=>image&&manifest.hair==='hidden')?'hidden':layers.some(({manifest,image})=>image&&manifest.hair==='tucked')?'tucked':null;
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const angle=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0]);
function stamp(ctx,image,layer,at,pivot,end,sourceEnd,cut,fit){
 const [sx,sy,w,h]=layer.rect;
 const scale=end?distance(at,end)/distance(pivot,sourceEnd):layer.scale;
 const rotation=end?angle(at,end)-angle(pivot,sourceEnd):0;
 // Cross-section follows the animated hero; length follows the actual bone.
 const width=(layer.fixedWidth?layer.scale:scale)*fit.width;
 const height=scale*(layer.end?1:fit.height);
 ctx.save();ctx.translate(...at);ctx.rotate(rotation);ctx.scale(width,height);
 if(cut){
  // Split a sleeve at the animated elbow in source space. Both halves share
  // the exact seam, preserving artwork while bending with the same hero bones.
  const start=layer.pivot,finish=layer.end.pivot,theta=angle(start,finish),dx=Math.cos(theta),dy=Math.sin(theta),nx=-dy,ny=dx;
  const mid=[start[0]+(finish[0]-start[0])*layer.joint.fraction, start[1]+(finish[1]-start[1])*layer.joint.fraction];
  const extent=Math.max(w,h)*4,sign=cut==='upper'?-1:1;
  // Paint 1–2 shared source pixels on either side of the bend so a sharp
  // kick/punch cannot reveal a transparent seam between sleeve halves.
  const shift=jointClipShift(layer,cut);
  const points=[[-extent,shift],[extent,shift],[extent,sign*extent+shift],[-extent,sign*extent+shift]].map(([normal,axial])=>[mid[0]+normal*nx+axial*dx-pivot[0],mid[1]+normal*ny+axial*dy-pivot[1]]);
  ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.clip();
 }
 ctx.drawImage(image,sx,sy,w,h,-pivot[0],-pivot[1],w,h);ctx.restore();
}
function drape(ctx,image,layer,pose,at,fit){
 const rest=pose.clothingRest;if(!rest)return false;
 const [sx,sy,w,h]=layer.rect,scale=layer.scale,fitWidth=scale*fit.width,split=Math.round(w*.5),bands=20;
 for(let half=0;half<2;half++){
  const i=layer.drape.nearHalf===half?0:1,x=half?split:0,width=half?w-split:split;
  const sample=t=>{
   const q=Math.min(1,t)*2,j=Math.min(1,Math.floor(q)),f=q-j;
   const current=pose.legs[i][j].map((n,k)=>n+(pose.legs[i][j+1][k]-n)*f);
   const original=rest.legs[i][j].map((n,k)=>n+(rest.legs[i][j+1][k]-n)*f);
   const delta=current.map((n,k)=>n-pose.hip[k]-(original[k]-rest.hip[k]));
   const base=[at[0]+(x+width*.5-layer.pivot[0])*fitWidth,at[1]+(t*h-layer.pivot[1])*scale];
   // At an extended kick the hem meets the foot, while the cloth's width
   // remains perpendicular to the leg instead of collapsing into a line.
   const leg=pose.legs[i],dx=leg[2][0]-leg[0][0],dy=leg[2][1]-leg[0][1];
   const restDx=rest.legs[i][2][0]-rest.legs[i][0][0];
   const horizontal=Math.min(1,Math.abs(dx-restDx)/Math.max(1,Math.hypot(dx,dy)));
   const hemOffset=pose.legs[i][2][0]-(at[0]+(x+width*.5-layer.pivot[0])*fitWidth+pose.legs[i][2][0]-pose.hip[0]-(rest.legs[i][2][0]-rest.hip[0]));
   return [base[0]+delta[0]+hemOffset*horizontal*t,base[1]+delta[1]];
  };
  for(let b=0;b<bands;b++){
   const y=Math.round(b*h/bands),end=Math.round((b+1)*h/bands),height=end-y;
   const a=sample(y/h),z=sample(end/h),dx=z[0]-a[0],dy=z[1]-a[1],len=Math.hypot(dx,dy);
   if(len<.001)continue;
   const nx=dy/len,ny=-dx/len,span=height*scale,wide=width*fitWidth;
   ctx.save();ctx.translate(a[0]-nx*wide*.5,a[1]-ny*wide*.5);
   ctx.transform(nx,ny,dx/span,dy/span,0,0);
   ctx.drawImage(image,sx+x,sy+y,width,height,0,0,wide,span+.16);ctx.restore();
  }
 }
 return true;
}
// Interleave these passes with the existing hero layers. This helper never
// modifies the hero, simulation, inventory or equipped armor.
export function drawClothingPass(ctx,pose,view,pass,loadedLayers,options={}){
 const anchors=attachmentPoints(pose);
 for(const piece of loadedLayers){
  const {manifest,image}=piece;
  if(!image)continue;
  for(const layer of manifest.layers){
   if(layer.view!==view||layer.pass!==pass)continue;
   const anchor=anchors[layer.attach];if(!anchor)continue;
   const target=layer.end?anchors[layer.end.attach]:null;
   const baseScale=target?distance(anchor,target)/Math.max(.0001,distance(layer.pivot,layer.end.pivot)):layer.scale;
   const baseFit=fitClothingLayer(layer,pose,anchors,baseScale,piece);
   const gameFacing=options.gameFacing===1||options.gameFacing===-1;
   const headFit=gameFacing?fitGameplayHeadwear(layer,baseFit,piece,pose,options.gameFacing):baseFit;
   const fit=gameFacing?fitHeadAccessory(layer,headFit,piece,pose,options.gameFacing):headFit;
   const at=anchor.map((n,i)=>n+(layer.offset?.[i]||0)+fit.offset[i]);
   // Head wraps, hats and masks tilt with the skull instead of hovering
   // independently during attacks and idle head movement.
   const followsHead=layer.attach==='head'&&Number.isFinite(pose.headTilt)&&pose.headTilt!==0;
   if(followsHead){const pivot=pose.faceCenter||anchor;ctx.save();ctx.translate(...pivot);ctx.rotate(pose.headTilt);ctx.translate(-pivot[0],-pivot[1]);}
   // Paint a low-opacity contact shadow behind the garment opening, avoiding
   // a hard sticker outline around the entire approved costume.
   drawContactShadow(ctx,layer,anchors,at,fit,piece);
   const light=garmentLight(view,pass,layer);
   const canFilter=typeof ctx.filter==='string'&&light<.999;
   if(canFilter){ctx.save();ctx.filter='brightness('+light.toFixed(3)+')';}
   try{
   if(layer.drape&&drape(ctx,image,layer,pose,at,fit))continue;
   if(layer.end){
    const end=anchors[layer.end.attach];if(!end||!distance(layer.pivot,layer.end.pivot))continue;
    if(layer.joint){
     const elbow=anchors[layer.joint.attach];if(!elbow)continue;
     const sourceJoint=layer.pivot.map((n,i)=>n+(layer.end.pivot[i]-n)*layer.joint.fraction);
     stamp(ctx,image,layer,at,layer.pivot,elbow,sourceJoint,'upper',fit);
     stamp(ctx,image,layer,elbow,sourceJoint,end,layer.end.pivot,'lower',fit);
    }else stamp(ctx,image,layer,at,layer.pivot,end,layer.end.pivot,null,fit);
   }else{
    if(layer.followLeg&&pose.clothingRest){const i=layer.part==='footNear'?0:1,leg=pose.legs[i],rest=pose.clothingRest.legs[i];const tilt=Math.max(-1.1,Math.min(1.1,(angle(leg[1],leg[2])-angle(rest[1],rest[2]))*.7));ctx.save();ctx.translate(...at);ctx.rotate(tilt);ctx.translate(-at[0],-at[1]);}
    if(layer.faceOpening){const o=layer.faceOpening;ctx.save();ctx.beginPath();ctx.rect(-1000,-1000,2000,2000);ctx.ellipse(anchor[0]+o.center[0],anchor[1]+o.center[1],...o.radius,0,0,Math.PI*2);ctx.clip('evenodd');}
    // Thin conforming bands hug the skull and jaw; hard brims keep their silhouette.
    if(!gameFacing||!drawContouredHead(ctx,image,layer,at,fit,piece,pose))
     stamp(ctx,image,layer,at,layer.pivot,null,null,null,fit);
    if(layer.faceOpening)ctx.restore();
    if(layer.followLeg&&pose.clothingRest)ctx.restore();
   }
   }finally{if(canFilter)ctx.restore();if(followsHead)ctx.restore();}
  }
 }
}
