// Isolated art review: actual Creator controls, no Game/Store/account startup.
import {Creator} from '../../royale/creator.mjs';
import {prepareReleaseArt,drawHero} from '../../royale/release-src/presentation.mjs';
import {styleCDefault} from '../../royale/style-c-defaults.mjs';
import {previewHero} from '../../royale/hero-rig.mjs';
import {starterSuit} from './engine.mjs';
import {STARTER_OUTFIT} from '../../royale/appearance.mjs';
const $=id=>document.getElementById(id);
const looks=[
 {suit:'#2445af',trim:'#ffc044',emblem:'star',emblemColor:'#ffffff',cape:true,capeColor:'#a10d35',hair:'waves'},
 {suit:'#c72036',trim:'#252525',emblem:'bolt',emblemColor:'#ffd44d',cape:false,capeColor:'#004444',hair:'curls'},
 {suit:'#087c54',trim:'#ffe7be',emblem:'leaf',emblemColor:'#ffd44d',cape:true,capeColor:'#652183',hair:'braids',presentation:'female'},
 {suit:'#792899',trim:'#00625c',emblem:'shield',emblemColor:'#ffffff',cape:true,capeColor:'#00c4bd',hair:'short',presentation:'female'}
];
const states=['idle','run','jump','double-jump','punch','kick'];
let index=0,animation=0;
await prepareReleaseArt();
const creator=new Creator();
function example(){creator.fill({...styleCDefault('male'),...looks[index],name:'Suit Preview '+String.fromCharCode(65+index)},STARTER_OUTFIT,true,null);creator.tab('suit');}
example();
$('begin').type='button';$('begin').textContent='Animation: Idle';$('begin').onclick=()=>{animation=(animation+1)%states.length;$('begin').textContent='Animation: '+states[animation];};
$('cancel-look').textContent='Next color example';$('cancel-look').onclick=()=>{index=(index+1)%looks.length;example();};
$('creator-form').onsubmit=e=>e.preventDefault();
$('creator-slot').textContent='UNIVERSAL SUIT PREVIEW';
$('save-note').textContent='Temporary demo appearance. No account or saved hero is used.';
const owner={};
function draw(now){
 const time=now/1000,state=states[animation];
 if(state==='idle')creator.draw(now);
 else{
  const h=previewHero(state,time);h.respawnAge=10;h.face=creator.view==='left'?-1:1;
  if(h.attack)h.attack.face=h.face;
  if(state==='run')h.vx=230;
  const c=$('hero-preview').getContext('2d');c.clearRect(0,0,480,480);drawHero(c,240,428,creator.look,h,time,3.05,{owner,view:creator.view});
 }
 $('review-status').textContent='Ready · '+starterSuit.status().frames+' complete poses · '+states[animation];
 requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
