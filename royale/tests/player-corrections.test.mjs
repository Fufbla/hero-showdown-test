import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../core.mjs';
import {TYPES} from '../world.mjs';
import {isOmittedEyelidSkin} from '../style-c-face.mjs';
import {HAIR_FIT_CORRECTIONS} from '../hair-fit-corrections.mjs';
const ready=()=>{const g=new Game();g.hero.x=1000;g.hero.invulnerable=0;return g;};
test('three independent valid strikes land once each; a new strike from the same enemy remains eligible',()=>{
 const g=ready(),sources=[0,1,2].map(id=>({id,type:'bottle',damageEvent:{}}));
 for(const e of sources)assert.equal(g.hurt(5,1000,e),true);
 assert.equal(g.hero.hp,85);
 for(const e of sources)assert.equal(g.hurt(5,1000,e),false);
 sources[0].damageEvent={};assert.equal(g.hurt(5,1000,sources[0]),true);assert.equal(g.hero.hp,80);
});
test('respawn protection and each source recovery remain effective',()=>{
 const g=ready(),a={id:1,boss:true,attack:{}},b={id:2,boss:true,attack:{}};g.hero.invulnerable=2;
 assert.equal(g.hurt(5,1000,a),false);g.hero.invulnerable=0;
 assert.equal(g.hurt(5,1000,a),true);assert.equal(g.hurt(5,1000,a),false);assert.equal(g.hurt(5,1000,b),true);
 g.time+=1.1;assert.equal(g.hurt(5,1000,a),true);
});
for(const face of [-1,1])for(const type of ['crawler','slime','bottle','titan'])test(`horizontal Fireball contacts ${type} facing ${face}`,()=>{
 const g=ready();g.hero.face=face;g.hero.y=320;g.powers.data.levels.fireball=1;g.powers.data.equipped[0]='fireball';
 const info=TYPES[type];assert.ok(info);const e=g.makeEnemy(type,1000+face*90,'sand-a',50);e.y=320;e.x=1000+face*90;e.protection=0;g.enemies=[e];g.surfaces=[];
 const hp=e.hp;assert.equal(g.powers.activate('fireball'),true);for(let i=0;i<25;i++)g.powers.step(1/60);
 assert.ok(e.hp<hp);assert.equal(g.powers.cooldowns.fireball>0,true);
});
test('eyelid mask repair excludes whites, pupils, iris and eyebrow channels',()=>{
 assert.equal(isOmittedEyelidSkin([168,97,44,255],0,[0,0,0,255]),true);
 for(const pixel of [[255,255,255,255],[14,1,0,255]])assert.equal(isOmittedEyelidSkin(pixel,0,[0,0,0,255]),false);
 for(const mask of [[0,255,0,255],[0,0,255,255]])assert.equal(isOmittedEyelidSkin([168,97,44,255],0,mask),false);
});
test('only the three reported front plates receive orientation corrections',()=>{
 assert.deepEqual(Object.keys(HAIR_FIT_CORRECTIONS),['buzz','high-top','curly-fade']);
 for(const fit of Object.values(HAIR_FIT_CORRECTIONS)){assert.equal(fit.front.mirror,true);assert.ok(fit.front.x>0);assert.equal(fit.side,undefined);assert.equal(fit.back,undefined);}
});
test('creator is idle-only; item stats remain visible; multiplayer stays disabled',()=>{
 const read=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
 assert.ok(!read('index.html').includes('id="preview-pose"'));assert.ok(read('creator.mjs').includes("previewHero('idle',time)"));
 assert.ok(read('world-ui.css').includes('.equipment-card>div>p{display:block;'));assert.match(read('release-config.mjs'),/MULTIPLAYER_ENABLED\s*=\s*false/);
});

test('all sample skin palettes recolor omitted eyelid skin while keeping eye and brow pixels exact for both heroes',async()=>{
 const {createRequire}=await import('node:module'),{fileURLToPath}=await import('node:url');
 const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
 const {prepareStyleCFace,drawStyleCFace,STYLE_C_FACE_ANCHORS}=await import('../style-c-face.mjs');
 const {styleCDefault}=await import('../style-c-defaults.mjs');
 await prepareStyleCFace({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))});
 for(const sex of ['male','female']){
  const model=STYLE_C_FACE_ANCHORS[sex],w=model.size[0]*2,h=model.size[1]*2;
  const source=await loadImage(fileURLToPath(new URL(`../assets/hero/style-c-accurate/face/${sex}.png`,import.meta.url))),atlas=createCanvas(w*3,h*3),a=atlas.getContext('2d');a.drawImage(source,0,0);
  const raw=a.getImageData(0,0,w,h).data,mask=a.getImageData(w*2,0,w,h).data;
  const draw=skin=>{const canvas=createCanvas(w,h),c=canvas.getContext('2d');drawStyleCFace(c,{...styleCDefault(sex),skin},{center:model.center.map((v,i)=>(v-model.origin[i])*2),scale:2});return c.getImageData(0,0,w,h).data;};
  const original=draw(styleCDefault(sex).skin);
  for(const skin of ['#f5d6bb','#d6a27b','#f3d76d','#91562f','#633d2b','#39251f']){
   const changed=draw(skin);let protectedCount=0,changedSkin=0;
   for(let i=0;i<raw.length;i+=4){
    if(raw[i+3]<250)continue;
    if(mask[i]===0&&(mask[i+1]>240||mask[i+2]>240)){
      assert.deepEqual([...changed.slice(i,i+3)],[...original.slice(i,i+3)]);protectedCount++;
    }
    if(isOmittedEyelidSkin(raw,i,mask)&&changed.slice(i,i+3).some((v,k)=>v!==original[i+k]))changedSkin++;
   }
   assert.ok(protectedCount>100);assert.ok(changedSkin>100,sex+' '+skin);
  }
 }
});

test('three actual monster strike windows damage the hero in the same simulation tick',()=>{
 const g=ready();g.hero.y=600;g.enemies=[0,1,2].map(id=>{const e=g.makeEnemy('bottle',1005,'sand-a',id);Object.assign(e,{x:1005,spawnX:1005,face:-1,state:'warn',age:1,protection:0});return e;});
 for(let i=0;i<6;i++)g.step(1/60);
 assert.equal(g.hero.hp,85);for(let i=0;i<6;i++)g.step(1/60);assert.equal(g.hero.hp,85);
});
test('Steel Body still reduces each independent hit and blocks knockback',()=>{
 const g=ready();g.powers.data.levels.steel=20;g.powers.data.equipped[0]='steel';assert.ok(g.powers.activate('steel'));g.hero.vx=0;
 for(let id=0;id<3;id++)assert.ok(g.hurt(8,900,{id,type:'bottle',damageEvent:{}}));
 assert.equal(g.hero.hp,94);assert.equal(g.hero.vx,0);assert.equal(g.hero.stun,0);
});

test('asynchronous menu exits require neutral controller input before gameplay',()=>{const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');assert.match(app,/if\(next==='play'&&screen!=='play'\)input.waitForNeutralPad=true/);});
