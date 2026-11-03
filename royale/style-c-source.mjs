// Preserve the uploaded reference RGB for the default idle and visible body.
// Generated assets supply the alpha guide and previously occluded cape cloth;
// they never replace the approved face, hair, skin or armor artwork.
import {sanitizeLook,costumePalette} from './appearance.mjs';
import {STYLE_C_DEFAULTS} from './style-c-defaults.mjs';
import {animationState,twoBone} from './hero-rig.mjs';
import {attackEnvelope} from './style-c-rig.mjs';
import {drawStyleCHair} from './style-c-hair.mjs';
import {paintStyleCPart} from './style-c-materials.mjs';
import {helmet,mergeChest} from './style-c-equipment.mjs';
import {emblem} from './style-c-paint.mjs';

const UNIT=.35,TAU=Math.PI*2,cache=new Map();let images=null,pending=null,makeCanvas,error=null;
const models={
 male:{box:[435,250,289,345],origin:[632,590],hip:[632,491],shoulder:[631,439],head:[632,383],
  arms:[[[666,442],[679,465],[697,486]],[[585,440],[568,466],[578,492]]],
  legs:[[[647,493],[666,536],[676,578]],[[615,493],[592,538],[581,576]]],
  polygons:{
   cape:[[598,415],[608,430],[594,477],[610,511],[615,540],[581,556],[537,545],[513,535],[481,533],[466,571],[440,551],[438,525],[455,502],[487,475],[552,442]],
   torso:[[605,418],[657,418],[673,441],[661,479],[662,497],[634,513],[600,497],[588,458],[589,435]],
   head:[[515,248],[716,248],[716,353],[692,371],[690,399],[674,419],[649,425],[617,420],[598,409],[580,402],[563,382],[522,365]],
   upper0:[[653,427],[673,435],[688,457],[681,470],[664,461],[650,445]],
   lower0:[[677,453],[695,465],[700,485],[683,492],[667,471]],
   hand0:[[687,473],[707,470],[721,485],[714,500],[698,507],[685,495]],
   upper1:[[583,428],[607,436],[593,457],[577,470],[560,462]],
   lower1:[[560,456],[582,457],[588,486],[576,501],[561,486],[551,472]],
   hand1:[[563,478],[584,478],[598,493],[593,505],[577,512],[563,500]],
   thigh0:[[636,482],[660,484],[680,525],[678,543],[652,545],[636,518]],
   shin0:[[654,526],[678,524],[688,566],[679,580],[657,575],[650,551]],
   boot0:[[654,561],[682,561],[689,573],[705,578],[707,593],[648,593],[649,576]],
   thigh1:[[604,482],[637,486],[617,530],[606,545],[581,545],[585,524]],
   shin1:[[585,527],[615,532],[607,560],[598,580],[575,577],[575,554]],
   boot1:[[575,560],[604,567],[612,581],[608,593],[549,594],[549,578],[560,566]],
  },face:[[607,346],[682,342],[691,367],[688,397],[671,416],[641,423],[614,415],[598,403],[579,398],[574,382],[591,370]],
 },
 female:{box:[778,250,246,345],origin:[940,590],hip:[940,492],shoulder:[937,444],head:[946,389],
  arms:[[[976,448],[984,474],[996,487]],[[888,446],[883,471],[888,493]]],
  legs:[[[954,494],[973,540],[984,576]],[[928,494],[916,538],[906,575]]],
  polygons:{
   cape:[[886,438],[902,452],[910,477],[932,508],[939,537],[910,556],[874,550],[841,573],[820,551],[804,543],[781,539],[785,520],[804,493],[841,468]],
   torso:[[915,431],[963,433],[982,449],[971,474],[965,495],[945,511],[915,498],[906,476],[900,447]],
   head:[[778,248],[1024,248],[1024,425],[1013,444],[992,450],[982,437],[923,442],[900,429],[881,441],[876,478],[850,480],[828,466],[808,449],[791,426]],
   upper0:[[966,433],[981,439],[992,465],[982,479],[971,462]],
   lower0:[[982,463],[997,468],[1009,487],[996,498],[981,486],[972,474]],
   hand0:[[992,480],[1006,480],[1017,492],[1005,508],[989,502],[985,489]],
   upper1:[[885,430],[909,437],[902,459],[889,477],[877,466]],
   lower1:[[878,460],[896,459],[900,482],[892,501],[879,498],[872,477]],
   hand1:[[879,481],[898,481],[905,499],[898,511],[881,510],[874,499]],
   thigh0:[[942,482],[963,483],[984,529],[983,548],[961,547],[944,522]],
   shin0:[[962,530],[983,529],[988,556],[996,577],[976,584],[962,564]],
   boot0:[[975,562],[990,563],[1001,575],[1009,581],[1007,590],[968,591],[966,577]],
   thigh1:[[921,483],[948,487],[932,526],[925,548],[903,547],[904,526]],
   shin1:[[904,528],[928,529],[922,557],[918,577],[896,581],[897,559]],
   boot1:[[899,560],[921,567],[925,583],[918,592],[879,593],[883,578]],
  },face:[[912,336],[967,330],[990,350],[999,381],[994,411],[978,431],[947,439],[921,429],[900,415],[883,405],[879,385],[894,371]],
 }
};
const angle=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0]);
const dist=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const contains=(points,x,y)=>{let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const [a,b]=points[i],[u,v]=points[j];if((b>y)!==(v>y)&&x<(u-a)*(y-b)/(v-b)+a)inside=!inside;}return inside;};
const path=(c,points)=>{c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();};
export const sourceArtStatus=()=>({ready:!!images,error,entries:cache.size,limit:16,source:'uploaded reference RGB',unitScale:UNIT});
export async function prepareSourceArt({canvasFactory,imageLoader}={}){
 if(images)return true;if(pending)return pending;
 makeCanvas=canvasFactory||((w,h)=>typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(w,h):Object.assign(document.createElement('canvas'),{width:w,height:h}));
 const load=imageLoader||(u=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Reference hero artwork could not load.'));im.src=u.href;}));
 pending=(async()=>{try{
  const [reference,mask,capeImage]=await Promise.all(['reference.jpeg','aligned-extraction.png','cape-underlay.png'].map(n=>load(new URL('./assets/hero/style-c-accurate/'+n,import.meta.url))));
  if(reference.width!==1536||reference.height!==864)throw Error('Unexpected reference dimensions');
  const whole=makeCanvas(1536,864),c=whole.getContext('2d'),alpha=makeCanvas(1536,864),ac=alpha.getContext('2d');c.drawImage(reference,0,0);ac.drawImage(mask,0,0,1536,864);
  const pixels=c.getImageData(0,0,1536,864),matte=ac.getImageData(0,0,1536,864).data;
  // The generated matte uses ~253 for opaque interiors. Normalize alpha only;
  // retain every original RGB value, including linework, highlights and eyes.
  for(let i=3;i<pixels.data.length;i+=4){const n=(i-3)/4,x=n%1536,y=Math.floor(n/1536),r=pixels.data[i-3],g=pixels.data[i-2],b=pixels.data[i-1];
   const cyan=b>120&&g>115&&b>r*1.2&&g>r*1.12;
   // Reference background visible between locs and between the male legs is
   // ocean/sky cyan, not part of the hair or armor. Retain the blue cape region.
   const background=cyan&&(y<420||x>775||(x>607&&x<659&&y>525))||y>578&&g>r*1.18&&g>b*1.15;
   pixels.data[i]=background||matte[i]<4?0:matte[i]>=245?255:Math.round(matte[i]*255/245);
  }c.putImageData(pixels,0,0);
  const cape=makeCanvas(1536,864),cc=cape.getContext('2d');cc.drawImage(capeImage,0,0,1536,864);images={whole,reference,cape:cc.getImageData(0,0,1536,864).data};return true;
 }catch(e){error=e.message;return false;}})();return pending;
}
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function tint(c,l,m,palette){
 const base=STYLE_C_DEFAULTS[l.presentation],changed=['skin','eyes','hairColor','suit','trim','capeColor','emblemColor'].filter(k=>(palette[k]||l[k])!==base[k]);
 if(!changed.length)return;
 const im=c.getImageData(0,0,c.canvas.width,c.canvas.height),d=im.data;
 for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
  const i=(y*im.width+x)*4;if(!d[i+3])continue;const [r,g,b]=[d[i],d[i+1],d[i+2]],sx=x+m.box[0],sy=y+m.box[1];
  const hi=Math.max(r,g,b),lo=Math.min(r,g,b),sat=hi?1-lo/hi:0;
  let key;
  if(sy<425&&r>g*1.2&&g>b*1.15&&r>75)key='skin';
  else if(sy<425&&hi<130)key='hairColor';
  else if(sat>.25&&r>125&&g>90&&b<g*.78)key='trim';
  else if(sy>410&&(l.presentation==='male'?b>r*1.15&&b>g*1.04:r>g*1.25&&b>g*1.22))key=sx<m.shoulder[0]-35?'capeColor':'suit';
  if(!key||!changed.includes(key))continue;
  const target=rgb(palette[key]||l[key]),original=rgb(base[key]),lum=(r*.2126+g*.7152+b*.0722),referenceLum=original[0]*.2126+original[1]*.7152+original[2]*.0722;
  const shade=lum/Math.max(1,referenceLum);for(let k=0;k<3;k++)d[i+k]=clamp(target[k]*shade,0,255);
 }
 c.putImageData(im,0,0);
}
function layers(l,palette,pieces){
 const key=JSON.stringify([l.presentation,l.skin,l.eyes,l.hairColor,palette.suit,palette.trim,palette.capeColor,palette.emblemColor,pieces.gloves,pieces.boots,pieces.belt]);if(cache.has(key))return cache.get(key);
 const m=models[l.presentation],base=makeCanvas(m.box[2],m.box[3]),bc=base.getContext('2d');bc.drawImage(images.whole,...m.box,0,0,...m.box.slice(2));tint(bc,l,m,palette);
 // Foreground limbs overlap at their joints. Background cape/torso layers
 // exclude those limbs so they cannot carry a second stationary boot or hand.
 const parts={},order=['head','hand0','hand1','boot0','boot1','lower0','lower1','shin0','shin1','upper0','upper1','thigh0','thigh1','torso','cape'];
 for(const name of [...order,'face']){
  const points=name==='face'?m.face:m.polygons[name];
  const minX=Math.floor(Math.min(...points.map(p=>p[0]))),minY=Math.floor(Math.min(...points.map(p=>p[1]))),maxX=Math.ceil(Math.max(...points.map(p=>p[0]))),maxY=Math.ceil(Math.max(...points.map(p=>p[1])));
  const canvas=makeCanvas(maxX-minX,maxY-minY),c=canvas.getContext('2d');c.save();c.translate(-minX,-minY);path(c,points);c.clip();c.drawImage(base,m.box[0],m.box[1]);c.restore();
  if(name==='cape'||name==='torso'){const earlier=order.slice(0,order.indexOf(name)).map(k=>m.polygons[k]),im=c.getImageData(0,0,canvas.width,canvas.height),d=im.data;
   for(let yy=0;yy<canvas.height;yy++)for(let xx=0;xx<canvas.width;xx++){const at=(yy*canvas.width+xx)*4;if(!d[at+3])continue;const covered=earlier.some(poly=>contains(poly,minX+xx+.5,minY+yy+.5));
    if(name==='cape'&&minX+xx>m.shoulder[0]-80){
     // AI-painted cloth is used only for newly exposed occluded cape areas.
     // Visible source cloth and all face/body/costume pixels stay reference RGB.
     const sx=Math.round(minX+xx-10),sy=Math.round(minY+yy+3),from=(sy*1536+sx)*4,cloth=images.cape;
     if(sx>=0&&sx<1536&&sy>=0&&sy<864&&cloth[from+3]>8){
      for(let k=0;k<3;k++)d[at+k]=cloth[from+k];d[at+3]=Math.min(255,Math.round(cloth[from+3]*255/245));
      if(palette.capeColor!==STYLE_C_DEFAULTS[l.presentation].capeColor){const col=rgb(palette.capeColor),base=rgb(STYLE_C_DEFAULTS[l.presentation].capeColor),lum=d[at]*.2126+d[at+1]*.7152+d[at+2]*.0722,baseLum=base[0]*.2126+base[1]*.7152+base[2]*.0722;for(let k=0;k<3;k++)d[at+k]=clamp(col[k]*lum/baseLum,0,255);}continue;
     }d[at+3]=0;
    }else if(covered)d[at+3]=0;
   }c.putImageData(im,0,0);
  }
  const item=/^(lower|hand)/.test(name)?pieces.gloves:/^(shin|boot)/.test(name)?pieces.boots:null;
  if(item){const im=c.getImageData(0,0,canvas.width,canvas.height),d=im.data,col=rgb(item.color),accent=rgb(item.accent||item.color);
   for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;const r=d[i],g=d[i+1],b=d[i+2],lum=r*.2126+g*.7152+b*.0722;if(lum<28)continue;const target=r>g*1.1&&g>b*1.2?accent:col,shade=lum/155;for(let k=0;k<3;k++)d[i+k]=clamp(target[k]*shade,0,255);}c.putImageData(im,0,0);}
  parts[name]={canvas,x:minX,y:minY};
 }
 parts.whole={canvas:base,x:m.box[0],y:m.box[1]};
 const result={m,parts};cache.set(key,result);while(cache.size>16)cache.delete(cache.keys().next().value);return result;
}
export function sourcePose(raw,h,time){
 const l=sanitizeLook(raw),m=models[l.presentation],state=animationState(h),speed=Math.abs(h.vx||0),moving=clamp(speed/80),run=clamp((speed-185)/130),stride=32+run*22,phase=((h.cycle||0)*52/(stride*UNIT*4))%1;
 const offset=[0,0];let lean=0,rotation=0,opacity=1;
 const feet=m.legs.map((leg,i)=>{const q=(phase+i*.5)%1,target=q<.5?stride*(1-q*4):stride*(-1+(q-.5)*4),lift=q<.5?0:Math.sin((q-.5)*TAU)*(20+run*28);return [leg[2][0]*(1-moving)+(m.hip[0]+target)*moving,leg[2][1]-lift*moving];});
 const hands=m.arms.map((arm,i)=>[arm[2][0]+Math.sin(phase*TAU+i*Math.PI)*(26+run*25)*moving,arm[2][1]-(run*18+Math.max(0,Math.cos(phase*TAU+i*Math.PI))*12)*moving]);
 offset[1]=moving*Math.cos(phase*TAU*2)*3;lean=run*8*moving;
 if(!h.grounded){feet[0][1]-=28;feet[1][1]-=16;hands[0][1]-=50;hands[1][1]-=30;if(h.jumps===2){feet[0][1]-=18;feet[1][1]-=24;}lean=5;}
 if(h.flying){hands[0][0]+=25;hands[0][1]-=50;feet[0][1]-=30;feet[1][1]-=18;}
 const {extension,chamber,wind}=attackEnvelope(h.attack);
 if(h.attack?.kind==='punch'){offset[0]+=extension*90-wind*9;lean+=extension*12-wind*6;hands[0]=[m.origin[0]+54/UNIT,m.origin[1]-54/UNIT];hands[0]=hands[0].map((v,i)=>m.arms[0][2][i]+(v-m.arms[0][2][i])*extension);hands[1][1]-=chamber*40;feet[0][0]+=extension*80;feet[1][0]+=extension*55;}
 if(h.attack?.kind==='kick'){offset[0]+=extension*75;lean-=chamber*18;feet[0]=[feet[0][0]+(m.origin[0]+56/UNIT-feet[0][0])*extension,feet[0][1]+(m.origin[1]-39/UNIT-feet[0][1])*chamber];feet[1][0]+=extension*60;hands[0][1]-=chamber*35;hands[1][1]-=chamber*28;}
 if((h.castAge??10)<.25)hands[0][1]-=Math.sin(h.castAge/.25*Math.PI)*45;
 if(state==='hurt'){lean=-18;hands[0][1]-=30;hands[1][1]-=25;}
 if(h.dead){const f=clamp((h.defeatAge||0)/.65);offset[1]+=55*f;lean-=20*f;rotation=-.22*f;opacity=1-.55*clamp(((h.defeatAge||0)-1)/.5);}
 offset[1]+=Math.sin(clamp((h.landing||0)/.13)*Math.PI*.7)*15;
 const arms=m.arms.map((arm,i)=>{const root=[arm[0][0]+offset[0]+lean,arm[0][1]+offset[1]];return twoBone(root,hands[i],dist(arm[0],arm[1])*l.arms,dist(arm[1],arm[2])*l.arms,1);});
 const legs=m.legs.map((leg,i)=>{const root=[leg[0][0]+offset[0],leg[0][1]+offset[1]];return twoBone(root,feet[i],dist(leg[0],leg[1])*l.legs,dist(leg[1],leg[2])*l.legs,i?1:-1);});
 return {m,arms,legs,offset,lean,rotation,opacity,state,phase,moving,run,extension,head:[m.head[0]+offset[0]+lean,m.head[1]+offset[1]],unitScale:UNIT};
}
export function drawSourceHero(c,x,y,raw,h,time,scale=1,options={}){
 if(!images)return false;
 const l=sanitizeLook(raw),baseLook=STYLE_C_DEFAULTS[l.presentation],palette=costumePalette(l,options.outfit),pieces=options.outfit?.pieces||{};
 if(pieces.chest){palette.suit=pieces.chest.color;palette.trim=pieces.chest.accent;l.emblem=pieces.chest.emblem||l.emblem;}
 for(const [part,key]of [['suit','suit'],['cape','capeColor'],['emblem','emblemColor']])if(pieces[part])palette[key]=pieces[part].color;
 if(h.steel){l.skin='#b2c2d2';palette.suit='#8295a9';palette.trim='#e2edf2';}
 const {m,parts}=layers(l,palette,pieces),p=sourcePose(l,h,time),customHair=l.hair!==baseLook.hair;
 const bodyWidth={slender:.87,balanced:1,strong:1.12,full:1.22}[l.build],height=l.height*(l.age==='teen'?.98:l.age==='older'?.99:1);
 c.save();c.translate(x,y);c.scale(scale*(options.view==='game'||!options.view?(h.attack?.face||h.face||1):1),scale);c.rotate(p.rotation);c.scale(UNIT*bodyWidth,UNIT*height);c.translate(-m.origin[0],-m.origin[1]);c.globalAlpha*=p.opacity;
 if(h.invulnerable>0&&Math.floor(time*14)%2===0)c.globalAlpha*=.78;
 // Public rig anchors stay in hero-local world units for power overlays.
 // The internal articulation uses source-image pixels and must not leak them.
 const local=a=>{const px=(a[0]-m.origin[0])*UNIT*bodyWidth,py=(a[1]-m.origin[1])*UNIT*height;return [px*Math.cos(p.rotation)-py*Math.sin(p.rotation),px*Math.sin(p.rotation)+py*Math.cos(p.rotation)];};
 const result=()=>({...p,arms:p.arms.map(a=>a.map(local)),legs:p.legs.map(a=>a.map(local)),head:local(p.head),hip:local([m.hip[0]+p.offset[0],m.hip[1]+p.offset[1]]),shoulder:local([m.shoulder[0]+p.offset[0]+p.lean,m.shoulder[1]+p.offset[1]])});
 const draw=(name,from,to=from,rotation=0,sx=1,sy=1)=>{const a=parts[name];c.save();c.translate(...to);c.rotate(rotation);c.scale(sx,sy);c.drawImage(a.canvas,a.x-from[0],a.y-from[1]);c.restore();};
 // Exact rest frame: one texture, no geometric reconstruction or changed RGB.
 const shapeDefault=l.build==='balanced'&&['waist','hips','chest','jaw','shoulders','torso','arms','legs'].every(k=>l[k]===1)&&l.muscle===.35;
 const faceDefault=['face','eyeShape','brows','nose','mouth','facialHair','eyes'].every(k=>l[k]===baseLook[k]);
 // Changing an eye color, mouth or emblem must not rebuild the standing body
 // through IK or move its joints. Keep the source silhouette intact and apply
 // only the requested feature overlay. This is an artwork correction, not a
 // new animation state. Modified builds still use the existing layered rig.
 const intactRest=p.state==='idle'&&shapeDefault&&l.face===baseLook.face&&!customHair&&l.cape&&!Object.keys(pieces).length;
 if(intactRest){
  draw('whole',[0,0]);
  if(faceDefault&&l.emblem===baseLook.emblem&&palette.emblemColor===baseLook.emblemColor){c.restore();return result();}
 }else{
 if(l.cape)draw('cape',m.shoulder,[m.shoulder[0]+p.offset[0]+p.lean,m.shoulder[1]+p.offset[1]],-p.moving*.12+Math.sin(time*3)*.012);
 const limb=(kind,i)=>{const original=m[kind][i],posed=p[kind][i],names=kind==='arms'?['upper','lower','hand']:['thigh','shin','boot'];
  const joint=posed[1],patch=parts[names[1]+i];c.save();c.translate(...joint);c.rotate(angle(posed[1],posed[2])-angle(original[1],original[2]));c.drawImage(patch.canvas,Math.max(0,original[1][0]-patch.x-6),Math.max(0,original[1][1]-patch.y),12,8,-6,-4,12,12);c.restore();
  for(let j=0;j<2;j++)draw(names[j]+i,original[j],posed[j],angle(posed[j],posed[j+1])-angle(original[j],original[j+1]),kind==='arms'?1+(l.muscle-.35)*.2:1+(l.hips-1)*.5,kind==='arms'?l.arms:l.legs);
  draw(names[2]+i,original[2],posed[2],kind==='arms'?angle(posed[1],posed[2])-angle(original[1],original[2]):0);
 };
 limb('legs',1);limb('arms',1);draw('torso',m.hip,[m.hip[0]+p.offset[0],m.hip[1]+p.offset[1]],Math.atan2(p.lean,m.hip[1]-m.shoulder[1]),l.waist*l.chest*l.shoulders,l.torso);limb('legs',0);limb('arms',0);
 if(customHair){
  c.save();c.translate(...p.head);c.scale(2.35,2.35);c.fillStyle=l.skin;c.strokeStyle='#17131b';c.lineWidth=1.2;c.beginPath();c.ellipse(0,-3,18*l.jaw,23,0,0,TAU);c.fill();c.stroke();c.restore();
  draw('face',m.head,p.head,0,l.jaw,1);
  c.save();c.translate(...p.head);c.scale(2.35,2.35);drawStyleCHair(c,l,{angle:0,lag:0,sway:0},time,'rear',false);drawStyleCHair(c,l,{angle:0,lag:0,sway:0},time,'front',false);c.restore();
 }else draw('head',m.head,p.head,0,l.jaw*(l.face==='round'?1.07:l.face==='angular'?.97:1),l.face==='round'?.98:1);
 }
 // Selected facial changes replace only their feature; defaults keep source RGB.
 c.save();c.translate(...p.head);c.scale(2.35,2.35);
 const cap=s=>s[0].toUpperCase()+s.slice(1);
 if(l.eyeShape!==baseLook.eyeShape||l.eyes!==baseLook.eyes)paintStyleCPart(c,'eyes'+cap(l.eyeShape),l.eyes,-15,-3,30,12);
 if(l.nose!==baseLook.nose)paintStyleCPart(c,'nose'+cap(l.nose),l.skin,-3,5,6,6);
 if(l.mouth!==baseLook.mouth)paintStyleCPart(c,'mouth'+cap(l.mouth),l.skin,-4,13,8,3);
 if(l.brows!==baseLook.brows){c.strokeStyle=l.hairColor;c.lineWidth=l.brows==='soft'?1:1.7;for(const s of[-1,1]){c.beginPath();c.moveTo(s*4,-5);c.lineTo(s*13,l.brows==='straight'?-5:-7);c.stroke();}}
 if(l.facialHair!=='none'){c.strokeStyle=l.hairColor;c.lineWidth=l.facialHair==='beard'?5:1.2;c.beginPath();c.moveTo(-11,12);c.quadraticCurveTo(0,23,11,12);c.stroke();}
 c.restore();
 if(l.emblem!==baseLook.emblem||palette.emblemColor!==baseLook.emblemColor){c.save();c.translate(m.shoulder[0]+p.offset[0]+p.lean,m.shoulder[1]+p.offset[1]+8);c.scale(2.1,2.1);emblem(c,0,0,l.emblem,palette.emblemColor,1.3);c.restore();}
 // Equipment remains an overlay on the reference anatomy. Item ownership,
 // catalog colors, rarity and stats are unchanged.
 const gearPose={head:p.head.map(v=>v/2.35),headTilt:0,shoulder:[(m.shoulder[0]+p.offset[0]+p.lean)/2.35,(m.shoulder[1]+p.offset[1])/2.35],d:{head:1,shoulder:18}};
 c.save();c.scale(2.35,2.35);helmet(c,l,gearPose,pieces.helmet,false,h.steel);mergeChest(c,gearPose,pieces.chest);c.restore();
 if(pieces.belt){c.strokeStyle=pieces.belt.color;c.lineWidth=6;c.beginPath();c.moveTo(m.hip[0]+p.offset[0]-28,m.hip[1]+p.offset[1]-4);c.lineTo(m.hip[0]+p.offset[0]+26,m.hip[1]+p.offset[1]-4);c.stroke();}
 for(const [name,item]of Object.entries(pieces)){if(!['rare','legendary'].includes(item?.rarity))continue;c.save();c.strokeStyle=item.rarity==='legendary'?'#65ff7a':'#fff';c.shadowColor=c.strokeStyle;c.shadowBlur=4;c.lineWidth=2;
  const lines=name==='boots'?p.legs.map(a=>a.slice(1)):name==='gloves'?p.arms.map(a=>a.slice(1)):name==='helmet'?[[[p.head[0]-39,p.head[1]-24],[p.head[0]-44,p.head[1]-42]],[[p.head[0]+40,p.head[1]-24],[p.head[0]+44,p.head[1]-42]]]:name==='chest'?[m.polygons.torso.map(a=>[a[0]+p.offset[0],a[1]+p.offset[1]])]:[];
  for(const line of lines){c.beginPath();line.forEach((v,i)=>i?c.lineTo(...v):c.moveTo(...v));c.stroke();}c.restore();}
 c.restore();return result();
}
if(typeof Image!=='undefined')void prepareSourceArt();
