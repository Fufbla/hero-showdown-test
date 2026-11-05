import {focusControl,selectableItems,spatialTarget} from './spatial-navigation.mjs';
import {NATURAL_SKIN_TONES,GENERAL_COLORS,hexToHSV,hsvToHex} from './color-options.mjs';

export const isTextControl=el=>el?.tagName==='TEXTAREA'||el?.tagName==='INPUT'&&['text','password','email','search','url','tel','number'].includes(el.type);
export function editText(value,action,{start=value.length,end=start,shift=false,maxLength=-1}={}){
  if(action==='Backspace'&&start===end){start=Math.max(0,start-[...value.slice(0,start)].at(-1)?.length||0);}
  const insert=action==='Backspace'?'':action==='Space'?' ':shift?action.toUpperCase():action;
  const next=value.slice(0,start)+insert+value.slice(end);
  return maxLength>=0&&next.length>maxLength?{value,caret:end}:{value:next,caret:start+insert.length};
}
const editors=new WeakMap();
export function entryEditor(doc=document){if(!editors.has(doc))editors.set(doc,new ControllerEntry(doc));return editors.get(doc);}
const emit=el=>{const Event=el.ownerDocument.defaultView.Event;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};
const label=el=>el.getAttribute('aria-label')||el.labels?.[0]?.childNodes[0]?.textContent?.trim()||el.name||'Text';
export class ControllerEntry {
  constructor(doc){
    this.doc=doc;this.stack=[];
    doc.addEventListener('click',e=>{const el=e.target;if(el.matches?.('input[type="color"]')&&!el.disabled){e.preventDefault();this.color(el);}},true);
    doc.addEventListener('keydown',e=>{
      if(!this.current)return;
      if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.close(false);return;}
      if(e.target.matches('input,textarea,select'))return;
      const dir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'}[e.key];
      if(dir){e.preventDefault();e.stopImmediatePropagation();focusControl(spatialTarget(doc.activeElement,selectableItems(this.current.dialog),dir)||doc.activeElement);}
    },true);
  }
  get current(){return this.stack.at(-1);}
  button(text,fn,parent,attributes={}){const b=this.doc.createElement('button');b.type='button';b.textContent=text;for(const [k,v]of Object.entries(attributes))b.setAttribute(k,v);b.onclick=fn;parent.append(b);return b;}
  open(source,title,kind){
    const dialog=this.doc.createElement('dialog');dialog.className='controller-entry entry-'+kind;dialog.setAttribute('aria-label',title);dialog.dataset.controllerEntry=kind;
    const heading=this.doc.createElement('h2');heading.textContent=title;dialog.append(heading);
    const state={dialog,source,original:source.value,commit:()=>{},cancel:()=>{}};this.stack.push(state);this.doc.body.append(dialog);
    dialog.addEventListener('cancel',e=>{e.preventDefault();this.close(false);});
    return state;
  }
  show(state,first){state.dialog.showModal();focusControl(first||state.dialog.querySelector('button'));}
  close(commit){
    const state=this.stack.pop();if(!state)return;
    commit?state.commit():state.cancel();state.dialog.close();state.dialog.remove();
    // Remove password drafts as soon as the dialog closes. Never write them to logs or storage.
    state.dialog.querySelectorAll('input').forEach(el=>el.value='');
    const source=state.source.isConnected?state.source:this.doc.getElementById(state.source.id);
    if(source)focusControl(source);state.original='';
  }
  text(source){
    if(source.readOnly||source.disabled)return;
    const state=this.open(source,label(source),'keyboard'),d=state.dialog,field=this.doc.createElement('input');
    field.type=source.type==='password'?'password':'text';field.value=source.value;field.autocomplete='off';field.spellcheck=false;field.inputMode='none';field.setAttribute('aria-label',label(source)+' entry');
    if(source.maxLength>=0)field.maxLength=source.maxLength;
    d.append(field);let shift=false,caret=field.value.length,end=caret;
    const remember=()=>{caret=field.selectionStart??field.value.length;end=field.selectionEnd??caret;};
    for(const event of ['input','select','keyup','click','blur'])field.addEventListener(event,remember);
    const keys=this.doc.createElement('div');keys.className='virtual-keys';d.append(keys);
    const letters=[];
    const enter=action=>{const edit=editText(field.value,action,{start:caret,end,shift,maxLength:source.maxLength});field.value=edit.value;caret=end=edit.caret;field.setSelectionRange(caret,end);};
    for(const row of ['1234567890','qwertyuiop','asdfghjkl','zxcvbnm']){
      const line=this.doc.createElement('div');line.className='key-row';keys.append(line);
      for(const ch of row)letters.push([ch,this.button(ch,()=>enter(ch),line)]);
    }
    const actions=this.doc.createElement('div');actions.className='entry-actions';d.append(actions);
    this.button('Shift',e=>{shift=!shift;for(const [ch,b]of letters)b.textContent=shift?ch.toUpperCase():ch;e.currentTarget.setAttribute('aria-pressed',String(shift));},actions,{'aria-pressed':'false'});
    let symbols=false;
    this.button('Symbols',e=>{symbols=!symbols;e.currentTarget.textContent=symbols?'Letters':'Symbols';
      const alphabet=symbols?Array.from('@._-\'!#$%&*+?/:=()[]{}<>\\|^`~"'):[...'1234567890qwertyuiopasdfghjklzxcvbnm'];
      letters.forEach((entry,i)=>{const ch=alphabet[i]||' ';entry[0]=ch;entry[1].hidden=!alphabet[i];entry[1].textContent=shift?ch.toUpperCase():ch;entry[1].onclick=()=>enter(ch);});
    },actions);
    this.button('Space',()=>enter('Space'),actions);this.button('Backspace',()=>enter('Backspace'),actions);
    this.button('Cancel',()=>this.close(false),actions,{'data-entry-cancel':''});this.button('Done',()=>this.close(true),actions);
    state.commit=()=>{source.value=field.value;emit(source);};this.show(state,letters[10][1]);
  }
  color(source){
    if(source.disabled)return;
    const state=this.open(source,label(source),'color'),d=state.dialog;
    const preview=this.doc.createElement('div');preview.className='color-preview';preview.setAttribute('aria-live','polite');d.append(preview);
    const grid=this.doc.createElement('div');grid.className='entry-swatches';d.append(grid);
    const skin=source.id==='skin'||source.dataset.colorKind==='skin';
    const choices=skin?NATURAL_SKIN_TONES:GENERAL_COLORS.map(color=>({color,name:color}));
    let hsv=hexToHSV(source.value),picked=source.value;const sliders={};
    const hex=this.doc.createElement('input');hex.type='text';hex.maxLength=7;hex.pattern='#[0-9a-fA-F]{6}';hex.setAttribute('aria-label','Hex color');
    const sync=(value,fromHSV=false)=>{
      picked=value.toLowerCase();if(!fromHSV)hsv=hexToHSV(picked);
      source.value=picked;emit(source);hex.value=picked;hex.setCustomValidity('');preview.style.background=picked;preview.textContent=picked;
      for(const [key,el]of Object.entries(sliders)){el.value=hsv[key];el.nextElementSibling.value=Math.round(hsv[key])+(key==='h'?'°':'%');}
      for(const b of grid.children)b.setAttribute('aria-pressed',String(b.dataset.color===picked));
    };
    for(const {color,name}of choices){const b=this.button('',()=>sync(color),grid,{'aria-label':name+' '+color,'aria-pressed':String(color===source.value)});b.style.background=color;b.dataset.color=color;b.title=name;}
    const custom=this.doc.createElement('section');custom.className='color-custom';d.append(custom);
    const heading=this.doc.createElement('h3');heading.textContent='Custom color';custom.append(heading);
    for(const [key,name,max]of [['h','Hue',359],['s','Saturation',100],['v','Brightness',100]]){
      const row=this.doc.createElement('label');row.textContent=name;const range=this.doc.createElement('input');range.type='range';range.min=0;range.max=max;range.step=1;range.setAttribute('aria-label',name);range.setAttribute('aria-description','Confirm to adjust, Left or Right to change, Confirm to finish, Back to cancel adjustment.');
      const out=this.doc.createElement('output');row.append(range,out);custom.append(row);sliders[key]=range;
      range.oninput=()=>{hsv[key]=Number(range.value);sync(hsvToHex(hsv),true);};
    }
    const hexLabel=this.doc.createElement('label');hexLabel.textContent='Hex color';hexLabel.append(hex);custom.append(hexLabel);
    hex.addEventListener('input',()=>{if(/^#[\da-f]{6}$/i.test(hex.value))sync(hex.value);else hex.setCustomValidity('Use # followed by six hexadecimal digits.');});
    const actions=this.doc.createElement('div');actions.className='entry-actions';d.append(actions);
    this.button('Cancel',()=>this.close(false),actions,{'data-entry-cancel':''});this.button('Use color',()=>{if(hex.reportValidity())this.close(true);},actions);
    state.cancel=()=>{source.value=state.original;emit(source);};sync(picked);this.show(state,grid.querySelector('[aria-pressed="true"]')||grid.firstElementChild);
  }
  select(source){
    const state=this.open(source,label(source),'select'),grid=this.doc.createElement('div');grid.className='entry-choices';state.dialog.append(grid);
    for(const option of source.options){if(option.disabled||option.hidden||option.parentElement?.disabled)continue;this.button(option.text,()=>{source.value=option.value;emit(source);this.close(true);},grid,{'aria-pressed':String(option.selected)});}
    this.button('Cancel',()=>this.close(false),state.dialog,{'data-entry-cancel':''});this.show(state,grid.querySelector('[aria-pressed="true"]'));
  }
}
