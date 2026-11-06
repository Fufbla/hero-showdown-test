// Style C head v2. Skin, ink, eyes and accessories are independent materials.
// No pixels from a baked face are used: every feature is drawn exactly once.
// The stable scalp/eye anchors are shared by front, profile and rear hair.
export const STYLE_C_FACE_ANCHORS=Object.freeze({
 male:{center:[646,386]},female:{center:[948,395]},
});
export const HEAD_LAYERS=Object.freeze(['skin','ears','eyes','eyebrows','nose','mouth','facialHair','accessories']);
export const HEAD_BOUNDS=Object.freeze({x:-34,y:-44,w:65,h:70});
const DENSITY=5,LIMIT=48,cache=new Map();
let makeCanvas;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const rgb=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));
const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
const css=a=>`rgb(${a.map(v=>Math.round(clamp(v,0,255))).join(',')})`;
export function headPalette(look){
 const skin=rgb(look.skin),hair=rgb(look.hairColor),eye=rgb(look.eyes);
 return {skin:css(skin),light:css(mix(skin,[255,255,255],.16)),highlight:css(mix(skin,[255,255,255],.31)),
  shade:css(mix(skin,[0,0,0],.15)),deep:css(mix(skin,[0,0,0],.35)),
  ink:css(mix(skin,[12,12,18],.87)),hair:css(hair),hairInk:css(mix(hair,[12,12,18],.8)),hairLight:css(mix(hair,[208,197,215],.23)),
  eye:css(eye),eyeLight:css(mix(eye,[255,244,213],.45)),eyeDark:css(mix(eye,[3,5,10],.7)),
  lip:css(mix(skin,[127,37,45],.26)),lipLight:css(mix(skin,[255,222,211],.2))};
}
export function prepareStyleCHead({canvasFactory}={}){
 makeCanvas=canvasFactory||makeCanvas||((w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h}));
 return Promise.resolve(true);
}
export const styleCHeadStatus=()=>({ready:!!makeCanvas,entries:cache.size,limit:LIMIT,version:2});
export const headView=view=>view==='back'?'back':['side','right','left'].includes(view)?'side':'front';
export function headRegistration(look,view='front'){
 const mirror=view==='left';view=headView(view);
 return {view,unit:view==='front'?(look.presentation==='female'?2.5:2.55):view==='back'?131/36:(look.presentation==='female'?114:111)/36,
  // Jaw/cheek controls never scale the scalp, eyes or hair. The lower contour
  // alone changes, so every style keeps its forehead and temple attachment.
  scalp:[-4,-23],eyeLine:0,jaw:look.jaw,mirror};
}
function path(c,commands){c.beginPath();for(const [op,...v] of commands)c[op](...v);}
function ellipse(c,x,y,rx,ry,fill,stroke,width=.6){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
function gradient(c,x,y,r,stops){const g=c.createRadialGradient(x,y,0,x,y,r);for(const [at,color] of stops)g.addColorStop(at,color);return g;}
function contour(c,l,v){
 const female=l.presentation==='female',j=l.jaw,round=l.face==='round'?1.6:l.face==='angular'?-1:0;
 if(v==='back'){
  path(c,[['moveTo',-17,0],['bezierCurveTo',-21,-17,-15,-26,-2,-26],['bezierCurveTo',11,-27,19,-19,18,-5],['bezierCurveTo',18,4,11,10,0,10],['bezierCurveTo',-11,10,-16,7,-17,0],['closePath']]);return;
 }
 if(v==='side'){
  const chin=14+(female?1:0),jaw=8*(j-1)+round*.6;
  path(c,[['moveTo',-22,0],['bezierCurveTo',-28,-17,-20,-30,-5,-30],['bezierCurveTo',8,-31,14,-23,14,-13],
   ['bezierCurveTo',12,-8,13,-4,15,1],['quadraticCurveTo',18,4,15,5.5],
   ['quadraticCurveTo',14,7,15,8.5],['quadraticCurveTo',16,10,14,11],
   ['bezierCurveTo',16,chin+1,8,chin+3,2-jaw*.4,chin+2],
   ['bezierCurveTo',-7-jaw,chin+2,-15-jaw*.3,8,-19,3],['quadraticCurveTo',-22,1,-22,0],['closePath']]);return;
 }
 const forehead=female?20:17.3;
 const top=female?-36:-33,chin=female?17.5:14.5,left=-20-(j-1)*11-round,right=18+(j-1)*4+round*.4;
 path(c,[['moveTo',-22,-4],['bezierCurveTo',-28,-24,-19,top-2,-5,top],
  ['bezierCurveTo',12,top-2,forehead,top+9,forehead,-13],['bezierCurveTo',forehead,-7,forehead+1,-3,forehead,0],['quadraticCurveTo',right+1,4,right,7],
  ['bezierCurveTo',right-2,chin-2,9,chin+1,-1,chin],
  ['bezierCurveTo',-11,chin-1,left+1,12,left,5],['quadraticCurveTo',-22,3,-22,0],['lineTo',-22,-4],['closePath']]);
}
function ears(c,l,v,p){
 const one=(x,y,flip=1,back=false)=>{
  const size=back?.58:v==='side'?.72:.8;
  c.save();c.translate(x,y);c.scale(flip*size,size);
  path(c,[['moveTo',3,-4],['bezierCurveTo',-1,-9,-6,-7,-5,0],['bezierCurveTo',-5,5,1,8,4,4],['closePath']]);
  const g=c.createLinearGradient(-5,-5,4,5);g.addColorStop(0,p.light);g.addColorStop(.5,p.skin);g.addColorStop(1,p.shade);c.fillStyle=g;c.fill();c.strokeStyle=p.ink;c.lineWidth=.7;c.stroke();
  if(!back){path(c,[['moveTo',1,-3],['bezierCurveTo',-2,-6,-4,-2,-1,1],['quadraticCurveTo',2,0,1,3]]);c.strokeStyle=p.deep;c.lineWidth=.65;c.stroke();path(c,[['moveTo',-3,-2],['quadraticCurveTo',-1,-4,1,-2]]);c.strokeStyle=p.highlight;c.lineWidth=.35;c.stroke();}
  c.restore();
 };
 if(v==='back'){one(-15,0,1,true);one(15,0,-1,true);}
 else if(v==='side')one(-8.5,0);
 else one(-23,0);
}
function skin(c,l,v,p){
 contour(c,l,v);c.fillStyle=gradient(c,5,-15,44,[[0,p.light],[.42,p.skin],[.85,p.shade],[1,p.deep]]);c.fill();c.strokeStyle=p.ink;c.lineWidth=.75;c.stroke();
 c.save();contour(c,l,v);c.clip();
 // Broad, soft planes belong to the skin material. They cannot retain another
 // skin color when a facial control or saved palette changes.
 c.fillStyle=gradient(c,-18,3,24,[[0,p.shade],[1,'rgba(0,0,0,0)']]);c.fillRect(-33,-20,60,50);
 c.globalAlpha=.17;c.fillStyle=gradient(c,2,-19,25,[[0,p.highlight],[1,'rgba(255,255,255,0)']]);c.fillRect(-30,-42,60,60);c.globalAlpha=1;
 if(v!=='back'){
  c.globalAlpha=.25;c.strokeStyle=p.highlight;c.lineWidth=.7;
  path(c,v==='side'?[['moveTo',16,6],['quadraticCurveTo',17,13,8,15]]:[['moveTo',16,7],['bezierCurveTo',13,13,6,15,0,14.6]]);c.stroke();
 }
 c.restore();
}
function eyeOutline(c,rx,ry,shape){
 const almond=shape==='almond';
 path(c,[['moveTo',-rx,-ry*.5],['bezierCurveTo',-rx*.5,-ry*1.15,rx*.5,-ry*1.05,rx,-ry*.3],
  ['bezierCurveTo',rx,ry*.35,rx*.47,ry,0,ry],['bezierCurveTo',-rx*.68,ry*(almond?.8:1),-rx,ry*.23,-rx,-ry*.5],['closePath']]);
}
function eye(c,l,p,x,y,far=false,profile=false,closed=0){
 const f=l.presentation==='female';let rx=(f?8.1:7.1)*(far?.76:1),ry=(f?6.4:5.4)*(far?.96:1);
 if(profile){rx=f?5.5:5.3;ry=f?5.8:5.1;}
 if(l.eyeShape==='round'){ry*=1.1;rx*=.98;}if(l.eyeShape==='wide'){rx*=1.12;ry*=.87;}
 c.save();c.translate(x,y);if(far)c.rotate(-.09);
 // Eyelid folds are fresh skin-colored linework, never a skin-colored bitmap.
 c.strokeStyle=p.shade;c.lineWidth=.6;path(c,[['moveTo',-rx,-ry-.7],['quadraticCurveTo',0,-ry-3,rx,-ry-1]]);c.stroke();
 if(closed>=.95){c.strokeStyle=p.ink;c.lineWidth=f?1.1:.85;path(c,[['moveTo',-rx,0],['quadraticCurveTo',0,2,rx,-1]]);c.stroke();c.restore();return;}
 c.scale(1,Math.max(.08,1-closed));
 eyeOutline(c,rx,ry,l.eyeShape);const sclera=c.createLinearGradient(0,-ry,0,ry);sclera.addColorStop(0,'#c6c9c6');sclera.addColorStop(.38,'#fffbed');sclera.addColorStop(1,'#eee9dc');c.fillStyle=sclera;c.fill();
 c.save();eyeOutline(c,rx,ry,l.eyeShape);c.clip();
 const ix=profile?1.6:far?.8:1.2,ir=rx*.69;
 const iris=c.createLinearGradient(ix,-ry,ix,ry);iris.addColorStop(0,p.eyeDark);iris.addColorStop(.48,p.eye);iris.addColorStop(1,p.eyeLight);
 ellipse(c,ix,.1,ir,ry*.95,iris,'#1b171d',.65);
 // Fine radial iris fibers retain the selected iris color and scale with it.
 c.save();c.globalAlpha=.22;c.strokeStyle=p.eyeDark;c.lineWidth=.18;
 for(let n=0;n<22;n++){const a=n/22*Math.PI*2;c.beginPath();c.moveTo(ix+Math.cos(a)*ir*.65,.1+Math.sin(a)*ry*.63);c.lineTo(ix+Math.cos(a)*ir*.92,.1+Math.sin(a)*ry*.88);c.stroke();}c.restore();
 ellipse(c,ix,-1,ir*.65,ry*.70,'#0c0c13');
 ellipse(c,ix-ir*.39,-ry*.46,ir*.36,ry*.25,'#fffffa');ellipse(c,ix+ir*.48,ry*.41,ir*.13,ry*.11,'#fffbec');
 c.restore();eyeOutline(c,rx,ry,l.eyeShape);c.strokeStyle=p.ink;c.lineWidth=.45;c.stroke();
 path(c,[['moveTo',-rx-.5,-ry*.5],['bezierCurveTo',-rx*.5,-ry*1.2,rx*.5,-ry*1.1,rx,-ry*.45]]);c.lineWidth=f?1.2:1.0;c.stroke();
 if(f){path(c,[['moveTo',-rx*.86,-ry*.7],['quadraticCurveTo',-rx-2,-ry*.7,-rx-2.3,-ry-1.5]]);c.lineWidth=.8;c.stroke();}
 c.restore();
}
function brows(c,l,v,p){
 const f=l.presentation==='female';
 const one=(x,y,w,slope)=>{
  c.save();c.translate(x,y);c.rotate(slope);
  const thick=l.brows==='bold'?(f?1.9:2.4):l.brows==='straight'?1.05:.8;
  const arch=l.brows==='straight'?0:l.brows==='soft'?-1.3:-2;
  path(c,[['moveTo',-w/2,0],['quadraticCurveTo',-w*.15,arch-thick,w/2,-.2],['quadraticCurveTo',w*.45,thick*.6,w*.34,thick*.7],['quadraticCurveTo',-w*.05,arch+thick*.35,-w/2,.55],['closePath']]);
  const g=c.createLinearGradient(0,-3,0,2);g.addColorStop(0,p.hairLight);g.addColorStop(.4,p.hair);g.addColorStop(1,p.hairInk);c.fillStyle=g;c.fill();c.restore();
 };
 if(v==='side')one(6.4,-9.7,12,.25);
 else {one(-10,-9.8,15,f?.22:.32);one(10,-10.6,11,-.33);}
}
function nose(c,l,v,p){
 const size=l.nose==='small'?.72:l.nose==='broad'?1.32:1;
 c.save();c.translate(v==='side'?14:2.3,v==='side'?4.2:5.5);c.scale(size,size);
 if(v==='side'){
  path(c,[['moveTo',-1,-3],['quadraticCurveTo',3,0,1,1],['lineTo',-1.5,1.4]]);
 }else path(c,[['moveTo',-2,.4],['quadraticCurveTo',-.5,2.2,2,.9],['quadraticCurveTo',3,0,1.5,-.5]]);
 c.strokeStyle=p.deep;c.lineWidth=.58;c.stroke();
 c.strokeStyle=p.highlight;c.lineWidth=.4;path(c,[['moveTo',-1.7,-.7],['quadraticCurveTo',-.2,-1.2,.6,-.8]]);c.stroke();c.restore();
}
function mouth(c,l,v,p){
 const x=v==='side'?11.5:-.3,y=l.presentation==='female'?10.7:9.6;
 c.save();c.translate(x,y);if(v==='side')c.scale(.62,1);
 if(l.mouth==='smile'){
  path(c,[['moveTo',-4,-.5],['quadraticCurveTo',0,1,4,-.6],['quadraticCurveTo',2,4,0,3.7],['quadraticCurveTo',-3,3,-4,-.5],['closePath']]);c.fillStyle=p.lip;c.fill();c.strokeStyle=p.ink;c.lineWidth=.48;c.stroke();
  path(c,[['moveTo',-3.1,.1],['quadraticCurveTo',0,1.1,3.1,.1],['quadraticCurveTo',1.8,1.7,-2.5,1.1],['closePath']]);c.fillStyle='#fff9ed';c.fill();
 }else if(l.mouth==='full'){
  path(c,[['moveTo',-4,0],['quadraticCurveTo',-1,-2.2,0,-1.2],['quadraticCurveTo',1,-2.2,4,0],['quadraticCurveTo',0,3.8,-4,0],['closePath']]);c.fillStyle=p.lip;c.fill();path(c,[['moveTo',-3.5,.2],['quadraticCurveTo',0,.8,3.5,.1]]);c.strokeStyle=p.deep;c.lineWidth=.42;c.stroke();path(c,[['moveTo',-1.6,1.6],['quadraticCurveTo',0,2.1,1.7,1.5]]);c.strokeStyle=p.lipLight;c.lineWidth=.4;c.stroke();
 }else {path(c,[['moveTo',-3.7,.4],['quadraticCurveTo',-.4,-.5,3.6,.1]]);c.strokeStyle=p.deep;c.lineWidth=.6;c.stroke();path(c,[['moveTo',-1.6,2],['quadraticCurveTo',0,2.4,1.5,2]]);c.strokeStyle=p.shade;c.lineWidth=.4;c.stroke();}
 c.restore();
}
function facialHair(c,l,v,p){
 if(l.facialHair==='none'||v==='back')return;
 const f=l.presentation==='female',bottom=f?17.5:14.5;
 c.save();contour(c,l,v);c.clip();
 const beard=l.facialHair==='beard';
 if(beard){
  if(v==='side')path(c,[['moveTo',-11,5],['quadraticCurveTo',-2,14,11,11],['lineTo',19,9],['lineTo',21,22],['lineTo',-11,21],['closePath']]);
  else path(c,[['moveTo',-19,3],['quadraticCurveTo',-14,12,-5,11.5],['quadraticCurveTo',0,15,5,11],['quadraticCurveTo',14,10,18,5],['lineTo',21,bottom+8],['lineTo',-23,bottom+8],['closePath']]);
  const g=c.createLinearGradient(0,7,0,bottom+4);g.addColorStop(0,p.hairLight);g.addColorStop(.65,p.hair);g.addColorStop(1,p.hairInk);c.fillStyle=g;c.fill();
 }
 c.strokeStyle=beard?p.hairLight:p.hair;c.globalAlpha=beard?.40:.46;c.lineWidth=beard?.25:.22;
 for(let row=0;row<4;row++)for(let col=0;col<16;col++){
  const x=-17+col*2.2+(row%2),y=8+row*2.2+Math.abs(x)*.08;
  if(v==='front'&&Math.abs(x)<5&&y<13)continue;
  c.beginPath();c.moveTo(x,y);c.lineTo(x+.3,y+.75);c.stroke();
 }c.restore();
}
function accessories(c,l,v){
 if(l.presentation!=='female')return;
 const hoop=(x,y,scale=1)=>{c.save();c.translate(x,y);c.scale(scale,1);
  ellipse(c,0,0,2.9,4.7,null,'#29221b',1.4);
  const gold=c.createLinearGradient(-3,-4,3,4);gold.addColorStop(0,'#fff0a1');gold.addColorStop(.4,'#b59132');gold.addColorStop(.72,'#ffe480');gold.addColorStop(1,'#8b621d');ellipse(c,0,0,2.9,4.7,null,gold,.9);ellipse(c,-.3,-4.8,.7,.8,'#ffe495');c.restore();};
 if(v==='front'){hoop(-24,11);hoop(17,11,.58);}else if(v==='side')hoop(-6.5,9,.9);else {hoop(-15,8,.65);hoop(15,8,.65);}
}
function age(c,l,v,p){
 if(l.age!=='older'||v==='back')return;
 c.strokeStyle=p.shade;c.lineWidth=.35;c.globalAlpha=.7;
 const lines=v==='side'?[[1,6,4,7,6,6],[3,-16,7,-17,11,-16]]:[[-18,7,-15,8,-12,7],[9,7,12,7,14,5],[-13,-18,-5,-20,3,-18]];
 for(const [a,b,d,e,f,g]of lines){path(c,[['moveTo',a,b],['quadraticCurveTo',d,e,f,g]]);c.stroke();}c.globalAlpha=1;
}
export function paintHeadLayer(c,l,view,layer,blink=0){
 const v=headView(view),p=headPalette(l);c.save();c.lineCap='round';c.lineJoin='round';
 if(layer==='ears')ears(c,l,v,p);
 if(layer==='skin')skin(c,l,v,p);
 if(v!=='back'){
  if(layer==='eyes'){if(v==='side')eye(c,l,p,l.presentation==='female'?7.5:8.8,.4,false,true,blink);else{eye(c,l,p,10,-1.2,true,false,blink);eye(c,l,p,-10,0,false,false,blink);}}
  if(layer==='eyebrows')brows(c,l,v,p);
  if(layer==='nose')nose(c,l,v,p);
  if(layer==='mouth'){mouth(c,l,v,p);age(c,l,v,p);}
  if(layer==='facialHair')facialHair(c,l,v,p);
 }
 if(layer==='accessories')accessories(c,l,v);
 c.restore();
}
export function drawStyleCHead(c,look,{view='front',blink=0,accessoriesOnly=false}={}){
 if(!makeCanvas)return false;
 const v=headView(view),closed=Math.round(clamp(Number(blink)||0)*4)/4;
 const key=[v,accessoriesOnly,closed,...['presentation','skin','eyes','hairColor','age','face','jaw','eyeShape','brows','nose','mouth','facialHair'].map(k=>look[k])].join('|');
 let canvas=cache.get(key);
 if(!canvas){
  const b=HEAD_BOUNDS;canvas=makeCanvas(b.w*DENSITY,b.h*DENSITY);const ctx=canvas.getContext('2d');ctx.scale(DENSITY,DENSITY);ctx.translate(-b.x,-b.y);
  for(const layer of HEAD_LAYERS)if(accessoriesOnly?layer==='accessories':layer!=='accessories')paintHeadLayer(ctx,look,v,layer,closed);
  cache.set(key,canvas);while(cache.size>LIMIT)cache.delete(cache.keys().next().value);
 }else {cache.delete(key);cache.set(key,canvas);}
 const b=HEAD_BOUNDS;c.drawImage(canvas,b.x,b.y,b.w,b.h);return true;
}
