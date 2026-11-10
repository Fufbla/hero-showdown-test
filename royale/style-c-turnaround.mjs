import {paintedCapeMotion,paintedCapeOffset} from './cape.mjs';
import {skinShade} from './skin-color.mjs';
import {headwearFit} from './headwear-fit.mjs';
// Creator turnarounds use the supplied direction board for the neutral silhouettes.
// The newly illustrated bald, capeless underlays reveal the head and rear armor
// when a player changes hair, takes off a cape, or wears interchangeable gear.
import {sanitizeLook, costumePalette} from './appearance.mjs';
import {STYLE_C_DEFAULTS} from './style-c-defaults.mjs';
import {TURNAROUND_MODELS} from './assets/hero/style-c-accurate/turnaround/model.mjs';
import {sampleStyleCMotion} from './style-c-motion.mjs';
import {drawStyleCHair} from './style-c-hair.mjs';
import {drawStyleCEquipment, drawStyleCEquipmentAura, withStyleCEquipmentGlow} from './style-c-equipment.mjs';
import {emblem} from './style-c-paint.mjs';

const UNIT = .35;
const MATERIALS = ['', 'skin', 'hairColor', 'suit', 'trim', 'capeColor', 'eyes'];
const materialCache = new Map();
const rgb = s => [1,3,5].map(i => parseInt(s.slice(i,i+2),16));
const widthFor = build => ({slender:.87, balanced:1, strong:1.12, full:1.22})[build] || 1;
const distance = (u,v) => Math.hypot(v[0]-u[0], v[1]-u[1]);
const angle = (u,v) => Math.atan2(v[1]-u[1], v[0]-u[0]);
const lerp = (a,b,t) => a + (b-a)*t;
let artwork, mask, rasterCanvas, loading, error = null;

export function prepareTurnarounds({canvasFactory, imageLoader} = {}) {
  if (loading) return loading;
  rasterCanvas = canvasFactory || ((w,h) => typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w,h) : Object.assign(document.createElement('canvas'),{width:w,height:h}));
  const load = imageLoader || (url => new Promise((resolve,reject) => {
    const im=new Image();
    im.onload=()=>resolve(im); im.onerror=()=>reject(Error('A turnaround sheet could not be loaded.'));
    im.src=url.href;
  }));
  loading = Promise.all(['layers.png','materials.png'].map(name => load(new URL('./assets/hero/style-c-accurate/turnaround/'+name,import.meta.url)))).then(([art, ids])=>{
    if(art.width!==ids.width || art.height!==ids.height) throw Error('Different turnaround layer and material atlas sizes.');
    const canvas=rasterCanvas(ids.width,ids.height), c=canvas.getContext('2d',{willReadFrequently:true});
    c.drawImage(ids,0,0); mask=c.getImageData(0,0,ids.width,ids.height).data;
    // Preserve every original profile pixel. Recover omitted skin material and
    // the bare scalp highlight accidentally classified as costume trim.
    c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(art,0,0);
    const source=c.getImageData(0,0,canvas.width,canvas.height).data;
    for(const sex of ['male','female'])for(const name of ['source','head','bareHead']){
      const [sx,sy,w,h,left,top]=TURNAROUND_MODELS[sex+'-side'].parts[name];
      const eyeX=(sex==='male'?38:33)+(name==='bareHead'?2:0),eyeY=sex==='male'?-207:-211;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        const px=x+left,py=y+top,i=((sy+y)*art.width+sx+x)*4;
        const scalp=name==='bareHead'&&py<eyeY-40;
        if(scalp&&mask[i]===4){mask[i]=1;continue;}
        const omitted=mask[i]===0&&(name==='bareHead'||(Math.abs(px-eyeX)<=26&&py>=eyeY-26&&py<=eyeY+18));
        if(!omitted||!source[i+3])continue;
        const r=source[i],g=source[i+1],b=source[i+2];
        if(!(r>38&&g>14&&b>4&&r-g>7&&g-b>4&&r>g*1.12&&g>b*1.08))continue;
        let iris=false;
        for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h&&mask[((sy+y+dy)*art.width+sx+x+dx)*4]===6)iris=true;
        if(!iris)mask[i]=1;
      }
    }
    artwork=art;
    return true;
  }).catch(cause=>{error=cause.message;loading=null;return false;});
  return loading;
}
export const turnaroundStatus = () => ({ready:!!artwork,error,views:Object.keys(TURNAROUND_MODELS),cachedLayers:materialCache.size});

