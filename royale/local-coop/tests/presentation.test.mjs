import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {Game} from '../../core.mjs';
import {Renderer} from '../../renderer.mjs';
import {prepareReleaseArt} from '../../release-src/presentation.mjs';
import {heroPowerOverlayStatus} from '../../v2-sprites/hero-power-overlays.mjs';
import {MotionFX,kingJamesFX} from '../../../royale-v3-staging/kingjames/motion-fx.mjs';
import {costumeSprites} from '../../../royale-v3-staging/costumes/engine.mjs';
import {costumeById} from '../../../royale-v3-staging/costumes/catalog.mjs';
import {kingJamesSprites} from '../../../royale-v3-staging/kingjames/outfit-engine.mjs';
import {starterSuit} from '../../../royale-v3-staging/starter-suit/engine.mjs';
import {styleCDefault} from '../../style-c-defaults.mjs';
const {createCanvas,Image}=createRequire(import.meta.url)('@napi-rs/canvas');
globalThis.Image=class extends Image {set src(value){super.src=String(value).startsWith('file:')?fileURLToPath(value):value;}get src(){return super.src;}};
globalThis.OffscreenCanvas=class {constructor(w,h){return createCanvas(w,h);}};
globalThis.fetch=async url=>new Response(await readFile(new URL(url)));
globalThis.window={devicePixelRatio:1,innerWidth:1280,innerHeight:720,matchMedia:()=>({matches:false})};
globalThis.document={body:{classList:{contains:()=>false}}};
globalThis.ResizeObserver=class {observe(){}disconnect(){}};
// Actual effect sheets; lightweight character stand-ins keep this compositing
// regression independent of the large body atlases covered by sprite tests.
starterSuit.preload=kingJamesSprites.preload=async()=>true;
const body=(c,x,y)=>{c.fillStyle='#7155cc';c.fillRect(x-25,y-105,50,105);return {arms:[[[0,-60],[20,-60],[35,-40]]]};};
kingJamesSprites.draw=costumeSprites.draw=body;
await prepareReleaseArt();

function fixture(power,face,costume){
 const g=new Game({look:styleCDefault('female')});g.loadRegion(2,{x:2500,y:600});g.time=1;
 g.surfaces=[];g.camps=[];g.enemies=[];g.enemyShots=[];g.loot=[];
 Object.assign(g.hero,{x:2500,y:600,prevX:2500,prevY:600,face,prevFace:face,grounded:true,castAge:100,respawnAge:100,hurtAge:100});
 if(costume){const set=costumeById('fishsticks-costume');g.cosmetics={version:1,revision:1,visible:true,owned:set.pieces.map(p=>p.id),equipped:Object.fromEntries(set.pieces.map(p=>[p.category,p.id]))};}
 if(['roots','whirlwind','steel','flight'].includes(power))g.powers.active[power]={age:.6,duration:2,targets:[]};
 if(power==='steel')g.hero.steel=true;
 if(power==='flight')Object.assign(g.hero,{flying:true,grounded:false,vx:200});
 if(power==='fireball'){g.hero.castAge=.12;g.powers.projectiles.push({x:2550,y:545,vx:520*face,life:1.4});}
 if(['strength','superKick'].includes(power))g.hero.attack={power,kind:power==='strength'?'punch':'kick',age:.12,face,stats:{level:2},comboIndex:0};
 return g;
}
function renderer(){
 const canvas=createCanvas(400,240);canvas.getBoundingClientRect=()=>({width:400,height:240});canvas.dataset={};
 const r=new Renderer(canvas);r.width=400;r.height=240;r.scale=1;r.dpr=1;r.camera=2300;r.cameraY=400;r.scene='2:world';
 r.environment.sky=()=>{};r.terrain=()=>{};return r;
}
test('both release entrypoints preload the approved roots and whirlwind sheets',()=>{
 assert.deepEqual(heroPowerOverlayStatus(),{roots:true,whirlwind:true});
});
test('solo and the co-op player draw identical hero/effect pixels for every active power, direction and costume',()=>{
 for(const power of ['idle','roots','whirlwind','fireball','strength','superKick','steel','flight'])for(const face of [-1,1])for(const costume of [false,true]){
  const solo=fixture(power,face,costume),coop=fixture(power,face,costume),a=renderer(),b=renderer();
  let soloPixels;
  a.drawPlayer=function(...args){
   this.c.save();this.c.resetTransform();this.c.clearRect(0,0,400,240);this.c.restore();
   const pos=Renderer.prototype.drawPlayer.apply(this,args);soloPixels=this.c.getImageData(0,0,400,240).data;return pos;
  };
  const before=coop.save();a.draw(solo,1,0);
  b.c.translate(-a.camera,-a.cameraY);b.drawPlayer(coop,1,0);
  assert(Buffer.from(soloPixels).equals(Buffer.from(b.c.getImageData(0,0,400,240).data)),`${power}, face ${face}, costume ${costume}`);
  assert.equal(coop.save(),before,'Rendering cannot change a saved hero');a.destroy();b.destroy();
 }
});
test('two speed trails retain their own hero appearance when the shared sprite engine alternates players',()=>{
 const fx=new MotionFX();Object.assign(fx,{ready:true,manifest:kingJamesFX.manifest,atlas:kingJamesFX.atlas});
 const a=fixture('idle',1,false),b=fixture('idle',-1,false),engine={lastPaint:null,drawEcho(){}};
 const c=createCanvas(400,240).getContext('2d');
 for(const [g,id] of [[a,'player-one'],[b,'player-two']]){g.hero.vx=300;g.powers.data.levels.speed=2;fx.draw(c,g,{x:200,y:200},0,'back',g.hero,engine);engine.lastPaint={id};fx.draw(c,g,{x:200,y:200},0,'front',g.hero,engine);}
 for(const [g,id] of [[a,'player-one'],[b,'player-two']]){
  fx.draw(c,g,{x:200,y:200},.1,'back',g.hero,engine);
  assert.equal(fx.state(g.hero,.1).echoes[0].paint.id,id);
  engine.lastPaint={id};fx.draw(c,g,{x:200,y:200},.1,'front',g.hero,engine);
 }
});
