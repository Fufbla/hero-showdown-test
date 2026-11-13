import {FullBodyAnimator,validateManifest} from '../kingjames/animation.mjs';
import {OutfitEngine,STEEL_ID} from '../kingjames/outfit-engine.mjs';
import {sanitizeLook} from '../../royale/appearance.mjs';
import {COSTUMES,costumeById} from './catalog.mjs';
import {CostumeFace,appearanceKey,browserCanvas} from './face.mjs';
const browserImage=url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Costume atlas unavailable'));image.src=url.href;});
const browserJSON=async url=>{const response=await fetch(url);if(!response.ok)throw Error('Costume manifest unavailable');return response.json();};
export class CostumeEngine {
 constructor({imageLoader=browserImage,jsonLoader=browserJSON,canvasFactory=browserCanvas}={}){
  Object.assign(this,{imageLoader,jsonLoader,factory:canvasFactory});this.face=new CostumeFace({imageLoader,canvasFactory});this.outfits=new Map();this.pending=new Map();this.states=new WeakMap();this.composites=new Map();this.lastFrame=null;
  this.steel=new OutfitEngine({imageLoader,jsonLoader,canvasFactory});this.steel.selected=()=>STEEL_ID;this.steel.enabled=true;
  this.approved=new OutfitEngine({imageLoader,jsonLoader,canvasFactory});this.approved.selected=()=>this.approved.outfitID;
 }
 async preload(id){
  if(this.outfits.has(id))return true;if(this.pending.has(id))return this.pending.get(id);
  if(!costumeById(id))return false;
  const task=(async()=>{try{
   if(costumeById(id).renderer==='approved'){
    const source=new URL(costumeById(id).pieces[0].assetManifest,import.meta.url);
    const [ready,steel]=await Promise.all([this.approved.preload(id,source),this.steel.preload(STEEL_ID)]);
    if(!ready||!steel)throw Error(this.approved.error||this.steel.error);
    this.outfits.set(id,{...this.approved.outfits.get(id),approved:true});this.error=null;return true;
   }
   const url=new URL('./assets/'+id+'/manifest.json',import.meta.url),manifest=validateManifest(await this.jsonLoader(url));
   if(manifest.id!==id||manifest.frames.length!==48)throw Error('Invalid approved costume atlas');
   const [atlas,,steel]=await Promise.all([this.imageLoader(new URL(manifest.atlas,url)),this.face.preload(),this.steel.preload(STEEL_ID)]);
   if(!steel)throw Error(this.steel.error);
   for(const f of manifest.frames)if(!f.face?.every(Number.isFinite)||f.rect[0]+f.rect[2]>atlas.width||f.rect[1]+f.rect[3]>atlas.height)throw Error('Costume registration does not match atlas');
   let lettering=null,letteringMask=null;
   if(id==='fishsticks-costume'){lettering=await this.jsonLoader(new URL('lettering.json',url));letteringMask=await this.imageLoader(new URL(lettering.atlas,url));if(lettering.frames.length!==48||letteringMask.width!==atlas.width||letteringMask.height!==atlas.height)throw Error('Invalid costume lettering mask');}
   this.outfits.set(id,{manifest,atlas,lettering,letteringMask,masks:new Map()});this.error=null;return true;
  }catch(error){this.error=error.message;return false;}finally{this.pending.delete(id);}})();
  this.pending.set(id,task);return task;
 }
 masks(id,index){
  const loaded=this.outfits.get(id);if(loaded.masks.has(index))return loaded.masks.get(index);
  const m=loaded.manifest,f=m.frames[index],body=this.factory(...m.cell),c=body.getContext('2d',{willReadFrequently:true});c.drawImage(loaded.atlas,...f.rect,0,0,...m.cell);
  const pixels=c.getImageData(0,0,...m.cell),mask=this.factory(...m.cell),mc=mask.getContext('2d'),face=mc.createImageData(...m.cell),skin=[];
  const [fx,fy,fw,fh]=f.face,skinKeys=!['stuffed-animal-costume','reaper-costume','fishsticks-costume'].includes(id);
  for(let y=0;y<m.cell[1];y++)for(let x=0;x<m.cell[0];x++){
   const i=(y*m.cell[0]+x)*4,[r,g,b,a]=pixels.data.subarray(i,i+4);if(a<8){pixels.data[i+3]=0;continue;}
   if(x>=fx-3&&x<=fx+fw+3&&y>=fy-3&&y<=fy+fh+3&&r>70&&b>70&&r>g*1.5&&b>g*1.5){face.data[i]=face.data[i+1]=face.data[i+2]=255;face.data[i+3]=a;pixels.data[i+3]=0;}
   
  }
  if(skinKeys){
   const W=m.cell[0],H=m.cell[1],allowed=new Uint8Array(W*H),seedSeen=new Uint8Array(W*H);
   const seed=n=>{const i=n*4,r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];return pixels.data[i+3]>96&&r<65&&g>175&&b>175&&Math.abs(g-b)<30;};
   // Only substantial cyan hand markers are skin. Small cyan highlights on
   // blue fabric are preserved, and dark outlines cannot join a hand to a tail.
   for(let n=0;n<W*H;n++)if(!seedSeen[n]&&seed(n)){
    const part=[n];seedSeen[n]=1;let x0=W,y0=H,x1=0,y1=0;
    for(let q=0;q<part.length;q++){const at=part[q],x=at%W,y=Math.floor(at/W);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);for(const k of [x>0?at-1:-1,x<W-1?at+1:-1,y>0?at-W:-1,y<H-1?at+W:-1])if(k>=0&&!seedSeen[k]&&seed(k)){seedSeen[k]=1;part.push(k);}}
    if(part.length<(id==='dolphin-costume'?12:1))continue;const padX=id!=='dolphin-costume'&&part.length<20?15:5;
    for(let y=Math.max(0,y0-5);y<=Math.min(H-1,y1+5);y++)for(let x=Math.max(0,x0-padX);x<=Math.min(W-1,x1+padX);x++)allowed[y*W+x]=1;
   }
   const candidate=n=>{const i=n*4,r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];return allowed[n]&&pixels.data[i+3]>8&&g>8&&b>8&&r<Math.min(g,b)*.96&&Math.abs(g-b)<Math.max(g,b)*.4;};
   for(let n=0;n<W*H;n++)if(candidate(n)){const i=n*4;skin.push([i,(pixels.data[i+1]+pixels.data[i+2])/510]);}
  }
  c.putImageData(pixels,0,0);if(!costumeById(id).hideHair)c.clearRect(fx-2,fy-2,fw+4,fh+4);mc.putImageData(face,0,0);
  const result={body,mask,skin};loaded.masks.set(index,result);return result;
 }
 compose(id,index,raw,closed=false,direction=1){
  const look=sanitizeLook(raw),costume=costumeById(id),loaded=this.outfits.get(id),key=id+'|'+index+'|'+closed+'|'+(id==='fishsticks-costume'?direction:1)+'|'+appearanceKey(look,costume.hideHair);
  if(this.composites.has(key)){const old=this.composites.get(key);this.composites.delete(key);this.composites.set(key,old);return old;}
  const m=loaded.manifest,f=m.frames[index],{body,mask,skin}=this.masks(id,index),canvas=this.factory(...m.cell),c=canvas.getContext('2d');c.drawImage(body,0,0);
  if(skin.length){const data=c.getImageData(0,0,...m.cell),rgb=[1,3,5].map(i=>parseInt(look.skin.slice(i,i+2),16));for(const [i,shade]of skin)for(let k=0;k<3;k++)data.data[i+k]=Math.min(255,rgb[k]*(.55+.55*shade));c.putImageData(data,0,0);}
  const head=this.factory(...m.cell),hc=head.getContext('2d');this.face.draw(hc,look,f,{hideHair:costume.hideHair,closed});
  if(costume.hideHair){hc.globalCompositeOperation='destination-in';hc.drawImage(mask,0,0);}
  c.drawImage(head,0,0);
  // Clear old printing through an authored cloth mask. Arms and gloves occlude
  // the decal; reverse only the letters before mirroring a left-facing body.
  if(loaded.lettering){
   const [x,y,w,h]=loaded.lettering.frames[index],decal=this.factory(...m.cell),dc=decal.getContext('2d');
   dc.fillStyle='#fff';dc.fillRect(0,0,...m.cell);dc.save();if(direction<0){dc.translate(2*x+w,0);dc.scale(-1,1);}
   dc.textAlign='center';dc.fillStyle='#17151b';dc.font='900 '+Math.max(8,h*.34)+'px sans-serif';dc.fillText('I',x+w*.31,y+h*.42);dc.fillStyle='#e3324a';dc.fillText('♥',x+w*.63,y+h*.42);
   dc.fillStyle='#17151b';dc.font='900 '+Math.max(7,h*.28)+'px sans-serif';dc.fillText('FISHSTICKS',x+w/2,y+h*.82,w*.96);dc.restore();
   dc.globalCompositeOperation='destination-in';dc.drawImage(loaded.letteringMask,...f.rect,0,0,...m.cell);c.drawImage(decal,0,0);
  }
  this.composites.set(key,canvas);while(this.composites.size>128)this.composites.delete(this.composites.keys().next().value);return canvas;
 }
 draw(c,x,y,look,hero,time,{id,owner=hero,scale=1}={}){
  const loaded=this.outfits.get(id);if(!loaded)return false;
  if(hero.steel){const pose=this.steel.draw(c,x,y,look,hero,time,{owner,scale});this.lastFrame={...this.steel.lastFrame,costume:id,hairVisible:false};return pose;}
  if(loaded.approved){
   this.approved.outfitID=id;const pose=this.approved.draw(c,x,y,look,hero,time,{owner,scale});
   this.lastFrame={...this.approved.lastFrame,hairVisible:true};return pose&&{...pose,artSource:'full-body-costume'};
  }
  if(!this.face.ready)return false;
  const m=loaded.manifest;let animator=this.states.get(owner);if(!animator||animator.manifest!==m){animator=new FullBodyAnimator(m);this.states.set(owner,animator);}
  const sample=animator.sample(hero,time),f=sample.frame,closed=sample.state==='defeat'||sample.state==='idle'&&time%3.9>3.73;
  const picture=this.compose(id,sample.frameIndex,look,closed,sample.direction),s=m.worldScale*scale;
  c.save();c.translate(x,y);c.scale(sample.direction*s,s);c.translate(-m.foot[0],-m.foot[1]);if(hero.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha*=.78;c.drawImage(picture,0,0);
  c.restore();const world=p=>[(p[0]-m.foot[0])*m.worldScale,(p[1]-m.foot[1])*m.worldScale],neck=world(f.head),hand=world(f.hand),elbow=[(neck[0]+hand[0])/2,(neck[1]+hand[1])/2+8];
  this.lastFrame={outfit:id,state:sample.state,frame:sample.frameIndex,direction:sample.direction,hairVisible:!costumeById(id).hideHair};
  return {artSource:'full-body-costume',clip:sample.state,head:neck,faceCenter:neck,shoulder:neck,hip:[0,-35],arms:[[neck,elbow,hand],[neck,elbow,hand]],legs:[],opacity:1};
 }
}
export const costumeSprites=new CostumeEngine();
