import {MonsterAtlas,MONSTER_HEIGHT} from '../monster-art.mjs';
import {MONSTER_ANIMATIONS} from '../monster-animation-catalog.mjs';
import {MONSTER_SPRITES} from '../monster-sprite-catalog.mjs';
import {WORLD_REGIONS,TYPES} from '../world.mjs';
import {Game,STEP} from '../core.mjs';
import {Renderer} from '../renderer.mjs';
import {PROFILE_KEY} from '../saves.mjs';
const $=id=>document.getElementById(id),atlas=new MonsterAtlas(),film=$('film'),fc=film.getContext('2d'),results={regions:[],benchmarks:[],userAgent:navigator.userAgent,scope:'Cloud browser; no physical device claims'},frames=[];
let cards=[],types=[],time=.3,animating=false,request=0;
for(const r of WORLD_REGIONS){const o=document.createElement('option');o.value=r.id;o.textContent=`${r.id}. ${r.name}`;$('region').append(o);}
const typeRegion=()=>Number($('region').value),night=()=>typeRegion()>2&&$('night').checked;
const entity=(type,clip,t)=>({type,id:0,face:1,state:clip==='idle'?'idle':clip==='move'?'chase':clip==='attack'?(t%1<.5?'warn':t%1<.78?'strike':'recover'):clip==='defeat'?'dead':'idle',age:clip==='attack'?(t%1<.5?t%1*1.3:t%1<.78?t%1-.5:t%1-.78):0,walkCycle:t*.8,flash:clip==='hit'?.12*(1-t%1):0,deadAge:clip==='defeat'?t%1*.55:0,hp:50,maxHp:100,desperate:true});
function sprite(c,e,t,scale=1){c.save();c.scale(scale,scale);if(e.state==='dead'){const f=e.deadAge/.55;c.globalAlpha=1-f;if(!atlas.hasAnimation(e.type)){c.scale(1+f*.15,1-f*.8);c.rotate(-f*.25);}}atlas.draw(c,e,t,night());c.restore();}
function render(t){
 const chosen=$('motion').value;for(const [i,{canvas,c}]of cards.entries()){
  c.clearRect(0,0,canvas.width,canvas.height);const clip=chosen==='cycle'?['idle','move','attack','hit','defeat'][Math.floor(t/2)%5]:chosen;
  c.fillStyle='#0b1a2566';c.beginPath();c.ellipse(210,225,90,7,0,0,Math.PI*2);c.fill();c.save();c.translate(210,222);sprite(c,entity(types[i],clip,t),t,Math.min(2.6,160/MONSTER_HEIGHT[types[i]]));c.restore();c.font='14px system-ui';c.textAlign='center';c.fillStyle='#d3e6c4';c.fillText(clip.toUpperCase(),210,260);
 }
}
function filmstrip(){fc.fillStyle='#f1eddd';fc.fillRect(0,0,1260,600);fc.textAlign='center';fc.font='bold 17px system-ui';fc.fillStyle='#173641';const clips=['idle','move','attack','hit','defeat'];
 clips.forEach((clip,j)=>fc.fillText(clip.toUpperCase(),126+j*252,24));
 for(const [i,type]of types.entries())for(const [j,clip]of clips.entries()){
  const x=126+j*252,y=170+i*195;fc.strokeStyle='#9bafa8';fc.beginPath();fc.moveTo(x-100,y+.5);fc.lineTo(x+100,y+.5);fc.stroke();fc.save();fc.translate(x,y);sprite(fc,entity(type,clip,clip==='attack'?.66:.28),.28,Math.min(1.7,112/MONSTER_HEIGHT[type]));fc.restore();fc.fillStyle='#173641';fc.font='13px system-ui';fc.fillText(TYPES[type].name,x,y+22);
 }
}
async function select(){animating=false;$('animate').textContent='Animate poses';types=Object.keys(TYPES).filter(k=>TYPES[k].region===typeRegion());$('gallery').replaceChildren();cards=types.map(type=>{const f=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');canvas.width=420;canvas.height=280;canvas.className='art';canvas.setAttribute('aria-label',TYPES[type].name);caption.textContent=TYPES[type].name;const small=document.createElement('small');small.textContent=MONSTER_ANIMATIONS[type]?'30 transparent PNG frames · five drawn animation states':`${MONSTER_SPRITES[type].width} × ${MONSTER_SPRITES[type].height} source-derived PNG · provisional motion`;caption.append(small);f.append(canvas,caption);$('gallery').append(f);return {canvas,c:canvas.getContext('2d')};});
 $('status').textContent='Loading selected region…';const ok=await atlas.preload(typeRegion());render(time);filmstrip();$('status').textContent=ok?'Region assets loaded. Captions identify completed frame animation and provisional motion.':'This region still uses the original artwork, or an asset failed to load.';
}
$('region').onchange=select;$('motion').onchange=()=>render(time);$('night').onchange=()=>{render(time);filmstrip();};
$('animate').onclick=()=>{animating=!animating;$('animate').textContent=animating?'Freeze poses':'Animate poses';if(animating)requestAnimationFrame(loop);};function loop(now){if(!animating)return;time=now/1000;render(time);requestAnimationFrame(loop);}
function download(content,name,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('download-sheet').onclick=()=>film.toBlob(b=>download(b,`Region-${typeRegion()}-monster-motion-review.png`,'image/png'));
$('download-results').onclick=()=>download(JSON.stringify(results,null,2),'monster-sprite-results.json','application/json');
$('checks').onclick=async()=>{let checks=0;const check=(ok,label)=>{if(!ok)throw Error(label);checks++;},start=performance.now();$('checks').disabled=true;try{
 check(await atlas.preload(typeRegion()),'all region assets loaded');
 for(const type of types){const snapshots=[],frameCount=MONSTER_ANIMATIONS[type]?.frameCount||28;for(const n of [false,true]){
  const canvas=atlas.atlas(type,n),{w,h,columns,baseline}=atlas.cellFor(type);check(!!canvas,type+' new atlas exists');
  const c=canvas.getContext('2d',{willReadFrequently:true});for(let f=0;f<frameCount;f++){
   const data=c.getImageData(f%columns*w,Math.floor(f/columns)*h,w,h).data;let count=0,minX=w,maxX=0,minY=h,maxY=0,hash=2166136261;
   for(let i=0;i<data.length;i+=4){hash=Math.imul(hash^data[i],16777619)>>>0;if(data[i+3]>20){count++;const x=i/4%w,y=Math.floor(i/4/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
   check(count>100,type+' nonempty frame '+f);check(minX>0&&maxX<w-1&&minY>0&&maxY<h-1,type+' frame not clipped '+f);if(MONSTER_SPRITES[type].motion!=='hover')check(Math.abs(maxY-baseline)<4,type+' feet anchored '+f);snapshots.push(hash);
  }
 }
 check(new Set(snapshots.slice(0,frameCount)).size>=10,type+' distinct visual states');check(snapshots[0]!==snapshots[frameCount],type+' yellow night eyes');
 const g=new Game({random:()=>.99});g.travel(typeRegion());g.hero.level=99;g.hero.invulnerable=999;const s=g.surfaces.find(s=>s.id==='climb-0-4'),e=g.makeEnemy(type,s.x+70,s.id,100);g.enemies=[e];e.protection=0;g.hero.x=s.x+200;g.hero.y=s.y;const before={x:e.x,y:e.y,damage:g.monsterDamage(e)};
 g.damageEnemy(e,e.maxHp*.5,{stagger:false});check(e.desperate&&e.x===before.x&&e.y===before.y,type+' threshold has no displacement');check(g.monsterDamage(e)===before.damage,type+' desperation damage unchanged');let attacks=false;const purityContext=document.createElement('canvas').getContext('2d');
 for(let i=0;i<480;i++){g.step(STEP,{});attacks ||= e.state==='strike'||e.pouncing||g.enemyShots.length>0;const original=JSON.stringify(e);atlas.draw(purityContext,e,g.time,false);check(JSON.stringify(e)===original,type+' rendering does not mutate simulation');}
 check(attacks,type+' wounded top-platform attack');
 }
 check(atlas.entries.size<=6,'atlas cache bounded');const row={region:typeRegion(),checks,passed:true,ms:performance.now()-start,textureBytes:atlas.textureBytes,errors:[...atlas.errors]};results.regions.push(row);$('checks-log').textContent=JSON.stringify(results.regions,null,2);$('status').textContent=`PASS · ${checks} checks · Region ${typeRegion()} alpha, frame alignment, night eyes, render purity and wounded elevated combat.`;
 }catch(e){$('status').textContent='FAIL · '+e.message;results.regions.push({region:typeRegion(),passed:false,checks,error:e.message});$('checks-log').textContent=JSON.stringify(results.regions,null,2);}finally{$('checks').disabled=false;}
};
const frame=$('game');let session='';
async function command(action,value){const id=`sprite-${++request}`;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{removeEventListener('message',receive);reject(Error('Practice scene did not respond'));},30000);function receive(e){if(e.source===frame.contentWindow&&e.origin===location.origin&&e.data?.request===id){clearTimeout(timer);removeEventListener('message',receive);resolve(e.data);}}addEventListener('message',receive);frame.contentWindow.postMessage({type:'royale-vertical-fixture',action,value,request:id},location.origin);});}
$('practice').onclick=async()=>{session='vertical-practice-sprites-'+Date.now();const g=new Game({look:{name:'Sprite Reviewer',cape:true}});g.travel(typeRegion());g.hero.level=WORLD_REGIONS[typeRegion()-1].levels[1];g.hero.hp=g.hero.maxHp=100+15*(g.hero.level-1);g.hero.coins=200;g.healthRoots=4;const tier=Number($('tier').value),s=g.surfaces.find(s=>s.id===`climb-0-${tier}`);if(s){g.hero.x=g.hero.prevX=s.x+40;g.hero.y=g.hero.prevY=s.y;}else g.hero.x=g.hero.prevX=520;
 g.powers.data.levels.strength=3;g.powers.data.levels.fireball=3;g.powers.data.levels.steel=3;g.powers.data.equipped=['strength','fireball','steel'];const stamp=new Date().toISOString();sessionStorage.setItem(`royale-test-${session}:`+PROFILE_KEY,JSON.stringify({version:2,revision:0,activeSlot:0,legacyImported:true,slots:[{id:session,createdAt:stamp,updatedAt:stamp,lastRegion:WORLD_REGIONS[typeRegion()-1].name,snapshot:JSON.parse(g.save())},null,null]}));
 await new Promise(resolve=>{frame.onload=resolve;frame.src=`../?qa=1&touch=1&testSession=${session}`;});const start=performance.now();while(!frame.contentDocument.querySelector('[data-action="continue"]')&&performance.now()-start<15000)await new Promise(r=>setTimeout(r,50));frame.contentDocument.querySelector('[data-action="continue"]')?.click();$('practice-status').textContent=`Region ${typeRegion()} · ${tier?'platform '+tier:'ground'} · real game controls, disposable session.`;frame.focus();};
$('wound').onclick=async()=>{try{const state=await command('wound',Number($('tier').value)?`climb-0-${$('tier').value}`:'sand-a');$('practice-status').textContent=JSON.stringify(state.detail)||'No monster on selected surface.';}catch(e){$('practice-status').textContent=e.message;}};
$('pause-game').onclick=()=>{const d=frame.contentDocument;(!d.getElementById('pause-menu')?.hidden?d.getElementById('resume'):d.getElementById('pause'))?.click();};
$('view').onchange=()=>{frame.style.width=$('view').value==='phone'?'390px':'100%';frame.style.maxWidth='100%';frame.style.height=$('view').value==='phone'?'844px':'650px';const canvas=$('benchmark-canvas');canvas.style.width=$('view').value==='phone'?'390px':'100%';canvas.style.maxWidth='100%';canvas.style.height=$('view').value==='phone'?'720px':'540px';};
$('benchmark').onclick=async()=>{animating=false;$('benchmark').disabled=true;let renderer;try{const canvas=$('benchmark-canvas');renderer=new Renderer(canvas);const g=new Game();g.travel(typeRegion());g.gainXP(1e8);g.hero.invulnerable=1e9;g.hero.x=g.hero.prevX=600;g.powers.data.levels.fireball=20;g.powers.data.levels.whirlwind=20;g.powers.data.equipped=['fireball','whirlwind',null];const loadStart=performance.now();await renderer.monsterAtlas.preload(typeRegion());const assetLoadMs=performance.now()-loadStart,buildStart=performance.now();for(const type of types)renderer.monsterAtlas.atlas(type,false);const atlasBuildMs=performance.now()-buildStart;const timings=[],costs=[];let start,last,steps=0,accumulator=0;
 await new Promise(resolve=>{function sample(now){if(start===undefined)start=last=now;const dt=Math.min(.1,(now-last)/1000);if(now>last)timings.push(now-last);last=now;const t=performance.now();accumulator+=dt;while(accumulator>=STEP){g.step(STEP,{powers:[steps%90===0,steps%180===0,false]});steps++;accumulator-=STEP;}renderer.draw(g,accumulator/STEP,dt);costs.push(performance.now()-t);if(now-start<10000)requestAnimationFrame(sample);else resolve();}requestAnimationFrame(sample);});
 const sorted=[...timings].sort((a,b)=>b-a),mean=a=>a.reduce((s,n)=>s+n,0)/a.length;const row={region:typeRegion(),viewport:[canvas.clientWidth,canvas.clientHeight],assetLoadMs,atlasBuildMs,simulationSeconds:g.time,samples:timings.length,seconds:(last-start)/1000,averageFPS:1000/mean(timings),onePercentLowFPS:1000/mean(sorted.slice(0,Math.max(1,Math.ceil(sorted.length*.01)))),meanStepAndDrawMs:mean(costs),p95StepAndDrawMs:[...costs].sort((a,b)=>a-b)[Math.floor(costs.length*.95)],cacheTextureBytes:renderer.monsterAtlas.textureBytes,errors:[...renderer.monsterAtlas.errors]};results.benchmarks.push(row);$('performance').textContent=JSON.stringify(results.benchmarks,null,2);
 }catch(e){$('performance').textContent='FAIL '+e.message;}finally{renderer?.destroy();$('benchmark').disabled=false;}};
await select();
