import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {HERO_MATERIALS} from '../assets/hero/material-data.mjs';
import {DEFAULT_LOOK,LOOK_OPTIONS,LOOK_RANGES,sanitizeLook} from '../appearance.mjs';
import {poseFor,previewHero,dimensions,PREVIEW_POSES} from '../hero-rig.mjs';
import {dimensions as originalDimensions} from './hero-before-rig.mjs';
import {Game,STEP,ATTACKS} from '../core.mjs';
import {assertHeroPresentationOnly,HERO_BASE} from './hero-preservation.mjs';
const near=(a,b,t=.001)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);

test('hero stage preserves the complete verified integration outside authorized presentation files',()=>assertHeroPresentationOnly());
for(const part of Object.keys(HERO_MATERIALS.parts))test(`hero authored ${part}: bounded independent RGBA material`,()=>{
 const data=readFileSync(new URL('../assets/hero/ink-materials.png',import.meta.url)),[x,y,w,h]=HERO_MATERIALS.parts[part];
 assert.equal(data[25],6);assert.equal(data.readUInt32BE(16),HERO_MATERIALS.width);assert.equal(data.readUInt32BE(20),HERO_MATERIALS.height);assert.ok(w>100&&h>150);assert.ok(x>=0&&y>=0&&x+w<=HERO_MATERIALS.width&&y+h<=HERO_MATERIALS.height);
 for(const [other,r] of Object.entries(HERO_MATERIALS.parts))if(part!==other)assert.ok(x+w<=r[0]||r[0]+r[2]<=x||y+h<=r[1]||r[1]+r[3]<=y,`${part} overlaps ${other}`);
});
test('before-and-after fixture is the actual approved baseline with only import relocation',()=>{
 const git=(...a)=>execFileSync('git',a,{cwd:new URL('../../',import.meta.url),encoding:'utf8'});
 for(const kind of ['art','rig']){let original=git('show',`${HERO_BASE}:royale/hero-${kind}.mjs`).replaceAll("from './","from '../");if(kind==='art')original=original.replace("from '../hero-rig.mjs'","from './hero-before-rig.mjs'");const fixture=readFileSync(new URL(`./hero-before-${kind}.mjs`,import.meta.url),'utf8').split('\n').slice(1).join('\n');assert.equal(fixture,original);}
});
for(const build of LOOK_OPTIONS.build)test(`hero ${build}: all existing dimension sliders retain their original values and scale`,()=>{
 for(let bits=0;bits<64;bits++){const l={build};Object.entries(LOOK_RANGES).forEach(([key,range],i)=>l[key]=range[(bits>>i)&1]);assert.deepEqual(dimensions(l),originalDimensions(l));}
});
test('planted feet cancel actual world travel through walk and run stance phases',()=>{
 for(const build of LOOK_OPTIONS.build)for(const speed of [185,315])for(let t=.01;t<.8;t+=.007){
  const look={build},d=dimensions(look),stride=d.leg*(speed===185?.26:.46),period=stride*4,dt=.0001,phase=t*speed/period%1;
  const make=q=>({...previewHero(speed===185?'walk':'run',q),vx:speed,cycle:q*speed/52});const a=poseFor(look,make(t),t),b=poseFor(look,make(t+dt),t+dt);
  for(let i=0;i<2;i++)if((phase+i*.5)%1<.49){near(b.legs[i][2][0]-a.legs[i][2][0],-speed*dt,.00001);near(a.legs[i][2][1],-5);}
 }
});
test('alternating punches retain the exact existing active contact and attack definition',()=>{
 const g=new Game();g.enemies=[];const defs=JSON.stringify(ATTACKS);const sides=[];
 for(let i=0;i<4;i++){g.hero.cooldown=0;g.hero.attack=null;g.startAttack('punch');g.hero.attack.age=ATTACKS.punch.startup+.02;const before=JSON.stringify(g.hero),p=poseFor(g.look,g.hero,i);
  near(p.arms[0][2][0],54);near(p.arms[0][2][1],-54);sides.push(p.alternate);assert.equal(JSON.stringify(g.hero),before);
 }assert.deepEqual(sides,[false,true,false,true]);assert.equal(JSON.stringify(ATTACKS),defs);
});
test('basic kicks chamber, extend on the original active window, retract and settle',()=>{
 const def=ATTACKS.kick,at=t=>poseFor(DEFAULT_LOOK,{...previewHero('idle',0),attack:{kind:'kick',age:t,face:1}},0);
 const chamber=at(def.startup*.45),impact=at(def.startup+.02),retract=at(def.startup+def.active+(def.duration-def.startup-def.active)*.72);
 assert.ok(chamber.legs[0][2][1]<-20);assert.ok(chamber.legs[0][2][0]<25);near(impact.legs[0][2][0],56);near(impact.legs[0][2][1],-39);assert.ok(retract.legs[0][2][0]<30);assert.ok(retract.legs[0][2][1]<-15);
});
test('Super Kick combinations retain their own twist and all original power markers',()=>{
 const h=previewHero('superKick',ATTACKS.kick.startup+.02),before=JSON.stringify(h);h.attack.comboIndex=0;const first=poseFor(DEFAULT_LOOK,h,0);h.attack.comboIndex=1;const second=poseFor(DEFAULT_LOOK,h,0);assert.ok(first.twist>0&&second.twist<0);near(first.legs[0][2][0],56);near(second.legs[0][2][0],56);assert.equal(h.attack.power,'superKick');
});
for(const state of PREVIEW_POSES)test(`hero ${state}: rendering pose is finite and never changes simulation state`,()=>{
 for(const build of LOOK_OPTIONS.build)for(const face of [-1,1])for(const t of [.01,.1,.22,.48,.85]){const look=sanitizeLook({build}),h=previewHero(state,t);h.face=face;if(h.attack)Object.freeze(h.attack);Object.freeze(h);const before=JSON.stringify(h),p=poseFor(look,h,t);assert.equal(JSON.stringify(h),before);for(const point of [...p.arms.flat(),...p.legs.flat(),p.head,...p.cape])assert.ok(point.every(Number.isFinite));}
});
test('normal and aerial combat keep original attack-box coordinates while poses animate',()=>{
 const g=new Game();g.enemies=[];for(const grounded of [true,false])for(const kind of ['punch','kick']){g.hero.grounded=grounded;g.hero.attack=null;g.hero.cooldown=0;g.startAttack(kind);for(let n=0;n<12;n++){const before=[g.heroBox(),g.attackBox(),g.save()],h=structuredClone(g.hero);poseFor(g.look,h,g.time);assert.deepEqual([g.heroBox(),g.attackBox(),g.save()],before);g.step(STEP);}}
});
