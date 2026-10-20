'use strict';
// Classic-script module: shares the original game bindings.

function showVenue(){mode='venue';paused=false;clearInput();menuFocusElement=null;overlay.classList.remove('hidden');overlay.innerHTML=`<section class="panel"><div class="eyebrow">${heroes[selected].name} VS ${villainNames[opponent]}</div><h2>Choose your fight venue.</h2><div class="cards venues">${venueNames.map((name,i)=>`<button class="card ${venue===i?'selected':''}" data-venue="${i}" aria-pressed="${venue===i}"><img class="venue-photo" src="${venueImages[i].src}" alt="${['Buckroe Beach lighthouse and entrance sign at sunset','Neptune statue at Virginia Beach at sunset','Norfolk Scope concrete dome, fountain and brick plaza at sunset'][i]}"><h3>${name}</h3><p>${['The lighthouse · Hampton, Virginia','Neptune statue · Virginia Beach, Virginia','The fountain plaza · Norfolk, Virginia'][i]}</p></button>`).join('')}</div><div class="row"><button id="backopponent">CHANGE OPPONENT</button><button class="primary" id="startvenue">FIGHT AT ${venueNames[venue]} →</button></div></section>`;overlay.querySelectorAll('[data-venue]').forEach(b=>b.onclick=()=>{venue=+b.dataset.venue;showVenue()});document.getElementById('backopponent').onclick=showOpponent;document.getElementById('startvenue').onclick=start;}

function advanceEnvironment(dt,frameSeconds=dt){
 if(document.hidden||paused)return;
 environment.time+=Math.min(Math.max(dt,0),.25);
 if(frameSeconds>0&&frameSeconds<.25){
  environment.averageMs+=(frameSeconds*1000-environment.averageMs)*.035;
  environment.slow=environment.averageMs>24?environment.slow+dt:0;
  environment.fast=environment.averageMs<18.5?environment.fast+dt:0;
  if(environment.slow>2&&environment.quality>0){environment.quality--;environment.slow=0;environment.fast=0;}
  if(environment.fast>12&&environment.quality<2){environment.quality++;environment.fast=0;environment.slow=0;}
 }
 updateAmbience();
}

function stageFit(im){const scale=Math.min(W/im.width,H/im.height);return {scale,x:(W-im.width*scale)/2,y:(H-im.height*scale)/2};}

function stageBase(index){
 if(environment.base[index])return environment.base[index];
 const im=venueImages[index];if(!im.complete||!im.width)return null;
 const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
 g.fillStyle='#122633';g.fillRect(0,0,W,H);
 if(index===0){const cut=im.height*.9;g.drawImage(im,0,0,im.width,cut,0,0,W,570);g.drawImage(im,0,cut,im.width,im.height-cut,0,570,W,H-570);}
 else if(index===2){const fit=stageFit(im);g.drawImage(im,fit.x,fit.y,im.width*fit.scale,im.height*fit.scale);}
 else g.drawImage(im,0,0,W,H);
 environment.base[index]=c;environment.builds++;return c;
}

function envPath(g,points){g.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);g.closePath();}

function stageOcclusion(g,base,index){
 g.save();g.beginPath();
 if(index===0){
  envPath(g,[[0,0],[735,0],[680,100],[350,120],[0,300]]);
  envPath(g,[[70,300],[325,300],[325,143],[356,123],[395,119],[430,142],[453,339],[501,348],[501,543],[70,543]]);
  envPath(g,[[709,350],[854,200],[1026,208],[1280,180],[1280,352],[1177,338],[1040,314],[835,314],[768,355]]);
  for(const r of [[714,340,38,105],[778,340,36,106],[950,320,33,131],[1070,331,39,124],[1250,320,30,138],[513,321,22,103],[920,354,21,66]])g.rect(...r);
  g.rect(0,450,820,H-450);g.rect(0,570,W,H-570);
 }else{
  envPath(g,[[433,0],[482,0],[514,113],[620,109],[685,169],[703,241],[673,300],[786,354],[789,389],[704,398],[739,477],[793,551],[793,580],[401,580],[401,534],[456,470],[480,402],[506,341],[493,283],[463,254],[451,182]]);
  g.rect(0,201,25,373);envPath(g,[[0,197],[67,208],[98,255],[91,336],[19,365],[0,335]]);
  envPath(g,[[1205,308],[1280,300],[1280,580],[1253,580],[1254,396],[1192,394]]);
  g.rect(0,505,W,10);
  for(const x of [41,163,256,361,785,899,1039,1227])g.rect(x-7,474,43,105);
  g.rect(0,578,W,H-578);
 }
 g.clip();g.drawImage(base,0,0);g.restore();
}

