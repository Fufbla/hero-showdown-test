import {prepareReleaseArt,drawHero} from '../../royale/release-src/presentation.mjs';
import {prepareFourPowerArt,drawFourWorld,drawPowerHero,drawSlamHero,artStatus} from './art.mjs';
import {createTestSnapshot} from './review.mjs';
import {Game} from '../../royale/core.mjs';
import {powerStats,POWERS} from './powers.mjs';
await prepareReleaseArt();await prepareFourPowerArt();
const scenarios=[['strength',1],['strength',20],['superKick',1],['superKick',20],...[1,5,10,15,20].map(n=>['animalAllies',n]),...[1,5,10,15,20].map(n=>['seismicSmash',n])];
const games=scenarios.map(([id,level])=>{
 const g=new Game({save:createTestSnapshot()}),article=document.createElement('article'),h=document.createElement('h2'),p=document.createElement('p'),canvas=document.createElement('canvas');canvas.width=640;canvas.height=300;canvas.setAttribute('aria-label',POWERS[id].name+' level '+level);h.textContent=POWERS[id].name+' · Level '+level;const stats=powerStats(id,level,{heroLevel:g.hero.level});p.textContent=id==='animalAllies'?stats.animal.replaceAll('-',' ')+' · '+stats.multiplier.toFixed(2)+'× · 6 s':id==='seismicSmash'?stats.radius/40+' m · '+stats.targets+' target'+(stats.targets>1?'s':'')+' · '+stats.multiplier.toFixed(2)+'× · 6 s':stats.reach+' units · '+(stats.kicks?stats.kicks+' kicks':'heavy impact');article.append(canvas,h,p);document.getElementById('gallery').append(article);return {id,level,g,canvas,stats};
});
let impact=false,paused=false,face=1,time=0,last=performance.now();document.getElementById('play-pause').onclick=e=>{paused=!paused;e.target.textContent=paused?'Resume animation':'Pause animation';};document.getElementById('direction').onclick=e=>{face*=-1;e.target.textContent=face===1?'Face left':'Face right';};
document.getElementById('impact').onclick=e=>{impact=!impact;e.target.textContent=impact?'Show full animation':'Show impact frames';};
// A queued first animation frame can predate initialization on a busy page.
// Effect ages must never become negative (Canvas ellipse radii depend on them).
function frame(now){if(!paused)time+=Math.max(0,now-last)/1000;last=now;
 for(const {id,level,g,canvas,stats}of games){const h=g.hero,age=impact?(id==='strength'?.09:id==='superKick'?.15:.34):time%2.8;
  Object.assign(h,{x:320,y:260,prevX:320,prevY:260,face,grounded:true,vx:0,vy:0,stun:0,dead:false,respawnAge:100,invulnerable:0,castAge:100,attack:null,powerPose:null});g.time=time;g.powers.effects=[];g.powers.active={};
  if(id==='strength'||id==='superKick'){const d=id==='strength'?.27:.39;if(age<d*(stats.kicks||1))h.attack={kind:id==='strength'?'punch':'kick',power:id,face,age:age%d,stats,comboIndex:Math.floor(age/d)};}
  if(id==='animalAllies'&&age<.64)g.powers.effects=[{id,...stats,level,x:h.x-face*90,y:h.y,targetX:h.x+face*150,targetY:h.y,face,age,duration:stats.animal==='panther'?.64:.52,contact:.32}];
  if(id==='seismicSmash'&&age<.70){h.powerPose=age<.58?{id,age,face}:null;g.powers.effects=[{id,...stats,level,x:h.x,y:h.y,face,age,duration:.70,contact:.20}];}
  const c=canvas.getContext('2d');c.fillStyle='#123f42';c.fillRect(0,0,640,300);c.fillStyle='#426052';c.fillRect(0,260,640,40);c.strokeStyle='#bad191';c.lineWidth=2;c.beginPath();c.moveTo(0,260);c.lineTo(640,260);c.stroke();
  drawFourWorld(c,g);drawSlamHero(c,g,{x:h.x,y:h.y},h,null);drawHero(c,h.x,h.y,g.look,h,time,1);drawPowerHero(c,g,{x:h.x,y:h.y});
  canvas.dataset.power=id;canvas.dataset.level=level;canvas.dataset.age=age.toFixed(3);
 }requestAnimationFrame(frame);
}
document.getElementById('gallery-status').textContent='14 previews ready · Five animals · Five shockwave tiers · Both facing directions';document.body.dataset.ready=JSON.stringify(artStatus());requestAnimationFrame(frame);
