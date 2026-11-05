// Standard Gamepad API menu input. Button edges are consumed even while playing,
// so a held attack cannot become a confirmation when an overlay opens.
export class MenuGamepad {
  constructor({root=document,back=()=>{},active=()=>false,getPads=()=>navigator.getGamepads?.()||[]}={}) {
    Object.assign(this,{root,back,active,getPads});this.previous=new Set();this.direction='';this.next=0;
  }
  visible(el){return !el.disabled&&!el.closest('[hidden],[inert]')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';}
  scope(){return [...this.root.querySelectorAll('dialog[open]')].at(-1)||[...this.root.querySelectorAll('.overlay:not([hidden])')].at(-1)||this.root;}
  focus(el){this.root.querySelectorAll('.controller-focus').forEach(n=>n.classList.remove('controller-focus'));if(!el)return;this.focusKey=el.id||el.getAttribute('aria-label')||el.textContent.trim();el.focus({preventScroll:true});el.classList.add('controller-focus');el.scrollIntoView({block:'nearest',inline:'nearest'});}
  poll(now=performance.now()){
    let pad;try{pad=[...this.getPads()].find(p=>p?.connected&&p.mapping==='standard');}catch{}
    const held=new Set();pad?.buttons.forEach((b,i)=>{if(b.pressed)held.add(i);});
    const edges=[...held].filter(i=>!this.previous.has(i));this.previous=held;
    if(!pad){this.connected=false;this.direction='';return;}
    if(!this.connected&&held.size)this.waitNeutral=true;this.connected=true;
    if(this.waitNeutral){if(held.size||pad.axes.some(v=>Math.abs(v)>.55))return;this.waitNeutral=false;}
    if(!this.active()){this.direction='';return;}
    const scope=this.scope(),items=[...scope.querySelectorAll('button,a[href],input,select,textarea,summary,[tabindex="0"]')].filter(el=>this.visible(el));
    if(!items.length)return;
    if(this.lastScope!==scope){this.lastScope=scope;this.focusKey=null;}
    let focused=this.root.activeElement;if(!items.includes(focused)){focused=items.find(el=>(el.id||el.getAttribute('aria-label')||el.textContent.trim())===this.focusKey)||items[0];this.focus(focused);}
    if(edges.includes(1)){const cancel=items.find(el=>/^cancel-/.test(el.id))||items.find(el=>!el.closest('.view-toggle')&&/^(Back|Cancel|Keep previewing|Keep my hero|Leave orb|Close)/i.test(el.textContent.trim()));if(cancel)cancel.click();else this.back();return;}
    if(edges.includes(4)||edges.includes(5)){
      const tabs=items.filter(el=>el.matches('[role="tab"],[data-tab],[data-panel],[data-eris]'));
      if(tabs.length){let i=tabs.findIndex(el=>el.getAttribute('aria-selected')==='true'||el.getAttribute('aria-pressed')==='true');const target=tabs[(i+tabs.length+(edges.includes(5)?1:-1))%tabs.length];this.focus(target);target.click();}return;
    }
    if(edges.includes(0)){focused.click();return;}
    const x=pad.axes[0]||0,y=pad.axes[1]||0;
    const direction=held.has(12)?'up':held.has(13)?'down':held.has(14)?'left':held.has(15)?'right':Math.max(Math.abs(x),Math.abs(y))<.55?'':Math.abs(x)>Math.abs(y)?x<0?'left':'right':y<0?'up':'down';
    if(!direction){this.direction='';return;}
    if(direction===this.direction&&now<this.next)return;
    this.next=now+(direction===this.direction?150:380);this.direction=direction;
    const delta=direction==='left'||direction==='up'?-1:1;
    if((direction==='left'||direction==='right')&&focused.type==='color'){
      const colors=focused.id==='skin'?['#f5d6bb','#d6a27b','#b87542','#91562f','#633d2b','#39251f']:['#ffffff','#202330','#cf3030','#e6b33e','#329562','#3686cd','#7753a5','#db8ba8'];
      const i=colors.indexOf(focused.value.toLowerCase());focused.value=colors[(i+colors.length+delta)%colors.length];focused.dispatchEvent(new Event('input',{bubbles:true}));return;
    }
    if((direction==='left'||direction==='right')&&(focused.type==='range'||focused.tagName==='SELECT')){
      if(focused.tagName==='SELECT'){let i=focused.selectedIndex;do{i+=delta;}while(focused.options[i]?.disabled);if(i>=0&&i<focused.options.length)focused.selectedIndex=i;}
      else delta>0?focused.stepUp():focused.stepDown();
      focused.dispatchEvent(new Event('input',{bubbles:true}));focused.dispatchEvent(new Event('change',{bubbles:true}));return;
    }
    // Stable document ordering also reaches offscreen items in scrollable panels.
    this.focus(items[(items.indexOf(focused)+delta+items.length)%items.length]);
  }
}
