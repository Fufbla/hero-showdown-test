import {BossArt} from '../boss-art.mjs';
import {BOSS_SPRITE_DATA as D,bossSpritePose} from '../boss-sprites.mjs';
import {SCORPION_REVIEW} from '../scorpion-sprites.mjs';
import {makeBoss,arenaSurfaces} from '../bosses.mjs';
import {BOSSES,attackFor} from '../boss-data.mjs';
const $=id=>document.getElementById(id),canvas=$('review'),c=canvas.getContext('2d');
const profile=r=>r===4?SCORPION_REVIEW:D.bosses[r];
let art=new BossArt(),b,clock=0,paused=false,previous=0,measurement=null,loaded=false,lastChoice='';
const labels={idle:'Idle',walk:'Movement',claw:'Claw strike',clawCombo:'Twin-claw combo',sting:'Stinger strike',stingPattern:'Stinger pattern',vine:'Thorn strike',vineCombo:'Thorn combo',thorns:'Thorn volley',poison:'Poison breath',roots:'Rising thorns',blast:'Energy blast',expansion:'Energy shockwave',debris:'Debris storm',atomic:'Atomic surge',hit:'Hit reaction',defeat:'Defeat / collapse'};
async function changeBoss(){
 const region=Number($('boss').value);loaded=false;b=makeBoss(region,arenaSurfaces()[0]);b.x=b.prevX=420;b.y=b.prevY=440;clock=0;lastChoice='';
 $('animation').replaceChildren();for(const state of profile(region).states){const option=document.createElement('option');option.value=state;option.textContent=labels[state];$('animation').append(option);}if(region===5){const o=document.createElement('option');o.value='vineCombo';o.textContent=labels.vineCombo;$('animation').append(o);}
 loaded=await art.prepare(region);$('status').textContent=loaded?`${profile(region).name} ready`:'Could not load atlas. Serve the repository through HTTP.';
}
function pose(dt){
 if(!b)return;const choice=$('animation').value,phase=Number($('phase').value);b.phase=phase;b.face=Number($('face').value);b.flash=0;b.state='idle';b.age=0;b.attack=null;b.prevX=b.x;
 if(choice!==lastChoice){art.visuals.delete(b);art.sprites.visuals.delete(b);lastChoice=choice;}
 if(choice==='walk'){b.x=420+Math.sin(clock*.6)*90;if(!dt)b.prevX=b.x;}
 else if(choice==='hit'){const age=clock%.9;b.flash=age<.12?.12-age:0;}
 else if(choice==='defeat'){b.state='dead';b.age=clock%1.8;}
 else if(choice!=='idle'){
  b.attack=attackFor(b,choice);b.attack.targetX=b.x+b.face*150;const a=b.attack,t=clock%(a.warning+a.duration+a.recovery);
  if(t<a.warning){b.state='windup';b.age=t;}else if(t<a.warning+a.duration){b.state='active';b.age=t-a.warning;}else{b.state='recover';b.age=t-a.warning-a.duration;}
 }
 art.step(b,clock,dt);
}
function draw(dt=0){
 pose(dt);c.fillStyle='#18373f';c.fillRect(0,0,900,520);c.fillStyle='#284d4c';c.fillRect(0,440,900,80);
 c.strokeStyle='#365953';c.lineWidth=1;for(let x=0;x<900;x+=50){c.beginPath();c.moveTo(x,0);c.lineTo(x,520);c.stroke();}
 c.strokeStyle='#8fbd8d';c.beginPath();c.moveTo(0,440);c.lineTo(900,440);c.stroke();if(!b)return;
 const contact=b.state==='active'&&(b.region!==4||b.age>=b.attack.duration*.65);
 c.fillStyle='#ffd773';c.font='bold 18px system-ui';if(b.state==='windup')c.fillText('ATTACK WARNING',25,40);if(contact)c.fillText('CONTACT',25,40);
 if(b.attack){c.strokeStyle='#ffe793';c.beginPath();c.arc(b.attack.targetX,440,22,0,Math.PI*2);c.stroke();}
 art.draw(c,b,{time:clock});
 if($('hitbox').checked){c.strokeStyle='#e1efff';c.setLineDash([5,5]);c.strokeRect(b.x-b.w/2,b.y-b.h,b.w,b.h);c.setLineDash([]);c.fillStyle='#ff8f88';c.fillRect(b.x-3,b.y-3,6,6);}
 const info=art.inspect(b);
 if(b.region===4&&$('joints').checked&&info.pose){const s=b.h/393;c.save();c.translate(b.x,b.y);c.scale(s,s);c.translate(-640,-573);c.lineWidth=4;c.font='bold 26px system-ui';for(const [i,l] of info.pose.legs.entries()){c.strokeStyle=i<4?'#6cffff':'#ffe766';c.fillStyle=c.strokeStyle;c.beginPath();l.joints.forEach((p,j)=>j?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();for(const p of l.joints){c.beginPath();c.arc(p.x,p.y,5,0,Math.PI*2);c.fill();}c.fillText(String(i+1),l.position.x-7,l.position.y+33);if(l.planted)c.strokeRect(l.position.x-10,l.position.y-4,20,8);}c.restore();}
 if(loaded)$('status').textContent=`${info.name} · ${labels[$('animation').value]} · Phase ${b.phase} · ${b.state} · ${b.region===4?'8 articulated legs':`Frame ${(info.selection?.frame??0)+1} / 32`}${paused?' · Paused':''}`;
}
function animate(now){const dt=previous?Math.min(.1,(now-previous)/1000):0,step=paused?0:dt*Number($('speed').value);clock+=step;
 if(measurement&&previous){measurement.frames.push(now-previous);if(now-measurement.start>=10000){const values=measurement.frames.sort((a,b)=>a-b),mean=values.reduce((a,b)=>a+b,0)/values.length;$('results').textContent=JSON.stringify({boss:profile(Number($('boss').value)).name,frames:values.length,meanFrameMs:mean,p95FrameMs:values[Math.floor(values.length*.95)],averageFPS:1000/mean,scope:'Browser animation preview, not full-game or physical-device performance'},null,2);measurement=null;$('measure').disabled=false;}}
 previous=now;draw(step);requestAnimationFrame(animate);
}
$('boss').onchange=changeBoss;for(const id of ['animation','phase'])$(id).onchange=()=>{clock=0;};$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume':'Pause';};$('step').onclick=()=>{paused=true;$('pause').textContent='Resume';clock+=1/60;draw(1/60);};
$('measure').onclick=()=>{measurement={start:performance.now(),frames:[]};$('measure').disabled=true;$('results').textContent='Measuring animation preview for 10 seconds…';};
$('validate').onclick=async()=>{
 $('validate').disabled=true;let checks=0;const failures=[],check=document.createElement('canvas');check.width=900;check.height=520;const cc=check.getContext('2d',{willReadFrequently:true});
 try{for(const region of [4,5,6]){const probe=new BossArt();if(!await probe.prepare(region)){failures.push(`Atlas ${region} failed to load`);continue;}checks++;
  for(const phase of [1,2,3])for(const kind of new Set([...BOSSES[region].patterns[phase-1],'idle','walk','hit','defeat']))for(const state of ['windup','active','recover']){
   const entity=makeBoss(region,arenaSurfaces()[0]);entity.x=400;entity.y=440;entity.prevX=400;entity.prevY=440;entity.phase=phase;entity.state=state;entity.attack=attackFor(entity,['idle','walk','hit','defeat'].includes(kind)?BOSSES[region].patterns[phase-1][0]:kind);entity.attack.targetX=550;entity.age=state==='windup'?entity.attack.warning*.7:state==='active'&&region===4?entity.attack.duration*.65:0;
   if(['idle','walk','hit','defeat'].includes(kind)){entity.state=kind==='defeat'?'dead':'idle';entity.age=kind==='defeat'?.75:0;entity.attack=null;if(kind==='walk')entity.prevX-=1;if(kind==='hit')entity.flash=.08;}
   const before=JSON.stringify(entity);probe.step(entity,1,1/60);cc.clearRect(0,0,900,520);probe.draw(cc,entity,{time:1.1});const pixels=cc.getImageData(0,0,900,520).data;let ink=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>16)ink++;
   if(ink<1000)failures.push(`${region}/${kind}/${state} blank render`);if(JSON.stringify(entity)!==before)failures.push('Rendering changed combat state');if(entity.state==='active'&&region!==4&&bossSpritePose(entity).frame%4!==2)failures.push('Contact delay');if(region===4&&probe.inspect(entity).pose.legs.length!==8)failures.push('Missing scorpion leg');checks++;
  }
 }}catch(e){failures.push(e.message);}
 $('results').textContent=JSON.stringify({checks,failures,passed:failures.length===0,scope:'Browser image decoding, actual canvas draws, all phase patterns and animation states, simulation isolation and contact timing'},null,2);$('validate').disabled=false;
};
for(const region of [4,5,6]){const p=profile(region),li=document.createElement('li'),atlas=document.createElement('a');atlas.href=region===4?'../assets/boss-sprites/atlases/regional-giant-scorpion.png':`../../${p.file}`;atlas.textContent=`${p.name} — transparent atlas`;atlas.download='';li.append(atlas,document.createTextNode(' · '));const contact=document.createElement('a');contact.href=`../qa/boss-sprites/batch2/regional-${region}-contact-sheet.png`;contact.textContent='all poses';li.append(contact);$('downloads').append(li);}
await changeBoss();requestAnimationFrame(animate);
