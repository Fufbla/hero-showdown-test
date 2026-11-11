// V2 TEST ONLY: lightweight effects accompanying imported generated body poses.
// Combat hitboxes, cooldowns, projectiles, player movement and equipment remain
// owned by the original simulation. None of this changes gameplay outcomes.
export const V2_POWER_PREVIEW_VERSION='v2-power-vfx-prototype-v2';
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
  speed:Number(powers.speed)>0&&Math.abs(h.vx||0)>160,
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
   // Short-lived streaks sweep backwards from the actual feet. Direction
   // comes from movement velocity, so left/right both show proper trailing.
   const direction=Math.sign(h.vx||0)||face;
   for(let i=0;i<7;i++){
    const phase=((time*12.5+i*.23)%1+1)%1;
    const back=11+i*10+phase*39;
    const sy=y-(5+i*5.1);
    const sx=x-direction*back;
    ctx.globalAlpha=(.12+.47*(1-phase))*(1-i*.055);
    stroke(ctx,[
      [sx,sy],[sx-direction*(15+17*phase),sy-1.7]
    ],i%2?'#53dafa':'#b4f8ce',1.5+(1-phase)*1.8);
   }
   // Dust puffs remain on the platform, not floating at chest height.
   for(let i=0;i<3;i++){
    const phase=((time*9.5+i*.37)%1+1)%1;
    ctx.globalAlpha=.32*(1-phase);
    ctx.beginPath();
    ctx.ellipse(x-direction*(9+phase*(24+i*8)),y-3-phase*5,
      2.1+phase*4,1.2+phase*2.2,0,0,pi*2);
    ctx.fillStyle=i%2?'#a3f4cd':'#e3d5ac';ctx.fill();
   }
   ctx.globalAlpha=1;
  }
  if(flags.flight){
   for(let i=0;i<2;i++){
    stroke(ctx,[[x-12+i*20,y+2],[x-16+i*20,y+20+Math.sin(time*18+i)*4]],'#70d9ff',2.3);
   }
  }
  if(flags.fireball){
   const age=Math.max(0,h.castAge||0),charge=Math.max(0,1-age/.24);
   const fx=x+face*(39+charge*10),fy=y-44;
   const r=4+charge*4+Math.sin(time*22)*1.2;
   ctx.fillStyle='#ffc34e';ctx.beginPath();ctx.arc(fx,fy,r,0,2*pi);ctx.fill();
   ring(ctx,fx,fy,r+3,r+3,'#ff6c24',time*14,1.5+charge);
   for(let i=0;i<3;i++){
    const a=time*12+i*2*pi/3;
    stroke(ctx,[[fx+Math.cos(a)*r,fy+Math.sin(a)*r],
     [fx+Math.cos(a)*(r+6+charge*7),fy+Math.sin(a)*(r+6+charge*7)]],
     '#ffdd70',1+charge);
   }
  }
  if(flags.strength){
   const age=Math.max(0,h.attack?.age||0),strike=Math.min(1,age/.24);
   const px=x+face*(42+strike*13),py=y-45;
   for(let i=0;i<4;i++)stroke(ctx,[[px-face*(5+i*3),py-13+i*4],
     [px+face*(4+i*3),py-3+i*4],[px+face*(12+i*3),py-15+i*5]],'#ffe45a',1.8+strike*1.4);
   ring(ctx,px,py,6+strike*15,9+strike*12,'#ffe45a',time*10,1+strike*2);
  }
  if(flags.superKick){
   const age=Math.max(0,h.attack?.age||0),combo=h.attack?.comboIndex||0;
   const sweep=Math.sin(age*13+combo*1.5)*.4;
   ctx.beginPath();ctx.arc(x+face*(23+sweep*6),y-27,27,-1.15+sweep,.55+sweep);
   ctx.strokeStyle='#ffd54d';ctx.lineWidth=3.5;ctx.stroke();
   ring(ctx,x+face*32,y-30,12+Math.abs(sweep)*10,15,'#fff1a5',time*7,1.6);
  }
  if(flags.steel){
   const pulse=Math.sin(time*5)*2;
   ctx.globalAlpha=.48;
   ring(ctx,x,y-58,40+pulse,59+pulse,'#6dd5ff',time*.8,2.5);
   ring(ctx,x,y-58,32-pulse,50-pulse,'#c9f6ff',time*.8+pi,1.5);
   ctx.globalAlpha=1;
  }
  if(flags.roots){
   for(let i=-2;i<=2;i++){
    const bx=x+i*15,reach=22+5*Math.sin(time*2+i*.8);
    stroke(ctx,[[bx,y],[bx+Math.sin(time*3+i)*5,y-reach*.55],
      [bx+i*3,y-reach]],'#75d84b',2.7);
   }
  }
  if(flags.whirlwind){
   for(let i=0;i<4;i++){
    const ry=9+i*6,offset=Math.sin(time*6+i)*9;
    ring(ctx,x+offset,y-12-i*20,22+i*4+Math.sin(time*8+i)*2,
      ry,'#52bdff',time*7+i,2);
   }
  }
  if(flags.agility){
   const dodge=Math.max(0,1-(h.dodgeAge??1)/.24);
   ctx.globalAlpha=.25+.5*dodge;
   for(let i=1;i<=3;i++){
    const trail=16+i*7+dodge*15;
    stroke(ctx,[[x-face*trail,y-30],[x-face*(trail+7),y-74]],'#4cbaff',2);
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
