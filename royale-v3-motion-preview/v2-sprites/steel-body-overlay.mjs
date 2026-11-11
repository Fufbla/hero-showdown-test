// Reusable Steel Body VFX: 8 transparent sprite cels, independent of hero art.
// Sandbox-only use is enforced by renderer.v2SpriteTest. Never changes gameplay.
export const STEEL_BODY_SPRITE=Object.freeze({frames:8,cell:192,anchorX:96,anchorY:164});
const PI=Math.PI,CELL=192;
let atlas=null;
function path(ctx,pts,fill,stroke,width=1){
 ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
 if(fill){ctx.fillStyle=fill;ctx.fill();}
 if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}
}
function line(ctx,pts,color,width){
 ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function paintCel(ctx,f){
 ctx.save();ctx.translate(96,164);ctx.lineJoin='round';ctx.lineCap='round';
 const outer=[[-25,-131],[25,-131],[44,-111],[56,-86],[59,-56],[52,-33],[38,-12],[22,5],
 [-23,5],[-40,-12],[-54,-35],[-59,-56],[-56,-86],[-44,-111]];
 const glass=ctx.createLinearGradient(-60,-132,58,3);
 glass.addColorStop(0,'rgba(205,247,255,.085)');glass.addColorStop(.5,'rgba(79,131,175,.018)');
 glass.addColorStop(1,'rgba(183,231,255,.08)');
 path(ctx,outer,glass);
 const chrome=ctx.createLinearGradient(-57,-121,58,1);
 chrome.addColorStop(0,'#e2faff');chrome.addColorStop(.22,'#668caa');
 chrome.addColorStop(.47,'#fbffff');chrome.addColorStop(.7,'#5f91b6');chrome.addColorStop(1,'#f5ffff');
 ctx.globalAlpha=f===0?.65:f===1?.83:.94;
 ctx.shadowColor='#66d6ff';ctx.shadowBlur=10;
 path(ctx,outer,null,chrome,3.8);ctx.shadowBlur=0;ctx.globalAlpha=1;
 path(ctx,outer,null,'rgba(37,72,103,.85)',1);
 for(const side of [-1,1]){
   ctx.save();ctx.scale(side,1);
   const metal=ctx.createLinearGradient(33,-113,60,-24);
   metal.addColorStop(0,'rgba(250,253,255,.81)');metal.addColorStop(.3,'rgba(68,111,153,.33)');
   metal.addColorStop(.66,'rgba(169,223,251,.55)');metal.addColorStop(1,'rgba(48,103,155,.27)');
   path(ctx,[[41,-112],[53,-92],[57,-72],[48,-76],[37,-98]],metal,'#e2faff',1.4);
   path(ctx,[[57,-63],[54,-42],[42,-22],[38,-29],[48,-55]],metal,'#bceafc',1.4);
   path(ctx,[[37,-16],[22,3],[15,5],[25,-16]],metal,'#f0fcff',1.4);
   for(let i=0;i<3;i++){
     const y=-96+i*29,x=47+(i===1?8:0);
     path(ctx,[[x-7,y],[x,y-8],[x+7,y],[x+7,y+9],[x,y+13],[x-7,y+7]],
       'rgba(111,188,228,.05)',f%3===i?'#f8ffff':'rgba(154,224,254,.53)',1.2);
   }
   const cy=-113+(f%6)*18,cx=cy<-80?48:cy<-42?56:43;
   ctx.shadowColor='#b4f7ff';ctx.shadowBlur=9;
   line(ctx,[[cx-5,cy+5],[cx,cy],[cx+7,cy-7]],'#f7ffff',2.2);
   ctx.restore();
 }
 // Energy-locked silver circuit at the feet follows the actual player sprite.
 ctx.globalAlpha=.64+.1*Math.sin(f*PI/4);
 ctx.beginPath();ctx.ellipse(0,2,41,7,0,0,PI*2);
 ctx.strokeStyle='#bdf2ff';ctx.lineWidth=2.2;ctx.stroke();
 ctx.beginPath();ctx.ellipse(0,2,28,4,0,f*.22,f*.22+PI*1.5);
 ctx.strokeStyle='#60c5ed';ctx.lineWidth=2;ctx.stroke();ctx.globalAlpha=1;
 for(let i=0;i<7;i++){
   const a=i*2.3+f*.19,x=Math.cos(a)*(48+i%3*3),y=-64+Math.sin(a)*55;
   ctx.globalAlpha=.42+.15*Math.sin(f*.8+i);
   line(ctx,[[x-3,y],[x+3,y]],'#d7faff',1.2);
   line(ctx,[[x,y-3],[x,y+3]],'#f7ffff',1.2);
 }
 ctx.globalAlpha=1;
 if(f<2){
  ctx.globalAlpha=.35-f*.13;ctx.beginPath();
  ctx.ellipse(0,-63,62+f*9,70+f*11,0,0,PI*2);
  ctx.lineWidth=3;ctx.strokeStyle='#c4f7ff';ctx.stroke();
 }
 ctx.restore();
}
function spriteSheet(){
 if(atlas)return atlas;
 if(typeof document==='undefined')return null;
 const sheet=document.createElement('canvas');
 sheet.width=CELL*8;sheet.height=CELL;
 const ctx=sheet.getContext('2d');if(!ctx)return null;
 for(let f=0;f<8;f++){ctx.save();ctx.translate(f*CELL,0);paintCel(ctx,f);ctx.restore();}
 atlas=sheet;return atlas;
}
export function steelBodyFrame(age){
 if(!Number.isFinite(age)||age<0)return 0;
 if(age<.11)return 0;
 if(age<.22)return 1;
 return 2+(Math.floor((age-.22)*10)%6);
}
export function drawSteelBodyOverlay(ctx,game,pos){
 const active=game?.powers?.active?.steel;
 if(!ctx||!pos||!active||!game?.hero?.steel)return false;
 const sheet=spriteSheet();if(!sheet)return false;
 const f=steelBodyFrame(active.age??0),{anchorX,anchorY}=STEEL_BODY_SPRITE;
 ctx.save();
 // Never substitute the body pose: this sprite is composited after the hero.
 ctx.drawImage(sheet,f*CELL,0,CELL,CELL,pos.x-anchorX,pos.y-anchorY,CELL,CELL);
 ctx.restore();return true;
}
