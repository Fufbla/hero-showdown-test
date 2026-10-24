'use strict';
const shoreTeamHud=document.createElement('div');shoreTeamHud.id='shore-team-hud';shoreTeamHud.hidden=true;
shoreTeamHud.innerHTML=heroes.map((h,i)=>'<div class="shore-health" id="shore-health-'+i+'" style="--hero-color:'+h.color+'"><div class="shore-health-label"><span>'+h.name.replace(/^super /i,'').toUpperCase()+'</span><span id="shore-hp-'+i+'">100</span></div><div class="shore-health-track"><i id="shore-health-fill-'+i+'"></i></div><div class="shore-power-track"><i id="shore-power-fill-'+i+'"></i></div></div>').join('');cleanStage.append(shoreTeamHud);
const shoreHudNodes=heroes.map((_,i)=>({card:document.getElementById('shore-health-'+i),hp:document.getElementById('shore-hp-'+i),health:document.getElementById('shore-health-fill-'+i),power:document.getElementById('shore-power-fill-'+i),last:''}));
const shoreBossHud=document.createElement('div');shoreBossHud.id='shore-boss-hud';shoreBossHud.hidden=true;shoreBossHud.innerHTML='<span>TOXIN SCORPION</span><div class=shore-boss-track><i id=shore-boss-fill></i></div><div class=shore-boss-cadence aria-hidden=true><b></b><b></b><b></b><b></b></div>';cleanStage.append(shoreBossHud);
function shoreLayout(){
 const active=mode==='fight'&&!paused&&!story.playing&&!specialSceneLocked()&&overlay.classList.contains('hidden');
 const battle=!!shore.model;
 const w=cleanStage.clientWidth,h=cleanStage.clientHeight,scale=Math.min(w/W,h/H),fw=W*scale,fh=H*scale,compact=fw<760;
 const gutters=active&&document.querySelector('.shell').classList.contains('touch-input')&&w>h&&w-fw>=160;
 const hadGutters=cleanTouch.classList.contains('shore-touch-gutters');cleanTouch.classList.toggle('shore-touch-gutters',gutters);
 if(gutters)Object.assign(cleanTouch.style,{left:'0px',top:((h-fh)/2)+'px',width:w+'px',height:fh+'px'});
 else if(hadGutters)layoutBattleControls();
 cleanTouch.classList.toggle('battle-controls-active',active);document.querySelector('.shell').classList.toggle('battle-view',battle);
 storyTagButton.hidden=!active;storyTagButton.disabled=!!story.tag||storyNextHero()<0;
 storyTagButton.querySelector('b').textContent=story.tag?'SWAPPING':story.tagQueued?'QUEUED':'TAG';
 if(active){const w=parseFloat(cleanTouch.style.width),h=parseFloat(cleanTouch.style.height),portrait=cleanTouch.dataset.layout==='portrait';storyTagButton.style.left=(parseFloat(cleanTouch.style.left)+w*(portrait?.5:.4))+'px';storyTagButton.style.top=(parseFloat(cleanTouch.style.top)+(portrait?48:h-8))+'px';}
 shoreTeamHud.hidden=!battle;shoreBossHud.hidden=!battle||shore.round!==3;
 if(!shoreBossHud.hidden){
  const portrait=cleanTouch.dataset.layout==='portrait',baseLeft=(w-fw)/2,baseTop=portrait?0:(h-fh)/2;
  shoreBossHud.classList.toggle('compact',compact);
  Object.assign(shoreBossHud.style,{left:(baseLeft+(compact?(portrait?10:fw*.48):fw*.66))+'px',top:(baseTop+(compact?fh-30:8))+'px',width:(compact?(portrait?fw-20:fw*.52-10):fw*.34-10)+'px'});
  document.getElementById('shore-boss-fill').style.width=(100*shore.model.hp/shore.model.maxHp)+'%';
  shoreBossHud.setAttribute('aria-label','Toxin Scorpion health '+Math.ceil(100*shore.model.hp/shore.model.maxHp)+' percent');
  shoreBossHud.querySelectorAll('b').forEach((b,i)=>b.classList.toggle('lit',i<shore.model.clawCount));
 }
 if(!battle)return;
 const portrait=cleanTouch.dataset.layout==='portrait',left=(w-fw)/2,top=portrait?0:(h-fh)/2;
 Object.assign(shoreTeamHud.style,{left:(left+10)+'px',top:(top+8)+'px',width:(compact?fw-20:fw*.55)+'px'});
 shoreTeamHud.classList.toggle('compact',compact);
 for(let i=0;i<3;i++){const p=story.team[i],n=shoreHudNodes[i];if(!p)continue;const key=[p.hp,p.power,selected].join(':');if(key===n.last)continue;n.last=key;
  n.card.classList.toggle('active',selected===i);n.card.classList.toggle('out',p.hp<=0);n.hp.textContent=p.hp<=0?'OUT':Math.ceil(p.hp)+' HP';
  n.health.style.width=clamp(p.hp,0,100)+'%';n.power.style.width=clamp(p.power,0,100)+'%';n.card.classList.toggle('charged',p.power>=100&&p.hp>0);
  n.card.setAttribute('aria-label',heroes[i].name+': '+Math.ceil(p.hp)+' health, '+Math.floor(p.power)+' power'+(selected===i?', active':''));
 }
}
function drawShorePuddle(p){
 const e=shore.model?.enemies.find(e=>e.pool===p.id&&['bubble','emerge'].includes(e.state));
 const age=shore.model?shore.model.time-p.born:1,opening=e?clamp(age/.22,0,1):1;
 const alpha=p.base?.65:e?1:clamp((10-age)/3,0,1)*.72;
 ctx.save();ctx.globalAlpha=alpha;
 const x=p.x,y=p.y+2,r=(p.base?48:57)*(.7+.3*opening);
 ellipse(x,y,r,10,'#0b1019d9');ellipse(x-13,y-2,r*.72,6,'#151d29');
 ellipse(x+r*.45,y+3,r*.48,5,'#080b12');
 ctx.strokeStyle='#71544d88';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y,r*.8,6,0,Math.PI,Math.PI*1.92);ctx.stroke();
 if(e){
  for(let j=0;j<5;j++){const q=(t*1.8+j*.21)%1,bx=x+Math.sin(j*12.7+p.id)*r*.7,by=y-2-Math.sin(q*Math.PI)*12,br=(3+Math.sin(j*3)*1.5)*(1-q*.45);ellipse(bx,by,br,br,'#1d2935');ctx.strokeStyle='#bc9b6c99';ctx.lineWidth=1;ctx.beginPath();ctx.arc(bx-1,by-1,br*.6,Math.PI,Math.PI*1.65);ctx.stroke();}
  ctx.strokeStyle=e.type==='jump'?'#93d9d966':'#ded48a66';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(x,y,r*(.9+.1*Math.sin(t*14)),11,0,0,Math.PI*2);ctx.stroke();
 }
 ctx.restore();
}
function shoreSprite(frame,x,y,face,alpha=1,squash=1){
 if(!shoreAtlas.complete||!shoreAtlas.naturalWidth)return;
 const row=Math.floor(frame/6),col=frame%6,baseline=[241,243,227,215][row];
 ctx.save();ctx.translate(x,y);ctx.scale(-face*.86,.86*squash);ctx.globalAlpha*=alpha;
 ctx.drawImage(shoreAtlas,col*256,row*256,256,256,-128,-baseline,256,256);ctx.restore();
}
function shoreEnemyFrame(e){
 if(e.state==='air'){const p=e.age/e.duration;return p<.22?8:p<.58?9:10;}
 if(e.state==='land')return 11;
 if(e.state==='windup')return e.age<.3?6:7;
 if(e.state==='warn')return 12;
 if(e.state==='strike')return 13+Math.min(3,Math.floor(e.age/.12));
 if(e.hitFlash>0)return 18;
 return Math.floor(e.cycle)%6;
}
function drawShoreSplit(s){
 const p=clamp(s.age/s.duration,0,1),settle=1-Math.pow(1-p,3);
 const x=s.x+(s.toX-s.x)*settle,y=s.y+(GROUND-s.y)*settle;
 const fade=s.purged?1-clamp((p-.5)/.5,0,1):1;
 ellipse(x,GROUND+3,120,10,'#080e1866');
 // Six painted frames: one oily body stretches, divides, and separates.
 // Crossfade into the existing movement sprites, keeping the child feet fixed.
 const blend=clamp((p-.78)/.22,0,1),frame=Math.min(5,Math.floor(p*6));
 if(shoreSplitAtlas.complete&&shoreSplitAtlas.naturalWidth){
  const cw=shoreSplitAtlas.naturalWidth/3,ch=shoreSplitAtlas.naturalHeight/2;
  const size=280+144*clamp(p/.5,0,1),feet=[465,462,464,402,403,407][frame]/512;
  ctx.save();ctx.globalAlpha=fade*(1-blend);ctx.drawImage(shoreSplitAtlas,(frame%3)*cw,Math.floor(frame/3)*ch,cw,ch,x-size/2,y-feet*size,size,size);ctx.restore();
 }
 if(blend>0){shoreSprite(0,s.toX-96,GROUND,-1,blend*fade);shoreSprite(0,s.toX+96,GROUND,1,blend*fade);}
}
function drawShoreEnemy(e){
 if(e.state==='bubble'||e.state==='split')return;
 const height=GROUND-e.y,shadow=Math.max(.22,1-height/220);
 ellipse(e.x,GROUND+3,70*shadow,8*shadow,'#080e1866');
 if(e.state==='emerge'){
  const progress=clamp(e.age/.72,0,1);ctx.save();ctx.beginPath();ctx.rect(0,0,W,GROUND+4);ctx.clip();
  shoreSprite(Math.floor(progress*6)%6,e.x,GROUND+(1-progress)*172,e.face,1,.96+.04*progress);ctx.restore();
 }else{
  const squeeze=e.state==='windup'?1-.10*Math.sin(clamp(e.age/.65,0,1)*Math.PI):1;
  shoreSprite(shoreEnemyFrame(e),e.x,e.y,e.face,1,squeeze);
  if(e.state==='warn'||e.state==='windup'){
   ctx.save();ctx.globalAlpha=.45+.3*Math.sin(t*17);ctx.strokeStyle=e.type==='jump'?'#9fe7ff':'#ffb671';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(e.x,GROUND+3,79,12,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
 }
}
function drawShoreEffects(){
 for(const s of shots)tornado(s);
 for(const e of effects){
  if(e.type==='shoreClear'){ctx.save();ctx.globalAlpha=.16*(e.life/e.max);rect(0,0,W,H,e.color);ctx.restore();continue;}
  if(e.type==='comboStrike'){drawComboImpact(e);continue;}
  if(e.type==='rockSmash'||e.type==='superPunch'){drawPowerEffect(e);continue;}
  if(e.type==='impact'){ctx.save();ctx.globalAlpha=e.life/e.max;ctx.strokeStyle='#ffefb6';ctx.lineWidth=5;const r=15+(1-e.life/e.max)*45;ctx.beginPath();ctx.arc(e.x,e.y,r,0,Math.PI*2);ctx.stroke();ctx.restore();}
  if(e.type==='ghost')heroArt(selected,9,e.x,e.y,e.face||hero.face,.24);
 }
 for(const p of particles)ellipse(p.x,p.y,p.r,p.r,p.color);
}
const shoreDraw=draw;
draw=function(...args){
 if(!shore.active){shoreTeamHud.hidden=true;shoreBossHud.hidden=true;if(cleanTouch.classList.contains('shore-touch-gutters')){cleanTouch.classList.remove('shore-touch-gutters');layoutBattleControls();}return shoreDraw(...args);}
 shoreLayout();ctx.save();ctx.clearRect(0,0,W,H);
 if(shake>0&&mode==='fight'&&!paused)ctx.translate(Math.sin(t*90)*shake,Math.cos(t*73)*shake*.35);
 if(shoreBackground.complete&&shoreBackground.naturalWidth)ctx.drawImage(shoreBackground,0,0,W,H);else rect(0,0,W,H,'#291e32');
 for(const p of shore.model?.pools||HealthiaShoreCore.POOLS.map((p,i)=>({...p,id:i,born:0,base:true})))drawShorePuddle(p);
 if(shore.model?.kind==='boss')drawShoreBossBack(shore.model);
 for(const e of shore.model?.enemies||[])drawShoreEnemy(e);
 for(const s of shore.model?.splits||[])drawShoreSplit(s);
 for(const d of shore.model?.remains||[]){const age=1-d.life/d.max;shoreSprite(18+Math.min(5,Math.floor(age*6)),d.x,d.y,d.face,clamp(d.life/.16,0,1));}
 const playing=!!shore.model;
 if(playing&&hero){
  ellipse(hero.x,GROUND+4,70,10,'#221a3055');drawDashTrails();fighter(hero.x,hero.y,0,0,mode==='defeat');drawHeroPower();
  if(hero.block){ctx.strokeStyle='#9cf9e1aa';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(hero.x+hero.face*45,hero.y-140,70,110,0,-1.5,1.5);ctx.stroke();}
 }else heroArt(selected,0,640,GROUND,1);
 if(shore.model?.kind==='boss')drawShoreBossFront(shore.model);
 drawShoreEffects();
 if(shore.phase==='victory'){
  ctx.save();ctx.globalAlpha=clamp(ending/.3,0,1);ctx.shadowColor='#191b29';ctx.shadowBlur=8;
  battleText(shore.round===1?'THE SHORE FALLS QUIET…':shore.round===2?'SOMETHING STIRS BENEATH THE SAND…':'SHORE FRONT CLEARED',W/2,180,38,'#fff3c2','center');ctx.restore();
 }
 ctx.restore();
};
