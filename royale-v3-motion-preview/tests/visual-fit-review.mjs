// QA only. No cloud/account imports, saved snapshots or production entry-point changes.
import {Game} from '../core.mjs';
import {EQUIPMENT,equipmentOutfit,emptyInventory} from '../equipment.mjs';
import {armorCollection} from '../power-armor-art.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../style-c-hero.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {sanitizeLook,HAIR_STYLES} from '../appearance.mjs';
import {previewHero,PREVIEW_POSES} from '../hero-rig.mjs';
import {CapeCloth} from '../cape.mjs';
const $=id=>document.getElementById(id),views=['front','right','back','left'],groups=new Map([['starter',[{id:'starter',name:'Starter suit',items:[]}]],['hair',HAIR_STYLES.map(hair=>({id:hair,name:hair,hair,items:[]}))]]);
for(const item of Object.values(EQUIPMENT)){
 const group=armorCollection(item)||(item.mergeId?'merge':item.setId?'regional':'legacy');
 if(!groups.has(group))groups.set(group,[]);
 const id=item.setId||(item.mergeId?'merge-'+item.mergeId:item.id.replace(/-(mask|suit|gloves|boots|belt|cape|emblem)$/,''));
 let set=groups.get(group).find(s=>s.id===id);if(!set){set={id,name:item.setName||id,items:[]};groups.get(group).push(set);}set.items.push(item);
}
const bodies={
 'Male balanced':{presentation:'male'},'Female balanced':{presentation:'female'},
 'Male slender / short':{presentation:'male',build:'slender',height:.88,shoulders:.8,chest:.85,torso:.85,arms:.85,legs:.85,hips:.85},
 'Female strong / tall':{presentation:'female',build:'strong',height:1.12,shoulders:1.2,chest:1.15,torso:1.15,arms:1.15,legs:1.15,muscle:1},
 'Male full / wide':{presentation:'male',build:'full',waist:1.2,hips:1.15,chest:1.15,shoulders:1.2,muscle:1},
 'Female full / narrow shoulders':{presentation:'female',build:'full',waist:1.2,hips:1.15,shoulders:.8,chest:1.15},
};
const option=(id,v,label=v)=>{const o=document.createElement('option');o.value=v;o.textContent=label;$(id).append(o);};
for(const [id,list]of groups)option('collection',id,`${id} · ${list.length} sets/styles`);
for(const id of Object.keys(bodies))option('body',id);
for(const id of PREVIEW_POSES)option('motion',id);
for(const id of HAIR_STYLES)option('hair',id);
$('hair').value='short-locs';let page=0,cells=[],ready=false,running=false,time=.18,last=0;
function makeGame(set){
 const preset=bodies[$('body').value],look=sanitizeLook({...styleCDefault(preset.presentation),...preset,hair:set.hair||$('hair').value,cape:$('cape').value==='true'}),game=new Game({look});
 game.inventory=emptyInventory();game.hero.level=99;
 for(const item of set.items){const uid='review-'+item.id;game.inventory.items.push({uid,catalogId:item.id});game.inventory.equipped[item.part]=uid;}
 return game;
}
function rebuild(){
 if(!ready)return;const list=groups.get($('collection').value),pages=Math.ceil(list.length/9);page=Math.max(0,Math.min(page,pages-1));$('sheet').replaceChildren();cells=[];
 const directions=$('direction').value==='all'?views:[$('direction').value];$('sheet').style.gridTemplateColumns=`repeat(${directions.length},minmax(0,1fr))`;
 for(const set of list.slice(page*9,page*9+9))for(const view of directions){const box=document.createElement('section'),title=document.createElement('h2'),canvas=document.createElement('canvas');box.className='cell';title.textContent=set.name+' · '+view;canvas.width=240;canvas.height=270;canvas.setAttribute('aria-label',title.textContent);box.append(title,canvas);$('sheet').append(box);cells.push({canvas,game:makeGame(set),view,cloth:new CapeCloth()});}
 $('status').textContent=`${$('collection').value} · page ${page+1}/${pages} · ${cells.length} actual hero renders · ${$('body').value} · ${$('motion').value}. Rendering is not a claim of completed visual inspection.`;
 $('manifest').textContent=JSON.stringify({collection:$('collection').value,page:page+1,sets:list.slice(page*9,page*9+9).map(s=>({id:s.id,items:s.items.map(i=>i.id)})),body:bodies[$('body').value],motion:$('motion').value,directions},null,2);draw();
}
function draw(dt=0){for(const cell of cells){const {canvas,game,view}=cell,c=canvas.getContext('2d');Object.assign(game.hero,previewHero($('motion').value,time));c.clearRect(0,0,240,270);c.fillStyle='#d8d8c8';c.fillRect(0,0,240,270);c.fillStyle='#adc1af';c.fillRect(0,244,240,26);drawHero(c,120,243,game.look,game.hero,time,1.8,{view,poseName:$('motion').value,outfit:equipmentOutfit(game.inventory),cloth:cell.cloth,dt});}}
for(const id of ['collection','body','motion','direction','phase','hair','cape'])$(id).onchange=()=>{page=0;time=Number($('phase').value);rebuild();};
$('previous').onclick=()=>{page--;rebuild();};$('next').onclick=()=>{page++;rebuild();};$('animate').onclick=()=>{running=!running;$('animate').textContent=running?'Freeze visible page':'Animate visible page';};
function tick(now){const dt=Math.min(.05,(now-last)/1000||0);last=now;if(running&&ready&&!document.hidden){time+=dt;draw(dt);}requestAnimationFrame(tick);}requestAnimationFrame(tick);
ready=await prepareStyleCMaterials();if(ready)rebuild();else $('status').textContent='ERROR: existing hero artwork failed to load.';
