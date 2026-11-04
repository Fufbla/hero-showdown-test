import {armorCollection, drawArmorPiece} from './power-armor-art.mjs';
import {WEARABLE_REGIONS} from './assets/hero/style-c-accurate/equipment/regions.mjs';
import {emblem} from './style-c-paint.mjs';

const atlasURL = new URL('./assets/hero/style-c-accurate/equipment/worn.png', import.meta.url);
const variants = new Map();
const CELL_LIMIT = 128;
const regionThemes = [null, 'shore', 'briar', 'foundry', 'cavern', 'wild', 'aether', 'vanguard'];
let artwork, makeCanvas, pending, loadError = null;

function defaultCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  return Object.assign(document.createElement('canvas'), {width, height});
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The Style C equipment atlas could not load.'));
    image.src = url.href;
  });
}

export function prepareStyleCEquipment({canvasFactory, imageLoader} = {}) {
  if (artwork) return Promise.resolve(true);
  if (!pending) {
    makeCanvas = canvasFactory || defaultCanvas;
    pending = (imageLoader || loadImage)(atlasURL).then(image => {
      for (const [x,y,w,h] of Object.values(WEARABLE_REGIONS)) {
        if (x < 0 || y < 0 || x+w > image.width || y+h > image.height) throw new Error('Equipment atlas dimensions do not match its parts.');
      }
      artwork = image;
      loadError = null;
      return true;
    }).catch(error => {
      loadError = error.message; pending = null;
      return false;
    });
  }
  return pending;
}

export function styleCEquipmentStatus() {
  return {ready:!!artwork, error:loadError, sprites:Object.keys(WEARABLE_REGIONS).length, cached:variants.size, cacheLimit:CELL_LIMIT};
}

const rgb = color => [1,3,5].map(i => parseInt(color.slice(i, i+2), 16));
const distance = (a, b) => Math.hypot(b[0]-a[0], b[1]-a[1]);

function theme(item) {
  if (item.mergeId) return item.mergeId;
  if (item.setId) return item.setId.replace(/-(ordinary|rare)$/, '');
  return regionThemes[item.region] || 'legacy';
}

function swatch(pixels, base, accent) {
  const a = rgb(base), b = rgb(accent);
  for (let i=0; i<pixels.length; i+=4) {
    if (!pixels[i+3]) continue;
    const r=pixels[i], g=pixels[i+1], blue=pixels[i+2];
    // Blue enamel and gold filigree are independent artist-painted materials.
    // Keep neutral silver, deep black inks, gem hues and specular whites intact.
    const enamel = blue > r*1.22 && blue > g*1.09;
    const gilt = r > blue*1.24 && g > blue*1.12 && r >= g*.96;
    if ((!enamel && !gilt) || Math.max(r,g,blue) < 29) continue;
    const target = enamel ? a : b;
    const value = Math.max(r,g,blue) / (enamel ? 193 : 211);
    for (let k=0; k<3; k++) {
      pixels[i+k] = value <= 1 ? target[k]*value : target[k]+(255-target[k])*Math.min(1,(value-1)*1.45);
    }
  }
}

function pieceTexture(key, item, steel) {
  if (!artwork) return null;
  const rect = WEARABLE_REGIONS[key];
  if (!rect) return null;
  const color = steel ? '#879cae' : item.color || '#35629c';
  const accent = steel ? '#e4ecf0' : item.accent || '#e9bc64';
  const rarity = item.rarity || 'ordinary', cacheKey = [key,color,accent,rarity].join('/');
  if (variants.has(cacheKey)) return variants.get(cacheKey);
  const [x,y,w,h] = rect, material = makeCanvas(w,h), c = material.getContext('2d',{willReadFrequently:true});
  c.drawImage(artwork,x,y,w,h,0,0,w,h);
  const img = c.getImageData(0,0,w,h);
  swatch(img.data,color,accent);
  c.putImageData(img,0,0);
  const pad = rarity==='ordinary' ? 0 : Math.ceil(Math.max(w,h)*.045);
  let canvas = material;
  if (pad) {
    canvas=makeCanvas(w+2*pad,h+2*pad);
    const edge=canvas.getContext('2d');
    edge.shadowColor=rarity==='legendary'?'#66ff87':'#ffffff';
    edge.shadowBlur=pad*.88; edge.drawImage(material,pad,pad);
    edge.shadowBlur=0; edge.drawImage(material,pad,pad);
  }
  const tile = {canvas, w, h, pad, levels:[canvas]};
  if (variants.size >= CELL_LIMIT) variants.delete(variants.keys().next().value);
  variants.set(cacheKey,tile);
  return tile;
}

