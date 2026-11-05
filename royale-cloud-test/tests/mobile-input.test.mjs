import test from 'node:test';
import assert from 'node:assert/strict';
import {Input} from '../input.mjs';

class Control extends EventTarget {
  constructor(control) {
    super();
    this.dataset={control};
    this.style={};
    this.classList=new Set();
    this.classList.remove=this.classList.delete;
    this.captured=new Set();
  }
  setPointerCapture(id){this.captured.add(id);}
  hasPointerCapture(id){return this.captured.has(id);}
  releasePointerCapture(id){this.captured.delete(id);}
  getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
}
function emit(target,type,fields={}) {
  const event=Object.assign(new Event(type,{cancelable:true}),{button:0,pointerId:1,...fields});
  target.dispatchEvent(event);
  return event;
}
function fixture(t){
  const root=new EventTarget(),win=new EventTarget(),pad={connected:true,mapping:'standard',axes:[0,0],buttons:[]};
  const originals=new Map();
  for(const [name,value] of Object.entries({window:win,document:root,navigator:{getGamepads:()=>[pad]}})){
    originals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{value,configurable:true});
  }
  const stick=new Control(),knob=new Control();
  const buttons=Object.fromEntries(['punch','kick','jump','power0'].map(name=>[name,new Control(name)]));
  root.querySelectorAll=s=>s==='.pressed'?Object.values(buttons).filter(b=>b.classList.has('pressed')):Object.values(buttons);
  root.querySelector=s=>s==='#stick'?stick:s==='#stick-knob'?knob:buttons[s.match(/"([^"]+)"/)[1]];
  let pauses=0;
  const input=new Input(root,()=>pauses++);input.enabled=true;
  t.after(()=>{input.destroy();for(const [key,desc] of originals)if(desc)Object.defineProperty(globalThis,key,desc);else delete globalThis[key];});
  return {root,win,stick,knob,buttons,input,pad,pauses:()=>pauses};
}
for(const action of ['punch','kick','jump'])test('rapid '+action+' presses survive a shared simulation interval without compatibility clicks',t=>{
 const {buttons,input,win}=fixture(t),button=buttons[action];
 for(let i=0;i<5;i++){
   assert.ok(emit(button,'pointerdown',{pointerId:i}).defaultPrevented);
   emit(win,'pointerup',{pointerId:i});
   assert.ok(emit(button,'click',{detail:1,pointerType:'touch'}).defaultPrevented);
 }
 for(let i=0;i<5;i++)assert.ok(input.sample()[action]);
 assert.equal(input.sample()[action],false);assert.equal(button.classList.has('pressed'),false);
 emit(button,'click',{detail:0});assert.ok(input.sample()[action]);
});
test('stick, punch, jump and power own independent fingers, including outside release',t=>{
 const {win,stick,buttons,input}=fixture(t);
 emit(stick,'pointerdown',{pointerId:10,clientX:99,clientY:50});
 assert.ok(stick.captured.has(10));for(let i=0;i<180;i++)assert.equal(input.sample().move,1);
 emit(buttons.punch,'pointerdown',{pointerId:11});emit(buttons.jump,'pointerdown',{pointerId:12});
 const first=input.sample();assert.ok(first.jump&&first.punch&&first.punchHeld&&first.move===1);
 emit(win,'pointercancel',{pointerId:12});
 emit(buttons.power0,'pointerdown',{pointerId:12});
 const next=input.sample();assert.ok(next.powers[0]&&next.punchHeld&&next.move===1);
 emit(win,'pointermove',{pointerId:10,clientX:-130,clientY:50});assert.equal(input.sample().move,-1);
 emit(buttons.punch,'lostpointercapture',{pointerId:11});assert.equal(input.sample().punchHeld,false);
 emit(stick,'lostpointercapture',{pointerId:10});assert.equal(input.sample().move,0);
 emit(win,'pointerup',{pointerId:12});assert.equal(input.pointers.size,0);
});
test('capture failure can recover via window release and secondary mouse buttons do nothing',t=>{
 const {buttons,input,win}=fixture(t);buttons.kick.setPointerCapture=()=>{throw new DOMException('inactive','NotFoundError');};
 emit(buttons.kick,'pointerdown',{button:2});assert.equal(input.sample().kick,false);
 emit(buttons.kick,'pointerdown');assert.ok(input.sample().kickHeld);emit(win,'pointerup');assert.equal(input.sample().kickHeld,false);
});
test('focus and visibility transitions clear captures, pending taps, keys and gamepad without a pause edge',t=>{
 const {root,win,stick,buttons,input,pad,pauses}=fixture(t);
 emit(stick,'pointerdown',{clientX:99,clientY:50});emit(buttons.jump,'pointerdown',{pointerId:2});
 input.keys.add('ArrowRight');pad.axes[0]=1;input.pollGamepad();emit(win,'blur');
 assert.equal(stick.captured.size,0);assert.equal(buttons.jump.captured.size,0);
 const stopped=input.sample();assert.equal(stopped.move,0);assert.equal(stopped.jump,false);
 pad.buttons[input.controls.pad.pause]={pressed:true};emit(win,'focus');input.pollGamepad();assert.equal(pauses(),0);assert.equal(input.sample().move,0);
 pad.axes[0]=0;pad.buttons=[];input.pollGamepad();pad.axes[0]=1;input.pollGamepad();assert.equal(input.sample().move,1);
 root.hidden=true;emit(root,'visibilitychange');root.hidden=false;emit(root,'visibilitychange');
 emit(buttons.kick,'pointerdown');assert.equal(input.sample().kick,true);
});
