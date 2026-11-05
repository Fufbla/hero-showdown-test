import {skinShade} from './skin-color.mjs';
// The full forward resting figure is drawn from the original reference elsewhere.
// These plates fit its exposed face to a separate scalp, native hair and individual features.
import {STYLE_C_DEFAULTS} from './style-c-defaults.mjs';

const density = 2;
const limit = 24;
const cache = new Map();
let art = null, loading = null, makeCanvas = null;

export const STYLE_C_FACE_ANCHORS = Object.freeze({
  male:   {center:[646,386], origin:[516,247], size:[212,194], beard:[594,381,89,46]},
  female: {center:[948,395], origin:[776,247], size:[249,236], beard:[895,391,90,44]},
});

// Source-space rectangles include antialiasing at the old and new feature edges.
const features = {
  male: {
    nearEye:[605,370,38,32], farEye:[653,367,30,35],
    nearBrow:[602,356,44,30], farBrow:[654,358,34,28],
    nose:[641,391,22,19], mouth:[624,401,41,21],
  },
  female: {
    nearEye:[900,375,46,36], farEye:[955,370,32,42],
    nearBrow:[902,360,47,27], farBrow:[957,360,31,28],
    nose:[943,399,22,19], mouth:[933,410,33,22],
  }
};
const featureIndex = {nearEye:[4,0],farEye:[4,1],nearBrow:[5,0],farBrow:[5,1],nose:[6,0],mouth:[6,1]};
const cap = v => Math.max(0, Math.min(255, v));
const rgb = c => [1,3,5].map(i => parseInt(c.slice(i,i+2),16));
const defaultFactory = (w,h) => typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w,h) :
  Object.assign(document.createElement('canvas'),{width:w,height:h});
const defaultLoader = url => new Promise((resolve,reject) => {
  const im = new Image(); im.onload=()=>resolve(im); im.onerror=()=>reject(new Error('Face artwork failed to load')); im.src=url.href;
});

export function isOmittedEyelidSkin(base,i,mask) {
  const r=base[i],g=base[i+1],b=base[i+2];
  return base[i+3]>0&&mask[i]===0&&mask[i+1]===0&&mask[i+2]===0&&r>40&&g>16&&b>5&&r-g>8&&g-b>5&&r>g*1.2&&g>b*1.1;
}

export function prepareStyleCFace({canvasFactory, imageLoader} = {}) {
  if (art) return Promise.resolve(true);
  if (loading) return loading;
  makeCanvas = canvasFactory || defaultFactory;
  const loader = imageLoader || defaultLoader;
  const sources = ['male','female','beard','stubble','mouth-smile','mouth-full','eyebrows'];
  loading = Promise.all(sources.map(name=>loader(new URL('./assets/hero/style-c-accurate/face/'+name+'.png',import.meta.url))))
    .then(images => {
      const loaded = Object.fromEntries(sources.map((name,i)=>[name,images[i]]));
      for (const sex of ['male','female']) {
        const {size} = STYLE_C_FACE_ANCHORS[sex], w=size[0]*density, h=size[1]*density;
        const atlas=loaded[sex];
        if (atlas.width!==3*w || atlas.height!==3*h) throw Error('Unexpected face registration');
        const canvas=makeCanvas(atlas.width,atlas.height), c=canvas.getContext('2d',{willReadFrequently:true});
        c.drawImage(atlas,0,0);
        loaded[sex]=Array.from({length:9},(_,i)=>c.getImageData(i%3*w,Math.floor(i/3)*h,w,h).data);
      }
      // The source mask excluded whole eye rectangles, including eyelid skin.
      // Repair only warm skin pixels omitted from those rectangles. Explicit iris
      // and brow material weights, neutral sclera and dark linework are protected.
      for(const sex of ['male','female']) {
        const layers=loaded[sex], base=layers[0], mask=layers[2];
        const {origin:[ox,oy],size:[w]}=STYLE_C_FACE_ANCHORS[sex];
        for(const name of ['nearEye','farEye']) {
          const [x,y,width,height]=features[sex][name];
          for(let yy=0;yy<height*density;yy++)for(let xx=0;xx<width*density;xx++){
            const i=((y-oy)*density+yy)*w*density*4+((x-ox)*density+xx)*4;
            if(isOmittedEyelidSkin(base,i,mask))mask[i]=255;
          }
        }
      }
      art=loaded; return true;
    })
    .catch(()=>{loading=null;return false;});
  return loading;
}
export const styleCFaceStatus = () => ({entries:cache.size,limit,ready:!!art});
export function styleCFaceChanged(look) {
  const d=STYLE_C_DEFAULTS[look.presentation==='female'?'female':'male'];
  return ['skin','eyes','age','face','jaw','eyeShape','brows','nose','mouth','facialHair','hairColor'].some(k=>look[k]!==d[k]);
}

