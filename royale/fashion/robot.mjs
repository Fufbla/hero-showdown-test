import {FullBodyAnimator,validateManifest} from '../../royale-v3-staging/kingjames/animation.mjs';
import {STEEL_ID} from '../../royale-v3-staging/kingjames/outfit-engine.mjs';
import {ROBOT_OUTFIT} from './definitions.mjs';

// Complete authored robot poses include their own enclosed head. No saved
// appearance is recolored, hidden permanently, or replaced by this renderer.
export async function preloadRobot(engine){
 const id=ROBOT_OUTFIT.id;
 if(engine.outfits.has(id))return true;
 if(engine.pending.has(id))return engine.pending.get(id);
 const task=(async()=>{try{
  const url=new URL('./assets/robot-costume/manifest.json',import.meta.url);
  const manifest=validateManifest(await engine.jsonLoader(url));
  if(manifest.id!==id||manifest.frames.length!==24||manifest.head.mode!=='enclosed')throw Error('Invalid robot costume manifest');
  const [atlas,steel]=await Promise.all([engine.imageLoader(new URL(manifest.atlas,url)),engine.steel.preload(STEEL_ID)]);
  if(!steel)throw Error(engine.steel.error);
  for(const f of manifest.frames){
   const r=f.sourceRect,p=f.paintRect;
   if(!r||r.length!==4||!r.every(Number.isFinite)||!p||p.length!==4||!p.every(Number.isFinite)||r[0]<0||r[1]<0||r[2]<=0||r[3]<=0||r[0]+r[2]>atlas.width||r[1]+r[3]>atlas.height||p[2]<=0||p[3]<=0)throw Error('Robot pose exceeds its atlas');
  }
  engine.outfits.set(id,{robot:true,manifest,atlas});engine.error=null;return true;
 }catch(e){engine.error=e.message;return false;}finally{engine.pending.delete(id);}})();
 engine.pending.set(id,task);return task;
}

export function drawRobot(engine,c,x,y,hero,time,{owner=hero,scale=1}={}){
 const id=ROBOT_OUTFIT.id,loaded=engine.outfits.get(id);
 if(!loaded?.robot)return false;
 const m=loaded.manifest;
 let animator=engine.states.get(owner);
 if(!animator||animator.manifest!==m){animator=new FullBodyAnimator(m);engine.states.set(owner,animator);}
 const sample=animator.sample(hero,time),f=sample.frame,s=m.worldScale*scale;
 c.save();c.translate(x,y);c.scale(sample.direction*s,s);c.translate(-m.foot[0],-m.foot[1]);
 if(hero.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha*=.78;
 c.drawImage(loaded.atlas,...f.sourceRect,...f.paintRect);c.restore();
 const world=p=>[(p[0]-m.foot[0])*m.worldScale,(p[1]-m.foot[1])*m.worldScale];
 const neck=world(f.head),hand=world(f.hand),elbow=[(neck[0]+hand[0])*.5,(neck[1]+hand[1])*.5+8];
 engine.lastFrame={outfit:id,state:sample.state,frame:sample.frameIndex,direction:sample.direction,hairVisible:false,hairContained:true,head:[...f.head],foot:[...m.foot]};
 return {artSource:'full-body-costume',clip:sample.state,head:neck,faceCenter:neck,shoulder:neck,hip:[0,-35],arms:[[neck,elbow,hand],[neck,elbow,hand]],legs:[],opacity:1};
}
