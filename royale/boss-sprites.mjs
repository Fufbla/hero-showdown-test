// Royale-only presentation. The combat simulation remains the sole timing authority.
import {BOSS_SPRITE_ATLASES as DATA} from './assets/boss-sprites/atlas-data.mjs';
export const BOSS_SPRITE_DATA=DATA;
const clamp=n=>Math.max(0,Math.min(1,n));
const mix=(a,b,t)=>a+(b-a)*t;
export const isBossSpriteRegion=id=>typeof id==='number'&&Object.hasOwn(DATA.bosses,id);
export function usesBossSprites(b){return !b.legendary&&!b.legendaryId&&!b.legendaryHelper&&!b.helperTheme&&isBossSpriteRegion(b.region??b.regionId);}
const rows={1:{swipe:2,throw:3,slam:4},2:{swipe:2,branch:2,vine:3,thorns:4,roots:5},3:{punch:2,toxic:3,slam:4,shockwave:4,hazard:5}};
export function bossSpritePose(b,time=0){
 const region=b.region??b.regionId,profile=DATA.bosses[region];if(!profile)return null;
 const moving=Math.abs((b.x||0)-(b.prevX??b.x??0))>.01||Math.abs(b.vx||0)>3;
 let row=0,pose=0,state='idle';
 if(b.state==='dead'){state='defeat';row=profile.states.indexOf(state);pose=Math.min(3,Math.floor(Math.max(0,b.age)/.23));}
 else if(['windup','active','recover'].includes(b.state)&&b.attack){
  row=rows[region][b.attack.kind]??2;state=profile.states[row];
  if(b.state==='windup')pose=clamp(b.age/Math.max(.001,b.attack.warning))<.48?0:1;
  // Regional fire() executes at the beginning of active; show contact immediately.
  else if(b.state==='active')pose=2;
  else {pose=3;if(b.age/Math.max(.001,b.attack.recovery)>.82){row=0;pose=0;state='idle';}}
 }else if((b.flash||0)>0){state='hit';row=profile.states.indexOf(state);pose=Math.min(3,Math.floor(clamp((.12-b.flash)/.12)*4));}
 else {state=moving?'walk':'idle';row=moving?1:0;pose=Math.floor(Math.max(0,time)*(moving?6:2))%4;}
 return {region,redesigned:true,sheet:`boss-sprites-${region}`,frame:row*4+pose,state,combatState:b.state,kind:b.attack?.kind||'',anchor:DATA.anchor,referenceHeight:DATA.referenceHeight};
}
function loadPNG(url){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error(`Could not load ${url.pathname}`));im.src=url.href;});}
export class BossSprites{
 constructor({loadImages=typeof Image!=='undefined',imageLoader=loadPNG,canvasFactory}={}){this.loadImages=loadImages;this.imageLoader=imageLoader;this.canvasFactory=canvasFactory||(()=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(DATA.cell,DATA.cell):Object.assign(document.createElement('canvas'),{width:DATA.cell,height:DATA.cell}));this.cache=new Map();this.visuals=new WeakMap();this.currentRegion=null;this.whenLoaded=Promise.resolve(false);}
 get ready(){return !!this.cache.get(this.currentRegion)?.ready;}
 prepare(region){
  this.currentRegion=region;let entry=this.cache.get(region);
  if(entry){this.cache.delete(region);this.cache.set(region,entry);this.whenLoaded=entry.promise;return entry.promise;}
  entry={ready:false,image:null,error:null};this.cache.set(region,entry);
  // A single image is reused for all 32 frames. Keep at most two decoded atlases.
  while(this.cache.size>2)this.cache.delete(this.cache.keys().next().value);
  entry.promise=!this.loadImages?Promise.resolve(false):(async()=>{try{
   const profile=DATA.bosses[region];if(!profile)throw Error(`Unknown boss sprite region ${region}`);
   const im=await this.imageLoader(new URL(`../${profile.file}`,import.meta.url));
   if((im.naturalWidth||im.width)!==DATA.cell*DATA.columns||(im.naturalHeight||im.height)!==DATA.cell*DATA.rows)throw Error(`Invalid atlas dimensions for ${profile.name}`);
   entry.image=im;entry.ready=true;return true;
  }catch(error){entry.error=error.message;return false;}})();this.whenLoaded=entry.promise;return entry.promise;
 }
 step(b,time){
  const selection=bossSpritePose(b,time);this.prepare(selection.region);let v=this.visuals.get(b);
  if(!v){v={selection,previous:null,transition:time,lastPhase:b.phase,surgeStart:-Infinity};this.visuals.set(b,v);}
  if(b.phase>v.lastPhase){v.surgeStart=time;v.lastPhase=b.phase;}
  if(selection.region===1&&selection.state==='idle'&&time-v.surgeStart<.4){selection.state='surge';selection.frame=28+Math.min(3,Math.floor(Math.max(0,time-v.surgeStart)*10));}
  if(v.selection.frame!==selection.frame){
   // No blend across attack contact: it must be visible on the exact damage tick.
   const contact=selection.combatState==='active'||v.selection.combatState==='active';
   v.previous=contact?null:v.selection;v.transition=time;
  }
  v.selection=selection;v.time=time;return this.inspect(b);
 }
 inspect(b){const v=this.visuals.get(b),region=b.region??b.regionId,entry=this.cache.get(region);return {name:DATA.bosses[region]?.name,design:DATA.bosses[region]?.design,temporary:false,redesigned:true,loaded:!!entry?.ready,selection:v?.selection,error:entry?.error||null};}
 draw(c,b,{time=0,alpha=1}={}){
  const v=this.visuals.get(b);if(!v)return;const p=v.selection,entry=this.cache.get(p.region);
  if(b.state==='dead'&&b.age>=1.25)return;
  const x=mix(b.prevX??b.x,b.x,clamp(alpha)),y=mix(b.prevY??b.y,b.y,clamp(alpha)),scale=(b.h||180)/DATA.referenceHeight;
  c.save();c.translate(x,y);
  if(!entry?.ready){
   c.fillStyle='#8b9e77';c.globalAlpha*=.6;c.fillRect(-b.w/2,-b.h,b.w,b.h);
   c.globalAlpha=1;c.fillStyle='#fff0c5';c.font='bold 10px system-ui';c.textAlign='center';c.fillText(entry?.error?'BOSS ART UNAVAILABLE':'LOADING BOSS ART',0,-b.h-14);c.restore();return;
  }
  if(b.state==='dead')c.globalAlpha*=1-clamp((b.age-.95)/.3);
  // Phase effects describe existing phase state only; they create no damage or timers.
  if(b.state!=='dead'&&b.phase>=2){c.save();c.globalAlpha*=b.phase===3?.65:.4;c.fillStyle=b.phase===3?'#d5fa52':'#92dd42';for(let i=0;i<(b.phase===3?6:3);i++){const angle=time*1.2+i*2.399,r=b.w*.4;c.beginPath();c.arc(Math.cos(angle)*r,-b.h*.6+Math.sin(angle*1.3)*b.h*.24,1.5+(i%2),0,Math.PI*2);c.fill();}c.restore();}
  c.scale((b.face||-1)*scale,scale);
  // All packed poses share one foot origin and one scale; collapse never stretches.
  const draw=(frame,opacity)=>{if(opacity<=0)return;const f=DATA.bosses[p.region].frames[frame];c.save();c.globalAlpha*=opacity;c.drawImage(entry.image,...f.crop,-DATA.anchor[0],-DATA.anchor[1],DATA.cell,DATA.cell);c.restore();};
  const blend=v.previous?clamp((time-v.transition)/.045):1;
  if(v.previous&&blend<1){
   // Blend on transparent offscreen pixels, adding premultiplied colors. Blending
   // two semiopaque sprites directly onto the world darkens overlaps each frame.
   v.blendCanvas||=this.canvasFactory();const bc=v.blendCanvas.getContext('2d');bc.clearRect(0,0,DATA.cell,DATA.cell);
   bc.globalCompositeOperation='source-over';bc.globalAlpha=1-blend;bc.drawImage(entry.image,...DATA.bosses[p.region].frames[v.previous.frame].crop,0,0,DATA.cell,DATA.cell);
   bc.globalCompositeOperation='lighter';bc.globalAlpha=blend;bc.drawImage(entry.image,...DATA.bosses[p.region].frames[p.frame].crop,0,0,DATA.cell,DATA.cell);
   bc.globalCompositeOperation='source-over';bc.globalAlpha=1;c.drawImage(v.blendCanvas,-DATA.anchor[0],-DATA.anchor[1]);
  }else draw(p.frame,1);
  // A hit during a telegraph must not replace or delay its attack pose.
  if((b.flash||0)>0&&b.state!=='idle'){c.save();c.globalAlpha*=.55*clamp(b.flash/.12);c.strokeStyle='#fff1cf';c.lineWidth=2/scale;c.beginPath();c.arc(0,-DATA.referenceHeight*.55,DATA.referenceHeight*.28,-1,1);c.stroke();c.restore();}
  c.restore();
 }
}
