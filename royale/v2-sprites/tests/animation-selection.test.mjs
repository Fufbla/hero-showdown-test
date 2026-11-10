import assert from 'node:assert/strict';
import {chooseV2Frame,GROUNDED_RUN_FRAMES,V2_SPRITE_SCENES,V2_SPRITE_ATLASES} from '../runtime.mjs';

const base={face:1,grounded:true,vx:180,cycle:0,castAge:1,dodgeAge:1,attack:null,stun:0};
assert.deepEqual(GROUNDED_RUN_FRAMES,[0,4,5,6,7]);
for(const face of [1,-1]){
 const suffix=face===1?'Right':'Left';
 for(let n=0;n<25;n++){
  const f=chooseV2Frame({...base,face,cycle:n/1.2});
  assert.equal(f.scene,'run'+suffix);
  assert.equal(f.index,GROUNDED_RUN_FRAMES[n%GROUNDED_RUN_FRAMES.length]);
  assert.ok(f.index>=0&&f.index<V2_SPRITE_SCENES[f.scene].count);
 }
 const still=chooseV2Frame({...base,face,vx:0},0);
 assert.equal(still.scene,'idle'+suffix);
 for(const jumps of [1,2]){
  for(const vy of [-300,0,200]){
   const f=chooseV2Frame({...base,face,grounded:false,jumps,vy,jumpAge:.15});
   assert.equal(f.scene,(jumps===2?'double':'jump')+suffix);
   assert.ok(f.index>=0&&f.index<V2_SPRITE_SCENES[f.scene].count);
  }
 }
}
for(const scene of Object.values(V2_SPRITE_SCENES)){
 const atlas=V2_SPRITE_ATLASES[scene.atlas];
 assert.ok(scene.row>=0&&scene.row<atlas.rows);
 assert.ok(scene.count>0&&scene.count<=atlas.cols);
}
assert.equal(chooseV2Frame({...base,dead:true}),null);
assert.equal(chooseV2Frame({...base,stun:1}),null);
console.log('V2 animation selection checks passed');
