import {attachmentPoints} from './template.mjs';
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const angle=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0]);
function stamp(ctx,image,layer,at,pivot,end,sourceEnd,cut){
 const [sx,sy,w,h]=layer.rect;
 const scale=end?distance(at,end)/distance(pivot,sourceEnd):layer.scale;
 const rotation=end?angle(at,end)-angle(pivot,sourceEnd):0;
 ctx.save();ctx.translate(...at);ctx.rotate(rotation);ctx.scale(scale,scale);
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
   if(layer.end){
    const end=anchors[layer.end.attach];if(!end||!distance(layer.pivot,layer.end.pivot))continue;
    if(layer.joint){
     const elbow=anchors[layer.joint.attach];if(!elbow)continue;
     const sourceJoint=layer.pivot.map((n,i)=>n+(layer.end.pivot[i]-n)*layer.joint.fraction);
     stamp(ctx,image,layer,at,layer.pivot,elbow,sourceJoint,'upper');
     stamp(ctx,image,layer,elbow,sourceJoint,end,layer.end.pivot,'lower');
    }else stamp(ctx,image,layer,at,layer.pivot,end,layer.end.pivot);
   }else stamp(ctx,image,layer,at,layer.pivot);
  }
 }
}
