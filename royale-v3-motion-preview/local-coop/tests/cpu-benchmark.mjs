// CPU only: rendering, controllers, display and networking are deliberately excluded.
import {Game} from '../../core.mjs';
import {LocalSession,captureProgress} from '../session.mjs';
import {performance} from 'node:perf_hooks';
import {writeFile} from 'node:fs/promises';
const results=[];
for(const scene of ['idle','running','jumping','enemies','powers','boss','checkpoint']){
 const profiles=[0,1].map(i=>{
  const g=new Game();g.hero.level=30;g.powers.data.points=14;
  for(const id of ['fireball','roots','whirlwind'])g.powers.data.levels[id]=5;
  g.powers.data.equipped=['fireball','roots','whirlwind'];
  return {identity:'benchmark-'+i,slots:[{slot_number:1,snapshot:JSON.parse(g.save())}]};
 });
 const s=new LocalSession(profiles.map(profile=>({profile,slot:1})));
 if(scene==='boss')s.command(0,'enterBoss');
 s.games.forEach(g=>{g.hero.invulnerable=1e9;g.random=()=>.9;});s.setPaused(false);
 if(['enemies','powers'].includes(scene))for(const e of s.games[0].enemies.slice(0,8)){e.x=s.games[0].hero.x+80;e.y=s.games[0].hero.y;e.protection=0;e.provoked=true;}
 const times=[];
 for(let n=0;n<2100;n++){
  const start=performance.now(),action={move:scene==='running'?(n%240<120?1:-1):0,jump:scene==='jumping'&&n%60===0,punchHeld:scene==='powers'||scene==='boss',powers:[0,1,2].map(()=>scene==='powers'||scene==='boss')};
  s.step([action,action],{x:Math.max(0,s.games[0].hero.x-400),y:0,width:1000,height:720});
  if(scene==='checkpoint'&&n%480===0)s.games.forEach(g=>JSON.stringify(captureProgress(g)));
  s.games.forEach(g=>g.drain());if(n>=300)times.push(performance.now()-start);
 }
 times.sort((a,b)=>a-b);
 results.push({scene,ticks:times.length,meanMs:+(times.reduce((a,b)=>a+b,0)/times.length).toFixed(3),p95Ms:+times[Math.floor(times.length*.95)].toFixed(3),maxMs:+times.at(-1).toFixed(3)});
}
const report={at:new Date().toISOString(),runtime:process.version,scope:'Node.js CPU simulation only. No renderer, browser display, physical controllers or network. 300 warm-up and 1800 measured fixed ticks per scene.',results};
await writeFile(new URL('./cpu-results.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
