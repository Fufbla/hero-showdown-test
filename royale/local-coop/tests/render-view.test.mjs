import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../../core.mjs';
import {drawPowerWorld} from '../../power-art.mjs';
import {coopRenderView} from '../render-view.mjs';

test('co-op first frame retains enemy data through the actual effects renderer spread',()=>{
 const game=new Game(),canvas=new Proxy({},{get:()=>()=>{}});
 const oldView=Object.assign(Object.create(game),{loot:[]});
 const effectView=view=>({...view,powers:{...view.powers,projectiles:[]}});
 assert.throws(()=>drawPowerWorld(canvas,effectView(oldView)),/enemies is not iterable/);
 const before=game.save(),view=coopRenderView(game,[]);
 assert.doesNotThrow(()=>drawPowerWorld(canvas,effectView(view)));
 assert.equal(view.getRegion(),game.getRegion());assert.equal(view.hero,game.hero);
 assert.equal(view.enemies,game.enemies);assert.notEqual(view.loot,game.loot);
 assert.equal(game.save(),before,'Rendering must not alter persisted progress');
 game.enemies=[];game.time=5;
 const next=coopRenderView(game,[]);assert.equal(next.enemies,game.enemies);assert.equal(next.time,5);
});
