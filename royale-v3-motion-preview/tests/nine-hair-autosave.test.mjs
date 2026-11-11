import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import vm from 'node:vm';
import {Game,decodeSave} from '../core.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {ORIGINAL_FACE_BASE} from './original-face-baseline.mjs';
const source=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
const start=source.indexOf('function sendCodeProgress(force=false)'),end=source.indexOf('if(codePlay)setInterval(sendCodeProgress,8000);',start);
assert.ok(start>=0&&end>start,'production autosave entry point is present');
const production=source.slice(start,end)+'if(codePlay)setInterval(sendCodeProgress,8000);';
test('save, account and live entry points remain byte-identical to the release baseline',()=>{
 const paths=['royale/app.mjs','royale/saves.mjs','royale/core.mjs','royale/appearance.mjs','royale-v3-staging','royale-account-v2','royale/backend','royale/multiplayer','royale-cloud-test','index.html'];
 assert.equal(execFileSync('git',['diff','--name-only',ORIGINAL_FACE_BASE,'--',...paths],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}).trim(),'');
});
test('unchanged production autosave emits both visible slots every eight seconds with exact hero snapshots',async()=>{
 const handles=[],captures=[[],[]],games=[new Game(),new Game()];
 const expected=games.map((game,slot)=>{
  game.look={...styleCDefault(slot?'male':'female'),hair:slot?'braided-ponytail':'double-puffs',skin:slot?'#34231e':'#eed9cd',brows:'soft',mouth:'smile'};
  game.started=true;game.hero.x=180+slot*20;game.hero.hp=83;game.hero.xp=23;
  return decodeSave(game.save());
 });
 try{
  await new Promise((resolve,reject)=>{
   const deadline=setTimeout(()=>reject(Error('Timed out waiting for two production snapshots per slot')),23000);handles.push(deadline);
   for(const slot of [0,1]){
    const context=vm.createContext({game:games[slot],codePlay:true,screen:'play',criticalPending:null,powerUpgrades:{busy:false},online:()=>false,activeSlot:slot,activeId:'isolated-hair-'+slot,location:{origin:'http://preview.invalid'},console:{info(){}},
     setInterval(fn,ms){assert.equal(ms,8000);handles.push(setInterval(fn,ms));},
     window:{parent:{postMessage(message,origin){
      try{
       assert.equal(origin,'http://preview.invalid');assert.equal(message.type,'royale-code-progress');assert.equal(message.slot,slot);
       assert.deepEqual(decodeSave(message.snapshot),expected[slot]);captures[slot].push(performance.now());
       if(captures.every(list=>list.length>=2))resolve();
      }catch(error){reject(error);}
     }}}
    });
    vm.runInContext(production,context);
   }
  });
  for(const slot of [0,1]){const gap=captures[slot][1]-captures[slot][0];assert.ok(gap>=7800&&gap<=9000,`slot ${slot+1}: ${gap} ms`);console.log(`Production autosave slot ${slot+1}: ${Math.round(gap)} ms; complete appearance, XP, powers, equipment, location and health preserved.`);}
 }finally{for(const handle of handles){clearInterval(handle);clearTimeout(handle);}}
});
