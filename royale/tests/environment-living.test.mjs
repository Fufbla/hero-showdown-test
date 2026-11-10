import test from 'node:test';
import assert from 'node:assert/strict';
import {drawPortal} from '../portal-art.mjs';
import {drawLegendarySky} from '../legendary-art.mjs';
import {LEGENDARY_IDS} from '../legendary-data.mjs';
import {EnvironmentArt} from '../environment-art.mjs';
import {paintHorizon,animateLivingWorld,LIVING_WORLD_THEMES} from '../environment-living.mjs';
function context(){
 const calls=[];return new Proxy({calls,canvas:{width:1536,height:900}}, {get(o,k){if(k in o)return o[k];if(k==='createLinearGradient'||k==='createRadialGradient')return ()=>({addColorStop(){}});return (...args)=>{for(const value of args)if(typeof value==='number')assert(Number.isFinite(value),`${String(k)} has non-finite coordinate`);calls.push([k,...args]);};},set(o,k,v){o[k]=v;return true;}});
}
test('all scenery themes animate deterministically without mutating world data',()=>{
 for(const theme of LIVING_WORLD_THEMES){const region=Object.freeze({id:LIVING_WORLD_THEMES.indexOf(theme)+1,theme,sky:Object.freeze(['#224455','#aabbcc'])});
 const first=context(),repeat=context(),later=context();animateLivingWorld(first,region,1280,720,2100,120,3,false);animateLivingWorld(repeat,region,1280,720,2100,120,3,false);animateLivingWorld(later,region,1280,720,2100,120,5,false);
 assert.deepEqual(first.calls,repeat.calls,theme+' is deterministic');assert.notDeepEqual(first.calls,later.calls,theme+' changes over time');assert(first.calls.length<350,theme+' has bounded path work');
 }
});
test('warm scenery renders allocate no canvases and scene cache stays bounded while traveling',t=>{
 let created=0;const document={createElement(){created++;return {width:0,height:0,getContext:()=>context()};}};t.mock.method(globalThis,'setTimeout',()=>{throw Error('Scenery cannot schedule independent timers');});
 const prior=globalThis.document;globalThis.document=document;
 try{const art=new EnvironmentArt(),c=context();for(const [i,theme] of LIVING_WORLD_THEMES.entries()){
  const region=Object.freeze({id:i+1,theme,sky:Object.freeze(['#224455','#aabbcc'])});art.sky(c,region,1280,720,0,0,0,false);const count=created;
  for(let tick=1;tick<5;tick++)art.sky(c,region,1280,720,tick*125,-tick*20,tick,false);
  assert.equal(created,count,'warm frame creates no textures');assert(art.scenes.size<=2,'old region textures are evicted');
 }}finally{if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
});

test('all portal themes and legendary skies animate with frozen inputs',()=>{
 for(let region=1;region<=7;region++){const a=context(),b=context();drawPortal(a,160,600,region,0);drawPortal(b,160,600,region,4);assert.notDeepEqual(a.calls,b.calls);}
 for(const id of LEGENDARY_IDS){const a=context(),b=context();drawLegendarySky(a,Object.freeze({arenaScene:Object.freeze({legendary:id}),time:0}),1280,2200);drawLegendarySky(b,Object.freeze({arenaScene:Object.freeze({legendary:id}),time:4}),1280,2200);assert.notDeepEqual(a.calls,b.calls,id+' has moving atmosphere');}
});

test('cached horizon ridges join continuously across the repeat boundary',()=>{
 const c=context();paintHorizon(c,'forest',false);const left=c.calls.filter(a=>a[0]==='lineTo'&&a[1]===0&&a[2]!==360),right=c.calls.filter(a=>a[0]==='lineTo'&&a[1]===768&&a[2]!==360);assert.equal(left.length,3);assert.equal(right.length,3);for(let i=0;i<3;i++)assert(Math.abs(left[i][2]-right[i][2])<1e-9,'ridge edges must share elevation');
});
