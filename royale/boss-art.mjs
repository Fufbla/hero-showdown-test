// Royale presentation adapters. Approved source pixels and shared controllers are unchanged.
import * as ShoreModule from '../assets/shore/boss-core.js';
import * as RigModule from '../assets/scorpion-rig/rig-core.js';
import * as BushModule from '../assets/animation/bushman-animation-atlas.js';
import * as WasteModule from '../assets/animation/wastelander-atlas.js';
import * as VenomModule from '../assets/animation/venomis-thornbear-atlas.js';
import * as FighterModule from '../assets/villain-motion/fighter-atlas.js';

const Shore=ShoreModule.default||globalThis.HealthiaShoreBoss;
const Rig=RigModule.default||globalThis.HealthiaScorpionRigCore;
const Bush=BushModule.default||globalThis.HealthiaBushmanAtlas;
const Waste=WasteModule.default||globalThis.HealthiaWastelanderAtlas;
const Venom=VenomModule.default||globalThis.HealthiaVenomisThornbearAtlas;
const Fighter=FighterModule.default||globalThis.HealthiaVillainAtlas;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),mix=(a,b,q)=>a+(b-a)*q;
const ease=q=>{q=clamp(q);return q*q*(3-2*q);};
const phaseIndex=b=>b.state==='windup'?0:b.state==='active'?1:2;
const progress=b=>clamp(b.age/Math.max(.001,b.attack?.[b.state==='windup'?'warning':b.state==='active'?'duration':'recovery']||1));
const choose=(frames,q)=>frames[Math.min(frames.length-1,Math.floor(clamp(q)*frames.length))];

export const BOSS_ART=Object.freeze({
  1:{name:'Trash Monster',temporary:true},
  2:{name:'Bushman',temporary:false},
  3:{name:'Wastelander',temporary:false},
  4:{name:'Giant Scorpion',temporary:false},
  5:{name:'Venomis',temporary:false},
  6:{name:'AtomDust',temporary:false},
  7:{name:'Ultimate Pollution Boss',temporary:true},
});
export const BOSS_ART_DEPENDENCIES=Object.freeze([
  'assets/shore/boss-core.js','assets/shore/boss-parts.png','assets/scorpion-rig/rig-core.js',
  'assets/animation/bushman-animation-atlas.js','assets/animation/bushman-presence.png','assets/animation/bushman-walk.png','assets/animation/bushman-reactions.png','assets/animation/bushman-attacks.png',
  'assets/animation/wastelander-atlas.js','assets/animation/wastelander-presence.png','assets/animation/wastelander-attacks.png','assets/animation/wastelander-swing.png',
  'assets/animation/venomis-thornbear-atlas.js','assets/animation/venomis-presence.png','assets/animation/venomis-reaction.png',
  'assets/villain-motion/fighter-atlas.js','assets/villain-motion/wastelander-combat.png','assets/villain-motion/atomdust-combat.png','assets/villain-motion/atomdust-punch.png','assets/villain-motion/atomdust_walk.png',
]);

