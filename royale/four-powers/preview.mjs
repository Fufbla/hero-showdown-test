import {POWERS,powerStats} from './powers.mjs';
import {drawHero} from '../release-src/presentation.mjs';
import {drawFourWorld,drawPowerHero,drawSlamHero} from './art.mjs';
const PREVIEW_POWERS=['strength','superKick','animalAllies','seismicSmash'];
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
const previewTokens=new WeakMap();
export function appendPowerPreview(panel,id,game){
 if(!PREVIEW_POWERS.includes(id))return;
 const canvas=el('canvas');canvas.width=420;canvas.height=175;canvas.className='four-power-preview';canvas.setAttribute('aria-label',POWERS[id].name+' animated preview');panel.append(canvas);
 const token={};previewTokens.set(canvas,token);let start;
 const draw=now=>{
  if(!canvas.isConnected||previewTokens.get(canvas)!==token)return;
  start??=now;const t=(now-start)/1000,age=t%1.9,level=game.powers.data.levels[id]||1,s=powerStats(id,level,{heroLevel:game.hero.level,equipment:game.equipment});
  const h={...game.hero,x:100,y:155,face:1,prevX:100,prevY:155,grounded:true,vx:0,vy:0,stun:0,dead:false,invulnerable:0,respawnAge:100,castAge:100,attack:null,powerPose:null};
  const demo={...game,hero:h,time:t,powers:{...game.powers,effects:[],active:{}}};
  if(id==='strength'||id==='superKick'){const d=id==='strength'?.27:.39,hitAge=age%d;if(age<d*(id==='strength'?1:s.kicks))h.attack={kind:id==='strength'?'punch':'kick',power:id,face:1,age:hitAge,stats:s,comboIndex:Math.floor(age/d)};}
  else if(id==='animalAllies'&&age<.64){demo.powers.effects=[{id,...s,x:100,y:155,targetX:285,targetY:155,face:1,age,duration:s.animal==='panther'?.64:.52,contact:.32}];}
  else if(id==='seismicSmash'&&age<.70){h.powerPose=age<.58?{id,age,face:1}:null;demo.powers.effects=[{id,...s,x:200,y:155,face:1,age,duration:.70,contact:.20}];h.x=200;}
  const c=canvas.getContext('2d');c.clearRect(0,0,420,175);c.fillStyle='#0c2b34';c.fillRect(0,0,420,175);c.strokeStyle='#49655b';c.beginPath();c.moveTo(0,156);c.lineTo(420,156);c.stroke();
  drawFourWorld(c,demo);drawSlamHero(c,demo,{x:h.x,y:h.y},h,null);drawHero(c,h.x,h.y,game.look,h,t,.85);drawPowerHero(c,demo,{x:h.x,y:h.y},null);
  requestAnimationFrame(draw);
 };requestAnimationFrame(draw);
}
