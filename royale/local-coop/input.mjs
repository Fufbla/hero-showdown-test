export const KEYSETS=[
 {left:'KeyA',right:'KeyD',up:'KeyW',down:'KeyS',run:'ShiftLeft',jump:'Space',punch:'KeyF',kick:'KeyG',interact:'KeyE',heal:'KeyR',portal:'KeyQ',nextTarget:'KeyT',power0:'Digit1',power1:'Digit2',power2:'Digit3',power3:'Digit4'},
 {left:'ArrowLeft',right:'ArrowRight',up:'ArrowUp',down:'ArrowDown',run:'ShiftRight',jump:'Enter',punch:'KeyJ',kick:'KeyK',interact:'KeyL',heal:'KeyU',portal:'KeyO',nextTarget:'KeyI',power0:'Digit7',power1:'Digit8',power2:'Digit9',power3:'Digit0'}
];
export const PAD={jump:0,kick:1,punch:2,interact:3,power0:4,power1:5,run:6,power2:7,power3:8,pause:9,tree:10,heal:11,portal:12,down:13,left:14,right:15,nextTarget:16};
export function samplePad(pad,previous=new Set()){
 const held=new Set();if(pad?.connected)for(const [action,n] of Object.entries(PAD))if(pad.buttons[n]?.pressed)held.add(action);
 const edges=new Set([...held].filter(x=>!previous.has(x))),axis=n=>Math.abs(pad?.axes[n]||0)>.18?Math.max(-1,Math.min(1,pad.axes[n])):0;
 return {held,edges,x:axis(0),y:axis(1)};
}
export class LocalInput {
 constructor({onMenu=()=>{},onDisconnect=()=>{},getPads=()=>navigator.getGamepads?.()||[]}={}){
  Object.assign(this,{onMenu,onDisconnect,getPads});this.enabled=false;this.sources=['keyboard','keyboard'];this.keys=new Set();this.edges=[new Set(),new Set()];this.pointers=new Map();this.previous=[new Set(),new Set()];this.pad=[{},{}];this.wasConnected=[false,false];this.neutral=[true,true];this.abort=new AbortController();
  const listen=(t,n,f)=>t.addEventListener(n,f,{signal:this.abort.signal});
  listen(window,'keydown',e=>{
   if(/INPUT|SELECT|TEXTAREA/.test(e.target?.tagName))return;
   if(e.code==='Escape'&&!e.repeat){e.preventDefault();onMenu(0);return;}
   if(!this.enabled)return;
   for(let i=0;i<2;i++)if(this.sources[i]==='keyboard')for(const [action,key] of Object.entries(KEYSETS[i]))if(e.code===key){e.preventDefault();if(!e.repeat)this.edges[i].add(action);this.keys.add(e.code);}
  });
  listen(window,'keyup',e=>this.keys.delete(e.code));
  listen(window,'blur',()=>this.clear());
  listen(document,'visibilitychange',()=>{if(document.hidden)this.clear();});
  for(const name of ['pointerup','pointercancel'])listen(window,name,e=>this.pointers.delete(e.pointerId));
 }
 configure(sources){
  if(sources.length!==2||sources.some(s=>s!=='keyboard'&&s!=='touch'&&!/^pad:\d+$/.test(s)))throw Error('Choose controls for both players.');
  if(sources[0].startsWith('pad:')&&sources[0]===sources[1])throw Error('Each player needs a different controller.');
  this.sources=[...sources];this.clear();this.wasConnected=[false,false];
 }
 clear(){this.keys.clear();this.pointers.clear();this.edges.forEach(s=>s.clear());this.previous=[new Set(),new Set()];this.neutral=[true,true];this.pad=[{},{}];}
 bindButton(element,player,action){
  element.addEventListener('pointerdown',e=>{
   if(!this.enabled||e.button!==0)return;e.preventDefault();element.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,{player,action});this.edges[player].add(action);
  },{signal:this.abort.signal});
  element.addEventListener('lostpointercapture',e=>this.pointers.delete(e.pointerId),{signal:this.abort.signal});
 }
 poll(){
  let pads=[];try{pads=this.getPads();}catch{}
  this.sources.forEach((source,i)=>{
   if(!source.startsWith('pad:'))return;
   const pad=pads[Number(source.slice(4))],connected=!!pad?.connected;
   if(this.wasConnected[i]&&!connected){this.clear();this.onDisconnect(i);}
   this.wasConnected[i]=connected;
   const value=samplePad(pad,this.previous[i]);this.previous[i]=value.held;
   if(this.neutral[i]){this.neutral[i]=!!(value.held.size||value.x||value.y);this.pad[i]={};return;}
   this.pad[i]=value;
   if(value.edges.has('pause')){this.onMenu(i);this.neutral[i]=true;return;}
   if(this.enabled)value.edges.forEach(x=>this.edges[i].add(x));
  });
 }
 sample(player){
  if(!this.enabled)return {};
  const p=this.pad[player]||{},held=action=>p.held?.has(action)||(this.sources[player]==='keyboard'&&this.keys.has(KEYSETS[player][action]))||[...this.pointers.values()].some(x=>x.player===player&&x.action===action);
  const edge=this.edges[player],move=p.x||Number(held('right'))-Number(held('left'));
  const result={move,vertical:p.y||Number(held('down'))-Number(held('up')),run:held('run')||this.sources[player]==='touch'||Math.abs(p.x||0)>.72,punchHeld:!!held('punch'),kickHeld:!!held('kick'),powers:[0,1,2,3].map(i=>edge.has('power'+i))};
  for(const k of ['jump','punch','kick','interact','portal','heal','tree','nextTarget'])result[k]=edge.has(k);
  edge.clear();return result;
 }
 destroy(){this.abort.abort();this.clear();}
}
