'use strict';
const versusDifficulties={
 easy:{name:'Easy',block:.08,cadence:.75,recovery:.8,description:'Occasional blocks. More time between attacks.'},
 medium:{name:'Medium',block:.22,cadence:1,recovery:1,description:'Balanced pressure. Opponents guard more often.'},
 hard:{name:'Hard',block:.42,cadence:1.35,recovery:1.18,description:'Frequent guards, faster follow-ups, shorter recovery.'}
};
let versusDifficulty='medium';
const modeLock='<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 21v-7a10 10 0 0 1 20 0v7M10 21h28v22H10z" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="24" cy="31" r="3" fill="currentColor"/><path d="M24 33v5" stroke="currentColor" stroke-width="3"/></svg>';
function modeScreen(html){
 paused=false;clearInput();menuFocus=0;overlay.classList.remove('hidden');overlay.innerHTML=html;
 if(typeof syncMenuFocus==='function')syncMenuFocus();
}
function showModeSelect(){
 mode='modes';modeScreen(`<section class="panel mode-panel"><div class="eyebrow">HEALTHIA</div><h1>HERO <span>SHOWDOWN</span></h1><p class="mode-subtitle">Choose your showdown.</p><div class="mode-grid">
 <button class="mode-tile locked-mode" disabled aria-label="Story Mode — locked, coming soon"><span class="mode-number">01 / THE JOURNEY</span><span class="mode-lock">${modeLock}</span><h3>STORY MODE</h3><p>A new chapter awaits.</p><span class="mode-status">LOCKED · COMING SOON</span></button>
 <button class="mode-tile versus-tile" id="versus-mode" ${loaded?'':'disabled'}><span class="mode-number">02 / THE ARENA</span><span class="mode-symbol" aria-hidden="true">VS</span><h3>VERSUS</h3><p>Three heroes. Eight villains.<br>Your fight. Your challenge.</p><span class="mode-status">${loaded?'ENTER THE ARENA →':'LOADING HEROES…'}</span></button>
 <button class="mode-tile locked-mode" disabled aria-label="Showdown Royal — locked, coming soon"><span class="mode-number">03 / THE ULTIMATE CLASH</span><span class="mode-lock">${modeLock}</span><h3>SHOWDOWN ROYAL</h3><p>The ultimate showdown is coming.</p><span class="mode-status">LOCKED · COMING SOON</span></button>
 </div></section>`);
 document.getElementById('versus-mode').onclick=()=>{audio();showDifficulty();};
}
function showDifficulty(){
 mode='difficulty';modeScreen(`<section class="panel mode-panel"><div class="eyebrow">VERSUS / SELECT DIFFICULTY</div><h2>Choose your challenge.</h2><p>All heroes, opponents, and venues are available at every difficulty.</p><div class="mode-grid">${Object.entries(versusDifficulties).map(([key,d],i)=>`<button class="mode-tile difficulty-tile ${key===versusDifficulty?'selected':''}" data-difficulty="${key}" aria-label="${d.name}: ${d.description}"><span class="mode-number">CHALLENGE 0${i+1}</span><span class="difficulty-bars" aria-hidden="true">${[0,1,2].map(n=>`<i class="${n<=i?'lit':''}"></i>`).join('')}</span><h3>${d.name.toUpperCase()}</h3><p>${d.description}</p><span class="mode-status">SELECT ${d.name.toUpperCase()} →</span></button>`).join('')}</div><button id="back-modes">← GAME MODES</button></section>`);
 overlay.querySelectorAll('[data-difficulty]').forEach(b=>b.onclick=()=>{versusDifficulty=b.dataset.difficulty;audio();showSelect();});
 document.getElementById('back-modes').onclick=showModeSelect;
}
function stepVersusDifficulty(dt){
 if(!boss||mode!=='fight')return;
 boss.guardFlash=Math.max(0,(boss.guardFlash||0)-dt);
 boss.guardCooldown=Math.max(0,(boss.guardCooldown||0)-dt);
 if(boss.hitstun>0)return;
 const d=versusDifficulties[versusDifficulty];
 // Only downtime changes. Attack warnings, active frames and projectiles retain their timings.
 if(boss.state==='idle')boss.cd-=dt*(d.cadence-1);
 if(boss.state==='recover')boss.timer-=dt*(d.recovery-1);
}
function tryOpponentGuard(d,dir,kind,contact){
 if(!boss||mode!=='fight'||boss.hp<=0||boss.hitstun>0||boss.guardCooldown>0)return false;
 if(kind!=='punch'&&kind!=='kick')return false;
 if(boss.state!=='idle'&&boss.state!=='warn')return false;
 const facing=boss.dir||(hero.x>boss.x?1:-1);
 if(dir!==-facing)return false;
 const chance=versusDifficulties[versusDifficulty].block*(kind==='kick'?.65:1);
 if(Math.random()>=chance)return false;
 boss.guardFlash=.22;boss.guardCooldown=.8;boss.guardFacing=facing;
 // Small chip damage cannot KO; recovery, rear hits and specials bypass the guard.
 boss.hp=Math.max(1,boss.hp-Math.max(1,Math.round(d*.15)));
 hitStop=Math.max(hitStop,.035);
 const p=contact||{x:boss.x+facing*80,y:GROUND-165};
 effects.push({type:'guard',x:p.x,y:p.y,life:.2,max:.2});
 combatSound('block',.75,bossMaterial());return true;
}
function drawOpponentGuard(){
 if(mode!=='fight'||!boss||!(boss.guardFlash>0))return;
 const face=boss.guardFacing||-1;
 ctx.save();ctx.globalAlpha=Math.min(1,boss.guardFlash/.08);ctx.strokeStyle='#e5fca4';ctx.lineWidth=5;
 ctx.beginPath();ctx.ellipse(boss.x+face*92,GROUND-160,34,76,0,-Math.PI/2,Math.PI/2,face<0);ctx.stroke();
 text('BLOCK',boss.x,GROUND-330,16,'#e5fca4','center');ctx.restore();
}
// Native Tab/Enter still work. Arrow keys and controller share the same navigation.
window.addEventListener('keydown',e=>{
 if(window.HealthiaIntro?.active||!['modes','difficulty'].includes(mode))return;
 const direction={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[e.key];
 if(direction){e.preventDefault();e.stopImmediatePropagation();menuNavigate(direction);}
 else if(e.key==='Escape'&&mode==='difficulty'){e.preventDefault();e.stopImmediatePropagation();showModeSelect();}
},true);
