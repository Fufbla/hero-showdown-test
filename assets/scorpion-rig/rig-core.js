/* Presentation-only articulation. The Chapter 3 combat model remains authoritative. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaScorpionRigCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const PI=Math.PI,clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),lerp=(a,b,p)=>a+(b-a)*p,ease=x=>{x=clamp(x);return x*x*(3-2*x);};
 const point=(x,y)=>({x,y}),add=(a,b)=>point(a.x+b.x,a.y+b.y),sub=(a,b)=>point(a.x-b.x,a.y-b.y),mul=(a,s)=>point(a.x*s,a.y*s),len=a=>Math.hypot(a.x,a.y),dist=(a,b)=>len(sub(a,b));
 const unit=a=>mul(a,1/Math.max(1e-9,len(a))),rot=(p,a)=>point(p.x*Math.cos(a)-p.y*Math.sin(a),p.x*Math.sin(a)+p.y*Math.cos(a));
 const angle=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x),wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
 const bodyScale=530/591,sourceWorld=p=>point(375+(p.x-24)*bodyScale,573+(p.y-508)*bodyScale);
 // Four limbs per side. The rear pair reuses the approved rear-leg pixels at
 // a foreshortened scale; the three fully visible authored pairs keep their sizes.
 const profiles=[
  {points:[[215,285],[115,245],[65,311],[42,420]],widths:[25,24,22,10]},
  {points:[[218,316],[155,296],[104,352],[55,485]],widths:[24,25,24,11]},
  {points:[[237,349],[188,337],[156,395],[132,498]],widths:[25,25,23,10]}
 ];
 const legs=[];
 for(const side of [1,-1])for(let i=0;i<4;i++){
  const profile=profiles[Math.max(0,i-1)],source=profile.points.map(([x,y])=>point(side===1?x:644-x,y));
  let rest=source.map(sourceWorld);
  if(i===0){const shift=point(side*12,-27),origin=rest[0];rest=rest.map(p=>add(add(origin,mul(sub(p,origin),.78)),shift));}
  const lengths=rest.slice(1).map((p,n)=>dist(p,rest[n])),hand=side===1?1:-1;
  legs.push({id:(side===1?'left':'right')+'-'+i,side,index:i,source,widths:profile.widths,rest,lengths,hand,group:(i+(side===1?0:1))%2});
 }
 function twoBone(a,target,l1,l2,bend=1){
  const delta=sub(target,a),d=clamp(len(delta),Math.abs(l1-l2)+.00001,l1+l2-.00001),v=unit(delta),along=(l1*l1+d*d-l2*l2)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
  return [a,add(add(a,mul(v,along)),mul(point(-v.y,v.x),height*bend)),add(a,mul(v,d))];
 }
 function legIK(def,hip,foot,rock=0){
  const [l0,l1,l2]=def.lengths,delta=sub(foot,hip),D=len(delta),phi=Math.atan2(delta.y,delta.x),restAngle=angle(def.rest[0],def.rest[1])+rock;
  const dmin=Math.abs(l1-l2)+1,dmax=l1+l2-1;
  const lo=Math.acos(clamp((D*D+l0*l0-dmin*dmin)/(2*D*l0),-1,1)),hi=Math.acos(clamp((D*D+l0*l0-dmax*dmax)/(2*D*l0),-1,1));
  const raw=wrap(restAngle-phi),theta=phi+Math.sign(raw||def.side)*clamp(Math.abs(raw),lo,hi),coxa=add(hip,point(Math.cos(theta)*l0,Math.sin(theta)*l0));
  const rest=twoBone(coxa,foot,l1,l2,def.hand);return [hip,coxa,rest[1],rest[2]];
 }
 function bodyPoint(p,body){return add(add(point(640,405),rot(sub(p,point(640,405)),body.roll)),point(body.x,body.y));}
 function footAt(def,time){
  const cycle=time/3.4+def.group*.5+def.index*.014,serial=Math.floor(cycle),p=cycle-serial,duty=.78;
  const target=k=>add(def.rest[3],point(Math.sin(k*.87+def.index*.9)*3.2,Math.cos(k*.73+def.index)*1.5));
  const planted=target(serial);
  if(p<duty)return {position:planted,planted:true,serial,lift:0};
  const q=(p-duty)/(1-duty),u=ease(q),end=target(serial+1),lift=(10+def.index*2)*Math.sin(PI*q)**2;
  return {position:point(lerp(planted.x,end.x,u),lerp(planted.y,end.y,u)-lift),planted:false,serial,lift};
 }
 // A loaded leg finishes its step, then holds a world-space foothold. The gait
 // never starts another step during the fast part of a claw or stinger strike.
 function braceAt(m){
  if(m.state==='clawWindup')return ease((m.age-.15)/.45);
  if(m.state==='clawSweep')return 1;
  if(m.state==='clawRecover')return 1-ease(m.age/.48);
  if(m.state==='stingerWindup')return ease(m.age/.65);
  if(['stingerPlunge','stingerExposed','reflect'].includes(m.state))return 1;
  if(m.state==='stunned')return 1-ease(m.age/.85);
  return 0;
 }
 class Foothold{
  constructor(def,time){this.def=def;this.position={...def.rest[3]};this.serial=0;this.lift=0;this.swing=null;this.lastCycle=-Infinity;}
  advance(time,dt,body,brace){
   const def=this.def,cycle=time/3.4+def.group*.5+def.index*.014,serial=Math.floor(cycle),p=cycle-serial;
   if(!this.swing&&brace<.2&&p>.78&&this.lastCycle!==serial){
    this.lastCycle=serial;this.swing={age:0,from:{...this.position},to:add(def.rest[3],point(Math.sin(serial*.87+def.index*.9)*3.2+body.x*.4,Math.cos(serial*.73+def.index)*1.5)),height:10+def.index*2};
   }
   if(this.swing){
    const s=this.swing;s.age=Math.min(1,s.age+dt*lerp(1/.65,1/.19,brace));const u=ease(s.age);this.lift=s.height*Math.sin(PI*s.age)**2;
    this.position=point(lerp(s.from.x,s.to.x,u),lerp(s.from.y,s.to.y,u)-this.lift);
    if(s.age>=1){this.position=s.to;this.lift=0;this.swing=null;this.serial++;}
   }
   return {position:{...this.position},planted:!this.swing,serial:this.serial,lift:this.lift};
  }
 }
 function spring(s,target,omega,dt){const y=s.p-target,j=s.v+omega*y,e=Math.exp(-omega*dt);s.p=target+(y+j*dt)*e;s.v=(s.v-omega*j*dt)*e;}
 function bodyTarget(m){
  const time=m.time||0,age=m.age||0,side=m.side||1;let x=Math.sin(time*1.15)*1.2,y=Math.sin(time*1.9)*1.1,roll=Math.sin(time*.9)*.002;
  if(m.state==='clawWindup'){const p=ease(age/.9);x-=side*7*p;y+=3.5*p;roll-=side*.011*p;}
  if(m.state==='clawSweep'){const p=ease(age/.82);x+=side*lerp(-7,9,p);y+=3.5+Math.sin(p*PI)*2;roll+=side*lerp(-.011,.016,p);}
  if(m.state==='clawRecover'){const q=1-ease(age/.65);x+=side*9*q;y+=3.5*q;roll+=side*.016*q;}
  if(m.state==='stingerWindup'){y-=3*ease(age/1.15);x+=(m.targetX-640)/530*2;}
  if(m.state==='stingerPlunge'){y+=6*ease(age/.22);}
  if(m.state==='reflect'){y+=Math.sin(clamp(age/.72)*PI)*4;roll+=Math.sin(age*12)*.007;}
  if(m.state==='stunned'){const q=Math.exp(-age*2.8);y+=8*q;roll+=Math.sin(age*15)*.022*q;}
  return {x,y,roll};
 }
 // Ten authored armor sections use a 3D arc projected into the unchanged
 // front view. Each physical link stays 65 units long; depth supplies natural
 // foreshortening when the tail twists toward the camera.
 const tailLengths=Array(10).fill(65),tailLength=650;
 function solveTail(root,end,time=0,previousPlane,reactionAge=-1,upperArch=false){
  const delta=sub(end,root),D=dist(root,end),axis=unit(delta),normal=point(axis.y,-axis.x);let lo=0,hi=2*PI/10;
  for(let n=0;n<42;n++){const theta=(lo+hi)/2,d=65*Math.sin(10*theta/2)/Math.sin(theta/2);if(d>D)lo=theta;else hi=theta;}
  const theta=(lo+hi)/2,A=theta*10,R=65/(2*Math.sin(theta/2)),mid=mul(add(root,end),.5),basis=[];let qmin=-1,qmax=1;
  for(let i=0;i<=10;i++){
   const a=(i/10-.5)*A,along=R*Math.sin(a),across=R*(Math.cos(a)-Math.cos(A/2)),base=add(mid,mul(axis,along));basis.push({base,across});
   if(i===0||i===10)continue;
   for(const [key,min,max]of [['x',40,1260],['y',0,590]]){const c=normal[key]*across;if(Math.abs(c)<1e-7)continue;let low=(min-base[key])/c,high=(max-base[key])/c;if(low>high)[low,high]=[high,low];qmin=Math.max(qmin,low);qmax=Math.min(qmax,high);}
  }
  // Turn the arch upward during the aiming phase, before the downward strike.
  // This keeps the tail above the carapace instead of curling under the abdomen.
  const orientation=upperArch?-Math.sign(normal.y||-1):-1;
  const desired=clamp(clamp(orientation*.82+Math.sin(time*1.6)*.025,qmin,qmax),-1,1),plane=clamp(clamp(previousPlane??desired,qmin,qmax),-1,1),depth=Math.sqrt(Math.max(0,1-plane*plane));
  const points=basis.map(({base,across},i)=>{const weight=Math.sin(i/10*PI),delay=(10-i)*.018,age=reactionAge-delay,shock=age>=0?Math.sin(age*17)*Math.exp(-age*4)*5:0;return {x:base.x+normal.x*across*plane+(Math.sin(time*2.1-i*.43)*1.6+shock)*weight,y:base.y+normal.y*across*plane,z:across*depth+Math.sin(time*1.8-i*.48)*2.2*weight};});
  const length3=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),place=(a,b,d)=>{const q=d/Math.max(1e-9,length3(a,b));return {x:b.x+(a.x-b.x)*q,y:b.y+(a.y-b.y)*q,z:b.z+(a.z-b.z)*q};};
  // Fixed-link projection distributes each delayed reaction without stretching.
  for(let n=0;n<80;n++){points[10]={...end,z:0};for(let i=9;i>=0;i--)points[i]=place(points[i],points[i+1],65);points[0]={...root,z:0};for(let i=0;i<10;i++)points[i+1]=place(points[i+1],points[i],65);if(length3(points[10],{...end,z:0})<1e-7)break;}
  return {points,plane,desired,theta,feasible:qmin<=qmax};
 }
 // The palm and the complete striking fingers retain the combat transform.
 // Only the non-contact forearm gains another degree of freedom. Its native
 // artwork is rotated about this seam; the IK chain meets it without scaling.
 function clawPalm(p){
  const local=p.side===1?point((900-625)/380*210-p.anchor[0]*210,(244-44)/473*260-p.anchor[1]*260):point((1220-1080)/432*210-p.anchor[0]*210,(244-44)/470*260-p.anchor[1]*260);
  return add(p,rot(local,p.angle));
 }
 function clawArm(p,body,flex=0){
  const shoulder=bodyPoint(p.shoulder,body),palm=clawPalm(p),l1=70,l2=72,l3=dist(palm,p.wrist),delta=sub(shoulder,palm),D=len(delta),phi=angle(palm,shoulder);
  const lo=Math.acos(clamp((D*D+l3*l3-(Math.abs(l1-l2)+2)**2)/(2*D*l3),-1,1));
  const hi=Math.acos(clamp((D*D+l3*l3-(l1+l2-2)**2)/(2*D*l3),-1,1));
  const desired=angle(palm,p.wrist)+flex,raw=wrap(desired-phi),theta=phi+Math.sign(raw||p.side)*clamp(Math.abs(raw),lo,hi);
  const wrist=add(palm,point(Math.cos(theta)*l3,Math.sin(theta)*l3)),chain=twoBone(shoulder,wrist,l1,l2,p.side);
  return {shoulder,elbow:chain[1],wrist,palm,nativeWrist:{...p.wrist},lengths:[l1,l2,l3],weapon:{...p},forearmRoll:wrap(theta-angle(palm,p.wrist)),opening:0};
 }
 function clawFlex(m,side){
  let v=.035*Math.sin(m.time*1.45+side*1.3);
  if(m.side===side){
   if(m.state==='clawWindup')v+=side*.24*ease(m.age/.9);
   if(m.state==='clawSweep')v+=side*lerp(.24,-.22,ease(m.age/.82));
   if(m.state==='clawRecover')v-=side*.22*(1-ease(m.age/.65));
  }else if(['clawWindup','clawSweep','clawRecover'].includes(m.state))v-=side*.08*braceAt(m);
  if(m.state==='stunned')v+=side*.16*Math.sin(m.age*13)*Math.exp(-m.age*3);
  return v;
 }
 function clawOpening(m,side){
  let v=.035+.012*Math.sin(m.time*1.8+side*1.2);
  if(m.side===side){
   if(m.state==='clawWindup')v+=.105*ease(m.age/.9);
   if(m.state==='clawSweep')v+=.105*(1-ease(m.age/.48));
  }
  if(m.state==='stunned')v+=.07*Math.exp(-m.age*3);
  return v;
 }
 function snapshot(m){return {time:m.time||0,state:m.state,age:m.age||0,hp:m.hp,reflections:m.reflections||0,side:m.side||1,targetX:m.targetX||640};}
 class Rig{
  constructor(m){this.body={x:{p:0,v:0},y:{p:0,v:0},roll:{p:0,v:0}};this.last=snapshot(m);this.feet=legs.map(def=>new Foothold(def,m.time||0));this.arms=[1,-1].map(side=>({flex:{p:clawFlex(this.last,side),v:0},jaw:{p:clawOpening(this.last,side),v:0}}));this.tail=null;this.tailPlane=undefined;this.stinger={...m.stingerPose()};this.pose=null;this.sample(m,0);}
  sample(m,dt){
   const now=snapshot(m),target=bodyTarget(now);dt=clamp(dt,0,.05);
   if(dt&&now.hp<this.last.hp){const big=this.last.hp-now.hp>=100;this.body.y.v+=big?88:24;this.body.roll.v+=(big?.22:.06)*(now.side||1);}
   for(const k of ['x','y','roll'])spring(this.body[k],target[k],k==='roll'?9:11,dt);
   const body={x:clamp(this.body.x.p,-12,12),y:clamp(this.body.y.p,-8,15),roll:clamp(this.body.roll.p,-.032,.032),breath:1+Math.sin(now.time*1.9)*.0025};
   const brace=braceAt(now),legPoses=legs.map((def,i)=>{const foot=this.feet[i].advance(now.time,dt,body,brace),hip=bodyPoint(def.rest[0],body);return {id:def.id,side:def.side,index:def.index,foot,...foot,joints:legIK(def,hip,foot.position,body.roll),lengths:def.lengths};});
   const nativeTip=m.stingerPose(),active=['stingerWindup','stingerPlunge','stingerExposed','reflect','stunned'].includes(m.state);
   // The inactive reset after a self-sting settles instead of teleporting upward.
   if(active||dt===0)this.stinger={...nativeTip};else{const a=1-Math.exp(-dt*15),idle=now.state!=='stingerRecover';this.stinger=point(lerp(this.stinger.x,nativeTip.x+(idle?body.x*.45+Math.sin(now.time*1.15)*2.5:0),a),lerp(this.stinger.y,nativeTip.y+(idle?body.y*.3+Math.sin(now.time*1.7)*1.4:0),a));}
   const tip=this.stinger,root=bodyPoint(point(640,250),body),end=add(tip,point(65,-131));
   const reactionAge=['stunned','stingerRecover'].includes(now.state)?now.age:-1,upperArch=active||now.state==='stingerRecover';let tail=solveTail(root,end,now.time,this.tailPlane,reactionAge,upperArch);
   if(dt&&this.tailPlane!==undefined){this.tailPlane=lerp(tail.plane,tail.desired,1-Math.exp(-dt*9));tail=solveTail(root,end,now.time,this.tailPlane,reactionAge,upperArch);}else this.tailPlane=tail.plane;
   this.tail=tail.points;
   const claws=[1,-1].map((side,i)=>{const springState=this.arms[i];
    if(dt&&now.hp<this.last.hp)springState.flex.v+=side*(this.last.hp-now.hp>=100?1.1:.5);
    spring(springState.flex,clawFlex(now,side),12,dt);spring(springState.jaw,clawOpening(now,side),18,dt);
    const a=clawArm(m.clawPose(side),body,clamp(springState.flex.p,-.35,.35));a.opening=clamp(springState.jaw.p,0,.17);
    a.trail=m.state==='clawSweep'&&m.side===side?[.09,.045,0].map(ago=>m.clawPose.call(Object.create(m,{age:{value:Math.max(0,m.age-ago)}}),side)):[];
    return a;
   });
   this.pose={time:now.time,state:now.state,body,brace,legs:legPoses,claws,tail:this.tail.map(p=>({...p})),tailLengths,tailPlane:tail.plane,tailFeasible:tail.feasible,stinger:{...tip},stingerSocket:end,root};this.last=now;return this.pose;
  }
  advance(m){const dt=Math.max(0,(m.time||0)-this.last.time);if(dt>0||m.state!==this.last.state||m.hp!==this.last.hp)return this.sample(m,dt);return this.pose;}
 }
 function sections(joints,widths){return joints.map((p,i)=>{const a=i===0?sub(joints[1],p):i===joints.length-1?sub(p,joints[i-1]):add(unit(sub(p,joints[i-1])),unit(sub(joints[i+1],p)));const normal=unit(point(-a.y,a.x)),w=widths[i];return [add(p,mul(normal,w)),add(p,mul(normal,-w))];});}
 return Object.freeze({Rig,legs,profiles,bodyScale,sourceWorld,bodyPoint,twoBone,legIK,footAt,braceAt,clawPalm,clawArm,solveTail,tailLengths,tailLength,sections,point,dist,clamp,lerp,ease,rot});
});