function materialFor(model, name, colors, base) {
  const rect=model.parts[name]; if (!rect) return null;
  const [x,y,w,h,left,top]=rect;
  const changed=MATERIALS.map((key,id)=>id && colors[key]!==base[key] ? rgb(colors[key]) : null);
  const profile = model === TURNAROUND_MODELS['male-side'] || model === TURNAROUND_MODELS['female-side'];
  const sculpt = profile && (name==='head' || name==='bareHead') &&
    ['eyeShape','brows','nose','mouth'].some(k=>colors[k]!==base[k]);
  if(!changed.some(Boolean) && !sculpt) return {image:artwork, x,y,w,h,left,top};
  const key=[x,y, ...MATERIALS.slice(1).map(k=>colors[k]), ...(sculpt?['eyeShape','brows','nose','mouth'].map(k=>colors[k]):[])].join('|');
  if(materialCache.has(key)) return materialCache.get(key);
  const canvas=rasterCanvas(w,h), c=canvas.getContext('2d',{willReadFrequently:true});
  c.drawImage(artwork,x,y,w,h,0,0,w,h);
  const im=c.getImageData(0,0,w,h), px=im.data;
  for(let row=0;row<h;row++) {
    let offset=((y+row)*artwork.width+x)*4;
    for(let col=0;col<w;col++,offset+=4) {
      const at=(row*w+col)*4,id=mask[offset], target=changed[id];
      if(!px[at+3]||!target)continue;
      if(id===1){const skin=skinShade([px[at],px[at+1],px[at+2]],target);for(let k=0;k<3;k++)px[at+k]=skin[k];continue;}
      const high=Math.max(px[at],px[at+1],px[at+2]);
      if(high<24)continue;
      // Preserve the original ink and the local painted light, even for a very pale hairstyle.
      const median = id===2?64:id===5?160:id===3?144:id===6?136:194, shade=high/median;
      for(let k=0;k<3;k++)px[at+k]=shade<=1?target[k]*shade:target[k]+(255-target[k])*Math.min(1,(shade-1)*(id===2?.30:.75));
    }
  }
  if(sculpt) sculptProfile(im,left,top,colors,name);
  c.putImageData(im,0,0);
  const result={image:canvas,x:0,y:0,w,h,left,top};
  if(materialCache.size>=120)materialCache.delete(materialCache.keys().next().value);
  materialCache.set(key,result);
  return result;
}

// Adjust the existing painted profile features locally. The falloff pins the
// outer edge to its original pixels, preserving the cheek, temple and hairline.
function sculptProfile(im,left,top,l,name) {
  const eyeX=(l.presentation==='male'?38:33)+(name==='bareHead'?2:0);
  const eyeY=l.presentation==='male'?-207:-211;
  const mouth=[47,-178], nose=[51,-192];
  const src=im.data.slice(),dst=im.data,w=im.width,h=im.height;
  const influence=(dx,dy,rx,ry)=>Math.max(0,1-dx*dx/(rx*rx)-dy*dy/(ry*ry))**2;
  for(let row=0;row<h;row++)for(let col=0;col<w;col++) {
    const x=col+left,y=row+top,dx=x-eyeX,dy=y-eyeY;
    if(x<6||x>65||y<-255||y>-160)continue;
    let u=col,v=row;
    if(l.eyeShape!=='almond') {
      const weight=influence(dx,dy,26,18);
      u-=dx*weight*(l.eyeShape==='wide'?.19:.04);
      v-=dy*weight*(l.eyeShape==='round'?.24:-.10);
    }
    if(l.brows!=='bold') {
      const b=y-(eyeY-23),weight=influence(dx,b,24,10);
      v+=weight*(l.brows==='straight'?dx*.17:b*.15+1);
    }
    const nx=x-nose[0],ny=y-nose[1], n=influence(nx,ny,13,11);
    if(l.nose==='broad')u-=nx*n*.35;else if(l.nose==='small')u+=n*(1.8+nx*.22);
    const mx=x-mouth[0],my=y-mouth[1], a=influence(mx,my,15,9);
    if(l.mouth==='full')v-=my*a*.35;else if(l.mouth==='smile')v+=a*Math.max(0,-mx)*.30;
    if(u===col&&v===row)continue;
    const ix=Math.max(0,Math.min(w-2,Math.floor(u))),iy=Math.max(0,Math.min(h-2,Math.floor(v)));
    const fx=u-ix,fy=v-iy,i=(iy*w+ix)*4,o=(row*w+col)*4;
    for(let k=0;k<4;k++)dst[o+k]=lerp(lerp(src[i+k],src[i+4+k],fx),lerp(src[i+4*w+k],src[i+4*w+4+k],fx),fy);
  }
}

