import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {HERO_OVERLAY_ASSETS,HERO_OVERLAY_VERSION,prepareHeroPowerOverlays,
 heroPowerOverlayStates,heroPowerOverlayFrame,drawHeroPowerOverlays,
 heroPowerOverlayStatus} from '../v2-sprites/hero-power-overlays.mjs';

const hero={dead:false};
const make=(kind,age=1)=>({hero,powers:{active:{[kind]:{age,duration:2}}}});
test('approved artwork layout is two six-frame transparent sheets',()=>{
 assert.equal(HERO_OVERLAY_VERSION,'approved-character-wrap-v1');
 for(const spec of Object.values(HERO_OVERLAY_ASSETS))
   assert.deepEqual([spec.cols,spec.rows,spec.cell],[3,2,256]);
 assert.notEqual(HERO_OVERLAY_ASSETS.roots.file,HERO_OVERLAY_ASSETS.whirlwind.file);
});
test('committed approved WebP sheets are transparent and contain all six frames',async()=>{
 for(const [kind,meta] of Object.entries(HERO_OVERLAY_ASSETS)){
  const file=new URL('../assets/vfx/'+meta.file.split('/').at(-1),import.meta.url);
  const b=await readFile(file);
  assert.ok(b.length>30000,kind+' illustration must not be missing');
  assert.equal(b.toString('ascii',0,4),'RIFF');
  assert.equal(b.toString('ascii',8,12),'WEBP');
  assert.equal(b.toString('ascii',12,16),'VP8X');
  assert.ok((b[20]&0x10)!==0,kind+' must have alpha');
  assert.equal(b.readUIntLE(24,3)+1,meta.cols*meta.cell);
  assert.equal(b.readUIntLE(27,3)+1,meta.rows*meta.cell);
 }
});
test('state and frame selection read powers but never alter them',()=>{
 for(const kind of ['roots','whirlwind']){
  const game=make(kind,.38),snapshot=JSON.stringify(game);
  const state=heroPowerOverlayStates(game)[0];
  assert.equal(state.id,kind);
  assert.equal(state.duration,2);
  assert.equal(heroPowerOverlayFrame(state),2);
  assert.equal(JSON.stringify(game),snapshot);
 }
 assert.equal(heroPowerOverlayStates({hero:{dead:true},powers:{active:{roots:{age:.2}}}}).length,0);
 assert.equal(heroPowerOverlayStates({hero,powers:{active:{}}}).length,0);
 assert.equal(heroPowerOverlayFrame({progress:.01}),0);
 assert.equal(heroPowerOverlayFrame({progress:.95}),5);
});
test('render draws approved art behind and in front of an unchanged hero',async()=>{
 const loads=[];
 assert.equal(await prepareHeroPowerOverlays(async url=>{
  loads.push(url.href);
  return {width:768,height:512};
 }),true);
 assert.equal(loads.length,2);
 assert.deepEqual(heroPowerOverlayStatus(),{roots:true,whirlwind:true});
 for(const kind of ['roots','whirlwind']){
  const game=make(kind,1),before=JSON.stringify(game),drawn=[];
  const c={save(){},restore(){},beginPath(){},rect(){},clip(){},translate(){},scale(){},
    drawImage(...args){drawn.push(args)}};
  assert.equal(drawHeroPowerOverlays(c,game,{x:240,y:500},1,'back'),true);
  assert.equal(drawHeroPowerOverlays(c,game,{x:240,y:500},1,'front'),true);
  assert.equal(drawn.length,2,kind+' must surround rather than replace hero');
  assert.ok(drawn.every(args=>args.length===9));
  assert.ok(drawn.every(args=>args[3]===256&&args[4]===256));
  assert.equal(JSON.stringify(game),before,'overlay cannot mutate physics or saves');
 }
});
test('game compositor prevents old full-character Roots/Whirlwind poster',async()=>{
 const renderer=await readFile(new URL('../renderer.mjs',import.meta.url),'utf8');
 const app=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 assert.ok(renderer.includes("const approved=!wrappingPower&&!!specialArt"));
 assert.ok(renderer.includes("drawHeroPowerOverlays(c,game,pos,t,'back')"));
 assert.ok(renderer.includes("drawHeroPowerOverlays(c,game,pos,t,'front')"));
 assert.ok(renderer.indexOf("drawHeroPowerOverlays(c,game,pos,t,'back')")<
   renderer.indexOf('const generated=approved||('));
 assert.ok(renderer.indexOf("drawHeroPowerOverlays(c,game,pos,t,'front')")>
   renderer.indexOf("drawHero(c,pos.x,pos.y"));
 assert.ok(app.includes('void prepareHeroPowerOverlays();'));
});
