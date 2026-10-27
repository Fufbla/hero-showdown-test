/* Loaded only by the isolated test page. All artwork comes from boss-parts.png. */
(function(){
 'use strict';
 const Core=HealthiaScorpionRigCore,rigs=new WeakMap(),textures={},errors=[];
 const original={back:drawShoreBossBack,front:drawShoreBossFront,update:updateStep};
 let enabled=true,debug=false,prepared=false,draws=0,textureBytes=0;
 const bodyPolygon=[[321,76],[373,112],[421,139],[442,164],[477,151],[510,176],[513,211],[494,239],[456,256],[433,283],[419,307],[429,341],[415,375],[373,416],[322,448],[273,429],[236,400],[212,367],[210,329],[205,290],[190,260],[158,245],[130,220],[126,174],[146,151],[191,157],[216,171],[254,132],[286,115]];
 const leftJaw=[[884,280],[911,308],[909,350],[899,386],[868,420],[835,450],[794,472],[741,495],[695,508],[720,486],[743,450],[770,412],[793,367],[810,335],[840,310]];
 const rightJaw=[[1235,280],[1203,313],[1207,360],[1229,399],[1262,435],[1302,464],[1361,491],[1438,507],[1399,480],[1353,443],[1311,397],[1290,356],[1272,323]];
 const jawCuts=[[[824,335],[911,337],...leftJaw.slice(3,14)],[[1207,350],...rightJaw.slice(3),[1272,350]]];
 const path=(c,points)=>{points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();};
 function cache(rect,polygon,cut){
  const [x,y,w,h]=rect,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d');c.translate(-x,-y);c.beginPath();path(c,polygon||[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);if(cut)path(c,cut);c.clip(cut?'evenodd':'nonzero');c.drawImage(shoreBossParts,0,0);textureBytes+=w*h*4;return {canvas,x,y,w,h};
 }
 function prepare(){if(prepared||!shoreBossParts.complete||!shoreBossParts.naturalWidth)return;try{
  textures.body=cache([123,73,394,380],bodyPolygon);
  textures.legs=Core.legs.map(def=>{const sections=Core.sections(def.source,def.widths),poly=[...sections.map(s=>[s[0].x,s[0].y]),...sections.slice().reverse().map(s=>[s[1].x,s[1].y])];const xs=poly.map(p=>p[0]),ys=poly.map(p=>p[1]),x=Math.floor(Math.min(...xs))-2,y=Math.floor(Math.min(...ys))-2;return cache([x,y,Math.ceil(Math.max(...xs))-x+2,Math.ceil(Math.max(...ys))-y+2],poly);});
  textures.plate=cache([177,674,208,170]);
  textures.claws=[cache(shoreBossRects[1],null,jawCuts[0]),cache(shoreBossRects[2],null,jawCuts[1])];
  textures.jaws=[cache(shoreBossRects[1],leftJaw),cache(shoreBossRects[2],rightJaw)];
  prepared=true;
 }catch(e){errors.push(e.message);}}
 const whenLoaded=new Promise(resolve=>{if(shoreBossParts.complete&&shoreBossParts.naturalWidth){prepare();resolve(prepared);}else{shoreBossParts.addEventListener('load',()=>{prepare();resolve(prepared);},{once:true});shoreBossParts.addEventListener('error',()=>resolve(false),{once:true});}});
 function rig(m){let r=rigs.get(m);if(!r){r=new Core.Rig(m);rigs.set(m,r);}return r;}
 updateStep=function(...args){const m=shore.model,result=original.update(...args);if(m&&m===shore.model&&m.kind==='boss')rig(m).advance(m);return result;};
 function get(m){return rig(m).advance(m);}
 function triangle(texture,a,b,c,A,B,C){
  const det=(b.x-a.x)*(c.y-a.y)-(c.x-a.x)*(b.y-a.y);if(Math.abs(det)<1e-7)return;
  const u1=b.x-a.x,v1=b.y-a.y,u2=c.x-a.x,v2=c.y-a.y;
  const xx=((B.x-A.x)*v2-(C.x-A.x)*v1)/det,xy=((C.x-A.x)*u1-(B.x-A.x)*u2)/det;
  const yx=((B.y-A.y)*v2-(C.y-A.y)*v1)/det,yy=((C.y-A.y)*u1-(B.y-A.y)*u2)/det;
  ctx.save();ctx.beginPath();ctx.moveTo(A.x,A.y);ctx.lineTo(B.x,B.y);ctx.lineTo(C.x,C.y);ctx.closePath();ctx.clip();ctx.transform(xx,yx,xy,yy,A.x-xx*a.x-xy*a.y,A.y-yx*a.x-yy*a.y);ctx.drawImage(texture.canvas,texture.x,texture.y);draws++;ctx.restore();
 }
 function leg(def,p,texture){
  const from=Core.sections(def.source,def.widths),scale=def.index===0?.78:1,to=Core.sections(p.joints,def.widths.map(w=>w*Core.bodyScale*scale));
  for(let i=0;i<3;i++){triangle(texture,from[i][0],from[i][1],from[i+1][0],to[i][0],to[i][1],to[i+1][0]);triangle(texture,from[i][1],from[i+1][1],from[i+1][0],to[i][1],to[i+1][1],to[i+1][0]);}
 }
 function plate(a,b,width){const dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy);if(L<.3)return;ctx.save();ctx.translate((a.x+b.x)/2,(a.y+b.y)/2);ctx.rotate(Math.atan2(dy,dx)-Math.PI/2);ctx.drawImage(textures.plate.canvas,-width/2,-(L+15)/2,width,L+15);draws++;ctx.restore();}
 function body(p){
  const tex=textures.body,cols=3,rows=4,grid=[];
  for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++){
   const source={x:tex.x+tex.w*col/cols,y:tex.y+tex.h*row/rows},world=Core.bodyPoint(Core.sourceWorld(source),p.body),weight=Core.clamp((325-source.y)/230);
   world.y+=Math.sin(p.time*1.9-source.y*.008)*1.7*weight;world.x+=Math.sin(p.time*1.3)*.8*weight;grid.push({source,world});
  }
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const a=grid[r*(cols+1)+c],b=grid[r*(cols+1)+c+1],d=grid[(r+1)*(cols+1)+c],e=grid[(r+1)*(cols+1)+c+1];triangle(tex,a.source,b.source,d.source,a.world,b.world,d.world);triangle(tex,b.source,e.source,d.source,b.world,e.world,d.world);}
 }
 function claw(a,i,trail){
  const p=a.weapon,[x,y,w,h]=shoreBossRects[i+1],sx=210/w,sy=260/h;
  if(trail){ctx.save();ctx.globalAlpha=.18;ctx.strokeStyle='#ffe5a1';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(p.x-p.side*30,p.y+10);ctx.quadraticCurveTo(p.x-p.side*15,p.y-8,p.x,p.y);ctx.stroke();ctx.restore();}
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.scale(sx,sy);ctx.translate(-p.anchor[0]*w,-p.anchor[1]*h);
  ctx.drawImage(textures.claws[i].canvas,0,0);draws++;
  const pivot=i?[1238-x,320-y]:[875-x,315-y];ctx.translate(...pivot);ctx.rotate(-p.side*a.opening);ctx.drawImage(textures.jaws[i].canvas,-pivot[0],-pivot[1]);draws++;ctx.restore();
 }
 function warnings(m){
  if(m.state==='clawWindup'){const p=m.clawPose();ctx.save();ctx.globalAlpha=.45+.25*Math.sin(m.age*18);ctx.strokeStyle='#ffd689';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(p.x,608,95,14,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(['stingerWindup','stingerPlunge','stingerExposed'].includes(m.state)){
   const exposed=m.state==='stingerExposed'&&m.dodged;ctx.save();ctx.strokeStyle=exposed?'#e9ffb7':'#b8ee35';ctx.lineWidth=m.locked?5:3;ctx.globalAlpha=.7;ctx.beginPath();ctx.ellipse(m.targetX,607,75,18,0,0,Math.PI*2);ctx.stroke();
   if(m.locked&&!exposed){ctx.fillStyle='#d0ff3c22';ctx.fill();ctx.beginPath();ctx.moveTo(m.targetX-58,595);ctx.lineTo(m.targetX+58,619);ctx.moveTo(m.targetX+58,595);ctx.lineTo(m.targetX-58,619);ctx.stroke();}ctx.restore();
  }
 }
 function back(m){
  if(!enabled||!prepared||m.kind!=='boss'||m.state==='dissolve')return original.back(m);
  const p=get(m);ctx.save();ctx.beginPath();ctx.rect(0,0,W,608);ctx.clip();ellipse(640,573,290,26,'#080e1899');
  const segments=p.tail.slice(1).map((b,i)=>({a:p.tail[i],b,i,z:(p.tail[i].z+b.z)/2})).sort((a,b)=>b.z-a.z);
  for(const s of segments)plate(s.a,s.b,50-s.i*1.2);
  for(const l of p.legs){ctx.save();ctx.globalAlpha=l.planted?.2:.12;ellipse(l.position.x,l.position.y+l.lift+2,10,3,'#07111a');ctx.restore();}
  for(let i=0;i<8;i++)leg(Core.legs[i],p.legs[i],textures.legs[i]);
  for(const a of p.claws){plate(a.shoulder,a.elbow,53);plate(a.elbow,a.wrist,49);}
  body(p);
  if(m.flash>0){ctx.save();ctx.globalAlpha=m.flash*1.1;ellipse(640+p.body.x,395+p.body.y,110,100,'#e9ffad');ctx.restore();}
  p.claws.forEach((a,i)=>{if(!['clawWindup','clawSweep'].includes(m.state)||(m.side===1?i!==0:i!==1))claw(a,i,false);});ctx.restore();warnings(m);
 }
 function front(m){
  if(!enabled||!prepared||m.kind!=='boss'||m.state==='dissolve')return original.front(m);
  const p=get(m);ctx.save();ctx.beginPath();ctx.rect(0,0,W,608);ctx.clip();p.claws.forEach((a,i)=>{if(['clawWindup','clawSweep'].includes(m.state)&&(m.side===1?i===0:i===1))claw(a,i,m.state==='clawSweep');});
  const tip=p.stinger,glow=m.state==='stingerExposed'&&m.dodged;
  if(glow){ctx.save();ctx.globalAlpha=.35+.18*Math.sin(m.time*12);ctx.strokeStyle='#e5ffac';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(tip.x+16,tip.y-45,64,82,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  shoreBossPart(4,tip.x,tip.y,118,165,0,.20,.92);
  if(['stingerWindup','stingerPlunge','stingerExposed','reflect'].includes(m.state))for(let j=0;j<3;j++){const q=(m.time*2+j/3)%1;ellipse(tip.x+Math.sin(j*4)*9,tip.y+q*34,3*(1-q),5*(1-q),'#b5eb36');}
  if(debug)drawDebug(m,p);ctx.restore();
 }
 function drawDebug(m,p){
  const chain=(points,color)=>{ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y));ctx.stroke();for(const v of points)ellipse(v.x,v.y,3,3,color);};
  for(const l of p.legs)chain(l.joints,l.planted?'#a8ffaf':'#ffff77');for(const a of p.claws)chain([a.shoulder,a.elbow,a.wrist],'#75deff');chain(p.tail,'#fbb9ff');
  for(const box of [m.clawBox(1),m.clawBox(-1),m.stingerBox(),m.bodyBox()]){ctx.strokeStyle='#ffde83';ctx.lineWidth=1;ctx.strokeRect(box.x,box.y,box.w,box.h);}
 }
 drawShoreBossBack=back;drawShoreBossFront=front;
 window.HealthiaScorpionRig={whenLoaded,ready:()=>prepared,get enabled(){return enabled;},set enabled(value){enabled=!!value;},get debug(){return debug;},set debug(value){debug=!!value;},inspect:m=>get(m),reset:m=>rigs.delete(m),metrics:()=>({ready:prepared,draws,textureBytes,errors:[...errors]}),resetDrawCount:()=>{draws=0;}};
})();