// Pose selection has no simulation side effects or independent attack timer.
export function bossArtPose(b,time=0){
  const region=b.region??b.regionId??Number(String(b.type).split('-')[1]),kind=b.attack?.kind||'',p=progress(b),stage=phaseIndex(b);
  const moving=Math.abs((b.x||0)-(b.prevX??b.x??0))>.01||Math.abs(b.vx||0)>3;
  const walking=Math.floor(((time*1.4)%1+1)%1*8),idle=Math.floor(((time/2.4)%1+1)%1*4);
  if(region===1||region===7)return {region,temporary:true,state:b.state,kind};
  if(region===4)return {region,rig:true,state:b.state,kind};
  if(region===2){
    if(b.state==='dead')return {region,sheet:'bushman',frame:14};
    if(b.state==='idle')return {region,sheet:'bushman',frame:moving?walking:8+idle};
    const frames=['thorns'].includes(kind)?[[24,25],[26],[27,15,8]]:['roots'].includes(kind)?[[28,29],[30],[31,15,8]]:[[16,17],[18],[19,15,8]];
    return {region,sheet:'bushman',frame:choose(frames[stage],p)};
  }
  if(region===3){
    if(b.state==='dead')return {region,sheet:'wastelander',frame:14};
    if(b.state==='idle')return {region,sheet:'wastelander',frame:moving?walking:8+idle};
    if(kind==='punch')return {region,sheet:'wastelander-combat',frame:choose([[6],[7],[8,6,0]][stage],p)};
    const frames=kind==='toxic'?[[24,25],[26,27],[27,15,8]]:kind==='hazard'?[[28,29],[30],[31,15,8]]:[[16,17,18],[32,33,20,19],[21,22,23,8]];
    return {region,sheet:'wastelander',frame:choose(frames[stage],p)};
  }
  if(region===5){
    if(b.state==='dead')return {region,sheet:'venomis',frame:47};
    if(b.state==='idle')return {region,sheet:'venomis',frame:moving?32+walking:40+idle%2};
    const frames=kind==='poison'?[[42,43],[43],[46,42,40]]:[[44,45],[46],[46,42,40]];
    return {region,sheet:'venomis',frame:choose(frames[stage],p)};
  }
  if(region===6){
    if(b.state==='dead')return {region,sheet:'atomdust',frame:5};
    if(b.state==='idle')return {region,sheet:moving?'atomdust_walk':'atomdust',frame:moving?walking:0};
    if(kind==='blast')return {region,sheet:'atomdust_punch',frame:choose([[0],[1],[2,3]][stage],p)};
    return {region,sheet:'atomdust',frame:choose([[6,13],[13,7],[8,6,0]][stage],p)};
  }
  return {region,temporary:true,state:b.state,kind};
}

// Native front-facing claw/stinger coordinates feed the already-approved articulated rig.
// The Story controller is a pose provider only: its step/strike/damage methods are never called.
export function scorpionPoseModel(b,time=0,heroX=b.attack?.targetX??b.x){
  const m=new Shore.Encounter(),kind=b.attack?.kind||'',sting=kind==='sting'||kind==='stingPattern';
  const native=sting?{windup:'stingerWindup',active:'stingerPlunge',recover:'stingerRecover'}:{windup:'clawWindup',active:'clawSweep',recover:'clawRecover'};
  m.state=native[b.state]||'intro';m.time=time;m.age=progress(b)*(Shore.DURATIONS[m.state]||1);
  m.side=b.attack?.side===-1?-1:b.attack?.side===1?1:(b.face===1?-1:1);
  m.hp=b.hp;m.maxHp=b.maxHp;m.flash=b.flash||0;m.locked=true;
  const scale=(b.h||165)/393;
  m.targetX=clamp(640+((b.attack?.targetX??heroX)-b.x)/scale,110,1170);
  m.clawReturnAngle=-m.side*Shore.CLAWS[m.side===1?0:1].limit;
  if(kind==='clawCombo')m.clawRotation=function(side=this.side){
    const pair=Object.create(this);pair.side=side;pair.clawReturnAngle=-side*Shore.CLAWS[side===1?0:1].limit;
    return Shore.Encounter.prototype.clawRotation.call(pair,side);
  };
  return m;
}

