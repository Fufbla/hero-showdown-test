import test from 'node:test';
import assert from 'node:assert/strict';
import {POWER_IDS,PowerSystem,powerStats} from '../powers.mjs';

function makePowers(testPowers){
 const game={testPowers,hero:{dead:false,stun:0,grounded:true,level:99,x:500,y:600,face:1},
  equipment:{},enemies:[],paused:false,disruptedPower:null,markCombat(){},emit(){}};
 const powers=new PowerSystem(game,{levels:Object.fromEntries(POWER_IDS.map(id=>[id,20])),
  equipped:['roots','whirlwind',null],recovery:{}});
 game.powers=powers;
 return powers;
}
test('V2 0000000000 roots and whirlwind end at exactly two seconds, keeping recovery',()=>{
 for(const id of ['roots','whirlwind']){
  const powers=makePowers(true);
  assert.equal(powers.activate(id),true);
  assert.equal(powers.active[id].duration,2);
  powers.step(1);
  assert.ok(powers.active[id],'still active during the two-second action');
  powers.step(1);
  assert.equal(powers.active[id],undefined,'action and special pose end at two seconds');
  assert.equal(powers.cooldowns[id],id==='roots'?10:12,'normal cooldown still starts after release');
 }
});
test('regular production heroes retain original level-scaled control durations',()=>{
 for(const id of ['roots','whirlwind']){
  const powers=makePowers(false);
  assert.equal(powers.activate(id),true);
  assert.equal(powers.active[id].duration,powerStats(id,20,{heroLevel:99,equipment:{}}).duration);
  assert.ok(powers.active[id].duration>2);
 }
});
