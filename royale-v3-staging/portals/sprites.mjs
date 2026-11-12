export const CELL=160;
const hues=[0,-85,185,-55,85,65,-95,0,150,150,150,150,150,150,150,0];
export function createPortalPreview(images,{createCanvas}){
 const colors=new Map();
 const tinted=(key,id)=>{const hue=hues[id];if(!hue)return images[key];const k=key+':'+hue;if(colors.has(k))return colors.get(k);const canvas=createCanvas(640,640),c=canvas.getContext('2d');c.filter=`hue-rotate(${hue}deg)`;c.drawImage(images[key],0,0);if(colors.size>=4)colors.delete(colors.keys().next().value);colors.set(k,canvas);return canvas;};
 function tile(c,image,index,x,y,w,h,alpha=1){if(alpha<=0)return;c.save();c.globalAlpha*=alpha;c.drawImage(image,(index%4)*CELL,Math.floor(index/4)*CELL,CELL,CELL,x,y,w,h);c.restore();}
 function sequence(c,image,offset,count,time,fps,x,y,w,h,alpha=1){const q=((time*fps)%count+count)%count,i=Math.floor(q),mix=q-i;tile(c,image,offset+i,x,y,w,h,alpha*(1-mix));tile(c,image,offset+(i+1)%count,x,y,w,h,alpha*mix);}
 return {draw(c,id,x,y,time,{size=240,near=false,activation=-1}={}){
  const left=x-size/2,top=y-size*.88,energy=tinted('vortex',id),light=tinted('lighting',id),speed=near?24:20;
  c.save();
  // Ground is fixed at y; illustration supplies caustics, not a geometric glow.
  sequence(c,light,0,4,time,8,left-size*.12,y-size*.12,size*1.24,size*.20,.65);
  sequence(c,energy,0,16,time,speed,x-size*.28,top+size*.18,size*.56,size*.70,near?1:.9);
  tile(c,images.frames,id,left,top,size,size);
  sequence(c,light,4,4,time,8,left+size*.08,top+size*.10,size*.84,size*.81,near?.22:.12);
  sequence(c,light,12,4,time,12,x-size*.24,top+size*.26,size*.48,size*.60,.16);
  const type=id>=8&&id<15?2:[0,1,2,3,1,3,3,2][id]??0;
  for(let n=0;n<(near?6:3);n++){
   const phase=(time*.35+n*.31)%1,side=n%2?1:-1;
   sequence(c,images.particles,type*4,4,time+n*.17,8,x+side*size*(.33+.035*Math.sin(time+n))-size*.06,y-size*(.15+phase*.7),size*.12,size*.12,Math.sin(phase*Math.PI)*.85);
  }
  if(activation>=0&&activation<.5)sequence(c,light,8,4,activation,8,left,top,size,size,1-activation/.5);
  c.restore();
 },cache:colors};
}
