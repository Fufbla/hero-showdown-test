import {attachmentPoints} from './template.mjs';
// Called at the existing body/limb layer boundaries, not as a second character
// or a flattened poster overlay. Pending/unverified clothing paints nothing.
export function drawClothingPass(ctx,pose,view,pass,loadedLayers){
 const anchors=attachmentPoints(pose);
 for(const {manifest,image}of loadedLayers){
  if(!image)continue;
  for(const layer of manifest.layers){
   if(layer.view!==view||layer.pass!==pass)continue;
   const at=anchors[layer.attach];if(!at)continue;
   const [sx,sy,w,h]=layer.rect,[px,py]=layer.pivot;
   let rotation=0,along=layer.scale;
   if(layer.end){
    const end=anchors[layer.end.attach],source=layer.end.pivot;if(!end)continue;
    const sourceLength=Math.hypot(source[0]-px,source[1]-py);if(!sourceLength)continue;
    along=Math.hypot(end[0]-at[0],end[1]-at[1])/sourceLength;
    rotation=Math.atan2(end[1]-at[1],end[0]-at[0])-Math.atan2(source[1]-py,source[0]-px);
   }
   ctx.save();ctx.translate(...at);ctx.rotate(rotation);ctx.scale(along,along);
   ctx.drawImage(image,sx,sy,w,h,-px,-py,w,h);ctx.restore();
  }
 }
}
