import {NATURAL_SKIN_TONES} from './color-options.mjs';
import {entryEditor} from './controller-entry.mjs';
import {HAIR_CATALOG,HAIR_CATEGORIES} from './hair-catalog.mjs';
import { DEFAULT_LOOK, LOOK_OPTIONS, LOOK_RANGES, COLOR_FIELDS, sanitizeLook, validateName, canRecolorOutfit } from './appearance.mjs';
import { drawHero } from './hero-art.mjs';
import { previewHero } from './hero-rig.mjs';
import {styleCDefault,STYLE_C_VIEWS} from './style-c-defaults.mjs';
const $=id=>document.getElementById(id);
const labelFor={waist:'Waist shape',hips:'Hip width',chest:'Chest shape',jaw:'Jaw width',presentation:'Presentation',age:'Age appearance',skin:'Skin tone',eyes:'Eye color',hair:'Hairstyle',hairColor:'Hair color',face:'Face shape',eyeShape:'Eye shape',brows:'Eyebrows',nose:'Nose',mouth:'Mouth',facialHair:'Facial hair',build:'Body build',height:'Height',shoulders:'Shoulder width',muscle:'Muscularity',torso:'Torso proportion',arms:'Arm proportion',legs:'Leg proportion',suit:'Primary suit color',trim:'Secondary suit color',emblemColor:'Emblem color',emblem:'Superhero emblem',capeColor:'Cape color',cape:'Wear a cape'};
const optionLabel={side:'Right',superKick:'Super Kick',male:'Male',female:'Female',teen:'Teenager',young:'Young adult',older:'Older adult',none:'None',leaf:'Leaf',bolt:'Lightning bolt',shield:'Shield',star:'Star',wave:'Wave',sun:'Sun'};
export const FIELD_GROUPS={identity:['presentation','age','skin'],face:['hair','hairColor','eyes','face','eyeShape','brows','nose','mouth','facialHair','jaw'],body:['build','height','shoulders','muscle','torso','arms','legs','waist','hips','chest'],suit:['suit','trim','emblem','emblemColor','capeColor','cape']};
const title=s=>optionLabel[s]||s[0].toUpperCase()+s.slice(1);
export class Creator{
  constructor(){
    this.look={...DEFAULT_LOOK};this.view='front';this.outfit=null;
    for(const [group,fields] of Object.entries(FIELD_GROUPS))for(const key of fields){
      const label=document.createElement('label');label.className='field';label.textContent=labelFor[key];
      const control=document.createElement(LOOK_OPTIONS[key]?'select':'input');control.id=key;control.name=key;
      if(LOOK_OPTIONS[key])for(const value of LOOK_OPTIONS[key])control.add(new Option(title(value),value));
      else if(LOOK_RANGES[key]){control.type='range';[control.min,control.max]=LOOK_RANGES[key];control.step='.01';label.classList.add('range-field');}
      else control.type=COLOR_FIELDS.includes(key)?'color':'checkbox';
      label.append(control);
      if(control.type==='range'){const output=document.createElement('output');output.htmlFor=key;output.id=`${key}-value`;label.append(output);}
      if(control.type==='checkbox')label.classList.add('check-field');
      $(`${group}-fields`).append(label);
    }
    this.createSkinChoices();
    this.createHairGallery();
    for(const view of STYLE_C_VIEWS)$(`view-${view}`).onclick=()=>{this.view=view;for(const v of STYLE_C_VIEWS)$(`view-${v}`).setAttribute('aria-pressed',String(v===view));this.draw();this.refreshHairGallery();};
    for(const button of document.querySelectorAll('[data-tab]')){
      button.onclick=()=>this.tab(button.dataset.tab);
      button.onkeydown=e=>{const order=Object.keys(FIELD_GROUPS),index=order.indexOf(button.dataset.tab);if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const target=e.key==='Home'?0:e.key==='End'?3:(index+(e.key==='ArrowRight'?1:3))%4;this.tab(order[target]);$(`tab-${order[target]}`).focus();}};
    }
    $('creator-form').addEventListener('input',event=>{
      if(this.newHero&&event.target.id==='presentation'){
        const previous=styleCDefault(this.look.presentation),next=styleCDefault($('presentation').value);
        for(const key of ['skin','eyes','hair','hairColor','suit','trim','emblemColor','emblem','capeColor','brows','mouth'])if(this.look[key]===previous[key])$(key).value=next[key];
      }
      this.read();this.validate(false);this.draw();this.refreshHairGallery();
    });
  }
  createSkinChoices(){
    const section=document.createElement('section');section.className='natural-skin';
    const heading=document.createElement('h3');heading.textContent='Natural skin tones';
    const note=document.createElement('p');note.textContent='Pale to deep · cool, neutral, warm, golden, olive and reddish brown';
    const grid=document.createElement('div');grid.className='skin-swatches';grid.setAttribute('role','group');grid.setAttribute('aria-label','Natural skin tones');
    for(const tone of NATURAL_SKIN_TONES){const b=document.createElement('button');b.type='button';b.style.background=tone.color;b.dataset.skin=tone.color;b.title=tone.name;b.setAttribute('aria-label',tone.name);b.onclick=()=>{$('skin').value=tone.color;$('skin').dispatchEvent(new Event('input',{bubbles:true}));};grid.append(b);}
    const custom=document.createElement('button');custom.type='button';custom.className='secondary';custom.id='custom-skin-color';custom.textContent='Custom color';custom.onclick=()=>entryEditor(document).color($('skin'));
    section.append(heading,note,grid,custom);$('identity-fields').after(section);
  }
  createHairGallery(){
    this.hairCategory=HAIR_CATEGORIES[0];
    const gallery=document.createElement('section');gallery.id='hair-gallery';gallery.className='hair-gallery';
    const tabs=document.createElement('div');tabs.className='hair-categories';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Hairstyle categories');
    for(const category of [...HAIR_CATEGORIES,'Classic']){const b=document.createElement('button');b.type='button';b.textContent=category;b.onclick=()=>{this.hairCategory=category;this.refreshHairGallery();};tabs.append(b);}
    const grid=document.createElement('div');grid.id='hair-thumbnails';grid.className='hair-thumbnails';gallery.append(tabs,grid);$('face-fields').before(gallery);
  }
  refreshHairGallery(){
    if(!this.look)return;const grid=$('hair-thumbnails');grid.replaceChildren();
    for(const b of document.querySelectorAll('.hair-categories button'))b.setAttribute('aria-pressed',String(b.textContent===this.hairCategory));
    const choices=this.hairCategory==='Classic'?['curls','locs','short','waves','ponytail','braids','none'].map(id=>({id,name:title(id)})):HAIR_CATALOG.filter(h=>h.category===this.hairCategory);
    for(const style of choices){const b=document.createElement('button');b.type='button';b.setAttribute('aria-pressed',String(style.id===this.look.hair));b.setAttribute('aria-label',style.name);const canvas=document.createElement('canvas');canvas.width=100;canvas.height=110;canvas.setAttribute('aria-hidden','true');const c=canvas.getContext('2d');c.fillStyle='#203641';c.fillRect(0,0,100,110);drawHero(c,50,215,{...this.look,hair:style.id,cape:false},previewHero('idle',0),0,1.7,{view:this.view});const label=document.createElement('span');label.textContent=style.name;b.append(canvas,label);b.onclick=()=>{$('hair').value=style.id;$('hair').dispatchEvent(new Event('input',{bubbles:true}));};grid.append(b);}
  }
  tab(key){for(const name of Object.keys(FIELD_GROUPS)){const selected=key===name;$(`panel-${name}`).hidden=!selected;$(`tab-${name}`).setAttribute('aria-selected',String(selected));$(`tab-${name}`).tabIndex=selected?0:-1;}document.querySelector('.creator-fields').scrollTop=0;}
  fill(value,outfit,newHero=false){
    this.newHero=newHero;
    this.look=sanitizeLook(value);this.outfit=outfit;this.view='front';for(const v of STYLE_C_VIEWS)$(`view-${v}`).setAttribute('aria-pressed',String(v===this.view));
    $('name').value=this.look.name;
    for(const field of Object.values(FIELD_GROUPS).flat()){$(field)[$(field).type==='checkbox'?'checked':'value']=this.look[field];}
    for(const field of['suit','trim','emblemColor','capeColor'])$(field).disabled=!canRecolorOutfit(outfit);
    $('outfit-note').textContent=canRecolorOutfit(outfit)?'Colors apply to the starter suit only. Earned and purchased equipment keeps its fixed colors. Every cape has the same length.':'This outfit keeps its original colors. Starter color controls are locked.';
    $('name-error').hidden=true;$('name').setAttribute('aria-invalid','false');this.tab('identity');this.read();this.draw();this.refreshHairGallery();
  }
  read(){
    const values={name:$('name').value};
    for(const field of Object.values(FIELD_GROUPS).flat()){const el=$(field);values[field]=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;if(el.type==='range')$(`${field}-value`).textContent=`${Math.round(Number(el.value)*100)}%`;}
    this.look=sanitizeLook(values);for(const b of document.querySelectorAll('[data-skin]'))b.setAttribute('aria-pressed',String(b.dataset.skin===this.look.skin));$('preview-name').textContent=$('name').value.trim()||'Your hero';return this.look;
  }
  validate(show=true){const result=validateName($('name').value);$('name').setAttribute('aria-invalid',String(!result.ok));$('name-error').hidden=result.ok||!show;$('name-error').textContent=result.error||'';if(show&&!result.ok){this.tab('identity');$('name').focus();}return result;}
  draw(now=performance.now()){
    const canvas=$('hero-preview'),c=canvas.getContext('2d'),time=now/1000,h=previewHero('idle',time);
    c.clearRect(0,0,480,480);c.fillStyle='#112f3933';c.beginPath();c.ellipse(240,430,70,9,0,0,Math.PI*2);c.fill();
    drawHero(c,240,428,this.look,h,time,3.05,{view:this.view,outfit:this.outfit});
    canvas.setAttribute('aria-label',`${title(this.view)} view of ${this.look.name}, Idle`);
  }
}
