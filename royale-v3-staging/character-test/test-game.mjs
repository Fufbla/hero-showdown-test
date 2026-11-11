// Standalone 0000000000 character sandbox. Deliberately does not import the
// live game's save, networking, inventory, skills, or multiplayer modules.
const VERSION='chibi12-20261111-1';
const $=id=>document.getElementById(id);
const canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
const stage=$('stage'),keys=new Set(),pointers=new Map(),images={};
const ACTIONS=['idle','run','jump','doubleJump','punch','kick'];
const LABELS={idle:'Idle',run:'Running',jump:'Jump',doubleJump:'Double jump',punch:'Punch',kick:'Kick'};
const DT=1/60, WORLD=2400, GRAVITY=1800, JUMP=640;
const durations={idle:2.6,run:.56,jump:.74,doubleJump:.74,punch:.4,kick:.5};
const hero={x:240,y:0,px:240,py:0,vx:0,vy:0,facing:'right',action:'idle',time:0,jumps:0,attack:null,attackTime:0,hit:false,settle:0};
const dummy={x:640,hits:0,flash:0};
let manifest,ready=false,paused=false,review=false,reviewPlaying=false,reviewTime=0;
let width=1,height=1,dpr=1,scale=1,camera=0,ground=0;
let rendered=0,ticks=0,last=0,lastRender=-100,accumulator=0,fpsCount=0,fpsStart=0,measuredFPS=0;
let gamepadAxis=0,previousPad=[],lastHud=0,pose=0;
let reviewAction='idle',reviewDirection='right',reviewPose=0;
function resize(){
 const rect=canvas.getBoundingClientRect();width=Math.max(1,rect.width);height=Math.max(1,rect.height);
 dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
 scale=Math.min(1,height/400);ground=height*.83;
}
new ResizeObserver(resize).observe(stage);resize();
function setAction(next){if(hero.action!==next){hero.action=next;hero.time=0;}}
function stopInput(){keys.clear();pointers.clear();gamepadAxis=0;document.querySelectorAll('.pressed').forEach(e=>e.classList.remove('pressed'));}
function togglePause(){paused=!paused;stopInput();$('pause').textContent=paused?'Resume':'Pause';$('pause').setAttribute('aria-pressed',String(paused));stage.classList.toggle('paused',paused&&!review);}
function jump(){
 if(!ready||paused||review||hero.jumps>=2)return;
 hero.jumps++;hero.vy=JUMP;hero.y=Math.max(.01,hero.y);hero.attack=null;
 setAction(hero.jumps===2?'doubleJump':'jump');hero.time=0;
}
function attack(type){if(!ready||paused||review||hero.attack)return;hero.attack=type;hero.attackTime=0;hero.hit=false;setAction(type);}
function moveAxis(){const left=keys.has('ArrowLeft')||keys.has('KeyA')||[...pointers.values()].includes(-1),right=keys.has('ArrowRight')||keys.has('KeyD')||[...pointers.values()].includes(1);return left||right?Number(right)-Number(left):gamepadAxis;}
function gamepad(){
 let pads;try{pads=navigator.getGamepads?.()||[];}catch{return;}
 const p=[...pads].find(Boolean);if(!p){gamepadAxis=0;return;}
 const b=p.buttons.map(x=>x.pressed);gamepadAxis=b[14]?-1:b[15]?1:Math.abs(p.axes[0]||0)>.2?p.axes[0]:0;
 if(b[0]&&!previousPad[0])jump();if(b[2]&&!previousPad[2])attack('punch');if(b[1]&&!previousPad[1])attack('kick');if(b[9]&&!previousPad[9])togglePause();previousPad=b;
}
function update(dt){
 ticks++;hero.px=hero.x;hero.py=hero.y;const axis=moveAxis();
 if(axis)hero.facing=axis<0?'left':'right';
 const target=axis*260,accel=axis?1600:2100;
 hero.vx+=Math.sign(target-hero.vx)*Math.min(Math.abs(target-hero.vx),accel*dt);
 if(Math.abs(hero.vx)<.1)hero.vx=0;
 hero.x=Math.max(90,Math.min(WORLD-90,hero.x+hero.vx*dt));
 if(hero.x===90||hero.x===WORLD-90)hero.vx=0;
 const air=hero.y>0||hero.vy>0;
 if(air){hero.vy-=GRAVITY*dt;hero.y+=hero.vy*dt;if(hero.y<=0){hero.y=0;hero.vy=0;hero.jumps=0;}}
 if(hero.attack){
  hero.attackTime+=dt;
  if(hero.attackTime>=durations[hero.attack])hero.attack=null;
  else if(!hero.hit&&hero.attackTime>=durations[hero.attack]*.48){
   const dx=dummy.x-hero.x,reach=hero.attack==='kick'?130:104;
   if(Math.abs(dx)<reach&&Math.sign(dx)===(hero.facing==='right'?1:-1)&&hero.y<80){dummy.hits++;dummy.flash=.2;hero.hit=true;}
  }
 }
 const desired=hero.attack||(hero.y>0?(hero.jumps===2?'doubleJump':'jump'):Math.abs(hero.vx)>2?'run':'idle');
 if(hero.action==='run'&&desired==='idle')hero.settle=.16;
 setAction(desired);hero.time+=dt;hero.settle=Math.max(0,hero.settle-dt);dummy.flash=Math.max(0,dummy.flash-dt);
}
function frameFor(action,time){
 if(action==='idle'){
  // Long resting hold, one quiet breath/blink, then rest. Feet stay anchored.
  const t=time%durations.idle;
  return t<1.65?0:Math.min(11,Math.floor((t-1.65)/.95*12));
 }
 if(action==='run')return Math.floor(time/durations.run*12)%12;
 if(action==='jump'||action==='doubleJump'){
  // Pose follows vertical velocity; the game supplies the trajectory, not atlas offsets.
  if(hero.vy>500)return Math.min(3,Math.floor(time/.035));
  if(hero.vy>80)return Math.min(6,3+Math.floor((500-hero.vy)/140));
  if(hero.vy>-100)return 7;
  return Math.min(11,8+Math.floor((-hero.vy-100)/155));
 }
 return Math.min(11,Math.floor(hero.attackTime/durations[action]*12));
}
function background(){
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0a192b';ctx.fillRect(0,0,width,height);
 const grad=ctx.createLinearGradient(0,0,0,ground);grad.addColorStop(0,'#081527');grad.addColorStop(1,'#15354a');ctx.fillStyle=grad;ctx.fillRect(0,0,width,ground);
 ctx.strokeStyle='#31556d44';ctx.lineWidth=1;
 const spacing=80*scale,offset=(-camera*.25*scale)%spacing;
 for(let x=offset;x<width;x+=spacing){ctx.beginPath();ctx.moveTo(x,35);ctx.lineTo(x,ground);ctx.stroke();}
 for(let y=60;y<ground;y+=60*scale){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();}
 ctx.fillStyle='#102a3b';ctx.fillRect(0,ground,width,height-ground);
 ctx.fillStyle='#294e60';ctx.fillRect(0,ground,width,7*scale);
 ctx.fillStyle='#75bfca';ctx.fillRect(0,ground,width,1.5);
 ctx.strokeStyle='#35617470';for(let x=(-camera*scale)%(120*scale);x<width;x+=120*scale){ctx.beginPath();ctx.moveTo(x,ground+8);ctx.lineTo(x-35*scale,height);ctx.stroke();}
 ctx.fillStyle='#527d9270';ctx.font=`${Math.max(9,13*scale)}px system-ui`;ctx.textAlign='center';
 const mark=(Math.floor(camera/250))*250;for(let x=mark;x<camera+width/scale+250;x+=250)ctx.fillText(String(x),(x-camera)*scale,ground+30*scale);
}
function drawDummy(){
 const x=(dummy.x-camera)*scale,y=ground,s=scale;if(x<-100||x>width+100)return;
 ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 ctx.fillStyle='#07121c80';ctx.beginPath();ctx.ellipse(0,2,35,7,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#4e7183';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,-80);ctx.lineTo(0,0);ctx.moveTo(-25,0);ctx.lineTo(25,0);ctx.stroke();
 ctx.fillStyle=dummy.flash?'#bce7ef':'#395f75';ctx.beginPath();ctx.roundRect(-27,-115,54,69,14);ctx.fill();
 ctx.strokeStyle='#90bfcb';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,-83,15,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,-83,5,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#8ab3c7';ctx.font='10px system-ui';ctx.textAlign='center';ctx.fillText('PRACTICE',0,-132);ctx.restore();
}
function drawSprite(action,dir,index,x,y){
 const img=images[action],cw=manifest.cellWidth,ch=manifest.cellHeight;
 const s=.64*scale;
 ctx.drawImage(img,index*cw,dir==='left'?ch:0,cw,ch,x-manifest.anchorX*s,y-manifest.anchorY*s,cw*s,ch*s);
}
function render(now,alpha){
 const hx=hero.px+(hero.x-hero.px)*alpha,hy=hero.py+(hero.y-hero.py)*alpha;
 camera=review?0:Math.max(0,Math.min(WORLD-width/scale,hx-width/scale*.4));
 background();if(!review)drawDummy();
 let action=review?reviewAction:hero.action,dir=review?reviewDirection:hero.facing;
 pose=review?reviewPose:frameFor(action,hero.time);
 const x=review?width/2:(hx-camera)*scale,y=review?ground:ground-hy*scale;
 ctx.fillStyle='#03121a99';ctx.beginPath();ctx.ellipse(x,ground+2,28*scale/(1+hy/180),6*scale/(1+hy/180),0,0,Math.PI*2);ctx.fill();
 drawSprite(action,dir,pose,x,y);
 if(now-lastHud>100){
  $('action-name').textContent=LABELS[action]+' · '+dir;
  $('frame-status').textContent='Pose '+(pose+1)+' / 12';
  $('fps').textContent=measuredFPS?Math.round(measuredFPS)+' FPS · 60 target':'60 FPS target';
  $('hits').textContent='Dummy hits '+dummy.hits;lastHud=now;
 }
 rendered++;fpsCount++;if(now-fpsStart>800){measuredFPS=fpsCount*1000/(now-fpsStart);fpsCount=0;fpsStart=now;}
}
function loop(now){
 requestAnimationFrame(loop);if(!ready)return;
 if(!last){last=now;fpsStart=now;}
 const elapsed=Math.min(.1,(now-last)/1000);last=now;gamepad();
 if(!paused&&!review){accumulator+=elapsed;while(accumulator>=DT){update(DT);accumulator-=DT;}}
 else{accumulator=0;hero.px=hero.x;hero.py=hero.y;}
 if(review&&reviewPlaying&&!paused){reviewTime+=elapsed;reviewPose=Math.floor(reviewTime/durations[reviewAction]*12)%12;$('pose').value=reviewPose;$('pose-number').value=(reviewPose+1)+' / 12';}
 // Limit drawing to approximately 60 Hz, while elapsed time drives simulation.
 if(now-lastRender>=1000/60-1){render(now,paused||review?1:accumulator/DT);lastRender=now;}
}
for(const [id,value] of [['left',-1],['right',1]]){
 const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,value);b.classList.add('pressed');});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{pointers.delete(e.pointerId);b.classList.remove('pressed');});
}
$('jump').addEventListener('pointerdown',e=>{e.preventDefault();jump();});
$('punch').addEventListener('pointerdown',e=>{e.preventDefault();attack('punch');});
$('kick').addEventListener('pointerdown',e=>{e.preventDefault();attack('kick');});
$('pause').onclick=togglePause;$('retry').onclick=()=>location.reload();
window.addEventListener('keydown',e=>{
 if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
 const handled=['ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW','Space','KeyJ','KeyK','KeyZ','KeyX','KeyP','Escape'].includes(e.code);
 if(!handled)return;e.preventDefault();keys.add(e.code);
 if(e.repeat)return;
 if(['Space','ArrowUp','KeyW'].includes(e.code))jump();
 if(['KeyJ','KeyZ'].includes(e.code))attack('punch');if(['KeyK','KeyX'].includes(e.code))attack('kick');
 if(['KeyP','Escape'].includes(e.code))togglePause();
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',stopInput);
document.addEventListener('visibilitychange',()=>{stopInput();last=0;accumulator=0;});
$('review-toggle').onclick=()=>{
 review=!review;reviewPlaying=false;stopInput();$('review').hidden=!review;$('review-toggle').setAttribute('aria-expanded',String(review));$('review-play').textContent='Play poses';$('review-play').setAttribute('aria-pressed','false');stage.classList.toggle('paused',paused&&!review);
};
$('review-action').onchange=e=>{reviewAction=e.target.value;reviewTime=0;reviewPose=0;$('pose').value=0;$('pose-number').value='1 / 12';};
$('review-direction').onchange=e=>reviewDirection=e.target.value;
$('pose').oninput=e=>{reviewPose=Number(e.target.value);reviewPlaying=false;$('pose-number').value=(reviewPose+1)+' / 12';$('review-play').textContent='Play poses';$('review-play').setAttribute('aria-pressed','false');};
$('review-play').onclick=()=>{reviewPlaying=!reviewPlaying;reviewTime=reviewPose/12*durations[reviewAction];$('review-play').textContent=reviewPlaying?'Hold pose':'Play poses';$('review-play').setAttribute('aria-pressed',String(reviewPlaying));};
const qa=new URLSearchParams(location.search).has('qa');
Object.defineProperty(window,'__chibiTest',{value:Object.freeze({
 get state(){return {...hero,ready,paused,review,reviewAction,reviewDirection,pose,rendered,ticks,measuredFPS,dummyHits:dummy.hits,version:VERSION,actions:ACTIONS,frames:12};},
 get assets(){return Object.fromEntries(ACTIONS.map(a=>[a,{width:images[a]?.naturalWidth||0,height:images[a]?.naturalHeight||0,src:images[a]?.src}]));},
 ...(qa?{reset(){Object.assign(hero,{x:240,y:0,px:240,py:0,vx:0,vy:0,facing:'right',action:'idle',time:0,jumps:0,attack:null,attackTime:0});stopInput();},setPosition(x){hero.x=hero.px=x;}}:{})
})});
async function start(){
 try{
  const r=await fetch('./manifest.json?v='+VERSION);if(!r.ok)throw Error('Animation manifest unavailable');manifest=await r.json();
  if(manifest.frames!==12)throw Error('Expected 12 frames per direction');
  await Promise.all(ACTIONS.map(async action=>{
   const im=new Image();im.decoding='async';im.src='./'+manifest.actions[action].src+'?v='+VERSION;
   await im.decode();if(im.naturalWidth!==manifest.cellWidth*12||im.naturalHeight!==manifest.cellHeight*2)throw Error('Invalid sprite dimensions: '+action);images[action]=im;
  }));
  ready=true;$('loading').hidden=true;requestAnimationFrame(loop);
 }catch(error){console.error(error);$('load-message').textContent=error.message+'. Reload to try again.';$('retry').hidden=false;}
}
start();