function specs(profile,key,accept=()=>true){
  return profile.sheets.map(sheet=>({file:`assets/animation/${sheet.file}`,frames:sheet.frames.flatMap((f,i)=>{
    const id=f.id??sheet.first+i;if(!accept(id))return [];
    const [x,y,w,h,ax,ay]=Array.isArray(f)?f:f.crop;
    return [{key:`${key}:${id}`,crop:[x,y,w,h],anchor:[ax-x,ay-y],referenceHeight:f.referenceHeight||sheet.referenceHeight,mask:sheet.masks?.[i],facing:-1}];
  })})).filter(s=>s.frames.length);
}
function fighterSpecs(id,key=id){
  const a=Fighter[id];return {file:`assets/villain-motion/${a.file}`,frames:a.frames.map((f,i)=>({...f,key:`${key}:${i}`,referenceHeight:a.referenceHeight}))};
}
const plans={2:()=>specs(Bush,'bushman'),3:()=>[...specs(Waste,'wastelander'),fighterSpecs('wastelander','wastelander-combat')],5:()=>specs(Venom,'venomis',id=>id>=32),6:()=>['atomdust','atomdust_punch','atomdust_walk'].map(id=>fighterSpecs(id))};
const assetURL=path=>new URL(`../${path}`,import.meta.url).href;
const imageFor=path=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error(`Could not load ${path}`));image.src=assetURL(path);});
function polygon(c,points){points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
function cacheFrame(image,f){
  const [x,y,w,h]=f.crop;if(x<0||y<0||x+w>image.naturalWidth||y+h>image.naturalHeight)throw Error(`Invalid approved crop ${f.key}`);
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');
  if(f.clipRuns){c.beginPath();for(let i=0;i<f.clipRuns.length;i+=3)c.rect(f.clipRuns[i],f.clipRuns[i+1],f.clipRuns[i+2],1);c.clip();}
  else if(f.mask?.length){c.beginPath();polygon(c,f.mask);c.clip();}
  c.drawImage(image,x,y,w,h,0,0,w,h);
  return {...f,canvas};
}

const rects=[[24,70,591,438],[625,44,380,473],[1080,44,432,470],[157,528,240,443],[629,552,282,394],[938,800,571,180]];
const bodyPolygon=[[321,76],[373,112],[421,139],[442,164],[477,151],[510,176],[513,211],[494,239],[456,256],[433,283],[419,307],[429,341],[415,375],[373,416],[322,448],[273,429],[236,400],[212,367],[210,329],[205,290],[190,260],[158,245],[130,220],[126,174],[146,151],[191,157],[216,171],[254,132],[286,115]];
const leftJaw=[[884,280],[911,308],[909,350],[899,386],[868,420],[835,450],[794,472],[741,495],[695,508],[720,486],[743,450],[770,412],[793,367],[810,335],[840,310]];
const rightJaw=[[1235,280],[1203,313],[1207,360],[1229,399],[1262,435],[1302,464],[1361,491],[1438,507],[1399,480],[1353,443],[1311,397],[1290,356],[1272,323]];
const jawCuts=[[[824,335],[911,337],...leftJaw.slice(3,14)],[[1207,350],...rightJaw.slice(3),[1272,350]]];
const forearmCuts=[[[625,44],[1005,44],[1005,265],[955,265],[920,240],[890,220],[855,205],[625,205]],[[1080,44],[1512,44],[1512,205],[1270,205],[1240,220],[1205,240],[1155,265],[1080,265]]];
function scorpionTextures(image){
  const cache=(rect,points,cut)=>{const [x,y,w,h]=rect,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');c.translate(-x,-y);c.beginPath();polygon(c,points||[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);if(cut)for(const p of typeof cut[0][0]==='number'?[cut]:cut)polygon(c,p);c.clip(cut?'evenodd':'nonzero');c.drawImage(image,0,0);return {canvas,x,y,w,h};};
  return {image,body:cache([123,73,394,380],bodyPolygon),
    legs:Rig.legs.map(def=>{const sections=Rig.sections(def.source,def.widths),p=[...sections.map(s=>[s[0].x,s[0].y]),...sections.slice().reverse().map(s=>[s[1].x,s[1].y])],xs=p.map(p=>p[0]),ys=p.map(p=>p[1]),x=Math.floor(Math.min(...xs))-2,y=Math.floor(Math.min(...ys))-2;return cache([x,y,Math.ceil(Math.max(...xs))-x+2,Math.ceil(Math.max(...ys))-y+2],p);}),
    plate:cache([177,674,208,170]),claws:[cache(rects[1],null,[jawCuts[0],forearmCuts[0]]),cache(rects[2],null,[jawCuts[1],forearmCuts[1]])],
    forearms:forearmCuts.map((p,i)=>cache(rects[i+1],p.map(([x,y],j)=>[x,y+(j>1?32:0)]))),jaws:[cache(rects[1],leftJaw),cache(rects[2],rightJaw)]};
}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function triangle(c,texture,a,b,d,A,B,D){
  const det=(b.x-a.x)*(d.y-a.y)-(d.x-a.x)*(b.y-a.y);if(Math.abs(det)<1e-7)return;
  const u1=b.x-a.x,v1=b.y-a.y,u2=d.x-a.x,v2=d.y-a.y,xx=((B.x-A.x)*v2-(D.x-A.x)*v1)/det,xy=((D.x-A.x)*u1-(B.x-A.x)*u2)/det,yx=((B.y-A.y)*v2-(D.y-A.y)*v1)/det,yy=((D.y-A.y)*u1-(B.y-A.y)*u2)/det;
  c.save();c.beginPath();c.moveTo(A.x,A.y);c.lineTo(B.x,B.y);c.lineTo(D.x,D.y);c.closePath();c.clip();c.transform(xx,yx,xy,yy,A.x-xx*a.x-xy*a.y,A.y-yx*a.x-yy*a.y);c.drawImage(texture.canvas,texture.x,texture.y);c.restore();
}
function plate(c,t,a,b,width){const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy);if(L<.3)return;c.save();c.translate((a.x+b.x)/2,(a.y+b.y)/2);c.rotate(Math.atan2(dy,dx)-Math.PI/2);c.drawImage(t.plate.canvas,-width/2,-(L+15)/2,width,L+15);c.restore();}
function drawScorpion(c,t,p){
  ellipse(c,640,573,290,26,'#080e1838');
  const segments=p.tail.slice(1).map((b,i)=>({a:p.tail[i],b,i,z:(p.tail[i].z+b.z)/2})).sort((a,b)=>b.z-a.z);
  for(const s of segments)plate(c,t,s.a,s.b,50-s.i*1.2);
  for(let j=0;j<8;j++){
    const def=Rig.legs[j],leg=p.legs[j],from=Rig.sections(def.source,def.widths),scale=def.index===0?.78:1,to=Rig.sections(leg.joints,def.widths.map(w=>w*Rig.bodyScale*scale));
    ellipse(c,leg.position.x,leg.position.y+leg.lift+2,10,3,leg.planted?'#07111a44':'#07111a22');
    for(let i=0;i<3;i++){triangle(c,t.legs[j],from[i][0],from[i][1],from[i+1][0],to[i][0],to[i][1],to[i+1][0]);triangle(c,t.legs[j],from[i][1],from[i+1][1],from[i+1][0],to[i][1],to[i+1][1],to[i+1][0]);}
  }
  p.claws.forEach((a,i)=>{plate(c,t,a.shoulder,a.elbow,53);plate(c,t,a.elbow,a.wrist,49);const v=a.weapon,[,,w,h]=rects[i+1];c.save();c.translate(a.palm.x,a.palm.y);c.rotate(a.forearmRoll);c.translate(-a.palm.x,-a.palm.y);c.translate(v.x,v.y);c.rotate(v.angle);c.scale(210/w,260/h);c.drawImage(t.forearms[i].canvas,-v.anchor[0]*w,-v.anchor[1]*h);c.restore();});
  const tex=t.body,cols=3,rows=4,grid=[];
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){const source={x:tex.x+tex.w*col/cols,y:tex.y+tex.h*row/rows},world=Rig.bodyPoint(Rig.sourceWorld(source),p.body),weight=clamp((325-source.y)/230);world.y+=Math.sin(p.time*1.9-source.y*.008)*1.7*weight;world.x+=Math.sin(p.time*1.3)*.8*weight;grid.push({source,world});}
  for(let r=0;r<rows;r++)for(let col=0;col<cols;col++){const a=grid[r*(cols+1)+col],b=grid[r*(cols+1)+col+1],d=grid[(r+1)*(cols+1)+col],e=grid[(r+1)*(cols+1)+col+1];triangle(c,tex,a.source,b.source,d.source,a.world,b.world,d.world);triangle(c,tex,b.source,e.source,d.source,b.world,e.world,d.world);}
  p.claws.forEach((a,i)=>{const v=a.weapon,[x,y,w,h]=rects[i+1];c.save();c.translate(v.x,v.y);c.rotate(v.angle);c.scale(210/w,260/h);c.translate(-v.anchor[0]*w,-v.anchor[1]*h);c.drawImage(t.claws[i].canvas,0,0);const pivot=i?[1238-x,320-y]:[875-x,315-y];c.translate(...pivot);c.rotate(-v.side*a.opening);c.drawImage(t.jaws[i].canvas,-pivot[0],-pivot[1]);c.restore();});
  const tip=p.stinger;c.drawImage(t.image,...rects[4],tip.x-118*.2,tip.y-165*.92,118,165);
}

