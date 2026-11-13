import {BossArt as OriginalBossArt} from '../../royale/boss-art.mjs?bossFallback=1';
import {bossId,regionId,spritePose,VERSION} from './model.mjs';
const clamp=n=>Math.max(0,Math.min(1,n));
const loadImage=url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Boss artwork failed to load: '+url.pathname));im.src=url.href;});
// Small atlas cache; complete frames are rendered with one fixed character scale.
export class BossArt{
 constructor(options={}){this.original=new OriginalBossArt(options);this.loadImages=options.loadImages??typeof Image!=='undefined';this.loader=options.spriteImageLoader||loadImage;this.cache=new Map();this.visuals=new WeakMap();this.current=null;this.whenLoaded=Promise.resolve(false);this.errors=[];this.manifest=options.manifest||null;this.manifestPromise=null;}
 get ready(){return this.current?!!this.cache.get(this.current)?.ready:this.original.ready;}
 async metadata(){if(this.manifest)return this.manifest;if(!this.manifestPromise)this.manifestPromise=fetch(new URL('./assets/manifest.json?v='+VERSION,import.meta.url)).then(r=>{if(!r.ok)throw Error('Boss atlas manifest unavailable');return r.json();}).then(m=>this.manifest=m);return this.manifestPromise;}
 prepare(region,{legacy=false}={}){
  if(legacy){return this.original.prepare(region,{legacy:true});}
  const id=regionId(region);this.current=id;let entry=this.cache.get(id);
  if(entry){this.cache.delete(id);this.cache.set(id,entry);this.whenLoaded=entry.promise;return entry.promise;}
  entry={ready:false,error:null};this.cache.set(id,entry);
  while(this.cache.size>3)this.cache.delete(this.cache.keys().next().value);
  entry.promise=!this.loadImages?Promise.resolve(false):(async()=>{try{
   const manifest=await this.metadata(),profile=manifest.bosses[id];if(!profile)throw Error('Missing boss atlas '+id);
   const im=await this.loader(new URL('./assets/'+id+'.png?v='+VERSION,import.meta.url));
   if((im.naturalWidth||im.width)!==profile.width||(im.naturalHeight||im.height)!==profile.height)throw Error('Wrong atlas dimensions '+id);
   entry.image=im;entry.profile=profile;entry.ready=true;return true;
  }catch(e){entry.error=e.message;this.errors.push(e.message);return false;}})();this.whenLoaded=entry.promise;return entry.promise;
 }
 step(b,time,dt,heroX){
  const id=bossId(b);if(!id)return this.original.step(b,time,dt,heroX);
  this.prepare(id);let v=this.visuals.get(b);const pose=spritePose(b,time);
  if(!v){v={pose,lastPhase:b.phase,phaseAt:-Infinity};this.visuals.set(b,v);}
  if(v.lastPhase!==b.phase){v.phaseAt=time;v.lastPhase=b.phase;}
  if(b.state==='idle'&&time-v.phaseAt<.35)pose.frame=15;
  v.pose=pose;return this.inspect(b);
 }
 inspect(b){const id=bossId(b);if(!id)return this.original.inspect(b);const e=this.cache.get(id);return {id,loaded:!!e?.ready,temporary:false,redesigned:true,version:VERSION,selection:this.visuals.get(b)?.pose,error:e?.error||null};}
 draw(c,b,{time=0,alpha=1}={}){
  const id=bossId(b);if(!id)return this.original.draw(c,b,{time,alpha});
  const e=this.cache.get(id),v=this.visuals.get(b);if(!e?.ready||!v)return;
  if(b.state==='dead'&&b.age>=1.25)return;
  const p=e.profile,cw=p.width/4,ch=p.height/4,scale=b.h/p.referenceHeight;
  const x=(b.prevX??b.x)+(b.x-(b.prevX??b.x))*clamp(alpha),y=(b.prevY??b.y)+(b.y-(b.prevY??b.y))*clamp(alpha);
  c.save();c.translate(x,y);
  if(b.state==='dead')c.globalAlpha*=1-clamp((b.age-.9)/.35);
  // Phase charge is attached to the body, never a floor warning outline.
  if(b.state!=='dead'&&b.phase>1){c.save();c.globalAlpha*=b.phase===3?.55:.3;c.fillStyle=p.phaseColor||'#e5cf85';for(let i=0;i<(b.phase===3?10:5);i++){const angle=i*2.399+time*1.4;c.beginPath();c.arc(Math.cos(angle)*b.w*.38,-b.h*.55+Math.sin(angle*1.3)*b.h*.35,1.5+i%3,0,Math.PI*2);c.fill();}c.restore();}
  c.scale(v.pose.face*scale,scale);
  const draw=(n,opacity)=>{const f=p.frames[n],crop=f.crop||[(n%4)*cw,Math.floor(n/4)*ch,cw,ch],anchor=f.anchor||p.anchor||[cw/2,ch*.9];c.save();c.globalAlpha*=opacity;c.drawImage(e.image,...crop,-anchor[0],-anchor[1],crop[2],crop[3]);c.restore();};
  // One authored full-body frame at a time: no doubled limbs or ghosted silhouettes.
  draw(v.pose.frame,1);c.restore();
 }
}
