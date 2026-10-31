import {EnvironmentArt} from './environment-art.mjs';
import {MonsterAtlas,MONSTER_HEIGHT} from './monster-art.mjs';
import {CapeCloth} from './cape.mjs';
import {trackCamera,inView} from './camera.mjs';
import { drawLegendarySky, drawLegendaryWorld, drawMergeWorld } from './legendary-art.mjs';
import { BossArt } from './boss-art.mjs';
import { drawArena } from './boss-ui.mjs';
import { drawNewMonster, regionSky, worldLandmarks } from './world-art.mjs';
import { drawEris, drawPowerWorld, drawPowerHero } from './power-art.mjs';
import { SURFACES, WORLD_WIDTH, CAMPS, TYPES } from './world.mjs';
import { clamp, ATTACKS } from './core.mjs';
import { drawHero } from './hero-art.mjs';
export { drawHero } from './hero-art.mjs';
const PI = Math.PI;
const OUTLINE = '#183c43';
function path(c, points, fill, stroke = OUTLINE, width = 2) {
  c.beginPath(); points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); }
}
function oval(c,x,y,rx,ry,fill,stroke=null,width=2) {
  c.beginPath(); c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,PI*2); c.fillStyle=fill;c.fill(); if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
}
function line(c,points,color,width=2) {c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function limb(c,points,color,width) {line(c,points,OUTLINE,width+4);line(c,points,color,width);}
function round(c,x,y,w,h,r,color) {c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
const lerp=(a,b,t)=>a+(b-a)*t;
export class Renderer {
  constructor(canvas) {
    this.environment=new EnvironmentArt();this.monsterAtlas=new MonsterAtlas();this.cloth=new CapeCloth();this.bossArt=new BossArt();this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.camera=0;this.cameraY=0;this.particles=Array.from({length:96},()=>({life:0}));this.particleCursor=0;this.width=1280;this.height=720;
    this.resize();this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);
  }
  resize(){const r=this.canvas.getBoundingClientRect();this.dpr=Math.min(window.devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*this.dpr);this.canvas.height=Math.round(r.height*this.dpr);this.height=r.height<360?480:720;this.scale=r.height/this.height;this.width=r.width/this.scale;}
  clearParticles(){for(const p of this.particles)p.life=0;this.particleCursor=0;}
  event(e){if(['hit','reward','jump','land','level','spawn'].includes(e.type)){const count=e.type==='level'?26:e.type==='reward'?12:e.type==='hit'?9:6;for(let i=0;i<count;i++){const a=i/count*PI*2;Object.assign(this.particles[this.particleCursor++%96],{x:e.x??0,y:e.y??0,vx:Math.cos(a)*(35+i*6),vy:-40-Math.abs(Math.sin(a))*100,life:.5+i*.02,max:.5+i*.02,color:e.type==='reward'?'#ffe19b':e.type==='hit'?'#fffbe1':'#c8f3d1',size:e.type==='reward'?4:3});}}}
  sky(t){
    const c=this.c,w=this.width;const sky=c.createLinearGradient(0,0,0,530);sky.addColorStop(0,'#83c0c9');sky.addColorStop(.5,'#c2e3d5');sky.addColorStop(1,'#f6e3ad');c.fillStyle=sky;c.fillRect(0,0,w,720);
    oval(c,w*.76-this.camera*.025,145,66,66,'#fff3c4');oval(c,w*.76-this.camera*.025,145,86,86,'#fff4c326');
    for(let i=-1;i<8;i++){const x=i*280-(this.camera*.12%280);const y=80+(i%3)*44;oval(c,x,y,70,14,'#f5f5ddaa');oval(c,x+40,y-10,49,20,'#f5f5ddaa');oval(c,x+80,y+2,52,12,'#f5f5ddaa');}
    // Distant islands and headlands move more slowly than the playable beach.
    path(c,[[-20,350],[80-this.camera*.08,300],[180-this.camera*.08,330],[360-this.camera*.08,280],[550-this.camera*.08,350],[w,350],[w,430],[-20,430]],'#72a9a9',null);
    const sea=c.createLinearGradient(0,340,0,610);sea.addColorStop(0,'#4b9fa5');sea.addColorStop(.55,'#58b9b2');sea.addColorStop(1,'#a9d6ba');c.fillStyle=sea;c.fillRect(0,350,w,320);
    for(let row=0;row<8;row++){const y=372+row*32;for(let i=-1;i<w/160+1;i++){const x=i*160+Math.sin(t*.3+row)*34-(this.camera*(.15+row*.015)%160);line(c,[[x,y],[x+28,y-2],[x+62,y]],row%2?'#d5e9c566':'#9bd8c666',2+row*.2);}}
    for(let i=0;i<4;i++){const x=(i*280+130+t*9-this.camera*.09)%(w+100),y=180+i%2*38;line(c,[[x-6,y],[x,y+3],[x+6,y]],'#426b72',1.8);}
    // Far-off lighthouse anchors the destination before you reach it.
    const lx=5750-this.camera*.86;
    if(lx<w+150&&lx>-150)this.lighthouse(lx,500,.55);
  }
  palm(x,y,scale,t){const c=this.c;c.save();c.translate(x,y);c.scale(scale,scale);line(c,[[0,0],[-11,-64],[-9,-125],[4,-180]],'#a77e50',16);line(c,[[-4,-5],[-15,-65],[-12,-121],[1,-178]],'#d3ae6e',5);for(let i=0;i<6;i++){const a=(i/5)*PI+PI;const ex=Math.cos(a)*96,ey=-175+Math.sin(a)*48+Math.sin(t+i)*3;c.beginPath();c.moveTo(4,-179);c.quadraticCurveTo(ex*.4,-235,ex,ey);c.quadraticCurveTo(ex*.5,-187,4,-179);c.fillStyle=i%2?'#328b73':'#247c66';c.fill();}oval(c,2,-174,9,7,'#8b643d');c.restore();}
  lighthouse(x,y,s=1){const c=this.c;c.save();c.translate(x,y);c.scale(s,s);path(c,[[-30,0],[-20,-160],[20,-160],[30,0]],'#faf0cd','#4b7473',3);path(c,[[-25,-70],[-23,-100],[23,-100],[25,-70]],'#d57c61',null);round(c,-25,-182,50,28,3,'#315a66');round(c,-18,-178,36,20,1,'#ffd993');path(c,[[-35,-184],[0,-208],[35,-184]],'#b56950','#3b5b60',2);round(c,-8,-30,16,30,4,'#325e69');line(c,[[-35,-150],[35,-150]],'#406a70',5);c.restore();}
  terrain(surface){this.environment.surface(this.c,surface,this.regionTheme);}
  enemy(e,t,alpha){
    if(e.boss&&e.type.startsWith('boss-')){this.bossArt.draw(this.c,e,{time:t,alpha});return;}
    const dead=e.state==='dead',fade=Math.min(1,(e.deadAge||0)/.55);if(dead&&fade>=1)return;
    if(e.legendaryHelper){if(dead)return;this.bossArt.step(e,t,0);this.bossArt.draw(this.c,e,{time:t,alpha});const x=lerp(e.prevX,e.x,alpha),y=lerp(e.prevY,e.y,alpha);round(this.c,x-25,y-e.h-13,50,5,3,'#203329');round(this.c,x-24,y-e.h-12,48*e.hp/e.maxHp,3,2,'#b8e887');return;}
    const c=this.c,x=lerp(e.prevX,e.x,alpha),y=lerp(e.prevY,e.y,alpha),height=MONSTER_HEIGHT[e.type]||e.h;
    oval(c,x,y+1,e.w*.56,4,'#152b4438');c.save();c.translate(x,y);c.scale(e.face,1);
    if(e.lifted){c.translate(0,-e.h/2);c.rotate(t*7+e.id);c.translate(0,e.h/2);}
    if(dead){c.globalAlpha=1-fade;c.scale(1+fade*.15,1-fade*.8);c.rotate(-fade*.25);}
    else if(e.protection>0)c.globalAlpha=.65;
    if(e.flash>0)c.translate(-Math.sin(e.flash/.12*Math.PI)*2,0);
    this.monsterAtlas.draw(c,e,t,this.night);c.restore();if(dead)return;
    round(c,x-27,y-height-12,54,6,3,'#112735');round(c,x-26,y-height-11,52*e.hp/e.maxHp,4,2,e.desperate?'#f5ba78':'#b8e887');
    if(e.state==='warn'){oval(c,x,y-height-29,9,10,'#ffe4a0');c.fillStyle='#774b31';c.font='bold 15px sans-serif';c.textAlign='center';c.fillText('!',x,y-height-24);line(c,[[x-30,y+5],[x+30,y+5]],'#f8c87b',2);}
    if(e.state==='strike')line(c,[[x+e.face*24,y-28],[x+e.face*42,y-20],[x+e.face*31,y-8]],'#fff2c8',2);
  }
  draw(game,alpha,dt){const c=this.c,h=game.hero,t=game.time;this.regionTheme=game.getRegion();this.night=game.clock().night;
    const scene=`${game.regionId}:${game.arenaScene?.id||game.arenaScene?.region||'world'}`;
    const camera=trackCamera({x:this.camera,y:this.cameraY},h,this.width,this.height,dt,{worldWidth:game.arenaScene?1880:WORLD_WIDTH,arena:!!game.arenaScene,reset:this.scene!==scene});
    this.scene=scene;this.camera=camera.x;this.cameraY=camera.y;
    const visible=(x,y,w,h)=>inView(x,y,w,h,camera,this.width,this.height);
    c.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,0,0);c.save();c.scale(1,this.height/720);if(game.arenaScene?.legendary)drawLegendarySky(c,game,this.width,this.camera);else this.environment.sky(c,game.getRegion(),this.width,720,this.camera,this.cameraY,t,this.night);c.restore();
    c.save();c.translate(-this.camera,-this.cameraY);
    if(!game.arenaScene&&game.regionId===1)for(const x of [40,330,1350,1860,2720,2990,3980,4550,5430,6080]){if(x>this.camera-150&&x<this.camera+this.width+150)this.palm(x,600,.7+(x%3)*.11,t);}
    if(!game.arenaScene&&game.regionId===1&&5750>this.camera-100&&5750<this.camera+this.width+100)this.lighthouse(5750,600,.9);
    for(const s of game.surfaces)if(visible(s.x,s.y,s.w,s.h+80))this.terrain(s);
    for(const [i,camp] of game.camps.entries()){
      if(!visible(camp.x-85,camp.y-165,170,180))continue;
      line(c,[[camp.x-30,camp.y],[camp.x-30,camp.y-120]],'#547a62',5);
      path(c,[[camp.x-28,camp.y-118],[camp.x+22,camp.y-112],[camp.x+12,camp.y-92],[camp.x-28,camp.y-97]],i===game.world.checkpoint.index&&game.regionId===game.world.checkpoint.region?'#e7cd83':'#56a77c',OUTLINE,1.5);
      path(c,[[camp.x+20,camp.y],[camp.x+44,camp.y-45],[camp.x+75,camp.y]],'#e7d2a4',OUTLINE,2);path(c,[[camp.x+34,camp.y],[camp.x+44,camp.y-31],[camp.x+53,camp.y]],'#5b8673',null);
      if(game.nearCamp()===i){round(c,camp.x-85,camp.y-157,170,24,12,'#153b40e6');c.fillStyle='#fff1cd';c.font='11px system-ui';c.textAlign='center';c.fillText('E / REST · heal & set checkpoint',camp.x,camp.y-141);}
    }
    if(!game.arenaScene){if(visible(150,390,260,230))drawEris(c,t);worldLandmarks(c,game,this.camera,this.width);}else{drawArena(c,game);if(game.arenaScene.legendary)drawLegendaryWorld(c,game);}
    for(const shot of game.enemyShots){oval(c,shot.x,shot.y,7,5,shot.color,'#283b43',2);line(c,[[shot.x-shot.vx*.025,shot.y-shot.vy*.025],[shot.x,shot.y]],'#eadcac',2);}
    for(const e of game.enemies)if(visible(e.x-e.w/2,e.y-e.h-40,e.w,e.h+50))this.enemy(e,t,alpha);
    drawPowerWorld(c,game);drawMergeWorld(c,game);
    const pos=globalThis.HealthiaMotionCore?.renderPosition({x:h.prevX,y:h.prevY,face:h.prevFace},{x:h.x,y:h.y,face:h.face},alpha,h.dead)||{x:lerp(h.prevX,h.x,alpha),y:lerp(h.prevY,h.y,alpha)};
    let visualHero={...h,cycle:h.cycle-(1-alpha)*Math.abs(h.x-h.prevX)/52,attack:h.attack?{...h.attack,age:Math.max(0,h.attack.age-(1-alpha)/60*game.powers.attackRate)}:null};
    if(h.dead&&!h.grounded){
      const floor=Math.min(...game.surfaces.filter(s=>h.x+h.w/2>s.x&&h.x-h.w/2<s.x+s.w&&s.y>=h.y).map(s=>s.y));
      pos.y=Math.min(floor,h.y+520*h.defeatAge*h.defeatAge);visualHero={...h,grounded:pos.y>=floor};
    }
    oval(c,pos.x,pos.y+2,24,5,'#284f4b2f');const pose=drawHero(c,pos.x,pos.y,game.look,visualHero,t,1,{outfit:game.visualOutfit(),cloth:this.cloth,dt:game.paused?0:dt});drawPowerHero(c,game,pos,pose);
    if(h.attack&&h.attack.power!=='superKick'){const a=h.attack,d=ATTACKS[a.kind];if(a.age>=d.startup&&a.age<d.startup+d.active){c.save();c.translate(h.x,h.y-43);c.scale(a.face,1);c.strokeStyle='#fff7d8c9';c.lineWidth=3;c.beginPath();c.arc(24,-8,a.kind==='kick'?48:35,-.7,.7);c.stroke();c.restore();}}
    for(const p of this.particles){if(p.life<=0)continue;if(!game.paused){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=210*dt;}c.globalAlpha=Math.max(0,p.life/p.max);oval(c,p.x,p.y,p.size,p.size,p.color);}c.globalAlpha=1;
    // Small foreground details give continuous ground a readable silhouette.
    for(let x=65;!game.arenaScene&&x<WORLD_WIDTH;x+=190){if(x<this.camera-60||x>this.camera+this.width+60)continue;const surface=SURFACES.find(s=>!s.oneWay&&s.kind==='sand'&&x>s.x+20&&x<s.x+s.w-20);if(!surface)continue;const y=surface.y+8;for(let i=0;i<5;i++)line(c,[[x+i*3,y],[x-8+i*6,y-14-(i%2)*10]],'#448d67',2);if(x%3===0)oval(c,x+25,y+4,7,3,'#fff1cb');}
    if(!game.arenaScene&&5950>this.camera-100&&5950<this.camera+this.width+100){line(c,[[5950,600],[5950,530]],'#8e6d45',6);round(c,5890,509,120,37,5,'#315d55');c.fillStyle='#f4e8b8';c.font='bold 12px system-ui';c.textAlign='center';c.fillText('THE JOURNEY BEGINS',5950,532);}
    c.restore();
    const grad=c.createLinearGradient(0,this.height-100,0,this.height);grad.addColorStop(0,'#143e4200');grad.addColorStop(1,'#143e4255');c.fillStyle=grad;c.fillRect(0,this.height-100,this.width,100);
  }
}
