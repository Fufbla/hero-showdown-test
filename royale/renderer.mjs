import { SURFACES, WORLD_WIDTH, CAMPS, TYPES } from './world.mjs';
import { clamp, ATTACKS } from './core.mjs';
const PI = Math.PI;
const OUTLINE = '#183c43';
function path(c, points, fill, stroke = OUTLINE, width = 2) {
  c.beginPath(); points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function oval(c,x,y,rx,ry,fill,stroke=null,width=2) {
  c.beginPath(); c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,PI*2); c.fillStyle=fill;c.fill(); if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function line(c,points,color,width=2) {c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function limb(c,points,color,width) {line(c,points,OUTLINE,width+4);line(c,points,color,width);}
function round(c,x,y,w,h,r,color) {c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
const lerp=(a,b,t)=>a+(b-a)*t;
export function poseFor(h,time) {
  const phase=h.cycle*PI*2, run=h.pose==='run', moving=['run','walk'].includes(h.pose), stride=moving?(run?19:13):0;
  const p={ bob:moving?Math.abs(Math.sin(phase))*3:Math.sin(time*2.6)*1.1, lean:run?5:0,
    frontFoot:Math.sin(phase)*stride, backFoot:-Math.sin(phase)*stride,
    frontKnee:-5+Math.sin(phase+.6)*stride*.5, backKnee:-5-Math.sin(phase+.6)*stride*.5,
    frontHandX:15-Math.sin(phase)*stride*.6, frontHandY:-35, backHandX:-14+Math.sin(phase)*stride*.6, backHandY:-34,
    frontFootY:0, backFootY:0, headTilt:0 };
  if(!moving){p.frontKnee=8;p.backKnee=-9;p.frontFoot=8;p.backFoot=-9;p.frontHandX=17;p.backHandX=-13;}
  if(['jump','fall'].includes(h.pose)||!h.grounded){p.frontKnee=15;p.backKnee=-13;p.frontFoot=6;p.backFoot=-15;p.frontFootY=-11;p.backFootY=-5;p.frontHandX=23;p.frontHandY=-62;p.backHandX=-17;p.backHandY=-52;p.bob=0;}
  if(h.pose==='land'){p.bob=5;p.frontKnee=15;p.backKnee=-10;p.frontFoot=15;p.backFoot=-13;}
  if(h.attack){
    const a=h.attack,d=ATTACKS[a.kind],t=a.age, extension=t<d.startup?t/d.startup:t<d.startup+d.active?1:1-(t-d.startup-d.active)/(d.duration-d.startup-d.active);
    const k=clamp(extension,0,1);p.lean=k*6;
    if(a.kind==='punch'){p.frontHandX=lerp(15,57,k);p.frontHandY=lerp(-38,-54,k);p.backHandX=-4;p.backHandY=-51;}
    else {p.frontKnee=lerp(0,36,k);p.frontFoot=lerp(9,67,k);p.frontFootY=lerp(0,-43,k);p.frontHandX=3;p.frontHandY=-57;p.backHandX=-20;p.backHandY=-48;p.lean=-4*k;}
  }
  if(h.pose==='hurt'){p.lean=-10;p.frontHandX=0;p.frontHandY=-44;p.headTilt=-3;}
  return p;
}
// One articulated rig is shared by every body build and appearance.
export function drawHero(c,x,y,look,h,time,scale=1,rig=null) {
  const target=poseFor(h,time),p=rig||target;
  if(rig) for(const key of Object.keys(target)) rig[key]=lerp(rig[key]??target[key],target[key],.30);
  const build={slender:[12,10,6],balanced:[15,12,8],strong:[20,13,10],full:[18,17,11]}[look.build];
  const [shoulder,hip,thick]=build,face=h.attack?.face||h.face||1;
  c.save();c.translate(x,y);c.scale(scale*face*look.height,scale*look.height);
  if(h.dead){c.rotate(-1.1);c.globalAlpha=.5;}
  if(h.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha=.65;
  c.translate(0,p.bob);
  const legLength=look.legs,hipY=-32*legLength,shoulderY=hipY-29;
  if(look.cape){
    const sway=Math.sin(time*5)*4+Math.min(13,Math.abs(h.vx||0)*.04);
    c.beginPath();c.moveTo(-shoulder+3,shoulderY);c.bezierCurveTo(-29-sway,-48,-34-sway,-15,-23-sway,-5);c.quadraticCurveTo(-7,-10,hip+1,-7);c.quadraticCurveTo(-4,-31,5,shoulderY);c.closePath();c.fillStyle=look.capeColor;c.fill();c.strokeStyle=OUTLINE;c.lineWidth=2.5;c.stroke();
    line(c,[[-shoulder+3,shoulderY+5],[-20-sway,-24],[-22-sway,-9]],'#ffffff26',2);
  }
  const backLeg=[[-hip*.52,hipY], [p.backKnee,-18*legLength],[p.backFoot,p.backFootY-5]];
  limb(c,backLeg,look.suit,thick+2);limb(c,[[p.backFoot,p.backFootY-10],[p.backFoot+3,p.backFootY-3],[p.backFoot+10,p.backFootY-3]],look.trim,thick+1);
  limb(c,[[-shoulder+3+p.lean,shoulderY+5],[-shoulder-6,-43],[p.backHandX,p.backHandY]],look.suit,thick);
  oval(c,p.backHandX,p.backHandY,5,5,look.trim,OUTLINE);
  path(c,[[-shoulder+p.lean,shoulderY],[shoulder+p.lean,shoulderY],[hip,hipY],[ -hip,hipY]],look.suit,OUTLINE,3);
  path(c,[[2+p.lean,shoulderY+2],[shoulder-3+p.lean,shoulderY+3],[hip-3,hipY-4],[2,hipY-5]],'#ffffff17',null);
  line(c,[[-hip,hipY-1],[hip,hipY-1]],look.trim,6);round(c,-3,hipY-5,7,8,2,'#fff2cc');
  // Original leaf/diamond crest for the customizable hero, not a canonical girl's costume.
  path(c,[[p.lean,shoulderY+7],[p.lean+8,shoulderY+15],[p.lean,shoulderY+23],[p.lean-8,shoulderY+15]],look.trim,null);
  line(c,[[p.lean-3,shoulderY+18],[p.lean+3,shoulderY+11]],look.suit,2);
  limb(c,[[hip*.45,hipY],[p.frontKnee,-19*legLength+(p.frontFootY*.35)],[p.frontFoot,p.frontFootY-5]],look.suit,thick+2);
  limb(c,[[p.frontFoot,p.frontFootY-12],[p.frontFoot+3,p.frontFootY-4],[p.frontFoot+12,p.frontFootY-4]],look.trim,thick+1);
  const hand=[p.frontHandX+p.lean,p.frontHandY], elbow=[(shoulder+hand[0])*.5+2,(shoulderY+hand[1])*.5+10];
  limb(c,[[shoulder-3+p.lean,shoulderY+5],elbow,hand],look.suit,thick);oval(c,...hand,6.3,5.7,look.trim,OUTLINE);
  line(c,[[p.lean,shoulderY],[p.lean,shoulderY-8]],look.skin,10);
  const hx=p.lean+p.headTilt,hy=shoulderY-16;
  oval(c,hx,hy,13.7,15.5,look.skin,OUTLINE,2.4);
  if(look.hair!=='none'){
    if(look.hair==='curls'){for(let i=0;i<7;i++)oval(c,hx-12+i*4,hy-12-Math.sin(i/6*PI)*5,5.5,5.8,'#2c2630',OUTLINE,1);}
    if(look.hair==='short')path(c,[[hx-13,hy-3],[hx-14,hy-15],[hx-5,hy-21],[hx+9,hy-18],[hx+14,hy-8],[hx+4,hy-12],[hx-8,hy-9]],'#282731',OUTLINE,1);
    if(look.hair==='locs'){for(let i=0;i<6;i++)limb(c,[[hx-12+i*4,hy-12],[hx-15+i*4,hy-16],[hx-16+i*3,hy+2+(i<3?12:1)]],'#342b32',4);}
  }
  path(c,[[hx-12,hy-4],[hx+13,hy-5],[hx+14,hy+2],[hx+5,hy+5],[hx,hy+1],[hx-7,hy+5],[hx-13,hy+1]],look.suit,null);
  oval(c,hx-5,hy,2.7,2.2,'#fff6dc');oval(c,hx+8,hy,2.7,2.2,'#fff6dc');
  line(c,[[hx+3,hy+9],[hx+8,hy+8]],'#542f30',1.5);
  c.restore();
}
export class Renderer {
  constructor(canvas) {
    this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.camera=0;this.cameraY=0;this.rig={};this.particles=[];this.width=1280;this.height=720;
    this.resize();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);
  }
  resize(){const r=this.canvas.getBoundingClientRect();this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*this.dpr);this.canvas.height=Math.round(r.height*this.dpr);this.height=r.height<360?480:720;this.scale=r.height/this.height;this.width=r.width/this.scale;}
  event(e){if(['hit','reward','jump','land','level','spawn'].includes(e.type)){const count=e.type==='level'?26:e.type==='reward'?12:e.type==='hit'?9:6;for(let i=0;i<count;i++){const a=i/count*PI*2;this.particles.push({x:e.x??0,y:e.y??0,vx:Math.cos(a)*(35+i*6),vy:-40-Math.abs(Math.sin(a))*100,life:.5+i*.02,max:.5+i*.02,color:e.type==='reward'?'#ffe19b':e.type==='hit'?'#fffbe1':'#c8f3d1',size:e.type==='reward'?4:3});}}}
  sky(t){
    const c=this.c,w=this.width;const sky=c.createLinearGradient(0,0,0,530);sky.addColorStop(0,'#83c0c9');sky.addColorStop(.5,'#c2e3d5');sky.addColorStop(1,'#f6e3ad');c.fillStyle=sky;c.fillRect(0,0,w,720);
    oval(c,w*.76-this.camera*.025,145,66,66,'#fff3c4');oval(c,w*.76-this.camera*.025,145,86,86,'#fff4c326');
    for(let i=-1;i<8;i++){const x=i*280-(this.camera*.12%280);const y=80+(i%3)*44;oval(c,x,y,70,14,'#f5f5ddaa');oval(c,x+40,y-10,49,20,'#f5f5ddaa');oval(c,x+80,y+2,52,12,'#f5f5ddaa');}
    // Distant islands and headlands move more slowly than the playable beach.
    path(c,[[-20,350],[80-this.camera*.08,300],[180-this.camera*.08,330],[360-this.camera*.08,280],[550-this.camera*.08,350],[w,350],[w,430],[-20,430]],'#72a9a9',null);
    const sea=c.createLinearGradient(0,340,0,610);sea.addColorStop(0,'#4b9fa5');sea.addColorStop(.55,'#58b9b2');sea.addColorStop(1,'#a9d6ba');c.fillStyle=sea;c.fillRect(0,350,w,320);
    for(let row=0;row<8;row++){const y=372+row*32;for(let i=-1;i<w/160+1;i++){const x=i*160+Math.sin(t*.3+row)*34-(this.camera*(.15+row*.015)%160);line(c,[[x,y],[x+28,y-2],[x+62,y]],row%2?'#d5e9c566':'#9bd8c666',2+row*.2);}}
    for(let i=0;i<4;i++){const x=(i*280+130+t*9-this.camera*.09)%(w+100),y=180+i%2*38;line(c,[[x-6,y],[x,y+3],[x+6,y]],'#426b72',1.8);}
    // Far-off lighthouse anchors the destination before you reach it.
    const lx=5750-this.camera*.86;
    if(lx<w+150&&lx>-150)this.lighthouse(lx,500,.55);
  }
  palm(x,y,scale,t){const c=this.c;c.save();c.translate(x,y);c.scale(scale,scale);line(c,[[0,0],[-11,-64],[-9,-125],[4,-180]],'#a77e50',16);line(c,[[-4,-5],[-15,-65],[-12,-121],[1,-178]],'#d3ae6e',5);for(let i=0;i<6;i++){const a=(i/5)*PI+PI;const ex=Math.cos(a)*96,ey=-175+Math.sin(a)*48+Math.sin(t+i)*3;c.beginPath();c.moveTo(4,-179);c.quadraticCurveTo(ex*.4,-235,ex,ey);c.quadraticCurveTo(ex*.5,-187,4,-179);c.fillStyle=i%2?'#328b73':'#247c66';c.fill();}oval(c,2,-174,9,7,'#8b643d');c.restore();}
  lighthouse(x,y,s=1){const c=this.c;c.save();c.translate(x,y);c.scale(s,s);path(c,[[-30,0],[-20,-160],[20,-160],[30,0]],'#faf0cd','#4b7473',3);path(c,[[-25,-70],[-23,-100],[23,-100],[25,-70]],'#d57c61',null);round(c,-25,-182,50,28,3,'#315a66');round(c,-18,-178,36,20,1,'#ffd993');path(c,[[-35,-184],[0,-208],[35,-184]],'#b56950','#3b5b60',2);round(c,-8,-30,16,30,4,'#325e69');line(c,[[-35,-150],[35,-150]],'#406a70',5);c.restore();}
  terrain(surface){const c=this.c,s=surface;
    if(s.kind==='wood'){
      round(c,s.x,s.y,s.w,s.h,5,'#a57a4d');round(c,s.x,s.y,s.w,7,3,'#f6d49a');for(let x=s.x+14;x<s.x+s.w;x+=32)line(c,[[x,s.y+9],[x,s.y+s.h-3]],'#76523b',2);
      for(const x of [s.x+15,s.x+s.w-15]){line(c,[[x,s.y],[x,s.y+78]],'#987450',9);line(c,[[x-5,s.y+45],[x+5,s.y+49]],'#dfc794',4);}return;
    }
    const col=s.kind==='rock'?'#6f9993':'#c9aa6e';round(c,s.x,s.y,s.w,s.h,12,col);round(c,s.x,s.y,s.w,Math.min(22,s.h),8,s.kind==='rock'?'#a2b9a0':'#f2dba0');
    if(s.oneWay){path(c,[[s.x+10,s.y+18],[s.x+s.w-8,s.y+18],[s.x+s.w-26,s.y+49],[s.x+45,s.y+57]],'#a48e64',null);line(c,[[s.x+2,s.y+1],[s.x+s.w-2,s.y+1]],'#4b9c70',9);for(let x=s.x+10;x<s.x+s.w-5;x+=23)path(c,[[x-5,s.y],[x-4,s.y-9],[x,s.y-2],[x+5,s.y-12],[x+6,s.y]],'#3e946b',null);}
    else for(let x=s.x+22;x<s.x+s.w;x+=65){line(c,[[x,s.y+43],[x+16,s.y+41]],'#b8935d',2);oval(c,x+18,s.y+24,2,1.2,'#fff1bf');}
  }
  enemy(e,t,alpha){if(e.state==='dead')return;const c=this.c,x=lerp(e.prevX,e.x,alpha),y=e.y;const bob=Math.sin(t*7+e.id)*1.5;const info=TYPES[e.type];
    oval(c,x,y+1,e.w*.56,5,'#274e4a26');c.save();c.translate(x,y);c.scale(e.face,1);c.globalAlpha=e.protection>0?.65:1;
    const fill=e.flash>0?'#fff3cf':info.color;
    if(e.type==='bottle'){
      const sway=Math.sin(t*7+e.id)*3;line(c,[[-9,-4],[-13+sway,0]],OUTLINE,5);line(c,[[9,-4],[13-sway,0]],OUTLINE,5);
      path(c,[[-14,-9],[-16,-32],[-7,-39],[-7,-46],[6,-46],[6,-39],[14,-32],[14,-9]],fill,OUTLINE,2.5);round(c,-8,-49,16,6,2,'#f4c890');round(c,-13,-28,25,13,2,'#e1ecd0');line(c,[[-10,-34],[-10,-30]],'#ffffff99',2);
      oval(c,-4,-22,2.6,3,OUTLINE);oval(c,7,-22,2.6,3,OUTLINE);line(c,[[1,-15],[5,-15]],OUTLINE,1.5);
    }else if(e.type==='slime'){
      const squish=Math.sin(t*4+e.id)*2;c.beginPath();c.moveTo(-25,-3);c.bezierCurveTo(-30,-18-squish,-19,-37+squish,0,-34);c.bezierCurveTo(22,-40,29,-13,25,-3);c.quadraticCurveTo(0,5,-25,-3);c.fillStyle=fill;c.fill();c.strokeStyle=OUTLINE;c.lineWidth=2.5;c.stroke();
      path(c,[[-12,-28],[-15,-39],[-3,-43],[1,-30]],'#e8d39c',OUTLINE,1.5);oval(c,-12,-20,5,3,'#dcedb1');oval(c,-4,-15,3,3,OUTLINE);oval(c,10,-15,3,3,OUTLINE);line(c,[[1,-8],[6,-7]],OUTLINE,1.5);
    }else{
      for(let i=0;i<3;i++){const xx=-16+i*14,wig=Math.sin(t*10+i)*4;line(c,[[xx,-12],[xx-7,-6],[xx-11+wig,0]],OUTLINE,4);line(c,[[xx,-12],[xx+10,-5],[xx+13-wig,0]],'#835f41',3);}
      oval(c,0,-17,24,16,fill,OUTLINE,2.5);path(c,[[-19,-20],[-7,-33],[4,-33],[18,-20]],'#d89a5d',OUTLINE,1.5);oval(c,13,-16,3,3,OUTLINE);line(c,[[16,-25],[23,-31]],OUTLINE,2);
    }
    c.restore();round(c,x-25,y-e.h-13,50,5,3,'#244b4a');round(c,x-24,y-e.h-12,48*e.hp/e.maxHp,3,2,'#b8e887');
    if(e.state==='warn'){oval(c,x,y-e.h-31,10,11,'#ffe4a0');c.fillStyle='#774b31';c.font='bold 16px sans-serif';c.textAlign='center';c.fillText('!',x,y-e.h-25);line(c,[[x-34,y+5],[x+34,y+5]],'#f8c87b',3);}
    if(e.state==='strike')line(c,[[x+e.face*24,y-28],[x+e.face*42,y-20],[x+e.face*31,y-8]],'#fff2c8',3);
  }
  draw(game,alpha,dt){const c=this.c,h=game.hero,t=game.time;
    const target=clamp(h.x-this.width*.37,0,Math.max(0,WORLD_WIDTH-this.width));
    this.camera=lerp(this.camera,target,1-Math.exp(-dt*7));
    if(Math.abs(this.camera-target)>this.width)this.camera=target;
    const baseY=Math.max(0,600-this.height*.82),targetY=clamp(h.y-this.height*.58,0,baseY);
    this.cameraY=lerp(this.cameraY,targetY,1-Math.exp(-dt*8));
    c.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,0,0);c.save();c.scale(1,this.height/720);this.sky(t);c.restore();
    c.save();c.translate(-this.camera,-this.cameraY);
    for(const x of [40,330,1350,1860,2720,2990,3980,4550,5430,6080]){if(x>this.camera-150&&x<this.camera+this.width+150)this.palm(x,600,.7+(x%3)*.11,t);}
    if(5750>this.camera-100&&5750<this.camera+this.width+100)this.lighthouse(5750,600,.9);
    for(const s of SURFACES)if(s.x+s.w>this.camera-40&&s.x<this.camera+this.width+40)this.terrain(s);
    for(const [i,camp] of CAMPS.entries()){
      if(camp.x<this.camera-100||camp.x>this.camera+this.width+100)continue;
      line(c,[[camp.x-30,camp.y],[camp.x-30,camp.y-120]],'#547a62',5);
      path(c,[[camp.x-28,camp.y-118],[camp.x+22,camp.y-112],[camp.x+12,camp.y-92],[camp.x-28,camp.y-97]],i===game.checkpoint?'#e7cd83':'#56a77c',OUTLINE,1.5);
      path(c,[[camp.x+20,camp.y],[camp.x+44,camp.y-45],[camp.x+75,camp.y]],'#e7d2a4',OUTLINE,2);path(c,[[camp.x+34,camp.y],[camp.x+44,camp.y-31],[camp.x+53,camp.y]],'#5b8673',null);
      if(game.nearCamp()===i){round(c,camp.x-85,camp.y-157,170,24,12,'#153b40e6');c.fillStyle='#fff1cd';c.font='11px system-ui';c.textAlign='center';c.fillText('E / REST · heal & set checkpoint',camp.x,camp.y-141);}
    }
    for(const e of game.enemies)if(e.x>this.camera-90&&e.x<this.camera+this.width+90)this.enemy(e,t,alpha);
    const pos=globalThis.HealthiaMotionCore?.renderPosition({x:h.prevX,y:h.prevY,face:h.prevFace},{x:h.x,y:h.y,face:h.face},alpha,h.dead)||{x:lerp(h.prevX,h.x,alpha),y:lerp(h.prevY,h.y,alpha)};
    oval(c,pos.x,pos.y+2,24,5,'#284f4b2f');drawHero(c,pos.x,pos.y,game.look,h,t,1,this.rig);
    if(h.attack){const a=h.attack,d=ATTACKS[a.kind];if(a.age>=d.startup&&a.age<d.startup+d.active){c.save();c.translate(h.x,h.y-43);c.scale(a.face,1);c.strokeStyle='#fff7d8c9';c.lineWidth=3;c.beginPath();c.arc(24,-8,a.kind==='kick'?48:35,-.7,.7);c.stroke();c.restore();}}
    for(const p of this.particles){if(!game.paused){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=210*dt;}c.globalAlpha=Math.max(0,p.life/p.max);oval(c,p.x,p.y,p.size,p.size,p.color);}c.globalAlpha=1;this.particles=this.particles.filter(p=>p.life>0);
    // Small foreground details give continuous ground a readable silhouette.
    for(let x=65;x<WORLD_WIDTH;x+=190){if(x<this.camera-60||x>this.camera+this.width+60)continue;const surface=SURFACES.find(s=>!s.oneWay&&s.kind==='sand'&&x>s.x+20&&x<s.x+s.w-20);if(!surface)continue;const y=surface.y+8;for(let i=0;i<5;i++)line(c,[[x+i*3,y],[x-8+i*6,y-14-(i%2)*10]],'#448d67',2);if(x%3===0)oval(c,x+25,y+4,7,3,'#fff1cb');}
    if(5950>this.camera-100&&5950<this.camera+this.width+100){line(c,[[5950,600],[5950,530]],'#8e6d45',6);round(c,5890,509,120,37,5,'#315d55');c.fillStyle='#f4e8b8';c.font='bold 12px system-ui';c.textAlign='center';c.fillText('THE JOURNEY BEGINS',5950,532);}
    c.restore();
    const grad=c.createLinearGradient(0,this.height-100,0,this.height);grad.addColorStop(0,'#143e4200');grad.addColorStop(1,'#143e4255');c.fillStyle=grad;c.fillRect(0,this.height-100,this.width,100);
  }
}
