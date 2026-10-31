import { DEFAULT_LOOK, LOOK_OPTIONS, LOOK_RANGES, COLOR_FIELDS, sanitizeLook, validateName, canRecolorOutfit } from './appearance.mjs';
import { drawHero } from './hero-art.mjs';
import { PREVIEW_POSES, previewHero } from './hero-rig.mjs';
const $=id=>document.getElementById(id);
const labelFor={presentation:'Presentation',age:'Age appearance',skin:'Skin tone',eyes:'Eye color',hair:'Hairstyle',hairColor:'Hair color',face:'Face shape',eyeShape:'Eye shape',brows:'Eyebrows',nose:'Nose',mouth:'Mouth',facialHair:'Facial hair',build:'Body build',height:'Height',shoulders:'Shoulder width',muscle:'Muscularity',torso:'Torso proportion',arms:'Arm proportion',legs:'Leg proportion',suit:'Primary suit color',trim:'Secondary suit color',emblemColor:'Emblem color',emblem:'Superhero emblem',capeColor:'Cape color',cape:'Wear a cape'};
const optionLabel={male:'Male',female:'Female',teen:'Teenager',young:'Young adult',older:'Older adult',none:'None',leaf:'Leaf',bolt:'Lightning bolt',shield:'Shield',star:'Star',wave:'Wave',sun:'Sun'};
export const FIELD_GROUPS={identity:['presentation','age','skin'],face:['hair','hairColor','eyes','face','eyeShape','brows','nose','mouth','facialHair'],body:['build','height','shoulders','muscle','torso','arms','legs'],suit:['suit','trim','emblem','emblemColor','capeColor','cape']};
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
    for(const pose of PREVIEW_POSES)$('preview-pose').add(new Option(title(pose).replaceAll('-',' '),pose));
    for(const view of['front','back'])$(`view-${view}`).onclick=()=>{this.view=view;for(const v of['front','back'])$(`view-${v}`).setAttribute('aria-pressed',String(v===view));this.draw();};
    for(const button of document.querySelectorAll('[data-tab]')){
      button.onclick=()=>this.tab(button.dataset.tab);
      button.onkeydown=e=>{const order=Object.keys(FIELD_GROUPS),index=order.indexOf(button.dataset.tab);if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();const target=e.key==='Home'?0:e.key==='End'?3:(index+(e.key==='ArrowRight'?1:3))%4;this.tab(order[target]);$(`tab-${order[target]}`).focus();}};
    }
    $('creator-form').addEventListener('input',()=>{this.read();this.validate(false);this.draw();});
    $('preview-pose').addEventListener('change',()=>this.draw());
  }
  tab(key){for(const name of Object.keys(FIELD_GROUPS)){const selected=key===name;$(`panel-${name}`).hidden=!selected;$(`tab-${name}`).setAttribute('aria-selected',String(selected));$(`tab-${name}`).tabIndex=selected?0:-1;}document.querySelector('.creator-fields').scrollTop=0;}
  fill(value,outfit){
    this.look=sanitizeLook(value);this.outfit=outfit;this.view='front';$('view-front').setAttribute('aria-pressed','true');$('view-back').setAttribute('aria-pressed','false');$('preview-pose').value='idle';
    $('name').value=this.look.name;
    for(const field of Object.values(FIELD_GROUPS).flat()){$(field)[$(field).type==='checkbox'?'checked':'value']=this.look[field];}
    for(const field of['suit','trim','emblemColor','capeColor'])$(field).disabled=!canRecolorOutfit(outfit);
    $('outfit-note').textContent=canRecolorOutfit(outfit)?'Colors apply to the starter suit only. Earned and purchased equipment keeps its fixed colors. Every cape has the same length.':'This outfit keeps its original colors. Starter color controls are locked.';
    $('name-error').hidden=true;$('name').setAttribute('aria-invalid','false');this.tab('identity');this.read();this.draw();
  }
  read(){
    const values={name:$('name').value};
    for(const field of Object.values(FIELD_GROUPS).flat()){const el=$(field);values[field]=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;if(el.type==='range')$(`${field}-value`).textContent=`${Math.round(Number(el.value)*100)}%`;}
    this.look=sanitizeLook(values);$('preview-name').textContent=$('name').value.trim()||'Your hero';return this.look;
  }
  validate(show=true){const result=validateName($('name').value);$('name').setAttribute('aria-invalid',String(!result.ok));$('name-error').hidden=result.ok||!show;$('name-error').textContent=result.error||'';if(show&&!result.ok){this.tab('identity');$('name').focus();}return result;}
  draw(now=performance.now()){
    const canvas=$('hero-preview'),c=canvas.getContext('2d'),time=now/1000,h=previewHero($('preview-pose').value,time);
    c.clearRect(0,0,480,480);c.fillStyle='#112f3933';c.beginPath();c.ellipse(240,430,70,9,0,0,Math.PI*2);c.fill();
    drawHero(c,240,428,this.look,h,time,3.05,{view:this.view,outfit:this.outfit});
    canvas.setAttribute('aria-label',`${title(this.view)} view of ${this.look.name}, ${$('preview-pose').selectedOptions[0].textContent}`);
  }
}
