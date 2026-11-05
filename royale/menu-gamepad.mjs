import {focusControl,selectableItems,spatialTarget} from './spatial-navigation.mjs';
import {entryEditor,isTextControl} from './controller-entry.mjs';
// The same navigation component serves every existing overlay; it has no account logic.
export class MenuGamepad {
  constructor({root=document,back=()=>{},active=()=>false,getPads=()=>navigator.getGamepads?.()||[]}={}) {
    Object.assign(this,{root,back,active,getPads});this.previous=new Set();this.direction='';this.next=0;
    this.editor=root.createElement?entryEditor(root):null;
  }
  scope(){return this.editor?.current?.dialog||[...this.root.querySelectorAll('dialog[open]')].at(-1)||[...this.root.querySelectorAll('.overlay:not([hidden])')].at(-1)||this.root;}
  focus(el){if(!el)return;this.focusKey=el.id||el.getAttribute('aria-label')||el.textContent.trim();focusControl(el,this.root);}
  adjust(el,delta){if(delta)delta>0?el.stepUp():el.stepDown();const Event=el.ownerDocument.defaultView.Event;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  finishAdjustment(commit){if(!this.adjusting)return;const {el,value}=this.adjusting;if(!commit){el.value=value;this.adjust(el,0);}el.removeAttribute('data-controller-adjusting');this.adjusting=null;}
  confirm(el){
    if(el.type==='range'){
      if(this.adjusting)this.finishAdjustment(true);
      else {this.adjusting={el,value:el.value};el.setAttribute('data-controller-adjusting','true');}
    }else if(isTextControl(el))this.editor?.text(el);
    else if(el.type==='color')this.editor?.color(el);
    else if(el.tagName==='SELECT')this.editor?.select(el);
    else el.click();
  }
  poll(now=performance.now()){
    this.consumePause=false;
    let pad;try{pad=[...this.getPads()].find(p=>p?.connected&&p.mapping==='standard');}catch{}
    const held=new Set();pad?.buttons.forEach((b,i)=>{if(b.pressed)held.add(i);});
    const edges=[...held].filter(i=>!this.previous.has(i));this.previous=held;
    if(!pad){this.connected=false;this.direction='';return;}
    if(!this.connected&&held.size)this.waitNeutral=true;this.connected=true;
    if(this.waitNeutral){if(held.size||pad.axes.some(v=>Math.abs(v)>.55))return;this.waitNeutral=false;}
    if(!this.active()&&!this.editor?.current){this.direction='';return;}
    const scope=this.scope(),items=selectableItems(scope);if(!items.length)return;
    if(this.lastScope!==scope){this.lastScope=scope;this.focusKey=null;this.finishAdjustment(true);this.direction='';}
    let focused=this.root.activeElement;
    if(!items.includes(focused)){focused=items.find(el=>(el.id||el.getAttribute('aria-label')||el.textContent.trim())===this.focusKey)||items[0];this.focus(focused);}
    if(this.adjusting&&this.adjusting.el!==focused)this.finishAdjustment(true);
    if(edges.includes(1)){
      if(this.adjusting){this.finishAdjustment(false);return;}
      if(this.editor?.current){this.editor.close(false);return;}
      const cancel=items.find(el=>/^cancel-/.test(el.id))||items.find(el=>!el.closest('.view-toggle')&&/^(Back|Cancel|Keep previewing|Keep my hero|Leave orb|Close)/i.test(el.textContent.trim()));
      if(cancel)cancel.click();else this.back();return;
    }
    if(edges.includes(9)&&this.editor?.current){this.finishAdjustment(true);this.editor.close(false);this.consumePause=true;return;}
    if(edges.includes(4)||edges.includes(5)){
      const allTabs=items.filter(el=>el.matches('[role="tab"],[data-tab],[data-panel],.eris-nav [data-eris],.wardrobe-tabs [data-wardrobe],.hair-categories button'));
      const group=allTabs.find(el=>el.parentElement?.contains(focused))?.parentElement||allTabs[0]?.parentElement;
      const tabs=allTabs.filter(el=>el.parentElement===group);
      if(tabs.length){let i=tabs.indexOf(focused);if(i<0)i=tabs.findIndex(el=>el.getAttribute('aria-selected')==='true'||el.getAttribute('aria-pressed')==='true');const target=tabs[(i+tabs.length+(edges.includes(5)?1:-1))%tabs.length];this.focus(target);target.click();}return;
    }
    if(edges.includes(0)){this.confirm(focused);return;}
    const x=pad.axes[0]||0,y=pad.axes[1]||0;
    const direction=held.has(12)?'up':held.has(13)?'down':held.has(14)?'left':held.has(15)?'right':Math.max(Math.abs(x),Math.abs(y))<.55?'':Math.abs(x)>Math.abs(y)?x<0?'left':'right':y<0?'up':'down';
    if(!direction){this.direction='';return;}
    if(direction===this.direction&&now<this.next)return;
    this.next=now+(direction===this.direction?160:380);this.direction=direction;
    if(this.adjusting&&(direction==='left'||direction==='right')){this.adjust(focused,direction==='right'?1:-1);return;}
    this.finishAdjustment(true);
    const next=spatialTarget(focused,items,direction);if(next)this.focus(next);
  }
}
