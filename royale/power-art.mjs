import { BALANCE } from './powers.mjs';
function line(c,points,color,width=2){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineCap='round';c.lineJoin='round';c.stroke();}
function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
export function drawEris(c,time){
  const {x,y}=BALANCE.tree;c.save();c.translate(x,y);
  ellipse(c,0,1,74,8,'#163f4025');
  for(const side of [-1,1])line(c,[[0,-10],[side*17,-3],[side*47,0]],'#6d7654',9);
  line(c,[[0,0],[-8,-40],[0,-83],[-5,-133]],'#6d7654',18);line(c,[[-3,-7],[-12,-39],[-5,-81],[-10,-128]],'#b1ac74',4);
  for(const side of [-1,1]){line(c,[[0,-65],[side*23,-105],[side*52,-125]],'#6d7654',9);line(c,[[side*20,-101],[side*23,-132]],'#6d7654',6);}
  for(let i=0;i<7;i++){const a=i/7*Math.PI*2;ellipse(c,Math.cos(a)*42+Math.sin(time*.7+i)*1.2,-139+Math.sin(a)*22,34,24,i%2?'#3a7861':'#4e8c69');}
  for(let i=0;i<11;i++){const a=i*2.4;ellipse(c,Math.cos(a)*54,-139+Math.sin(a)*24,4,2,'#e9d79c');}
  ellipse(c,-2,-82,11,14,'#eed69a');line(c,[[-5,-85],[-1,-91],[4,-82],[-2,-72]],'#7b8056',1.5);
  c.fillStyle='#183f40';c.beginPath();c.roundRect(-61,12,122,23,7);c.fill();c.fillStyle='#ecdfb3';c.font='10px system-ui';c.textAlign='center';c.fillText('TREE OF ERIS',0,27);c.restore();
}
export function drawPowerWorld(c,game){
  const time=game.time;
  for(const e of game.enemies){if(!e.rooted||e.state==='dead')continue;
    for(let i=0;i<4;i++){const x=e.x+(i-1.5)*(10+Math.sin(time*6)*1.5);line(c,[[x-8,e.y+2],[x+Math.sin(i)*8,e.y-13],[x-5,e.y-e.h*.7],[x+5,e.y-e.h*.8]],'#446b3d',6);line(c,[[x-8,e.y+1],[x+Math.sin(i)*8-1,e.y-13],[x-6,e.y-e.h*.7]],'#9da96c',2);}
  }
  const wind=game.powers.active.whirlwind;
  if(wind){c.save();c.globalAlpha=.48;
    for(let i=0;i<11;i++){const y=wind.y-i*13,rx=18+i*4;c.beginPath();c.ellipse(wind.x+Math.sin(time*5+i*.3)*5,y,rx,7+i*.5,0,time*7+i,time*7+i+Math.PI*1.6);c.strokeStyle=i%2?'#ecf4d7':'#66b2a1';c.lineWidth=4;c.stroke();}c.restore();
  }
  for(const p of game.powers.projectiles){const direction=Math.sign(p.vx);c.save();c.translate(p.x,p.y);c.scale(direction,1);
    c.beginPath();c.moveTo(-27,0);c.quadraticCurveTo(-12,-14,2,-9);c.quadraticCurveTo(15,0,2,9);c.quadraticCurveTo(-12,14,-27,0);c.fillStyle='#e48042';c.fill();line(c,[[-25,0],[-12,-4],[-5,-7]],'#fff0b5',1.5);line(c,[[-31,4],[-20,3]],'#eab165',1.2);ellipse(c,0,0,8,7,'#ffd77d');ellipse(c,2,-1,4,4,'#fff2bf');c.restore();
  }
}
export function drawPowerHero(c,game,pos,pose){
  const h=game.hero,t=game.time;
  if(h.attack?.power==='strength'){
    const level=h.attack.stats.level,intensity=2+Math.floor(level/4),arm=pose.arms[0];c.save();c.translate(pos.x,pos.y);c.scale(h.attack.face,1);
    for(let j=0;j<intensity;j++){
      const points=[];for(let k=0;k<7;k++){const u=k/6,index=u<.5?0:1,v=u<.5?u*2:(u-.5)*2;const a=arm[index],b=arm[index+1];points.push([a[0]+(b[0]-a[0])*v+Math.sin(t*60+j*4+k)*4,a[1]+(b[1]-a[1])*v+Math.cos(t*70+j*3+k*2)*(4+level*.16)]);}
      line(c,points,j%2?'#fff6a0':'#ffe342',1.4+level*.035);
    }
    c.restore();
  }
  if(h.agile){c.save();c.globalAlpha=.5;for(let i=0;i<3;i++)line(c,[[pos.x-h.face*(29+i*6),pos.y-58+i*15],[pos.x-h.face*(38+i*6),pos.y-50+i*15]],'#dbeec8',1.5);c.restore();}
  if(h.flying){for(let i=0;i<2;i++)line(c,[[pos.x-15-i*7,pos.y+8+i*9],[pos.x-3,pos.y+12+i*9],[pos.x+15+i*7,pos.y+8+i*9]],'#edf2c48c',1.4);}
}
