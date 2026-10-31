import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STEP,decodeSave} from '../core.mjs';
import {ProjectilePool,compactProjectiles,clearProjectiles} from '../projectiles.mjs';
import {stepEnemyProjectiles} from '../monsters.mjs';
import {shouldWriteAdventure} from '../save-policy.mjs';
import {deletionRecord,validateLedgerWrite,reconcileLegendaryStore} from '../legendary-ledger.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../saves.mjs';
import {text,html,attr} from '../hud-dom.mjs';
import {FrameMetrics} from '../performance.mjs';
import {normalizeControls} from '../controls.mjs';
import {GameAudio,MUSIC_THEMES,normalizeAudio,musicScene,AUDIO_KEY} from '../audio.mjs';
import {scenarioGame,scenarioInput,SCENARIOS} from './benchmark-scenes.mjs';
const memory=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};

test('P10 existing heroes only write ordinary adventure progress on an explicit safe manual save',()=>{
 for(const safe of [false,true])for(const pending of [false,true])for(const manual of [false,true])for(const heroId of [null,'hero'])assert.equal(shouldWriteAdventure({safe,pending,manual,heroId}),safe&&!pending&&(manual||!heroId));
});
test('P10 deletion tombstone rejects stale revisions and every subsequent permanent reward write',()=>{
 const record=deletionRecord(null,'hero-a',0);assert.deepEqual(record,{heroId:'hero-a',revision:0,deleted:true});
 assert.equal(deletionRecord(record,'hero-a',0),record);assert.throws(()=>deletionRecord({revision:3},'hero-a',2),/changed/);
 assert.throws(()=>validateLedgerWrite(record,'hero-a',0,new Game().save()),/deleted/);
 for(const bad of ['',null,'x'.repeat(161)])assert.throws(()=>deletionRecord(null,bad,0),/Invalid/);
});
test('P10 stale manual slots cannot recover deleted heroes; other heroes remain independent',async()=>{
 const storage=memory();let serial=0;const store=new LocalHeroStore(storage,{id:()=>`hero-${++serial}`});
 for(let i=0;i<3;i++){const g=new Game();g.hero.coins=i*50;store.writeSlot(i,g.save());}
 const stale=storage.getItem(PROFILE_KEY),other=store.slot(2),ledger={all:async()=>[deletionRecord(null,'hero-2',0)]};
 await reconcileLegendaryStore(store,ledger);assert.equal(store.slot(1),null);assert.deepEqual(store.slot(2),other);
 storage.setItem(PROFILE_KEY,stale);const restored=new LocalHeroStore(storage);await reconcileLegendaryStore(restored,ledger);assert.equal(restored.slot(1),null);assert.equal(restored.slot(0).snapshot.coins,0);assert.equal(restored.slot(2).snapshot.coins,100);
});
test('P10 failed ordinary deletion flush leaves the in-memory slot intact',()=>{
 const storage=memory(),store=new LocalHeroStore(storage,{id:()=> 'hero'});store.writeSlot(0,new Game().save());const before=store.slot(0);
 storage.setItem=()=>{throw Error('Quota failure');};const result=store.deleteSlot(0,'hero');assert.equal(result.ok,false);assert.equal(result.retained,false);assert.deepEqual(store.slot(0),before);
});
test('P10 projectile pool is bounded, reuses hit sets, removes old source ownership and rejects double release',()=>{
 const pool=new ProjectilePool(2),source={boss:true},a=pool.acquire({source,damage:77,bounce:3,gravity:650,life:3}),b=pool.acquire({life:3});a.hits.add('old');assert.equal(pool.acquire({}),null);
 const hits=a.hits;pool.release(a);pool.release(a);pool.release({});assert.equal(pool.free.length,1);const next=pool.acquire({life:1});assert.equal(next,a);assert.equal(next.hits,hits);assert.equal(hits.size,0);assert.equal(next.source,null);assert.equal(next.damage,undefined);assert.equal(next.bounce,0);assert.equal(next.gravity,0);
 const list=[next,b];next.life=0;compactProjectiles(list,pool);assert.deepEqual(list,[b]);clearProjectiles(list,pool);assert.equal(list.length,0);assert.equal(pool.free.length,2);assert.equal(pool.created,2);
});
test('P10 bouncing projectiles use the actual solid surface height, not the arena floor',()=>{
 const g=new Game();g.hero.x=50;g.surfaces=[{x:700,y:250,w:300,h:30}];const p=g.spawnEnemyShot({x:800,y:230,vx:20,vy:600,life:3,bounce:2,damage:10});
 stepEnemyProjectiles(g,STEP*2);assert.equal(g.enemyShots.length,1);assert.equal(p.y,244);assert.ok(p.vy<0);assert.equal(p.bounce,1);
 g.clearEnemyShots();g.spawnEnemyShot({x:680,y:260,vx:1800,vy:0,life:3,bounce:2,damage:10});stepEnemyProjectiles(g,STEP);assert.equal(g.enemyShots.length,0,'side wall cannot bounce like floor');
});
test('P10 swept wall contact protects heroes behind a wall at high projectile speed',()=>{
 const g=new Game();g.surfaces=[{x:300,y:100,w:20,h:500}];Object.assign(g.hero,{x:380,y:400,invulnerable:0});const hp=g.hero.hp;
 g.spawnEnemyShot({x:200,y:360,vx:20000,vy:0,life:3,damage:50});stepEnemyProjectiles(g,STEP);assert.equal(g.hero.hp,hp);assert.equal(g.enemyShots.length,0);
});
test('P10 HUD no-op updates do not replace nodes or attributes',()=>{
 const counts={text:0,html:0,attr:0};let t='',h='';const attrs={};const element={get textContent(){return t;},set textContent(v){t=v;counts.text++;},get innerHTML(){return h;},set innerHTML(v){h=v;counts.html++;},getAttribute:k=>attrs[k],setAttribute:(k,v)=>{attrs[k]=v;counts.attr++;}};
 for(let i=0;i<600;i++){text(element,4);html(element,'Rest <kbd>E</kbd>');attr(element,'aria-label','Ready');}
 assert.deepEqual(counts,{text:1,html:1,attr:1});text(element,3);assert.equal(counts.text,2);
});
test('P10 benchmark measures real frame intervals, mean processing costs and low FPS',()=>{
 const m=new FrameMetrics(0,{duration:1,heap:1024});for(let i=1;i<=100;i++)m.record(i*10,{interval:i===100?100:10,simulation:.2,draw:.5,hud:.1});const r=m.finish(1000,{heapEndBytes:2048});assert.equal(r.averageFPS,100);assert.equal(r.onePercentLowFPS,10);assert.equal(r.p95FrameMs,10);assert.ok(Math.abs(r.averageDrawMs-.5)<1e-8);assert.equal(r.heapStartBytes,1024);
});
test('P10 joystick sizing is bounded and default controls remain unique',()=>{
 assert.equal(normalizeControls().touch.stickSize,92);assert.equal(normalizeControls({touch:{stickSize:999}}).touch.stickSize,106);assert.equal(normalizeControls({touch:{stickSize:1}}).touch.stickSize,76);
 const c=normalizeControls();assert.equal(new Set(Object.values(c.pad)).size,Object.keys(c.pad).length);
});
class FakeContext{
 constructor(){this.currentTime=0;this.state='suspended';this.destination={};this.live=new Set();}
 async resume(){this.state='running';}async close(){this.state='closed';}
 param(){return {setValueAtTime(){},setTargetAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};}
 createGain(){return {gain:this.param(),connect(){},disconnect(){}};}
 createOscillator(){const c=this,o={frequency:this.param(),connect(){},disconnect(){},start(){c.live.add(o);},stop(t=c.currentTime){o.end=t;}};return o;}
 advance(dt){this.currentTime+=dt;for(const o of this.live)if(o.end<=this.currentTime){this.live.delete(o);o.onended?.();}}
}
test('P10 original exploration, regional and eight Legendary themes are distinct and music defaults to 35%',()=>{
 assert.equal(Object.keys(MUSIC_THEMES).length,16);assert.equal(new Set(Object.values(MUSIC_THEMES).map(t=>`${t.tempo}:${t.wave}:${t.notes}`)).size,16);
 assert.deepEqual(normalizeAudio(),{music:.35,effects:.65});assert.deepEqual(normalizeAudio({music:-1,effects:4}),{music:0,effects:1});const g=new Game();assert.equal(musicScene(g),'region-1');g.arenaScene={};assert.equal(musicScene(g),'regional-boss');g.arenaScene.legendary='lightning';assert.equal(musicScene(g),'lightning');g.arenaScene.cleared=true;assert.equal(musicScene(g),'region-1');
});
test('P10 audio bounds SFX voices, crossfades at most two themes, persists separate levels and disposes nodes',async()=>{
 const storage=memory(),audio=new GameAudio(storage);await audio.enable(FakeContext);for(let i=0;i<100;i++)audio.effect('hit');assert.equal(audio.voices.size,12);audio.context.advance(.2);assert.equal(audio.voices.size,0);
 for(let i=0;i<300;i++){audio.update(`region-${i%7+1}`,true);audio.context.advance(.1);assert.ok(audio.context.live.size<20);}
 audio.volume('music',.22);audio.volume('effects',.77);assert.deepEqual(JSON.parse(storage.getItem(AUDIO_KEY)),{music:.22,effects:.77});audio.mute();audio.context.advance(1);assert.equal(audio.context.live.size,0);assert.equal(audio.current,null);audio.destroy();assert.equal(audio.context.state,'closed');
});
for(const scene of SCENARIOS)test(`P10 stress ${scene}: bounded shots, finite physics, no save schema drift`,()=>{
 const g=scenarioGame(Game,scene);if(scene==='legendary'){assert.equal(g.arenaScene.boss.phase,3);assert.equal(g.enemies.filter(e=>e.summoned&&e.state!=='dead').length,3);}g.paused=false;for(let i=0;i<3600;i++){g.step(STEP,scenarioInput(g,scene,i));g.drain();assert.ok(g.enemyShots.length<=64);assert.ok(g.powers.projectiles.length<=12);assert.ok(Number.isFinite(g.hero.x)&&Number.isFinite(g.hero.y));}
 assert.ok(g.enemyShotPool.created<=64);assert.ok(g.powers.projectilePool.created<=12);g.leaveBoss();g.combatTimer=0;g.hero.attack=null;g.powers.cancelEffects();g.clearEnemyShots();g.cancelMergeEffects();assert.ok(decodeSave(g.save()));
});
