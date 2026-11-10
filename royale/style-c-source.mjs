import {headwearFit} from './headwear-fit.mjs';
import {sanitizeLook,costumePalette} from './appearance.mjs';
import {STYLE_C_DEFAULTS} from './style-c-defaults.mjs';
import {drawStyleCHair} from './style-c-hair.mjs';
import {hairMotion} from './hair-art.mjs';
import {STYLE_C_FACE_ANCHORS,drawStyleCFace,styleCFaceChanged} from './style-c-face.mjs';
import {drawStyleCMotionLimb,sampleStyleCMotion} from './style-c-motion.mjs';
import {drawStyleCEquipment,drawStyleCEquipmentAura,withStyleCEquipmentGlow} from './style-c-equipment.mjs';
import {drawSourceRest,drawRegisteredHead,drawStyleCCape,drawStyleCTorso,styleCBodyStatus} from './style-c-body.mjs';
import {drawDefaultSprite,isDefaultLook} from './style-c-sprites.mjs';
import {drawClothingPass} from './cosmetics/renderer.mjs';
export {prepareStyleCMaterials as prepareSourceArt} from './style-c-materials.mjs';

const UNIT=.35;
const models={
 male:{sex:'male',box:[435,250,289,345],origin:[632,590],hip:[632,491],shoulder:[631,439],head:[632,383],
  arms:[[[666,442],[679,465],[697,486]],[[585,440],[568,466],[578,492]]],
  legs:[[[647,493],[666,536],[676,578]],[[615,493],[592,538],[581,576]]],
  face:[[607,346],[682,342],[691,367],[688,397],[671,416],[641,423],[614,415],[598,403],[579,398],[574,382],[591,370]],
 },
 female:{sex:'female',box:[778,250,246,345],origin:[940,590],hip:[940,492],shoulder:[937,444],head:[946,389],
  arms:[[[976,448],[984,474],[996,487]],[[888,446],[883,471],[888,493]]],
  legs:[[[954,494],[973,540],[984,576]],[[928,494],[916,538],[906,575]]],
  face:[[912,336],[967,330],[990,350],[999,381],[994,411],[978,431],[947,439],[921,429],[900,415],[883,405],[879,385],[894,371]],
 }
};

