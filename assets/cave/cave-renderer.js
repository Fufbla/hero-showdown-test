(function(){'use strict';
const {clamp,random,outroOpacity}=HealthiaCaveCore;
const TAU=Math.PI*2;
// Vee's source poses have uneven row spacing. These local crop starts exclude
// the preceding pose's boot, while retaining each pose's hair and floor pivot.
const VEE_FRAME_TOPS=[0,0,0,0,82,85,86,84,95,88,86,91];
function polygon(g,p,fill,stroke){g.beginPath();p.forEach((q,i)=>i?g.lineTo(q.x,q.y):g.moveTo(q.x,q.y));g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=1;g.stroke();}}
class Renderer{
 constructor(canvas,images){this.canvas=canvas;this.g=canvas.getContext('2d',{alpha:true});this.images=images;this.width=1280;this.height=720;this.particles=[];this.shake=0;this.hurt=0;this.endAge=0;this.clock=0;this.runningCycle=0;this.rng=random(71319);this.pixelRatio=1;this.lastRender=0;
  this.tunnelScene=new HealthiaCaveTunnel(images);canvas.parentNode.insertBefore(this.tunnelScene.canvas,canvas);this.ripples=[];this.footfall=0;
  this.motes=Array.from({length:50},()=>({x:this.rng(),y:this.rng(),z:this.rng(),size:this.rng()*1.8+.5}));
 }
 resize(w,h,dpr){this.width=w;this.height=h;this.pixelRatio=Math.min(1.65,dpr||1,Math.sqrt(2100000/(w*h)));this.canvas.width=Math.round(w*this.pixelRatio);this.canvas.height=Math.round(h*this.pixelRatio);this.g.setTransform(this.pixelRatio,0,0,this.pixelRatio,0,0);this.tunnelScene.resize(w,h,this.pixelRatio);}
 reset(){this.particles.length=0;this.shake=0;this.hurt=0;this.endAge=0;this.runningCycle=0;this.ripples=[];this.footfall=0;this.fallLanded=false;this.tunnelScene.reset();}
 project(x,y,z){const h=this.height,w=this.width,s=h*.85/(z+420),n=Math.min(1,w/h);return{x:w/2+x*s*n,y:h*.44+y*s,s:s*n};}
 heroBox(model=this.currentModel){
  const h=this.height,w=this.width,who=model?.character||'summy',age=model?.outroAge||0;
  const recede=1/(1+age*1.35),base=who==='vee'?Math.min(h*.31,w*.44):h*(who==='sadie'?.31:.33),body=base*recede,scale=body/360;
  const feet=h*.43+(h*(h<520?.80:.835)-h*.43)*recede,center=w*.5+(who==='vee'?w*.3*((model.lanePosition??1)-1)*recede:0);
  return{x:center-192*scale,y:feet-430*scale,w:384*scale,h:448*scale,feet,scale,body,center};
 }
 punchTarget(model){
  const b=this.heroBox(model),radius=Math.min(b.body*.33,this.width*.17);
  const rock=model.rocks.find(r=>!r.resolved&&r.hitAt===null&&model.time>=r.punchAt&&model.time<r.impactAt);
  return{x:Math.min(this.width-radius-10,b.center+b.body*.36),y:b.feet-b.body*.9,radius,ready:!!rock,remaining:rock?clamp((rock.impactAt-model.time)/(rock.impactAt-rock.punchAt),0,1):0};
 }
 groundRockPosition(r,model){
  const h=this.height,w=this.width,age=model.time-r.spawn,speed=r.spawnSpeed||6.4,total=r.warning+r.fall+(r.approach||0),lead=4.7+speed*total;
  const spawn=r.spawnDistance??model.distance-age*speed,z=Math.max(4.7,lead-(model.distance-spawn)),step=.3*w*4.7/(h*.88),laneX=model.character==='vee'?(r.lane-1)*step:0;
  const shadow=this.tunnelScene.project(laneX,.04,z);
  if(model.character==='vee'){
   const size=Math.min(w*.28,h*.4,shadow.s*Math.min(3.25,step));
   return{x:shadow.x,y:shadow.y-size*.43,size,rotation:0,warning:0,fall:0,ceiling:shadow,shadow,z,ground:true};
  }
  const warning=clamp(age/r.warning,0,1),fall=clamp((model.time-r.fallAt)/r.fall,0,1),roof=this.tunnelScene.roof(laneX,spawn+lead),ceiling=this.tunnelScene.project(laneX,roof,z);
  const target=this.punchTarget(model),velocity=target.radius*2/(r.impactAt-r.punchAt),startY=target.y+target.radius-velocity*r.fall;
  // One velocity for the whole descent: entering the target never brakes the rock.
  // The reticle crossings and model collision window share the same exact boundaries.
  const settling=warning*warning*(3-2*warning),anchor={x:ceiling.x+(target.x-ceiling.x)*settling,y:ceiling.y+(startY-ceiling.y)*settling};
  const x=model.time>=r.fallAt?target.x:anchor.x,y=model.time>=r.fallAt?startY+velocity*(model.time-r.fallAt):anchor.y;
  const size=Math.min(h*.29,w*.44,Math.max(h*.12,shadow.s*2.65));
  return{x:x+(model.time>=r.fallAt?0:Math.sin(age*47)*warning*2),y,size,rotation:fall*.23,warning,fall,ceiling:model.time>=r.fallAt?{x:target.x,y:startY}:anchor,shadow,z,ready:model.time>=r.punchAt&&model.time<r.impactAt};
 }

 rockPosition(r,model){if(model.character&&model.character!=='summy')return this.groundRockPosition(r,model);const w=this.width,h=this.height,age=model.time-r.spawn,warning=clamp(age/r.warning,0,1),fall=clamp((model.time-r.fallAt)/r.fall,0,1),speed=r.spawnSpeed||6.4,lead=6.8+speed*(r.warning+r.fall),spawn=r.spawnDistance??model.distance-age*speed,z=Math.max(4.7,lead-(model.distance-spawn)-2.1*fall*fall);
  const portrait=w/h<.85,spread=Math.min(6.3,w/h*(portrait?3.6:5.1)),laneX=(r.lane-1)*spread,roof=this.tunnelScene.roof(laneX,spawn+lead),ceiling=this.tunnelScene.project(laneX,roof,z),q=this.tunnelScene.project(laneX*(1-.8*fall*fall),roof-(roof-.12)*fall*fall,z),shadow=this.tunnelScene.project(laneX*(1-.8*fall*fall),.06,z),sway=Math.sin(age*(25+warning*32)+r.id)*warning*3;
  // Keep the ceiling root above the pointed tip and clear of the HUD / running hero.
  const safeTop=Math.min(h*.19,h<520?70:portrait?92:98);
  const height=Math.min(h*.26,Math.min(w*(portrait?.135:.21),h*.23,Math.max(h*.12,2.1*q.s))*1.9,h*.44-Math.max(safeTop,ceiling.y)-5),width=height/2,size=height;
  const lift=Math.max(0,safeTop+height*21/512-ceiling.y);
  return{x:q.x+(fall?0:sway),y:q.y+height*(.5-21/512)+warning*5+lift*(1-fall*fall),size,width,height,stalactite:true,rotation:fall*(r.lane===0?-.10:.09)+Math.sin(age*40)*warning*.02,warning,fall,ceiling:{...ceiling,y:ceiling.y+lift+warning*5},shadow,z};
 }
 burst(x,y,count,kind){for(let i=0;i<count&&this.particles.length<190;i++){let a=this.rng()*TAU,speed=35+this.rng()*180;this.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-30,life:.35+this.rng()*.65,max:1,size:kind==='dust'?12+this.rng()*27:3+this.rng()*12,rot:this.rng()*TAU,spin:this.rng()*8-4,kind,index:i%8});}}
 event(e,model){const r=model.rocks.find(r=>r.id===e.id),p=r?this.rockPosition(r,model):null;if(e.type==='shatter'&&p){this.burst(p.x,p.y,23,'stone');this.burst(p.x,p.y,14,'dust');this.shake=Math.max(this.shake,.12);}if(e.type==='impact'&&p){this.burst(p.x,this.height*.79,19,'stone');this.burst(p.x,this.height*.80,12,'dust');this.shake=.2;if(e.hurt)this.hurt=.44;}if(e.type==='defeat'||e.type==='complete')this.endAge=0;}
 update(dt,model){this.currentModel=model;this.clock+=dt;if(model.state==='running'||model.state==='outro'){this.runningCycle+=dt*(model.speed||6.4)/(3.6+(model.speed||6.4)*.05)*8;const step=Math.floor(this.runningCycle/4);if(step>this.footfall){const b=this.heroBox();this.ripples.push({x:b.center+(step%2?1:-1)*b.body*.055,y:b.feet,life:.28});this.footfall=step;}for(const r of model.rocks)if(!r.resolved&&r.state==='warning'&&this.rng()<dt*(9+model.phase*5)){const p=this.rockPosition(r,model);this.particles.push({x:p.x+(this.rng()-.5)*p.size*.75,y:p.stalactite?p.ceiling.y+5:p.y+p.size*.3,vx:(this.rng()-.5)*15,vy:28,life:.6,max:.6,size:this.rng()*3+1,rot:0,spin:2,kind:'pebble',index:r.id%8});}}
  this.shake=Math.max(0,this.shake-dt);this.hurt=Math.max(0,this.hurt-dt);
  if(['defeat','complete'].includes(model.state))this.endAge+=dt;
  if(model.state==='defeat'&&this.endAge>=.66&&!this.fallLanded){this.fallLanded=true;const b=this.heroBox(model);this.burst(b.center,b.feet-8,16,'dust');this.shake=.075;}
  for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=dt*(p.kind==='dust'?-15:330);p.rot+=p.spin*dt;}
  this.particles=this.particles.filter(p=>p.life>0).slice(-190);for(const r of this.ripples)r.life-=dt;this.ripples=this.ripples.filter(r=>r.life>0).slice(-6);
 }
 rockImage(index,x,y,size,rotation=0,alpha=1){const im=this.images.rocks;if(!im)return;const g=this.g;g.save();g.globalAlpha*=alpha;g.translate(x,y);g.rotate(rotation);g.drawImage(im,index%4*256,Math.floor(index/4)*256,256,256,-size/2,-size/2,size,size);g.restore();}
 stalactiteImage(index,p){const im=this.images.stalactites;if(!im)return;const g=this.g;g.save();g.translate(p.x,p.y);g.rotate(p.rotation);g.drawImage(im,index*256,0,256,512,-p.width/2,-p.height/2,p.width,p.height);g.restore();}
 tunnel(model){const g=this.g,w=this.width,h=this.height;this.tunnelScene.shake=this.shake;this.tunnelScene.draw(model,this.clock,g);if(model.character==='vee')this.lanes(model);
  // World-space dust has the same optical flow as the walls and ceiling.
  for(const m of this.motes){const z=(m.z*85-model.distance%85+85)%85+1,p=this.tunnelScene.project((m.x-.5)*13,m.y*5.7,z),size=Math.min(2.5,Math.max(.4,p.s*.014));if(p.x<0||p.x>w||p.y<0||p.y>h)continue;g.globalAlpha=Math.min(.22,(1-z/90)*.24);g.fillStyle='#c6b9a0';g.fillRect(p.x,p.y,size,size);}g.globalAlpha=1;
 }
 lanes(model){const g=this.g,w=this.width,h=this.height,step=.3*w*4.7/(h*.88);g.save();g.lineWidth=1.1;
  // Subtle ground seams reveal the three running lanes without covering the cave.
  for(const edge of[-1.5,-.5,.5,1.5]){g.beginPath();for(let i=0;i<=22;i++){const z=4.7+i*1.5,p=this.tunnelScene.project(edge*step,.035,z);i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);}g.strokeStyle='#9abbb032';g.stroke();}
  const b=this.heroBox(model);g.strokeStyle='#8affb17a';g.lineWidth=2;g.beginPath();g.ellipse(b.center,b.feet+3,b.body*.17,b.body*.026,0,0,TAU);g.stroke();g.restore();
 }
 hazards(model){const g=this.g,w=this.width,h=this.height;
  if(model.state==='defeat')return;
  for(const r of model.rocks){if(r.resolved)continue;const p=this.rockPosition(r,model);
   // Dark socket and fracture edges visually anchor the boulder to the ceiling.
   if(!p.ground){const root=p.stalactite?p.width:p.size;g.save();g.translate(p.ceiling.x,p.ceiling.y);g.fillStyle='#030508cc';g.beginPath();g.ellipse(0,p.stalactite?0:-p.size*.25,root*.58,root*(p.stalactite?.22:.4),0,0,TAU);g.fill();
   g.lineWidth=1.5;g.strokeStyle='#c4a77c';g.globalAlpha=.35+p.warning*.55;
   for(let k=0;k<6;k++){const a=k*TAU/6+r.id*.3;g.beginPath();g.moveTo(Math.cos(a)*root*.37,Math.sin(a)*root*.30);g.lineTo(Math.cos(a+.08)*root*.55,Math.sin(a+.08)*root*.45);g.lineTo(Math.cos(a)*root*(.6+p.warning*.14),Math.sin(a)*root*.52);g.stroke();}
   g.restore();}
   if(r.state==='warning'){const gradient=g.createRadialGradient(p.x,p.y,p.size*.2,p.x,p.y,p.size);gradient.addColorStop(0,'rgba(192,144,83,'+(.13+p.warning*.14)+')');gradient.addColorStop(1,'rgba(135,99,51,0)');g.fillStyle=gradient;g.fillRect(p.x-p.size,p.y-p.size,p.size*2,p.size*2);}
   g.save();g.globalAlpha=.2+p.fall*.24;g.fillStyle='#020406';g.beginPath();g.ellipse(p.shadow.x,p.shadow.y,(p.width||p.size)*(.35+p.fall*.2),p.size*.07,0,0,TAU);g.fill();g.restore();
   if(p.stalactite)this.stalactiteImage(r.id%4,p);else this.rockImage(r.id%8,p.x,p.y,p.size,p.rotation);

   if(r.state==='falling'){g.strokeStyle='#ac967e33';g.lineWidth=2;for(let j=0;j<3;j++){g.beginPath();g.moveTo(p.x+(j-1)*p.size*.3,p.y-p.size*.55);g.lineTo(p.x+(j-1)*p.size*.3,p.y-p.size*(.65+p.fall*.4));g.stroke();}}
  }
 }
 drawPunchTarget(model){
  if(model.character!=='sadie'||!['running','paused'].includes(model.state))return;
  const g=this.g,t=this.punchTarget(model),r=t.radius;
  g.save();g.translate(t.x,t.y);g.lineWidth=t.ready?3:1.6;g.strokeStyle=t.ready?'#fff0a8':'#e1c77b88';
  g.shadowColor='#e6bd4e';g.shadowBlur=t.ready?10:0;
  for(let i=0;i<4;i++){g.save();g.rotate(i*TAU/4);g.beginPath();g.moveTo(-r*.35,-r);g.lineTo(-r*.78,-r);g.quadraticCurveTo(-r,-r,-r,-r*.78);g.lineTo(-r,-r*.35);g.stroke();g.restore();}
  g.shadowBlur=0;g.lineWidth=1.4;g.globalAlpha=t.ready?.9:.35;g.beginPath();g.arc(0,0,r*.76,0,TAU);g.stroke();
  if(t.ready){g.globalAlpha=1;g.lineWidth=3;g.beginPath();g.arc(0,0,r*1.13,-Math.PI/2,-Math.PI/2+TAU*t.remaining);g.stroke();g.font='bold '+Math.max(10,Math.min(13,r*.28))+'px Arial';g.textAlign='center';g.fillStyle='#fff2b7';g.fillText('PUNCH',0,-r-9);}
  g.restore();
 }
 drawDefeat(model){
  const g=this.g,b=this.heroBox(model),sheet=this.images[(model.character||'summy')+'Fall'];if(!sheet)return;
  const frame=Math.min(5,Math.floor(this.endAge/.22)),scale=b.body/420,cw=640,ch=512;
  // Six separately drawn poses share a floor pivot and a single physical scale.
  // The body gets lower as it falls; the standing sprite is never tilted or squashed.
  const settle=clamp(this.endAge/1.1,0,1),margin=Math.min(this.width/2,285*scale+8),center=b.center+(clamp(b.center,margin,this.width-margin)-b.center)*settle;
  g.save();g.fillStyle='#0009';g.beginPath();g.ellipse(center,b.feet-3,b.body*(.18+settle*.24),b.body*(.025+settle*.035),0,0,TAU);g.fill();
  g.drawImage(sheet,frame%3*cw,Math.floor(frame/3)*ch,cw,ch,center-320*scale,b.feet-480*scale,cw*scale,ch*scale);g.restore();
 }
 drawHero(model){if(model.state==='defeat'){this.drawDefeat(model);return;}if(model.character&&model.character!=='summy'){this.drawOtherHero(model);return;}const g=this.g,b=this.heroBox(model),cw=384,ch=448,frame=Math.floor(this.runningCycle)%8,run=this.images.run;
  if(!run)return;
  g.save();for(const r of this.ripples){g.strokeStyle='rgba(160,190,178,'+(r.life*.7)+')';g.lineWidth=1;g.beginPath();g.ellipse(r.x,r.y,(.28-r.life)*65+2,(.28-r.life)*13+1,0,0,TAU);g.stroke();}g.fillStyle='#0008';g.beginPath();g.ellipse(this.width*.5,b.feet+2,b.body*.18,b.body*.025,0,0,TAU);g.fill();
  // Damp floor reflection uses the same registered frame and fades quickly below the boots.
  g.save();g.translate(this.width*.5,b.feet+3);g.scale(1,-.22);g.globalAlpha=.11;g.drawImage(run,frame%4*cw,Math.floor(frame/4)*ch,cw,ch,-192*b.scale,b.y-b.feet,b.w,b.h);g.restore();
  {
   let dx=0,dy=0;if(this.hurt>0){dx=Math.sin(this.hurt*60)*b.scale*8;dy=-Math.sin(this.hurt*8)*5;}
   if(model.invulnerable>0)g.globalAlpha=.65+.35*Math.abs(Math.sin(model.time*20));
   const lane=model.attackPose;
   if(lane!==null&&this.images.upper){
    // Keep animated legs and the lower cape under the independent arm/cape attack layer.
    g.save();g.beginPath();g.rect(b.x,b.y+290*b.scale,b.w,b.h);g.clip();g.drawImage(run,frame%4*cw,Math.floor(frame/4)*ch,cw,ch,b.x+dx,b.y+dy,b.w,b.h);g.restore();
    g.save();g.beginPath();g.rect(b.x-b.w*.1,b.y,b.w*1.2,328*b.scale);g.clip();g.drawImage(this.images.upper,lane*cw,0,cw,ch,b.x+dx,b.y+dy,b.w,b.h);g.restore();
   }else g.drawImage(run,frame%4*cw,Math.floor(frame/4)*ch,cw,ch,b.x+dx,b.y+dy,b.w,b.h);
  }g.restore();
 }
 drawOtherSprite(model,frame,b){
  const g=this.g,cw=384,ch=448,top=model.character==='vee'?VEE_FRAME_TOPS[frame]:0;
  g.save();
  if(model.character==='vee'&&frame===10){
   // This boot sits just left of the first hair pixels. A stepped crop keeps
   // the intact hair edge instead of chopping the top off the entire pose.
   g.beginPath();g.moveTo(b.x,b.y+90*b.scale);g.lineTo(b.x+218*b.scale,b.y+90*b.scale);
   g.lineTo(b.x+225*b.scale,b.y+88*b.scale);g.lineTo(b.x+227*b.scale,b.y+86*b.scale);
   g.lineTo(b.x+b.w,b.y+86*b.scale);g.lineTo(b.x+b.w,b.y+b.h);g.lineTo(b.x,b.y+b.h);g.closePath();g.clip();
  }
  g.drawImage(this.images[model.character],frame%4*cw,Math.floor(frame/4)*ch+top,cw,ch-top,b.x,b.y+top*b.scale,b.w,(ch-top)*b.scale);g.restore();
 }
 drawOtherHero(model){
  const g=this.g,b=this.heroBox(model),sheet=this.images[model.character];if(!sheet)return;const frame=Math.floor(this.runningCycle)%8;
  const sprite=(f)=>this.drawOtherSprite(model,f,b);
  g.save();g.fillStyle='#0008';g.beginPath();g.ellipse(b.center,b.feet+2,b.body*.18,b.body*.025,0,0,TAU);g.fill();
  for(const r of this.ripples){g.strokeStyle='rgba(160,190,178,'+(r.life*.7)+')';g.beginPath();g.ellipse(r.x,r.y,(.28-r.life)*65+2,(.28-r.life)*13+1,0,0,TAU);g.stroke();}
  if(model.invulnerable>0)g.globalAlpha=.7+.3*Math.abs(Math.sin(model.time*20));
  if(this.hurt>0)g.translate(Math.sin(this.hurt*60)*b.scale*7,-Math.sin(this.hurt*8)*4);
  {
   let pose=null;if(model.character==='sadie'&&model.attackPose!==null){const a=model.attacks[model.attacks.length-1];pose=8+Math.min(3,Math.floor((model.time-(a?.start||0))/.35*4));}
   if(model.character==='vee'&&Math.abs(model.lateralVelocity||0)>.05){const right=model.lateralVelocity>0;pose=(right?10:8)+(Math.floor(this.runningCycle/2)%2);}
   if(pose!==null){g.save();g.beginPath();g.rect(b.x,b.y+296*b.scale,b.w,b.h);g.clip();sprite(frame);g.restore();g.save();g.beginPath();g.rect(b.x-b.w*.1,b.y,b.w*1.2,325*b.scale);g.clip();sprite(pose);g.restore();}else sprite(frame);
  }g.restore();
 }
 punches(model){const g=this.g,b=this.heroBox(model);
  for(const a of model.attacks){if(a.kind!=='punch')continue;const age=model.time-a.start,p=clamp(age/.35,0,1),r=model.rocks.find(r=>r.id===a.targetId),target=r?this.rockPosition(r,model):null,x=b.center+b.body*.16,y=b.feet-b.body*.63;
   g.save();g.globalAlpha=Math.sin(p*Math.PI)*.8;g.strokeStyle='#ffe8a1';g.lineWidth=2.4;
   for(let i=0;i<3;i++){g.beginPath();g.moveTo(x+b.body*(.06+i*.025),y+5*i);g.lineTo(x+b.body*(.02+i*.018),y-b.body*.12+5*i);g.stroke();}
   if(target&&p>.27&&p<.85){g.globalAlpha=(1-p)*.9;g.strokeStyle='#fff2b5';g.lineWidth=2;for(let i=0;i<9;i++){const angle=i*TAU/9;g.beginPath();g.moveTo(target.x+Math.cos(angle)*target.size*.2,target.y+Math.sin(angle)*target.size*.2);g.lineTo(target.x+Math.cos(angle)*target.size*.58,target.y+Math.sin(angle)*target.size*.58);g.stroke();}}
   g.restore();
  }
 }
 winds(model){if(model.character==='sadie'){this.punches(model);return;}if(model.character==='vee')return;const g=this.g,b=this.heroBox();
  for(const a of model.attacks){const age=model.time-a.start,p=clamp(age/.35,0,1),r=model.rocks.find(r=>r.id===a.targetId),target=r?this.rockPosition(r,model):{x:this.width*[.255,.5,.745][a.lane],y:this.height*.17,size:70};
   const origins=[{x:this.width*.5-b.body*.40,y:b.feet-b.body*.94},{x:this.width*.5,y:b.feet-b.body*1.02},{x:this.width*.5+b.body*.40,y:b.feet-b.body*.94}],o=origins[a.lane];
   const reach=Math.min(1,p/.42),tx=o.x+(target.x-o.x)*reach,ty=o.y+(target.y-o.y)*reach,dx=tx-o.x,dy=ty-o.y,len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),alpha=Math.min(1,p*10)*(1-Math.max(0,(p-.5)*2));
   g.save();g.translate(o.x,o.y);g.rotate(angle);g.globalAlpha=alpha;g.globalCompositeOperation='screen';
   const glow=g.createLinearGradient(0,0,len,0);glow.addColorStop(0,'#71e59b33');glow.addColorStop(.55,'#c1d4b044');glow.addColorStop(1,'#b3ffce55');g.strokeStyle=glow;g.lineWidth=26;g.lineCap='round';g.beginPath();g.moveTo(0,0);g.lineTo(len,0);g.stroke();
   for(let strand=0;strand<4;strand++){g.beginPath();for(let k=0;k<=32;k++){const u=k/32,radius=(6+u*target.size*.23)*(1-p*.2),y=Math.sin(u*26-model.time*49+strand*1.57)*radius;const x=u*len;if(k)g.lineTo(x,y);else g.moveTo(x,y);}g.strokeStyle=strand===0?'#9cffbdcc':strand===1?'#ddd6bdc9':'#8cac9677';g.lineWidth=strand<2?2.7:1.3;g.stroke();}
   for(let k=0;k<9;k++){const u=(k/9+p*2)%1,x=u*len,radius=7+u*target.size*.22;g.strokeStyle='#d7e7bd99';g.lineWidth=1.8;g.beginPath();g.ellipse(x,0,radius*.2,radius,0,0,TAU*.8);g.stroke();}
   g.restore();
  }
 }
 debris(){const g=this.g;
  for(const p of this.particles){const alpha=clamp(p.life/p.max,0,1);if(p.kind==='dust'){
    g.globalAlpha=alpha*.35;const r=p.size*(1+(1-alpha)*1.5),grad=g.createRadialGradient(p.x,p.y,0,p.x,p.y,r);grad.addColorStop(0,'#a3977d');grad.addColorStop(1,'#a3977d00');g.fillStyle=grad;g.fillRect(p.x-r,p.y-r,r*2,r*2);
   }else this.rockImage(p.index,p.x,p.y,p.size,p.rot,alpha);
  }g.globalAlpha=1;
 }
 draw(model){this.currentModel=model;const g=this.g,w=this.width,h=this.height;g.clearRect(0,0,w,h);g.save();if(this.shake>0&&model.state!=='paused'){const a=this.shake*13;g.translate(Math.sin(this.clock*83)*a,Math.cos(this.clock*67)*a*.6);}
  this.tunnel(model);this.hazards(model);this.drawHero(model);this.winds(model);this.debris();this.drawPunchTarget(model);g.restore();
  const vignette=g.createRadialGradient(w*.5,h*.48,h*.18,w*.5,h*.5,Math.max(w,h)*.72);vignette.addColorStop(0,'#00000000');vignette.addColorStop(1,'#020608a0');g.fillStyle=vignette;g.fillRect(0,0,w,h);
  if(this.hurt>0){g.fillStyle='rgba(159,48,20,'+(this.hurt*.17)+')';g.fillRect(0,0,w,h);}
  const fade=outroOpacity(model.outroAge||0,model.config?.outro);if(fade>0){g.fillStyle='rgba(0,0,0,'+fade+')';g.fillRect(0,0,w,h);}
 }
 dispose(){this.tunnelScene.dispose();this.particles=[];this.ripples=[];}
 minimap(canvas,progress){const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height;g.clearRect(0,0,w,h);g.strokeStyle='#24443866';g.lineWidth=1;for(let x=0;x<w;x+=20){g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke();}for(let y=0;y<h;y+=20){g.beginPath();g.moveTo(0,y);g.lineTo(w,y);g.stroke();}
  const point=t=>({x:w*(.48+.15*Math.sin(t*7)-.07*Math.sin(t*13)),y:h*(.9-.77*t)});
  for(const [color,width] of [['#8b9ca77a',18],['#243645',14]]){g.strokeStyle=color;g.lineWidth=width;g.lineJoin='round';g.lineCap='round';g.beginPath();for(let i=0;i<=50;i++){const p=point(i/50);i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);}g.stroke();}
  g.strokeStyle='#58c881';g.lineWidth=2;g.beginPath();for(let i=0;i<=Math.floor(progress*50);i++){const p=point(i/50);i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y);}g.stroke();
  const p=point(progress);g.fillStyle='#9affbe';g.strokeStyle='#e4ffec';g.lineWidth=1.5;g.beginPath();g.moveTo(p.x,p.y-7);g.lineTo(p.x-5,p.y+6);g.lineTo(p.x,p.y+3);g.lineTo(p.x+5,p.y+6);g.closePath();g.fill();g.stroke();
 }
}
window.HealthiaCaveRenderer=Renderer;
})();
