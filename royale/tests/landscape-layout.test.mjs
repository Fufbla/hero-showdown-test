import {POLISH_FILES} from './polish-preservation.mjs';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {landscapeLayout,stableTouchScale,installLandscapeLayout} from '../landscape-layout.mjs';
import {Renderer} from '../renderer.mjs';
for(const [w,h,touch,expected] of [[568,320,true,true],[667,375,true,true],[844,390,true,true],[932,430,true,true],[1024,768,true,true],[1366,768,false,false],[390,844,true,false]])test(`layout ${w}x${h}`,()=>assert.equal(landscapeLayout(w,h,touch),expected));
test('mobile renderer keeps sprite scale and camera state through rotation, toolbar resize and DPR changes',()=>{
 let rect={width:844,height:390};globalThis.window={innerWidth:844,innerHeight:390,devicePixelRatio:3,matchMedia:()=>({matches:true})};globalThis.document={body:{classList:{contains:()=>true}}};
 const r=Object.create(Renderer.prototype);r.canvas={getBoundingClientRect:()=>rect};r.camera=123;r.cameraY=456;r.resize();const scale=r.scale;
 for(const [w,h] of [[390,844],[844,350],[932,430],[844,390]]){window.innerWidth=w;window.innerHeight=h;rect={width:w,height:h};r.resize();assert.equal(r.scale,scale);assert.equal(r.width*r.scale,w);assert.ok(Math.abs(r.height*r.scale-h)<1e-8);assert.equal(r.canvas.width,w*2);assert.equal(r.camera,123);assert.equal(r.cameraY,456);}
 delete globalThis.window;delete globalThis.document;
});
test('scale uses short dimension, never stretches characters',()=>{assert.equal(stableTouchScale(390,844),stableTouchScale(844,390));assert.equal(stableTouchScale(100,100),.65);assert.equal(stableTouchScale(1024,768),1);});
test('orientation clears every input source once without touching game data',()=>{
 const events={};globalThis.window={innerWidth:844,innerHeight:390,matchMedia:()=>({matches:true}),addEventListener:(n,fn)=>events[n]=fn};globalThis.document={body:{classList:{contains:()=>true,toggle(){}}},querySelectorAll:()=>[]};let clears=0;
 const input={clear(){clears++},padHeld:new Set(['jump']),padPrevious:new Set(['jump']),padX:1,padY:1};installLandscapeLayout(input,()=>{});events.resize();assert.equal(clears,0);window.innerWidth=390;window.innerHeight=844;events.resize();assert.equal(clears,1);assert.equal(input.padHeld.size,0);assert.equal(input.padPrevious.size,0);assert.equal(input.padX,0);assert.ok(input.waitForNeutralPad);events.resize();assert.equal(clears,1);delete globalThis.window;delete globalThis.document;
});
test('all non-presentation game files stay byte-identical to integration baseline',()=>{
 const allowed=new Set(['tests/whirlwind-armor.test.mjs','tests/agility-armor.test.mjs','tests/super-kick-armor.test.mjs','tests/hero-preservation.mjs','tests/creature-integration-preservation.mjs','tests/world-ui-preservation.mjs','tests/speed-armor.test.mjs','tests/roots-armor.test.mjs','tests/strength-armor.test.mjs','app.mjs','index.html','renderer.mjs','boss-ui.mjs','landscape-layout.mjs','landscape.css','tests/power-armor-preservation.mjs','tests/armor-integration.test.mjs','tests/flight-armor.test.mjs','tests/landscape-layout.test.mjs','tests/landscape-review.html','tests/landscape-review.mjs','LANDSCAPE-REVIEW.md'].map(p=>'royale/'+p));
 const files=execFileSync('git',['diff','--name-only','cc288576d5ac8be67af0cacd750b1d026b24be7b'],{cwd:new URL('../../',import.meta.url),encoding:'utf8'}).trim().split('\n').filter(Boolean);assert.deepEqual(files.filter(p=>!allowed.has(p)&&!POLISH_FILES.has(p)),[]);
});

test('renderer changes are restricted to viewport sizing and the rest hint; creature drawing stays exact',()=>{
 const git=(ref)=>execFileSync('git',['show',ref+':royale/renderer.mjs'],{cwd:new URL('../../',import.meta.url),encoding:'utf8'});
 const normalize=s=>s.replace("import {drawBossShot} from './boss-effects.mjs';\n",'').replace('if(drawBossShot(c,shot,t))continue;','').replace("import {stableTouchScale} from './landscape-layout.mjs';\n",'').replace(/  resize\(\)\{[^\n]+\n/,'').replace('E / REST · heal & set checkpoint','REST · heal & set checkpoint');
 assert.equal(normalize(readFileSync(new URL('../renderer.mjs',import.meta.url),'utf8')),normalize(git('cc288576d5ac8be67af0cacd750b1d026b24be7b')));
});
