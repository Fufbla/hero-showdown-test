import {CostumeEngine as FashionCostumeEngine} from '../../../royale/fashion/engine.mjs?four-base=1';
import {FullBodyAnimator,validateManifest} from '../animation.mjs';
import {STEEL_ID} from '../outfit-engine.mjs';
import {PUPPY_ID,PUPPY_STATES} from './definitions.mjs';
import {PUPPY_TEST_ENABLED} from './scope.mjs';

// A puppy is registered in exactly the same logical space as the other outfits.
// Each authored whole-body frame keeps its own hood opening and effect anchors.
export function validatePuppyManifest(raw,atlas){
 const m=validateManifest(raw);
 if(m.id!==PUPPY_ID||m.head.mode!=='face-only'||m.cell[0]!==256||m.cell[1]!==256||m.foot[0]!==128||m.foot[1]!==230||m.worldScale!==.62)
  throw Error('Invalid Golden Puppy costume registration');
 if(!(m.strideDistance>0))throw Error('Missing puppy running stride');
 for(const state of PUPPY_STATES){
  const a=m.animations[state];
  if(!a||a.frames.length<2||!(a.duration>0)||a.frames.some(i=>!Number.isInteger(i)||!m.frames[i]))throw Error('Missing puppy animation: '+state);
 }
 for(const [i,f] of m.frames.entries()){
  if(!Array.isArray(f.face)||f.face.length!==4||!f.face.every(Number.isFinite)||f.face[2]<=0||f.face[3]<=0)
   throw Error('Missing puppy face opening: '+i);
  if(!Array.isArray(f.headBox)||f.headBox.length!==4||!f.headBox.every(Number.isFinite))throw Error('Missing puppy head bounds: '+i);
  for(const [name,r] of [['face',f.face],['headBox',f.headBox]])if(r[0]<0||r[1]<0||r[0]+r[2]>256||r[1]+r[3]>256)throw Error('Puppy '+name+' exceeds frame: '+i);
  if(f.head[0]<0||f.head[0]>256||f.head[1]<0||f.head[1]>256||f.hand.length!==2||f.hand.some(n=>n<0||n>256))throw Error('Puppy attachment exceeds frame: '+i);
  const [x,y,w,h]=f.rect;
  if(x<0||y<0||atlas&&(x+w>atlas.width||y+h>atlas.height))throw Error('Puppy frame exceeds atlas: '+i);
 }
 return m;
}

export class CostumeEngine extends FashionCostumeEngine{
 async preload(id){
  if(id!==PUPPY_ID)return super.preload(id);
  if(!PUPPY_TEST_ENABLED){this.error='Golden Puppy is available in the 0000000000 test only.';return false;}
  if(this.outfits.has(id))return true;
  if(this.pending.has(id))return this.pending.get(id);
  const task=(async()=>{try{
   const url=new URL('./assets/manifest.json',import.meta.url);
   const manifest=validatePuppyManifest(await this.jsonLoader(url));
   const [atlas,,steel]=await Promise.all([this.imageLoader(new URL(manifest.atlas,url)),this.face.preload(),this.steel.preload(STEEL_ID)]);
   if(!steel)throw Error(this.steel.error||'Steel transformation artwork unavailable');
   validatePuppyManifest(manifest,atlas);
   this.outfits.set(id,{manifest,atlas,masks:new Map()});this.error=null;return true;
  }catch(error){this.error=error.message;return false;}finally{this.pending.delete(id);}})();
  this.pending.set(id,task);return task;
 }
 draw(c,x,y,look,hero,time,{id,owner=hero,scale=1}={}){
  if(id!==PUPPY_ID||hero.steel)return super.draw(c,x,y,look,hero,time,{id,owner,scale});
  const loaded=this.outfits.get(id);
  if(!PUPPY_TEST_ENABLED||!loaded||!this.face.ready)return false;
  const m=loaded.manifest;
  let animator=this.states.get(owner);
  if(!animator||animator.manifest!==m){animator=new FullBodyAnimator(m);this.states.set(owner,animator);}
  const sample=animator.sample(hero,time),f=sample.frame;
  // Flight is authored in the atlas. Preserve its complete pose and cycle;
  // the old mascot renderer rotates/freezes older upright flight artwork.
  const closed=sample.state==='defeat'||sample.state==='idle'&&time%3.9>3.73;
  const picture=this.compose(id,sample.frameIndex,look,closed,sample.direction),s=m.worldScale*scale;
  c.save();c.translate(x,y);c.scale(sample.direction*s,s);c.translate(-m.foot[0],-m.foot[1]);
  if(hero.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha*=.78;
  c.drawImage(picture,0,0);c.restore();
  const world=p=>[(p[0]-m.foot[0])*m.worldScale,(p[1]-m.foot[1])*m.worldScale];
  const neck=world(f.head),hand=world(f.hand),elbow=[(neck[0]+hand[0])/2,(neck[1]+hand[1])/2+8];
  this.lastFrame={outfit:id,state:sample.state,frame:sample.frameIndex,direction:sample.direction,hairVisible:true,hairContained:true,head:[...f.head],foot:[...m.foot]};
  return {artSource:'full-body-costume',clip:sample.state,head:neck,faceCenter:neck,shoulder:neck,hip:[0,-35],arms:[[neck,elbow,hand],[neck,elbow,hand]],legs:[],opacity:1};
 }
}
export const costumeSprites=new CostumeEngine();