// Modulate painted values relative to the default palette. The material mask protects
// pupil ink, sclera, teeth, gold earrings and scalp outlines from other color controls.
function recolor(data, i, material, channels, selected, reference) {
  const skin=channels.includes(0)?skinShade([data[i],data[i+1],data[i+2]],selected[0],reference[0]):null;
  for (let k=0;k<3;k++) {
    let value=data[i+k];
    for (const ch of channels) {
      const weight=material[i+ch]/255;
      if (weight) value+=((ch===0?skin[k]:cap(data[i+k]*(selected[ch][k]+12)/(reference[ch][k]+12)))-data[i+k])*weight;
    }
    data[i+k]=cap(value);
  }
}
function replaceFeature(kind, look, closed) {
  if (kind.endsWith('Eye')) return closed || look.eyeShape!=='almond';
  if (kind.endsWith('Brow')) return look.brows!=='bold';
  if (kind==='nose') return look.nose!=='straight';
  return look.mouth!=='neutral';
}
function colorAccessory(image, tint, mouth=false) {
  const canvas=makeCanvas(image.width,image.height), c=canvas.getContext('2d',{willReadFrequently:true});
  c.drawImage(image,0,0);const im=c.getImageData(0,0,canvas.width,canvas.height), px=im.data;
  for(let i=0;i<px.length;i+=4){
    if(!px[i+3])continue;
    const gray=(px[i]*.23+px[i+1]*.63+px[i+2]*.14)/255;
    for(let k=0;k<3;k++) {
      if(mouth) {
        if(gray>.82) px[i+k]=[248,234,207][k]*gray;
        else px[i+k]=(tint[k]*.84+[45,1,4][k])*Math.pow(gray+.04,1.4);
      } else {
        const shade=gray*2.5;
        px[i+k]=shade>1?tint[k]+(231-tint[k])*.4*(shade-1):tint[k]*shade;
      }
    }
  } c.putImageData(im,0,0); return canvas;
}
function drawAge(c, sex, skin) {
  const f=STYLE_C_FACE_ANCHORS[sex], [x,y]=f.center;
  c.save();c.translate(x,y);c.lineCap='round';c.lineWidth=.85;
  c.strokeStyle='rgba('+skin.map(v=>Math.round(v*.46)).join(',')+',.75)';
  const paths=sex==='male'?[
    [-33,3,-32,6,-28,7],[-30,10,-25,12,-21,11],[24,10,27,9,29,6],[-12,19,-16,21,-16,26],
    [10,17,14,19,14,23],[-22,-24,-15,-26,-8,-24],[-5,-22,1,-24,6,-23],
  ]:[
    [-34,1,-35,4,-31,6],[-30,9,-26,11,-21,10],[25,9,29,7,30,4],[-10,15,-14,17,-15,22],
    [8,15,11,18,12,21],[-22,-26,-15,-28,-8,-26],[-5,-25,0,-27,6,-26],
  ];
  for (const [sx,sy,cx,cy,ex,ey] of paths) {
    c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo(cx,cy,ex,ey);c.stroke();
  }
  c.restore();
}
function reshape(canvas, look, model) {
  const jaw=look.jaw-1, cheek=look.face==='round'?.085:look.face==='angular'?-.055:0;
  const age=look.age==='teen'?.022:look.age==='older'?-.012:0;
  if(!jaw&&!cheek&&!age)return canvas;
  const output=makeCanvas(canvas.width,canvas.height), c=output.getContext('2d');
  const pivot=(model.center[0]-model.origin[0])*density, start=(model.center[1]-model.origin[1]-6)*density;
  c.drawImage(canvas,0,0,canvas.width,start,0,0,canvas.width,start);
  for(let row=start;row<canvas.height;row+=density){
    const t=Math.min(1,(row-start)/(44*density));
    const width=1+jaw*t*.78+cheek*Math.sin(Math.PI*t*.82)+age*t;
    c.drawImage(canvas,0,row,canvas.width,density,pivot*(1-width),row,canvas.width*width,density);
  } return output;
}
function drawEditedFeature(c, kind, patch, box, look, model, closed) {
  const [bx,by,w,h]=box, x=bx+w*.5,y=by+h*.5;
  const far=kind.startsWith('far');
  if(kind==='mouth' && look.mouth!=='neutral'){
    const mouth=colorAccessory(art['mouth-'+look.mouth],rgb(look.skin),true);
    const width=(look.mouth==='smile'?24.5:22)*(look.presentation==='female'?.9:1);
    const height=look.mouth==='smile'?8:7.5;
    c.drawImage(mouth,x-width*.53,y-height*.52,width,height);return;
  }
  if(kind.endsWith('Brow')){
    const column=far?1:0, row=(look.presentation==='female'?2:0)+(look.brows==='straight'?1:0);
    const browCanvas=makeCanvas(100,48), bc=browCanvas.getContext('2d');
    bc.drawImage(art.eyebrows,column*100,row*48,100,48,0,0,100,48);
    const hair=rgb(look.hairColor);
    bc.globalCompositeOperation='source-in';
    bc.fillStyle='rgb('+hair.map(v=>Math.round(v*.65)).join(',')+')';
    bc.fillRect(0,0,100,48);
    c.drawImage(browCanvas,x-25,y-12,50,24);return;
  }
  c.save();c.translate(x,y);
  if(kind.endsWith('Eye')) {
    if(closed>=.99){
      const width=far?7.6:10.5; c.strokeStyle='#25191c';c.lineWidth=1.8;c.lineCap='round';
      c.beginPath();c.moveTo(-width,-.6);c.quadraticCurveTo(0,4.8,width,-1.5);c.stroke();
      if(look.presentation==='female'){c.beginPath();c.moveTo(-width+1,.2);c.lineTo(-width-1.6,-2.1);c.stroke();}
      c.restore();return;
    }
    const eyeWidth=look.eyeShape==='round'?.94:look.eyeShape==='wide'?1.09:1;
    const eyeHeight=look.eyeShape==='round'?1.14:look.eyeShape==='wide'?.83:1;
    c.translate(0,closed*1.5);
    c.scale(eyeWidth,eyeHeight*(1-closed*.85));
  } else if(kind==='nose') {
    c.scale(look.nose==='broad'?1.36:.79,look.nose==='broad'?1.02:.84);
  }
  c.drawImage(patch,-w*.5,-h*.5,w,h);c.restore();
}
function buildFace(look, mode, closed, steel) {
  const sex=look.presentation==='female'?'female':'male', model=STYLE_C_FACE_ANCHORS[sex];
  const atlas=art[sex], {origin:[ox,oy],size:[w,h]}=model, W=w*density,H=h*density;
  const exposed=mode==='features', nativeHair=mode==='native-head';
  const source=exposed?atlas[8]:atlas[0], neutral=atlas[1], material=atlas[2];
  const d=STYLE_C_DEFAULTS[sex], selected=[rgb(steel?'#b2c2d2':look.skin),rgb(look.eyes),rgb(look.hairColor)];
  const reference=[rgb(d.skin),rgb(d.eyes),rgb(d.hairColor)];
  const channels=[0,1,2].filter(i=>selected[i].some((v,k)=>v!==reference[i][k]));
  const canvas=makeCanvas(W,H), c=canvas.getContext('2d',{willReadFrequently:true});
  const im=c.createImageData(W,H), data=im.data, changed=Object.keys(featureIndex).filter(k=>replaceFeature(k,look,closed));
  const transparentSkin=!channels.includes(0);
  const masks=changed.map(k=>{const [index,ch]=featureIndex[k];return [atlas[index],ch];});
  for(let i=0;i<data.length;i+=4){
    if(!source[i+3])continue;
    let edit=0;
    for (const [mask,ch] of masks) edit=Math.max(edit,mask[i+ch]);
    const mix=edit/255;
    for(let k=0;k<3;k++)data[i+k]=source[i+k]*(1-mix)+neutral[i+k]*mix;
    if(channels.length)recolor(data,i,material,channels,selected,reference);
    if(!exposed || !transparentSkin) data[i+3]=source[i+3];
    else {
      // With one parameter changed, all neighboring source facial pixels remain exact.
      let visibility=edit;
      for(const ch of channels)visibility=Math.max(visibility,material[i+ch]);
      data[i+3]=source[i+3]*visibility/255;
    }
  }
  c.putImageData(im,0,0);c.save();c.scale(density,density);c.translate(-ox,-oy);
  for(const kind of changed){
    const box=features[sex][kind], [x,y,pw,ph]=box;
    const patch=makeCanvas(pw*density,ph*density), pc=patch.getContext('2d'), item=pc.createImageData(patch.width,patch.height);
    const [layer,ch]=featureIndex[kind], mask=atlas[layer], original=atlas[8];
    for(let yy=0;yy<patch.height;yy++)for(let xx=0;xx<patch.width;xx++){
      const i=((yy+(y-oy)*density)*W+(x-ox)*density+xx)*4,j=(yy*patch.width+xx)*4;
      if(!mask[i+ch])continue;
      const colors=[original[i],original[i+1],original[i+2],255];
      const skin=skinShade([original[i],original[i+1],original[i+2]],selected[0],reference[0]);
      for(const tint of channels){
        const weight=material[i+tint]/255;
        for(let k=0;k<3;k++)colors[k]+=((tint===0?skin[k]:cap(original[i+k]*(selected[tint][k]+12)/(reference[tint][k]+12)))-original[i+k])*weight;
      }
      for(let k=0;k<3;k++)item.data[j+k]=colors[k];
      item.data[j+3]=mask[i+ch]*original[i+3]/255;
    }
    pc.putImageData(item,0,0);
    drawEditedFeature(c,kind,patch,box,look,model,closed);
  }
  if((closed || look.eyeShape!=='almond') && look.brows==='bold'){
    // The heavy source brow meets the upper eyelid. Restore its ink after the
    // changing eyelid has been painted, so a blink cannot erase the eyebrows.
    for(const kind of ['nearBrow','farBrow']){
      const [x,y,pw,ph]=features[sex][kind], brow=makeCanvas(pw*density,ph*density);
      const bc=brow.getContext('2d'), ink=bc.createImageData(brow.width,brow.height);
      for(let yy=0;yy<brow.height;yy++)for(let xx=0;xx<brow.width;xx++){
        const i=((yy+(y-oy)*density)*W+(x-ox)*density+xx)*4,j=(yy*brow.width+xx)*4;
        const a=material[i+2]*Math.max(atlas[4][i],atlas[4][i+1])/255;
        if(!a)continue;
        for(let k=0;k<3;k++)ink.data[j+k]=cap(atlas[8][i+k]*(selected[2][k]+12)/(reference[2][k]+12));
        ink.data[j+3]=a*atlas[8][i+3]/255;
      }
      bc.putImageData(ink,0,0);c.drawImage(brow,x,y,pw,ph);
    }
  }
  if(look.age==='older')drawAge(c,sex,selected[0]);
  if(look.facialHair!=='none'){
    const beard=colorAccessory(art[look.facialHair],selected[2]);
    c.drawImage(beard,...model.beard);
  }
  c.restore();
  const face=exposed?canvas:reshape(canvas,look,model);
  if(!nativeHair)return face;
  const native=makeCanvas(W,H), nc=native.getContext('2d'), hair=nc.createImageData(W,H);
  hair.data.set(atlas[7]);
  if(channels.includes(2)){
    const hc=selected[2], base=reference[2];
    for(let i=0;i<hair.data.length;i+=4){
      if(!hair.data[i+3])continue;
      const r=hair.data[i],g=hair.data[i+1],b=hair.data[i+2];
      if(r>1.12*g && g>1.25*b && r>103)continue; // gold accessories keep their own material
      for(let k=0;k<3;k++)hair.data[i+k]=cap(hair.data[i+k]*(hc[k]+17)/(base[k]+17));
    }
  }
  nc.putImageData(hair,0,0);
  const result=makeCanvas(W,H), rc=result.getContext('2d');
  rc.drawImage(face,0,0);rc.drawImage(native,0,0);return result;
}

export function drawStyleCFace(context, look, {center, scale=1, mode='head', steel=false, blink=false, expression=''}={}) {
  if(!art)return false;
  const model=STYLE_C_FACE_ANCHORS[look.presentation==='female'?'female':'male'];
  // A small set of closure keys avoids generating a new bitmap every animation tick.
  const closed=expression==='defeat'?1:Math.round(Math.min(1,Math.max(0,Number(blink)||0))*4)/4;
  const key=[look.presentation,mode,steel,closed,look.age,look.face,look.jaw,look.skin,look.eyes,
    look.hairColor,look.eyeShape,look.brows,look.nose,look.mouth,look.facialHair].join('|');
  let face=cache.get(key);
  if(!face){face=buildFace(look,mode,closed,steel);if(cache.size>=limit)cache.delete(cache.keys().next().value);cache.set(key,face);}
  const [x,y]=center||model.center;
  context.drawImage(face,x+(model.origin[0]-model.center[0])*scale,y+(model.origin[1]-model.center[1])*scale,model.size[0]*scale,model.size[1]*scale);
  return true;
}