function stamp(c,key,item,steel,x,y,w,h) {
  const tile = pieceTexture(key,item,steel);
  if (!tile) return false;
  const dx=tile.pad*w/tile.w, dy=tile.pad*h/tile.h;
  // A combat HUD may show the same plate at 22 pixels that the wardrobe shows
  // at 150. Prefilter at half sizes to preserve the inks on both displays.
  const matrix = c.getTransform?.();
  const targetWidth = matrix ? (w+2*dx)*Math.hypot(matrix.a,matrix.b) : w;
  const targetHeight = matrix ? (h+2*dy)*Math.hypot(matrix.c,matrix.d) : h;
  let level=0, surface=tile.levels[0];
  while (surface.width>targetWidth*2 && surface.height>targetHeight*2 && Math.min(surface.width,surface.height)>=32) {
    level++;
    if (!tile.levels[level]) {
      const smaller=makeCanvas(Math.ceil(surface.width/2),Math.ceil(surface.height/2));
      const filter=smaller.getContext('2d');filter.imageSmoothingEnabled=true;filter.imageSmoothingQuality='high';
      filter.drawImage(surface,0,0,smaller.width,smaller.height);tile.levels[level]=smaller;
    }
    surface=tile.levels[level];
  }
  c.drawImage(surface,x-dx,y-dy,w+dx*2,h+dy*2);
  return true;
}

function fittedCrest(c,item,steel,x,y,size) {
  const key='crest-'+theme(item), rect=WEARABLE_REGIONS[key];
  if (!rect) return;
  const ratio=rect[2]/rect[3], w=Math.min(size,size*ratio), h=Math.min(size,size/ratio);
  stamp(c,key,item,steel,x-w/2,y-h/2,w,h);
}

function anchors(p,look,view) {
  const offset=p.offset||[0,0], model=p.m;
  const shoulder=p.shoulder || (model && [model.shoulder[0]+offset[0]+(p.lean||0),model.shoulder[1]+offset[1]]);
  const hip=p.hip || (model && [model.hip[0]+offset[0],model.hip[1]+offset[1]]) ||
    (p.d && shoulder && [shoulder[0],shoulder[1]+(p.d.torso || p.d.shoulder*1.45)]);
  if (!p.head || !shoulder || !hip) return null;
  const length=distance(shoulder,hip) || 1;
  const shoulderSpan=p.arms?.length===2 ? distance(p.arms[0][0],p.arms[1][0]) : length*1.35;
  const faceWidth=p.faceWidth || (model?.face ? (Math.max(...model.face.map(a=>a[0]))-Math.min(...model.face.map(a=>a[0])))*(look.jaw||1) : (p.d?.headWidth ? p.d.headWidth*2 : length*1.98));
  const profile=['side','left','right'].includes(view);
  const bodyWidth=profile ? Math.max(length*.80, Math.min(shoulderSpan*.96,length*1.10)) : Math.max(length*1.05,shoulderSpan*1.04);
  const face=p.faceCenter || p.head;
  const torsoAngle=Math.atan2(hip[1]-shoulder[1],hip[0]-shoulder[0])-Math.PI*.5;
  return {face,shoulder,hip,length,bodyWidth,faceWidth,torsoAngle,profile,back:view==='back'};
}

