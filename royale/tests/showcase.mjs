import {Game} from '../core.mjs';
import {WORLD_REGIONS,TYPES} from '../world.mjs';
import {EnvironmentArt} from '../environment-art.mjs';
import {drawMonsterSprite,MONSTER_HEIGHT} from '../monster-art.mjs';
import {drawHero} from '../hero-art.mjs';
import {previewHero} from '../hero-rig.mjs';
import {CapeCloth} from '../cape.mjs';
import {LEGENDARY_IDS,LEGENDARY,MERGE_CATALOG} from '../legendary-data.mjs';
import {BOSSES} from '../boss-data.mjs';
import {BossArt} from '../boss-art.mjs';
import {makeBoss,arenaSurfaces} from '../bosses.mjs';
import {makeLegendary} from '../legendary-bosses.mjs';
const $=id=>document.getElementById(id),dynamic=[];
function card(parent,label,w=360,h=320){const figure=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');canvas.width=w;canvas.height=h;canvas.setAttribute('aria-label',label);caption.textContent=label;figure.append(canvas,caption);$(parent).append(figure);return canvas;}
function floor(c,w,h){c.clearRect(0,0,w,h);c.fillStyle='#c1dbc429';c.beginPath();c.ellipse(w/2,h-27,w*.23,7,0,0,Math.PI*2);c.fill();}
for(const region of WORLD_REGIONS){
 const g=new Game();g.travel(region.id);const canvas=card('regions',`${region.id}. ${region.name} · recommended ${region.levels.join('–')} · first climbing circuit (one of three)`,1164,510),c=canvas.getContext('2d'),art=new EnvironmentArt(),scale=.6;
 c.scale(scale,scale);art.sky(c,region,1940,850,0,-120,0,false);c.translate(0,120);
 for(const s of g.surfaces)if(s.x<1940)art.surface(c,s,region);
 for(const e of g.enemies)if(e.x<1940){c.save();c.translate(e.x,e.y);drawMonsterSprite(c,e,0,false);c.restore();c.fillStyle='#172b38';c.fillRect(e.x-24,e.y-(MONSTER_HEIGHT[e.type]||e.h)-10,48,5);c.fillStyle='#c5dc99';c.fillRect(e.x-23,e.y-(MONSTER_HEIGHT[e.type]||e.h)-9,46,3);}
 drawHero(c,160,600,g.look,previewHero('idle',0),0,1.1);c.fillStyle='#fff1c5';c.font='bold 18px system-ui';c.fillText('GROUND · Safe checkpoint / portal',45,655);
}
for(const [type,info] of Object.entries(TYPES)){
 const canvas=card('monsters',`${info.name} · ${info.behavior}`,320,280),c=canvas.getContext('2d');dynamic.push(t=>{floor(c,320,280);c.save();c.translate(160,250);c.scale(1.8,1.8);drawMonsterSprite(c,{type,id:0,face:1,state:t%4>2.5?'strike':'patrol',age:(t%4-2.5)% .28},t,false);c.restore();});
}
for(const [i,build] of['slender','balanced','strong','full'].entries()){
 const canvas=card('heroes',`${build} · ${['teen','young','older','young'][i]} · unchanged combat hitbox`,360,340),c=canvas.getContext('2d'),cloth=new CapeCloth();dynamic.push(t=>{floor(c,360,340);drawHero(c,174,307,{build,presentation:i%2?'female':'male',age:['teen','young','older','young'][i],hair:['short','braids','locs','waves'][i],skin:['#f4cda4','#bd845f','#81533d','#dcab83'][i],suit:'#315c7a',trim:'#e7c77e',cape:true},previewHero(t%6<3?'idle':'run',t),t,2.1,{cloth,dt:1/60});});
}
for(const [i,id] of LEGENDARY_IDS.entries()){
 const canvas=card('merges',`${LEGENDARY[id].name} · provisional costume motifs`,360,340),c=canvas.getContext('2d'),outfit={pieces:Object.fromEntries(['helmet','chest','boots'].map(part=>[part,MERGE_CATALOG[`merge-${id}-${part}`]]))};dynamic.push(t=>{floor(c,360,340);drawHero(c,180,307,{presentation:i%2?'female':'male',hair:i%2?'waves':'locs',skin:i%3?'#bd845f':'#81533d',build:i%2?'slender':'strong',cape:true},previewHero('idle',t),t,2.1,{outfit,view:$('merge-view').value});});
}
let animate=false,last=0;const paint=t=>dynamic.forEach(draw=>draw(t));paint(.2);
$('animate').onclick=()=>{animate=!animate;$('animate').textContent=animate?'Freeze artwork':'Animate artwork';if(animate)requestAnimationFrame(frame);};$('merge-view').onchange=()=>paint(last||.2);
function frame(now){if(!animate)return;last=now/1000;paint(last);requestAnimationFrame(frame);}
// Decode sequentially and rasterize cards once; never keep 15 animated atlas caches.
async function bosses(){const art=new BossArt();for(const [key,d] of [...Object.entries(BOSSES).map(([id,d])=>[Number(id),d]),...LEGENDARY_IDS.map(id=>[id,LEGENDARY[id]])]){
 const canvas=card('boss-grid',`${d.name}${typeof key==='string'?' · Legendary':''}${d.art==='temporary'?' · TEMPORARY ART':''}`,460,390),c=canvas.getContext('2d'),b=typeof key==='number'?makeBoss(key,arenaSurfaces()[0]):makeLegendary(key,arenaSurfaces()[0]);
 b.x=b.prevX=230;b.y=b.prevY=365;art.step(b,.25,1/60,100);await art.whenLoaded;floor(c,460,390);art.draw(c,b,{time:.3,alpha:1});
 }document.body.dataset.artReady='true';}
bosses().catch(e=>{const p=document.createElement('p');p.textContent='Artwork loading issue: '+e.message;$('boss-grid').append(p);});
