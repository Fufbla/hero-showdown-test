// Review-only composition of the unchanged gameplay renderers.
import {MonsterAtlas,MONSTER_HEIGHT} from '../monster-art.mjs';
import {MONSTER_ANIMATIONS} from '../monster-animation-catalog.mjs';
import {BossArt,BOSS_ART} from '../boss-art.mjs';
import {Renderer} from '../renderer.mjs';
import {makeBoss,arenaSurfaces} from '../bosses.mjs';
import {makeLegendary} from '../legendary-bosses.mjs';
import {BOSSES,BOSS_ATTACKS} from '../boss-data.mjs';
import {LEGENDARY,LEGENDARY_ATTACKS} from '../legendary-data.mjs';
export const ROSTER=[
 ...Object.entries(MONSTER_ANIMATIONS).map(([id,p])=>({id,key:'monster-'+id,kind:'monster',region:p.region,name:p.name})),
 ...Object.entries(BOSSES).map(([id,p])=>({id:Number(id),key:'regional-'+id,kind:'regional',region:Number(id),name:p.name})),
 ...Object.entries(LEGENDARY).map(([id,p])=>({id,key:'legendary-'+id,kind:'legendary',name:p.name})),
];
export function statesFor(item){
 if(item.kind==='monster')return ['idle','move','attack','hit','defeat'];
 const def=item.kind==='regional'?BOSSES[item.id]:LEGENDARY[item.id];
 return ['idle','move','hit','defeat',...new Set(def.patterns.flat())];
}
export function reviewEntity(item,state='idle',u=.3,face=1,phase=1){
 if(item.kind==='monster')return {id:0,type:item.id,x:0,prevX:0,y:0,prevY:0,w:55,h:MONSTER_HEIGHT[item.id],face,hp:100,maxHp:100,protection:0,
  state:state==='move'?'chase':state==='attack'?(u<1/3?'warn':u<2/3?'strike':'recover'):state==='defeat'?'dead':'idle',
  age:state==='attack'?(u<1/3?u*3*.38:u<2/3?(u-1/3)*3*.24:(u-2/3)*3*.23):0,
  walkCycle:u,flash:state==='hit'?.12*(1-u):0,deadAge:state==='defeat'?u*.54:0};
 const b=item.kind==='regional'?makeBoss(item.id,arenaSurfaces()[0]):makeLegendary(item.id,arenaSurfaces()[0]);
 Object.assign(b,{x:0,prevX:0,y:0,prevY:0,face,phase,state:'idle',age:0,flash:0,attack:null});
 if(state==='move')b.prevX=-1;
 else if(state==='hit')b.flash=.12*(1-u);
 else if(state==='defeat'){b.state='dead';b.age=u*.9;}
 else if(state!=='idle'){
  const def=(item.kind==='regional'?BOSS_ATTACKS:LEGENDARY_ATTACKS)[state];
  b.attack={...def,kind:state,targetX:face*150};
  b.state=u<1/3?'windup':u<2/3?'active':'recover';
  b.age=u<1/3?u*3*def.warning:u<2/3?(u-1/3)*3*def.duration:(u-2/3)*3*def.recovery;
 }
 return b;
}
export async function prepareCreature(item,{imageLoader,canvasFactory}={}){
 if(item.kind==='monster'){
  const atlas=new MonsterAtlas({loadImages:!imageLoader});
  if(imageLoader){const p=MONSTER_ANIMATIONS[item.id],image=await imageLoader(new URL('../assets/monsters/'+p.file,import.meta.url));atlas.sources.set(item.id,{image,promise:Promise.resolve(true)});}
  else if(!await atlas.load(item.id))throw Error('Missing monster atlas: '+item.name);
  if(!atlas.hasAnimation(item.id))throw Error('Animation unavailable: '+item.name);
  return {item,atlas,release:()=>atlas.destroy()};
 }
 const art=new BossArt({loadImages:true,spriteImageLoader:imageLoader,spriteCanvasFactory:canvasFactory,
  scorpionImageLoader:imageLoader?path=>imageLoader(new URL('../../'+path,import.meta.url)):undefined,scorpionCanvasFactory:canvasFactory});
 if(!await art.prepare(item.id))throw Error('Missing boss atlas: '+item.name);
 return {item,art,release:()=>{art.sprites.cache.clear();art.legendarySprites.cache.clear();art.regions.clear();}};
}
export function drawCreature(ctx,prepared,{state='idle',u=.3,face=1,phase=1,night=false,x=180,y=195,scale}={}){
 const {item,atlas,art}=prepared,b=reviewEntity(item,state,u,face,phase),before=JSON.stringify(b),time=u*1.5;
 ctx.save();ctx.translate(x,y);const s=scale??(item.kind==='monster'?Math.min(2.4,135/MONSTER_HEIGHT[item.id]):.7);ctx.scale(s,s);
 if(atlas)Renderer.prototype.enemy.call({c:ctx,monsterAtlas:atlas,night},b,time,1);
 else {art.step(b,time,0);art.draw(ctx,b,{time:time+.1,alpha:1});const info=art.inspect(b);if(!info.loaded||!info.redesigned||info.name!==BOSS_ART[item.id].name)throw Error('Wrong boss presentation: '+item.key);}
 ctx.restore();if(JSON.stringify(b)!==before)throw Error('Renderer mutated simulation: '+item.key);
}
export async function checkCreatures(makeCanvas,options={},progress=()=>{}){
 let checks=0;const details=[];
 for(const item of ROSTER){
  const prepared=await prepareCreature(item,options),canvas=makeCanvas(640,480),ctx=canvas.getContext('2d',{willReadFrequently:true});let draws=0;
  try{for(const phase of item.kind==='monster'?[1]:[1,2,3])for(const state of statesFor(item))for(const face of [-1,1])for(const u of [.05,.38,.72]){
   ctx.clearRect(0,0,640,480);drawCreature(ctx,prepared,{state,u,phase,face,x:320,y:380,scale:item.kind==='monster'?1.5:.8});
   const data=ctx.getImageData(0,0,640,480).data;let ink=0,edge=0;
   for(let i=3;i<data.length;i+=4)if(data[i]>16){ink++;const p=(i-3)/4,x=p%640,y=Math.floor(p/640);if(x===0||x===639||y===0||y===479)edge++;}
   if(ink<100)throw Error(`${item.key}/${state}: invisible sprite`);
   if(edge)throw Error(`${item.key}/${state}: clipped sprite`);
   checks+=3;draws++;
  }}finally{prepared.release();}
  details.push({key:item.key,name:item.name,draws});progress(details.length,checks);
 }
 return {passed:true,creatures:details.length,checks,details,scope:'Actual game renderers: transparent pixels, no clipping, immutable combat state, all phase attacks, two facings and three animation samples'};
}
