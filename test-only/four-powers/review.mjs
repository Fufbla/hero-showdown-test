import {Game,decodeSave} from '../../royale/core.mjs';
import {styleCDefault} from '../../royale/style-c-defaults.mjs';
import {POWER_IDS,POWERS,powerStats,normalizePowers} from './powers.mjs';
import {drawHero} from '../../royale/release-src/presentation.mjs';
import {drawFourWorld,drawPowerHero,drawSlamHero} from './art.mjs';
export const TEST_CODE='0000000000';
export const TEST_PREFIX='royale-four-powers-0000000000-v1:';
export const REVIEW_POWERS=['strength','superKick','animalAllies','seismicSmash'];
export function requireTestAccount(){
 if(typeof location==='undefined')return;
 if(new URLSearchParams(location.search).get('testAccount')!==TEST_CODE){location.replace('../?blocked=1');throw Error('Enter the isolated test code to continue.');}
}
export function createTestSnapshot(player=0){
 const game=new Game({look:{...styleCDefault(player?'female':'male'),name:player?'Power Test Two':'Power Test Hero'}});
 const snapshot=JSON.parse(game.save());snapshot.level=99;snapshot.xp=0;
 snapshot.powers=normalizePowers({levels:Object.fromEntries(POWER_IDS.map(id=>[id,REVIEW_POWERS.includes(id)?20:1])),equipped:['strength','animalAllies','seismicSmash']},99);
 snapshot.hp=10000;const valid=decodeSave(JSON.stringify(snapshot));if(!valid)throw Error('Test hero failed save validation');return valid;
}
export function setReviewLevel(game,id,level,slot=0){
 if(!REVIEW_POWERS.includes(id)||!Number.isInteger(level)||level<1||level>20||slot<0||slot>2)throw Error('Choose a power, level 1–20 and slot 1–3.');
 const data=game.powers.data,levels={...data.levels,[id]:level},equipped=[...data.equipped];
 const previous=equipped.indexOf(id),old=equipped[slot];if(previous>=0)equipped[previous]=old===id?null:old;equipped[slot]=id;
 const next=normalizePowers({...data,levels,equipped},game.hero.level);if(!next)throw Error('Free a few test points by lowering another power first.');
 game.powers.cancelEffects();game.hero.attack=null;game.powers.data=next;game.powers.cooldowns[id]=0;
 return next;
}
export function arrangeTargets(game){
 if(game.treeVisit)game.leaveTree();if(game.arenaScene)game.leaveBoss('test');
 const h=game.hero;h.dead=false;h.hp=h.maxHp;h.stun=0;h.invulnerable=60;h.attack=null;game.powers.cancelEffects();
 const surface=game.surfaces.filter(s=>s.x<=h.x&&s.x+s.w>=h.x).sort((a,b)=>Math.abs(a.y-h.y)-Math.abs(b.y-h.y))[0];
 if(!surface)throw Error('Stand on a platform before placing targets.');
 h.y=h.prevY=surface.y;h.vy=0;h.grounded=true;
 const seeds=game.enemies.filter(e=>!e.boss&&!e.legendary);if(!seeds.length)throw Error('Return to a regular region to place targets.');
 const offsets=[45,-70,96,-128,166,215];
 game.enemies=offsets.map((dx,i)=>({...structuredClone(seeds[i%seeds.length]),id:9000+i,x:h.x+dx*h.face,prevX:h.x+dx*h.face,y:h.y,prevY:h.y,surface,spawnSurface:surface,spawnX:h.x+dx*h.face,state:'patrol',hp:100000,maxHp:100000,level:1,protection:0,flash:0,rooted:false,lifted:false,flying:false,airborne:false,fourPowerDummy:true}));
 game.combatTimer=0;return game.enemies;
}
const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
function controls(getGame,{changed=()=>{},practice=()=>{}}={}){
 const box=el('fieldset');box.className='four-review-controls';box.append(el('legend','Test account · reversible power levels'));
 const power=el('select');power.setAttribute('aria-label','Test power');for(const id of REVIEW_POWERS){const o=el('option',POWERS[id].name);o.value=id;power.append(o);}
 const level=el('select');level.setAttribute('aria-label','Test level');for(let i=1;i<=20;i++){const o=el('option','Level '+i);o.value=i;level.append(o);}level.value=20;
 const slot=el('select');slot.setAttribute('aria-label','Test slot');for(let i=0;i<3;i++){const o=el('option','Slot '+(i+1));o.value=i;slot.append(o);}
 const apply=el('button','Apply test level'),targets=el('button','Place practice targets'),status=el('p');status.setAttribute('role','status');
 apply.type=targets.type='button';apply.onclick=async()=>{const game=getGame(),before=structuredClone(game?.powers.data);apply.disabled=true;try{setReviewLevel(game,power.value,+level.value,+slot.value);await changed();status.textContent=POWERS[power.value].name+' set to level '+level.value+'. Test hero only.';}catch(e){if(before)game.powers.data=before;status.textContent=e.message;}finally{apply.disabled=false;}};
 targets.onclick=()=>{try{practice();status.textContent='Six targets placed at measured distances. The farthest is outside the largest shockwave.';}catch(e){status.textContent=e.message;}};
 box.append(power,level,slot,apply,targets,status);return box;
}
export function installSolo(api){
 document.getElementById('restore-cloud-heroes')?.remove();
 const root=document.getElementById('tree-menu');
 const box=controls(api.getGame,{changed:()=>{const saved=api.persist({manual:true});if(!saved?.ok||saved.skipped)throw Error(saved?.error||'Test level could not be saved.');api.menu.open();api.updateHud();},practice:()=>{arrangeTargets(api.getGame());api.setScreen('play');api.updateHud();}});
 (root.querySelector('.tree-card')||root.firstElementChild||root).append(box);
 const label=el('span','POWER TEST · 0000000000');label.className='four-test-badge';document.querySelector('.top-actions').prepend(label);
 const link=el('a','Test home');link.href='../four-powers-test/';link.className='four-test-home';document.querySelector('.top-actions').prepend(link);
 const old=document.getElementById('roster-title');if(old)old.innerHTML='My <em>Test Heroes.</em>';
 const note=el('p','This separate test hero saves on this browser. Your live heroes and cloud progress are untouched.');note.className='four-test-note';old?.after(note);
 // Review bridge is only compiled into the isolated test bundle.
 globalThis.fourPowerReview={...api,arrange:()=>arrangeTargets(api.getGame()),set:(id,level,slot=0)=>setReviewLevel(api.getGame(),id,level,slot)};
}
export function installCoop(api){
 const label=el('p','Power test · both players use 0000000000. Each receives a separate local test hero.');document.getElementById('setup').prepend(label);
 const render=api.renderPanel;
 // Buttons are mounted outside each dynamic panel so menu refreshes retain them.
 for(let i=0;i<2;i++){
  const box=controls(()=>api.getSession()?.games[i],{changed:async()=>{const saved=await api.saveAll();if(saved.some(r=>!r.ok))throw Error('Test checkpoint could not be saved. Reload before retrying.');render(i);},practice:()=>{const s=api.getSession(),targets=arrangeTargets(s.games[0]),world=s.authority.bind(s.heroes[0]);world.enemies=targets;for(const g of s.games)g.enemies=targets;render(i);}});
  const panel=document.getElementById('panel-'+i),wrap=el('section');panel.before(wrap);wrap.append(panel,box);
 }
 globalThis.fourPowerCoop=api;
 if(new URLSearchParams(location.search).get('diagnostics')==='1'){
  const box=el('aside');box.className='four-diagnostics';
  const pads=[0,1].map(index=>({index,id:'Test controller '+(index+1),connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0}))}));
  const connect=el('button','Connect two simulated controllers');connect.onclick=()=>{api.setPads(pads);api.refreshControllers();api.updateStart();};box.append(connect);
  for(let i=0;i<2;i++)for(const [key,label]of [[4,'Power 1'],[5,'Power 2'],[7,'Power 3'],[9,'Pause']]){
   const b=el('button',`P${i+1} ${label}`);b.onclick=()=>{pads[i].buttons[key]={pressed:true,touched:true,value:1};setTimeout(()=>pads[i].buttons[key]={pressed:false,touched:false,value:0},1500);};box.append(b);
  }
  const status=el('output');status.setAttribute('aria-label','Controller test results');box.append(status);
  setInterval(()=>{const s=api.getSession();status.textContent=s?s.games.map((g,i)=>`P${i+1} (t ${g.time.toFixed(1)}, input ${api.input.enabled}, source ${api.input.sources[i]}, paused ${g.paused}, stun ${g.hero.stun.toFixed(2)}, neutral ${api.input.neutral[i]}): ${g.powers.data.equipped.map(id=>`${id} ${g.powers.cooldowns[id]?.toFixed(1)||0}s`).join(' / ')}; summons ${g.powers.effectSerial}; active effects ${g.powers.effects.length}; targets hit ${g.enemies.filter(e=>e.fourPowerDummy&&e.hp<e.maxHp).length}`).join(' | '):'Waiting for both test heroes.';},100);
  document.body.append(box);
 }
}
const previewTokens=new WeakMap();
export function appendPowerPreview(panel,id,game){
 if(!REVIEW_POWERS.includes(id))return;
 const canvas=el('canvas');canvas.width=420;canvas.height=175;canvas.className='four-power-preview';canvas.setAttribute('aria-label',POWERS[id].name+' animated preview');panel.append(canvas);
 const token={};previewTokens.set(canvas,token);let start;
 const draw=now=>{
  if(!canvas.isConnected||previewTokens.get(canvas)!==token)return;
  start??=now;const t=(now-start)/1000,age=t%1.9,level=game.powers.data.levels[id]||1,s=powerStats(id,level,{heroLevel:game.hero.level,equipment:game.equipment});
  const h={...game.hero,x:100,y:155,face:1,prevX:100,prevY:155,grounded:true,vx:0,vy:0,stun:0,dead:false,invulnerable:0,respawnAge:100,castAge:100,attack:null,powerPose:null};
  const demo={...game,hero:h,time:t,powers:{...game.powers,effects:[],active:{}}};
  if(id==='strength'||id==='superKick'){const d=id==='strength'?.27:.39,hitAge=age%d;if(age<d*(id==='strength'?1:s.kicks))h.attack={kind:id==='strength'?'punch':'kick',power:id,face:1,age:hitAge,stats:s,comboIndex:Math.floor(age/d)};}
  else if(id==='animalAllies'&&age<.64){demo.powers.effects=[{id,...s,x:100,y:155,targetX:285,targetY:155,face:1,age,duration:s.animal==='panther'?.64:.52,contact:.32}];}
  else if(id==='seismicSmash'&&age<.70){h.powerPose=age<.58?{id,age,face:1}:null;demo.powers.effects=[{id,...s,x:200,y:155,face:1,age,duration:.70,contact:.20}];h.x=200;}
  const c=canvas.getContext('2d');c.clearRect(0,0,420,175);c.fillStyle='#0c2b34';c.fillRect(0,0,420,175);c.strokeStyle='#49655b';c.beginPath();c.moveTo(0,156);c.lineTo(420,156);c.stroke();
  drawFourWorld(c,demo);drawSlamHero(c,demo,{x:h.x,y:h.y},h,null);drawHero(c,h.x,h.y,game.look,h,t,.85);drawPowerHero(c,demo,{x:h.x,y:h.y},null);
  requestAnimationFrame(draw);
 };requestAnimationFrame(draw);
}