function drawBeachWaves(g,index,time,quality){
 const top=index===0?382:419,bottom=index===0?406:487;
 g.save();g.beginPath();g.rect(0,top,W,bottom-top);g.clip();
 const count=[4,7,11][quality];
 for(let i=0;i<count;i++){
  const progress=((time*(index===0?.065:.047)+i/count)%1),y=top+(bottom-top)*Math.pow(progress,.78);
  const alpha=Math.sin(progress*Math.PI)*(.10+.18*progress);
  g.strokeStyle=`rgba(224,246,251,${alpha})`;g.lineWidth=.6+progress*(index===0?.7:2.1);g.beginPath();
  for(let x=-20;x<=W+20;x+=12){const yy=y+Math.sin(x*.024+time*1.4+i*3)*(.4+progress*1.6)+Math.sin(x*.059-time*.9)*progress;x===-20?g.moveTo(x,yy):g.lineTo(x,yy);}g.stroke();
  if(quality>0){g.setLineDash([14+progress*28,11+progress*22]);g.lineDashOffset=-time*(9+progress*8);g.strokeStyle=`rgba(251,249,225,${alpha*.65})`;g.lineWidth=1+progress*2;g.stroke();g.setLineDash([]);}
 }
 // Low-amplitude translucent streaks give distant water a changing shimmer.
 for(let i=0;i<[12,20,30][quality];i++){
  const x=(i*127.3+Math.sin(time*.8+i)*6)%W,y=top+3+(i*11.7)%(bottom-top-5);
  g.strokeStyle=`rgba(173,217,238,${.045+.035*Math.sin(time*2+i)})`;g.lineWidth=.7;g.beginPath();g.moveTo(x,y);g.lineTo(x+10+6*Math.sin(i),y);g.stroke();
 }
 g.restore();
}

function drawGull(g,x,y,size,phase,dir){
 g.save();g.translate(x,y);g.scale(dir,1);
 const flap=Math.sin(phase),wing=size*(.18+.65*flap);
 g.lineCap='round';g.lineJoin='round';
 for(const [color,width] of [['#24384a',2.6],['#f7f2dc',1.45]]){
  g.strokeStyle=color;g.lineWidth=width*size/12;g.beginPath();g.moveTo(-size,wing);g.quadraticCurveTo(-size*.52,-size*.17,0,0);g.quadraticCurveTo(size*.5,-size*.23,size,wing*.82);g.stroke();
 }
 g.fillStyle='#e9eeea';g.beginPath();g.ellipse(0,1,size*.24,size*.11,0,0,Math.PI*2);g.fill();g.restore();
}

function drawBeachBirds(g,index,time,quality){
 let count=0;
 for(let flock=0;flock<(quality===0?1:2);flock++){
  const cycle=flock?37:27,age=(time+(flock?9:0))%cycle,duration=flock?15:17;
  if(age>duration)continue;
  const dir=flock?-1:1,x=dir>0?-65+age/duration*1410:1345-age/duration*1410;
  const members=quality===0?1:flock?2:3;
  for(let j=0;j<members;j++){
   const size=flock?5+j:9+j*1.5,yy=(flock?index===0?374:466:205)+j*15+Math.sin(time*.65+j)*9;
   drawGull(g,x-dir*j*35,yy,size,time*(flock?6.7:4.8)+j*1.7,dir);count++;
  }
 }
 environment.stats.birds=count;
}

