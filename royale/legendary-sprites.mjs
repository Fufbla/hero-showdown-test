// Royale-only presentation. The combat simulation remains the sole timing authority.
import {BATCH4_SPRITE_ATLASES as BATCH4} from './assets/boss-sprites/batch4-atlas-data.mjs';
import {BATCH5_SPRITE_ATLASES as BATCH5} from './assets/boss-sprites/batch5-atlas-data.mjs';
import {BATCH6_SPRITE_ATLASES as BATCH6} from './assets/boss-sprites/batch6-atlas-data.mjs';
const DATA={...BATCH4,bosses:{...BATCH4.bosses,...BATCH5.bosses,...BATCH6.bosses}};
export const LEGENDARY_SPRITE_DATA=DATA;
const clamp=n=>Math.max(0,Math.min(1,n));
const mix=(a,b,t)=>a+(b-a)*t;
export const isLegendarySpriteId=id=>typeof id==='string'&&Object.hasOwn(DATA.bosses,id);
export const usesLegendarySprites=b=>!!b.legendaryId&&!b.legendaryHelper&&!b.helperTheme&&isLegendarySpriteId(b.legendaryId);
export function legendarySpritePose(b,time=0){
 const region=b.legendaryId,profile=DATA.bosses[region];if(!profile)return null;
 const moving=Math.abs((b.x||0)-(b.prevX??b.x??0))>.01||Math.abs(b.vx||0)>3;
 let row=0,pose=0,state='idle';
 if(b.state==='dead'){state='defeat';row=profile.states.indexOf(state);pose=Math.min(3,Math.floor(Math.max(0,b.age)/.23));}
 else if(['windup','active','recover'].includes(b.state)&&b.attack){
  row=profile.states.indexOf(b.attack.kind);if(row<0)row=2;state=profile.states[row];
  if(b.state==='windup')pose=clamp(b.age/Math.max(.001,b.attack.warning))<.48?0:1;
  // Legendary fire() executes at the beginning of active; show contact immediately.
  else if(b.state==='active')pose=2;
  else {pose=3;if(b.age/Math.max(.001,b.attack.recovery)>.82){row=0;pose=0;state='idle';}}
  // Leap damage lands at 98% of the authoritative airborne interval.
  if(region==='styrodog'&&b.attack.kind==='leap'){
   if(b.state==='active'&&b.age/Math.max(.001,b.attack.duration)>=.98){row=profile.states.indexOf('impact');state='impact';pose=1;}
   else if(b.state==='recover'&&b.age/b.attack.recovery<=.82){row=profile.states.indexOf('impact');state='impact';pose=b.age/b.attack.recovery<.25?2:3;}
  }
 }else if((b.flash||0)>0){state='hit';row=profile.states.indexOf(state);pose=Math.min(3,Math.floor(clamp((.12-b.flash)/.12)*4));}
 else {state=moving?'walk':'idle';row=moving?1:0;pose=Math.floor(Math.max(0,time)*(moving?6:2))%4;}
 return {region,redesigned:true,sheet:`legendary-sprites-${region}`,frame:row*4+pose,state,combatState:b.state,kind:b.attack?.kind||'',anchor:profile.anchor||DATA.anchor,referenceHeight:profile.referenceHeight||DATA.referenceHeight};
}
function loadPNG(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error(`Could not load ${url.pathname}`));im.src=url.href;});}
export class LegendarySprites{
 constructor({loadImages=typeof Image!=='undefined',imageLoader=loadPNG,canvasFactory}={}){this.loadImages=loadImages;this.imageLoader=imageLoader;this.canvasFactory=canvasFactory||((size=DATA.cell)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(size,size):Object.assign(document.createElement('canvas'),{width:size,height:size}));this.cache=new Map();this.visuals=new WeakMap();this.currentRegion=null;this.whenLoaded=Promise.resolve(false);}
 get ready(){return !!this.cache.get(this.currentRegion)?.ready;}
 prepare(region){
  this.currentRegion=region;let entry=this.cache.get(region);
  if(entry){this.cache.delete(region);this.cache.set(region,entry);this.whenLoaded=entry.promise;return entry.promise;}
  entry={ready:false,image:null,error:null};this.cache.set(region,entry);
  // A single image is reused for all of a boss’s frames. Keep at most two decoded atlases.
  while(this.cache.size>2)this.cache.delete(this.cache.keys().next().value);
  entry.promise=!this.loadImages?Promise.resolve(false):(async()=>{try{
   const profile=DATA.bosses[region];if(!profile)throw Error(`Unknown Legendary sprite identity ${region}`);
   const im=await this.imageLoader(new URL(`../${profile.file}`,import.meta.url));
   if((im.naturalWidth||im.width)!==(profile.cell||DATA.cell)*DATA.columns||(im.naturalHeight||im.height)!==(profile.cell||DATA.cell)*(profile.rows||DATA.rows))throw Error(`Invalid atlas dimensions for ${profile.name}`);
   entry.image=im;entry.ready=true;return true;
  }catch(error){entry.error=error.message;return false;}})();this.whenLoaded=entry.promise;return entry.promise;
 }
 step(b,time){
  const selection=legendarySpritePose(b,time);this.prepare(selection.region);let v=this.visuals.get(b);
  if(!v){v={selection,previous:null,transition:time,lastPhase:b.phase,surgeStart:-Infinity};this.visuals.set(b,v);}
  if(b.phase>v.lastPhase){v.surgeStart=time;v.lastPhase=b.phase;}

  if(v.selection.frame!==selection.frame){
   // No blend across attack contact: it must be visible on the exact damage tick.
   const contact=selection.combatState==='active'||v.selection.combatState==='active';
   v.previous=contact?null:v.selection;v.transition=time;
  }
  v.selection=selection;v.time=time;return this.inspect(b);
 }
 inspect(b){const v=this.visuals.get(b),region=b.legendaryId,entry=this.cache.get(region);return {name:DATA.bosses[region]?.name,design:DATA.bosses[region]?.design,temporary:false,redesigned:true,loaded:!!entry?.ready,selection:v?.selection,error:entry?.error||null};}
 draw(c,b,{time=0,alpha=1}={}){
  const v=this.visuals.get(b);if(!v)return;const p=v.selection,entry=this.cache.get(p.region),profile=DATA.bosses[p.region],cell=profile.cell||DATA.cell,anchor=profile.anchor||DATA.anchor,referenceHeight=profile.referenceHeight||DATA.referenceHeight;
  if(b.state==='dead'&&b.age>=1.25)return;
  const x=mix(b.prevX??b.x,b.x,clamp(alpha)),y=mix(b.prevY??b.y,b.y,clamp(alpha)),scale=(b.h||180)/referenceHeight;
  c.save();c.translate(x,y);
  if(!entry?.ready){
   c.fillStyle='#8b9e77';c.globalAlpha*=.6;c.fillRect(-b.w/2,-b.h,b.w,b.h);
   c.globalAlpha=1;c.fillStyle='#fff0c5';c.font='bold 10px system-ui';c.textAlign='center';c.fillText(entry?.error?'BOSS ART UNAVAILABLE':'LOADING BOSS ART',0,-b.h-14);c.restore();return;
  }
  if(b.state==='dead')c.globalAlpha*=1-clamp((b.age-.95)/.3);
  // Phase effects describe existing phase state only; they create no damage or timers.
  if(b.state!=='dead'&&b.phase>=2){c.save();c.globalAlpha*=b.phase===3?.65:.4;c.fillStyle=profile.phaseColors[b.phase===3?1:0];for(let i=0;i<(b.phase===3?6:3);i++){const angle=time*1.2+i*2.399,r=b.w*.4;c.beginPath();c.arc(Math.cos(angle)*r,-b.h*.6+Math.sin(angle*1.3)*b.h*.24,1.5+(i%2),0,Math.PI*2);c.fill();}c.restore();}
  c.scale((b.face||-1)*scale,scale);
  // All packed poses share one foot origin and one scale; collapse never stretches.
  const draw=(frame,opacity)=>{if(opacity<=0)return;const f=DATA.bosses[p.region].frames[frame];c.save();c.globalAlpha*=opacity;c.drawImage(entry.image,...f.crop,-anchor[0],-anchor[1],cell,cell);c.restore();};
  const blend=v.previous?clamp((time-v.transition)/.045):1;
  if(v.previous&&blend<1){
   // Blend on transparent offscreen pixels, adding premultiplied colors. Blending
   // two semiopaque sprites directly onto the world darkens overlaps each frame.
   if(!v.blendCanvas){v.blendCanvas=this.canvasFactory(cell);v.blendCanvas.width=cell;v.blendCanvas.height=cell;}const bc=v.blendCanvas.getContext('2d');bc.clearRect(0,0,cell,cell);
   bc.globalCompositeOperation='source-over';bc.globalAlpha=1-blend;bc.drawImage(entry.image,...DATA.bosses[p.region].frames[v.previous.frame].crop,0,0,cell,cell);
   bc.globalCompositeOperation='lighter';bc.globalAlpha=blend;bc.drawImage(entry.image,...DATA.bosses[p.region].frames[p.frame].crop,0,0,cell,cell);
   bc.globalCompositeOperation='source-over';bc.globalAlpha=1;c.drawImage(v.blendCanvas,-anchor[0],-anchor[1]);
  }else draw(p.frame,1);
  // A hit during a telegraph must not replace or delay its attack pose.
  if((b.flash||0)>0&&b.state!=='idle'){c.save();c.globalAlpha*=.55*clamp(b.flash/.12);c.strokeStyle='#fff1cf';c.lineWidth=2/scale;c.beginPath();c.arc(0,-referenceHeight*.55,referenceHeight*.28,-1,1);c.stroke();c.restore();}
  c.restore();
 }
}
