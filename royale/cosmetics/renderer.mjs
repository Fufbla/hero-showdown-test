import {attachmentPoints} from './template.mjs';
// Only decoded, complete pieces may conceal the corresponding armor. A failed
// texture load leaves the original character visible and never changes stats.
export function clothingCoverage(layers=[]){
 const covered=new Set();
 for(const {manifest,image} of layers)if(image&&manifest?.layers?.length)
  for(const region of manifest.covers||[])covered.add(region);
 return covered;
}
export const clothingHair=layers=>layers.some(({manifest,image})=>image&&manifest.hair==='hidden')?'hidden':layers.some(({manifest,image})=>image&&manifest.hair==='tucked')?'tucked':null;
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const angle=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0]);
function stamp(ctx,image,layer,at,pivot,end,sourceEnd,cut){
 const [sx,sy,w,h]=layer.rect;
 const scale=end?distance(at,end)/distance(pivot,sourceEnd):layer.scale;
 const rotation=end?angle(at,end)-angle(pivot,sourceEnd):0;
 ctx.save();ctx.translate(...at);ctx.rotate(rotation);ctx.scale(layer.fixedWidth?layer.scale:scale,scale);
 if(cut){
  // Split a sleeve at the animated elbow in source space. Both halves share
  // the exact seam, preserving artwork while bending with the same hero bones.
  const start=layer.pivot,finish=layer.end.pivot,theta=angle(start,finish),dx=Math.cos(theta),dy=Math.sin(theta),nx=-dy,ny=dx;
  const mid=[start[0]+(finish[0]-start[0])*layer.joint.fraction, start[1]+(finish[1]-start[1])*layer.joint.fraction];
  const extent=Math.max(w,h)*4,sign=cut==='upper'?-1:1;
  const points=[[-extent,0],[extent,0],[extent,sign*extent],[-extent,sign*extent]].map(([normal,axial])=>[mid[0]+normal*nx+axial*dx-pivot[0],mid[1]+normal*ny+axial*dy-pivot[1]]);
  ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.clip();
 }
 ctx.drawImage(image,sx,sy,w,h,-pivot[0],-pivot[1],w,h);ctx.restore();
}
function drape(ctx,image,layer,pose,at){
 const rest=pose.clothingRest;if(!rest)return false;
 const [sx,sy,w,h]=layer.rect,scale=layer.scale,split=Math.round(w*.5),bands=20;
 for(let half=0;half<2;half++){
  const i=layer.drape.nearHalf===half?0:1,x=half?split:0,width=half?w-split:split;
  const sample=t=>{
   const q=Math.min(1,t)*2,j=Math.min(1,Math.floor(q)),f=q-j;
   const current=pose.legs[i][j].map((n,k)=>n+(pose.legs[i][j+1][k]-n)*f);
   const original=rest.legs[i][j].map((n,k)=>n+(rest.legs[i][j+1][k]-n)*f);
   const delta=current.map((n,k)=>n-pose.hip[k]-(original[k]-rest.hip[k]));
   const base=[at[0]+(x+width*.5-layer.pivot[0])*scale,at[1]+(t*h-layer.pivot[1])*scale];
   // At an extended kick the hem meets the foot, while the cloth's width
   // remains perpendicular to the leg instead of collapsing into a line.
   const leg=pose.legs[i],dx=leg[2][0]-leg[0][0],dy=leg[2][1]-leg[0][1];
   const restDx=rest.legs[i][2][0]-rest.legs[i][0][0];
   const horizontal=Math.min(1,Math.abs(dx-restDx)/Math.max(1,Math.hypot(dx,dy)));
   const hemOffset=pose.legs[i][2][0]-(at[0]+(x+width*.5-layer.pivot[0])*scale+pose.legs[i][2][0]-pose.hip[0]-(rest.legs[i][2][0]-rest.hip[0]));
   return [base[0]+delta[0]+hemOffset*horizontal*t,base[1]+delta[1]];
  };
  for(let b=0;b<bands;b++){
   const y=Math.round(b*h/bands),end=Math.round((b+1)*h/bands),height=end-y;
   const a=sample(y/h),z=sample(end/h),dx=z[0]-a[0],dy=z[1]-a[1],len=Math.hypot(dx,dy);
   if(len<.001)continue;
   const nx=dy/len,ny=-dx/len,span=height*scale,wide=width*scale;
   ctx.save();ctx.translate(a[0]-nx*wide*.5,a[1]-ny*wide*.5);
   ctx.transform(nx,ny,dx/span,dy/span,0,0);
   ctx.drawImage(image,sx+x,sy+y,width,height,0,0,wide,span+.16);ctx.restore();
  }
 }
 return true;
}
// Interleave these passes with the existing hero layers. This helper never
// modifies the hero, simulation, inventory or equipped armor.
export function drawClothingPass(ctx,pose,view,pass,loadedLayers){
 const anchors=attachmentPoints(pose);
 for(const {manifest,image}of loadedLayers){
  if(!image)continue;
  for(const layer of manifest.layers){
   if(layer.view!==view||layer.pass!==pass)continue;
   const anchor=anchors[layer.attach];if(!anchor)continue;
   const at=anchor.map((n,i)=>n+(layer.offset?.[i]||0));
   if(layer.drape&&drape(ctx,image,layer,pose,at))continue;
   if(layer.end){
    const end=anchors[layer.end.attach];if(!end||!distance(layer.pivot,layer.end.pivot))continue;
    if(layer.joint){
     const elbow=anchors[layer.joint.attach];if(!elbow)continue;
     const sourceJoint=layer.pivot.map((n,i)=>n+(layer.end.pivot[i]-n)*layer.joint.fraction);
     stamp(ctx,image,layer,at,layer.pivot,elbow,sourceJoint,'upper');
     stamp(ctx,image,layer,elbow,sourceJoint,end,layer.end.pivot,'lower');
    }else stamp(ctx,image,layer,at,layer.pivot,end,layer.end.pivot);
   }else{
    if(layer.followLeg&&pose.clothingRest){const i=layer.part==='footNear'?0:1,leg=pose.legs[i],rest=pose.clothingRest.legs[i];const tilt=Math.max(-1.1,Math.min(1.1,(angle(leg[1],leg[2])-angle(rest[1],rest[2]))*.7));ctx.save();ctx.translate(...at);ctx.rotate(tilt);ctx.translate(-at[0],-at[1]);}
    if(layer.faceOpening){const o=layer.faceOpening;ctx.save();ctx.beginPath();ctx.rect(-1000,-1000,2000,2000);ctx.ellipse(anchor[0]+o.center[0],anchor[1]+o.center[1],...o.radius,0,0,Math.PI*2);ctx.clip('evenodd');}
    stamp(ctx,image,layer,at,layer.pivot);
    if(layer.faceOpening)ctx.restore();
    if(layer.followLeg&&pose.clothingRest)ctx.restore();
   }
  }
 }
}
