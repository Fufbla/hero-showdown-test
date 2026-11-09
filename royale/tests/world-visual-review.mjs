import {EnvironmentArt} from '../environment-art.mjs';
import {WORLD_REGIONS,regionSurfaces} from '../world.mjs';
import {LEGENDARY} from '../legendary-data.mjs';
import {drawLegendarySky} from '../legendary-art.mjs';
import {drawPortal} from '../portal-art.mjs';
const gallery=document.getElementById('gallery'),environments=new Map();let mode='regional',time=0,animating=false,last=0;
function panels(){gallery.replaceChildren();const items=mode==='regional'?WORLD_REGIONS:Object.values(LEGENDARY);for(const region of items){const fig=document.createElement('figure'),title=document.createElement('h2'),canvas=document.createElement('canvas');title.textContent=region.name;canvas.width=768;canvas.height=432;canvas.setAttribute('aria-label',region.name+' scenery');fig.append(title,canvas);fig.dataset.id=region.id;gallery.append(fig);}draw();}
function draw(){
 const camera=Number(document.getElementById('camera').value);let n=0;
 for(const fig of gallery.children){const canvas=fig.querySelector('canvas'),c=canvas.getContext('2d');c.setTransform(.6,0,0,.6,0,0);if(mode==='regional'){
  const region=WORLD_REGIONS.find(r=>r.id===Number(fig.dataset.id));let art=environments.get(region.id);if(!art){art=new EnvironmentArt();environments.set(region.id,art);}art.sky(c,region,1280,720,camera,0,time,false);
  c.save();c.translate(-camera,0);for(const surface of regionSurfaces(region.id))if(surface.x+surface.w>camera&&surface.x<camera+1280)art.surface(c,surface,region);drawPortal(c,camera+160,600,region.id,time,region.name);c.restore();
 }else{const id=fig.dataset.id;drawLegendarySky(c,{arenaScene:{legendary:id},time},1280,camera);drawPortal(c,160,600,6,time,LEGENDARY[id].name);}
 n++;
 }
 document.getElementById('status').textContent=`${n} actual scenery renderers · camera ${camera} · time ${time.toFixed(1)}s`;
}
document.getElementById('regional').onclick=()=>{mode='regional';panels();};document.getElementById('legendary').onclick=()=>{mode='legendary';panels();};document.getElementById('camera').onchange=draw;document.getElementById('time').onclick=()=>{time=time<2?4:0;document.getElementById('time').textContent=`Time: ${time} seconds`;draw();};document.getElementById('animate').onclick=()=>{animating=!animating;document.getElementById('animate').textContent=animating?'Stop animation':'Animate';};
function tick(now){if(animating){time+=Math.min(.1,(now-last)/1000);draw();}last=now;requestAnimationFrame(tick);}panels();requestAnimationFrame(tick);
