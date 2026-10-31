import { GATES } from './world.mjs';
const INK='#243741',TAU=Math.PI*2;
function oval(c,x,y,rx,ry,color,stroke=INK){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function line(c,p,color,w=2){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke();}
function poly(c,p,color,stroke=INK){c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke();}}
function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
function legs(c,t,n=3,span=20,color='#344650'){for(let i=0;i<n;i++){const x=-span+i*span*2/(n-1),s=Math.sin(t*9+i)*4;line(c,[[x,-15],[x+4,-7],[x+s+8,0]],color,4);}}
function eye(c,x,y,night){if(night){c.shadowColor='#ffef35';c.shadowBlur=9;}oval(c,x,y,3,3.5,night?'#fff23a':'#f3edc7');c.shadowBlur=0;if(!night)oval(c,x+1,y,1.1,2,INK,null);}
// Original comic-ink silhouettes. Each new species has its own geometry and motion.
export function drawNewMonster(c,e,info,t,night){
  const f=e.flash>0?'#fff3cf':info.color,s=Math.sin(t*5+e.id),a=e.state==='strike'?1:0;
  if(e.type==='sprout'){
    line(c,[[0,-4],[s*3,-25],[0,-44]],'#587847',9);poly(c,[[0,-25],[-23,-38],[-19,-20],[0,-15]],f);poly(c,[[0,-31],[21,-45],[20,-23],[0,-20]],f);
    poly(c,[[-16,-39],[-9,-57],[0,-48],[10,-57],[18,-40],[0,-32]],f);legs(c,t,2,8);eye(c,-5,-42,night);eye(c,7,-42,night);
  }else if(e.type==='mushroom'){
    oval(c,0,-17,12,20,'#d9cfac');legs(c,t,2,9);c.beginPath();c.moveTo(-29,-29);c.bezierCurveTo(-27,-64,24,-64,29,-29);c.closePath();c.fillStyle=f;c.fill();c.strokeStyle=INK;c.stroke();
    for(const [x,y] of [[-13,-39],[3,-48],[17,-37]])oval(c,x,y,5,3,'#e8dabc');eye(c,-5,-20,night);eye(c,6,-20,night);
  }else if(['bark','scrap','venomCrawler'].includes(e.type)){
    legs(c,t,e.type==='venomCrawler'?5:3,23,e.type==='scrap'?'#b5b6b2':INK);
    for(let i=0;i<4;i++){const x=-21+i*13,y=-18+Math.sin(t*7+i)*2;oval(c,x,y,11,13,f);if(e.type==='bark')line(c,[[x-4,y-9],[x-2,y+5]],'#694f3a',2);if(e.type==='scrap')poly(c,[[x-10,y],[x-7,y-14],[x+8,y-12],[x+10,y]],'#819aa3');}
    if(e.type==='venomCrawler')for(let i=0;i<4;i++)poly(c,[[-25+i*13,-28],[-20+i*13,-43],[-15+i*13,-27]],'#69828d');eye(c,21,-20,night);
  }else if(e.type==='sludge'){
    c.beginPath();c.moveTo(-33,0);c.bezierCurveTo(-37,-31,-23,-58,0,-53+s*3);c.bezierCurveTo(30,-58,36,-25,33,0);c.closePath();c.fillStyle=f;c.fill();c.strokeStyle=INK;c.stroke();
    for(let i=0;i<3;i++)oval(c,-18+i*16,-15-i%2*17,6,5,'#b6c47e');eye(c,-8,-35,night);eye(c,7,-35,night);line(c,[[-9,-22],[8,-22]],INK,3);
  }else if(e.type==='drone'){
    line(c,[[-27,-34],[28,-34]],'#a3adad',3);oval(c,-20,-35,15,3,'#e0c6a5');oval(c,20,-35,15,3,'#e0c6a5');poly(c,[[-27,-25],[-15,-40],[15,-40],[27,-25],[17,-6],[-17,-6]],f);
    rect(c,-18,-24,36,10,'#576f7d');eye(c,-8,-19,night);eye(c,8,-19,night);line(c,[[0,-7],[a?30:10,2]],INK,6);
  }else if(e.type==='scorpion'){
    legs(c,t,4,24);oval(c,0,-17,25,15,f);line(c,[[-22,-20],[-37,-39],[-30,-63],[-12,-64],[-8,-49]],f,8);poly(c,[[-14,-55],[-3,-47],[-11,-41]],'#d7ca8f');
    for(const y of[-12,-29]){line(c,[[18,y],[33+a*8,y-4]],f,7);poly(c,[[30+a*8,y-7],[41+a*8,y-11],[37+a*8,y],[29+a*8,y+2]],f);}eye(c,15,-22,night);
  }else if(e.type==='beetle'){
    legs(c,t,3,22);oval(c,0,-19,25,18,f);line(c,[[0,-35],[0,-3]],INK,2);for(const x of[-13,13])oval(c,x,-20,6,9,'#809953');eye(c,19,-18,night);poly(c,[[20,-9],[31+a*8,-12],[29,-5]],'#e2dc9a');
  }else if(e.type==='thornBeast'){
    legs(c,t,3,26);oval(c,0,-30,33,23,f);for(let i=0;i<5;i++)poly(c,[[-29+i*13,-45],[-24+i*13,-66-i%2*8],[-16+i*13,-44]],'#798858');oval(c,27,-31,14,14,f);eye(c,30,-34,night);poly(c,[[28,-21],[33,-10],[37,-23]],'#f5deb5');
  }else if(['stalker','apocalypse'].includes(e.type)){
    const bulk=e.type==='apocalypse'?1.2:1;c.save();c.scale(bulk,1);line(c,[[-10,-37],[-17,-17],[-21+s*4,0]],f,8);line(c,[[8,-37],[17,-19],[17-s*4,0]],f,8);
    poly(c,[[-15,-59],[14,-59],[18,-37],[-12,-34]],f);line(c,[[-12,-54],[-22,-32],[-31-a*10,-20]],f,7);line(c,[[12,-54],[27,-36],[35+a*10,-20]],f,7);oval(c,2,-64,13,13,f);poly(c,[[-10,-72],[-18,-88],[0,-76],[12,-86],[15,-69]],'#625270');eye(c,-2,-66,night);eye(c,8,-66,night);if(e.type==='apocalypse'){for(const x of[-19,-9,1])poly(c,[[x,-57],[x-9,-76],[x+6,-61]],'#d5b28b');oval(c,-18,-43,7,9,'#8b8b5b');}c.restore();
  }else if(e.type==='spitter'){
    legs(c,t,3,22);oval(c,0,-23,28,25,f);for(let i=0;i<4;i++)oval(c,-17+i*10,-35,5,6,'#879b62');line(c,[[18,-28],[34+a*8,-31]],f,10);oval(c,36+a*8,-31,6,8,'#596346');eye(c,9,-39,night);
  }else if(e.type==='wisp'){
    poly(c,[[-17,-10],[-14,-34],[0,-51],[15,-34],[18,-10],[8,-15],[0,-3],[-8,-16]],f);line(c,[[-6,-36],[-4,-46],[1,-54]],'#c1c2e1',2);eye(c,-5,-28,night);eye(c,6,-28,night);
  }else if(e.type==='phantom'){
    poly(c,[[-24,-4],[-17,-47],[0,-73],[18,-49],[24,-4],[9,-15],[0,-2],[-11,-18]],f);poly(c,[[-11,-53],[0,-65],[11,-53],[10,-32],[-10,-32]],'#4c5e7d');line(c,[[-15,-39],[-32,-22-s*5]],f,5);line(c,[[15,-39],[34,-26+s*5]],f,5);eye(c,-5,-46,night);eye(c,6,-46,night);
  }else if(['sentinel','guardian'].includes(e.type)){
    const gold=e.type==='guardian'?'#cebca3':'#b4bed9';legs(c,t,2,16);line(c,[[-15,-5],[-15,-31]],f,13);line(c,[[15,-5],[15,-31]],f,13);
    poly(c,[[-27,-69],[27,-69],[20,-30],[-20,-30]],f);poly(c,[[-13,-62],[13,-62],[0,-39]],gold);for(const x of[-31,31]){oval(c,x,-61,11,12,gold);line(c,[[x,-50],[x+a*e.face*10,-26]],f,11);}poly(c,[[-15,-80],[0,-92],[15,-80],[12,-64],[-12,-64]],f);eye(c,-6,-76,night);eye(c,6,-76,night);if(e.type==='guardian'){poly(c,[[-42,-53],[-19,-48],[-19,-26],[-32,-14],[-46,-29]],'#c9b79a');poly(c,[[-34,-46],[-25,-40],[-32,-25],[-39,-39]],'#826771');poly(c,[[12,-83],[31,-96],[24,-69]],gold);}else{line(c,[[-11,-82],[-17,-101]],'#b6c6dc',3);oval(c,0,-50,6,7,'#a3d3da');}
  }else if(e.type==='titan'){
    line(c,[[-22,-6],[-21,-32]],f,21);line(c,[[22,-6],[21,-32]],f,21);poly(c,[[-40,-70],[32,-78],[39,-31],[-33,-29]],f);for(const x of[-43,42]){line(c,[[x,-65],[x+s*2,-31]],f,18);oval(c,x,-25,14,13,'#8d8072');}oval(c,0,-83,22,17,f);poly(c,[[-17,-95],[-9,-111],[0,-97],[15,-110],[22,-92]],'#7e776b');eye(c,-8,-84,night);eye(c,7,-84,night);line(c,[[-10,-74],[9,-74]],INK,3);
  }
}
export function regionSky(c,region,w,camera,t,night){
  const colors=night?['#18253d','#536479']:region.sky,gradient=c.createLinearGradient(0,0,0,720);gradient.addColorStop(0,colors[0]);gradient.addColorStop(1,colors[1]);c.fillStyle=gradient;c.fillRect(0,0,w,720);
  if(night){oval(c,w*.8,100,32,32,'#f5ebc1',null);for(let i=0;i<24;i++)oval(c,(i*137-camera*.03)%(w+70),40+(i*43)%235,1.5,1.5,'#e2e4cd',null);}else if(region.theme!=='cave')oval(c,w*.8,115,47,47,'#f5e5bdaa',null);
  for(let i=-1;i<w/170+2;i++){
    const x=i*170-camera*.18%170,h=150+(i+8)%3*65,y=540;
    if(['forest','mutant'].includes(region.theme)){
      line(c,[[x,y],[x+18,y-h]],night?'#30484b':'#647e70',18);for(let j=0;j<3;j++)oval(c,x-25+j*38,y-h+15-Math.sin(j)*35,55,49,night?'#30464c':region.accent,null);
    }else if(region.theme==='factory'||region.theme==='final'){
      rect(c,x,y-h,105,h,night?'#2d3c4d':'#7b8085');rect(c,x+20,y-h-60,25,65,night?'#344453':'#8b8984');for(let j=0;j<4;j++)rect(c,x+16+j%2*44,y-h+25+Math.floor(j/2)*48,18,24,night?'#a99c76':'#b3b5a0');
    }else if(region.theme==='cave'){
      poly(c,[[x-30,0],[x+85,0],[x+35,h-25]],night?'#29354b':'#49526b',null);poly(c,[[x-50,580],[x+42,330],[x+100,580]],night?'#3b4b61':'#718083',null);
    }else{
      poly(c,[[x,470],[x+22,220],[x+67,340],[x+55,495]],night?'#48547c':'#6c729a',null);line(c,[[x+22,240],[x+25,440]],'#bbc1dc60',2);
    }
  }
}
export function worldLandmarks(c,g,camera,width){
  const region=g.getRegion();
  for(const [x,text,color] of [[1940,'→ '+region.boards[1],region.edge],[4020,'→ '+region.boards[2],region.edge]]){
    if(x<camera-200||x>camera+width+200)continue;line(c,[[x,600],[x,508]],'#4d5d59',6);rect(c,x-90,500,180,32,'#233d45');c.fillStyle=color;c.font='bold 12px system-ui';c.textAlign='center';c.fillText(text,x,521);
  }
  for(const [x,label,locked] of [[GATES.back,g.regionId>1?'E · Previous region':'Shoreward path',false],[GATES.arena,'E · '+region.boss+' Arena',false],[GATES.forward,g.regionId===7?'Final seal':g.world.unlocked.includes(g.regionId+1)?'E · Next region':'Boss seal · Locked',!g.world.unlocked.includes(g.regionId+1)]]){
    if(x<camera-240||x>camera+width+240)continue;
    line(c,[[x-33,600],[x-33,490],[x,470],[x+33,490],[x+33,600]],locked?'#7c8589':'#59987f',10);line(c,[[x-29,497],[x+29,497]],'#e2ce95',3);
    if(locked){poly(c,[[x,514],[x+13,531],[x,548],[x-13,531]],'#e5cf96');line(c,[[x-22,575],[x+22,535]],'#c9b88e',3);}
    const labelX=Math.max(115,Math.min(6045,x));c.fillStyle='#203d46';c.fillRect(labelX-115,429,230,31);c.fillStyle='#f1dfb3';c.font='bold 11px system-ui';c.textAlign='center';c.fillText(label,labelX,449);
  }
}
