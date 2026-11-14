import test from 'node:test';
import assert from 'node:assert/strict';
import {POWER_IDS,POWERS,powerStats,normalizePowers,PowerSystem} from '../powers.mjs';
const stats=(id,level)=>powerStats(id,level,{heroLevel:30,equipment:{}});
test('test-branch catalog has both new 20-level powers',()=>{
 assert.ok(POWER_IDS.includes('animalAllies'));
 assert.ok(POWER_IDS.includes('seismicSmash'));
 assert.equal(POWERS.animalAllies.cooldown,6);
 assert.equal(POWERS.seismicSmash.cooldown,6);
});
test('Animal Allies progresses through all five animals with increasing damage',()=>{
 const animals=['wolf','hawk','bear','panther','spirit-stag'];
 assert.deepEqual([1,5,10,15,20].map(n=>stats('animalAllies',n).animal),animals);
 let last=0;for(let level=1;level<=20;level++){const current=stats('animalAllies',level);assert.ok(current.damage>last);last=current.damage;}
});
test('Seismic Smash target count and radius progress to five targets',()=>{
 assert.deepEqual([1,5,10,15,20].map(n=>stats('seismicSmash',n).targets),[1,2,3,4,5]);
 assert.deepEqual([1,5,10,15,20].map(n=>stats('seismicSmash',n).radius),[60,80,112,144,180]);
 let last=0;for(let level=1;level<=20;level++){const current=stats('seismicSmash',level);assert.ok(current.damage>last);last=current.damage;}
});
test('redesigned melee reach exceeds normal melee and kick exceeds strength',()=>{
 assert.ok(stats('strength',20).reach>59);
 assert.ok(stats('superKick',20).reach>76);
 assert.ok(stats('superKick',20).reach>stats('strength',20).reach);
 assert.equal(stats('superKick',1).kicks,2);
 assert.equal(stats('superKick',20).kicks,6);
});
test('older power saves missing new fields remain valid',()=>{
 const old=Object.fromEntries(POWER_IDS.filter(x=>!['animalAllies','seismicSmash'].includes(x)).map(x=>[x,0]));
 const result=normalizePowers({levels:old,equipped:[null,null,null]},1,{strict:true});
 assert.ok(result);
 assert.equal(result.levels.animalAllies,0);
 assert.equal(result.levels.seismicSmash,0);
});
test('seismic smash hits nearest eligible enemies once and enters six second cooldown',()=>{
 const targets=[{id:1,x:25,y:0,w:30,h:40,state:'idle',protection:0},{id:2,x:40,y:0,w:30,h:40,state:'idle',protection:0},{id:3,x:70,y:0,w:30,h:40,state:'idle',protection:0}];
 const hit=[];const game={hero:{x:0,y:0,face:1,level:30,grounded:true,dead:false,stun:0},paused:false,disruptedPower:null,equipment:{},enemies:targets,markCombat(){},emit(){},damageEnemy(e,d){hit.push([e.id,d]);}};
 const data=normalizePowers({levels:Object.fromEntries(POWER_IDS.map(id=>[id,id==='seismicSmash'?5:0])),equipped:['seismicSmash',null,null]},30);
 const powers=new PowerSystem(game,data);game.powers=powers;
 assert.ok(powers.activate('seismicSmash'));assert.deepEqual(hit.map(x=>x[0]),[1,2]);
 assert.equal(powers.cooldowns.seismicSmash,6);assert.equal(powers.activate('seismicSmash'),false);
});
