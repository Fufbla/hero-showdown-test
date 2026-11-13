import {drawOutfitPreview as originalPreview} from '../../royale/cosmetics/preview.mjs?costume-base=1';
import {costumeSprites} from './engine.mjs';
import {ATTACKS} from '../../royale/core.mjs';
import {styleCDefault} from '../../royale/style-c-defaults.mjs';
const owners=new WeakMap();
export function motionHero(motion='idle',time=0,direction=1){
 const phase=time%1.3,h={grounded:true,vx:0,vy:0,face:direction,dead:false,respawnAge:100,hurtAge:100,jumpAge:100,jumps:0,stun:0,landing:0,castAge:100};
 if(motion==='run'||motion==='walk'||motion==='speed')h.vx=(motion==='walk'?120:motion==='speed'?450:260)*direction;
 if(motion==='jump'||motion==='doubleJump'){h.grounded=false;h.jumpAge=phase*.45;h.vy=-480+phase*550;h.jumps=motion==='doubleJump'?2:1;}
 if(['punch','kick','strength','superKick'].includes(motion)){const kind=motion==='kick'||motion==='superKick'?'kick':'punch';h.attack={kind,power:motion===kind?null:motion,age:phase/1.3*ATTACKS[kind].duration,face:direction,comboIndex:Math.floor(time/1.3)%6};}
 if(motion==='fireball')h.castAge=phase/1.3*.6;
 if(motion==='flight'){h.grounded=false;h.flying=true;h.vx=120;h.v2Active={flight:{age:time}};}
 if(motion==='land')h.landing=.13-phase/1.3*.13;
 if(motion==='hurt'){h.stun=.16;h.hurtAge=phase/1.3*.16;}
 if(motion==='defeat'){h.dead=true;h.defeatAge=phase/1.3*.65;}
 if(motion==='steel'){h.steel=true;h.vx=230*direction;h.v2Active={steel:{age:1}};}
 return h;
}
export function drawOutfitPreview(canvas,{look,layers=[],view='front',motion='idle',direction=1,time=0,scale}={}){
 const id=layers.find(layer=>layer.costumeId)?.costumeId;if(!id)return originalPreview(canvas,{look,layers,view,motion,direction,time,scale});
 const c=canvas.getContext('2d');if(!c)return null;c.clearRect(0,0,canvas.width,canvas.height);const x=canvas.width/2,y=canvas.height-20;
 c.fillStyle='#a8c2df22';c.beginPath();c.ellipse(x,y,canvas.width*.17,7,0,0,Math.PI*2);c.fill();
 if(!owners.has(canvas))owners.set(canvas,{});
 return costumeSprites.draw(c,x,y,look||styleCDefault('male'),motionHero(motion,time,direction),time,{id,owner:owners.get(canvas),scale:scale??Math.min(canvas.width/180,canvas.height/165)});
}