function walkerState(index,person,time){
 const speed=index===0?25:31,period=person?101:79,start=person?37:5,age=((time-start)%period+period)%period;
 const duration=(W+100)/speed;if(age>duration)return null;
 const dir=person?-1:1,x=dir>0?-50+age*speed:W+50-age*speed;
 const height=(index===0?39:43)-(person?5:0),stride=height*.64,distance=age*speed,phase=(distance/stride)%1;
 return {x,feet:index===0?444:520,height,dir,pose:Math.floor(phase*4),phase,offset:-(phase*4%1-.5)*stride/4*.35*dir};
}

function drawBeachWalkers(g,index,time,quality){
 let count=0;if(!pedestrianSheet.complete||!pedestrianSheet.width)return;
 for(let person=0;person<(quality===2?2:1);person++){
  const w=walkerState(index,person,time);if(!w)continue;
  const def=pedestrianDefinitions[person],f=def.frames[w.pose],scale=w.height/def.referenceHeight;
  g.save();g.translate(w.x+w.offset,w.feet);g.scale(w.dir*scale,scale);g.globalAlpha=.94;
  g.drawImage(pedestrianSheet,...f.rect,-f.anchor[0],-f.anchor[1],f.rect[2],f.rect[3]);g.restore();count++;
 }
 environment.stats.walkers=count;
}

function drawFoliage(g,base,index,time,quality){
 if(quality===0)return;
 const patches=index===0?[[500,22,176,83],[552,448,150,58]]:[[9,220,74,91],[1218,328,61,64]];
 for(let j=0;j<patches.length;j++){
  const [x,y,w,h]=patches[j];g.save();g.beginPath();g.ellipse(x+w/2,y+h/2,w*.44,h*.39,0,0,Math.PI*2);g.clip();
  // Only sample inside existing leaf clusters: trunks, architecture and the horizon never move.
  for(let sy=0;sy<h;sy+=4){const shift=Math.sin(time*1.5+sy*.06+j)*.65*Math.sin(sy/h*Math.PI);g.drawImage(base,x,y+sy,w,4,x+shift,y+sy,w,4);}
  g.restore();
 }
}

function mistSprite(){
 if(fountainMist)return fountainMist;
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),grad=g.createRadialGradient(32,32,0,32,32,31);grad.addColorStop(0,'#e5f3ff');grad.addColorStop(1,'#e5f3ff00');g.fillStyle=grad;g.fillRect(0,0,64,64);fountainMist=c;return c;
}