function styledModel(m,look) {
  const hip=m.hip, shoulder=m.shoulder, torsoWidth=look.shoulders*(.66+.34*look.chest);
  const hipY=hip[1]*look.legs;
  const shoulderY=hipY+(shoulder[1]-hip[1])*look.torso;
  const around=(x,c,k)=>c+(x-c)*k;
  const arms=m.arms.map(chain=>{
    const root=[around(chain[0][0],shoulder[0],torsoWidth),shoulderY+(chain[0][1]-shoulder[1])*look.torso];
    return [root,...chain.slice(1).map(p=>[root[0]+(p[0]-chain[0][0])*look.arms,root[1]+(p[1]-chain[0][1])*look.arms])];
  });
  const legs=m.legs.map(chain=>chain.map(p=>[around(p[0],hip[0],look.hips),p[1]*look.legs]));
  return {...m,hip:[hip[0],hipY],shoulder:[shoulder[0],shoulderY],head:[m.head[0],shoulderY+m.head[1]-shoulder[1]],arms,legs};
}

function neutralShape(l) {
  return l.build==='balanced'&&l.age==='young'&&l.muscle===.35&&['chest','hips','waist','shoulders','torso','arms','legs','jaw'].every(key=>l[key]===1);
}

function neutralFace(l,base) {
  return ['face','eyeShape','brows','nose','mouth','facialHair'].every(key=>l[key]===base[key]);
}

