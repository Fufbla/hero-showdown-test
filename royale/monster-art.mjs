import {drawNewMonster} from './world-art.mjs';
import {TYPES} from './world.mjs';
const INK='#243741',TAU=Math.PI*2;
export const MONSTER_HEIGHT={bottle:55,slime:49,crawler:40,sprout:65,mushroom:62,bark:43,scrap:46,venomCrawler:53,sludge:62,drone:52,scorpion:74,beetle:46,thornBeast:84,stalker:96,apocalypse:100,spitter:61,wisp:61,phantom:83,sentinel:110,guardian:105,titan:120};
const line=(c,p,color,w=2)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke();};
const oval=(c,x,y,rx,ry,color,outline=null)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();if(outline){c.strokeStyle=outline;c.lineWidth=2;c.stroke();}};
const poly=(c,p,color)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();c.strokeStyle=INK;c.lineWidth=2;c.stroke();};
const eyes=(c,x,y,night)=>{if(night){c.shadowColor='#fff02b';c.shadowBlur=7;}oval(c,x,y,3,3.5,night?'#fff32d':'#fff4d9');c.shadowBlur=0;if(!night)oval(c,x+1,y,1.4,2,INK);};
export function drawMonsterSprite(c,e,t,night=false){
 const info=TYPES[e.type],strike=e.state==='strike',warn=e.state==='warn',color=info.color;
 c.save();
 if(warn){c.transform(1,0,-.07, .96,0,0);}
 if(strike){const thrust=Math.sin(Math.min(1,e.age/.28)*Math.PI);c.transform(1,0,thrust*.13,1,thrust*3,0);}
 if(info.region>1)drawNewMonster(c,e,info,t,night);
 else if(e.type==='bottle'){
  const stride=Math.sin(t*7)*5;line(c,[[-8,-9],[-12,-4],[-14+stride,0]],INK,4);line(c,[[8,-9],[12,-4],[14-stride,0]],INK,4);
  poly(c,[[-14,-8],[-16,-32],[-7,-39],[-7,-47],[6,-47],[6,-39],[14,-32],[14,-8]],color);
  c.fillStyle='#eef4d4';c.fillRect(-13,-28,25,14);c.fillStyle='#e6b477';c.fillRect(-8,-50,16,6);line(c,[[-7,-47],[6,-47]],'#fff0c7',2);
  line(c,[[-10,-32],[-10,-29]],'#ffffffbb',2);line(c,[[8,-37],[11,-30],[11,-11]],'#1d697060',3);
  eyes(c,-5,-22,night);eyes(c,6,-22,night);line(c,[[-2,-13],[5,-14]],INK,1.4);
  line(c,[[-15,-21],[-21,-17],[-21-(strike?8:0),-23]],INK,3);line(c,[[14,-21],[20,-16],[23+(strike?10:0),-24]],INK,3);
 }else if(e.type==='slime'){
  const squash=Math.sin(t*5)*2;c.beginPath();c.moveTo(-25,-2);c.bezierCurveTo(-31,-18-squash,-18,-39,0,-35+squash);c.bezierCurveTo(25,-42,30,-15,25,-2);c.quadraticCurveTo(0,5,-25,-2);c.fillStyle=color;c.fill();c.strokeStyle=INK;c.lineWidth=2;c.stroke();
  oval(c,-13,-24,7,3,'#e4f7b6');oval(c,15,-10,6,3,'#83973f');poly(c,[[-11,-29],[-14,-41],[-3,-45],[2,-31]],'#d4bd8b');
  line(c,[[-10,-39],[-5,-40]],'#f4e2b7');eyes(c,-5,-18,night);eyes(c,9,-18,night);line(c,[[0,-9],[6,-9]],INK,2);
 }else{
  for(let i=0;i<3;i++){const x=-16+i*14,p=Math.sin(t*9+i)*4;line(c,[[x,-15],[x-9,-8],[x-12+p,0]],INK,3);line(c,[[x,-13],[x+9,-6],[x+12-p,0]],'#89603e',3);}
  oval(c,0,-18,24,16,color,INK);poly(c,[[-20,-20],[-9,-34],[3,-35],[20,-20]],'#ca8c52');line(c,[[-9,-29],[-4,-24],[3,-24]],'#ffe0a3',2);
  eyes(c,13,-18,night);poly(c,[[18,-13],[30+(strike?7:0),-16],[26,-7]],'#f3d6a5');
 }
 // Restrained ink hatching on the shaded side; no transient rarity/eye glow changes.
 line(c,[[-info.w*.21,-info.h*.63],[-info.w*.13,-info.h*.58]],'#ffffff40',1.5);
 c.restore();
}
// Display-sized atlases: eight gait frames plus four attack poses. Six entries max
// (three species x day/night), so touring all regions cannot grow texture memory.
export class MonsterAtlas{
 constructor(){this.entries=new Map();this.limit=6;this.cell={w:144,h:152,scale:1.5};}
 atlas(type,night){
  const key=`${type}:${night}`;
  if(this.entries.has(key)){const a=this.entries.get(key);this.entries.delete(key);this.entries.set(key,a);return a;}
  const {w,h,scale}=this.cell,canvas=document.createElement('canvas');canvas.width=w*scale*6;canvas.height=h*scale*2;const c=canvas.getContext('2d');
  for(let i=0;i<12;i++){
   c.save();c.translate((i%6)*w*scale,Math.floor(i/6)*h*scale);c.scale(scale,scale);c.translate(w/2,h-10);
   drawMonsterSprite(c,{type,id:0,state:i===8?'warn':i>8?'strike':'patrol',age:(i-9)/3*.28,face:1},i<8?i/8*TAU/5:.25,night);c.restore();
  }
  this.entries.set(key,canvas);while(this.entries.size>this.limit)this.entries.delete(this.entries.keys().next().value);return canvas;
 }
 draw(c,e,t,night){
  const {w,h,scale}=this.cell,canvas=this.atlas(e.type,night);
  const frame=e.state==='warn'?8:e.state==='strike'?9+Math.min(2,Math.floor(e.age/.28*3)):Math.floor((e.walkCycle??t*TYPES[e.type].speed/60)*8)%8;
  c.drawImage(canvas,(frame%6)*w*scale,Math.floor(frame/6)*h*scale,w*scale,h*scale,-w/2,-h+10,w,h);
 }
}
