// Character-independent Ground Roots / Whirlwind: art is composited around
// the EXISTING hero (never a replacement hero pose). Purely visual: reads
// active power state and interpolated feet, never modifies combat or saves.
// Approved sheets: 3 columns x 2 rows, 512px source cells, transparent PNG.
// The procedural fallback is temporary until the approved artwork is uploaded.
export const HERO_OVERLAY_VERSION='approved-character-wrap-v1';
export const HERO_OVERLAY_ASSETS=Object.freeze({
 roots:Object.freeze({file:'../assets/vfx/ground-root-overlay.png',cols:3,rows:2,cell:512}),
 whirlwind:Object.freeze({file:'../assets/vfx/whirlwind-overlay.png',cols:3,rows:2,cell:512})
});
const loaded=new Map();
let pending=null;
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const TAU=Math.PI*2;

export function prepareHeroPowerOverlays(loader=null){
 if(pending)return pending;
 if(typeof Image==='undefined'&&!loader)return Promise.resolve(false);
 const load=loader||((url)=>new Promise((resolve,reject)=>{
   const image=new Image();image.onload=()=>resolve(image);
   image.onerror=()=>reject(Error('Overlay image unavailable'));
   image.decoding='async';image.src=url.href;
 }));
 pending=Promise.all(Object.entries(HERO_OVERLAY_ASSETS).map(async ([id,meta])=>{
   try {
     const image=await load(new URL(meta.file,import.meta.url));
     if(image.width!==meta.cols*meta.cell||image.height!==meta.rows*meta.cell)
       throw Error('Incorrect 3x2 sprite grid for '+id);
     loaded.set(id,image);return true;
   } catch(_error) {loaded.delete(id);return false;}
 })).then(result=>result.every(Boolean));
 return pending;
}
export const heroPowerOverlayStatus=()=>({
  roots:loaded.has('roots'),whirlwind:loaded.has('whirlwind')
});

export function heroPowerOverlayStates(game){
 const active=game?.powers?.active||{};
 return ['roots','whirlwind'].flatMap(id=>{
   const effect=active[id];
   if(!effect || (game?.hero?.dead))return [];
   const age=Number(effect.age)||0;
   const duration=Number(effect.duration)||2;
   return [{id,age:clamp(age,0,duration),duration,progress:clamp(age/duration)}];
 });
}
export function heroPowerOverlayFrame(effect){
 const {progress:p}=effect;
 if(p<.08)return 0;
 if(p<.18)return 1;
 if(p<.30)return 2;
 if(p<.45)return 3;
 if(p>.89)return 5;
 return Math.floor(p*12)%2?4:3;
}

function imageLayer(c,img,meta,effect,x,y,layer){
 const index=heroPowerOverlayFrame(effect);
 const [sx,sy]=[(index%meta.cols)*meta.cell,Math.floor(index/meta.cols)*meta.cell];
 const kind=effect.id,range=kind==='roots'?170:174;
 // A foot-pinned animation uses identical dimensions for every hero appearance.
 // Source cells have a 40px bottom inset; compensate so roots touch the floor.
 const top=y-range+14, left=x-range*.56, width=range*1.12, height=range;
 c.save();
 // Behind: all vines/wind. In front: edge ribbons and ground contact only.
 if(layer==='front'){
   c.beginPath();
   c.rect(left,top,width*.20,height);
   c.rect(left+width*.80,top,width*.20,height);
   c.rect(left,y-38,width,45);
   c.clip();
   c.globalAlpha=kind==='roots'?.92:.78;
 }else c.globalAlpha=kind==='roots'?.93:.82;
 const growth=clamp(effect.age/.40,.25,1);
 if(growth<1){
   c.translate(x,y);c.scale(.78+growth*.22,.55+growth*.45);
   c.translate(-x,-y);
 }
 c.drawImage(img,sx,sy,meta.cell,meta.cell,left,top,width,height);
 c.restore();
}

