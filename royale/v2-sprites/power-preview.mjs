// V2 TEST ONLY: lightweight effects accompanying imported generated body poses.
// Combat hitboxes, cooldowns, projectiles, player movement and equipment remain
// owned by the original simulation. None of this changes gameplay outcomes.
export const V2_POWER_PREVIEW_VERSION='v2-power-vfx-prototype-v1';
const pi=Math.PI;
function stroke(ctx,points,color,width=2){
 ctx.beginPath();ctx.moveTo(...points[0]);
 for(const p of points.slice(1))ctx.lineTo(...p);
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
function ring(ctx,x,y,rx,ry,color,t,width=2){
 ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,t,t+pi*1.8);
 ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
}
export function v2PowerEffectFlags(game){
 const h=game?.hero||{};
 const powers=game?.powers||{};
 const active=powers.active||{};
 return {
  fireball:(h.castAge??100)<.24,
  strength:h.attack?.power==='strength',
  superKick:h.attack?.power==='superKick',
  steel:!!h.steel,
  roots:!!active.roots,
  whirlwind:!!active.whirlwind,
  agility:!!h.agile,
  flight:!!h.flying,
  speed:Number(powers.speed)>0&&Math.abs(h.vx||0)>180,
  villainMerge:!!game?.legendary?.active&&!!(game?.mergeEffects?.length||game?.mergeShots?.length)
 };
}
export function drawV2PowerPreview(ctx,game,pos,time=0){
 const flags=v2PowerEffectFlags(game);
 if(!Object.values(flags).some(Boolean))return flags;
 const h=game.hero,face=h.face<0?-1:1,x=pos.x,y=pos.y;
 ctx.save();
 try{
  if(flags.speed){
   ctx.globalAlpha=.42;
   for(let i=0;i<4;i++)stroke(ctx,[
    [x-face*(20+i*13),y-40-i*11],
    [x-face*(56+i*13),y-40-i*11]
   ],i%2?'#4bd7ff':'#b3ecff',2.2);
   ctx.globalAlpha=1;
  }
  if(flags.flight){
   for(let i=0;i<2;i++){
    stroke(ctx,[[x-12+i*20,y+2],[x-16+i*20,y+20+Math.sin(time*18+i)*4]],'#70d9ff',2.3);
   }
  }
  if(flags.fireball){
   const fx=x+face*28,fy=y-67;
   const r=5+Math.sin(time*22)*1.5;
   ctx.fillStyle='#ffc34e';ctx.beginPath();ctx.arc(fx,fy,r,0,2*pi);ctx.fill();
   ring(ctx,fx,fy,r+3,r+3,'#ff6c24',time*14,1.5);
  }
  if(flags.strength){
   const px=x+face*42,py=y-61;
   for(let i=0;i<4;i++)stroke(ctx,[[px-face*(5+i*3),py-13+i*4],
     [px+face*(4+i*3),py-3+i*4],[px+face*(12+i*3),py-15+i*5]],'#ffe45a',2.4);
  }
  if(flags.superKick){
   ctx.beginPath();ctx.arc(x+face*24,y-27,27,-.95,.65);
   ctx.strokeStyle='#ffd54d';ctx.lineWidth=4;ctx.stroke();
  }
  if(flags.steel){
   ctx.globalAlpha=.48;
   ring(ctx,x,y-58,40,59,'#6dd5ff',time*.8,2.5);
   ring(ctx,x,y-58,32,50,'#c9f6ff',time*.8+pi,1.5);
   ctx.globalAlpha=1;
  }
  if(flags.roots){
   for(let i=-2;i<=2;i++){
    const bx=x+i*15;
    stroke(ctx,[[bx,y],[bx+Math.sin(time*3+i)*5,y-16],[bx+i*3,y-28]],'#75d84b',2.7);
   }
  }
  if(flags.whirlwind){
   for(let i=0;i<4;i++){
    const ry=9+i*6,offset=Math.sin(time*5+i)*7;
    ring(ctx,x+offset,y-12-i*20,22+i*4,ry,'#52bdff',time*7+i,2);
   }
  }
  if(flags.agility){
   ctx.globalAlpha=.45;
   for(let i=1;i<=3;i++){
    stroke(ctx,[[x-face*i*16,y-30],[x-face*i*23,y-74]],'#4cbaff',2);
   }
   ctx.globalAlpha=1;
  }
  if(flags.villainMerge){
   for(let i=0;i<6;i++){
    const a=time*3+i*pi/3;
    stroke(ctx,[[x+Math.cos(a)*32,y-55+Math.sin(a)*26],
      [x+Math.cos(a+.3)*44,y-55+Math.sin(a+.3)*36]],'#70e853',2.5);
   }
  }
 }finally{ctx.restore();}
 return flags;
}