export function drawTurnaroundHero(c,x,y,raw,h,time,scale=1,options={}) {
  const left=options.view==='left', back=options.view==='back';
  if(!artwork || !['side','right','left','back'].includes(options.view))return false;
  const view=back?'back':'side', look=sanitizeLook(raw), base=STYLE_C_DEFAULTS[look.presentation];
  const m=TURNAROUND_MODELS[look.presentation+'-'+view], fitted=styledModel(m,look);
  const pieces=options.outfit?.pieces||{}, colors={...look,...costumePalette(look,options.outfit)};
  if(pieces.chest){colors.suit=pieces.chest.color;colors.trim=pieces.chest.accent||colors.trim;}
  for(const [part,field] of [['suit','suit'],['cape','capeColor'],['emblem','emblemColor']])if(pieces[part]?.color)colors[field]=pieces[part].color;
  if(h.steel){colors.skin='#b2c2d2';colors.suit='#8295a9';colors.trim='#e2edf2';}
  const sample=sampleStyleCMotion(fitted,{...look,arms:1,legs:1},h,time,{unit:UNIT,poseName:options.poseName,motionFrame:options.motionFrame,turnAge:options.turnAge});
  // A rear-facing body foreshortens forward swings and lunges into the screen.
  // Keep attachment positions at each joint continuous with the profile tracks.
  const blend=(rest,posed)=>[lerp(rest[0],posed[0],back?.40:1),posed[1]];
  const pose={...sample,
    arms:sample.arms.map((chain,i)=>chain.map((p,j)=>blend(fitted.arms[i][j],p))),
    legs:sample.legs.map((chain,i)=>chain.map((p,j)=>blend(fitted.legs[i][j],p))),
    hip:blend(fitted.hip,sample.hip),shoulder:blend(fitted.shoulder,sample.shoulder),head:blend(fitted.head,sample.head),
    faceWidth:m.faceWidth*look.jaw,
  };
  if(pose.state==='idle') {
    // Reference eyes and gloves stay in their neutral registration when the hero breathes.
    for(const k of ['head','shoulder','hip','arms','legs'])pose[k]=fitted[k];
    pose.headTilt=0;
  }
  const sizeX=UNIT*widthFor(look.build), sizeY=UNIT*look.height*(look.age==='teen'?.98:look.age==='older'?.99:1);
  const local=p=>[p[0]*sizeX*(left?-1:1),p[1]*sizeY];
  const report={...pose,head:local(pose.head),hip:local(pose.hip),shoulder:local(pose.shoulder),arms:pose.arms.map(chain=>chain.map(local)),legs:pose.legs.map(chain=>chain.map(local))};
  const garmentColors=part=>{
    if(h.steel)return colors;
    const category=part==='torso'?'torso':/^(upper|lower|hand)/.test(part)?'arms':/^(thigh|shin|boot)/.test(part)?'legs':null;
    return category&&options.clothingRegionBase?.[category]
      ? {...colors,...options.clothingRegionBase[category]}:colors;
  };
  const draw=(part,from,to=from,rot=0,wide=1,tall=1)=>{
    const a=materialFor(m,part,garmentColors(part),base);if(!a)return;
    c.save();c.translate(...to);c.rotate(rot);c.scale(wide,tall);
    c.drawImage(a.image,a.x,a.y,a.w,a.h,a.left-from[0],a.top-from[1],a.w,a.h);c.restore();
  };
  const segment=(part,from,to,wide=1)=>{
    const a=materialFor(m,part,garmentColors(part),base);if(!a)return;
    c.save();c.translate(...to[0]);c.rotate(angle(...to)-Math.PI/2);
    c.scale(wide,distance(...to)/Math.max(1,distance(...from)));
    c.rotate(Math.PI/2-angle(...from));
    c.drawImage(a.image,a.x,a.y,a.w,a.h,a.left-from[0][0],a.top-from[0][1],a.w,a.h);
    c.restore();
  };
  const wear=(part,i=0)=>drawStyleCEquipment(c,part,part==='shoulder'?(pieces.chest||pieces.suit):pieces[part],pose,look,{view,side:i,steel:!!h.steel});
  c.save(); c.translate(x,y);c.scale(sizeX*scale*(left?-1:1),sizeY*scale);c.rotate(pose.rotation||0);c.globalAlpha*=pose.opacity;
  if(h.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha*=.78;
  look.headwearCoverage=headwearFit(pieces.helmet,view).hair;
  const regularHair=look.hair===base.hair&&look.headwearCoverage!=='tucked';
  if (pose.state==='idle'&&neutralShape(look)&&neutralFace(look,base)&&regularHair&&look.cape&&!Object.keys(pieces).length&&look.emblem===base.emblem&&!h.steel) {
    draw('source',[0,0]);c.restore();return report;
  }
  drawStyleCEquipmentAura(c,pieces,pose,look,{view});
  const turn=angle(m.hip,m.shoulder)-angle(pose.hip,pose.shoulder);
  const cloak=()=>withStyleCEquipmentGlow(c,pieces.cape,()=>{
    const tile=materialFor(m,'cape',colors,base);if(!tile)return;
    const motion=paintedCapeMotion(options.cloth||h,h,time,options.dt??1/60);
    const px=96,py=48,w=tile.w+px*2,ht=tile.h+py*2;
    const buffer=motion.turnaroundCanvas??=rasterCanvas(w,ht);
    if(buffer.width!==w||buffer.height!==ht){buffer.width=w;buffer.height=ht;}
    const ink=buffer.getContext('2d');ink.clearRect(0,0,w,ht);
    const top=tile.top-m.shoulder[1],step=tile.h/16;
    for(let i=0;i<16;i++){
      const start=i*step,end=(i+1)*step;
      const a=paintedCapeOffset(motion,(top+start)/(top+tile.h)),b=paintedCapeOffset(motion,(top+end)/(top+tile.h));
      const from=py+Math.round(start+a.y),to=py+Math.round(end+b.y),shear=(b.x-a.x)/step,stretch=(to-from)/step;
      ink.save();ink.beginPath();ink.rect(0,from,w,to-from);ink.clip();
      ink.transform(1,0,shear,stretch,px+a.x-shear*start,from-stretch*start);
      ink.drawImage(tile.image,tile.x,tile.y,tile.w,tile.h,0,0,tile.w,tile.h);ink.restore();
    }
    c.save();c.translate(...pose.shoulder);c.rotate(-turn);c.scale(look.shoulders,look.torso*.35+look.legs*.65);
    c.drawImage(buffer,tile.left-m.shoulder[0]-px,top-py);c.restore();
  });
  if(look.cape&&!back)cloak();
  const limb=(kind,i)=>{
    const isArm=kind==='arms', target=pose[kind][i], sourceIndex=!m.parts[(isArm?'upper':'thigh')+i]?0:i, orig=m[kind][sourceIndex];
    const width=isArm?1+(look.muscle-.35)*.26:look.hips;
    const names=isArm?['upper','lower','hand']:['thigh','shin','boot'];
    c.save();
    if(!back&&sourceIndex!==i)c.filter='brightness(80%)';
    segment(names[0]+sourceIndex,orig.slice(0,2),target.slice(0,2),width);
    segment(names[1]+sourceIndex,orig.slice(1),target.slice(1),width);
    const rot=isArm?angle(...target.slice(1))-angle(...orig.slice(1)):0;
    if(isArm || !pieces.boots || pose.sole===i)draw(names[2]+sourceIndex,orig[2],target[2],rot,width,1);
    if(isArm)wear('shoulder',i);
    wear(isArm?'gloves':'boots',i);c.restore();
  };
  if(back||pose.state!=='idle'){limb('legs',1);limb('arms',1);}
  limb('legs',0);
  segment('torso',[m.hip,m.shoulder],[pose.hip,pose.shoulder],look.waist*(.55*look.chest+.45*look.shoulders));
  wear('suit');wear('chest');wear('emblem');
  if(!back && (look.emblem!==base.emblem||colors.emblemColor!==base.emblemColor) && !pieces.chest && !pieces.emblem) {
    c.save();c.translate(pose.shoulder[0]+29,pose.shoulder[1]+8);c.scale(.75,1);emblem(c,0,0,look.emblem,colors.emblemColor,1.23);c.restore();
  }
  wear('belt');limb('arms',0);
  if(look.cape&&back)cloak();
  wear('cape');
  const headWidth=look.jaw*(look.face==='round'?1.06:look.face==='angular'?.96:1);
  const headHeight=look.age==='teen'?1.035:look.age==='older'?.98:1;
  const motion={wind:Math.sin(time*7)*pose.moving*2.8,bounce:Math.cos(time*12)*pose.moving};
  c.save();c.translate(...pose.head);c.rotate(pose.headTilt||0);c.scale(headWidth,headHeight);
  const head=(name)=>draw(name,m.head,[0,0]);
  const hair=layer=>{
    c.save();const unit=m.faceWidth/36;c.scale(unit,unit);drawStyleCHair(c,look,motion,time,layer,left?'left':view);c.restore();
  };
  if(regularHair)head('head');
  else { hair('rear');head('bareHead');hair('front'); }
  if(!back && look.facialHair!=='none'){
    const beard=look.facialHair==='beard';
    c.save();c.lineCap='round';c.strokeStyle=colors.hairColor;c.lineWidth=beard?6:1.05;
    const y0=look.presentation==='female'?29:28;
    if(beard){c.beginPath();c.moveTo(-4,y0-4);c.quadraticCurveTo(13,y0+11,33,y0+9);c.stroke();}
    else for(let j=0;j<6;j++){c.beginPath();c.moveTo(1+j*4,y0+j*.8);c.lineTo(2+j*4,y0+2+j*.8);c.stroke();}
    c.restore();
  }
  c.restore();
  // The overlay follows the exact jaw/age scale used for the head, not torso proportions.
  pose.faceWidth=m.faceWidth;pose.headScale=[headWidth,headHeight];
  wear('mask');wear('helmet');
  c.restore();
  return report;
}
