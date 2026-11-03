// The protected rest sprites contain the original reference RGB. Torso plates
// have a second, emblem-free painting for changing the insignia cleanly.
import {STYLE_C_DEFAULTS} from './style-c-defaults.mjs';

const bodyURL = file => new URL('./assets/hero/style-c-accurate/body/' + file, import.meta.url);
const symbols = ['star', 'bolt', 'shield', 'leaf', 'sun', 'wave'];
const originals = new Map(), variants = new Map();
const CACHE_LIMIT = 32;
let makeCanvas, pending, loaded = false, problem = null;

export const styleCBodyStatus = () => ({ready:loaded, error:problem, entries:variants.size, limit:CACHE_LIMIT});

export function prepareStyleCBody({canvasFactory, imageLoader}) {
  if (loaded) return Promise.resolve(true);
  if (pending) return pending;
  makeCanvas = canvasFactory;
  pending = (async () => {
    const files = ['male-source','female-source','male-head','female-head','male-cape','female-cape','torsos','emblems'];
    const images = await Promise.all(files.map(n => imageLoader(bodyURL(n + '.png'))));
    files.forEach((n,i) => originals.set(n, images[i]));
    const extract = (image,x,y,w,h) => {
      const tile=makeCanvas(w,h);
      tile.getContext('2d').drawImage(image,x,y,w,h,0,0,w,h);
      return tile;
    };
    for (const [i,sex] of ['male','female'].entries()) {
      originals.set(sex+'-torso', extract(originals.get('torsos'),i*240,0,240,320));
      originals.set(sex+'-bare', extract(originals.get('torsos'),i*240,320,240,320));
    }
    const emblems=originals.get('emblems');
    symbols.forEach((id,i) => originals.set(id,extract(emblems, (i%3)*96,Math.floor(i/3)*96,96,96)));
    loaded=true;
    return true;
  })().catch(error => { problem=error.message; pending=null; return false; });
  return pending;
}

