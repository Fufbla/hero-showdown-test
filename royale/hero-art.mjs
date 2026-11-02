import {hairDefinition} from './hair-catalog.mjs';
import {drawDetailedHair,hairMotion} from './hair-art.mjs';
import { drawMergeCostume } from './merge-costume-art.mjs';
import { sanitizeLook, costumePalette } from './appearance.mjs';
import { poseFor } from './hero-rig.mjs';
import {paintHeroPart,paintHeroBone,paintHeroTorso,heroMaterial} from './hero-materials.mjs';
const TAU=Math.PI*2,INK='#18383e';
const tone=(hex,n)=>'#'+[1,3,5].map(i=>Math.round(Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)*n))).toString(16).padStart(2,'0')).join('');
function finish(c,color,x,y,w,h){const g=c.createLinearGradient(x-w/2,y,x+w/2,y+h*.2);g.addColorStop(0,tone(color,.48));g.addColorStop(.24,tone(color,1.26));g.addColorStop(.53,color);g.addColorStop(1,tone(color,.52));return g;}
const motionStates=new WeakMap();
function turnMotion(owner,h,time){if(!owner)return 0;let state=motionStates.get(owner);if(!state){state={face:h.face,time};motionStates.set(owner,state);}if(state.face!==h.face){state.face=h.face;state.time=time;}return Math.max(0,1-(time-state.time)/.13);}
function oval(c,x,y,rx,ry,color,stroke=null,w=1.5){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function path(c,points,color,stroke=INK,w=1.5){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function line(c,pts,color,w=1){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke();}
function limb(c,pts,color,w){
  // Overlapping tapered segments share the exact IK joint; the cel shadow defines volume.
  for(let i=1;i<pts.length;i++){
    const a=pts[i-1],b=pts[i],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
    const wa=w*(i===1?.57:.49),wb=w*(i===1?.45:.36);
    const mx=a[0]+dx*.38,my=a[1]+dy*.38,volume=w*(i===1?.66:.52);
    c.beginPath();c.moveTo(a[0]+nx*wa,a[1]+ny*wa);c.quadraticCurveTo(mx+nx*volume,my+ny*volume,b[0]+nx*wb,b[1]+ny*wb);c.quadraticCurveTo(b[0]+dx/len*wb*.55,b[1]+dy/len*wb*.55,b[0]-nx*wb,b[1]-ny*wb);c.quadraticCurveTo(mx-nx*volume*.85,my-ny*volume*.85,a[0]-nx*wa,a[1]-ny*wa);c.closePath();c.fillStyle=color;c.fill();c.strokeStyle=INK;c.lineWidth=1.5;c.stroke();
    oval(c,...a,wa*.85,wa*.85,color);oval(c,...b,wb*.88,wb*.88,color);
    line(c,[[a[0]-nx*wa*.6,a[1]-ny*wa*.6],[b[0]-nx*wb*.55,b[1]-ny*wb*.55]],'#071f3445',Math.max(1,w*.2));
    line(c,[[a[0]+nx*wa*.48,a[1]+ny*wa*.48],[b[0]+nx*wb*.42,b[1]+ny*wb*.42]],'#ffffff3b',Math.max(.8,w*.12));
  }
}
function emblem(c,x,y,kind,color){
  c.save();c.translate(x,y);color=finish(c,color,0,-9,18,18);
  if(kind==='bolt')path(c,[[1,-9],[-7,2],[-1,2],[-4,9],[8,-3],[2,-3],[5,-9]],color,null);
  if(kind==='leaf'){c.beginPath();c.moveTo(-5,7);c.quadraticCurveTo(-11,-7,7,-9);c.quadraticCurveTo(12,4,-5,7);c.fillStyle=color;c.fill();line(c,[[-5,7],[5,-5]],'#173d3e',1.3);}
  if(kind==='shield')path(c,[[-8,-8],[8,-8],[7,3],[0,9],[-7,3]],color,null);
  if(kind==='star'){const pts=Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,r=i%2?4:9;return[Math.cos(a)*r,Math.sin(a)*r];});path(c,pts,color,null);}
  if(kind==='sun'){oval(c,0,0,5,5,color);for(let i=0;i<8;i++){const a=i*TAU/8;line(c,[[Math.cos(a)*7,Math.sin(a)*7],[Math.cos(a)*10,Math.sin(a)*10]],color,1.8);}}
  if(kind==='wave'){for(let j=-1;j<=1;j++){c.beginPath();c.moveTo(-9,j*4);c.bezierCurveTo(-2,j*4-7,2,j*4+7,9,j*4);c.strokeStyle=color;c.lineWidth=2;c.stroke();}}
  c.restore();
}
function drawCape(c,p,color){
  const left=[],right=[];
  p.cape.forEach(([x,y],i)=>{const before=p.cape[Math.max(0,i-1)],after=p.cape[Math.min(8,i+1)],a=Math.atan2(after[1]-before[1],after[0]-before[0])-Math.PI/2;
    const width=(p.front?p.d.shoulder*.65:6)+i*.75;
    const floor=p.grounded?-2:Infinity;left.push([x-Math.cos(a)*width,Math.min(floor,y-Math.sin(a)*width)]);right.push([x+Math.cos(a)*width,Math.min(floor,y+Math.sin(a)*width)]);});
  path(c,[...left,...right.reverse()],color,INK,1.8);
  // Painted fold bands follow the cloth chain; the simulation's exact hem and
  // shoulder attachment are preserved for every build and floor contact.
  const material=heroMaterial('cape',color);
  if(material){c.save();c.clip();const xs=[...left,...right].map(v=>v[0]),ys=[...left,...right].map(v=>v[1]);c.drawImage(material,Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));c.restore();}
  line(c,p.cape,'#ffffff35',1.8);
  for(const f of[-.55,.55])line(c,p.cape.map(([x,y],i)=>[x+f*((p.front?p.d.shoulder*.65:6)+i*.75),y]),f<0?'#091e3540':'#ffffff20',2);
  line(c,[left.at(-1),right[0]],'#ffffff45',1);
  line(c,left.slice(1),'#00000015',2);
}
function hair(c,l,hx,hy,back=false,time=0){
  if(l.hair==='none'||l.helmet)return;
  if(drawDetailedHair(c,l,back,time))return;const color=l.hairColor,wind=l.wind||0;
  c.save();c.translate(hx,hy);const ink=tone(color,.35),paint=finish(c,color,0,-17,28,31);
  const strand=(x,y,ex,ey,width,index=0)=>{
    c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x-2,y+6,ex+wind,ey-7,ex+wind*.6,ey);c.strokeStyle=ink;c.lineWidth=width+1.2;c.lineCap='round';c.stroke();c.strokeStyle=paint;c.lineWidth=width;c.stroke();
    c.beginPath();c.moveTo(x-.5,y+1);c.bezierCurveTo(x-2,y+7,ex+wind-1,ey-7,ex+wind*.6-1,ey-1);c.strokeStyle='#ffffff37';c.lineWidth=Math.max(.35,width*.17);c.stroke();
    for(let j=0;j<5;j++){const f=(j+1)/6,xx=x+(ex+wind*.6-x)*f,yy=y+(ey-y)*f;line(c,[[xx-width*.3,yy],[xx+width*.3,yy+.6]],'#03060c55',.45);}
  };
  if(back)oval(c,0,-1,13,15,paint,ink,1.2);
  if(l.hair==='ponytail')strand(-10,-9,-20+Math.sin(time*3)*1.5,23,8);
  path(c,[[-12,0],[-14,-8],[-10,-15],[-3,-18],[7,-17],[13,-10],[12,-3],[8,-9],[1,-10],[-7,-8],[-10,1]],paint,ink,1.1);
  if(l.hair==='short'){
    for(let i=0;i<18;i++){const x=-12+i*1.4,y=-10-Math.sin(i/17*Math.PI)*5;line(c,[[x,y+2],[x+2,y-3],[x+3.5,y-4]],i%3?'#ffffff22':'#00000055',.65);}
  }else if(l.hair==='curls'){
    for(let row=0;row<3;row++)for(let i=0;i<9;i++){const x=-12+i*3.1+(row%2)*.8,y=-9-row*3.1-Math.sin(i/8*Math.PI)*3.6,r=2.3+Math.sin(i*7+row)*.35;const g=c.createRadialGradient(x-.8,y-.8,.2,x,y,r);g.addColorStop(0,tone(color,1.65));g.addColorStop(.55,color);g.addColorStop(1,ink);oval(c,x,y,r,r*.9,g,ink,.65);c.beginPath();c.arc(x-.2,y-.2,r*.55,-2.6,.7);c.strokeStyle='#ffffff35';c.lineWidth=.4;c.stroke();}
  }else if(l.hair==='waves'){
    for(let i=0;i<9;i++){c.beginPath();c.moveTo(-12+i*2.7,-7-Math.sin(i/8*Math.PI)*3);c.bezierCurveTo(-11+i*2,-16,-4+i*2,-17,2+i*1.2,-15);c.strokeStyle=i%2?'#ffffff42':'#06050d99';c.lineWidth=i%2?.7:1.1;c.stroke();}
  }else if(l.hair==='locs'){
    for(let i=0;i<9;i++){const x=-12+i*3;strand(x,-12-Math.sin(i/8*Math.PI)*3,x+(i<4?-2:1),back?14:i<2||i>6?14:-7,3.2,i);}
  }else if(l.hair==='braids'){
    for(const side of[-1,1]){strand(side*11,-6,side*13,21,4);for(let j=0;j<8;j++){const x=side*12+Math.sin(j*Math.PI/2)*1.2+wind*j/12,y=-3+j*3;oval(c,x,y,1.8,2,paint,ink,.45);line(c,[[x-.8,y-.8],[x+.7,y+.5]],'#ffffff40',.45);}}
    for(let i=0;i<7;i++){c.beginPath();c.moveTo(-9+i*3,-8);c.quadraticCurveTo(-9+i*2,-18,0,-17);c.strokeStyle=i%2?'#ffffff50':ink;c.lineWidth=.8;c.stroke();}
  }else if(l.hair==='ponytail'){
    for(let i=0;i<10;i++){c.beginPath();c.moveTo(10-i*2,-7);c.quadraticCurveTo(9-i*2,-18,-10,-10);c.strokeStyle=i%2?'#ffffff32':ink;c.lineWidth=.55;c.stroke();}oval(c,-11,-8,3.1,2,l.trim,ink,.7);
  }
  if(l.age==='older')for(const side of[-1,1])for(let j=0;j<3;j++)line(c,[[side*(11+j*.4),-6],[side*(11+j*.3),-1]],'#c0b6aa',.65);
  c.restore();
}
function head(c,l,p,back,time,palette){
  const [hx,hy]=p.head,headScale=p.d.head,rx=(l.face==='round'?14:l.face==='angular'?12.8:12)*l.jaw;
  c.save();c.translate(hx,hy);c.rotate(p.headTilt||0);c.scale(headScale,headScale);
  drawDetailedHair(c,{...l,trim:palette.trim},back,time,'rear');
  // Ponytails sit behind the skull, while the fringe is drawn after the face.
  if(l.hair==='ponytail'&&!back)limb(c,[[-11,-8],[-20,7],[-17+Math.sin(time*3)*2,23]],l.hairColor,7);
  oval(c,-12,1,2.5,4,l.skin,INK,1);oval(c,12,1,2.5,4,l.skin,INK,1);
  if(l.face==='angular')path(c,[[-rx,-8],[-8,-14],[8,-14],[rx,-8],[rx,7],[6,14],[-6,14],[-rx,7]],l.skin);
  else oval(c,0,0,rx,l.presentation==='female'?15:14.5,l.skin,INK,1.7);
  c.save();c.clip();paintHeroPart(c,'face',l.skin,-rx-1,-16,rx*2+2,32);c.restore();
  // A fixed upper-left key light is shared by faces, costume panels and limbs.
  path(c,[[2,-12],[rx-1,-7],[rx-2,7],[5,13],[1,10],[6,4],[5,-5]],'#452f3333',null);
  line(c,[[-8,5],[-5,6]],'#ffe8c54d',2);
  if(!back){
    const eyeY=-1,ageEyes=l.age==='teen'?1.1:l.age==='older'?.9:1,eyeH=(l.eyeShape==='round'?2.25:l.eyeShape==='wide'?1.25:1.55)*ageEyes*(p.extension>.4?.86:1),eyeW=l.eyeShape==='wide'?3.5:2.85;
    // A slim starter mask leaves eye color and facial features readable.
    path(c,[[-12,-5],[-5,-6],[0,-3],[5,-6],[12,-5],[12,4],[5,5],[0,2],[-5,5],[-12,4]],finish(c,palette.suit,0,-6,24,11),INK,.55);
    const blinking=(time%4.7)>4.27&&(time%4.7)<4.41,cap=v=>v[0].toUpperCase()+v.slice(1),painted=heroMaterial('eyes'+cap(l.eyeShape),'#deded6');
    for(const side of[-1,1]){const x=side*5.8;if(blinking){line(c,[[x-eyeW,eyeY],[x,eyeY+.65],[x+eyeW,eyeY]],INK,1);}else if(!painted){oval(c,x,eyeY,eyeW,eyeH,'#fff5db');oval(c,x+.4,eyeY,1.25,eyeH,l.eyes);oval(c,x+.6,eyeY,.55,.95,'#192b32');oval(c,x+.1,eyeY-.5,.35,.35,'#fff');line(c,[[x-eyeW,eyeY-.7],[x,eyeY-eyeH],[x+eyeW,eyeY-.8]],INK,.55);}
      if(!painted)line(c,[[x-3,eyeY-4+(l.brows==='soft'?.8:0)],[x,eyeY-4.6+(p.extension>.4?1:0)],[x+3,eyeY-4]],l.hairColor,l.brows==='bold'?1.9:1.1);
      if(l.presentation==='female'&&!painted)line(c,[[x+side*2.5,eyeY-1.4],[x+side*4,eyeY-2.5]],INK,1);
    }
    if(painted){
      if(!blinking){c.drawImage(painted,-10.8,eyeY-eyeH*1.45,21.6,eyeH*2.4);for(const side of[-1,1]){c.save();c.globalAlpha*=.5;oval(c,side*5.6,eyeY,.98,eyeH*.68,l.eyes);c.restore();oval(c,side*5.6+.15,eyeY,.35,.6,'#101519');oval(c,side*5.6-.2,eyeY-.4,.2,.2,'#fff8e9');}}
      paintHeroPart(c,'brows'+cap(l.brows),l.hairColor,-11,eyeY-5.5,22,l.brows==='bold'?2.7:2.1);
    }
    const nose=l.nose==='small'?1.5:l.nose==='broad'?3.4:2.2;
    if(!paintHeroPart(c,'nose'+cap(l.nose),l.skin,-nose-.5,.1,nose*2+1,6.4))line(c,[[1,1],[nose,5],[-nose*.5,5.5]],tone(l.skin,.55),.6);
    if(!paintHeroPart(c,'mouth'+cap(l.mouth),l.skin,-4,7.4,8,l.mouth==='full'?3.5:l.mouth==='smile'?2.5:2.9))line(c,[[-3,9],[3,9]],tone(l.skin,.5),l.mouth==='full'?1.8:.85);
    if(l.age==='older'){for(const side of[-1,1]){line(c,[[side*8,5],[side*10,6]],'#673b3655',.8);line(c,[[side*7,9],[side*6,11]],'#673b3655',.8);}line(c,[[-4,-9],[4,-9]],'#673b3655',.8);}
    if(l.facialHair==='stubble')for(let i=-8;i<=8;i+=3)line(c,[[i,11-Math.abs(i)*.15],[i+.5,12.2-Math.abs(i)*.15]],l.hairColor,.7);
    if(l.facialHair==='beard'){path(c,[[-11,6],[-7,10],[0,11],[7,10],[11,6],[9,13],[0,17],[-9,13]],l.hairColor,null);line(c,[[-3,9],[3,9]],'#e8b793',1);}
  }
  hair(c,{...l,trim:palette.trim,wind:p.hairWind||0},0,0,back,time);
  if(l.hair!=='none'&&!hairDefinition(l.hair))line(c,[[-8,-12],[-3,-15],[5,-14]],'#ffffff30',1.3);
  c.restore();
}
export function drawHero(c,x,y,raw,h,time,scale=1,options={}){
  const pieces=options.outfit?.pieces||{};
  const look=sanitizeLook(raw),palette=costumePalette(look,options.outfit),view=options.view||'game',back=view==='back';
  for(const [part,field] of [['suit','suit'],['cape','capeColor'],['emblem','emblemColor']])if(pieces[part])palette[field]=pieces[part].color;
  if(pieces.chest){palette.trim=pieces.chest.accent;palette.emblemColor=pieces.chest.accent;look.emblem=pieces.chest.emblem||look.emblem;}
  const gloves=()=>h.steel?palette.trim:pieces.gloves?.color||palette.trim,boots=()=>h.steel?palette.trim:pieces.boots?.color||palette.trim;
  if(h.steel){look.skin='#aebec2';Object.assign(palette,{suit:'#819ba4',trim:'#d6e2df',emblemColor:'#f0e7c3'});}
  const p=poseFor(look,h,time,view);look.hairMotion=hairMotion(options.artState||options.cloth,h,time,look.hair,options.dt);look.helmet=!!pieces.helmet;p.turn=turnMotion(options.artState||options.cloth,h,time);if(options.cloth)p.cape=options.cloth.advance(p,h,time,options.dt||0);const d=p.d,[hx,hy]=p.hip,[sx,sy]=p.shoulder;
  c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.translate(x,y);c.scale(scale*(view==='game'?(h.attack?.face||h.face||1):1),scale);c.rotate(p.rotation);c.scale(1-p.turn*.1,1);c.globalAlpha*=p.opacity;
  if(h.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha*=.78;
  if(look.cape&&!back)drawCape(c,p,palette.capeColor);
  const leg=i=>{
    const pts=p.legs[i],foot=pts[2],width=d.thick+1;
    if(!paintHeroBone(c,'thigh',palette.suit,pts[0],pts[1],width*1.5))limb(c,[pts[0],pts[1]],palette.suit,width);
    if(!paintHeroBone(c,'calf',palette.suit,pts[1],foot,width*1.2))limb(c,[pts[1],foot],palette.suit,width);
    const bootTop=[pts[1][0]+(foot[0]-pts[1][0])*.32,pts[1][1]+(foot[1]-pts[1][1])*.32];
    paintHeroBone(c,'gauntlet',boots(),bootTop,foot,width*1.05);
    c.save();c.translate(...foot);c.rotate(p.footAngles?.[i]||0);if(p.front&&i===1)c.scale(-1,1);
    if(!paintHeroPart(c,'boot',boots(),-width*.5,-10,width*1.5+5,15))path(c,[[-width*.5,-5],[width*.5,-4],[width+4,2],[width+4,5],[-width*.5,5]],boots(),INK,1.2);
    c.restore();
  };
  const arm=(i,foreOnly=false)=>{
    const pts=p.arms[i],hand=pts[2],elbow=pts[1],width=d.thick*.95;
    if(!foreOnly&&!paintHeroBone(c,'upperArm',palette.suit,pts[0],elbow,width*1.45))limb(c,[pts[0],elbow],palette.suit,width);
    if(!paintHeroBone(c,'forearm',palette.suit,elbow,hand,width*1.2))limb(c,[elbow,hand],palette.suit,width);
    const cuff=[hand[0]+(elbow[0]-hand[0])*.45,hand[1]+(elbow[1]-hand[1])*.45];
    paintHeroBone(c,'gauntlet',gloves(),cuff,hand,width*1.12);
    c.save();c.translate(...hand);c.rotate(Math.atan2(hand[1]-elbow[1],hand[0]-elbow[0])-Math.PI/2);
    const size=4.5+d.thick*.1;if(!paintHeroPart(c,'fist',gloves(),-size,-5,size*2,12))oval(c,0,1,size,size,gloves(),INK,1.2);c.restore();
  };
  leg(1);arm(p.alternate?0:1);
  c.beginPath();c.moveTo(sx-d.shoulder,sy+3);c.quadraticCurveTo(sx-d.shoulder-1,sy-2,sx-5,sy);c.lineTo(sx+5,sy);c.quadraticCurveTo(sx+d.shoulder+1,sy-2,sx+d.shoulder,sy+3);c.quadraticCurveTo(sx+d.shoulder*.8*look.chest,sy+15,hx+d.hip*d.waist,hy-10);c.lineTo(hx+d.hip,hy);c.quadraticCurveTo(hx,hy+3,hx-d.hip,hy);c.lineTo(hx-d.hip*d.waist,hy-10);c.quadraticCurveTo(sx-d.shoulder*.8*look.chest,sy+15,sx-d.shoulder,sy+3);c.closePath();c.fillStyle=palette.suit;c.fill();c.save();c.clip();paintHeroTorso(c,p,palette.suit,look.presentation,back);c.restore();c.strokeStyle=INK;c.lineWidth=1.25;c.stroke();
  path(c,[[sx+1,sy+2],[sx+d.shoulder-3,sy+3],[hx+d.hip*d.waist-2,hy-10],[hx+2,hy-6]],'#ffffff14',null);
  path(c,[[sx-d.shoulder+2,sy+2],[sx-3,sy+5],[hx-2,hy-6],[hx-d.hip+2,hy-4]],'#09263e3b',null);
  line(c,[[sx-d.shoulder*.65,sy+3],[sx-2,sy+7],[sx+d.shoulder*.64,sy+3]],'#ffffff48',1.2);
  line(c,[[hx-d.hip*.68,hy-10],[sx-d.shoulder*.65,sy+12]],palette.trim,1);
  line(c,[[hx+d.hip*.68,hy-10],[sx+d.shoulder*.65,sy+12]],palette.trim,1);
  if(h.steel){line(c,[[sx-d.shoulder+3,sy+7],[sx+d.shoulder-3,sy+14]],'#f9ffffbb',3);line(c,[[hx-d.hip+3,hy-13],[hx+d.hip-3,hy-9]],'#e4f9ff99',2);}
  if(look.muscle>.2){line(c,[[sx-d.shoulder*.7,sy+8],[sx-2,sy+10],[sx+d.shoulder*.7,sy+8]],'#102e3544',look.muscle*1.2);line(c,[[hx,hy-7],[hx,sy+16]],'#102e3533',1);}
  line(c,[[hx-d.hip,hy-1],[hx+d.hip,hy-1]],finish(c,h.steel?palette.trim:pieces.belt?.color||palette.trim,hx,hy-3,d.hip*2,5),4.5);
  if(!back){oval(c,hx,hy-1,3,3,palette.emblemColor,INK,1);emblem(c,sx+(p.twist||0)*2,sy+d.torso*.42,look.emblem,palette.emblemColor);}
  leg(0);arm(p.alternate?0:1,true);arm(p.alternate?1:0);
  path(c,[[sx-4.5,sy+2],[sx-3.6,sy-9],[sx+3.6,sy-9],[sx+4.5,sy+2]],finish(c,look.skin,sx,sy-9,9,11),INK,.7);line(c,[[sx-2.8,sy-7],[sx-1,sy+1]],'#fff0d450',.65);
  if(look.cape&&back)drawCape(c,p,palette.capeColor);
  // Cape collar, always attached to the shoulders.
  if(look.cape){oval(c,sx-d.shoulder*.65,sy+1,2.7,2.4,palette.emblemColor);oval(c,sx+d.shoulder*.65,sy+1,2.7,2.4,palette.emblemColor);}
  head(c,look,p,back,time,{...palette,suit:h.steel?palette.suit:pieces.mask?.color||palette.suit});
  if(pieces.helmet&&!pieces.helmet.mergeId){const [xx,yy]=p.head,fill=h.steel?palette.suit:pieces.helmet.color;path(c,[[xx-13,yy-9],[xx-9,yy-18],[xx+9,yy-18],[xx+13,yy-9],[xx+12,yy+3],[xx+8,yy+6],[xx+8,yy-6],[xx-8,yy-6],[xx-8,yy+6],[xx-12,yy+3]],fill,INK,1.2);line(c,[[xx-6,yy-14],[xx+6,yy-14]],h.steel?palette.trim:pieces.helmet.accent,2);}
  if(pieces.chest){line(c,[[sx-d.shoulder+2,sy+2],[sx-6,sy+8],[sx,sy+12],[sx+6,sy+8],[sx+d.shoulder-2,sy+2]],palette.trim,2.5);}
  drawMergeCostume(c,p,pieces,back,h.steel);
  if(!h.grounded&&h.jumps===2&&h.jumpAge<.3){c.globalAlpha*=1-h.jumpAge/.3;c.beginPath();c.ellipse(0,7,20+h.jumpAge*45,4+h.jumpAge*12,0,0,TAU);c.strokeStyle=palette.emblemColor;c.lineWidth=1.5;c.stroke();}
  // Rare outlines are drawn at a fixed brightness, after hit flashes and pose opacity.
  // The same articulated points follow the item through movement, attacks and defeat.
  c.save();c.globalAlpha=1;c.shadowColor='#ffffff';c.shadowBlur=6;c.strokeStyle='#ffffff';c.lineWidth=1.5;
  let glowColor='#ffffff';const glowLine=pts=>line(c,pts,glowColor,1.5);
  for(const [part,item] of Object.entries(pieces))if(['rare','legendary'].includes(item.rarity)){
    glowColor=item.rarity==='legendary'?'#65ff7a':'#ffffff';c.shadowColor=glowColor;
    if(part==='helmet')glowLine([[p.head[0]-14,p.head[1]-7],[p.head[0]-16,p.head[1]-16],[p.head[0]-9,p.head[1]-19]]),glowLine([[p.head[0]+14,p.head[1]-7],[p.head[0]+16,p.head[1]-16],[p.head[0]+9,p.head[1]-19]]);
    if(part==='suit'||part==='chest')glowLine([[sx-d.shoulder,sy],[sx+d.shoulder,sy],[hx+d.hip,hy],[hx-d.hip,hy],[sx-d.shoulder,sy]]);
    if(part==='gloves')for(const a of p.arms)glowLine([a[1],a[2]]);
    if(part==='boots')for(const l of p.legs)glowLine([l[1],l[2]]);
    if(part==='belt')glowLine([[hx-d.hip,hy-1],[hx+d.hip,hy-1]]);
    if(part==='mask')glowLine([[p.head[0]-11,p.head[1]-4],[p.head[0]+11,p.head[1]-4]]);
    if(part==='emblem')glowLine([[sx-6,sy+9],[sx,sy+3],[sx+6,sy+9],[sx,sy+15],[sx-6,sy+9]]);
    if(part==='cape'&&look.cape)glowLine(p.cape);
  }
  c.restore();c.restore();return p;
}