// Temporary original geometry is visibly labeled; it is not a new approved villain design.
function drawTemporary(c,b,time){
  const ultimate=(b.region??b.regionId)===7,h=b.h||170,w=b.w||140,phase=progress(b),active=b.state==='active',reach=active?Math.sin(phase*Math.PI):b.state==='windup'?-phase*.35:0;
  const ink='#263638',body=ultimate?'#665675':'#738064',light=ultimate?'#b596bf':'#bac39b';c.save();c.strokeStyle=ink;c.lineWidth=3;c.lineJoin='round';c.lineCap='round';
  const limb=(a,k,z,width)=>{c.strokeStyle=ink;c.lineWidth=width+5;c.beginPath();c.moveTo(...a);c.lineTo(...k);c.lineTo(...z);c.stroke();c.strokeStyle=body;c.lineWidth=width;c.stroke();ellipse(c,...k,width*.54,width*.54,light);};
  const bob=Math.sin(time*2)*1.8,move=Math.abs((b.prevX??b.x)-b.x)>.01?Math.sin(time*8)*10:0;
  limb([-w*.18,-h*.35],[-w*.23,-h*.18],[-w*.28+move,0],w*.17);limb([w*.18,-h*.35],[w*.23,-h*.18],[w*.28-move,0],w*.17);
  for(const side of [-1,1]){const front=side===(b.face||1),r=front?reach:reach*.2;limb([side*w*.31,-h*.72],[side*w*(.45+r*.22),-h*(.49+r*.15)],[side*w*(.51+r*.44),-h*(.4+r*.16)],w*.16);}
  c.fillStyle=body;c.strokeStyle=ink;c.lineWidth=3;c.beginPath();c.moveTo(-w*.3,-h*.78+bob);c.lineTo(w*.31,-h*.81+bob);c.lineTo(w*.4,-h*.38);c.lineTo(w*.18,-h*.29);c.lineTo(-w*.32,-h*.33);c.closePath();c.fill();c.stroke();
  ellipse(c,0,-h*.85+bob,w*.26,h*.17,body);c.stroke();
  for(let i=0;i<(ultimate?6:4);i++){const a=(i/(ultimate?5:3)-.5)*1.6,x=Math.sin(a)*w*.31,y=-h*.91-Math.cos(a)*h*.12;c.fillStyle=i%2?light:'#435e57';c.beginPath();c.moveTo(x-9,y+15);c.lineTo(x-3,y-12);c.lineTo(x+12,y+10);c.closePath();c.fill();c.stroke();}
  c.fillStyle=light;c.fillRect(-w*.2,-h*.63,w*.15,h*.13);c.strokeRect(-w*.2,-h*.63,w*.15,h*.13);c.fillStyle=ultimate?'#9fcd72':'#d4cd89';c.fillRect(w*.04,-h*.55,w*.18,h*.11);c.strokeRect(w*.04,-h*.55,w*.18,h*.11);
  ellipse(c,-w*.1,-h*.87+bob,5,4,'#eff5b3');ellipse(c,w*.1,-h*.87+bob,5,4,'#eff5b3');
  c.fillStyle=ink;c.fillRect(-w*.1,-h*.77+bob,w*.2,5);c.restore();
}