function wearHead(c, part, item, p, a, steel) {
  const {faceWidth:w,profile,back}=a;
  c.translate(...a.face); c.rotate(p.headTilt||0);c.scale(...(p.headScale||[1,1]));
  const key=part==='mask' ? (back?'back-helmet':profile?'side-mask':'mask') :
    back?'back-helmet':profile?'side-helmet':'helmet-'+theme(item);
  if (part==='mask' && !back) {
    const width=w*(profile?.73:.91), height=w*(profile?.26:.33);
    stamp(c,key,item,steel,-width*.49,-height*.51,width,height);
    return;
  }
  const width=w*(profile?.85:1.07);
  if (back) {
    stamp(c,key,item,steel,-width*.5,-w*.33,width,w*.26);
    fittedCrest(c,item,steel,0,-w*.13,w*.16);
  } else if (profile) {
    stamp(c,key,item,steel,-width*.56,-w*.35,width,w*.25);
    fittedCrest(c,item,steel,-width*.38,-w*.19,w*.18);
  } else {
    // Keep the central crest above the eyebrows. Wings can descend at the temples.
    const tile=WEARABLE_REGIONS[key];
    const height=Math.min(w*.43,Math.max(w*.28,width*tile[3]/tile[2]));
    stamp(c,key,item,steel,-width*.50,-w*.34-height*.48,width,height);
  }
}

function wearChest(c, item, a, steel) {
  c.translate(...a.shoulder); c.rotate(a.torsoAngle);
  const key=a.back?'back-chest':a.profile?'side-chest':'chest-'+theme(item);
  const width=a.bodyWidth*(a.profile?1.15:1.08), height=a.length*1.10;
  stamp(c,key,item,steel,-width*.50,-a.length*.15,width,height);
  if (a.back) fittedCrest(c,item,steel,0,a.length*.24,a.length*.34);
  else if (a.profile) fittedCrest(c,item,steel,-width*.17,a.length*.12,a.length*.33);
}

function wearLimb(c, part, item, pose, a, side, steel) {
  const leg=part==='boots', chain=(leg?pose.legs:pose.arms)?.[side];
  if (!chain) return;
  const joint=chain[1], tip=chain[2], length=distance(joint,tip);
  if (length<.01) return;
  const width=leg ? Math.min(length*.91,a.length*.77) : Math.min(length*.81,a.length*.53);
  const key=leg ? (a.back?'back-shin':a.profile?'side-shin':'shin-'+theme(item)) : (a.profile?'side-glove':'glove');
  c.save(); c.translate(...joint); c.rotate(Math.atan2(tip[1]-joint[1],tip[0]-joint[0])-Math.PI*.5);
  const y=leg?-length*.18:length*.02, height=leg?length*1.17:length*.91;
  stamp(c,key,item,steel,-width*.5,y,width,height);
  if (leg && (a.back || a.profile)) fittedCrest(c,item,steel,0,length*.06,length*.34);
  c.restore();
  // The kick contact cel presents its illustrated, tinted outsole directly to
  // the camera. A second horizontal shoe cap would create two toes.
  if (leg && pose.sole!==side) {
    const soleWidth=Math.min(length*1.15,a.length*.95),soleHeight=length*.39;
    c.translate(...tip); c.rotate(pose.footAngles?.[side]||0);
    if (!a.profile && side===1) c.scale(-1,1);
    stamp(c,a.back?'heel':a.profile?'side-toe':'toe',item,steel,-soleWidth*.36,-soleHeight*.55,soleWidth,soleHeight);
  }
}

function wearBelt(c,item,a,steel) {
  const width=a.bodyWidth*.70, height=a.length*.30;
  c.translate(...a.hip); c.rotate(a.torsoAngle);
  stamp(c,a.back?'back-belt':a.profile?'side-belt':'belt',item,steel,-width*.5,-height*.82,width,height);
}

