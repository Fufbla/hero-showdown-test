import test from 'node:test';
import assert from 'node:assert/strict';
import {ENEMY_CONTROL_VFX_SECONDS,ENEMY_CONTROL_VFX_SOURCES,enemyControlFrame,enemyControlAnchor,drawEnemyControlVfx} from '../enemy-control-vfx.mjs';

test('enemy VFX are visible only during the first two seconds',()=>{
  assert.equal(ENEMY_CONTROL_VFX_SECONDS,2);
  assert.equal(enemyControlFrame('roots',0),0);
  assert.equal(enemyControlFrame('roots',.4),1);
  assert.equal(enemyControlFrame('roots',.9),2);
  assert.equal(enemyControlFrame('roots',1.9),3);
  assert.equal(enemyControlFrame('roots',2),-1);
  assert.equal(enemyControlFrame('whirlwind',2),-1);
  assert.equal(enemyControlFrame('whirlwind',-1),-1);
  assert.equal(enemyControlFrame('whirlwind',NaN),-1);
  assert.deepEqual([0,.12,.24,.36,.48].map(t=>enemyControlFrame('whirlwind',t)),[0,1,2,3,0]);
});
test('enemy hit positions stay rooted to feet even while targets are lifted',()=>{
  const enemy={id:1,x:142,y:320,w:44,h:70,surface:{y:480},liftOrigin:{x:142,y:476}};
  const roots=enemyControlAnchor(enemy,'roots'),wind=enemyControlAnchor(enemy,'whirlwind');
  assert.equal(roots.x,142);assert.equal(roots.groundY,480);
  assert.equal(wind.groundY,476);
  assert.ok(roots.width>0&&wind.height>0);
});
test('one atlas frame is drawn for each targeted enemy, not at the hero',()=>{
  const old=globalThis.Image;
  globalThis.Image=class {
    naturalWidth=192;naturalHeight=192;
    set src(url){this.url=url;this.onload?.();}
  };
  try{
    const calls=[],c={globalAlpha:1,save(){},restore(){},drawImage(...args){calls.push(args);}};
    const game={enemies:[
      {id:11,x:120,y:500,w:50,h:72,surface:{y:500},state:'alive'},
      {id:12,x:320,y:500,w:50,h:72,surface:{y:500},state:'alive'},
      {id:13,x:700,y:500,w:50,h:72,surface:{y:500},state:'dead'}
    ],powers:{active:{roots:{age:1.1,targets:[11,12,13]}}}};
    const before=JSON.stringify(game);
    const result=drawEnemyControlVfx(c,game);
    assert.equal(calls.length,2);
    assert.equal(calls[0][1],0);assert.equal(calls[0][2],96); // Roots frame 2
    assert.ok(calls[0][5]<120&&calls[1][5]>250);
    assert.equal(JSON.stringify(game),before,'rendering must not mutate gameplay state');
    assert.ok(result.handledRoots.has(11));
    game.powers.active.roots.age=2.1;
    calls.length=0;
    drawEnemyControlVfx(c,game);
    assert.equal(calls.length,0,'visuals finish even if gameplay control continues');
  }finally{
    if(old===undefined)delete globalThis.Image;else globalThis.Image=old;
  }
});
test('art sources use game-local transparent atlases',()=>{
  assert.match(ENEMY_CONTROL_VFX_SOURCES.roots,/ground-roots-trap\\.avif$/);
  assert.match(ENEMY_CONTROL_VFX_SOURCES.whirlwind,/whirlwind-hit\\.avif$/);
});