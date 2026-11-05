// Cosmetic-only encounter VFX. Simulation definitions and collision zones are inputs.
const TAU=Math.PI*2,ink='#102c39';
export const BOSS_FX_THEMES=Object.freeze({
 trash:['#68ad62','#e4be6c','scrap'],bush:['#5fbb78','#ecdd9b','thorn'],wastelander:['#9caa70','#e1a75b','scrap'],scorpion:['#b49cdb','#d6f28b','venom'],venomis:['#ad68d0','#9ae5a8','thorn'],atomdust:['#f2cb65','#fff9cb','atom'],pollution:['#83c888','#cc99eb','sludge'],lightning:['#f7d955','#fff6b7','bolt'],air:['#8ba69d','#edb16e','smog'],styrodog:['#e2ded1','#b0bed2','claw'],sonic:['#c7a4ed','#fff1c4','sonic'],styro:['#dde5dc','#8ee2d2','foam']});
export function bossTheme(b){return b?.legendaryId||['','trash','bush','wastelander','scorpion','venomis','atomdust','pollution'][b?.region]||'trash';}
const line=(c,p,col,w=2)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=col;c.lineWidth=w;c.lineJoin='round';c.lineCap='round';c.stroke();};
const oval=(c,x,y,rx,ry,col)=>{c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);c.fillStyle=col;c.fill();};
const poly=(c,p,fill,stroke=ink,w=2)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}};
function spark(c,x,y,s,col){line(c,[[x-s,y],[x+s,y]],col,1.5);line(c,[[x,y-s],[x,y+s]],col,1.5);}
export function drawBossShot(c,p,time){
 if(!p.bossShot)return false;
 const [base,light,material]=BOSS_FX_THEMES[bossTheme(p.source)],kind=p.fxKind||'',theme=/toxic|poison|pollution|smog/i.test(kind)?'sludge':material,wave=/wave|Ring|Pulse|gust|expansion|atomic$|cataclysm|Overlap/.test(kind);
 c.save();c.translate(p.x,p.y);c.rotate(Math.atan2(p.vy,p.vx));
 // A bright five-unit contact core marks the unchanged collision radius. The
 // larger translucent wake is atmosphere, never an invented damage volume.
 c.globalAlpha=.35;for(let i=4;i>0;i--){oval(c,-i*6,Math.sin(time*12+i)*2,7+i*2,3+i,base);}c.globalAlpha=1;
 if(wave||theme==='sonic'){
  for(let i=0;i<3;i++){c.beginPath();c.ellipse(-i*7,0,7,12+i*4,0,-1.25,1.25);c.strokeStyle=i?base:light;c.lineWidth=3-i*.5;c.stroke();}spark(c,0,0,5,light);
 }else if(theme==='thorn'){
  poly(c,[[-17,0],[-6,-6],[10,0],[-6,6]],base);line(c,[[-14,0],[7,0]],light,2);for(const s of[-1,1])poly(c,[[-9,s*2],[-16,s*8],[-3,s*3]],base);
 }else if(theme==='scrap'&&bossTheme(p.source)==='trash'){
  c.save();c.rotate(time*4);poly(c,[[-8,-9],[7,-8],[8,8],[-6,10]],'#a7bcc0');line(c,[[-9,-10],[8,-9]],light,3);for(let y=-4;y<=5;y+=4)line(c,[[-5,y],[5,y]],'#4c777b',2);poly(c,[[-17,0],[-11,-6],[-7,2],[-13,7]],base);c.restore();
 }else if(theme==='scrap'){
  c.save();c.rotate(time*5);poly(c,[[-9,-7],[3,-10],[11,-2],[7,9],[-8,8]],base);poly(c,[[-8,-7],[3,-10],[9,-2],[-2,-1]],light);line(c,[[-2,-1],[-1,8]],ink,2);for(const [x,y] of [[-5,-3],[5,4]])oval(c,x,y,1.5,1.5,light);c.restore();
  poly(c,[[-18,-6],[-11,-9],[-13,-3]],light);line(c,[[-23,5],[-13,3]],base,2);
 }else if(theme==='claw'){
  for(let i=-1;i<=1;i++){c.beginPath();c.moveTo(-17,i*6);c.quadraticCurveTo(5,i*9,12,i*3);c.quadraticCurveTo(-1,i*7,-17,i*6);c.fillStyle=i===0?light:base;c.fill();c.strokeStyle=ink;c.lineWidth=1;c.stroke();}
 }else if(theme==='bolt'){
  poly(c,[[-22,-5],[-5,-4],[-8,-9],[12,0],[-5,8],[-2,3],[-22,5]],base);line(c,[[-19,0],[-9,2],[0,-2],[10,0]],light,2);
 }else if(theme==='atom'){
  c.save();c.rotate(time*4);for(let i=0;i<3;i++){c.rotate(Math.PI/3);c.beginPath();c.ellipse(0,0,13,5,0,0,TAU);c.strokeStyle=base;c.lineWidth=1.5;c.stroke();}oval(c,0,0,5,5,light);c.restore();
 }else if(theme==='foam'){
  c.save();c.rotate(time*3);poly(c,[[-8,-8],[5,-10],[11,0],[6,9],[-9,7]],base);line(c,[[-6,-6],[3,-7],[7,-1]],light,3);for(const [x,y] of [[-3,1],[4,3],[-5,5]])oval(c,x,y,1.5,2,'#7d9b9d');c.restore();
 }else{
  for(let i=3;i>=0;i--){oval(c,-i*4,Math.sin(time*8+i)*3,7+i,5+i*.5,ink);oval(c,-i*4,Math.sin(time*8+i)*3-1,5+i,3+i*.5,base);}oval(c,2,-2,3,2,light);for(let i=0;i<3;i++)oval(c,-12-i*7,Math.sin(time*9+i)*10,2,2,light);
 }
 c.restore();return true;
}
// Return the exact rectangles used by the simulation, without rounding or expanding.
export const warningZones=a=>(a?.zones||[]).map(z=>({...z}));
export function drawDangerZone(c,z,{theme='trash',shape='ground',time=0,active=false,progress=0}={}){
 const [base,highlight]=BOSS_FX_THEMES[theme],yellow=shape==='lightning',color=yellow?'#ffe36a':active?highlight:'#ffcc81',pulse=.5+.5*Math.sin(time*7);
 c.save();c.beginPath();c.rect(z.x,z.y,z.w,z.h);c.clip();
 // Full hitbox hatching includes the corners; the decorative ellipse is not
 // presented as the collision boundary. White edge teeth remain color-independent.
 c.fillStyle=active?base+'45':color+'18';c.fillRect(z.x,z.y,z.w,z.h);
 const shift=(time*14)%20;
 for(let x=z.x-z.h-20+shift;x<z.x+z.w+20;x+=20)line(c,[[x,z.y+z.h],[x+z.h,z.y]],color+(active?'60':'35'),2);
 for(let x=z.x;x<z.x+z.w;x+=18){line(c,[[x,z.y+z.h-2],[x+5,z.y+z.h-6],[x+10,z.y+z.h-2]],'#fff5d7',2);line(c,[[x,z.y+2],[x+7,z.y+2]],color,2);}
 for(const x of[z.x+1,z.x+z.w-1])line(c,[[x,z.y],[x,z.y+z.h]],'#fff5d7',2);
 const cx=z.x+z.w/2,cy=z.y+z.h/2;
 if(shape==='charge'||shape==='melee'||shape==='sweep'){
  for(let x=z.x+12;x<z.x+z.w-10;x+=32)line(c,[[x,cy-8],[x+10,cy],[x,cy+8]],color,2.5);
 }else if(yellow){
  line(c,[[cx+8,z.y+4],[cx-6,cy],[cx+5,cy],[cx-8,z.y+z.h-5]],color,3);for(let i=0;i<3;i++)spark(c,z.x+z.w*(i+.5)/3,z.y+z.h-11,3+pulse,color);
 }else{
  c.beginPath();c.ellipse(cx,cy,Math.max(1,z.w/2-5),Math.max(1,Math.min(z.h/2-4,22)),0,0,TAU);c.strokeStyle=color;c.lineWidth=2+pulse;c.stroke();
  if(!active){c.font='bold 16px system-ui';c.textAlign='center';c.fillStyle='#fff8db';c.fillText('!',cx,cy+6);}
 }
 // Theme glyphs stay inside the authoritative footprint and supplement color.
 if(!active&&!yellow){
  if(['bush','venomis'].includes(theme))for(let i=0;i<4;i++){const x=z.x+(i+.5)*z.w/4;line(c,[[x-8,cy+12],[x,cy-8],[x+7,cy+4]],base,3);poly(c,[[x,cy-3],[x-10,cy-10],[x-5,cy+3]],highlight);}
  else if(['trash','pollution','air'].includes(theme))for(let i=0;i<5;i++)oval(c,z.x+(i+.5)*z.w/5,cy+7,6+pulse*2,3,base);
  else if(['wastelander','scorpion'].includes(theme))for(let i=0;i<5;i++){const x=z.x+(i+.5)*z.w/5;line(c,[[x-8,cy+14],[x+2,cy+3],[x-3,cy-7],[x+9,cy-16]],highlight,2);}
  else if(theme==='sonic')for(let i=0;i<3;i++){c.beginPath();c.ellipse(cx,cy,18+i*13,5+i*4,0,0,TAU);c.strokeStyle=base;c.lineWidth=2;c.stroke();}
  else if(theme==='atomdust'){c.save();c.translate(cx,cy);for(let i=0;i<3;i++){c.rotate(TAU/3);c.beginPath();c.ellipse(0,0,24,8,0,0,TAU);c.strokeStyle=base;c.lineWidth=2;c.stroke();}c.restore();}
 }
 if(active){
  if(['bush','venomis'].includes(theme))for(let i=0;i<7;i++){const x=z.x+z.w*(i+.5)/7;line(c,[[x,z.y+z.h],[x-7,z.y+z.h*.6],[x+5,z.y+3]],base,5);poly(c,[[x-2,z.y+z.h*.5],[x-14,z.y+z.h*.35],[x-5,z.y+z.h*.65]],highlight);}
  else if(theme==='scorpion')for(let i=0;i<5;i++){const x=cx+(i-2)*z.w/6;line(c,[[cx,cy],[x,cy-8],[x+9,z.y+4]],highlight,2);}
  else for(let i=0;i<8;i++){const a=i*TAU/8,x=cx+Math.cos(a)*z.w*.3,y=cy+Math.sin(a)*Math.min(25,z.h*.35);line(c,[[cx,cy],[x,y]],base,4);spark(c,x,y,3,highlight);}
 }
 c.restore();
}
export function drawBossAttackFX(c,g){
 const b=g.arenaScene?.boss,a=b?.attack;if(!a||!['windup','active'].includes(b.state))return;
 for(const z of warningZones(a))drawDangerZone(c,z,{theme:bossTheme(b),shape:a.shape,time:g.time,active:b.state==='active',progress:b.age/(b.state==='windup'?a.warning:a.duration)});
 if(a.shape==='projectile'||a.shape==='wave'||a.shape==='bounce'){
  const x=b.x+b.face*(b.w/2+10),y=b.y-70;c.save();c.globalAlpha=.55;for(let i=0;i<3;i++)spark(c,x+Math.cos(g.time*4+i*2)*15,y+Math.sin(g.time*4+i*2)*15,3,BOSS_FX_THEMES[bossTheme(b)][1]);c.restore();
 }
}
