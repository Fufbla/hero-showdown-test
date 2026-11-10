import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {V2_TEST_CODE,V2_TEST_HERO_NAME,V2_TEST_STORAGE_PREFIX,V2_TEST_QUERY_PARAM,isV2TestCode,isV2TestRoute,v2TestLook} from '../v2-test-hero.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {Game} from '../core.mjs';
import {LocalHeroStore} from '../saves.mjs';

test('0000000000 is a dedicated public sandbox shortcut, never a production code',()=>{
 assert.equal(V2_TEST_CODE,'0000000000');
 assert.equal(isV2TestCode('0000000000'),true);
 assert.equal(isV2TestCode(' 0000000000 '),true);
 assert.equal(isV2TestCode('0000000001'),false);
 assert.equal(isV2TestCode('1234567890'),false);
 assert.equal(isV2TestRoute(new URLSearchParams(V2_TEST_QUERY_PARAM+'=0000000000')),true);
 assert.equal(isV2TestRoute(new URLSearchParams(V2_TEST_QUERY_PARAM+'=1234567890')),false);
 assert.notEqual(V2_TEST_STORAGE_PREFIX,'royale-v3-play:');
 assert.notEqual(V2_TEST_STORAGE_PREFIX,'healthia.royale.profiles.v2');
});

test('sandbox hero preserves default style and cannot mutate production namespace',()=>{
 const defaultHero=styleCDefault('male');
 const look=v2TestLook(defaultHero);
 assert.equal(look.name,V2_TEST_HERO_NAME);
 for(const k of ['presentation','skin','eyes','hair','hairColor','build','suit','trim','capeColor','emblem']){
  assert.equal(look[k],defaultHero[k],k+' must match the default hero exactly');
 }
 const memory=new Map([
  ['royale-v3-play:healthia.royale.profiles.v2','production-cloud-has-heroes'],
  ['healthia.royale.profiles.v2','production-local-has-heroes']
 ]);
 const storage={
  getItem:key=>memory.get(V2_TEST_STORAGE_PREFIX+key)||null,
  setItem:(key,value)=>{memory.set(V2_TEST_STORAGE_PREFIX+key,value);}
 };
 const store=new LocalHeroStore(storage);
 assert.equal(store.slot(0),null);
 const game=new Game({look});
 const snapshot=game.save();
 assert.ok(snapshot,'test character should have a playable save');
 const written=store.writeSlot(0,snapshot,{expectedId:null,requireDurable:true});
 assert.equal(written.ok,true,written.error);
 const refreshed=new LocalHeroStore(storage);
 assert.equal(refreshed.slot(0).snapshot.look.name,V2_TEST_HERO_NAME);
 assert.equal(refreshed.slot(0).snapshot.look.skin,defaultHero.skin);
 assert.equal(memory.get('royale-v3-play:healthia.royale.profiles.v2'),'production-cloud-has-heroes');
 assert.equal(memory.get('healthia.royale.profiles.v2'),'production-local-has-heroes');
 assert.equal(refreshed.slot(1),null);
 assert.equal(refreshed.slot(2),null);
});

test('V3 entry recognizes test code before cloud verification and uses non-cloud iframe route',async()=>{
 const parent=await readFile(new URL('../../royale-v3-staging/app.mjs',import.meta.url),'utf8');
 const child=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 assert.ok(parent.includes('if(isV2TestCode(code)){launchV2Prototype();return;}'));
 assert.ok(parent.includes("access='';refresh='';code=V2_TEST_CODE;"));
 assert.ok(parent.includes("V2 TEST HERO · 0000000000"));
 assert.ok(parent.includes("'../royale/?'+V2_TEST_QUERY_PARAM+'='+V2_TEST_CODE"));
 assert.ok(child.includes("const v2TestHero=isV2TestRoute(params)"));
 assert.ok(child.includes("v2TestHero?V2_TEST_STORAGE_PREFIX"));
 assert.ok(child.includes("if(v2TestHero&&store.slot(0))"));
 assert.ok(child.includes("continueHero(0)"));
 assert.ok(child.includes("if(codePlay)setInterval(sendCodeProgress,8000)"));
 // The fixed test code must NEVER become part of a real cloud session.
 assert.ok(parent.indexOf('if(isV2TestCode(code)){launchV2Prototype();return;}')<
   parent.indexOf("api('verify',{code},false)"));
});
