import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero,styleCCacheStatus} from '../style-c-hero.mjs';
import {styleCHairStatus} from '../style-c-hair.mjs';
import {previewHero,PREVIEW_POSES} from '../hero-rig.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {sanitizeLook,LOOK_OPTIONS} from '../appearance.mjs';
import {REVIEW_LOOKS} from './original-face-fixtures.mjs';
import {styleCOutfit} from './style-c-scenes.mjs';
const $=id=>document.getElementById(id),views=['front','right','back','left'];
let look={...REVIEW_LOOKS[0]},running=false,time=0,last=0,outfit='starter',ready=false;
const canvases=views.map(view=>{const section=document.createElement('section');section.className='view';const title=document.createElement('h2');title.textContent=view[0].toUpperCase()+view.slice(1);const canvas=document.createElement('canvas');canvas.width=420;canvas.height=510;canvas.setAttribute('aria-label',view+' character preview');section.append(title,canvas);$('views').append(section);return canvas;});
function option(select,value,label=value){const o=document.createElement('option');o.value=value;o.textContent=label;select.append(o);}
REVIEW_LOOKS.forEach((l,i)=>option($('example'),i,l.name));PREVIEW_POSES.forEach(p=>option($('pose'),p));
const fields={presentation:LOOK_OPTIONS.presentation,skin:'color',eyes:'color',hair:LOOK_OPTIONS.hair,hairColor:'color',face:LOOK_OPTIONS.face,jaw:'range',eyeShape:LOOK_OPTIONS.eyeShape,brows:LOOK_OPTIONS.brows,nose:LOOK_OPTIONS.nose,mouth:LOOK_OPTIONS.mouth,facialHair:LOOK_OPTIONS.facialHair,age:LOOK_OPTIONS.age};
const labels={presentation:'Character',skin:'Skin tone',eyes:'Eye color',hair:'Hairstyle',hairColor:'Hair color',face:'Face shape',jaw:'Jaw width',eyeShape:'Eye shape',brows:'Eyebrows',nose:'Nose',mouth:'Mouth',facialHair:'Facial hair',age:'Age'};
for(const [key,values]of Object.entries(fields)){
 const label=document.createElement('label');label.append(document.createTextNode(labels[key]));const input=document.createElement(Array.isArray(values)?'select':'input');input.id=key;
 if(Array.isArray(values))values.forEach(v=>option(input,v));else input.type=values;
 if(values==='range'){input.min=.85;input.max=1.15;input.step=.01;}
 input.value=look[key];input.addEventListener('input',()=>{look=sanitizeLook({...look,[key]:values==='range'?Number(input.value):input.value});render();});label.append(input);$('controls').append(label);
}
const gearLabel=document.createElement('label');gearLabel.append('Equipment');const gear=document.createElement('select');gear.id='gear';for(const v of ['starter','ordinary','rare','merge:venomis'])option(gear,v);gearLabel.append(gear);$('controls').append(gearLabel);gear.onchange=()=>{outfit=gear.value;render();};
$('example').onchange=()=>{look={...REVIEW_LOOKS[Number($('example').value)]};for(const key of Object.keys(fields))$(key).value=look[key];render();};
$('pose').onchange=()=>{time=.18;render();};
$('animate').onclick=()=>{running=!running;$('animate').textContent=running?'Pause animation':'Play animation';};
function render(){if(!ready)return;const h=previewHero($('pose').value,time);canvases.forEach((canvas,i)=>{const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);drawHero(c,220,455,look,h,time,3.45,{view:views[i],poseName:$('pose').value,outfit:styleCOutfit(outfit)});});$('status').textContent=`${look.presentation} · ${look.hair} · ${look.skin} · ${$('pose').value}`;}
function tick(now){if(running&&last){time+=Math.min(.05,(now-last)/1000);render();}last=now;requestAnimationFrame(tick);}requestAnimationFrame(tick);
$('verify').onclick=()=>{
 try{const saved=JSON.stringify(look);let count=0;for(const sex of ['male','female'])for(const hair of LOOK_OPTIONS.hair)for(const view of views){const l={...styleCDefault(sex),hair,skin:'#39251f',jaw:1.15};const canvas=document.createElement('canvas');canvas.width=200;canvas.height=210;const c=canvas.getContext('2d');const p=drawHero(c,100,200,l,previewHero('run',.2),.2,1.45,{view,poseName:'run'});if(!p.head.every(Number.isFinite))throw Error('Invalid head anchor');if(!c.getImageData(0,0,200,210).data.some(v=>v))throw Error('Empty preview');count++;}if(JSON.stringify(look)!==saved)throw Error('Preview appearance mutated');$('diagnostics').textContent=`PASS · ${count} character/direction combinations\nAppearance preserved; head anchors finite; all previews draw.\n${JSON.stringify({head:styleCCacheStatus(),hair:styleCHairStatus()})}`;render();}catch(e){$('diagnostics').textContent='FAIL · '+e.message;}
};
ready=await prepareStyleCMaterials();if(ready)render();else $('status').textContent='Artwork could not load. Reload the preview.';
