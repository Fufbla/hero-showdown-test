// Deliberately isolated practice fixtures. This module never reads or writes browser saves.
import {Game,STEP} from '../core.mjs';
import {POWERS,POWER_IDS} from '../powers.mjs';
import {Input} from '../input.mjs';
import {Renderer} from '../renderer.mjs';
const $=id=>document.getElementById(id),renderer=new Renderer($('game'));
let game,paused=false,slots=['strength','superKick','fireball'],sample=null,last=performance.now(),accumulator=0,hudAge=0;
const input=new Input(document,togglePause);
for(let i=0;i<3;i++){
  const label=document.createElement('label');label.textContent=`Power ${i+1} `;const select=document.createElement('select');select.id=`lab-slot-${i}`;
  for(const id of POWER_IDS.filter(id=>!POWERS[id].passive)){const o=document.createElement('option');o.value=id;o.textContent=POWERS[id].name;select.append(o);}
  select.value=slots[i];select.onchange=()=>{const previous=slots[i],other=slots.indexOf(select.value);if(other>=0&&other!==i){slots[other]=previous;$(`lab-slot-${other}`).value=previous;}slots[i]=select.value;reset();};label.append(select);$('lab-slots').append(label);
}
function reset(){
  game=new Game();game.started=true;game.enemies=[];game.hero.level=99;game.hero.hp=game.hero.maxHp=1570;game.hero.x=game.hero.prevX=360;game.hero.invulnerable=0;game.powers.data.equipped=[...slots];
  const level=Number($('lab-level').value);for(const id of POWER_IDS)game.powers.data.levels[id]=id==='speed'&&!$('lab-speed').checked?0:level;
  game.look={...game.look,name:'Coastal Champion',suit:'#315b7c',trim:'#e6c879',emblem:'bolt',emblemColor:'#f1d79a',capeColor:'#725455'};
  const build=$('lab-build').value;game.look.build=build;if(build==='slender')Object.assign(game.look,{height:.88,arms:.85,legs:.85,torso:.85});if(build==='full')Object.assign(game.look,{height:1.12,arms:1.15,legs:1.15,torso:1.15,muscle:1});
  const mode=$('lab-targets').value;for(let i=0;i<(mode==='boss'?1:6);i++){
    const e=game.makeEnemy(['bottle','slime','crawler'][i%3],400+i*19,'sand-a',i);Object.assign(e,{hp:5000,maxHp:5000,protection:0,stagger:mode==='air'?10000:0});
    if(mode==='boss'){e.boss=e.legendary=true;e.w=62;e.h=66;}if(mode==='air'){e.y=e.prevY=500;e.flying=true;}
    game.enemies.push(e);
  }
  paused=false;game.paused=false;input.enabled=true;input.clear();$('lab-pause').hidden=true;renderer.camera=0;renderer.particles=[];accumulator=0;updateHud();
}
function togglePause(){paused=!paused;game.paused=paused;input.enabled=!paused;input.clear();$('lab-pause').hidden=!paused;}
function updateHud(){
  $('hp-text').textContent=`${Math.ceil(game.hero.hp)} / ${game.hero.maxHp}`;$('hp-fill').style.width=`${100*game.hero.hp/game.hero.maxHp}%`;
  for(const [i,b] of [...document.querySelectorAll('.power-button')].entries()){
    const id=slots[i],def=POWERS[id];b.querySelector('b').textContent=def.icon;b.querySelector('span').textContent=def.name;b.setAttribute('aria-label',`${def.name} · ${game.powers.active[id]?'active':game.powers.ready(id)?'ready':'recovering'}`);b.classList.toggle('cooldown',game.powers.cooldowns[id]>0);b.classList.toggle('active',!!game.powers.active[id]);
  }
  $('lab-readout').textContent=`${game.hero.flying?'FLYING · only Fireball can attack':game.hero.steel?'STEEL BODY · knockback immune':'BASIC ATTACKS ALWAYS AVAILABLE'}\n${game.enemies.filter(e=>e.state!=='dead').length} targets · ${game.enemies.filter(e=>e.rooted).length} rooted · ${game.enemies.filter(e=>e.lifted).length} lifted${game.hero.agile?' · AGILITY ACTIVE':''}`;
}
for(const id of ['lab-level','lab-targets','lab-build','lab-speed'])$(id).onchange=reset;
$('reset-arena').onclick=reset;$('pause-lab').onclick=togglePause;$('lab-pause').onclick=togglePause;
$('hit-test').onclick=()=>{game.hero.invulnerable=0;game.hurt(100,game.hero.x-50,{boss:$('lab-targets').value==='boss',legendary:$('lab-targets').value==='boss'});updateHud();};
$('measure').onclick=()=>{sample={start:performance.now(),frames:0,draw:0,max:0,intervals:[]};$('performance').textContent='Measuring visible animation frames for 30 seconds…';$('measure').disabled=true;};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused)togglePause();if(document.hidden&&sample){sample=null;$('performance').textContent='Measurement cancelled: keep this tab visible.';$('measure').disabled=false;}});
reset();
function frame(now){
  const elapsed=Math.max(0,(now-last)/1000);last=now;input.pollGamepad();
  if(!paused){accumulator+=Math.min(.1,elapsed);while(accumulator>=STEP){game.step(STEP,input.sample());accumulator-=STEP;}for(const event of game.drain())renderer.event(event);}else accumulator=0;
  const begin=performance.now();renderer.draw(game,paused?1:accumulator/STEP,Math.min(.1,elapsed));const draw=performance.now()-begin;
  if(sample){sample.frames++;sample.draw+=draw;sample.max=Math.max(sample.max,draw);sample.intervals.push(elapsed*1000);if(now-sample.start>=30000){const seconds=(now-sample.start)/1000,sorted=sample.intervals.sort((a,b)=>a-b);$('performance').textContent=`${seconds.toFixed(1)}s · ${(sample.frames/seconds).toFixed(1)} FPS · draw avg ${(sample.draw/sample.frames).toFixed(2)}ms / max ${sample.max.toFixed(2)}ms · p95 frame ${sorted[Math.floor(sorted.length*.95)].toFixed(1)}ms. This browser only.`;sample=null;$('measure').disabled=false;}}
  hudAge+=elapsed;if(hudAge>.1){updateHud();hudAge=0;}requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
