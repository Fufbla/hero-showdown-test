/* User-run approval harness. Not loaded by the game. */
'use strict';
const $=id=>document.getElementById(id),preview=$('preview'),q=s=>preview.contentWindow.eval(s);
let loadSerial=0,ready=false,controlled=true,running=true,lastTime=0,reviewTime=0,accumulator=0,events=new Set(),fps=[];
const ids=['air','styrodog','sonic','venomis','styro','wastelander','atomdust','spree','bushman'];
function reset(id=$('fighter').value,keepGallery=false){
 controlled=true;running=true;reviewTime=0;accumulator=0;events.clear();if(!keepGallery)$('gallery').replaceChildren();preview.hidden=false;$('pause-motion').textContent='Pause motion';
 q(`reviewControlled=true;HealthiaCompetitive.beginMatch({ids:[${JSON.stringify(id)},${JSON.stringify(id)}],kind:'local',venue:0});HealthiaCompetitiveAnimation.enableInspection(true);HealthiaCompetitive.session.world.fighters.forEach((f,i)=>{f.x=i?930:350;f.power=100;f.charge=4;});`);
 draw();$('status').textContent='Looping '+$('sequence').selectedOptions[0].textContent+' · '+$('fighter').selectedOptions[0].textContent;
}
function event(at,name,code){if(reviewTime>=at&&!events.has(name)){events.add(name);q(code);}}
function advance(dt){
 const s=$('sequence').value,air=s.startsWith('air-'),jump=s==='jump'||air||s==='ko';reviewTime+=dt;
 const walk=s==='walk'?(reviewTime%2<1?.6:-.6):jump&&reviewTime<.8?.4:0;
 q(`HealthiaCompetitive.session.keyboard=[${walk>0?'{right:true}':walk<0?'{left:true}':'{}'},${walk>0?'{left:true}':walk<0?'{right:true}':'{}'}];`);
 if(jump)event(.12,'jump',`HealthiaCompetitive.session.world.fighters.forEach(f=>HealthiaCompetitive.Combat.queue(HealthiaCompetitive.session.world,f.slot,'jump'));`);
 if(air)event(.30,'strike',`HealthiaCompetitive.session.world.fighters.forEach(f=>HealthiaCompetitive.Combat.begin(HealthiaCompetitive.session.world,f,${JSON.stringify(s.slice(4))}));`);
 if(['punch','heavyPunch','kick','heavyKick','sweep','uppercut','shoot','skill','special'].includes(s))event(.35,'strike',`HealthiaCompetitive.session.world.fighters.forEach(f=>HealthiaCompetitive.Combat.begin(HealthiaCompetitive.session.world,f,${JSON.stringify(s)}));`);
 if(s==='block')q('HealthiaCompetitive.session.keyboard=[{block:true},{block:true}];');
 if(s==='hit'||s==='knockdown')event(.45,'hurt',`HealthiaCompetitive.session.world.fighters.forEach(f=>HealthiaCompetitive.Combat.hurt(HealthiaCompetitive.session.world,f,8,f.x+f.face*100,{knockdown:${s==='knockdown'}}));`);
 if(s==='ko')event(.35,'ko',`HealthiaCompetitive.Combat.hurt(HealthiaCompetitive.session.world,HealthiaCompetitive.session.world.fighters[0],100,900);HealthiaCompetitive.Combat.settle(HealthiaCompetitive.session.world);`);
 // Tick the real competitive simulation, including collision, projectiles and effects.
 q(`paused=false;overlay.classList.add('hidden');HealthiaCompetitive.tick(${dt});`);draw();
 if(reviewTime>2.5)reset();
}
function draw(){q(`HealthiaCompetitive.render();if(${!!$('bounds').checked}){ctx.save();ctx.strokeStyle='#ffe36d';ctx.lineWidth=2;for(const f of HealthiaCompetitive.session.world.fighters){const b=HealthiaCompetitive.Combat.box(f);ctx.strokeRect(b.left,b.top,b.right-b.left,b.bottom-b.top);ctx.fillStyle='#ffea81';ctx.fillRect(f.x-3,f.y-3,6,6);}ctx.restore();}`);
 const data=q(`HealthiaCompetitive.session.world.fighters.map(f=>({state:HealthiaCompetitiveAnimation.inspect(f)?.state,frame:HealthiaCompetitiveAnimation.inspect(f)?.pose,y:Math.round(f.y),vx:Math.round(f.vx)}))`);
 $('readout').textContent=`${reviewTime.toFixed(2)} s  ·  `+data.map((f,i)=>`P${i+1}: ${f.state}, frame ${f.frame}, y ${f.y}, speed ${f.vx}`).join('  |  ');
}
function frame(now){if(lastTime&&ready&&controlled&&running&&!document.hidden){const dt=Math.min((now-lastTime)/1000,.05)*Number($('speed').value);accumulator+=dt;while(accumulator>=1/60){accumulator-=1/60;advance(1/60);}}lastTime=now;requestAnimationFrame(frame);}requestAnimationFrame(frame);
async function gallery(){
 $('gallery').className='';running=false;preview.hidden=true;$('gallery').replaceChildren();const s=$('sequence').value;
 for(const id of ids){
  reset(id,true);running=false;const target=s==='jump'?.48:s==='walk'?.6:s==='hit'||s==='knockdown'?.55:s==='ko'?1.17:s==='block'?.6:q(`(()=>{const m=HealthiaCompetitive.Data.moves[${JSON.stringify(id)}][${JSON.stringify(s.replace('air-',''))}];return ${s.startsWith('air-')?.30:.35}+m.startup+m.active*.3;})()`);while(reviewTime+1e-6<target)advance(1/120);
  const src=q('document.querySelector("canvas").toDataURL("image/png")'),fig=document.createElement('figure'),im=document.createElement('img'),cap=document.createElement('figcaption');im.src=src;im.alt=DataName(id)+' '+s+' both directions';cap.textContent=DataName(id)+' · '+s;fig.append(im,cap);$('gallery').append(fig);
 }
 preview.hidden=true;$('status').textContent='Nine villains, same sequence, both facing directions.';
}
function DataName(id){return q(`HealthiaCompetitive.Data.byId[${JSON.stringify(id)}].name`);}
async function strip(){
 $('gallery').className='strip';reset();running=false;const s=$('sequence').value,steps=s==='jump'?[.10,.16,.27,.47,.65,.82,.88,1.05]:s.startsWith('air-')?[.10,.17,.28,.35,.47,.60,.77,.88]:s==='walk'?[.06,.13,.20,.27,.34,.41,.48,.55]:s==='knockdown'||s==='ko'?[.42,.47,.55,.64,.75,.91,1.05,1.18]:[.30,.36,.43,.50,.58,.66,.77,.94];
 $('gallery').replaceChildren();for(const target of steps){while(reviewTime+1e-6<target)advance(1/120);const data=q('({x:HealthiaCompetitive.session.world.fighters[0].x,pose:HealthiaCompetitiveAnimation.inspect(HealthiaCompetitive.session.world.fighters[0])})'),c=document.createElement('canvas');c.width=400;c.height=500;c.getContext('2d').drawImage(preview.contentDocument.querySelector('canvas'),data.x-200,150,400,500,0,0,400,500);const fig=document.createElement('figure'),im=document.createElement('img'),cap=document.createElement('figcaption');im.src=c.toDataURL();im.alt=target.toFixed(2)+' seconds '+data.pose.state;cap.textContent=target.toFixed(2)+' s · '+data.pose.state+' · frame '+data.pose.pose;fig.append(im,cap);$('gallery').append(fig);}
 preview.hidden=true;$('status').textContent='Sequence frames in time order · '+$('fighter').selectedOptions[0].textContent;
}
async function verify(){
 running=false;const checks=[];const check=(name,code)=>{try{const value=q(`(()=>{${code}})()`);checks.push({name,pass:value===true,detail:value===true?undefined:value});}catch(e){checks.push({name,pass:false,error:e.message});}};
 check('All new and original art loaded',`return HealthiaVillainMotion.ready()&&HealthiaVillainMotion.metrics().errors.length===0;`);
 for(const id of ids){
  reset(id);running=false;
  check(id+' jump phases, independent facing, air momentum and landing',`const C=HealthiaCompetitive.Combat,A=HealthiaCompetitiveAnimation,w=C.create({ids:['${id}','${id}']});const seen=new Set();for(const f of w.fighters){f.vx=f.face*210;C.queue(w,f.slot,'jump');}for(let n=0;n<150;n++){if(n===20)w.fighters.forEach(f=>C.begin(w,f,'kick'));C.step(w,[{right:true},{left:true}],C.STEP);for(const f of w.fighters){const before=JSON.stringify(w);A.draw(f,w.fighters[1-f.slot],w);const p=A.inspect(f);seen.add(p.state);if(p.facing!==(f.action?.face??f.face)||JSON.stringify(w)!==before)return {error:'Facing or render mutation',p};if(f.action&&f.y<C.GROUND-.1&&Math.abs(f.vx)<1)return 'Air momentum lost';}}return seen.has('rise')&&seen.has('air-kick')&&seen.has('landing')&&w.fighters.every(f=>f.y===C.GROUND)||[...seen];`);
  check(id+' all moves render distinct phases without changing combat',`const C=HealthiaCompetitive.Combat,A=HealthiaCompetitiveAnimation;for(const face of [-1,1])for(const key of Object.keys(HealthiaCompetitive.Data.moves['${id}']))for(const fraction of [.01,.5,.99]){const w=C.create({ids:['${id}','summy']}),f=w.fighters[0];f.face=face;f.power=100;f.charge=9;C.begin(w,f,key);if(!f.action)continue;for(const stage of [0,1,2]){const a=f.action;a.age=stage===0?a.spec.startup*fraction:stage===1?a.spec.startup+a.spec.active*fraction:a.spec.startup+a.spec.active+a.spec.recovery*fraction;const before=JSON.stringify(w);A.draw(f,w.fighters[1],w);const p=A.inspect(f);if(p.facing!==face||JSON.stringify(w)!==before||!p.state)return {key,stage,p};}}return true;`);
  check(id+' knockout reaches the floor without extra damage',`const C=HealthiaCompetitive.Combat,w=C.create({ids:['${id}','summy']}),f=w.fighters[0];f.y=450;f.vy=-450;f.hp=0;C.settle(w);for(let n=0;n<240;n++)C.step(w,[{},{}],C.STEP);return f.y===C.GROUND&&f.vy===0&&w.fighters[1].hp===100;`);
 }
 check('AtomDust uses connected art for jumps, strikes and walking',`const A=HealthiaVillainAtlas,C=HealthiaCompetitive.Combat,R=HealthiaCompetitiveAnimation,w=C.create({ids:['atomdust','summy']}),f=w.fighters[0];for(let n=0;n<8;n++){f.vx=200;f.walk=(n+.1)/8;R.draw(f,w.fighters[1],w);if(R.inspect(f).sheet!=='atomdust_walk')return R.inspect(f);}return A.atomdust.frames.length===16&&A.atomdust_walk.frames.length===8&&A.atomdust_punch.frames.length===4;`);
 check('Warm nine-villain mirror rendering stays inside 60 Hz CPU budget',`const C=HealthiaCompetitive.Combat,A=HealthiaCompetitiveAnimation,samples=[];for(const id of ${JSON.stringify(ids)}){const w=C.create({ids:[id,id]});w.fighters.forEach(f=>{f.y=480;f.vy=-300;});for(let n=0;n<4;n++)w.fighters.forEach(f=>A.draw(f,w.fighters[1-f.slot],w));for(let n=0;n<60;n++){const start=performance.now();w.fighters.forEach(f=>A.draw(f,w.fighters[1-f.slot],w));samples.push(performance.now()-start);}}samples.sort((a,b)=>a-b);window.motionPerf={p95:samples[Math.floor(samples.length*.95)],max:Math.max(...samples),samples:samples.length};return motionPerf.p95<16.67||motionPerf;`);
 $('results').textContent=JSON.stringify({checks,failures:checks.filter(c=>!c.pass).length,performance:q('window.motionPerf'),metrics:q('HealthiaVillainMotion.metrics()')},null,2);$('status').textContent=`Movement checks: ${checks.filter(c=>c.pass).length}/${checks.length} passed.`;draw();
}
$('replay').onclick=()=>reset();$('pause-motion').onclick=()=>{running=!running;$('pause-motion').textContent=running?'Pause motion':'Resume motion';};$('step').onclick=()=>{running=false;advance(1/60);$('pause-motion').textContent='Resume motion';};
$('fighter').onchange=$('sequence').onchange=()=>reset();$('gallery-button').onclick=gallery;$('verify').onclick=verify;$('strip-button').onclick=strip;$('bounds').onchange=draw;
$('play').onclick=()=>{controlled=false;preview.hidden=false;$('gallery').replaceChildren();q(`reviewControlled=false;HealthiaCompetitive.beginMatch({ids:[${JSON.stringify($('fighter').value)},'bushman'],kind:'cpu',difficulty:'medium',venue:0});`);preview.focus();$('status').textContent='Playable CPU match. Pause opens the move list.';};
$('size').onchange=e=>{preview.className=e.target.value;q('showBattleTouch();layoutBattleControls();HealthiaCompetitive.render();');};
preview.onload=async()=>{const token=++loadSerial;ready=false;try{
 for(let i=0;i<250;i++){if(q('typeof HealthiaCompetitive!=="undefined"&&HealthiaCompetitive.ready()'))break;await new Promise(r=>setTimeout(r,100));}
 await q('HealthiaVillainMotion.whenLoaded');if(token!==loadSerial)return;if(!q('HealthiaCompetitive.ready()'))throw Error('Artwork failed to load: '+JSON.stringify(q('HealthiaVillainMotion.metrics()')));
 q(`HealthiaIntro.dismiss();muted=true;if(master)master.gain.value=0;window.reviewControlled=true;window.reviewOriginalFrame=frame;frame=function(ms){if(reviewControlled){last=ms;requestAnimationFrame(frame);}else reviewOriginalFrame(ms);};`);
 $('fighter').replaceChildren();for(const id of ids){const o=document.createElement('option');o.value=id;o.textContent=DataName(id);$('fighter').append(o);}$('fighter').value='styro';document.querySelectorAll('button').forEach(b=>b.disabled=false);ready=true;reset();
 }catch(e){$('status').textContent='Load failed: '+e.message;}};
