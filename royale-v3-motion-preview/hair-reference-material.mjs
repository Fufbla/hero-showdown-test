import {HAIR_REFERENCE_V3} from './hair-reference-v3.mjs';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
// Authored front/profile forehead and ear openings replace the old universal
// eye-line cut. Only rear nape/tail pixels move behind the approved head.
export function createReferenceHair(look,view,image,makeCanvas,colorRamp){
 const def=HAIR_REFERENCE_V3[look.hair],frame=def.frames[view],fit=def.fits[view];
 let [left,top,width,height]=fit;
 if(look.presentation==='male'){top-=.7;width*=.995;}
 const w=Math.ceil(width*5),h=Math.ceil(height*5),front=makeCanvas(w,h),rear=makeCanvas(w,h),c=front.getContext('2d',{willReadFrequently:true});
 c.save();if(view==='left'){c.translate(w,0);c.scale(-1,1);}c.drawImage(image,...frame,0,0,w,h);c.restore();
 // Register tied scalps to the original occiput. Keep the forehead opening,
 // ears and upper puff/bun/tail fixed while seating the rear hairline.
 const fittedScalp=['afro-puff','double-puffs','high-loc-bun','high-ponytail','braided-ponytail'].includes(look.hair);
 if(fittedScalp&&(view==='side'||view==='left'||(look.hair==='afro-puff'&&view==='front'))){
  const src=makeCanvas(w,h),sc=src.getContext('2d',{willReadFrequently:true});sc.drawImage(front,0,0);const pixels=sc.getImageData(0,0,w,h).data;c.clearRect(0,0,w,h);
  const anchor=view==='front'?-16:-8,split=(anchor-left)/width*w;
  for(let row=0;row<h;row++){
   const py=top+row/h*height;let start=0;while(start<split&&pixels[(row*w+start)*4+3]<80)start++;
   const edge=left+start/w*width,ratio=(py+13)/24;
   const outline=(view==='front'?-7:-3)-23*Math.sqrt(Math.max(0,1-ratio*ratio));
   const needed=start<split-2&&edge<anchor-.5&&py>-32&&py<8&&edge>outline?Math.min(6,edge-outline):0;
   const amount=needed/(anchor-edge||1),dx=split*amount;
   c.drawImage(src,0,row,split,1,-dx,row,split+dx,1);c.drawImage(src,split,row,w-split,1,split,row,w-split,1);
  }
 }
 // Fill the fitted back scalp beneath the free ponytail. The original tail
 // is composited last and is never stretched across the skull.
 if(look.hair==='high-ponytail'&&view==='back'){
  const src=makeCanvas(w,h),sc=src.getContext('2d',{willReadFrequently:true});sc.drawImage(front,0,0);
  const pixels=sc.getImageData(0,0,w,h).data;c.clearRect(0,0,w,h);
  for(let row=0;row<h;row++){
   const py=top+row/h*height;if(py<=-22||py>=9)continue;
   const extent=20.5*Math.sqrt(Math.max(0,1-((py+11)/21)**2));
   const sourceY=Math.round((-22+Math.max(0,py+22)*.18-top)/height*h);
   let start=0,end=w-1;while(start<w&&pixels[(sourceY*w+start)*4+3]<80)start++;while(end>start&&pixels[(sourceY*w+end)*4+3]<80)end--;
   if(end>start)c.drawImage(src,start,sourceY,end-start+1,1,(-extent-left)/width*w,row,extent*2/width*w,1);
  }
  c.drawImage(src,0,0);
 }
 const f=c.getImageData(0,0,w,h),r=rear.getContext('2d').createImageData(w,h),colors=colorRamp(look.hairColor);
 for(let y=0,i=0;y<h;y++)for(let x=0;x<w;x++,i+=4){
  let alpha=f.data[i+3];if(!alpha)continue;
  const px=left+(x+.5)/w*width,py=top+(y+.5)/h*height;
  const metal=f.data[i]-f.data[i+2]>40&&f.data[i+1]-f.data[i+2]>14;
  if(!metal){const light=f.data[i]*.2126+f.data[i+1]*.7152+f.data[i+2]*.0722,rgb=colors[Math.round(clamp(light*112/51,0,255))];for(let k=0;k<3;k++)f.data[i+k]=rgb[k];}
  // Fade is sparse fiber over the existing skin, never a painted skin patch.
  if(def.fade){const start=view==='back'?-7:-8,end=view==='back'?9:5;alpha*=1-.85*clamp((py-start)/(end-start));}
  const behind=def.tail&&view!=='back'?clamp((py+1)/4)*clamp((-px-27)/3):0;
  for(let k=0;k<3;k++)r.data[i+k]=f.data[i+k];
  r.data[i+3]=alpha*behind;f.data[i+3]=alpha*(1-behind);
 }
 c.putImageData(f,0,0);rear.getContext('2d').putImageData(r,0,0);
 const warp=source=>{if(view!=='front')return source;const dest=makeCanvas(w,h),d=dest.getContext('2d'),split=-left/width*w;d.drawImage(source,0,0,split,h,0,0,split,h);d.drawImage(source,split,0,w-split,h,split,0,(w-split)*.66,h);return dest;};
 return {front:warp(front),rear:warp(rear),left,top,w:width,h:height,reference:true,tail:def.tail};
}
export function drawReferenceHair(context,art,layer,motion,time){
 // Pin every scalp/crown pixel. Only free ends below the nape respond to motion;
 // deformation is continuous and allocates no new canvas in an animation frame.
 if(!art.tail||layer!=='rear'){context.drawImage(art[layer],art.left,art.top,art.w,art.h);return;}
 const source=art[layer],step=2,wind=clamp(motion?.wind||0,-7,7);
 for(let y=0;y<source.height;y+=step){const hh=Math.min(step,source.height-y),local=art.top+y/source.height*art.h,t=clamp((local-1)/28),dx=(wind*.25+Math.sin(time*4)*.20)*t*t;context.drawImage(source,0,y,source.width,hh,art.left+dx,local,art.w,(hh+.15)/source.height*art.h);}
}