function wearCape(c,item,a,look,steel) {
  if (!look.cape) return;
  const size=a.length*.16;
  c.translate(...a.shoulder); c.rotate(a.torsoAngle);
  if (!a.back) {
    for (const side of a.profile?[1]:[-1,1]) stamp(c,'clasp',item,steel,side*a.bodyWidth*.32-size*.5,-size*.35,size,size);
  }
}

function wearEmblem(c,item,a,look,steel) {
  if (a.back) return;
  c.translate(...a.shoulder); c.rotate(a.torsoAngle);
  const size=a.length*.34;
  stamp(c,'badge',item,steel,-size*.61,a.length*.25-size*.50,size*1.22,size);
  emblem(c,0,a.length*.25,look.emblem||'star',steel?'#dce7eb':item.accent||item.color,size/22);
}

// The original equipment system also exposes chest and helmet under legacy
// aliases. Only a real equipped slot may paint a layer at its own depth.
export function drawStyleCEquipment(c, part, item, pose, look, {view='game',side=0,steel=false}={}) {
  if (!artwork || !item || (item.part && part!==item.part)) return false;
  const a=anchors(pose,look,view);
  if (!a) return false;
  c.save();
  c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
  if (armorCollection(item)) {
    const drawn=drawArmorPiece(c,part,item,pose,a,side);
    c.restore();return drawn;
  }
  switch (part) {
    case 'helmet': case 'mask': wearHead(c,part,item,pose,a,steel); break;
    case 'chest': case 'suit': wearChest(c,item,a,steel); break;
    case 'boots': case 'gloves': wearLimb(c,part,item,pose,a,side,steel); break;
    case 'belt': wearBelt(c,item,a,steel); break;
    case 'cape': wearCape(c,item,a,look,steel); break;
    case 'emblem': wearEmblem(c,item,a,look,steel); break;
    default: c.restore(); return false;
  }
  c.restore(); return true;
}

// The whole-hero halo is purely cosmetic. One piece is sufficient. The fourth
// ability and bonuses still come exclusively from the original inventory rules.
export function drawStyleCEquipmentAura(c, pieces, pose, look, {view='game'}={}) {
  if (!pieces || ![pieces.helmet,pieces.chest,pieces.boots].some(item=>item?.rarity==='legendary')) return false;
  const a=anchors(pose,look,view);
  if (!a) return false;
  const top=pose.head[1]-a.faceWidth*1.02;
  const bottom=Math.max(a.hip[1]+a.length,...(pose.legs||[]).map(chain=>chain[2][1]))+a.faceWidth*.16;
  const cx=(a.face[0]+a.hip[0])*.5, cy=(top+bottom)*.5;
  c.save(); c.translate(cx,cy);
  c.scale(Math.max(a.faceWidth*.91,a.bodyWidth*.92),(bottom-top)*.60);
  const glow=c.createRadialGradient(0,0,0,0,0,1);
  glow.addColorStop(0,'rgba(80,244,114,.20)');glow.addColorStop(.64,'rgba(65,255,104,.31)');
  glow.addColorStop(.86,'rgba(79,255,119,.15)');glow.addColorStop(1,'rgba(80,255,122,0)');
  c.fillStyle=glow;c.fillRect(-1,-1,2,2);c.restore();return true;
}

// Kept for callers that still pass the compact turnaround rig.
export function helmet(c,look,pose,item,back,steel) {
  return drawStyleCEquipment(c,'helmet',item,pose,look,{view:back?'back':'front',steel});
}
export function mergeChest(c,pose,item) {
  return item?.mergeId ? drawStyleCEquipment(c,'chest',item,pose,{}, {view:'front'}) : false;
}

// The cape's true contour is supplied by the motion/turnaround renderer, so the
// glow follows the actual cloth pixels, including airborne and folded frames.
export function withStyleCEquipmentGlow(c, item, draw) {
  if (!item || item.rarity==='ordinary' || !item.rarity) return draw();
  c.save();
  c.shadowColor=item.rarity==='legendary'?'#65ff7a':'#ffffff';
  c.shadowBlur=3;
  try { return draw(); } finally { c.restore(); }
}
