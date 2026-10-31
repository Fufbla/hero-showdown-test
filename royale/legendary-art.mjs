import { LEGENDARY } from './legendary-data.mjs';
const line=(c,pts,color,w=2)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineJoin='round';c.lineCap='round';c.stroke();};
const ellipse=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
const polygon=(c,pts,color)=>{c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();};
export function drawLegendarySky(c,g,width,camera){
 const id=g.arenaScene.legendary,d=LEGENDARY[id],gradient=c.createLinearGradient(0,0,0,720);gradient.addColorStop(0,'#111725');gradient.addColorStop(1,d.colors[0]);c.fillStyle=gradient;c.fillRect(0,0,width,720);
 c.save();c.translate(-camera*.25,0);
 for(let i=-1;i<12;i++){const x=i*220;
  if(id==='lightning'){polygon(c,[[x,520],[x+30,150],[x+90,100],[x+145,170],[x+175,520]],'#252940');line(c,[[x+40,400],[x+60,210],[x+95,180],[x+130,410]],'#bca54d',3);}
  else if(id==='air'){for(let j=0;j<4;j++)ellipse(c,x+j*35,270+j%2*55,130,48,'#2b373b80');}
  else if(id==='styrodog'){for(let j=0;j<5;j++)ellipse(c,x+j*26,510-j%3*18,42,32,'#93958c');}
  else if(id==='sonic'){polygon(c,[[x,0],[x+52,260+i%3*60],[x+110,0]],'#352b3e');for(let j=0;j<3;j++){c.beginPath();c.arc(x+110,330,45+j*25,-1.5,1.5);c.strokeStyle='#ab86bd30';c.lineWidth=2;c.stroke();}}
  else if(id==='styro'){c.fillStyle='#243e41';c.fillRect(x,230,115,300);c.strokeStyle='#7caca3';c.strokeRect(x+18,260,79,135);line(c,[[x+50,230],[x+50,120],[x+150,120],[x+150,450]],'#6e8586',9);}
  else if(id==='wastelander'){polygon(c,[[x,520],[x+20,270],[x+65,290],[x+70,180],[x+120,220],[x+145,520]],'#273c3a');line(c,[[x+20,510],[x+45,320],[x+100,490]],'#597766',4);}
  else if(id==='venomis'){line(c,[[x,520],[x+40,350],[x+20,250],[x+70,180]],'#244e3a',18);for(let j=0;j<5;j++)ellipse(c,x+20+j*20,230+j*35,42,18,'#37654a');}
  else{c.fillStyle='#322e38';c.fillRect(x+20,170,105,350);c.strokeStyle='#a19167';c.lineWidth=5;c.strokeRect(x+20,170,105,350);for(let j=0;j<3;j++){c.strokeStyle='#d6b35c35';c.beginPath();c.ellipse(x+73,330,42+j*12,90+j*18,0,0,Math.PI*2);c.stroke();}}
 }
 c.restore();c.fillStyle='#101e2990';c.fillRect(0,540,width,180);
}
// Decorative, non-interactive anatomy studies. They have no simulation entities.
export function drawRemains(c,id,x=1180,y=600){
 c.save();c.translate(x,y);c.scale(1.12,1.12);const bone='#d3c9a8',edge='#7d806f';
 ellipse(c,0,2,132,9,'#0b171d55');
 const skull=(x,y,r=17,horns=false)=>{ellipse(c,x,y,r,r*.78,bone);ellipse(c,x-r*.38,y,4,5,'#263439');ellipse(c,x+r*.38,y,4,5,'#263439');line(c,[[x-r*.6,y+r*.45],[x+r*.6,y+r*.45]],edge,2);if(horns)for(const s of [-1,1])line(c,[[x+s*r*.75,y-4],[x+s*(r+10),y-18],[x+s*(r+5),y-27]],bone,6);};
 const ribcage=(x,y,w=36)=>{line(c,[[x-w,y],[x+w,y-7]],bone,6);for(let i=-2;i<=2;i++){c.beginPath();c.ellipse(x+i*10,y-12,w*.23,18,Math.PI*.15,0,Math.PI*1.8);c.strokeStyle=bone;c.lineWidth=4;c.stroke();}};
 if(id==='air'){ribcage(0,-20,40);skull(-48,-29,21);line(c,[[20,-32],[65,-16],[93,-23]],bone,6);line(c,[[-10,-38],[30,-54],[73,-42]],bone,6);}
 else if(id==='styrodog'){ribcage(0,-25,45);for(let i=0;i<3;i++)skull(-66+i*24,-50-(i%2)*12,13,true);line(c,[[38,-31],[75,-47],[100,-37],[111,-54]],bone,5);for(const s of[-1,1])line(c,[[s*20,-13],[s*60,-20],[s*87,-5]],bone,7);}
 else if(id==='sonic'){ribcage(8,-24,44);skull(-57,-29,21,true);for(const s of[-1,1])line(c,[[-63+s*8,-18],[-85+s*10,-6],[-105+s*5,-14]],bone,6);for(const x of[15,42]){ellipse(c,x,-49,15,10,edge);ellipse(c,x,-49,9,6,bone);}line(c,[[38,-15],[68,-8],[107,-12]],bone,7);}
 else if(id==='lightning'){ribcage(0,-18,36);for(let i=0;i<6;i++){const x=-85+i*30;polygon(c,[[x,-5],[x+5,-36-i%2*15],[x+23,-18]],i%2?bone:edge);}skull(-54,-33,14);}
 else{ribcage(0,-22,id==='wastelander'?48:34);skull(-59,-28,id==='wastelander'?23:16);line(c,[[25,-14],[56,-9],[98,-15]],bone,7);line(c,[[18,-34],[66,-38],[95,-25]],bone,6);
  if(id==='styro'){for(let i=0;i<5;i++)ellipse(c,24+i*13,-36-i%2*13,13,9,bone);polygon(c,[[-43,-8],[-5,-34],[28,-6]],'#abb3a3');}
  if(id==='venomis'){line(c,[[-75,-30],[-42,-30]],'#657f6e',5);for(const x of[-67,-51]){c.strokeStyle=bone;c.lineWidth=2;c.strokeRect(x-5,-35,10,9);}polygon(c,[[-32,-12],[3,-40],[28,-4]],'#b9beb0');}
  if(id==='atomdust')for(let i=0;i<4;i++){c.fillStyle=i%2?bone:edge;c.fillRect(-25+i*22,-55+i%2*8,17,38);line(c,[[-22+i*22,-52+i%2*8],[-12+i*22,-52+i%2*8]],'#c9ad68',3);}
  if(id==='wastelander')for(const x of[-3,33]){c.strokeStyle=edge;c.lineWidth=10;c.beginPath();c.ellipse(x,-51,18,13,0,0,Math.PI*2);c.stroke();}
 }
 c.restore();
}
export function drawLegendaryWorld(c,g){
 const scene=g.arenaScene,b=scene.boss,id=scene.legendary,a=b.attack;c.save();
 if(scene.cleared){drawRemains(c,id);c.restore();return;}
 if(b.state==='active'&&a?.shape==='lightning')for(const z of a.zones){const x=z.x+z.w/2;line(c,[[x,70],[x-35,220],[x+18,280],[x-20,410],[x,600]],'#fff6a6',9);if(a.chain)for(const s of[-1,1])line(c,[[x,410],[x+s*35,470],[x+s*55,460],[x+s*70,580]],'#ead04e',4);}
 if(b.state==='active'&&a?.shape==='barrier'){c.strokeStyle='#e4e4cf';c.lineWidth=8;c.strokeRect(b.x-b.w*.7,b.y-b.h-10,b.w*1.4,b.h+10);}
 for(const z of g.legendaryHazards){const color=LEGENDARY[id].colors[1];if(z.kind==='lightning'){line(c,[[z.x,595],[z.x+z.w*.25,580],[z.x+z.w*.4,594],[z.x+z.w*.7,579],[z.x+z.w,592]],'#f9df68',5);}else if(z.kind==='trap'){c.fillStyle=color+'80';c.fillRect(z.x,585,z.w,15);for(let x=z.x+8;x<z.x+z.w;x+=20)polygon(c,[[x,600],[x+8,565],[x+15,600]],color);}else{for(let i=0;i<5;i++){c.strokeStyle=color+'b0';c.lineWidth=5;c.beginPath();c.ellipse(z.x+z.w/2+Math.sin(z.age*5+i)*10,580-i*30,z.w*.4-i*5,11,0,0,Math.PI*2);c.stroke();}}}
 c.restore();
}
export function drawMergeWorld(c,g){
 c.save();for(const a of g.mergeEffects||[]){if(a.ended)continue;const col=LEGENDARY[a.id].colors[1];
  if(a.id==='lightning'){line(c,[[a.x-85,a.y],[a.x+85,a.y]],'#ffe48c',4);if(a.fired)line(c,[[a.x,a.y-330],[a.x-25,a.y-160],[a.x+14,a.y-190],[a.x,a.y]],'#fff6a6',7);}
  if(a.id==='atomdust'){c.strokeStyle='#ffe6a5';c.lineWidth=5;c.beginPath();c.arc(a.x,a.y-42,Math.max(8,a.radius*Math.min(1,a.age/a.delay)),0,Math.PI*2);c.stroke();}
  if(a.id==='air')for(let i=0;i<6;i++){c.strokeStyle='#85d3a5';c.lineWidth=4;c.beginPath();c.ellipse(a.x+Math.sin(a.age*7+i)*8,a.y-i*24,24+i*9,9,0,0,Math.PI*2);c.stroke();}
  if(a.id==='venomis')for(const e of g.enemies.filter(e=>a.targets.includes(e.id)&&e.state!=='dead'))for(const s of[-1,1])line(c,[[e.x+s*30,e.y],[e.x-s*25,e.y-20],[e.x+s*28,e.y-38],[e.x-s*20,e.y-58]],'#8ad29e',5);
  if(a.id==='styro'){c.strokeStyle='#eeefdb';c.lineWidth=4;c.beginPath();c.ellipse(g.hero.x,g.hero.y-48,43,60,0,0,Math.PI*2);c.stroke();}
  if(a.id==='styrodog')for(let i=0;i<3;i++)line(c,[[g.hero.x-a.face*(40+i*8),g.hero.y-20-i*16],[g.hero.x-a.face*(85+i*8),g.hero.y-20-i*16]],col,3);
 }
 for(const p of g.mergeShots||[]){c.strokeStyle=LEGENDARY[p.id].colors[1];c.lineWidth=p.id==='sonic'?4:7;c.beginPath();c.ellipse(p.x,p.y,p.id==='sonic'?12:16,p.id==='sonic'?30:19,0,-1.5,1.5);c.stroke();}c.restore();
}
