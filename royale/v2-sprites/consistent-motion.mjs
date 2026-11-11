// V2 TEST HERO ONLY: echo frames are captured from the same live Style C
// character renderer used for idle, running, jumping and power animations.
// No edits to saves, outfit data, combat timing, physics or other hero slots.
export const V2_SPEED_MOTION_VERSION='v2-canonical-speed-echo-v1';
export const SPEED_TRAIL_THRESHOLD=180;
export const SPEED_GHOST_INTERVAL=.075;
const WIDTH=256,HEIGHT=240,FOOT_X=WIDTH/2,FOOT_Y=208;
const MAX_GHOSTS=3,MAX_AGE=.29;
export function speedMotionActive(game){
 const h=game?.hero;
 return game?.testPowers===true&&!game.paused&&!!h&&!h.dead&&
   h.grounded===true&&!h.flying&&Number(game?.powers?.data?.levels?.speed)>0&&
   Math.abs(Number(h.vx)||0)>SPEED_TRAIL_THRESHOLD;
}
export const speedMotionDirection=hero=>(Number(hero?.vx)||0)<0?-1:1;
export class V2SpeedTrail{
 constructor({paintHero,makeCanvas=null,ghostCloth=null}={}){
  this.paintHero=paintHero;
  this.makeCanvas=makeCanvas||(()=>typeof document==='undefined'?null:document.createElement('canvas'));
  this.ghostCloth=ghostCloth;
  this.frames=[];this.direction=0;this.lastCapture=-Infinity;
  this.lastTime=-Infinity;this.lastX=null;this.lastY=null;
 }
 reset(){
  this.frames.length=0;this.direction=0;this.lastCapture=-Infinity;
  this.lastTime=-Infinity;this.lastX=null;this.lastY=null;
 }
 capture(pos,hero,time,look,appearance){
  if(typeof this.paintHero!=='function')return;
  let frame=this.frames.length>=MAX_GHOSTS?this.frames.shift():null;
  if(!frame){
   const canvas=this.makeCanvas();
   if(!canvas)return;
   canvas.width=WIDTH;canvas.height=HEIGHT;
   frame={canvas,ctx:canvas.getContext('2d')};
  }
  if(!frame.ctx)return;
  frame.ctx.clearRect(0,0,WIDTH,HEIGHT);
  // Same live outfit and saved cosmetic layers, with its own cape owner so
  // replaying a ghost cannot advance the visible hero's cloth simulation.
  this.paintHero(frame.ctx,FOOT_X,FOOT_Y,look,hero,time,1,
    {...appearance,cloth:this.ghostCloth||undefined,dt:0});
  Object.assign(frame,{x:pos.x,y:pos.y,time});
  this.frames.push(frame);this.lastCapture=time;
 }
 renderEchoes(ctx,time){
  for(const frame of this.frames){
   const age=time-frame.time;
   if(age<.016||age>MAX_AGE)continue;
   ctx.save();
   ctx.globalAlpha*=Math.min(.34,(MAX_AGE-age)*1.55);
   ctx.drawImage(frame.canvas,frame.x-FOOT_X,frame.y-FOOT_Y);
   ctx.restore();
  }
 }
 renderGroundMotion(ctx,pos,hero,time,face){
  const speed=Math.min(1.4,Math.abs(hero.vx||0)/400);
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  // Low streaks scroll back with time; all heights refer to physics feet.
  for(let i=0;i<6;i++){
   const phase=((time*13+i*.24)%1+1)%1;
   const reach=18+i*10+phase*(16+speed*11);
   const x=pos.x-face*reach,y=pos.y-8-i*6.5;
   ctx.globalAlpha=(.12+.28*(1-phase))*(1-i*.065);
   ctx.beginPath();ctx.moveTo(x,y);
   ctx.quadraticCurveTo(x-face*(13+speed*9),y-3,x-face*(27+speed*18),y+1);
   ctx.strokeStyle=i%2?'#75ff9c':'#59e5ef';
   ctx.lineWidth=1.5+(1-phase)*2.6;ctx.stroke();
  }
  // Dust pulses travel across the ground behind the actual planted feet.
  for(let i=0;i<4;i++){
   const phase=((time*11+i*.28)%1+1)%1;
   ctx.globalAlpha=.33*(1-phase);
   ctx.fillStyle=i%2?'#e2d8ae':'#a8e6c1';
   ctx.beginPath();
   ctx.ellipse(pos.x-face*(7+phase*(29+i*6)),pos.y-3-phase*8,
     2.4+phase*5,1.5+phase*3,0,0,Math.PI*2);
   ctx.fill();
  }
  ctx.restore();
 }
 draw(ctx,game,pos,visualHero,time,look,appearance){
  if(!speedMotionActive(game)){this.reset();return false;}
  const face=speedMotionDirection(game.hero);
  if(this.direction!==face||time<this.lastTime||
    (this.lastX!==null&&Math.abs(pos.x-this.lastX)>160)||
    (this.lastY!==null&&Math.abs(pos.y-this.lastY)>24))this.reset();
  this.direction=face;
  if(time-this.lastCapture>=SPEED_GHOST_INTERVAL)
    this.capture(pos,visualHero,time,look,appearance);
  this.renderEchoes(ctx,time);
  this.renderGroundMotion(ctx,pos,game.hero,time,face);
  this.lastTime=time;this.lastX=pos.x;this.lastY=pos.y;
  return true;
 }
}
