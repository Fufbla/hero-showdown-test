import test from 'node:test';import assert from 'node:assert/strict';
import {backRoute,hasResumeActions,PAUSE_NESTED_SCREENS} from '../menu-navigation.mjs';
import {Game} from '../core.mjs';
test('every nested pause screen routes B/Circle/Escape to Pause Menu',()=>{
 for(const screen of PAUSE_NESTED_SCREENS){
  const opts={gameStarted:true,editing:true};
  assert.equal(backRoute(screen,opts),'pause',screen);
  assert.equal(hasResumeActions(screen,opts),true,screen);
 }
});
test('main Pause resumes, subpanel goes home, and gameplay pauses',()=>{
 assert.equal(backRoute('play',{gameStarted:true}),'pause');
 assert.equal(backRoute('pause',{gameStarted:true}),'resume');
 assert.equal(backRoute('pause',{pauseSubmenu:true,gameStarted:true}),'pause-home');
 assert.equal(hasResumeActions('pause',{gameStarted:true}),false);
 assert.equal(hasResumeActions('pause',{pauseSubmenu:true,gameStarted:true}),true);
});
test('new hero creation, modal and reward screens do not become resume shortcuts',()=>{
 assert.equal(backRoute('creator',{gameStarted:false,editing:false}),'cancel-creator');
 assert.equal(hasResumeActions('creator',{gameStarted:false,editing:false}),false);
 assert.equal(backRoute('delete'),'close-delete');
 assert.equal(backRoute('mergeReward',{gameStarted:true}),'resolve-reward');
 assert.equal(backRoute('powerPicker',{gameStarted:true}),'close-picker');
});
test('entering and exiting Tree of Eris retains exact position and progression',()=>{
 const g=new Game();g.canTravel=()=>true;
 Object.assign(g.hero,{x:1234.125,y:314.75,face:-1,vx:3.125,vy:0,jumps:0,hp:42.25,coins:378,xp:17,level:5});
 const before={hero:structuredClone(g.hero),look:structuredClone(g.look),powers:structuredClone(g.powers.data),inventory:structuredClone(g.inventory)};
 assert.equal(g.visitTree(),true);
 assert.equal(g.treeVisit,true);
 assert.equal(g.leaveTree(),true);
 assert.equal(g.treeVisit,false);
 assert.equal(g.sanctuary,null);
 for(const k of ['x','y','face','vx','vy','jumps','hp','coins','xp','level'])assert.equal(g.hero[k],before.hero[k],k);
 assert.deepEqual(g.look,before.look);assert.deepEqual(g.powers.data,before.powers);assert.deepEqual(g.inventory,before.inventory);
});
