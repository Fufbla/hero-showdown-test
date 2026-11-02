// New Style C renderer. No old painted body textures or old pose geometry are
// used here. Its public drawHero signature preserves all existing consumers.
import {paintStyleCPart,paintStyleCBone,paintStyleCTorso,styleCTextureStatus,styleCMaterial} from './style-c-materials.mjs';
import {sanitizeLook,costumePalette} from './appearance.mjs';
import {poseFor} from './style-c-rig.mjs';
import {hairMotion} from './hair-art.mjs';
import {drawStyleCHair} from './style-c-hair.mjs';
import {INK,TAU,tone,poly,curve,line,oval,emblem} from './style-c-paint.mjs';
const faces=new Map(),motion=new WeakMap();
export const STYLE_C_FACE_CACHE_LIMIT=48;
let canvasFactory=null;
export function configureStyleC({makeCanvas}={}){canvasFactory=makeCanvas||null;faces.clear();}
export const styleCCacheStatus=()=>({faceEntries:faces.size,faceLimit:STYLE_C_FACE_CACHE_LIMIT});
const makeCanvas=(w,h)=>canvasFactory?canvasFactory(w,h):typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):typeof document!=='undefined'?Object.assign(document.createElement('canvas'),{width:w,height:h}):null;

function faceDrawing(c,l,back,blink,expression){
 const skin=l.skin,shadow=tone(skin,.73),lit=tone(skin,1.19),female=l.presentation==='female',
  round=l.face==='round',wide=(round?1.07:l.face==='angular'?1.01:1)*l.jaw;
 c.save();c.scale(wide,1);
 oval(c,-16.5,2,3.5,5.5,skin,INK,1);oval(c,16.5,2,3.5,5.5,skin,INK,1);
 line(c,[[-17,0],[-18,2],[-16.3,3]],shadow,.8);line(c,[[17,0],[18,2],[16.3,3]],shadow,.8);
 const jaw=female?9:13;
 curve(c,[[-16,-10],[-16,-24,15,-24,17,-9],[18,4,15,11],[jaw,17,3,19],[-4,20,-jaw,15],[-18,8,-16,-10]],skin,INK,1.35);
 curve(c,[[5,-20],[16,-19,17,-8],[19,8,10,15],[3,19,-4,17],[5,15,8,7],[12,-3,5,-20]],shadow,null);
 curve(c,[[-13,-10],[-11,-19,1,-18],[-5,-12,-7,-2],[-10,3,-13,-10]],lit,null);
 if(back){c.restore();return;}
 // Authored skin shading on the forehead; nose/mouth remain fully editable.
 c.save();c.beginPath();c.rect(-23,-26,46,29);c.clip();paintStyleCPart(c,female?'faceFemale':'faceMale',skin,-19.5,-23,39,43);c.restore();
 const age=l.age==='teen'?1.05:l.age==='older'?.92:1;
 const eyeH=(l.eyeShape==='round'?6.6:l.eyeShape==='wide'?4.6:5.8)*age*(female?1:.87),
  eyeW=l.eyeShape==='wide'?6.1:5.4,angry=expression==='attack'||expression==='hurt';
 const cap=v=>v[0].toUpperCase()+v.slice(1),eyeMaterial=styleCMaterial('eyes'+cap(l.eyeShape),l.eyes);
 for(const side of[-1,1]){
  const x=side*7.1,y=.2;
  if(blink||expression==='defeat'){c.beginPath();c.moveTo(x-eyeW,y-1);c.quadraticCurveTo(x,y+2,x+eyeW,y-1);c.strokeStyle=INK;c.lineWidth=1.4;c.stroke();}
  else if(!eyeMaterial){
   curve(c,[[x-eyeW,y-2],[x-2,y-eyeH,x+eyeW,y-3],[x+eyeW+.2,y+eyeH,x,y+eyeH],[x-eyeW-1,y+eyeH*.8,x-eyeW,y-2]],'#fff5de',INK,1);
   c.save();c.clip();oval(c,x+1.3,y+1.1,3.3,eyeH*.94,tone(l.eyes,.65));oval(c,x+1.1,y+1.5,2.8,eyeH*.8,l.eyes);
   oval(c,x+1.4,y+.5,1.65,eyeH*.72,INK);oval(c,x+.15,y-1.2,1.05,1.5,'#ffffff');oval(c,x+2.4,y+2.8,.55,.7,'#fff3be');c.restore();
   c.beginPath();c.moveTo(x-eyeW,y-2);c.quadraticCurveTo(x-1,y-eyeH-1,x+eyeW,y-3);c.strokeStyle=INK;c.lineWidth=1.5;c.stroke();
   if(female)line(c,[[x+side*(eyeW-1),y-2.7],[x+side*(eyeW+1.7),y-4.2]],INK,1.1);
  }
  const browY=-9.2,bend=l.brows==='soft'?-1.2:l.brows==='straight'?0:-.5;
  const inner=angry?2.2:expression==='hurt'?3:0;
  curve(c,[[x-5,browY+(side===1?inner:0)],[x,browY-2+bend,x+5,browY+(side===-1?inner:0)],[x+4.8,browY+1.7+(side===-1?inner:0)],[x,browY+bend,x-5,browY+1+(side===1?inner:0)]],l.hairColor,INK,.4);
  if(l.brows==='bold')line(c,[[x-4.5,browY+.6],[x+4.5,browY+.6]],l.hairColor,1.2);
 }
 if(eyeMaterial&&!blink&&expression!=='defeat')c.drawImage(eyeMaterial,-15,-5.3,30,eyeH*2.15);
 const nw=l.nose==='broad'?3.2:l.nose==='small'?1.5:2.2;
 curve(c,[[.5,1],[.7,4,nw,6],[.4,7,-nw*.8,6]],tone(skin,.84),null);
 line(c,[[nw,6],[.5,6.7],[-nw*.65,6]],tone(skin,.47),.65);
 line(c,[[-1,3],[-.7,4]],lit,.8);
 paintStyleCPart(c,'nose'+cap(l.nose),skin,-nw-1,1,nw*2+2,6.2);
 const my=11.8;
 if(expression==='hurt')oval(c,1,my,2.2,2.4,tone(skin,.4),INK,.5);
 else if(l.mouth==='smile'){curve(c,[[-3.8,my],[0,my+1,4.3,my-1],[1.9,my+3,-1.7,my+2]],'#fbe5c6',tone(skin,.4),.65);}
 else{line(c,[[-3.3,my],[.7,my+.4],[3.8,my-.2]],tone(skin,.38),l.mouth==='full'?1.4:.8);if(l.mouth==='full')line(c,[[-1.8,my+1.5],[1.9,my+1.4]],tone(skin,1.1),1);}
 if(expression!=='hurt')paintStyleCPart(c,'mouth'+cap(l.mouth),skin,-4.3,my-1,8.6,l.mouth==='full'?3.4:2.7);
 line(c,[[-6.7,7.8],[-4.9,8.1]],lit,1.1);line(c,[[-1,15],[3,14.8]],lit,.7);
 if(l.age==='older'){for(const s of[-1,1]){line(c,[[s*12,6.2],[s*14,7.4]],shadow,.7);line(c,[[s*6,10],[s*6.8,13]],shadow,.65);}line(c,[[-3,-14],[3,-14]],shadow,.7);}
 if(l.facialHair==='beard'){curve(c,[[-14,9],[-8,13,0,14],[8,13,14,9],[13,17,3,21],[-6,22,-14,9]],l.hairColor,INK,.65);line(c,[[-3,12],[3,12]],skin,.8);for(let i=-8;i<10;i+=3)line(c,[[i,16],[i+1,18]],tone(l.hairColor,1.5),.6);}
 if(l.facialHair==='stubble')for(let i=-11;i<12;i+=2.4)line(c,[[i,15-Math.abs(i)*.25],[i+.5,16.2-Math.abs(i)*.25]],l.hairColor,.7);
 c.restore();
}
function cachedFace(c,l,back,blink,expression){
 const key=[l.presentation,l.age,l.skin,l.eyes,l.face,l.eyeShape,l.brows,l.nose,l.mouth,l.facialHair,l.jaw,l.hairColor,back,blink,expression,styleCTextureStatus().ready].join('|');
 let face=faces.get(key);
 if(!face){face=makeCanvas(168,168);if(!face){faceDrawing(c,l,back,blink,expression);return;}const ctx=face.getContext('2d');ctx.scale(3,3);ctx.translate(28,28);faceDrawing(ctx,l,back,blink,expression);
  if(faces.size>=STYLE_C_FACE_CACHE_LIMIT)faces.delete(faces.keys().next().value);faces.set(key,face);}
 c.drawImage(face,-28,-28,56,56);
}
function segment(c,a,b,r1,r2,color,accent=null){
 c.save();c.translate(...a);c.rotate(Math.atan2(b[1]-a[1],b[0]-a[0])-Math.PI/2);
 const len=Math.hypot(b[0]-a[0],b[1]-a[1]);
 curve(c,[[-r1,0],[-r1*1.15,len*.32,-r2,len],[0,len+r2*.4,r2,len],[r1*1.15,len*.32,r1,0],[0,-r1*.5,-r1,0]],color,INK,1);
 curve(c,[[r1*.1,0],[r1,0],[r1*1.1,len*.35,r2,len],[r2*.1,len],[r1*.4,len*.4,r1*.1,0]],tone(color,.6),null);
 line(c,[[-r1*.6,2],[-r2*.6,len-2]],tone(color,1.4),Math.max(.8,r1*.28));
 if(accent){line(c,[[-r1*.85,2],[0,3],[r1*.85,2]],accent,1.25);line(c,[[-r2*.8,len-2],[r2*.8,len-2]],accent,1);}
 c.restore();
}
function hand(c,arm,color,skin,punch){
 const [a,e,w]=arm;c.save();c.translate(...w);c.rotate(Math.atan2(w[1]-e[1],w[0]-e[0])-Math.PI/2);
 if(paintStyleCPart(c,'fist',color,-5,-4,10,13)){c.restore();return;}
 curve(c,[[-3.9,-2],[-4.5,1,-3.5,5.5],[1,8,4.2,4.8],[5.7,2.2,3.7,-2]],color,INK,1);
 curve(c,[[.6,0],[4.1,-.2,4.7,2],[4,5,2.5,4.3],[1.2,3.6,.6,0]],skin,INK,.7);
 for(let i=-2;i<3;i+=1.5)line(c,[[i,3],[i+.1,5]],tone(color,.45),.65);
 line(c,[[-3,-.4],[2,-.4]],tone(color,1.55),1.2);c.restore();
}
function cape(c,p,color,back){
 const chain=p.cape,left=[],right=[];
 chain.forEach(([x,y],i)=>{const t=i/8,w=(back?p.d.shoulder*.7:6)+t*10;left.push([x-w,Math.min(p.grounded?-1:Infinity,y)]);right.push([x+w,Math.min(p.grounded?-1:Infinity,y+Math.sin(t*Math.PI)*2)]);});
 curve(c,[left[0],...left.slice(1),[chain[8][0],chain[8][1]-3],...right.reverse()],color,INK,1.4);
 for(const f of[-.55,0,.6]){const strip=chain.map(([x,y],i)=>[x+f*((back?p.d.shoulder*.7:6)+i*1.2),y]);line(c,strip,f<0?tone(color,1.5):tone(color,.58),f===0?3:2);}
 line(c,left,tone(color,1.65),.75);
}
function helmet(c,l,p,item,back,steel){
 if(!item)return;const col=steel?'#9aafbf':item.color,accent=steel?'#edf5f8':item.accent||'#d9b774',id=item.mergeId;
 c.save();c.translate(...p.head);c.rotate(p.headTilt);c.scale(p.d.head,p.d.head);
 if(!id){curve(c,[[-19,4],[-21,-14,-12,-23],[0,-28,12,-23],[21,-14,19,4],[14,9],[13,-8],[5,-13,0,-9],[-5,-13,-13,-8],[-14,9]],col,INK,1.2);line(c,[[-16,-12],[-8,-19],[0,-20],[8,-19],[16,-12]],accent,1.9);poly(c,[[-3,-22],[3,-22],[2,-12],[0,-9],[-2,-12]],accent,INK,.6);}
 else for(const s of[-1,1]){
  if(id==='lightning'||id==='atomdust')poly(c,[[s*16,-7],[s*18,-22],[s*25,-14],[s*21,-12],[s*22,-5]],accent,INK,.9);
  else if(id==='sonic'||id==='styrodog'){curve(c,[[s*16,-5],[s*24,-11,s*21,-24],[s*17,-19,s*16,-5]],col,INK,1.1);line(c,[[s*19,-9],[s*20,-17]],accent,1.2);}
  else{oval(c,s*17,-6,4,5,col,INK,1);oval(c,s*17,-6,2.3,3,accent);line(c,[[s*17,-10],[s*14,-17]],accent,1.7);}
 }
 c.restore();
}
function mergeChest(c,p,item){
 const id=item?.mergeId;if(!id)return;const [x,y]=p.shoulder,accent=item.accent,col=item.color;
 for(const s of[-1,1]){const xx=x+s*p.d.shoulder;
  if(id==='lightning'||id==='atomdust')poly(c,[[xx-s*5,y],[xx+s*5,y-8],[xx+s*9,y+8],[xx,y+5]],accent,INK,.85);
  else if(id==='sonic'){oval(c,xx,y+2,6,5,col,INK,.8);oval(c,xx,y+2,3.6,3,accent,INK,.6);oval(c,xx,y+2,1.8,1.6,col);}
  else if(id==='styrodog')for(let i=0;i<3;i++)poly(c,[[xx-5+i*4,y],[xx-4+i*4,y-5],[xx-1+i*4,y+3]],accent,INK,.7);
  else if(id==='venomis')curve(c,[[xx-5,y],[xx+s*10,y-5],[xx+s*3,y+9],[xx-5,y]],accent,INK,.8);
  else if(id==='wastelander'){oval(c,xx,y+3,6,5,'#34433f',INK,.8);oval(c,xx,y+3,2.5,2.5,accent);}
  else line(c,[[xx,y-3],[xx+s*6,y+4],[xx,y+10]],accent,3);
 }
}
function poseMotion(owner,h,time,p){
 if(!owner)return p;let s=motion.get(owner);if(!s){s={time,face:h.face,turnTime:-10,vx:h.vx||0};motion.set(owner,s);}
 if(s.face!==h.face){s.face=h.face;s.turnTime=time;}
 // Ease the silhouette through a turn without changing facing or contact.
 p.turn=Math.max(0,1-(time-s.turnTime)/.12);s.time=time;return p;
}
export function drawHero(c,x,y,raw,h,time,scale=1,options={}){
 const l=sanitizeLook(raw),pieces=options.outfit?.pieces||{},palette=costumePalette(l,options.outfit),view=options.view||'game',back=view==='back';
 for(const [part,field]of[['suit','suit'],['cape','capeColor'],['emblem','emblemColor']])if(pieces[part])palette[field]=pieces[part].color;
 if(pieces.chest){palette.suit=pieces.chest.color;palette.trim=pieces.chest.accent;palette.emblemColor=pieces.chest.accent;l.emblem=pieces.chest.emblem||l.emblem;}
 if(h.steel){l.skin='#b2c2d2';Object.assign(palette,{suit:'#7c95aa',trim:'#e3eef5',emblemColor:'#f1e5ad'});}
 const p=poseMotion(options.artState||options.cloth,h,time,poseFor(l,h,time,view)),d=p.d,[hx,hy]=p.hip,[sx,sy]=p.shoulder;
 if(options.cloth)p.cape=options.cloth.advance(p,h,time,options.dt||0);
 const hm=hairMotion(options.artState||options.cloth,h,time,l.hair,options.dt),suit=palette.suit,trim=palette.trim,
  armor=h.steel?trim:pieces.gloves?.color||trim,boot=h.steel?trim:pieces.boots?.color||trim;
 c.save();c.translate(x,y);c.scale(scale*(view==='game'?(h.attack?.face||h.face||1):1),scale);c.rotate(p.rotation);c.scale(1-(p.turn||0)*.12,1);
 c.lineJoin='round';c.lineCap='round';c.globalAlpha*=p.opacity;if(h.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha*=.78;
 if(l.cape&&!back)cape(c,p,palette.capeColor,false);
 const drawLeg=i=>{const pts=p.legs[i],[hip,knee,foot]=pts,r=d.thick*.52;
  if(!paintStyleCBone(c,'thigh',suit,hip,knee,r*2.5))segment(c,hip,knee,r,r*.83,tone(suit,.8));oval(c,...knee,r*.88,r*.88,tone(suit,.56),INK,.8);
  segment(c,knee,foot,r*.9,r*.63,suit);
  const cuff=[knee[0]+(foot[0]-knee[0])*.17,knee[1]+(foot[1]-knee[1])*.17];
  if(!paintStyleCBone(c,'shin',boot,knee,foot,r*2.15))segment(c,cuff,foot,r*1.06,r*.8,boot,pieces.boots?.accent||tone(boot,1.5));
  if(!styleCTextureStatus().ready)oval(c,...knee,r*1.05,r*.84,boot,INK,.85);line(c,[[knee[0]-r*.5,knee[1]-.7],[knee[0]+r*.4,knee[1]-1.5]],tone(boot,1.7),.8);
  c.save();c.translate(...foot);c.rotate(p.footAngles[i]);if(p.front&&i===1)c.scale(-1,1);
  if(!paintStyleCPart(c,'boot',boot,-r*1.1,-7,r*3.3,11))curve(c,[[-r,-3],[r*.8,-4],[r*1.3,-1,r*2,1],[r*2.1,4],[r*.3,4.7,-r*1.1,4],[-r*1.2,1,-r,-3]],boot,INK,1);
  poly(c,[[-r*1.1,2.4],[r*2.1,2.4],[r*2,4.2],[-r*1.1,4.2]],tone(boot,.5),INK,.5);
  line(c,[[r*.3,-1],[r*1.4,.4]],tone(boot,1.65),1);c.restore();};
 const drawArm=i=>{const pts=p.arms[i],[root,elbow,wrist]=pts,r=d.thick*.49;
  if(!paintStyleCBone(c,'upperArm',pieces.chest?suit:l.skin,root,elbow,r*2.4))segment(c,root,elbow,r*1.07,r*.85,pieces.chest?suit:l.skin);oval(c,...elbow,r*.83,r*.83,pieces.chest?tone(suit,.7):tone(l.skin,.8),INK,.7);
  segment(c,elbow,wrist,r*.86,r*.62,suit);
  const cuff=[elbow[0]+(wrist[0]-elbow[0])*.2,elbow[1]+(wrist[1]-elbow[1])*.2];
  if(!paintStyleCBone(c,'forearm',armor,cuff,wrist,r*2.5))segment(c,cuff,wrist,r*1.2,r*.9,armor,tone(armor,1.5));hand(c,pts,armor,h.steel?l.skin:tone(l.skin,.86),p.extension);
  if(!paintStyleCPart(c,'pauldron',suit,root[0]-r*1.7,root[1]-r*1.3,r*3.4,r*2.4))oval(c,...root,r*1.5,r*.95,suit,INK,1);line(c,[[root[0]-r,root[1]-1],[root[0],root[1]-r*.7],[root[0]+r,root[1]-1]],trim,1.6);
 };
 drawLeg(1);drawArm(p.alternate?0:1);
 // Hips and connected torso. Separate color panels carry the cel shading.
 curve(c,[[hx-d.hip,hy-5],[hx,hy-10,hx+d.hip,hy-5],[hx+d.hip+1,hy+4],[hx,hy+6,hx-d.hip-1,hy+4]],tone(suit,.65),INK,1);
 drawLeg(0);
 const sh=d.shoulder,w=d.hip*d.waist;
 curve(c,[[sx-sh,sy+3],[sx-sh,sy-1,sx-5,sy-2],[sx+5,sy-2],[sx+sh,sy-1,sx+sh,sy+3],
  [sx+sh*.8*l.chest,sy+12,hx+w,hy-7],[hx+d.hip,hy],[hx,hy+3,hx-d.hip,hy],[hx-w,hy-7],[sx-sh*.8*l.chest,sy+12,sx-sh,sy+3]],suit,INK,1.35);
 poly(c,[[sx+sh*.7,sy+3],[sx+sh-1,sy+4],[hx+w,hy-7],[hx+d.hip-1,hy],[hx+1,hy-3],[sx+3,sy+11]],tone(suit,.55),null);
 curve(c,[[sx-sh+3,sy+4],[sx-7,sy-1,sx-2,sy+4],[sx-3,sy+10],[sx-sh*.65,sy+13,sx-sh+3,sy+4]],tone(suit,1.38),null);
 line(c,[[sx-sh+2,sy+5],[sx-5,sy+9],[sx,sy+7],[sx+5,sy+9],[sx+sh-2,sy+5]],trim,1.8);
 for(const s of[-1,1]){line(c,[[sx+s*sh*.68,sy+13],[hx+s*w*.78,hy-5]],trim,1.2);line(c,[[sx+s*sh*.6,sy+14],[hx+s*w*.67,hy-6]],tone(suit,1.5),.65);}
 if(!back)paintStyleCTorso(c,p,suit,l.presentation);
 if(l.muscle>.2)for(let i=0;i<2;i++)line(c,[[hx-4,hy-8-i*4],[hx,hy-7-i*4],[hx+4,hy-8-i*4]],tone(suit,.53),l.muscle+.35);
 line(c,[[hx-d.hip,hy-1],[hx+d.hip,hy-1]],INK,5);line(c,[[hx-d.hip+.4,hy-1],[hx+d.hip-.4,hy-1]],pieces.belt?.color||trim,3.5);
 paintStyleCPart(c,'belt',pieces.belt?.color||trim,hx-d.hip-1,hy-4.5,d.hip*2+2,7);
 for(const s of[-1,1])line(c,[[hx+s*d.hip*.65,hy-2.3],[hx+s*d.hip*.65,hy+.4]],tone(trim,.6),1.1);
 if(!back){poly(c,[[hx-3.5,hy-4],[hx+3.5,hy-4],[hx+3.5,hy+2],[hx-3.5,hy+2]],trim,INK,.8);poly(c,[[hx-1.6,hy-2.5],[hx+1.6,hy-2.5],[hx+1.6,hy+.5],[hx-1.6,hy+.5]],suit,INK,.4);emblem(c,sx+p.twist,sy+d.torso*.4,l.emblem,palette.emblemColor,.85);}
 drawArm(p.alternate?1:0);mergeChest(c,p,pieces.chest);
 curve(c,[[sx-4,sy+1],[sx-3.7,sy-9],[sx+4,sy-9],[sx+4.5,sy+1],[sx,sy+4,sx-4,sy+1]],l.skin,INK,.7);
 line(c,[[sx-5,sy+1],[sx,sy+4],[sx+5,sy+1]],trim,1.4);
 if(l.cape&&back)cape(c,p,palette.capeColor,true);
 if(l.cape)for(const s of[-1,1]){oval(c,sx+s*sh*.67,sy+1,2.4,2.4,trim,INK,.7);oval(c,sx+s*sh*.67-.5,sy+.3,.6,.7,'#fff2b7');}
 c.save();c.translate(...p.head);c.rotate(p.headTilt);c.scale(d.head,d.head);
 const hl={...l,trim,helmet:!!pieces.helmet&&!pieces.helmet.mergeId};
 drawStyleCHair(c,hl,hm,time,'rear',back);
 const blink=time%4.7>4.27&&time%4.7<4.4,expression=h.dead?'defeat':h.stun?'hurt':p.extension>.3?'attack':'idle';
 cachedFace(c,l,back,blink,expression);
 if(pieces.mask&&!pieces.helmet&&!back){const col=pieces.mask.color;poly(c,[[-18,-5],[-9,-8],[0,-4],[9,-8],[18,-5],[16,-2],[9,-4],[0,-1],[-9,-4],[-16,-2]],col,INK,.7);}
 drawStyleCHair(c,hl,hm,time,'front',back);c.restore();helmet(c,l,p,pieces.helmet,back,h.steel);
 // Rare and Merge outlines follow the new anchors; no effect changes stats.
 c.save();c.globalAlpha=1;
 for(const part of ['helmet','mask','chest','suit','gloves','boots','belt','cape','emblem']){const item=pieces[part];if(!['rare','legendary'].includes(item?.rarity))continue;
  const glow=item.rarity==='legendary'?'#65ff7a':'#ffffff';c.shadowColor=glow;c.shadowBlur=4;
  if(part==='helmet'||part==='mask')for(const s of[-1,1])line(c,[[p.head[0]+s*18,p.head[1]+2],[p.head[0]+s*19,p.head[1]-13],[p.head[0]+s*11,p.head[1]-23]],glow,1.15);
  if(part==='suit'||part==='chest')line(c,[[sx-sh,sy+2],[sx-5,sy-2],[sx+5,sy-2],[sx+sh,sy+2],[hx+d.hip,hy],[hx-d.hip,hy],[sx-sh,sy+2]],glow,1.15);
  if(part==='boots')for(const leg of p.legs)line(c,[leg[1],leg[2]],glow,1.3);
  if(part==='gloves')for(const arm of p.arms)line(c,[arm[1],arm[2]],glow,1.3);
  if(part==='cape'&&l.cape)line(c,p.cape,glow,1.2);
  if(part==='belt')line(c,[[hx-d.hip,hy-1],[hx+d.hip,hy-1]],glow,1.2);
  if(part==='emblem')oval(c,sx,sy+d.torso*.4,5,6,'#ffffff20',glow,1.2);
 }
 c.restore();
 if(!h.grounded&&h.jumps===2&&h.jumpAge<.3){c.globalAlpha*=1-h.jumpAge/.3;c.beginPath();c.ellipse(0,7,20+h.jumpAge*45,4+h.jumpAge*12,0,0,TAU);c.strokeStyle=palette.emblemColor;c.lineWidth=1.5;c.stroke();}
 c.restore();return p;
}