export class BossArt{
  constructor({loadImages=typeof Image!=='undefined'}={}){this.loadImages=loadImages;this.regions=new Map();this.visuals=new WeakMap();this.errors=[];this.currentRegion=0;this.whenLoaded=Promise.resolve(true);}
  get ready(){return !!this.regions.get(this.currentRegion)?.ready;}
  prepare(region){
    this.currentRegion=region;if(this.regions.has(region)){this.whenLoaded=this.regions.get(region).promise;return this.whenLoaded;}
    const entry={ready:BOSS_ART[region]?.temporary||false,frames:new Map(),textures:null};this.regions.set(region,entry);
    if(entry.ready||!this.loadImages){entry.promise=Promise.resolve(entry.ready);this.whenLoaded=entry.promise;return entry.promise;}
    entry.promise=(async()=>{try{
      if(region===4)entry.textures=scorpionTextures(await imageFor('assets/shore/boss-parts.png'));
      else for(const sheet of plans[region]?.()||[]){const im=await imageFor(sheet.file);for(const frame of sheet.frames)entry.frames.set(frame.key,cacheFrame(im,frame));}
      entry.ready=true;return true;
    }catch(error){this.errors.push(error.message);entry.error=error.message;return false;}})();this.whenLoaded=entry.promise;return entry.promise;
  }
  step(b,time,dt,heroX=b.x){
    const selection=bossArtPose(b,time),region=selection.region;this.prepare(region);
    let v=this.visuals.get(b);if(!v){v={selection,lastX:b.x,lastY:b.y,pose:null};this.visuals.set(b,v);}v.selection=selection;v.time=time;
    if(region===4){
      const model=scorpionPoseModel(b,time,heroX),scale=(b.h||165)/393,dx=(b.x-v.lastX)/scale;
      if(!v.rig||Math.abs(dx)>150||Math.abs(b.y-v.lastY)>100)v.rig=new Rig.Rig(model);
      else if(dt>0&&dx){
        // Compensate translation before IK so supporting feet remain fixed in world space.
        for(const f of v.rig.feet){
          f.position.x-=dx;if(f.swing){f.swing.from.x-=dx;f.swing.to.x-=dx;}
          // The Story rig's .65-second idle step is too slow for locomotion.
          // Its authored IK and lift arc remain intact with a .22-second step.
          if(f.swing&&Rig.braceAt(model)<.2)f.swing.age+=dt*(1/.22-1/.65);
          f.lastCycle=Math.floor(time/3.4+f.def.group*.5+f.def.index*.014);
        }
        if(!v.rig.feet.some(f=>f.swing)&&Rig.braceAt(model)<.2){
          const groups=[0,1].map(group=>({group,error:Math.max(...v.rig.feet.filter(f=>f.def.group===group).map(f=>Math.abs(f.position.x-f.def.rest[3].x)))})).sort((a,b)=>b.error-a.error);
          if(groups[0].error>15)for(const f of v.rig.feet.filter(f=>f.def.group===groups[0].group)){
            f.swing={age:0,from:{...f.position},to:{...f.def.rest[3],x:f.def.rest[3].x+Math.sign(dx)*32},height:12+f.def.index*2};
          }
        }
      }
      // The native idle gait can also request steps. Reserve at least four
      // supporting feet when locomotion has already started a corrective step.
      let swinging=v.rig.feet.filter(f=>f.swing).length;
      for(const f of v.rig.feet){
        const cycle=time/3.4+f.def.group*.5+f.def.index*.014,serial=Math.floor(cycle);
        if(!f.swing&&Rig.braceAt(model)<.2&&cycle-serial>.78&&f.lastCycle!==serial){
          if(swinging>=4)f.lastCycle=serial;else swinging++;
        }
      }
      v.pose=v.rig.advance(model);v.model=model;v.lastX=b.x;v.lastY=b.y;
    }
    return this.inspect(b);
  }
  inspect(b){const v=this.visuals.get(b),region=b.region??b.regionId??Number(String(b.type).split('-')[1]);return {name:BOSS_ART[region]?.name,temporary:!!BOSS_ART[region]?.temporary,loaded:!!this.regions.get(region)?.ready,selection:v?.selection,pose:v?.pose,error:this.regions.get(region)?.error||null};}
  draw(c,b,{time=0,alpha=1}={}){
    const v=this.visuals.get(b);if(!v)return;
    const p=v.selection,entry=this.regions.get(p.region),x=mix(b.prevX??b.x,b.x,alpha),y=mix(b.prevY??b.y,b.y,alpha),dead=b.state==='dead';
    if(dead&&b.age>=1.25)return;
    c.save();c.translate(x,y);
    if(dead)c.globalAlpha*=Math.max(0,1-b.age*.8);
    if(p.temporary)drawTemporary(c,b,time);
    else if(entry?.ready){
      if(p.region===4){const s=(b.h||165)/393;c.scale(s,s);c.translate(-640,-573);drawScorpion(c,entry.textures,v.pose);}
      else{const f=entry.frames.get(`${p.sheet}:${p.frame}`);if(f){const scale=(b.h||170)*(p.region===3?1.15:p.region===6?1.18:1.07)/f.referenceHeight;c.scale((b.face||-1)/(f.facing||-1)*scale,scale);if(dead)c.rotate(-.15*ease(b.age/.6));c.drawImage(f.canvas,-f.anchor[0],-f.anchor[1]);}}
    }
    c.restore();
    if(p.temporary||!entry?.ready){
      const label=p.temporary?'TEMPORARY ART':entry?.error?'ART UNAVAILABLE':'LOADING APPROVED ART';
      c.save();c.font='bold 10px system-ui';c.textAlign='center';const width=c.measureText(label).width+14;c.fillStyle='#193f3fed';c.fillRect(x-width/2,y-(b.h||170)-27,width,18);c.fillStyle='#f5eed3';c.fillText(label,x,y-(b.h||170)-14);c.restore();
    }
  }
}
