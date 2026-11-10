// Experimental V2-only generated character art. This renderer is opt-in for
// the public 0000000000 local sandbox; production heroes never import it.
// Source images are transparent registered atlases, not screenshot posters.
export const V2_SPRITE_VERSION='grounded-run-cape-edge-guard-v4';
export const V2_SPRITE_ATLASES=Object.freeze({
 idle_run:Object.freeze({file:'idle_run.webp',cols:8,rows:4,cell:160}),
 jump:Object.freeze({file:'jump_fixed.webp',cols:6,rows:2,cell:192}),
 double_jump:Object.freeze({file:'double_jump_fixed.webp',cols:6,rows:2,cell:192})
});
export const V2_SPRITE_SCENES=Object.freeze({
 idleRight:Object.freeze({atlas:'idle_run',row:0,count:8}),
 idleLeft:Object.freeze({atlas:'idle_run',row:1,count:8}),
 runRight:Object.freeze({atlas:'idle_run',row:2,count:8}),
 runLeft:Object.freeze({atlas:'idle_run',row:3,count:8}),
 jumpRight:Object.freeze({atlas:'jump',row:0,count:6}),
 jumpLeft:Object.freeze({atlas:'jump',row:1,count:6}),
 doubleRight:Object.freeze({atlas:'double_jump',row:0,count:6}),
 doubleLeft:Object.freeze({atlas:'double_jump',row:1,count:6})
});
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const frameIndex=(cycle,count)=>((Math.floor(cycle)%count)+count)%count;
// Original generated frames 1–3 show BOTH feet airborne. Playing those
// continuously on the ground caused the backwards-skipping appearance.
// These five frames retain a visible planted/transitioning foot.
export const GROUNDED_RUN_FRAMES=Object.freeze([0,4,5,6,7]);
export function chooseV2Frame(hero,time=0){
 const face=hero?.attack?.face||hero?.face||1;
 const suffix=face<0?'Left':'Right';
 if(hero?.dead||hero?.stun>0)return null;
 // The power posters are storyboards, so these are temporary poses made from
 // the clean V2 atlases while the original game supplies combat/projectile FX.
 // Basic punch/kick still uses the original accurate combat pose as fallback.
 if(hero?.attack?.kind){
  if(hero.attack.power==='strength')return {scene:'run'+suffix,index:5};
  if(hero.attack.power==='superKick')return {scene:'jump'+suffix,index:5};
  return null;
 }
 if(hero?.castAge<.24)return {scene:'idle'+suffix,index:3};
 // A dodge is not a running step. Frame 1 is an airborne storyboard pose;
 // avoid injecting it into the grounded run sequence.
 if(hero?.dodgeAge<.22)return null;
 if(hero?.flying)return {scene:'jump'+suffix,index:3};
 if(hero?.grounded===false){
  const double=hero?.jumps>=2,scene=(double?'double':'jump')+suffix;
  // World physics already moves the body vertically. Atlas frames show poses
  // only; never add the baked-in illustration's jump trajectory a second time.
  const age=clamp(hero?.jumpAge||0,0,.45);
  const index=hero?.vy>150?5:hero?.vy>0?4:Math.min(4,Math.floor(age/.075));
  return {scene,index};
 }
 const speed=Math.abs(hero?.vx||0);
 if(speed>25){
  // h.cycle advances with actual travel distance in the physics engine.
  // Tying sprite phase to distance prevents feet cycling while stationary
  // or the same frames skipping backwards when frame-rate changes.
  const distancePhase=Math.max(0,Math.abs(hero?.cycle||0))*1.2;
  const frame=frameIndex(distancePhase,GROUNDED_RUN_FRAMES.length);
  return {scene:'run'+suffix,index:GROUNDED_RUN_FRAMES[frame]};
 }
 return {scene:'idle'+suffix,index:frameIndex(time*2.7,8)};
}

