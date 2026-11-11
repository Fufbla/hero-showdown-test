import test from 'node:test';
import assert from 'node:assert/strict';
import {V2SpeedTrail,speedMotionActive,speedMotionDirection,SPEED_TRAIL_THRESHOLD} from '../v2-sprites/consistent-motion.mjs';
const game=(vx=320)=>({testPowers:true,paused:false,hero:{face:vx<0?-1:1,vx,grounded:true,dead:false,flying:false},powers:{data:{levels:{speed:20}}}});
function createCanvas(){
 const log=[];
 const ctx={
  save(){log.push(['save']);},restore(){log.push(['restore']);},
  clearRect(...args){log.push(['clearRect',...args]);},
  drawImage(...args){log.push(['drawImage',...args]);},
  beginPath(){},moveTo(...args){log.push(['move',...args]);},
  quadraticCurveTo(...args){log.push(['curve',...args]);},
  ellipse(...args){log.push(['ellipse',...args]);},stroke(){},fill(){},
  set globalAlpha(v){this._alpha=v;},get globalAlpha(){return this._alpha??1;}
 };
 return {canvas:{width:0,height:0,getContext:()=>ctx},log,ctx};
}
test('speed VFX is strictly isolated to moving grounded prototype hero',()=>{
 const g=game();
 assert.equal(speedMotionActive(g),true);
 for(const diff of [{testPowers:false},{paused:true},{hero:{...g.hero,grounded:false}},
   {hero:{...g.hero,dead:true}},{hero:{...g.hero,flying:true}},
   {hero:{...g.hero,vx:SPEED_TRAIL_THRESHOLD}},{powers:{data:{levels:{speed:0}}}}])
  assert.equal(speedMotionActive({...g,...diff}),false);
 assert.equal(speedMotionDirection({vx:260}),1);
 assert.equal(speedMotionDirection({vx:-260}),-1);
});
test('afterimages reuse one live renderer and outfit, anchored at physics feet',()=>{
 const captures=[],buffers=[];
 const trail=new V2SpeedTrail({makeCanvas:()=>{const b=createCanvas();buffers.push(b);return b.canvas;},
  paintHero:(...args)=>captures.push(args),ghostCloth:{}});
 const screen=createCanvas();
 const g=game(360),look={name:'Hero',cape:true},outfit={pieces:{cape:{color:'#00ff60'}}};
 const clothing=[{name:'saved-green-suit'}],appearance={outfit,clothing,dt:0.016};
 const pos={x:450,y:600};
 assert.equal(trail.draw(screen.ctx,g,pos,g.hero,0,look,appearance),true);
 assert.equal(captures.length,1);
 assert.equal(captures[0][1],128);
 assert.equal(captures[0][2],208);
 assert.strictEqual(captures[0][3],look);
 assert.strictEqual(captures[0][7].outfit,outfit);
 assert.strictEqual(captures[0][7].clothing,clothing);
 trail.draw(screen.ctx,g,{x:480,y:600},g.hero,.081,look,appearance);
 trail.draw(screen.ctx,g,{x:510,y:600},g.hero,.162,look,appearance);
 assert.equal(captures.length,3);
 const echoes=screen.log.filter(a=>a[0]==='drawImage');
 assert.ok(echoes.length>=2,'historic positions must appear as distinct motion echoes');
 for(const entry of echoes)
  assert.equal(entry[3]+208,600,'every ghost foot matches the real platform height');
 const streaks=screen.log.filter(a=>a[0]==='move');
 assert.ok(streaks.length>=6);
 assert.ok(streaks.every(a=>a[2]>=550&&a[2]<=600),'no streaks float near the head');
 assert.ok(screen.log.some(a=>a[0]==='ellipse'&&a[2]>585),'dust stays at foot level');
});
test('turning around clears old-direction ghosts, stopping leaves no trail',()=>{
 const trail=new V2SpeedTrail({makeCanvas:()=>createCanvas().canvas,paintHero:()=>{}});
 const screen=createCanvas(),look={},appearance={};
 const g=game(350);
 trail.draw(screen.ctx,g,{x:100,y:600},g.hero,0,look,appearance);
 trail.draw(screen.ctx,g,{x:125,y:600},g.hero,.08,look,appearance);
 assert.equal(trail.frames.length,2);
 g.hero.vx=-350;g.hero.face=-1;
 trail.draw(screen.ctx,g,{x:124,y:600},g.hero,.16,look,appearance);
 assert.equal(trail.frames.length,1,'right-facing afterimages must clear on a left turn');
 assert.equal(trail.direction,-1);
 g.hero.vx=0;
 assert.equal(trail.draw(screen.ctx,g,{x:124,y:600},g.hero,.2,look,appearance),false);
 assert.equal(trail.frames.length,0);
});
test('V2 hero renderer never mixes the mismatched atlas costumes',async()=>{
 const {readFile}=await import('node:fs/promises');
 const renderer=await readFile(new URL('../renderer.mjs',import.meta.url),'utf8');
 const app=await readFile(new URL('../app.mjs',import.meta.url),'utf8');
 assert.equal((renderer.match(/drawHero\(c,pos\.x,pos\.y/g)||[]).length,1);
 assert.ok(renderer.includes('this.v2SpeedTrail.draw('));
 assert.ok(!renderer.includes('approvedMotionSprites.draw('));
 assert.ok(!renderer.includes('v2GeneratedSprites.draw('));
 assert.ok(app.includes('renderer.v2VisualConsistency=true'));
 assert.ok(!app.includes("button.id='v2-sprite-toggle'"));
});