const rgb = s => [1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
const luminance = ([r,g,b]) => r*.213+g*.715+b*.072;
function shade(data,i,target,origin) {
  const value=luminance([data[i],data[i+1],data[i+2]]) / Math.max(16,origin);
  for (let n=0;n<3;n++) data[i+n]=value<=1 ? target[n]*value :
    target[n]+(255-target[n])*Math.min(1,(value-1)*.42);
}
function material(kind,model,x,y,r,g,b) {
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  if (max<28 || max>243 && max-min<17) return;
  if (kind==='symbol') return 'emblemColor';
  if (kind==='cape') return 'capeColor';
  if (kind==='torso' || kind==='bare') {
    if (y<53 && r>g*1.25 && b<g*.84) return 'skin';
    if (r>g*1.05 && g>b*1.25) return 'trim';
    if (model.sex==='male' ? b>r*1.12 && b>g*1.1 : b>g*1.18 && r>g*1.14) return 'suit';
    return;
  }
  const inHead=y<model.head[1]+44 || model.sex==='female' && x<model.head[0]-54 && y<475;
  // Gold bands and hoops are separate from the hair dye; skin and the white
  // eye highlights also retain independent materials.
  if (inHead && r>g*1.21 && g>b*1.15 && r>75 && x>model.head[0]-63 && x<model.head[0]+67 && y>model.head[1]-47) return 'skin';
  if (inHead && b<137 && g<112 && r<153 && (max-min<54 || b>g*1.12)) return 'hairColor';
  if (r>g*1.06 && g>b*1.24 && max-min>36) return 'trim';
  if (y>model.shoulder[1]-21 && (model.sex==='male' ? b>r*1.12 && b>g*1.08 : b>g*1.22 && r>g*1.18)) {
    return x<model.shoulder[0]-47 ? 'capeColor':'suit';
  }
}
function colored(kind,model,look,palette,symbol) {
  const sex=model.sex, keyName=kind==='symbol'?symbol:sex+'-'+kind;
  const original=originals.get(keyName);
  if (!original) return null;
  const base=STYLE_C_DEFAULTS[sex];
  const colors={skin:look.skin,hairColor:look.hairColor,...palette};
  const candidates=kind==='symbol'?['emblemColor']:kind==='cape'?['capeColor']:
    kind==='source'?['skin','hairColor','suit','trim','capeColor']:['suit','trim','skin'];
  const edits=candidates.filter(id=>colors[id] && colors[id]!==base[id]);
  if (!edits.length) return original;
  const key=[sex,keyName,...edits.map(id=>id+colors[id])].join('|');
  if (variants.has(key)) return variants.get(key);
  const tile=makeCanvas(original.width,original.height),c=tile.getContext('2d',{willReadFrequently:true});
  c.drawImage(original,0,0);
  const pixels=c.getImageData(0,0,tile.width,tile.height),d=pixels.data;
  const inks=Object.fromEntries(edits.map(id=>[id,[rgb(colors[id]),luminance(rgb(base[id]))]]));
  const ox=kind==='source'?model.box[0]:0, oy=kind==='source'?model.box[1]:0;
  for(let y=0;y<tile.height;y++)for(let x=0;x<tile.width;x++){
    const i=(y*tile.width+x)*4;if(!d[i+3])continue;
    const id=material(kind,model,x+ox,y+oy,d[i],d[i+1],d[i+2]);
    if(inks[id])shade(d,i,...inks[id]);
  }
  c.putImageData(pixels,0,0);variants.set(key,tile);
  if(variants.size>CACHE_LIMIT)variants.delete(variants.keys().next().value);
  return tile;
}

export function drawSourceRest(c,base,look,palette) {
  const tile=colored('source',base,look,palette);
  if(tile)c.drawImage(tile,base.box[0],base.box[1]);
}
export function drawRegisteredHead(c,base,head) {
  const art=originals.get(base.sex+'-head');
  if(art)c.drawImage(art,base.box[0]+head[0]-base.head[0],base.box[1]+head[1]-base.head[1]);
}
const shapes=new WeakMap();
function shapedTorso(tile, look) {
  const {shoulders,chest,waist,hips}=look;
  if(shoulders===1&&chest===1&&waist===1&&hips===1)return {tile,factor:1};
  let entries=shapes.get(tile);if(!entries){entries=new Map();shapes.set(tile,entries);}
  const key=[shoulders,chest,waist,hips].join('|');
  if(entries.has(key))return entries.get(key);
  const maxWidth=Math.ceil(tile.width*Math.max(shoulders,chest,waist,hips));
  const warped=makeCanvas(maxWidth,tile.height), c=warped.getContext('2d');
  for(let y=0;y<tile.height;y++){
    const t=y/tile.height;
    const shape=t<.42?shoulders+(chest-shoulders)*t/.42:
      t<.74?chest+(waist-chest)*(t-.42)/.32:waist+(hips-waist)*(t-.74)/.26;
    const w=tile.width*shape;
    c.drawImage(tile,0,y,tile.width,1,(maxWidth-w)*.5,y,w,1);
  }
  const result={tile:warped,factor:maxWidth/tile.width};
  entries.set(key,result);if(entries.size>6)entries.delete(entries.keys().next().value);
  return result;
}
export function drawStyleCTorso(c,base,p,look,palette,hasEquippedEmblem) {
  const custom=hasEquippedEmblem||look.emblem!==STYLE_C_DEFAULTS[base.sex].emblem||palette.emblemColor!==STYLE_C_DEFAULTS[base.sex].emblemColor;
  const tile=colored(custom?'bare':'torso',base,look,palette); if(!tile)return;
  const [hx,hy]=p.hip,[sx,sy]=p.shoulder;
  const height=Math.hypot(hx-sx,hy-sy),width=(base.sex==='male'?82:76);
  c.save();c.translate(hx,hy);c.rotate(Math.atan2(sx-hx,hy-sy));
  const shape=shapedTorso(tile,look),top=-height-24,w=width*shape.factor;
  c.drawImage(shape.tile,-w*.5-width*.04,top,w,15-top);
  if(custom&&!hasEquippedEmblem){
    const crest=colored('symbol',base,look,palette,look.emblem);
    if(crest)c.drawImage(crest,-9,-height*.86,27,24);
  }
  c.restore();
}
export function drawStyleCCape(c,base,p,look,palette,time) {
  const tile=colored('cape',base,look,palette);if(!tile)return;
  const x=base.sex==='male'?438:776, y=base.sex==='male'?417:436;
  const dx=p.shoulder[0]-base.shoulder[0],dy=p.shoulder[1]-base.shoulder[1];
  const wind=(p.moving||0)+(p.clip==='flight'?1:0);
  // Shear the complete painted cloth around its clasp. A single filtered image
  // keeps the ink line and folds continuous at every camera scale.
  const gust=(Math.sin(time*4-.5)*.014-wind*.055);
  c.save();c.translate(base.shoulder[0]+dx,base.shoulder[1]+dy);
  c.transform(1,0,gust,1-wind*.025,0,0);
  c.drawImage(tile,x-base.shoulder[0],y-base.shoulder[1]);c.restore();
}
