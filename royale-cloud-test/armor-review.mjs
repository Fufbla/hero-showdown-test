import {COSTUME_PARTS} from './costume-catalog.mjs';
import {drawArmorIcon} from './power-armor-art.mjs';
import {drawHero} from './hero-art.mjs';
import {PREVIEW_POSES,previewHero} from './hero-rig.mjs';
import {prepareStyleCMaterials} from './style-c-materials.mjs';
import {styleCDefault} from './style-c-defaults.mjs';
import {equipmentOutfit} from './equipment.mjs';
import {LOOK_OPTIONS,HAIR_STYLES} from './appearance.mjs';
import {powerStats} from './powers.mjs';
import {ARMOR_COLLECTIONS,reviewInventory,reviewProfile,reviewSessionId} from './armor-review-data.mjs';
const $=id=>document.getElementById(id);
const collections=ARMOR_COLLECTIONS;
const requested=new URLSearchParams(location.search).get('collection');
const power=Object.hasOwn(collections,requested)?requested:'fireball';
const {suits,catalog,powerName,color,number}=collections[power];
const bonus=suit=>suit[power+'Levels'];
document.documentElement.classList.add(power);
document.title=powerName+' Power Armor · James Clan Comics';
document.querySelector('h1').textContent=powerName+' Power Armor';
document.querySelector('header small').textContent='JAMES CLAN COMICS  /  ARMORY '+number;
document.querySelector('header p').textContent='Nine '+color+' suits for the Guardian and Sentinel. Choose a tier to inspect its armor or start a patrol.';
let selected=suits[0];
function parts(s){return COSTUME_PARTS.map(part=>catalog[s.setId+'-'+part]);}
function inventory(s){return reviewInventory(s);}
let clock=0;
function chosenLook(sex){const look={...styleCDefault(sex),cape:$('cape').checked};return sex===$('sex').value?{...look,build:$('build').value,hair:$('hair').value,skin:$('skin').value,face:$('face').value}:look;}
function figure(c,x,y,sex,suit,scale){
 const look=chosenLook(sex);
 drawHero(c,x,y,look,previewHero($('pose').value,clock),clock,scale,{view:$('view').value,outfit:equipmentOutfit(inventory(suit))});
}
function details(){
 const suit=selected;
 $('title').textContent=suit.level+'  /  '+suit.name;
 const c=$('parts').getContext('2d');c.clearRect(0,0,680,240);
 parts(suit).forEach((piece,i)=>{c.save();c.translate(20+220*i,10);drawArmorIcon(c,piece,190);c.restore();c.fillStyle='#463d36';c.textAlign='center';c.font='16px system-ui';c.fillText(piece.part+' · '+piece.catalogValue.toLocaleString()+' coins',115+220*i,224);});
 const pair=$('pair').getContext('2d');pair.clearRect(0,0,680,240);figure(pair,160,220,'male',suit,1.70);figure(pair,490,220,'female',suit,1.70);
 $('spec').textContent=suit.price.toLocaleString()+' coins for three pieces. Full matching set grants +'+bonus(suit)+' effective '+powerName+' levels. '+(power!=='fireball'?'Remove any piece to lose the set bonus.':'Helmet and boots each add 1 damage, chest armor adds 2.');
 const stats=powerStats(power,20,{heroLevel:99,equipment:{[power+'Levels']:bonus(suit),fireball:power==='fireball'?4:0}}),base=powerStats(power,20,{heroLevel:99});
 $('stats').replaceChildren();for(const [key,value] of Object.entries(stats)){const tr=document.createElement('tr');for(const val of [key,base[key],value]){const td=document.createElement('td');td.textContent=typeof val==='number'?Number(val.toFixed(2)):String(val);tr.append(td);}$('stats').append(tr);}
 for(const b of $('tiers').children)b.setAttribute('aria-pressed',b.dataset.id===suit.setId);
}
function repaint(){
 $('tiers').replaceChildren();
 for(const s of suits){
  const b=document.createElement('button');b.className='tier';b.dataset.id=s.setId;
  const c=Object.assign(document.createElement('canvas'),{width:180,height:190}),title=document.createElement('b'),lv=document.createElement('span');
  figure(c.getContext('2d'),98,177,$('sex').value,s,1.35);
  title.textContent=s.name;lv.textContent='Lv '+s.level+'  /  +'+bonus(s);
  b.append(c,title,lv);b.onclick=()=>{selected=s;details();};$('tiers').append(b);
 }
 details();
}
function patrol(owned){
 const session=reviewSessionId();
 const r=reviewProfile(power,suits.indexOf(selected),chosenLook($('sex').value),owned,session);
 sessionStorage.setItem(r.key,JSON.stringify(r.profile));location.href=r.url;
}
for(const [id,values] of [['build',LOOK_OPTIONS.build],['hair',HAIR_STYLES],['face',LOOK_OPTIONS.face],['pose',PREVIEW_POSES]]){
 for(const value of values){const o=document.createElement('option');o.value=o.textContent=value;$(id).append(o);}
}
function defaults(){const look=styleCDefault($('sex').value);for(const id of ['build','hair','skin','face'])$(id).value=look[id];}
defaults();
if(await prepareStyleCMaterials()){
 for(const id of ['sex','view','cape','build','hair','skin','face','pose'])$(id).onchange=()=>{if(id==='sex')defaults();repaint();};
 $('play').onclick=()=>patrol(true);$('shop').onclick=()=>patrol(false);$('play').disabled=$('shop').disabled=false;repaint();
 const animate=t=>{clock=t/1000;if(!document.hidden){const c=$('pair').getContext('2d');c.clearRect(0,0,680,240);figure(c,160,220,'male',selected,1.7);figure(c,490,220,'female',selected,1.7);const game=$('scale').getContext('2d');game.clearRect(0,0,680,180);figure(game,170,160,'male',selected,1);figure(game,500,160,'female',selected,1);}requestAnimationFrame(animate);};requestAnimationFrame(animate);
}else $('title').textContent='The armor artwork could not load. Reload to retry.';