export class V2GeneratedSprites {
 constructor({loader=null}={}){
  this.images=new Map();this.ready=false;this.loading=null;this.error=null;
  this.loader=loader||null;
  this.unsafeFrames=new Set();
 }
 async preload(){
  if(this.ready)return true;
  if(this.loading)return this.loading;
  const load=this.loader||((name)=>new Promise((resolve,reject)=>{
   if(typeof Image==='undefined')return reject(Error('Browser image decoder unavailable'));
   const img=new Image();
   img.onload=()=>resolve(img);
   img.onerror=()=>reject(Error('V2 test sprite '+name+' failed to load'));
   img.decoding='async';
   img.src=new URL('./'+name,import.meta.url).href;
  }));
  this.loading=(async()=>{
   try{
    const entries=await Promise.all(Object.entries(V2_SPRITE_ATLASES).map(async([name,meta])=>{
     const image=await load(meta.file);
     if(image.width!==meta.cols*meta.cell||image.height!==meta.rows*meta.cell)
      throw Error('Invalid V2 sprite atlas '+name);
     return [name,image];
    }));
    this.images=new Map(entries);
    // Detect artwork already touching the source tile boundary. Scaling or
    // enlarging the destination cannot recover pixels cropped in the atlas.
    // Fall back to the original rig for these frames instead of showing a
    // visibly chopped cape. Keep the diagnosis isolated to the V2 sandbox.
    this.unsafeFrames.clear();
    if(typeof document!=='undefined')for(const [name,image] of entries){
     const meta=V2_SPRITE_ATLASES[name];
     const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
     const context=canvas.getContext('2d',{willReadFrequently:true});
     if(!context)continue;
     context.drawImage(image,0,0);
     const data=context.getImageData(0,0,canvas.width,canvas.height).data;
     for(let row=0;row<meta.rows;row++)for(let col=0;col<meta.cols;col++){
      const x=col*meta.cell,y=row*meta.cell,n=meta.cell;
      let clipped=false;
      // Scan the two-pixel safety perimeter; any opaque pixels there indicate
      // that the silhouette may have been cut off by the sprite exporter.
      for(let k=0;k<n&&!clipped;k++)for(let edge=0;edge<8;edge++){
       const px=edge<2?x+edge:edge<4?x+n-2+(edge-2):x+k;
       const py=edge<4?y+k:edge<6?y+(edge-4):y+n-2+(edge-6);
       if(data[(py*canvas.width+px)*4+3]>24){clipped=true;break;}
      }
      if(clipped)this.unsafeFrames.add(name+':'+row+':'+col);
     }
    }
    if(this.unsafeFrames.size)console.warn('[V2 sprite edge guard] Falling back to original art for possible clipped frames:',[...this.unsafeFrames]);
    this.error=null;this.ready=true;return true;
   }catch(e){this.images.clear();this.error=e.message;this.ready=false;return false;}
   finally{this.loading=null;}
  })();
  return this.loading;
 }
 frame(hero,time){
  const chosen=chooseV2Frame(hero,time);
  if(!chosen)return null;
  const scene=V2_SPRITE_SCENES[chosen.scene];if(!scene)return null;
  return {...chosen,...scene};
 }
 draw(ctx,x,y,hero,time,scale=1){
  if(!this.ready)return false;
  const clip=this.frame(hero,time);if(!clip)return false;
  const atlas=V2_SPRITE_ATLASES[clip.atlas],image=this.images.get(clip.atlas);
  if(!image||!(scale>0)||this.unsafeFrames.has(clip.atlas+':'+clip.row+':'+clip.index))return false;
  const cell=atlas.cell,col=clamp(clip.index,0,clip.count-1);
  const drawSize=(atlas.cell===192?156:130)*scale; // Same visual hero size, larger cape-safe source frame.
  ctx.save();
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  // Place feet at the physics-controlled ground point.
  ctx.drawImage(image,col*cell,clip.row*cell,cell,cell,
   x-drawSize*.50,y-drawSize*(atlas.cell===192?173/192:.96),drawSize,drawSize);
  ctx.restore();
  return true;
 }
}
export const v2GeneratedSprites=new V2GeneratedSprites();
