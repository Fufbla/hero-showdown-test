import {BossArt} from '../boss-art.mjs';
import {BOSS_SPRITE_DATA as D,bossSpritePose} from '../boss-sprites.mjs';
import {makeBoss,arenaSurfaces} from '../bosses.mjs';
import {BOSSES,attackFor} from '../boss-data.mjs';
const $=id=>document.getElementById(id),canvas=$('review'),c=canvas.getContext('2d');
let art=new BossArt(),b,clock=0,paused=false,previous=0,measurement=null,loaded=false;
const labels={idle:'Idle',walk:'Movement',swipe:'Heavy swipe',throw:'Trash throw',slam:'Ground slam',branch:'Branch sweep',vine:'Vine strike',thorns:'Thorn volley',roots:'Rising roots',punch:'Heavy punch',toxic:'Toxic shot',shockwave:'Toxic shockwave',hazard:'Toxic ground',hit:'Hit reaction',defeat:'Defeat / collapse',surge:'Phase surge'};
async function changeBoss(){
 const region=Number($('boss').value);loaded=false;b=makeBoss(region,arenaSurfaces()[0]);b.x=b.prevX=420;b.y=b.prevY=440;clock=0;
 $('animation').replaceChildren();for(const state of D.bosses[region].states.filter(s=>s!=='surge')){const option=document.createElement('option');option.value=state;option.textContent=labels[state];$('animation').append(option);}if(region===3){const o=document.createElement('option');o.value='shockwave';o.textContent=labels.shockwave;$('animation').append(o);}
 loaded=await art.prepare(region);$('status').textContent=loaded?`${D.bosses[region].name} ready`:'Could not load atlas. Serve the repository through HTTP.';
}
function pose(){
 if(!b)return;const choice=$('animation').value,phase=Number($('phase').value);b.phase=phase;b.face=Number($('face').value);b.flash=0;b.state='idle';b.age=0;b.attack=null;b.prevX=b.x;
 if(choice==='walk')b.prevX=b.x-.5;
 else if(choice==='hit'){const age=clock%.9;b.flash=age<.12?.12-age:0;}
 else if(choice==='defeat'){b.state='dead';b.age=clock%1.8;}
 else if(choice!=='idle'){
  b.attack=attackFor(b,choice);const a=b.attack,t=clock%(a.warning+a.duration+a.recovery);
  if(t<a.warning){b.state='windup';b.age=t;}else if(t<a.warning+a.duration){b.state='active';b.age=t-a.warning;}else{b.state='recover';b.age=t-a.warning-a.duration;}
 }
 art.step(b,clock,0);
}
function draw(){
 pose();c.fillStyle='#18373f';c.fillRect(0,0,900,520);c.fillStyle='#284d4c';c.fillRect(0,440,900,80);
 c.strokeStyle='#365953';c.lineWidth=1;for(let x=0;x<900;x+=50){c.beginPath();c.moveTo(x,0);c.lineTo(x,520);c.stroke();}
 c.strokeStyle='#8fbd8d';c.beginPath();c.moveTo(0,440);c.lineTo(900,440);c.stroke();if(!b)return;
 if(b.state==='windup'){c.fillStyle='#ffd773';c.font='bold 18px system-ui';c.fillText('ATTACK WARNING',25,40);}if(b.state==='active'){c.fillStyle='#f6f3bc';c.font='bold 18px system-ui';c.fillText('CONTACT',25,40);}
 art.draw(c,b,{time:clock});if($('hitbox').checked){c.strokeStyle='#e1efff';c.setLineDash([5,5]);c.strokeRect(b.x-b.w/2,b.y-b.h,b.w,b.h);c.setLineDash([]);c.fillStyle='#ff8f88';c.fillRect(b.x-3,b.y-3,6,6);}
 if(loaded){const info=art.inspect(b);$('status').textContent=`${info.name} · ${labels[$('animation').value]} · Phase ${b.phase} · ${b.state} · Frame ${(info.selection?.frame??0)+1} / 32${paused?' · Paused':''}`;}
}
function animate(now){const dt=previous?Math.min(.1,(now-previous)/1000):0;if(!paused)clock+=dt*Number($('speed').value);if(measurement&&previous){measurement.frames.push(now-previous);if(now-measurement.start>=10000){const values=measurement.frames.sort((a,b)=>a-b),mean=values.reduce((a,b)=>a+b,0)/values.length;const result={boss:D.bosses[Number($('boss').value)].name,frames:values.length,meanFrameMs:mean,p95FrameMs:values[Math.floor(values.length*.95)],averageFPS:1000/mean,scope:'Browser animation preview, not full-game or physical-device performance'};$('results').textContent=JSON.stringify(result,null,2);measurement=null;$('measure').disabled=false;}}
 previous=now;draw();requestAnimationFrame(animate);
}
$('boss').onchange=changeBoss;$('animation').onchange=()=>{clock=0;};$('phase').onchange=()=>{clock=0;};$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';};$('step').onclick=()=>{paused=true;$('pause').textContent='Resume';clock+=1/60;draw();};
$('measure').onclick=()=>{measurement={start:performance.now(),frames:[]};$('measure').disabled=true;$('results').textContent='Measuring animation preview for 10 seconds…';};
$('validate').onclick=async()=>{
 $('validate').disabled=true;let checks=0;const failures=[];
 for(const region of [1,2,3]){const probe=new BossArt();if(!await probe.prepare(region)){failures.push(`Atlas ${region} failed to load`);continue;}checks++;
  for(const phase of [1,2,3])for(const kind of new Set(BOSSES[region].patterns[phase-1]))for(const state of ['windup','active','recover']){
   const entity=makeBoss(region,arenaSurfaces()[0]);entity.x=400;entity.y=440;entity.prevX=400;entity.prevY=440;entity.phase=phase;entity.state=state;entity.attack=attackFor(entity,kind);entity.age=state==='windup'?entity.attack.warning*.7:0;
   const before=JSON.stringify(entity);probe.step(entity,0,0);const check=document.createElement('canvas');check.width=900;check.height=520;probe.draw(check.getContext('2d'),entity,{time:.1});const pixels=check.getContext('2d').getImageData(0,0,900,520).data;let ink=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)ink++;
   if(ink<1000)failures.push(`${region}/${kind}/${state} blank render`);if(JSON.stringify(entity)!==before)failures.push('Rendering changed combat state');if(state==='active'&&bossSpritePose(entity).frame%4!==2)failures.push('Contact delay');checks++;
  }
 }
 $('results').textContent=JSON.stringify({checks,failures,passed:failures.length===0,scope:'Browser image decoding, actual canvas draws, state isolation and contact timing'},null,2);$('validate').disabled=false;
};
for(const [region,profile] of Object.entries(D.bosses)){const li=document.createElement('li');const atlas=document.createElement('a');atlas.href=`../../${profile.file}`;atlas.textContent=`${profile.name} — transparent atlas`;atlas.download='';li.append(atlas,document.createTextNode(' · '));const contact=document.createElement('a');contact.href=`../qa/boss-sprites/regional-${region}-contact-sheet.png`;contact.textContent='all poses';li.append(contact);$('downloads').append(li);}
await changeBoss();requestAnimationFrame(animate);