const bodyWidths={slender:.87,balanced:1,strong:1.12,full:1.22};
const sourceModelCache=new Map();
function fitModel(l){
  const b=models[l.presentation];
  if(l.torso===1&&l.shoulders===1&&l.hips===1&&l.legs===1)return b;
  const key=[l.presentation,l.torso,l.shoulders,l.hips,l.legs].join('|');
  if(sourceModelCache.has(key))return sourceModelCache.get(key);
  const legRise=(b.origin[1]-b.hip[1])*(l.legs-1);
  const hip=[b.hip[0],b.hip[1]-legRise];
  const shoulder=[b.shoulder[0],hip[1]-(b.hip[1]-b.shoulder[1])*l.torso];
  function translateChain(chain,x,y){return chain.map(point=>[point[0]+x,point[1]+y]);}
  const arms=b.arms.map(chain=>translateChain(chain,(chain[0][0]-b.shoulder[0])*(l.shoulders-1),shoulder[1]-b.shoulder[1]));
  const legs=b.legs.map(chain=>translateChain(chain,(chain[0][0]-b.hip[0])*(l.hips-1),-legRise));
  const m={...b,hip,shoulder,arms,legs,restAnkleY:b.legs.map(chain=>chain[2][1]),head:[b.head[0],b.head[1]+shoulder[1]-b.shoulder[1]]};
  sourceModelCache.set(key,m);if(sourceModelCache.size>24)sourceModelCache.delete(sourceModelCache.keys().next().value);
  return m;
}
export const sourceArtStatus=()=>({...styleCBodyStatus(),source:'uploaded reference RGB',unitScale:UNIT});
export function sourcePose(raw,h,time,options={}){
  const look=sanitizeLook(raw);
  return sampleStyleCMotion(fitModel(look),look,h,time,{...options,unit:UNIT});
}
function materialPalette(look,pieces,outfit,steel){
  const p=costumePalette(look,outfit);
  if(pieces.suit)p.suit=pieces.suit.color;
  if(pieces.cape)p.capeColor=pieces.cape.color;
  if(pieces.chest){p.suit=pieces.chest.color;p.trim=pieces.chest.accent;}
  if(pieces.emblem)p.emblemColor=pieces.emblem.color;
  if(steel)Object.assign(p,{suit:'#8295a9',trim:'#e2edf2'});
  return p;
}
function worldPose(p,width,height,artSource) {
  const [ox,oy]=p.m.origin, ca=Math.cos(p.rotation),sa=Math.sin(p.rotation);
  const project=([x,y])=>{
    const dx=(x-ox)*UNIT*width,dy=(y-oy)*UNIT*height;
    return [dx*ca-dy*sa,dx*sa+dy*ca];
  };
  return {...p,artSource,arms:p.arms.map(chain=>chain.map(project)),legs:p.legs.map(chain=>chain.map(project)),
    hip:project(p.hip),head:project(p.head),shoulder:project(p.shoulder),
    faceCenter:p.faceCenter?project(p.faceCenter):null};
}
function drawHairLayer(c,look,p,movement,time,layer,view) {
  const size=look.presentation==='male'?2.55:2.50;
  c.save();c.translate(...p.faceCenter);if(layer==='rear')c.rotate(p.headTilt||0);c.scale(size,size);
  drawStyleCHair(c,look,movement,time,layer,view==='game'?'front':view);
  c.restore();
}
export function drawSourceHero(c,x,y,raw,h,time,scale=1,options={}) {
  if(!styleCBodyStatus().ready)return false;
  const look=sanitizeLook(raw),original=models[look.presentation],base=STYLE_C_DEFAULTS[look.presentation];
  const pieces=options.outfit?.pieces||{}, palette=materialPalette(look,pieces,options.outfit,h.steel);
  const width=bodyWidths[look.build],height=look.height*(look.age==='teen'?.98:look.age==='older'?.99:1);
  const p=sampleStyleCMotion(fitModel(look),look,h,time,{...options,unit:UNIT});
  const center=STYLE_C_FACE_ANCHORS[look.presentation].center;
  p.faceCenter=[center[0]+p.head[0]-original.head[0],center[1]+p.head[1]-original.head[1]];
  // Forward face reshaping starts below the eyes; the scalp does not widen with the jaw.
  p.faceWidth=look.presentation==='male'?90:94;
  const view=options.view||'game', facing=view==='game'?(h.attack?.face||h.face||1):1;
  c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.translate(x,y);c.scale(scale*facing,scale);
  if(!options.bake){
    c.globalAlpha*=p.opacity;
    if(h.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha*=.78;
  }
  const blinkClock=time%3.9;
  const blink=p.clip==='idle'&&blinkClock>3.52&&blinkClock<3.70 ? Math.sin((blinkClock-3.52)/.18*Math.PI) : 0;
  const starter=!options.clothingActive&&(!options.outfit||options.outfit.origin==='starter')&&!Object.keys(pieces).length;
  const liveCape=look.cape&&view==='game'&&options.cloth&&!options.bake;
  if(!liveCape&&view==='game'&&p.clip!=='idle'&&!options.bake&&!options.layered&&!blink&&scale<=1.35&&starter&&isDefaultLook(look)&&(!h.steel||p.clip==='steel')&&drawDefaultSprite(c,p,look)){
    c.restore();return worldPose(p,width,height,'atlas');
  }
  c.rotate(p.rotation);c.scale(UNIT*width,UNIT*height);c.translate(-original.origin[0],-original.origin[1]);
  // Paint fabric *between* original hero body parts, not pasted over the
  // completed character. The inverse transform returns to local world units
  // while preserving the precise animated bone anchors of the underlying rig.
  const garmentPose=options.clothingActive?worldPose(p,width,height,'layers'):null;
  const paintClothes=pass=>{
    if(!garmentPose)return;
    c.save();
    c.translate(...original.origin);c.scale(1/(UNIT*width),1/(UNIT*height));c.rotate(-p.rotation);
    drawClothingPass(c,garmentPose,view==='game'?'front':view,pass,options.clothing,
      view==='game'?{gameFacing:facing}:{});
    c.restore();
  };
  const baseFor=region=>!h.steel&&options.clothingRegionBase?.[region]
    ? {...palette,...options.clothingRegionBase[region]} :palette;
  look.headwearCoverage=headwearFit(pieces.helmet,view).hair;
  const customHair=look.hair!==base.hair||look.headwearCoverage==='tucked';
  const differentJaw=look.jaw!==base.jaw||look.face!==base.face;
  const bareHead=customHair||differentJaw;
  const faceEdited=styleCFaceChanged(look);
  const untouchedBody=look.build===base.build && ['waist','hips','chest','shoulders','torso','arms','legs','muscle'].every(k=>look[k]===base[k]);
  const referenceIdle=p.clip==='idle'&&untouchedBody&&!bareHead&&look.cape&&starter&&
    look.emblem===base.emblem&&palette.emblemColor===base.emblemColor&&!h.steel;
  if(referenceIdle&&!liveCape){
    // Hold the original standing key, then breathe without reconstructing its
    // silhouette. Both the neutral source size and its opaque RGB are exact.
    const breath=p.phase<.13?0:Math.sin((p.phase-.13)/.87*Math.PI)**2;
    c.translate(0,original.origin[1]);c.scale(1,1+breath*.005);c.translate(0,-original.origin[1]);
    // The native canvas high-quality reconstruction filters even an identity
    // transform. Bilinear sampling at 1:1 preserves the unfiltered source RGB.
    c.imageSmoothingQuality='low';
    drawSourceRest(c,original,look,palette);
    if(faceEdited||blink)drawStyleCFace(c,look,{center,mode:'features',blink});
    c.restore();return worldPose(p,width,height,'reference');
  }
  const faceLook=h.steel?{...look,skin:'#a4b7ca'}:look;
  const motion=hairMotion(options.artState||options.cloth,h,time,look.hair,options.dt);
  const wear=(part,item,side=0)=>drawStyleCEquipment(c,part,item,p,look,{view,side,steel:h.steel});
  drawStyleCEquipmentAura(c,pieces,p,look,{view});
  if(look.cape)withStyleCEquipmentGlow(c,pieces.cape,()=>drawStyleCCape(c,original,p,look,palette,time,liveCape?{owner:options.cloth,hero:h,dt:options.dt}:null));
  paintClothes('behindBody');
  if(customHair)drawHairLayer(c,look,p,motion,time,'rear',view);
  function limb(group,i){
    drawStyleCMotionLimb(c,p,group,i,faceLook,baseFor(group==='arms'?'arms':'legs'),pieces);
    if(group==='arms')wear('shoulder',pieces.chest||pieces.suit,i);
    const part=group==='arms'?'gloves':'boots';
    if(pieces[part])wear(part,pieces[part],i);
  }
  limb('legs',1);paintClothes('farLeg');
  limb('legs',0);paintClothes('nearLeg');
  drawStyleCTorso(c,original,p,faceLook,baseFor('torso'),pieces.emblem?.part==='emblem'||!!options.clothingRegionBase?.torso);
  paintClothes('torso');
  limb('arms',1);paintClothes('farArm');
  wear('suit',pieces.suit);wear('chest',pieces.chest);wear('belt',pieces.belt);
  if(look.cape)wear('cape',pieces.cape);
  wear('emblem',pieces.emblem);
  limb('arms',0);paintClothes('nearArm');
  paintClothes('overBody');paintClothes('behindHead');
  c.save();
  if(p.headTilt){c.translate(...p.faceCenter);c.rotate(p.headTilt);c.translate(-p.faceCenter[0],-p.faceCenter[1]);}
  if(!bareHead && !h.steel && look.hairColor===base.hairColor && look.skin===base.skin){
    drawRegisteredHead(c,original,p.head);
    if(faceEdited||blink)drawStyleCFace(c,look,{center:p.faceCenter,mode:'features',blink});
  }else{
    drawStyleCFace(c,faceLook,{center:p.faceCenter,mode:customHair?'head':'native-head',steel:h.steel,blink});
  }
  if(customHair)drawHairLayer(c,look,p,motion,time,'front',view);
  c.restore();
  wear('mask',pieces.mask);wear('helmet',pieces.helmet);
  paintClothes('headwear');paintClothes('accessory');
  c.restore();return garmentPose||worldPose(p,width,height,'layers');
}