function drawScopeWater(g,time,quality){
 const fit=stageFit(venueImages[2]),n=[18,30,48][quality],beads=[2,4,6][quality];
 environment.stats.jets=n;environment.stats.droplets=n*beads;
 g.save();g.translate(fit.x,fit.y);g.scale(fit.scale,fit.scale);
 g.beginPath();g.rect(119,427,1392,204);g.clip();
 for(let i=0;i<n;i++){
  const u=i/(n-1),x=164+u*1300,base=615+10*Math.sin(u*Math.PI);
  const h=(132+38*(.5+.5*Math.sin(i*2.37)))*(1+.055*Math.sin(time*(1.15+i%5*.13)+i));
  const drift=8*Math.sin(time*.48+i*.7),spread=10+8*Math.sin(i*1.9),cx=x+drift,cy=base-h*2;
  g.strokeStyle=i%3===0?'rgba(255,228,190,.20)':'rgba(216,241,255,.15)';g.lineWidth=quality===2?2.2:1.8;
  g.beginPath();g.moveTo(x,base);g.quadraticCurveTo(cx,cy,x+spread,base+3);g.stroke();
  for(let k=0;k<beads;k++){
   const q=(time*(.61+i%7*.023)+k/beads+i*.137)%1,v=1-q;
   const xx=v*v*x+2*v*q*cx+q*q*(x+spread),yy=v*v*base+2*v*q*cy+q*q*(base+3);
   const q0=Math.max(0,q-.014),v0=1-q0,px=v0*v0*x+2*v0*q0*cx+q0*q0*(x+spread),py=v0*v0*base+2*v0*q0*cy+q0*q0*(base+3);
   g.strokeStyle=i%3===0?'rgba(255,242,217,.72)':'rgba(223,245,255,.68)';g.lineWidth=1.1;g.beginPath();g.moveTo(px,py);g.lineTo(xx,yy);g.stroke();
  }
  const r=(time*.85+i*.173)%1;g.strokeStyle=`rgba(225,245,253,${(1-r)*.23})`;g.lineWidth=.8;g.beginPath();g.ellipse(x+spread,base+4,3+r*21,1+r*3,0,0,Math.PI*2);g.stroke();
  const splash=Math.sin(time*7+i);g.strokeStyle='rgba(237,247,252,.22)';g.beginPath();g.moveTo(x+spread-4,base+1);g.lineTo(x+spread-7,base-3-splash*2);g.moveTo(x+spread+3,base+2);g.lineTo(x+spread+6,base-4+splash*2);g.stroke();
 }
 if(quality>0){const mist=mistSprite();for(let i=0;i<9;i++){g.globalAlpha=.06+.018*Math.sin(time+i);g.drawImage(mist,140+i*155+Math.sin(time*.4+i)*13,573+Math.sin(time*.65+i)*5,155,55);}g.globalAlpha=1;}
 // Low ripples run horizontally through the actual pool, below the jets.
 for(let i=0;i<8;i++){g.strokeStyle='rgba(192,226,245,.12)';g.lineWidth=.9;g.beginPath();const yy=607+i*2.6;for(let x=0;x<1663;x+=14){const y=yy+Math.sin(x*.065-time*2+i)*.8;x?g.lineTo(x,y):g.moveTo(x,y);}g.stroke();}
 g.restore();
}

function renderLivingStage(index=venue){
 const base=stageBase(index);if(!base)return null;
 const env=environment,rate=[15,24,30][env.quality],stamp=Math.floor(env.time*rate);
 if(!env.surface){env.surface=document.createElement('canvas');env.surface.width=W;env.surface.height=H;}
 if(stamp===env.lastStamp&&index===env.lastVenue&&env.quality===env.lastQuality)return env.surface;
 const g=env.surface.getContext('2d');g.clearRect(0,0,W,H);g.drawImage(base,0,0);env.stats={jets:0,droplets:0,birds:0,walkers:0};
 if(index===2){drawScopeWater(g,env.time,env.quality);const f=stageFit(venueImages[2]),front=Math.floor(f.y+634*f.scale);g.drawImage(base,0,front,W,H-front,0,front,W,H-front);}
 else{drawBeachWaves(g,index,env.time,env.quality);drawBeachBirds(g,index,env.time,env.quality);drawBeachWalkers(g,index,env.time,env.quality);stageOcclusion(g,base,index);drawFoliage(g,base,index,env.time,env.quality);}
 env.lastStamp=stamp;env.lastVenue=index;env.lastQuality=env.quality;return env.surface;
}

function sky(){
 const stage=renderLivingStage();if(stage)ctx.drawImage(stage,0,0);else rect(0,0,W,H,'#122633');
 const doom=mode==='fight'&&boss?(1-boss.hp/boss.max)*.20:0;if(doom)rect(0,0,W,H,`rgba(12,20,32,${doom})`);
 if(mode==='victory')rect(0,0,W,H,`rgba(255,228,150,${clamp(ending/2,0,1)*.055})`);
}

function drawEnvironmentForeground(){
 if(venue!==2||environment.quality===0)return;
 const fit=stageFit(venueImages[2]),time=environment.time;
 ctx.save();ctx.globalAlpha=.13;ctx.fillStyle='#eaf6ff';
 for(let i=0;i<8;i++){const q=(time*.4+i*.137)%1,x=fit.x+(180+i*178+Math.sin(time+i)*6)*fit.scale,y=fit.y+(625+q*9)*fit.scale;ctx.beginPath();ctx.ellipse(x,y,.75,1.1,0,0,Math.PI*2);ctx.fill();}ctx.restore();
}
