// Approved November 2026 scenery. This module only paints: all collision,
// camera targets, time-of-day, enemies and saved progress remain owned by Game.
const THEMES=['coast','forest','factory','cave','mutant','energy','final'];
const BACKGROUNDS=Object.fromEntries(THEMES.map(theme=>[theme,new URL(`./assets/environments/${theme}.webp`,import.meta.url).href]));
const MATERIAL_URL=new URL('./assets/environments/terrain.webp',import.meta.url).href;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mod=(n,d)=>((n%d)+d)%d;
const images=new Map();
let materials=null;
function imageRecord(url){
 if(typeof Image==='undefined')return null;
 const image=new Image(),record={image,ready:false,failed:false};
 image.decoding='async';
 image.onload=()=>{record.ready=image.naturalWidth>0;};
 image.onerror=()=>{record.failed=true;};
 image.src=url;
 if(image.complete&&image.naturalWidth)record.ready=true;
 return record;
}
function resources(theme){
 if(!BACKGROUNDS[theme]||typeof Image==='undefined')return null;
 if(!materials)materials=imageRecord(MATERIAL_URL);
 let record=images.get(theme);
 if(!record){record=imageRecord(BACKGROUNDS[theme]);images.set(theme,record);}
 else{images.delete(theme);images.set(theme,record);}
 // Keep the current and previous region only; HTTP cache handles later returns.
 while(images.size>2)images.delete(images.keys().next().value);
 return record?.ready&&materials?.ready?{background:record.image,terrain:materials.image}:null;
}

export function paintingPlacement(image,width,height,cameraX,cameraY){
 // A bounded panorama pan never exposes a seam at the end of the 6,160px world.
 // Vertical overscan also covers the highest double-jump route and tall screens.
 const scale=Math.max((width+360)/image.width,(height+160)/image.height);
 const w=image.width*scale,h=image.height*scale;
 const travel=clamp(cameraX/Math.max(1,6160-width),0,1);
 const x=-(w-width)*(.16+.68*travel);
 const y=clamp(-(h-height)*.45-cameraY*.12,height-h,0);
 return {x,y,w,h};
}

export class IllustratedEnvironment{
 constructor(){this.region=null;this.time=0;this.night=false;this.current=null;}
 ready(region){return this.region===region?.theme&&!!this.current;}
 sky(c,region,width,height,cameraX,cameraY,time,night){
  this.region=region.theme;this.time=time;this.night=night;this.current=resources(region.theme);
  if(!this.current)return false;
  const image=this.current.background,p=paintingPlacement(image,width,height,cameraX,cameraY);
  c.save();c.beginPath();c.rect(0,0,width,height);c.clip();
  c.drawImage(image,p.x,p.y,p.w,p.h);
  if(night){
   // Only scenery is shaded; heroes, combat effects and HUD stay readable.
   c.fillStyle=region.theme==='cave'?'#10192e55':'#07152c88';c.fillRect(0,0,width,height);
   if(['coast','final'].includes(region.theme)){
    c.fillStyle='#eff5e5';c.beginPath();c.arc(width*.78-cameraX*.012,85-cameraY*.03,18,0,Math.PI*2);c.fill();
    for(let i=0;i<14;i++){c.globalAlpha=.25+mod(i*13,8)/16;c.fillRect(mod(i*193-cameraX*.035,width),28+mod(i*57,150),1.4,1.4);}
    c.globalAlpha=1;
   }
  }
  this.atmosphere(c,region,width,height,cameraX,cameraY,time,p);
  c.restore();return true;
 }
 atmosphere(c,region,width,height,cameraX,cameraY,time,p){
  const theme=region.theme;
  // Sparse moving details use a different parallax speed from the panorama.
  // No per-frame canvas allocations, timers, filters, or simulation objects.
  c.save();
  if(theme==='coast'){
   c.strokeStyle=this.night?'#d6f5ff38':'#edffff50';c.lineWidth=1.4;
   for(let i=0;i<14;i++){
    const x=mod(i*173-cameraX*.18+time*6,width+90)-45;
    const y=p.y+p.h*(.68+(i%4)*.065)+Math.sin(time*.8+i)*1.3;
    c.globalAlpha=.3+.3*Math.sin(time*.6+i)**2;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+12,y-1.5,x+27+(i%3)*5,y);c.stroke();
   }
  }else{
   const warm=theme==='factory'||theme==='final';
   const colors={forest:'#cbe7a3',mutant:'#e2a9eb',energy:'#a6dfff',cave:'#baf7e8'};
   c.fillStyle=warm?'#ffce83':colors[theme];
   for(let i=0;i<14;i++){
    const x=mod(i*151-cameraX*.22+Math.sin(time*.25+i)*15,width+60)-30;
    const y=mod(i*79-time*(warm?6:2)-cameraY*.14,height+40)-20;
    c.globalAlpha=.12+.21*(.5+.5*Math.sin(time*.6+i));c.beginPath();
    c.ellipse(x,y,theme==='forest'||theme==='mutant'?2.7:1.5,1.1,i*.7,0,Math.PI*2);c.fill();
   }
  }
  c.restore();
 }
 surface(c,s,region){
  if(!this.ready(region)||!s.w||!s.h)return false;
  const image=this.current.terrain,row=THEMES.indexOf(region.theme),rh=image.height/7;
  const sy=row*rh,oneWay=!!s.oneWay,depth=oneWay?Math.max(s.h,64):s.h;
  c.save();c.beginPath();c.moveTo(s.x,s.y);c.lineTo(s.x+s.w,s.y);
  if(oneWay){
   // The top is exactly the existing collision edge. Only the underside varies.
   c.lineTo(s.x+s.w,s.y+Math.min(25,depth));c.lineTo(s.x+s.w-16,s.y+depth*.78);
   c.lineTo(s.x+s.w*.66,s.y+depth);c.lineTo(s.x+19,s.y+depth*.81);c.lineTo(s.x,s.y+24);
  }else{c.lineTo(s.x+s.w,s.y+depth);c.lineTo(s.x,s.y+depth);}
  c.closePath();c.clip();
  if(oneWay){
   const sw=Math.min(image.width,Math.max(360,s.w*2.1)),sx=mod(Math.floor(s.x*.37),Math.max(1,image.width-sw));
   c.drawImage(image,sx,sy,sw,rh,s.x,s.y,s.w,depth);
  }else{
   const tileWidth=960,capHeight=Math.min(depth,180);
   for(let x=s.x-mod(s.x,tileWidth);x<s.x+s.w;x+=tileWidth){
    const flip=mod(Math.floor(x/tileWidth),2)===1;
    c.save();c.translate(x+(flip?tileWidth:0),s.y);c.scale(flip?-1:1,1);
    c.drawImage(image,0,sy,image.width,rh,0,0,tileWidth,capHeight);
    if(depth>capHeight)c.drawImage(image,0,sy+rh-2,image.width,2,0,capHeight,tileWidth,depth-capHeight);
    c.restore();
   }
  }
  if(this.night){c.fillStyle=region.theme==='energy'?'#10182c10':'#101c3530';c.fillRect(s.x,s.y,s.w,depth);}
  c.restore();return true;
 }
}

export const ENVIRONMENT_THEMES=Object.freeze([...THEMES]);
