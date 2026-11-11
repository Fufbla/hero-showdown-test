import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync}from'node:child_process';import{readFileSync}from'node:fs';import{createRequire}from'node:module';import{fileURLToPath}from'node:url';
import {spatialTarget} from '../spatial-navigation.mjs';
import {editText} from '../controller-entry.mjs';
import {NATURAL_SKIN_TONES,SKIN_UNDERTONES,hsvToHex,hexToHSV} from '../color-options.mjs';
import {cooldownFraction,updatePowerProgress} from '../compact-hud.mjs';
import {Game,decodeSave} from '../core.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../saves.mjs';
import {sanitizeLook,DEFAULT_LOOK} from '../appearance.mjs';
import {skinShade} from '../skin-color.mjs';
import {INTERFACE_BASE,INTERFACE_FILES} from './interface-preservation.mjs';
const rect=(x,y,w=44,h=44)=>({left:x,top:y,right:x+w,bottom:y+h});
test('four-direction geometry chooses corresponding grid neighbors regardless of DOM order',()=>{
 const items=[rect(60,60),rect(120,0),rect(0,120),rect(0,0),rect(60,0),rect(120,60),rect(0,60),rect(60,120)];const current=items[0];
 for(const [direction,index]of [['up',4],['down',7],['left',6],['right',5]])assert.equal(spatialTarget(current,items,direction,x=>x),items[index]);
});
test('irregular rectangles favor the aligned beam; layout changes are sampled anew; edges do not wrap',()=>{
 const a=rect(100,10,100,40),b=rect(95,100,130,80),c=rect(240,60);assert.equal(spatialTarget(a,[a,c,b],'down',x=>x),b);assert.equal(spatialTarget(a,[a,c,b],'up',x=>x),null);
 Object.assign(b,rect(120,-100));assert.equal(spatialTarget(a,[a,c,b],'up',x=>x),b);
});
test('same-row variable heights do not turn Down into horizontal movement',()=>{const a=rect(0,0,44,44),b=rect(60,0,44,48),c=rect(0,65);assert.equal(spatialTarget(a,[a,b,c],'down',x=>x),c);});
test('a scrolled grid returns to the row above before a fixed header, then exits at its edge',()=>{
 const a=rect(210,112,74,114),b=rect(210,-8,74,114),header=rect(210,50,90,44),group={contains:item=>item===a||item===b};a.closest=b.closest=()=>group;
 assert.equal(spatialTarget(a,[header,a,b],'up',x=>x),b);
 assert.equal(spatialTarget(b,[header,a,b],'up',x=>x),null);
 const right=rect(400,112);assert.equal(spatialTarget(a,[a,b,right],'right',x=>x),right);
});
test('virtual keyboard preserves edits, selection replacement, Unicode, shifting and maximum length',()=>{
 assert.deepEqual(editText('Chris','x',{start:1,end:4,shift:true}),{value:'CXs',caret:2});
 assert.equal(editText('A😀','Backspace').value,'A');assert.equal(editText('AB','Space').value,'AB ');assert.equal(editText('','Backspace').value,'');
 assert.equal(editText('AB','c',{maxLength:2}).value,'AB');assert.equal(editText('ABC','Backspace',{start:1,end:2}).value,'AC');
});
test('48 unique natural tones cover eight depths and six undertones; HSV spans fantasy colors',()=>{
 assert.equal(NATURAL_SKIN_TONES.length,48);assert.equal(new Set(NATURAL_SKIN_TONES.map(t=>t.color)).size,48);assert.equal(SKIN_UNDERTONES.length,6);
 for(const tone of [...NATURAL_SKIN_TONES,...['#000000','#ffffff','#00ff00','#0000ff','#8000ff'].map(color=>({color}))])assert.equal(hsvToHex(hexToHSV(tone.color)),tone.color);
});
test('all preset and arbitrary colors survive existing game and three-slot save codecs without affecting combat',()=>{
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const store=new LocalHeroStore(storage);let index=0;
 for(const skin of [...NATURAL_SKIN_TONES.map(t=>t.color),'#00ff00','#0000ff','#8000ff','#010203']){
  const g=new Game({look:{name:'Color Hero',skin}}),before=JSON.stringify(g.hero);assert.equal(decodeSave(g.save()).look.skin,skin);assert.equal(JSON.stringify(g.hero),before);
  const slot=index++%3;assert.equal(store.writeSlot(slot,g.save()).ok,true);assert.equal(new LocalHeroStore(storage).slot(slot).snapshot.look.skin,skin);
 }
 assert.equal(JSON.parse(map.get(PROFILE_KEY)).slots.length,3);
 for(const skin of ['#b97343','#a96943','#f5d6bb','#39251f'])assert.equal(sanitizeLook({skin}).skin,skin);
 assert.equal(sanitizeLook({skin:'invalid'}).skin,DEFAULT_LOOK.skin);
});
test('HUD progress reflects gameplay state and cannot mutate cooldown or ability balance',()=>{
 const g=new Game();g.powers.data.levels.fireball=1;g.powers.data.equipped[0]='fireball';assert.ok(g.powers.activate('fireball'));
 const b={style:{setProperty(k,v){this[k]=v}},dataset:{},getAttribute:()=> 'Fireball',classList:{contains:()=>false}},before=g.save();updatePowerProgress(b,0,g);
 assert.equal(b.dataset.powerState,'cooldown');assert.equal(b.style['--cooldown-remaining'],1);assert.equal(g.save(),before);assert.equal(cooldownFraction(2.5,5),.5);assert.equal(cooldownFraction(-1,5),0);assert.equal(cooldownFraction(8,5),1);
});
test('skin transfer preserves luminance detail for neutral, dark and fantasy targets',()=>{
 for(const target of [[20,20,20],[245,225,210],[30,180,70],[40,60,230]]){const dark=skinShade([90,55,32],target),light=skinShade([220,160,110],target);assert.ok(light.every((v,k)=>v>dark[k]));}
 assert.deepEqual(skinShade([185,115,67],[30,180,70]),[30,180,70]);
});
test('all account, multiplayer, source artwork, save and combat files are byte-identical to the independent branch baseline',()=>{
 const git=(...args)=>execFileSync('git',args,{cwd:new URL('../../',import.meta.url),encoding:'utf8'}).trim();
 const changed=git('diff','--name-only',INTERFACE_BASE).split('\n').filter(Boolean),added=git('ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
 assert.deepEqual([...changed,...added].filter(p=>!INTERFACE_FILES.has(p)),[]);
 assert.equal(git('diff','--name-only',INTERFACE_BASE,'--','royale/backend','royale/multiplayer','royale/assets','assets','index.html','royale/*account*','royale/cloud*','royale/*migration*','royale/*recovery*','royale/saves.mjs','royale/core.mjs','royale/powers.mjs','royale/equipment.mjs','royale/progression.mjs','royale/release-config.mjs'),'');
 const app=readFileSync(new URL('../app.mjs',import.meta.url),'utf8').replace('updateCompactSlots(canEdit,game);','updateCompactSlots(canEdit);').replace('  if(menuGamepad.consumePause)input.waitForNeutralPad=true;\n','');
 assert.equal(app.trimEnd(),git('show',INTERFACE_BASE+':royale/app.mjs'),'App changes are limited to HUD progress and modal controller input isolation');
});
test('approved resting-pose hands and arms recolor in place without changing original bitmap assets',async()=>{
 const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');const {prepareStyleCBody,drawSourceRest}=await import('../style-c-body.mjs');const {styleCDefault}=await import('../style-c-defaults.mjs');
 await prepareStyleCBody({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))});
 const m={sex:'male',box:[435,250,289,345],head:[632,383],shoulder:[631,439]};const l={...styleCDefault('male'),skin:'#00cc44'};const c=createCanvas(289,345),ctx=c.getContext('2d');ctx.translate(-435,-250);drawSourceRest(ctx,m,l,l);const px=ctx.getImageData(0,0,289,345).data;
 for(const [x,y] of [[145,207],[148,247],[267,236]]){const i=(y*289+x)*4;assert.ok(px[i+3]>0);assert.ok(px[i+1]>px[i]*1.5,`Exposed skin at ${x},${y} follows green skin`);}
});
