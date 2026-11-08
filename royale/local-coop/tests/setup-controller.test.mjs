import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {samplePad} from '../input.mjs';
const source=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
function fixture(){
 const classes=()=>{const values=new Set();return {add:v=>values.add(v),remove:v=>values.delete(v),contains:v=>values.has(v)};};
 const control=(text)=>({textContent:text,tagName:'BUTTON',disabled:false,classList:classes(),getClientRects:()=>[{}],scrollIntoView(){},setAttribute(){},click(){this.onclick?.();}});
 const start=control('START GAME');start.disabled=true;let launches=0;start.onclick=()=>launches++;
 const pads=[0,1].map(index=>({index,connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false}))}));
 const players=[0,1].map(i=>{
  const controls=['Hero','Delete Hero','Create Slot 2','Create Slot 3','Controller','Ready'].map(control),readyButton=controls.at(-1);
  const card={classList:classes(),querySelectorAll:selector=>selector==='.controller-focus'?controls.filter(n=>n.classList.contains('controller-focus')):controls};card.classList.add('player-card');
  return {profile:{identity:'test-'+i},slot:1,ready:false,focus:3,previous:new Set(),repeat:0,card,control:{value:'pad:'+i},readyButton};
 });
 const context=vm.createContext({players,manager:{active:false},artReady:true,session:null,samplePad,input:{sources:['pad:0','pad:1']},getPads:()=>pads,$:()=>start,note(){},renderPanel(){},openSelector(){},closeSelector(){}});
 const update=source.slice(source.indexOf('function controllersValid()'),source.indexOf('function configureInput()'));
 const navigation=source.slice(source.indexOf('const menuItems='),source.indexOf('function updateHUD()'));
 vm.runInContext(update+'\n'+navigation,context);
 for(const p of players)p.readyButton.onclick=()=>{p.ready=!p.ready;context.updateStart();};
 context.updateStart();let now=0;
 const pulse=(i,key,interval)=>{pads[i].buttons[key].pressed=true;context.navigateController(i,now+=interval);pads[i].buttons[key].pressed=false;context.navigateController(i,now+=interval);};
 return {players,start,pulse,launches:()=>launches};
}
for(const interval of [16.7,1000])test(`both controllers can Ready, cancel Ready and reach Start at ${interval}ms frame intervals`,()=>{
 const f=fixture();
 for(let i=0;i<2;i++){
  f.pulse(i,13,interval);f.pulse(i,13,interval);f.pulse(i,0,interval);assert.equal(f.players[i].ready,true);
  if(i===0)assert.equal(f.start.disabled,true,'one Ready cannot start');
 }
 assert.equal(f.start.disabled,false);
 f.pulse(1,0,interval);assert.equal(f.start.disabled,true,'cancel Ready blocks start');
 f.pulse(1,0,interval);assert.equal(f.start.disabled,false);
 f.pulse(0,13,interval);assert(f.start.classList.contains('controller-focus'));f.pulse(0,0,interval);assert.equal(f.launches(),1);
});
