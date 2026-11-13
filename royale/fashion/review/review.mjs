// Local, account-free browser QA. Excluded from every normal release artifact.
import {costumeSprites} from '../engine.mjs';
import {FASHION_OUTFITS} from '../definitions.mjs';
import {COLLECTION} from '../catalog.mjs';
import {ClothingMenu} from '../../cosmetics/menu.mjs';
import {Game} from '../../core.mjs';
import {DEFAULT_LOOK} from '../../appearance.mjs';
import {motionHero} from '../../../royale-v3-staging/costumes/preview.mjs';
const look={...DEFAULT_LOOK,name:'Isolated preview',presentation:'female',hair:'braids',hairColor:'#291c20',skin:'#b4774b',facialHair:'none'};
const status=document.getElementById('status'),gallery=document.getElementById('gallery');
const cards=FASHION_OUTFITS.map(o=>{
 const card=document.createElement('article'),name=document.createElement('h2'),canvas=document.createElement('canvas');
 name.textContent=o.name;canvas.width=300;canvas.height=360;canvas.setAttribute('aria-label',o.name+' animation');
 card.append(name,canvas);gallery.append(card);return {...o,canvas,owner:{}};
});
let motion='idle',direction=1,paused=false,clock=0,last=performance.now();
for(const select of document.querySelectorAll('select[data-setting]'))select.onchange=()=>{
 const key=select.dataset.setting;
 if(key==='motion')motion=select.value;
 else if(key==='direction')direction=Number(select.value);
 else look[key]=select.value;
 game.look={...look};menu.draw();
};
document.getElementById('pause').onclick=event=>{paused=!paused;event.currentTarget.textContent=paused?'Play animations':'Pause animations';};
document.getElementById('store-open').onclick=()=>menu.open('store');
document.getElementById('owned-open').onclick=()=>menu.open('owned');
const game=new Game({look});game.hero.coins=5000;game.paused=true;game.treeVisit=true;
const menu=new ClothingMenu(document.getElementById('store'),{getGame:()=>game,transaction:async action=>action()});
await menu.open();
const ready=await Promise.all(FASHION_OUTFITS.map(o=>costumeSprites.preload(o.id)));
if(ready.some(value=>!value))throw Error(costumeSprites.error);
status.textContent=COLLECTION.length+' outfits • 6 additions • 116 complete poses each • no accounts or storage';
function paint(now){
 if(!paused)clock+=(now-last)/1000;last=now;
 for(const card of cards){
  const c=card.canvas.getContext('2d');c.clearRect(0,0,300,360);
  c.fillStyle='#d6cbbf';c.beginPath();c.ellipse(150,323,61,8,0,0,Math.PI*2);c.fill();
  costumeSprites.draw(c,150,320,look,motionHero(motion,clock,direction),clock,{id:card.id,owner:card.owner,scale:2.05});
 }
 requestAnimationFrame(paint);
}
requestAnimationFrame(paint);
