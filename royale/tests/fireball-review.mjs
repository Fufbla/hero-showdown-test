import {STRENGTH_SUITS,STRENGTH_PIECES} from '../strength-armor.mjs';
import {ROOTS_SUITS,ROOTS_PIECES} from '../roots-armor.mjs';
import {FIREBALL_SUITS,FIREBALL_PIECES} from '../power-armor.mjs';
import {COSTUME_PARTS} from '../costume-catalog.mjs';
import {STEEL_SUITS,STEEL_PIECES} from '../steel-armor.mjs';
import {drawArmorIcon} from '../power-armor-art.mjs';
import {drawHero} from '../hero-art.mjs';
import {previewHero} from '../hero-rig.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {equipmentOutfit,emptyInventory} from '../equipment.mjs';
import {inventoryFor} from './style-c-final-fixtures.mjs';
import {Game} from '../core.mjs';
import {PROFILE_KEY} from '../saves.mjs';
const $=id=>document.getElementById(id);
const collections={
  fireball:{suits:FIREBALL_SUITS,catalog:FIREBALL_PIECES,powerName:'Fireball',color:'red',number:'01'},
  steel:{suits:STEEL_SUITS,catalog:STEEL_PIECES,powerName:'Steel Body',color:'blue',number:'02'},
  strength:{suits:STRENGTH_SUITS,catalog:STRENGTH_PIECES,powerName:'Super Strength',color:'gold',number:'04'},
  roots:{suits:ROOTS_SUITS,catalog:ROOTS_PIECES,powerName:'Ground Roots',color:'green',number:'03'},
};
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
function inventory(s){return inventoryFor(parts(s).map(d=>d.id));}
function figure(c,x,y,sex,suit,scale){
 const look={...styleCDefault(sex),cape:$('cape').checked};
 drawHero(c,x,y,look,previewHero('idle',0),0,scale,{view:$('view').value,outfit:equipmentOutfit(inventory(suit))});
}
function details(){
 const suit=selected;
 $('title').textContent=suit.level+'  /  '+suit.name;
 const c=$('parts').getContext('2d');c.clearRect(0,0,680,240);
 parts(suit).forEach((piece,i)=>{c.save();c.translate(20+220*i,10);drawArmorIcon(c,piece,190);c.restore();c.fillStyle='#463d36';c.textAlign='center';c.font='16px system-ui';c.fillText(piece.part+' · '+piece.catalogValue.toLocaleString()+' coins',115+220*i,224);});
 const pair=$('pair').getContext('2d');pair.clearRect(0,0,680,240);figure(pair,160,220,'male',suit,1.70);figure(pair,490,220,'female',suit,1.70);
 $('spec').textContent=suit.price.toLocaleString()+' coins for three pieces. Full matching set grants +'+bonus(suit)+' effective '+powerName+' levels. '+(power!=='fireball'?'Remove any piece to lose the set bonus.':'Helmet and boots each add 1 damage, chest armor adds 2.');
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
 const suit=selected,session=power+'-practice-'+Date.now(),stamp=new Date().toISOString();
 const g=new Game({look:styleCDefault($('sex').value)});g.hero.level=suit.level;g.hero.maxHp=g.hero.hp=100+15*(suit.level-1);
 g.powers.data.levels[power]=Math.min(suit.level-1,20);g.powers.data.points=suit.level-1-g.powers.data.levels[power];
 g.powers.data.equipped=[power,null,null];g.inventory=owned?inventory(suit):emptyInventory();g.hero.coins=suit.price;
 g.refreshEquipment();if(!owned)g.visitTree();
 sessionStorage.setItem('royale-test-'+session+':'+PROFILE_KEY,JSON.stringify({version:2,revision:0,activeSlot:0,legacyImported:true,slots:[{id:session,createdAt:stamp,updatedAt:stamp,lastRegion:'Coastal Beginnings',snapshot:JSON.parse(g.save())},null,null]}));
 location.href='../index.html?qa=1&testSession='+session;
}
if(await prepareStyleCMaterials()){
 for(const id of ['sex','view','cape'])$(id).onchange=repaint;
 $('play').onclick=()=>patrol(true);$('shop').onclick=()=>patrol(false);$('play').disabled=$('shop').disabled=false;repaint();
}else $('title').textContent='The armor artwork could not load. Reload to retry.';
