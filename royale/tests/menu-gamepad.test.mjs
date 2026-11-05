import test from 'node:test';import assert from 'node:assert/strict';import{MenuGamepad}from'../menu-gamepad.mjs';
function fixture(){
 const root={defaultView:{getComputedStyle:()=>({visibility:'visible'}),Event},activeElement:null,items:[],querySelectorAll(selector){return selector==='dialog[open]'||selector.includes('.overlay')?[]:selector==='.controller-focus'?this.items.filter(e=>e.marked):this.items;}};
 const add=(id,attrs={})=>{const row=root.items.length;const e={id,attrs,ownerDocument:root,tabIndex:0,getBoundingClientRect:()=>({left:0,right:100,top:row*50,bottom:row*50+44}),setAttribute(n,v){this.attrs[n]=v;},removeAttribute(n){delete this.attrs[n];},tagName:'BUTTON',type:'button',textContent:id,disabled:false,clicks:0,events:[],getClientRects:()=>[{}],closest(){return this.hidden?{}:null;},getAttribute(n){return this.attrs[n]??null;},matches(s){return s.includes('[role="tab"]')&&this.attrs.role==='tab';},focus(){root.activeElement=this;},scrollIntoView(){this.scrolled=true;},click(){this.clicks++;this.onclick?.();},dispatchEvent(event){this.events.push(event.type);},classList:{add(){e.marked=true;},remove(){e.marked=false;}}};root.items.push(e);return e;};
 const pad={connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false}))};globalThis.getComputedStyle=()=>({visibility:'visible'});
 const menu=new MenuGamepad({root,active:()=>true,getPads:()=>[pad]});return {root,add,pad,menu,press:(i,t=0)=>{pad.buttons[i].pressed=true;menu.poll(t);pad.buttons[i].pressed=false;menu.poll(t+1);}};
}
test('Gamepad API focus excludes hidden/disabled controls, scrolls, and ignores drift',()=>{
 const f=fixture(),hidden=f.add('hidden'),disabled=f.add('disabled'),visible=f.add('visible');hidden.hidden=true;disabled.disabled=true;f.menu.poll(0);assert.equal(f.root.activeElement,visible);assert.ok(visible.scrolled);f.pad.axes[1]=.2;f.menu.poll(1000);assert.equal(f.root.activeElement,visible);
});
test('confirm is one edge per press and a held button never confirms the next screen',()=>{
 const f=fixture(),a=f.add('A'),b=f.add('B');a.onclick=()=>f.menu.focus(b);f.menu.poll(0);f.pad.buttons[0].pressed=true;for(let t=1;t<1000;t+=16)f.menu.poll(t);assert.equal(a.clicks,1);assert.equal(b.clicks,0);f.pad.buttons[0].pressed=false;f.menu.poll(1001);f.press(0,1002);assert.equal(b.clicks,1);
});
test('directional repeats have an initial delay and reconnect is safe',()=>{
 const f=fixture(),items=[f.add('A'),f.add('B'),f.add('C')];f.menu.poll(0);f.pad.axes[1]=1;f.menu.poll(1);assert.equal(f.root.activeElement,items[1]);f.menu.poll(379);assert.equal(f.root.activeElement,items[1]);f.menu.poll(381);assert.equal(f.root.activeElement,items[2]);f.pad.connected=false;f.menu.poll(400);f.pad.connected=true;f.pad.axes[1]=0;f.menu.poll(500);assert.equal(f.root.activeElement,items[2]);
});
test('shoulders activate the next and previous visible tab',()=>{
 const f=fixture(),tabs=[f.add('Identity',{role:'tab','aria-selected':'true'}),f.add('Face',{role:'tab'}),f.add('Body',{role:'tab'})];for(const tab of tabs)tab.onclick=()=>{for(const t of tabs)t.attrs['aria-selected']=String(t===tab);};f.menu.poll(0);f.press(5);assert.equal(f.root.activeElement,tabs[1]);f.press(5,10);assert.equal(f.root.activeElement,tabs[2]);f.press(4,20);assert.equal(f.root.activeElement,tabs[1]);
});
test('Confirm enters slider adjustment and left/right uses existing input/change handlers',()=>{
 const f=fixture(),range=f.add('height');range.type='range';range.value=1;range.stepUp=()=>range.value+=.01;range.stepDown=()=>range.value-=.01;f.menu.poll(0);f.press(0);f.press(15,2);assert.equal(range.value,1.01);assert.deepEqual(range.events,['input','change']);f.press(14,10);assert.equal(range.value,1);
});
test('reconnecting with confirm held requires release before activation',()=>{
 const f=fixture(),a=f.add('A');f.menu.poll(0);f.pad.connected=false;f.menu.poll(1);f.pad.buttons[0].pressed=true;f.pad.connected=true;f.menu.poll(2);f.menu.poll(1000);assert.equal(a.clicks,0);f.pad.buttons[0].pressed=false;f.menu.poll(1001);f.press(0,1002);assert.equal(a.clicks,1);
});

test('B cancels appearance rather than selecting the Back viewing direction',()=>{const f=fixture(),view=f.add('view-back'),cancel=f.add('cancel-look');view.textContent='Back';cancel.textContent='Back to heroes';f.menu.poll(0);f.press(1);assert.equal(view.clicks,0);assert.equal(cancel.clicks,1);});
