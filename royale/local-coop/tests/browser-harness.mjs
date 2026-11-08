import {Game,decodeSave} from '../../core.mjs';import {styleCDefault} from '../../style-c-defaults.mjs';import {serialize} from '../serialize.mjs';import {pickupLoot} from '../../world-loot.mjs';
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const frames=async(n=3)=>{for(let i=0;i<n;i++)await new Promise(requestAnimationFrame);};
const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*p))]||0;
const round=n=>Math.round(n*100)/100;
export async function install(api){
 const $=id=>document.getElementById(id);$('demo-note').hidden=false;$('qa-tools').hidden=false;
 const pads=[0,1].map(index=>({index,id:'Automated standard gamepad',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}));api.setPads(pads);
 const saveTimes=[[],[]];
 api.players.forEach((p,i)=>{
  const g=new Game({look:{...styleCDefault(i?'female':'male'),name:i?'Nova':'Atlas'}});g.hero.level=14;g.hero.maxHp=295;g.hero.hp=295;g.powers.data.points=13;for(const id of ['fireball','roots','whirlwind']){g.powers.data.levels[id]=2;g.powers.data.points-=2;}g.powers.data.equipped=['fireball','roots','whirlwind'];
  const snap=JSON.parse(g.save());p.profile={identity:'automated-'+i,slots:[1,2,3].map(n=>({slot_number:n,snapshot:n===1?snap:null,revision:0})),async save(slot,snapshot){await serialize({snapshot},{validate:true});saveTimes[i].push(performance.now());this.slots[slot-1].snapshot=structuredClone(snapshot);this.slots[slot-1].revision++;},forget(){}};p.slot=1;p.card.querySelector('form').hidden=true;api.profileStatus(i,'Practice hero · simulated input only');api.renderChoices(i);
 });
 api.refreshControllers();api.updateStart();
 const neutral=()=>pads.forEach(p=>{p.axes.fill(0);p.buttons.forEach(b=>{b.pressed=false;b.value=0;});});
 const pulse=async(i,b)=>{pads[i].buttons[b].pressed=true;await frames();pads[i].buttons[b].pressed=false;await frames();};
 const bothPulse=async b=>{pads.forEach(p=>p.buttons[b].pressed=true);await frames();pads.forEach(p=>p.buttons[b].pressed=false);await frames();};
 const checks=[],scenarios=[];
 const cloudCheck=api.button('Check cloud connection',async()=>{const config=await fetch('./config.json').then(r=>r.json());try{const r=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify',code:'invalid'})});$('qa-cloud').textContent=JSON.stringify({passed:r.status===400,status:r.status,scope:'Invalid-format code only; no account read or changed.'});}catch(e){$('qa-cloud').textContent=JSON.stringify({passed:false,error:e.message});}}),cloudResult=api.el('p');cloudResult.id='qa-cloud';$('qa-tools').append(cloudCheck,cloudResult);
 const check=(name,condition)=>{if(!condition)throw Error(name);checks.push(name);};
 const safe=()=>{const s=api.getSession();for(const i of s.active){const g=s.games[i];g.hero.dead=false;g.hero.hp=g.hero.maxHp;g.hero.attack=null;g.hero.attackBuffer=null;g.combatTimer=0;g.powers.cancelEffects();g.cancelMergeEffects();g.enemyShots.length=0;g.hitRecovery.clear();}return s;};
 const record=async(name,ms,action)=>{
  $('qa-status').textContent='Measuring '+name+'…';api.metrics.length=0;api.measure(true);const start=performance.now();let counter=0;
  do{action?.(counter++);await frames(1);}while(performance.now()-start<ms||api.metrics.length<8);api.measure(false);const duration=performance.now()-start,samples=[...api.metrics],drawn=samples.filter(x=>x.drawn);
  scenarios.push({name,durationMs:round(duration),frames:samples.length,renderedFrames:drawn.length,renderFPS:round(drawn.length*1000/duration),frameP50Ms:round(percentile(samples.map(x=>x.intervalMs),.5)),frameP95Ms:round(percentile(samples.map(x=>x.intervalMs),.95)),cpuP95Ms:round(percentile(samples.map(x=>x.cpuMs),.95)),simulationP95Ms:round(percentile(samples.map(x=>x.simulationMs),.95)),drawP95Ms:round(percentile(drawn.map(x=>x.drawMs),.95)),heapStartMB:round((samples[0]?.heap||0)/1048576),heapEndMB:round((samples.at(-1)?.heap||0)/1048576)});neutral();
 };
 $('qa-run').onclick=async()=>{
  $('qa-run').disabled=true;checks.length=0;scenarios.length=0;
  try{
   if(!api.getSession()){api.players.forEach(p=>p.ready=true);api.updateStart();await api.start();}
   let s=api.getSession();s.games.forEach(g=>g.random=()=>.9);check('One gameplay canvas',document.querySelectorAll('#stage canvas').length===1);check('Two distinct assigned gamepads',api.input.sources[0]==='pad:0'&&api.input.sources[1]==='pad:1');
   window.scrollTo(0,0);await frames();await record('Idle',2500);
   const p2x=s.games[1].hero.x;const startX=s.games[0].hero.x;pads[0].axes[0]=1;await frames();neutral();check('Controller 1 moves only Player 1',s.games[0].hero.x>startX&&Math.abs(s.games[1].hero.x-p2x)<1);
   await frames();pads[1].axes[0]=1;await frames();neutral();check('Controller 2 moves Player 2',s.games[1].hero.x>p2x);
   await record('Both running',2500,()=>{pads.forEach(p=>p.axes[0]=1);});
   await record('Both jumping',2500,n=>{pads.forEach(p=>{p.buttons[0].pressed=n%3===0;p.axes[0]=n%10<5?.5:-.5;});});
   safe();for(const g of s.games)g.hero.invulnerable=100;
   for(const e of s.games[0].enemies.slice(0,5)){e.x=s.games[0].hero.x+100;e.y=s.games[0].hero.y;e.protection=0;e.provoked=true;e.hp=e.maxHp;}
   await record('Multiple enemies',2500);
   await record('Simultaneous powers',3000,n=>{pads.forEach(p=>{p.buttons[4].pressed=n%8===0;p.buttons[5].pressed=n%11===0;p.buttons[7].pressed=n%13===0;});});
   safe();s.command(0,'enterBoss');await api.getRenderer().bossArt.prepare(1);await delay(600);for(const g of s.games)g.hero.invulnerable=100;
   check('Both heroes share the same boss object',s.games[0].arenaScene.boss===s.games[1].arenaScene.boss);
   await record('Boss battle',3000,n=>{pads.forEach(p=>{p.buttons[2].pressed=n%3===0;p.buttons[4].pressed=n%15===0;});});
   for(const g of s.games){g.leaveBoss('qa');g.combatTimer=0;}s.heroes.forEach(h=>s.authority.bind(h));safe();
   const enemy=s.games[0].enemies[5];enemy.hp=1;enemy.protection=0;s.games[0].random=()=>.001;s.games[0].damageEnemy(enemy,999999);check('One shared visual equipment drop',s.visualLoot().length===1);
   for(const g of s.games){const d=g.loot[0];g.hero.x=d.x;g.hero.y=d.y;}await bothPulse(3);
   await record('Equipment pickup',2000);check('Both inventories receive an independent copy',s.games.every(g=>g.inventory.items.length===1));
   for(const g of s.games)g.loadRegion(1,{checkpoint:true});s.heroes.forEach(h=>s.authority.bind(h));safe();
   for(const e of s.games[0].enemies){e.x=e.spawnX;e.y=e.spawnSurface.y;}
   await frames();const previousTeleport=s.games[1].localTeleportUntil||0;
   await record('Offscreen teleport',3000,n=>{if(n===0){const r=api.getRenderer(),g=s.games[1];g.hero.x=r.camera+r.width+100;g.hero.prevX=g.hero.x;}});await frames();
   check('Follower returns inside camera bounds',s.games[1].hero.x<api.getRenderer().camera+api.getRenderer().width&&(s.games[1].localTeleportUntil||0)>previousTeleport);
   const beforeLeader=s.games[0].hero.x;pads[0].connected=false;await frames();check('Controller disconnect pauses world',s.paused&&$('menu').open);pads[0].connected=true;await frames();check('Reconnect preserves assignments',api.input.sources[0]==='pad:0'&&api.input.sources[1]==='pad:1');
   safe();s.games.forEach(g=>{g.combatTimer=0;});await api.act(0,'visitTree');await api.act(1,'visitTree');api.players.forEach(p=>p.tab='powers');api.renderPanels();
   for(let i=0;i<2;i++){const root=$('panel-'+i),controls=[...root.querySelectorAll('button,select,input')].filter(n=>!n.disabled&&n.getClientRects().length);api.players[i].focus=controls.findIndex(b=>b.textContent==='+1');}
   const points=s.games.map(g=>g.powers.data.points);await bothPulse(0);check('Each controller upgrades its own hero simultaneously',s.games.every((g,i)=>g.powers.data.points===points[i]-1));
   await record('Independent pause upgrades',2500);api.markReady(0);check('One Ready cannot resume',s.paused);api.markReady(0);check('Ready can be cancelled',!s.ready[0]);api.markReady(0);api.markReady(1);check('Both Ready resume together',!s.paused&&!$('menu').open);
   await record('Autosaves during combat',9000,n=>{pads.forEach(p=>{p.buttons[2].pressed=n%4===0;p.buttons[4].pressed=n%20===0;});});
   check('Both save queues ran',saveTimes.every(a=>a.length>=3));check('Eight-second timer fired repeatedly',api.autosaveTimes.length>=3);const cadence=api.autosaveTimes.slice(1).map((x,i)=>round(x-api.autosaveTimes[i]));
   api.openMenu();await api.leave(0);check('Player 1 leaves without restarting the shared world',s.active.size===1&&s.leader===1&&!s.paused);await api.saveAll();
   const report={at:new Date().toISOString(),passed:true,checks,scenarios,autosaveIntervalsMs:cadence,saveCounts:saveTimes.map(a=>a.length),physicalControllers:false,latency:'Hardware-to-display latency is not measured. Gamepad API is simulated; frame/CPU timings are measured in this browser.',viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio}};
   $('qa-result').textContent=JSON.stringify(report,null,2);$('qa-status').textContent='Automated playtest passed. Player 2 continues solo.';api.openMenu();
  }catch(e){$('qa-result').textContent=JSON.stringify({at:new Date().toISOString(),passed:false,error:e.message,checks,scenarios},null,2);$('qa-status').textContent='Playtest found an issue: '+e.message;api.openMenu();}
  finally{neutral();api.measure(false);$('qa-run').disabled=false;}
 };
}
