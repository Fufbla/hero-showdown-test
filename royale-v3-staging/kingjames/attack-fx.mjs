// Sprite-only presentation of existing attack timers and projectile coordinates.
import {ATTACKS} from '../../royale/core.mjs';
export class AttackFX{
 constructor(){this.ready=false;this.seen=new Set();}
 async preload({imageLoader=url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Attack effects unavailable'));image.src=url.href;})}={}){
  try{this.atlas=await imageLoader(new URL('./effects/attacks.webp',import.meta.url));this.ready=true;return true;}catch(e){this.error=e.message;return false;}
 }
 sprite(c,row,index,x,y,width,height,direction=1,alpha=1){
  c.save();c.translate(x,y);c.scale(direction,1);c.globalAlpha*=alpha;
  c.drawImage(this.atlas,Math.max(0,Math.min(5,index))*229,row*229,229,229,-width*.5,-height*.5,width,height);c.restore();
 }
 world(c,game){
  if(!this.ready)return;
  for(const p of game.powers.projectiles){const direction=Math.sign(p.vx)||1;
   this.sprite(c,2,Math.floor((1.6-p.life)*24)%6,p.x-direction*15,p.y,74,42,direction);this.seen.add('projectile:'+direction);
  }
 }
 hero(c,game,pos,h){
  if(!this.ready||h.dead||h.steel)return;
  const attack=h.attack,direction=(attack?.face||h.face||1)<0?-1:1;
  if(attack&&['strength','superKick'].includes(attack.power)){
   const d=ATTACKS[attack.kind],age=attack.age,start=d.startup;
   if(age>=start&&age<start+d.active){
    const phase=(age-start)/d.active,kick=attack.power==='superKick';
    this.sprite(c,kick?1:0,Math.floor(phase*6),pos.x+direction*(kick?59:63),pos.y-(kick?51:61),kick?100:78,kick?84:78,direction,.9);
    this.seen.add(attack.power+':'+direction);
   }
  }
  if(h.castAge>=0&&h.castAge<.32){
   this.sprite(c,3,Math.min(5,Math.floor(h.castAge/.32*6)),pos.x+direction*30,pos.y-30,47,47,direction,.8);
   this.seen.add((h.grounded?'fireball':'fireballAir')+':'+direction);
  }
 }
}
export const kingJamesAttackFX=new AttackFX();
