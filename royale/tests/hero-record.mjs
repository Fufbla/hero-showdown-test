// Deterministic evidence capture. Runs the actual game/renderer at fixed steps;
// encoded video FPS is not a physical or browser performance measurement.
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {Game,STEP} from '../core.mjs';
import {Renderer} from '../renderer.mjs';
import {BossArt} from '../boss-art.mjs';
import {MONSTER_ANIMATIONS} from '../monster-animation-catalog.mjs';
import {prepareHeroMaterials} from '../hero-materials.mjs';
import {HERO_SAMPLES,renderHeroCard} from './hero-review-checks.mjs';
import {ROSTER,prepareCreature,drawCreature,checkCreatures} from './creature-review-render.mjs';
import {legendaryGame} from './legendary-fixture.mjs';
const require=createRequire(import.meta.url);let native;try{native=require('@napi-rs/canvas');}catch{native=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');}
const {createCanvas,loadImage}=native;
globalThis.document={createElement:()=>createCanvas(1,1)};globalThis.window={devicePixelRatio:1};globalThis.ResizeObserver=class{observe(){}disconnect(){}};
const options={imageLoader:url=>loadImage(fileURLToPath(url)),canvasFactory:(w=512,h=w)=>createCanvas(w,h)};
await prepareHeroMaterials(options);
const out=fileURLToPath(new URL('../qa/hero-animation/',import.meta.url));mkdirSync(out,{recursive:true});
const gameplayOnly=process.argv.includes('--gameplay-only');
const checks=gameplayOnly?{creatures:ROSTER.length}:await checkCreatures(createCanvas,options,(n,c)=>{if(n%6===0)console.log(`${n}/36 creatures; ${c} assertions`);});
if(!gameplayOnly)writeFileSync(out+'creature-raster-results.json',JSON.stringify(checks,null,2)+'\n');
const screen=createCanvas(1280,720),c=screen.getContext('2d');screen.getBoundingClientRect=()=>({width:1280,height:720});
async function video(name,frames,draw){
 const child=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','30','-i','pipe:0','-an','-c:v','libx264','-preset','fast','-crf','21','-pix_fmt','yuv420p','-movflags','+faststart',out+name],{stdio:['pipe','inherit','inherit']});
 const done=once(child,'close');for(let i=0;i<frames;i++){await draw(i);if(!child.stdin.write(screen.toBuffer('image/png')))await once(child.stdin,'drain');}child.stdin.end();const [code]=await done;if(code)throw Error('ffmpeg failed '+code);console.log('Recorded '+name);
}
function label(title,subtitle){c.save();c.setTransform(1,0,0,1,0,0);c.fillStyle='#102b33eb';c.fillRect(0,0,1280,83);c.fillStyle='#f8e9c4';c.font='bold 26px sans-serif';c.fillText(title,24,34);c.fillStyle='#b7cdbf';c.font='16px sans-serif';c.fillText(subtitle,24,63);c.restore();}
const creature=await prepareCreature(ROSTER.find(v=>v.key==='monster-bottle'),options),segments=['idle','walk','run','punch','kick','double-jump','air-punch','air-kick','superKick','hurt'];
if(!gameplayOnly)await video('animation-closeup.mp4',600,frame=>{const state=segments[Math.floor(frame/60)],time=frame/30;c.setTransform(1,0,0,1,0,0);c.fillStyle='#183a43';c.fillRect(0,0,1280,720);c.strokeStyle='#6b8d79';c.beginPath();c.moveTo(50,615);c.lineTo(1230,615);c.stroke();for(let i=0;i<3;i++){const x=210+i*425;renderHeroCard(c,HERO_SAMPLES[i],state,time,{x,y:610,scale:3.5,face:i===1?-1:1});c.fillStyle='#f8e9c4';c.font='18px sans-serif';c.fillText(HERO_SAMPLES[i].name,x-75,658);}drawCreature(c,creature,{x:1120,y:610,scale:1.5});label('Custom hero animation · '+state,'Actual articulated renderer · three saved builds · 30 FPS offline export');});creature.release();
let renderer,game,scene=-1;const costs=[],sceneStats=[];
await video('gameplay-desktop.mp4',540,async frame=>{
 const next=Math.floor(frame/180),local=frame%180;
 if(next!==scene){renderer?.destroy();scene=next;game=scene===2?legendaryGame('lightning'):new Game({random:()=>.4,look:HERO_SAMPLES[scene]});game.look=HERO_SAMPLES[scene];game.hero.invulnerable=1e9;game.paused=false;game.hero.level=99;game.hero.hp=game.hero.maxHp=1570;
  if(scene!==2){game.hero.x=game.hero.prevX=scene?game.surfaces.find(s=>s.id==='climb-0-2').x+50:1100;game.hero.y=game.hero.prevY=scene?game.surfaces.find(s=>s.id==='climb-0-2').y:600;for(const id of ['fireball','superKick','steel'])game.powers.data.levels[id]=20;game.powers.data.equipped=['fireball','superKick','steel'];}
  renderer=new Renderer(screen);renderer.bossArt=new BossArt({loadImages:true,spriteImageLoader:options.imageLoader,spriteCanvasFactory:options.canvasFactory,scorpionImageLoader:p=>options.imageLoader(new URL('../../'+p,import.meta.url)),scorpionCanvasFactory:options.canvasFactory});
  for(const [type,p] of Object.entries(MONSTER_ANIMATIONS))if(p.region===game.regionId){const image=await options.imageLoader(new URL('../assets/monsters/'+p.file,import.meta.url));renderer.monsterAtlas.sources.set(type,{image,promise:Promise.resolve(true)});}if(scene===2)await renderer.bossArt.prepare('lightning');game.onBossVisualStep=(boss,time,dt,x)=>renderer.bossArt.step(boss,time,dt,x);if(game.arenaScene)renderer.bossArt.step(game.arenaScene.boss,game.time,0,game.hero.x);sceneStats.push({scene:['Coastal battle','Elevated platform','Lightning Spree'][scene],maxEnemies:0,maxEffects:0});
 }
 const tick=performance.now();for(let n=0;n<2;n++){const f=local*2+n;game.step(STEP,{move:scene===2?(f<100?1:0):f<100?1:f<200?-1:0,run:f<85,jump:f===20||f===40||f===230||f===250,punchHeld:f>65&&f<130,kickHeld:f>160&&f<210,powers:[f===120,f===220,f===10]});}
 renderer.draw(game,1,1/30);if(game.arenaScene&&!renderer.bossArt.inspect(game.arenaScene.boss).selection)throw Error('Recorder omitted boss visual update');costs.push(performance.now()-tick);sceneStats[scene].maxEnemies=Math.max(sceneStats[scene].maxEnemies,game.enemies.filter(e=>e.state!=='dead').length);sceneStats[scene].maxEffects=Math.max(sceneStats[scene].maxEffects,game.powers.projectiles.length+game.powers.bursts.length+Object.keys(game.powers.active).length+game.enemyShots.length);
 label('Hero Showdown Royale · '+sceneStats[scene].scene,'Unchanged game simulation + integrated creatures · disposable invulnerable QA hero · 30 FPS offline export');if(local===75)writeFileSync(out+['native-gameplay-ground.png','native-gameplay-platform.png','native-gameplay-boss.png'][scene],screen.toBuffer('image/png'));
});renderer.destroy();costs.sort((a,b)=>a-b);writeFileSync(out+'recording-results.json',JSON.stringify({videoFPS:30,simulationHz:60,scope:'Offline deterministic native capture; no real-time FPS claim',creatures:checks.creatures,frames:540,meanTwoStepsAndDrawMs:costs.reduce((a,b)=>a+b,0)/costs.length,p95TwoStepsAndDrawMs:costs[Math.floor(costs.length*.95)],scenes:sceneStats},null,2)+'\n');
