import test from 'node:test';
import assert from 'node:assert/strict';
import {AuthorityStore} from '../store.mjs';
import {Authority} from '../authority.mjs';
import {Game,decodeSave} from '../../core.mjs';
import {POWER_IDS,normalizePowers} from '../../powers.mjs';
for(const id of POWER_IDS)test(`${id}: immediate server upgrade and original solo activation behavior`,()=>{
  const seed=new Game();seed.hero.level=21;seed.powers.data=normalizePowers(null,21);seed.refreshEquipment();
  const save=decodeSave(seed.save());assert.ok(save);
  const store=new AuthorityStore(),a=new Authority(store,{allowLegacyImport:true,capacity:16}),h=a.create('hero',{slot:0,legacy:save,sourceId:'power-fixture-'+id,confirmed:true});a.attach('hero',h.id,{close(){}});
  try{
    assert.equal(a.command('hero',h.id,1,'visitTree'),true);
    assert.equal(a.command('hero',h.id,2,'upgradePower',[id,20]).ok,true);assert.equal(h.game.powers.data.points,0);assert.equal(h.game.powers.data.levels[id],20);
    if(id!=='speed')assert.equal(a.command('hero',h.id,3,'equipPower',[0,id]),true);
    h.game.leaveTree();h.game.paused=false;
    const copy=decodeSave(h.game.save());assert.ok(copy);const solo=new Game({save:copy});
    const input={powers:[true,false,false,false]};a.input('hero',h.id,1,input);a.tick();solo.step(1/60,input);
    assert.deepEqual(h.game.powers.cooldowns,solo.powers.cooldowns);assert.deepEqual(Object.keys(h.game.powers.active),Object.keys(solo.powers.active));assert.equal(h.game.hero.attack?.power,solo.hero.attack?.power);assert.equal(h.game.powers.speed,solo.powers.speed);
  }finally{store.close();}
});
