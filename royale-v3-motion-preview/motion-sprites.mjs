// Full-character raster frames only. No runtime limb transforms or bone rigs.
import {ATTACKS} from './core.mjs';
export const FRAME_COUNTS=Object.freeze({idle:4,run:8,jump:6,doubleJump:6,punch:6,kick:6});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const images={}; let ready=false,pending=null;
const cell={w:300,h:362,x:150,y:340};
let lastFrame={action:'idle',frame:0,count:4,face:1,cape:'rest',grounded:true};
let lastTime=0,lastX=null,phase=0,lastMoving=false,transition=0,settle=0;
export function selectFrame(h,time){
 let action='idle',frame=0;
 if(h.attack&&ATTACKS[h.attack.kind]){
  action=h.attack.kind;const d=ATTACKS[action],a=h.attack.age;
  // Wind-up -> actual engine strike window -> recovery. Do not change hitboxes.
  frame=a<d.startup?Math.min(1,Math.floor(a/d.startup*2)):
    a<d.startup+d.active?2+Math.min(1,Math.floor((a-d.startup)/d.active*2)):
    4+Math.min(1,Math.floor((a-d.startup-d.active)/(d.duration-d.startup-d.active)*2));
 }else if(!h.grounded){
  action=(h.jumps||0)>=2?'doubleJump':'jump';
  const age=h.jumpAge||0;
  frame=age<.065?0:h.vy< -240?1:h.vy< -45?2:h.vy<100?3:h.vy<410?4:5;
 }else if((h.landing||0)>.01){action=(h.jumps||0)>=2?'doubleJump':'jump';frame=5;}
 else if(Math.abs(h.vx||0)>8){action='run';frame=Math.floor(phase*8)%8;}
 else{
  // One blink about every four seconds. The base body never shifts at rest.
  const t=((time||0)%4+4)%4;
  frame=t<3.72?0:t<3.79?1:t<3.87?2:3;
 }
 return {action,frame,count:FRAME_COUNTS[action],face:h.face<0?-1:1};
}
export const motionSprites={
 get ready(){return ready;},
 get status(){return {...lastFrame,ready,counts:FRAME_COUNTS};},
 async preload(){
  if(pending)return pending;
  pending=Promise.all(Object.keys(FRAME_COUNTS).concat(['start','settle']).map(name=>new Promise((resolve,reject)=>{
   const im=new Image();im.onload=()=>{images[name]=im;resolve();};im.onerror=()=>reject(Error('Missing motion sprite: '+name));
   im.src=new URL('./motion-assets/'+name+'.webp?v=motion-plan-v1',import.meta.url).href;
  }))).then(()=>{ready=true;return true;});return pending;
 },
 draw(c,x,y,h,time,scale=1,{menu=false}={}){
  if(!ready)return false;
  if(!menu){
   const dt=clamp(time-lastTime,0,.05),moving=h.grounded&&Math.abs(h.vx||0)>8;
   if(lastX!==null&&moving){const delta=Math.abs(x-lastX);if(delta<35)phase=(phase+delta/100)%1;}
   if(moving&&!lastMoving){transition=.10;phase=0;}
   if(!moving&&lastMoving&&h.grounded&&!h.attack)settle=.20;
   transition=Math.max(0,transition-dt);settle=Math.max(0,settle-dt);
   lastMoving=moving;lastTime=time;lastX=x;
  }
  const pose=menu?{action:'idle',frame:0,count:4,face:h.face<0?-1:1}:selectFrame(h,time);
  let sheet=pose.action,frame=pose.frame,cape=pose.action==='idle'?'rest':pose.action==='run'?'trailing':'reacting';
  if(!menu&&pose.action==='run'&&transition>0){sheet='start';frame=transition>.05?0:1;cape='lifting';}
  if(!menu&&pose.action==='idle'&&settle>0){sheet='settle';frame=settle>.12?0:settle>.05?1:2;cape='settling';}
  const s=.40*scale;
  c.save();
  if(h.dead){c.globalAlpha*=Math.max(.25,1-(h.defeatAge||0)*.25);}
  if((h.stun||0)>0)c.globalAlpha*=.85;
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';
  c.drawImage(images[sheet],frame*cell.w,pose.face<0?cell.h:0,cell.w,cell.h,x-cell.x*s,y-cell.y*s,cell.w*s,cell.h*s);
  c.restore();
  if(!menu)lastFrame={...pose,cape,grounded:!!h.grounded,x,y};
  return true;
 }
};