function glowRing(c,x,y,rx,ry,color,alpha=1){
 c.save();c.globalAlpha*=alpha;c.beginPath();
 c.ellipse(x,y,rx,ry,0,0,TAU);c.strokeStyle=color;
 c.lineWidth=3;c.shadowBlur=8;c.shadowColor=color;c.stroke();c.restore();
}
function rootsFallback(c,x,y,t,progress,layer){
 const growth=clamp(progress*2.7,.1,1),sway=Math.sin(t*5)*3;
 c.save();
 if(layer==='back'){
   glowRing(c,x,y-4,49+growth*17,8,'#6bff35',.7);
   for(const side of [-1,1]){
     const px=x+side*45,top=y-112*growth;
     const vine=c.createLinearGradient(px,y,px,top);
     vine.addColorStop(0,'#6b3c17');vine.addColorStop(.6,'#d99c41');vine.addColorStop(1,'#70b83b');
     c.beginPath();c.moveTo(x+side*17,y);
     c.bezierCurveTo(x+side*70,y-26*growth,px-side*20,y-80*growth,px+sway,top);
     c.strokeStyle='#3e3515';c.lineWidth=13;c.lineCap='round';c.stroke();
     c.strokeStyle=vine;c.lineWidth=9;c.stroke();
     for(let i=0;i<4;i++){
       const h=y-(25+i*24)*growth,px=x+side*(38+Math.sin(i*2+t*2)*10);
       c.save();c.translate(px,h);c.rotate(side*(.3+i*.17));
       c.beginPath();c.ellipse(side*5,0,11,5,.35,0,TAU);
       c.fillStyle=i%2?'#8cde35':'#5ead24';c.fill();c.restore();
     }
   }
 }else {
   glowRing(c,x,y-3,58+growth*8,7,'#a0ff4c',.55);
   for(const side of [-1,1]){
     c.beginPath();c.moveTo(x+side*55,y);
     c.quadraticCurveTo(x+side*30,y-17,x+side*9,y-10);
     c.strokeStyle='#82521c';c.lineWidth=8;c.stroke();
     c.strokeStyle='#d7a64f';c.lineWidth=3;c.stroke();
   }
 }
 c.restore();
}
function whirlwindFallback(c,x,y,t,progress,layer){
 const growth=clamp(progress*3.1,.15,1);
 c.save();
 for(let i=0;i<5;i++){
   const height=y-(12+i*29)*growth, r=(29+i*6)*(.55+.45*growth);
   if(layer==='back'&&i%2===0||layer==='front'&&i%2!==0){
     c.beginPath();
     const wave=Math.sin(t*6+i*.9)*6;
     c.ellipse(x+wave,height,r,Math.max(4,10+i*1.3),-.16,t*7+i*.7,t*7+i*.7+Math.PI*1.8);
     c.strokeStyle=i%2?'#67dff2':'#b8ffff';
     c.lineWidth=3.2;c.shadowColor='#64eaf7';c.shadowBlur=10;c.stroke();
     c.beginPath();c.ellipse(x-wave,height+3,r*.85,7,.13,t*5+i,t*5+i+Math.PI);
     c.strokeStyle='#30b2d9';c.lineWidth=2;c.stroke();
   }
 }
 if(layer==='front')glowRing(c,x,y-3,39+9*growth,8,'#9dfbff',.65);
 c.restore();
}
export function drawHeroPowerOverlays(c,game,pos,time=0,layer='back'){
 const states=heroPowerOverlayStates(game);
 if(!states.length)return false;
 for(const state of states){
   const asset=loaded.get(state.id);
   if(asset)imageLayer(c,asset,HERO_OVERLAY_ASSETS[state.id],state,pos.x,pos.y,layer);
   else if(state.id==='roots')rootsFallback(c,pos.x,pos.y,time,state.progress,layer);
   else whirlwindFallback(c,pos.x,pos.y,time,state.progress,layer);
 }
 return true;
}
