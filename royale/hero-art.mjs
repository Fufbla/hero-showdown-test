import { sanitizeLook, costumePalette } from './appearance.mjs';
import { poseFor } from './hero-rig.mjs';
const TAU=Math.PI*2,INK='#18383e';
function oval(c,x,y,rx,ry,color,stroke=null,w=1.5){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function path(c,points,color,stroke=INK,w=1.5){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}}
function line(c,pts,color,w=1){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.lineCap='round';c.lineJoin='round';c.stroke();}
function limb(c,pts,color,w){line(c,pts,INK,w+2.4);line(c,pts,color,w);}
function emblem(c,x,y,kind,color){
  c.save();c.translate(x,y);
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
  line(c,p.cape,'#ffffff25',1.8);
  line(c,left.slice(1),'#00000015',2);
}
function hair(c,l,hx,hy,back=false,time=0){
  const color=l.hairColor;
  if(l.hair==='none')return;
  if(back)oval(c,hx,hy-2,13,14,color,INK);
  if(l.hair==='short')path(c,[[hx-13,hy-3],[hx-14,hy-13],[hx-5,hy-18],[hx+10,hy-15],[hx+13,hy-6],[hx+6,hy-10],[hx-7,hy-8]],color);
  if(l.hair==='curls')for(let i=0;i<7;i++)oval(c,hx-11+i*3.7,hy-9-Math.sin(i/6*Math.PI)*5,5,4.8,color,INK,1);
  if(l.hair==='waves'){
    path(c,[[hx-13,hy+4],[hx-15,hy-9],[hx-9,hy-17],[hx+7,hy-18],[hx+15,hy-9],[hx+14,hy+3],[hx+9,hy-8],[hx-4,hy-9],[hx-9,hy-1]],color);
    for(let i=0;i<3;i++)line(c,[[hx-11+i*5,hy-10],[hx-6+i*5,hy-14],[hx+3+i*3,hy-13]],'#ffffff25',1);
  }
  if(l.hair==='locs')for(let i=0;i<7;i++)limb(c,[[hx-12+i*4,hy-9],[hx-13+i*4,hy-14],[hx-15+i*4.5,hy+(i<2||i>4?15:back?9:-8)]],color,3.3);
  if(l.hair==='ponytail'||l.hair==='braids'){
    path(c,[[hx-13,hy],[hx-14,hy-9],[hx-7,hy-17],[hx+7,hy-17],[hx+14,hy-9],[hx+13,hy],[hx+8,hy-8],[hx-8,hy-8]],color);
    if(l.hair==='ponytail'){const px=back?hx:hx-13;limb(c,[[px,hy-8],[px-5,hy+6],[px-3+Math.sin(time*3)*2,hy+24]],color,7);oval(c,px,hy-7,4,2,l.trim);}
    else for(const side of[-1,1])for(let j=0;j<6;j++)oval(c,hx+side*(12+Math.sin(j)*.7),hy-1+j*4,3.1,3.8,color,INK,1);
  }
  if(l.age==='older'){line(c,[[hx-12,hy-7],[hx-12,hy-1]],'#c0b6aa',2.5);line(c,[[hx+12,hy-7],[hx+12,hy-1]],'#c0b6aa',2.5);}
}
function head(c,l,p,back,time,palette){
  const [hx,hy]=p.head,headScale=p.d.head,rx=l.face==='round'?14:l.face==='angular'?12.8:12;
  c.save();c.translate(hx,hy);c.scale(headScale,headScale);
  // Ponytails sit behind the skull, while the fringe is drawn after the face.
  if(l.hair==='ponytail'&&!back)limb(c,[[-11,-8],[-20,7],[-17+Math.sin(time*3)*2,23]],l.hairColor,7);
  oval(c,-12,1,2.5,4,l.skin,INK,1);oval(c,12,1,2.5,4,l.skin,INK,1);
  if(l.face==='angular')path(c,[[-rx,-8],[-8,-14],[8,-14],[rx,-8],[rx,7],[6,14],[-6,14],[-rx,7]],l.skin);
  else oval(c,0,0,rx,l.presentation==='female'?15:14.5,l.skin,INK,1.7);
  if(!back){
    const eyeY=-1,eyeH=l.eyeShape==='round'?2.7:l.eyeShape==='wide'?1.8:2.1,eyeW=l.eyeShape==='wide'?3.6:3;
    // A slim starter mask leaves eye color and facial features readable.
    path(c,[[-12,-5],[-5,-6],[0,-3],[5,-6],[12,-5],[12,4],[5,5],[0,2],[-5,5],[-12,4]],palette.suit,null);
    for(const side of[-1,1]){const x=side*5.8;oval(c,x,eyeY,eyeW,eyeH,'#fff5db');oval(c,x+.4,eyeY,1.65,eyeH,l.eyes);oval(c,x+.6,eyeY,.7,1.1,'#192b32');oval(c,x+.1,eyeY-.6,.45,.45,'#fff');
      line(c,[[x-3,eyeY-4+(l.brows==='soft'?.8:0)],[x,eyeY-4.6],[x+3,eyeY-4]],l.hairColor,l.brows==='bold'?1.9:1.1);
      if(l.presentation==='female')line(c,[[x+side*2.5,eyeY-1.4],[x+side*4,eyeY-2.5]],INK,1);
    }
    const nose=l.nose==='small'?1.5:l.nose==='broad'?3.4:2.2;
    line(c,[[1,2],[nose,5],[-nose*.5,5.5]],'#673b3680',.9);
    if(l.mouth==='smile'){c.beginPath();c.moveTo(-3,8);c.quadraticCurveTo(0,11,4,8);c.strokeStyle='#673b36';c.lineWidth=1.2;c.stroke();}
    else line(c,[[-3,9],[3,9]],'#673b36',l.mouth==='full'?2.2:1.1);
    if(l.age==='older'){for(const side of[-1,1]){line(c,[[side*8,5],[side*10,6]],'#673b3655',.8);line(c,[[side*7,9],[side*6,11]],'#673b3655',.8);}line(c,[[-4,-9],[4,-9]],'#673b3655',.8);}
    if(l.facialHair==='stubble')for(let i=-8;i<=8;i+=3)line(c,[[i,11-Math.abs(i)*.15],[i+.5,12.2-Math.abs(i)*.15]],l.hairColor,.7);
    if(l.facialHair==='beard'){path(c,[[-11,6],[-7,10],[0,11],[7,10],[11,6],[9,13],[0,17],[-9,13]],l.hairColor,null);line(c,[[-3,9],[3,9]],'#e8b793',1);}
  }
  hair(c,{...l,trim:palette.trim},0,0,back,time);
  c.restore();
}
export function drawHero(c,x,y,raw,h,time,scale=1,options={}){
  const pieces=options.outfit?.pieces||{};
  const look=sanitizeLook(raw),palette=costumePalette(look,options.outfit),view=options.view||'game',back=view==='back';
  for(const [part,field] of [['suit','suit'],['cape','capeColor'],['emblem','emblemColor']])if(pieces[part])palette[field]=pieces[part].color;
  if(pieces.chest){palette.trim=pieces.chest.accent;palette.emblemColor=pieces.chest.accent;look.emblem=pieces.chest.emblem||look.emblem;}
  const gloves=()=>h.steel?palette.trim:pieces.gloves?.color||palette.trim,boots=()=>h.steel?palette.trim:pieces.boots?.color||palette.trim;
  if(h.steel){look.skin='#aebec2';Object.assign(palette,{suit:'#819ba4',trim:'#d6e2df',emblemColor:'#f0e7c3'});}
  const p=poseFor(look,h,time,view),d=p.d,[hx,hy]=p.hip,[sx,sy]=p.shoulder;
  c.save();c.translate(x,y);c.scale(scale*(view==='game'?(h.attack?.face||h.face||1):1),scale);c.rotate(p.rotation);c.globalAlpha*=p.opacity;
  if(h.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha*=.78;
  if(look.cape&&!back)drawCape(c,p,palette.capeColor);
  const leg=i=>{const pts=p.legs[i],foot=pts[2];limb(c,pts,palette.suit,d.thick+1);limb(c,[pts[1],[foot[0],foot[1]-3]],boots(),d.thick*.85);const dir=p.front&&i===1?-1:1;path(c,[[-d.thick*.55,-5],[d.thick*.5,-4],[d.thick*.9+4,2],[d.thick*.9+4,5],[-d.thick*.55,5]].map(([x,y])=>[foot[0]+x*dir,foot[1]+y]),boots(),INK,1.2);};
  const arm=i=>{const pts=p.arms[i],hand=pts[2],elbow=pts[1];limb(c,pts,palette.suit,d.thick*.84);limb(c,[[hand[0]+(elbow[0]-hand[0])*.34,hand[1]+(elbow[1]-hand[1])*.34],hand],gloves(),d.thick*.9);oval(c,...hand,4.5+d.thick*.1,4.8,gloves(),INK,1.4);};
  leg(1);arm(1);
  path(c,[[sx-d.shoulder,sy],[sx+d.shoulder,sy],[hx+d.hip*d.waist,hy-10],[hx+d.hip,hy],[hx-d.hip,hy],[hx-d.hip*d.waist,hy-10]],palette.suit,INK,2);
  path(c,[[sx+1,sy+2],[sx+d.shoulder-3,sy+3],[hx+d.hip*d.waist-2,hy-10],[hx+2,hy-6]],'#ffffff14',null);
  if(look.muscle>.2){line(c,[[sx-d.shoulder*.7,sy+8],[sx-2,sy+10],[sx+d.shoulder*.7,sy+8]],'#102e3544',look.muscle*1.2);line(c,[[hx,hy-7],[hx,sy+16]],'#102e3533',1);}
  line(c,[[hx-d.hip,hy-1],[hx+d.hip,hy-1]],h.steel?palette.trim:pieces.belt?.color||palette.trim,4.5);
  if(!back){oval(c,hx,hy-1,3,3,palette.emblemColor,INK,1);emblem(c,sx,sy+d.torso*.42,look.emblem,palette.emblemColor);}
  leg(0);arm(0);
  limb(c,[[sx,sy+2],[sx,sy-8]],look.skin,8);
  if(look.cape&&back)drawCape(c,p,palette.capeColor);
  // Cape collar, always attached to the shoulders.
  if(look.cape){oval(c,sx-d.shoulder*.65,sy+1,2.7,2.4,palette.emblemColor);oval(c,sx+d.shoulder*.65,sy+1,2.7,2.4,palette.emblemColor);}
  head(c,look,p,back,time,{...palette,suit:h.steel?palette.suit:pieces.mask?.color||palette.suit});
  if(pieces.helmet){const [xx,yy]=p.head,fill=h.steel?palette.suit:pieces.helmet.color;path(c,[[xx-13,yy-9],[xx-9,yy-18],[xx+9,yy-18],[xx+13,yy-9],[xx+12,yy+3],[xx+8,yy+6],[xx+8,yy-6],[xx-8,yy-6],[xx-8,yy+6],[xx-12,yy+3]],fill,INK,1.2);line(c,[[xx-6,yy-14],[xx+6,yy-14]],h.steel?palette.trim:pieces.helmet.accent,2);}
  if(pieces.chest){line(c,[[sx-d.shoulder+2,sy+2],[sx-6,sy+8],[sx,sy+12],[sx+6,sy+8],[sx+d.shoulder-2,sy+2]],palette.trim,2.5);}
  if(!h.grounded&&h.jumps===2&&h.jumpAge<.3){c.globalAlpha*=1-h.jumpAge/.3;c.beginPath();c.ellipse(0,7,20+h.jumpAge*45,4+h.jumpAge*12,0,0,TAU);c.strokeStyle=palette.emblemColor;c.lineWidth=1.5;c.stroke();}
  // Rare outlines are drawn at a fixed brightness, after hit flashes and pose opacity.
  // The same articulated points follow the item through movement, attacks and defeat.
  c.save();c.globalAlpha=1;c.shadowColor='#ffffff';c.shadowBlur=6;c.strokeStyle='#ffffff';c.lineWidth=1.5;
  let glowColor='#ffffff';const glowLine=pts=>line(c,pts,glowColor,1.5);
  for(const [part,item] of Object.entries(pieces))if(['rare','legendary'].includes(item.rarity)){
    glowColor=item.rarity==='legendary'?'#65ff7a':'#ffffff';c.shadowColor=glowColor;
    if(part==='suit')glowLine([[sx-d.shoulder,sy],[sx+d.shoulder,sy],[hx+d.hip,hy],[hx-d.hip,hy],[sx-d.shoulder,sy]]);
    if(part==='gloves')for(const a of p.arms)glowLine([a[1],a[2]]);
    if(part==='boots')for(const l of p.legs)glowLine([l[1],l[2]]);
    if(part==='belt')glowLine([[hx-d.hip,hy-1],[hx+d.hip,hy-1]]);
    if(part==='mask')glowLine([[p.head[0]-11,p.head[1]-4],[p.head[0]+11,p.head[1]-4]]);
    if(part==='emblem')glowLine([[sx-6,sy+9],[sx,sy+3],[sx+6,sy+9],[sx,sy+15],[sx-6,sy+9]]);
    if(part==='cape'&&look.cape)glowLine(p.cape);
  }
  c.restore();c.restore();return p;
}
