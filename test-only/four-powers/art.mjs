import {drawEris,drawPowerWorld as baseWorld,drawPowerHero as baseHero} from '../../royale/power-art.mjs?four-base=1';
import {starterSuit} from '../../royale-v3-staging/starter-suit/engine.mjs';
import {costumeSprites} from '../../royale-v3-staging/costumes/engine.mjs';
import {kingJamesSprites} from '../../royale-v3-staging/kingjames/outfit-engine.mjs';
import {powerStats} from './powers.mjs';
export {drawEris};
let atlas,animals,ready=false,pending;
const image=url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Power artwork failed to load'));im.src=url.href;});
export async function prepareFourPowerArt(){
 if(ready)return true;if(pending)return pending;
 pending=(async()=>{
  const root=new URL('./assets/',import.meta.url);
  const [a,b,am,bm]=await Promise.all([image(new URL('animal-allies.png',root)),image(new URL('seismic-body.png',root)),fetch(new URL('animal-allies.json',root)).then(r=>r.json()),fetch(new URL('seismic-body.json',root)).then(r=>r.json())]);
  await starterSuit.preload();atlas=a;animals=am.animals;
  const m=starterSuit.manifest,start=m.frames.length;
  if(!m.animations.seismicSmash){starterSuit.images['four-slam']=b;m.frames.push(...bm.frames.map(f=>({...f,atlas:'four-slam'})));m.animations.seismicSmash={frames:[start,start+1,start+2,start+3],duration:.58,loop:false};}
  ready=true;return true;
 })();return pending;
}
export function legacyEffectView(game){return ['strength','superKick'].includes(game.hero.attack?.power)?{...game,hero:{...game.hero,attack:null}}:game;}
function registerSlam(m){if(m&&!m.animations.seismicSmash){const l=m.animations.land.frames,r=m.animations.recovery.frames;m.animations.seismicSmash={frames:[l[0],l[Math.min(1,l.length-1)],l.at(-1),r[0]],duration:.58,loop:false};}}
// Costumes keep their own authored whole-body crouch/landing frames and original
// face registration. The starter suit has four new complete two-fist frames.
export function drawSlamHero(c,game,pos,hero,costume){
 if(!hero.powerPose)return false;
 registerSlam(costumeSprites.outfits.get(costume?.id)?.manifest);
 registerSlam(costumeSprites.steel.outfits.get('steel-universal')?.manifest);
 registerSlam(kingJamesSprites.outfits.get('steel-universal')?.manifest);
 return false;
}
function stroke(c,points,color,width){c.strokeStyle=color;c.lineWidth=width;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function burst(c,x,y,r,color,alpha=1){c.save();c.globalAlpha*=alpha;c.translate(x,y);c.fillStyle=color;c.beginPath();for(let i=0;i<20;i++){const a=i*Math.PI/10,d=i%2?r*.35:r;c[i?'lineTo':'moveTo'](Math.cos(a)*d,Math.sin(a)*d);}c.closePath();c.fill();c.fillStyle='#ffffe6';c.beginPath();c.arc(0,0,r*.28,0,Math.PI*2);c.fill();c.restore();}
export function drawAnimal(c,f){
 if(!ready)return;
 const p=f.age,t=Math.min(1,Math.max(0,(p-.08)/(f.contact-.08))),endX=f.targetX-f.face*23;
 const x=f.x+(endX-f.x)*t;
 // Ground species keep their feet at the attacker's/target's actual floor.
 // An airborne summon follows the direct trajectory; Hawk has a distinct dive.
 let y=f.y+(f.targetY-f.y)*t;
 if(f.animal==='hawk')y-=Math.sin(Math.PI*t)*65+18;
 else if(f.animal==='wolf'||f.animal==='panther')y-=Math.sin(Math.PI*t)*11;
 const item=animals[f.animal],index=p<.10?0:p<f.contact?1:f.animal==='panther'&&p>=f.contact+.11?3:2,frame=item.frames[index];
 const fade=Math.min(1,p/.07,Math.max(0,(f.duration-p)/.11));
 c.save();c.globalAlpha*=fade;
 if(p<.18){c.strokeStyle='#9bff9f';c.lineWidth=2;c.beginPath();c.ellipse(f.x,f.y,10+p*140,4+p*20,0,0,Math.PI*2);c.stroke();}
 stroke(c,[[x-f.face*64,y-18],[x-f.face*25,y-18]],f.animal==='spirit-stag'?'#b1fff1':'#abff9f',3);
 c.translate(x,y);c.scale(f.face*item.worldScale,item.worldScale);c.drawImage(atlas,...frame.rect,-frame.anchor[0],-frame.anchor[1],frame.rect[2],frame.rect[3]);c.restore();
}
export function drawFourWorld(c,game){
 for(const f of game.powers.effects||[]){
  if(f.cancelled)continue;
  if(f.id==='animalAllies'){drawAnimal(c,f);continue;}
  if(f.id==='seismicSmash'&&f.age>=f.contact){
   const p=Math.min(1,(f.age-f.contact)/(f.duration-f.contact)),r=f.radius*Math.min(1,p/.44),alpha=1-p;
   c.save();c.translate(f.x,f.y);c.globalAlpha*=alpha;c.lineCap='round';
   // The outer shockwave ends at precisely the simulation's radius.
   for(const k of [1,.83]){c.strokeStyle=k===1?'#efffb0':'#b8ef52';c.lineWidth=k===1?3:1.5;c.beginPath();c.ellipse(0,0,r*k,r*.14*k,0,0,Math.PI*2);c.stroke();}
   const intensity=f.level/20;
   for(let i=0;i<6+Math.floor(intensity*5);i++){
    const a=i*2.39996,reach=r*(.52+(i%3)*.13),x=Math.cos(a)*reach,y=Math.sin(a)*reach*.13;
    stroke(c,[[0,0],[x*.42,y*.7],[x*.69,y-2],[x,y]],'#736239',1.5);
    if(p<.65){const lift=Math.sin(Math.PI*Math.min(1,p/.65))*(8+intensity*14);c.fillStyle=i%2?'#d6bf7f':'#6e6547';c.beginPath();c.moveTo(x-3,y-lift);c.lineTo(x,y-lift-4);c.lineTo(x+5,y-lift-1);c.lineTo(x+3,y-lift+3);c.closePath();c.fill();}
   }
   if(p<.5){
    c.save();c.scale(1,.5);burst(c,f.face*17,-10,24+intensity*30,'#ffe368',1-p/.5);c.restore();
    for(let i=0;i<5;i++){const x=(i-2)*(8+intensity*5);stroke(c,[[x*1.7,0],[x,-(10+intensity*28)*(1-p/.5)]],'#ffffb3',2+intensity);}
   }
   c.restore();
  }
  if(f.id==='impact'){
   const p=f.age/f.duration;c.save();c.globalAlpha*=1-p;
   burst(c,f.x,f.y,8+f.level*.35+p*8,f.power==='superKick'?'#9affee':'#ffe68b');
   if(f.level>=10)for(let i=0;i<3;i++){c.fillStyle='#ead6a5';c.beginPath();c.ellipse(f.x-f.face*i*9,f.ground-2-p*9,2+p*4,1+p*2,0,0,Math.PI*2);c.fill();}
   c.restore();
  }
 }
}
export function drawPowerWorld(c,game){baseWorld(c,game);drawFourWorld(c,game);}
export function drawPowerHero(c,game,pos,pose){
 const a=game.hero.attack,id=a?.power;
 baseHero(c,legacyEffectView(game),pos,pose);
 if(!['strength','superKick'].includes(id))return;
 const start=id==='strength'?.055:.10,active=id==='strength'?.105:.13;
 if(a.age<start||a.age>=start+active)return;
 const s=a.stats?.reach?a.stats:powerStats(id,a.stats?.level||game.powers.data.levels[id]||1),reach=s.reach,p=(a.age-start)/active,y=id==='strength'?-45:-29,r=10+Math.min(20,s.level)*.42;
 c.save();c.translate(pos.x,pos.y);c.scale(a.face,1);c.beginPath();c.rect(3,-71,reach,69);c.clip();c.globalAlpha*=1-p*.55;c.lineCap='round';
 const color=id==='strength'?'#ffdf69':'#8ff9eb';
 for(let i=0;i<4;i++)stroke(c,[[31-i*3,y+(i-1.5)*5],[reach+3-r*.7,y+(i-1.5)*3]],i===1?'#fffff1':color,i===1?4:2);
 if(id==='superKick'){c.strokeStyle=color;c.lineWidth=5;c.beginPath();c.ellipse(reach*.66,y,reach*.33,10,-.16,-1.1,1.1);c.stroke();}
 burst(c,reach+3-r*.75,y,r,color);c.restore();
}
export function artStatus(){return {ready,animals:animals?Object.keys(animals):[],starterSlam:!!starterSuit.manifest?.animations.seismicSmash};}
