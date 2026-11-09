import {skinShade} from './skin-color.mjs';
// A second angle of each painted part supplies profile hands, bent deltoids,
// raised heels and foreshortened soles. The source face, chest, and cape have
// their own layers, so changing a glove or boot cannot recolor the face.
import {CELL_LAYOUT} from './assets/hero/style-c-accurate/motion/cel-layout.mjs';
import {STYLE_C_DEFAULTS} from './style-c-defaults.mjs';
const CUTS={upper:0,forearm:1,fist:2,open:3,thigh:4,shin:5,boot:6,sole:7};
const bindings={
  forward:{
    upper:[[.60,.24],[.26,.90]],forearm:[[.45,.09],[.55,.93]],
    thigh:[[.45,.09],[.49,.91]],shin:[[.50,.18],[.52,.92]],
    fist:[.48,.49],open:[.44,.20],boot:[.31,.68],sole:[.31,.49]
  },
  profile:{
    upper:[[.32,.27],[.80,.85]],forearm:[[.30,.08],[.73,.90]],
    thigh:[[.46,.12],[.65,.92]],shin:[[.62,.16],[.29,.92]],
    fist:[.46,.44],open:[.31,.20],boot:[.43,.68],sole:[.43,.50]
  }
};
const art=new Map(),tints=new Map(),tintLimit=144;
const mipmaps=new WeakMap();
let pending=null,makeCanvas=null,problem=null;
const defaults=()=>typeof OffscreenCanvas!=='undefined'?(w,h)=>new OffscreenCanvas(w,h):
  (w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const imageURL=name=>new URL('./assets/hero/style-c-accurate/motion/'+name,import.meta.url);
const loadImage=url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Unable to load '+url.pathname.split('/').at(-1)));image.src=url.href;});
export function styleCMotionStatus(){return {ready:art.size===2,error:problem,angles:art.size,paintedParts:art.size*16,tintedParts:tints.size,tintLimit};}
export async function prepareStyleCMotion({canvasFactory,imageLoader}={}){
  if(art.size===2)return true;
  if(pending)return pending;
  makeCanvas=canvasFactory||defaults();
  const load=imageLoader||loadImage;
  pending=(async()=>{
    try{
      const sources=await Promise.all(Object.keys(CELL_LAYOUT).map(async name=>{
        const [paint,material]=await Promise.all([load(imageURL(name+'.webp')),load(imageURL(name+'-materials.png'))]);
        if(paint.width!==608||paint.height!==608||material.width!==paint.width||material.height!==paint.height)throw Error('Invalid '+name+' action plate');
        const source=makeCanvas(paint.width,paint.height);source.getContext('2d').drawImage(paint,0,0);
        const mask=makeCanvas(material.width,material.height);mask.getContext('2d').drawImage(material,0,0);
        const cells=CELL_LAYOUT[name].map(([x,y,w,h])=>{
          const tile=makeCanvas(w,h),c=tile.getContext('2d');c.drawImage(source,x,y,w,h,0,0,w,h);
          return {original:tile,rgba:c.getImageData(0,0,w,h),zones:mask.getContext('2d').getImageData(x,y,w,h).data};
        });
        return [name,cells];
      }));
      for(const [name,cells]of sources)art.set(name,cells);problem=null;return true;
    }catch(e){problem=e.message;pending=null;return false;}
  })();
  return pending;
}
const anchors=[0,127,75,174,139];
const rgb=value=>[1,3,5].map(i=>parseInt(value.slice(i,i+2),16));
function material(angle,part,look,palette,item,bare=false) {
  const tileIndex=(look.presentation==='female'?8:0)+CUTS[part],cell=art.get(angle)[tileIndex];
  const base=STYLE_C_DEFAULTS[look.presentation];
  const suit=palette.suit||base.suit,trim=palette.trim||base.trim;
  const colors=[null,look.skin===base.skin?null:look.skin,suit===base.suit?null:suit,
    item?.accent || (trim===base.trim?null:trim),item?.color||null];
  if(bare===true)for(let i=1;i<5;i++)colors[i]=look.skin;
  if(!colors.some(Boolean)&&!bare)return cell.original;
  if(item)colors[2]=item.color;
  const key=angle+tileIndex+colors.join('|')+bare;
  if(tints.has(key)){const cached=tints.get(key);tints.delete(key);tints.set(key,cached);return cached;}
  const draw=makeCanvas(cell.original.width,cell.original.height),ctx=draw.getContext('2d'),im=ctx.createImageData(draw.width,draw.height);
  const data=im.data;data.set(cell.rgba.data);
  const paletteRGB=colors.map(c=>c&&rgb(c));
  for(let i=0;i<data.length;i+=4){
    if(!data[i+3])continue;
    if(bare==='skin-only'){
      let skin=Math.round(cell.zones[i]/32)===1;
      // Retain the ink/antialiasing immediately surrounding the painted skin,
      // while excluding the separate cuff/gauntlet material.
      if(!skin&&cell.zones[i]===0){const x=i/4%draw.width,y=Math.floor(i/4/draw.width);for(let dy=-1;dy<=1&&!skin;dy++)for(let dx=-1;dx<=1;dx++)if(x+dx>=0&&x+dx<draw.width&&y+dy>=0&&y+dy<draw.height&&Math.round(cell.zones[((y+dy)*draw.width+x+dx)*4]/32)===1)skin=true;}
      if(!skin){data[i+3]=0;continue;}
    }
    const zone=Math.round(cell.zones[i]/32),target=paletteRGB[zone];if(!target)continue;
    if(zone===1){const skin=skinShade([data[i],data[i+1],data[i+2]],target);for(let k=0;k<3;k++)data[i+k]=skin[k];continue;}
    const y=data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722,ref=anchors[zone];
    for(let k=0;k<3;k++)data[i+k]=y<ref?target[k]*y/ref:target[k]+(255-target[k])*(y-ref)/(255-ref);
  }
  ctx.putImageData(im,0,0);tints.set(key,draw);
  while(tints.size>tintLimit)tints.delete(tints.keys().next().value);
  return draw;
}
const angleOf=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0]);
const distance=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
function smoothStamp(c,image,x,y) {
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  const matrix=c.getTransform?.(),scale=matrix?Math.max(Math.hypot(matrix.a,matrix.b),Math.hypot(matrix.c,matrix.d)):1;
  let levels=mipmaps.get(image);
  if(!levels){levels=[image];mipmaps.set(image,levels);}
  let level=0,current=image;
  while(scale*(2**level)<.54 && Math.min(current.width,current.height)>=20){
    level++;
    if(!levels[level]){
      const small=makeCanvas(Math.ceil(current.width/2),Math.ceil(current.height/2));
      const filter=small.getContext('2d');filter.imageSmoothingEnabled=true;filter.imageSmoothingQuality='high';
      filter.drawImage(current,0,0,small.width,small.height);levels[level]=small;
    }
    current=levels[level];
  }
  c.drawImage(current,x,y,image.width,image.height);
}
function bone(c,shape,image,a,b,widthScale) {
  const start=[shape[0][0]*image.width,shape[0][1]*image.height],end=[shape[1][0]*image.width,shape[1][1]*image.height];
  const ratio=distance(a,b)/distance(start,end);
  c.save();c.translate(...a);c.rotate(angleOf(a,b));c.scale(ratio,ratio*widthScale);
  c.rotate(-angleOf(start,end));smoothStamp(c,image,-start[0],-start[1]);c.restore();
}
function extremity(c,pivot,image,point,angle,width) {
  const ratio=width/image.width;
  c.save();c.translate(...point);c.rotate(angle);c.scale(ratio,ratio);
  smoothStamp(c,image,-pivot[0]*image.width,-pivot[1]*image.height);c.restore();
}
const narrowArms=new Set(['turn','punch','air-punch','strength','superKick','fireball','whirlwind','flight','knockback']);
const fastLegs=new Set(['turn','run','speed','double-jump','air-kick','kick','superKick','knockback','defeat']);
function drawShoulderSeat(c,pose,look,palette) {
  // The torso plate is painted with a sleeve opening. During a backswing,
  // a little of the underlying deltoid remains visible inside that opening.
  const [hx,hy]=pose.hip,[sx,sy]=pose.shoulder,height=Math.hypot(hx-sx,hy-sy);
  const female=look.presentation==='female',width=(female?76:82)*(.34*look.shoulders+.66*look.chest);
  const t=female ? .279 : .287,x=width*(-.54+(female ? .155 : .150)),y=-height-24+(height+39)*t;
  const rx=width*.080,ry=(height+39)*.052,swatch=material('forward','upper',look,palette,null);
  const tilt=Math.atan2(sx-hx,hy-sy);
  c.save();c.translate(hx,hy);c.rotate(tilt);
  c.beginPath();c.ellipse(x,y,rx,ry,-.18,0,Math.PI*2);c.clip();
  c.fillStyle=female?palette.suit:look.skin;c.fillRect(x-rx-1,y-ry-1,2*rx+2,2*ry+2);
  c.drawImage(swatch,swatch.width*.24,swatch.height*.51,swatch.width*.38,swatch.height*.32,x-rx,y-ry,2*rx,2*ry);
  c.restore();
  return [hx+x*Math.cos(tilt)-y*Math.sin(tilt),hy+x*Math.sin(tilt)+y*Math.cos(tilt)];
}
function emergingSleeve(c,image,socket,elbow,width,baseColor) {
  const len=distance(socket,elbow);
  c.save();c.translate(...socket);c.rotate(angleOf(socket,elbow)-Math.PI/2);
  c.beginPath();c.moveTo(-width*.32,-1);
  c.bezierCurveTo(-width*.52,len*.20,-width*.62,len*.53,-width*.39,len*.85);
  c.quadraticCurveTo(-width*.4,len+4,0,len+4);
  c.quadraticCurveTo(width*.39,len+4,width*.38,len*.83);
  c.bezierCurveTo(width*.5,len*.54,width*.47,len*.23,width*.31,-1);
  c.quadraticCurveTo(0,-3,-width*.32,-1);c.closePath();
  c.fillStyle=baseColor;c.fill();c.strokeStyle='#201b2a';c.lineWidth=1.4;c.stroke();c.clip();
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  c.drawImage(image,image.width*.23,image.height*.53,image.width*.43,image.height*.39,
    -width*.62,-2,width*1.24,len+6);c.restore();
}
export function drawStyleCMotionLimb(c,pose,kind,index,look,palette,pieces={},visible={}) {
  if(art.size!==2)return false;
  const arm=kind==='arms',joints=pose[kind][index],old=pose.m[kind][index],clip=pose.clip;
  const upper=arm?'upper':'thigh',lower=arm?'forearm':'shin';
  const thick=arm?1+(look.muscle-.35)*.35:1+(look.hips-1)*.45;
  const turnover=arm?narrowArms.has(clip):fastLegs.has(clip);
  const profile=turnover&&(index===1||pose.frame>0) || (clip==='walk'||clip==='agility')&&((pose.frame+2*index)%4===2);
  const angle=profile?'profile':'forward';
  const equipment=arm?pieces.gloves:pieces.boots;
  const upperImage=material(angle,upper,look,palette,null,visible.bare);
  const lowerImage=material(angle,lower,look,palette,equipment,visible.bare);
  if(visible.upper!==false){if(arm && index===1){
    const socket=drawShoulderSeat(c,pose,look,palette);
    // The chest art supplies this visible pauldron. Only the painted upper
    // arm emerges from it, so the backswing cannot introduce a second pad.
    const muscle=material('forward','upper',look,palette,null);
    emergingSleeve(c,muscle,socket,joints[1],distance(old[0],old[1])*.78*thick,
      look.presentation==='female'?palette.suit:look.skin);
  }else bone(c,bindings[angle][upper],upperImage,joints[0],joints[1],thick*(arm?1.50:1.18));}
  if(visible.lower!==false)bone(c,bindings[angle][lower],lowerImage,joints[1],joints[2],thick*(arm?1.65:1.24));
  if(visible.end===false)return true;
  if(arm){
    const open=pose.open==='both'||pose.open==='near'&&index===0;
    const hand=open?'open':'fist',im=material(angle,hand,look,palette,equipment,visible.bareHand?'skin-only':false);
    // The profile drawing's wrist-to-knuckle axis already slopes to the right.
    // Align that painted axis with the forearm when the hero extends a jab.
    const handAxis=angle==='profile' ? (open ? .31 : .29)*Math.PI : .47*Math.PI;
    const wristAngle=angleOf(joints[1],joints[2])-handAxis;
    const width=distance(old[0],old[1])*(open?1.56:1.34)*thick;
    extremity(c,bindings[angle][hand],im,joints[2],wristAngle,width);
  }else{
    const raised=pose.sole===index,part=raised?'sole':'boot';
    if(pieces.boots&&!raised)return true;
    const im=material(angle,part,look,palette,equipment);
    const gait=['walk','run','speed'].includes(clip);
    const swing=gait?Math.sin(Math.max(0,((pose.phase+index*.5)%1-.5)*2)*Math.PI):0;
    // The sole turns into the line of the extended kick. Other feet keep their
    // level contact on the ground, then lift the heel through the swing.
    const tilt=raised?angleOf(joints[1],joints[2])*.55-.27:gait?-.26*swing:
      ['jump','double-jump','fall','flight','knockback'].includes(clip)?.10:0;
    const width=distance(old[1],old[2])*(look.presentation==='female'?1.13:1.22)*thick;
    extremity(c,bindings[angle][part],im,joints[2],tilt,width);
  }
  return true;
}
