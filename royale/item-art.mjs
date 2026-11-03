import {drawFireballIcon, prepareFireballArt} from './fireball-armor-art.mjs';
const atlasURL=new URL('./assets/items/comic-equipment.png',import.meta.url);
let atlas=null,loading=null;const cache=new Map();
export function prepareItemArt(options={}){return loading||=(options.imageLoader?options.imageLoader(atlasURL):new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=atlasURL.href;})).then(image=>{atlas=image;cache.clear();return true;}).catch(()=>false);}
export function itemArtReady(){return !!atlas;}
function painted(c,def,size){
 const part=({mask:'helmet',suit:'chest',set:'chest'})[def.part]||def.part||'chest',index=['helmet','chest','boots','root'].indexOf(part);if(!atlas||index<0)return false;
 const key=[part,def.color,def.accent].join(':');let tile=cache.get(key);
 if(!tile){tile=document.createElement('canvas');tile.width=tile.height=256;const t=tile.getContext('2d');const w=atlas.width/2,h=atlas.height/2;t.drawImage(atlas,index%2*w,Math.floor(index/2)*h,w,h,0,0,256,256);
  if(part!=='root'){const data=t.getImageData(0,0,256,256),base=def.color||'#327f86',accent=def.accent||'#f0bd70',rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));const a=rgb(base),b=rgb(accent);for(let i=0;i<data.data.length;i+=4){const l=(data.data[i]+data.data[i+1]+data.data[i+2])/765;for(let j=0;j<3;j++)data.data[i+j]=l<.68?a[j]*(l/.68):a[j]+(b[j]-a[j])*(l-.68)/.32;}t.putImageData(data,0,0);}
  if(cache.size>=96)cache.delete(cache.keys().next().value);cache.set(key,tile);
 }
 c.save();if(def.rarity==='rare'||def.rarity==='legendary'){c.shadowColor=def.rarity==='rare'?'#fff':'#65ff7a';c.shadowBlur=size*.09;}c.drawImage(tile,0,0,size,size);c.restore();return true;
}
// Catalog colors remain authoritative. Layered ink, enamel and metal highlights
// are drawn at display resolution; the icon canvas retains transparency.
export function drawItem(c,def,size=96){
 if(def.fireballLevels && drawFireballIcon(c,def,size))return;
 if(painted(c,def,size))return;
 c.save();c.scale(size/96,size/96);c.translate(48,48);const color=def.color||'#b88147',accent=def.accent||'#c9e493';
 if(def.rarity==='rare'||def.rarity==='legendary'){c.shadowColor=def.rarity==='rare'?'#fff':'#65ff7a';c.shadowBlur=9;}
 const metal=c.createLinearGradient(-32,-35,28,32);metal.addColorStop(0,accent);metal.addColorStop(.25,color);metal.addColorStop(.65,color);metal.addColorStop(1,'#182b39');
 const shape=(points,fill=metal)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();c.strokeStyle='#142331';c.lineWidth=2.5;c.lineJoin='round';c.stroke();};
 const part=def.part||'set';
 if(part==='root'){
  shape([[-4,-8],[-17,13],[-14,32],[-5,20],[0,37],[7,17],[19,26],[14,7],[5,-9]],'#bc8650');
  shape([[0,-7],[-27,-20],[-24,-35],[-7,-31],[0,-15]],'#6dbb65');shape([[0,-10],[8,-37],[30,-33],[22,-17]],'#a6db70');
 }else if(['helmet','mask'].includes(part)){
  shape([[-31,23],[-29,-15],[-17,-32],[15,-32],[29,-16],[32,23],[15,29],[11,8],[-11,8],[-16,29]]);
  shape([[-23,-8],[-3,-3],[0,6],[-21,2]],'#172d3b');shape([[23,-8],[3,-3],[0,6],[21,2]],'#172d3b');shape([[-5,-30],[5,-30],[7,4],[0,12],[-7,4]],accent);
 }else if(part==='boots'){
  for(const side of [-1,1]){c.save();c.translate(side*18,0);shape([[-10,-31],[10,-31],[9,13],[17,23],[15,31],[-12,31],[-13,11]]);shape([[-9,-22],[8,-22],[7,-12],[-9,-12]],accent);shape([[-12,23],[15,23],[15,31],[-12,31]],'#25394a');c.restore();}
 }else if(['chest','suit','set'].includes(part)){
  shape([[-12,-31],[-29,-27],[-40,-12],[-28,0],[-20,-7],[-17,32],[17,32],[20,-7],[28,0],[40,-12],[29,-27],[12,-31],[0,-20]]);
  shape([[-19,-15],[-3,-10],[-2,5],[-19,0]],accent);shape([[19,-15],[3,-10],[2,5],[19,0]],accent);shape([[-13,13],[0,17],[13,13],[12,25],[-12,25]],color);
 }else if(part==='cape'){shape([[-15,-30],[15,-30],[32,32],[10,25],[0,33],[-12,26],[-33,32]]);}
 else {shape([[-25,-21],[20,-28],[31,0],[18,26],[-18,29],[-31,2]]);shape([[-12,-6],[0,-17],[12,-6],[0,15]],accent);}
 c.shadowBlur=0;c.strokeStyle='#ffffff70';c.lineWidth=1.3;for(let i=0;i<4;i++){c.beginPath();c.moveTo(-17+i*10,-20);c.lineTo(-12+i*10,-17);c.stroke();}c.restore();
}
export function itemIcon(def){const canvas=document.createElement('canvas');canvas.width=canvas.height=144;canvas.className='item-art';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',def.name||'Equipment');const draw=()=>{const c=canvas.getContext('2d');c.clearRect(0,0,144,144);drawItem(c,def,144);};draw();if(def.fireballLevels)prepareFireballArt().then(ok=>{if(ok)draw();});else if(!atlas)prepareItemArt().then(draw);return canvas;}
