import test from 'node:test';import assert from 'node:assert/strict';
import {fittedBodyWidth,shoulderRotation} from '../equipment-fit.mjs';
import {headwearFit} from '../headwear-fit.mjs';
import {EQUIPMENT} from '../equipment.mjs';import {armorCollection} from '../power-armor-art.mjs';
test('torso length and posed shoulders cannot inflate armor width',()=>{
 const p={m:{arms:[[[-40,0],[-45,35]],[[40,0],[45,35]]]}};
 for(const profile of [true,false])assert.ok(Math.abs(fittedBodyWidth(p,{torso:1},profile,50,80)-fittedBodyWidth(p,{torso:1.15},profile,57.5,120))<1e-10);
 assert.ok(fittedBodyWidth(p,{chest:1.15},false,50,80)>fittedBodyWidth(p,{chest:.85},false,50,80));
});
test('pauldron rotation follows its own upper arm, with no hero mutation',()=>{
 const p={m:{arms:[[[0,0],[0,30]],[[10,0],[10,30]]]},arms:[[[0,0],[30,0]],[[10,0],[10,30]]]};const before=JSON.stringify(p);
 assert.equal(shoulderRotation(p,0),-Math.PI/2);assert.equal(shoulderRotation(p,1),0);assert.equal(JSON.stringify(p),before);
});
test('all 81 helmet designs use face-sized registration; open crowns keep hair',()=>{
 const helmets=Object.values(EQUIPMENT).filter(i=>i.part==='helmet'&&armorCollection(i));assert.equal(helmets.length,81);
 for(const item of helmets)for(const view of ['front','right','back','left']){const fit=headwearFit(item,view);assert.ok(fit.width>=(item.setId==='agility-prism'&&view==='front'?.68:1.3),item.id);assert.ok(fit.profileWidth>1.2,item.id);}
 assert.equal(headwearFit({setId:'whirlwind-eyewall'}).hair,'tucked');assert.equal(headwearFit({setId:'roots-lattice'}).hair,'open');
 assert.equal(headwearFit({setId:'speed-switchback'}).mirrorProfile,true);
});
