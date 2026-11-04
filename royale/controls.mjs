export const CONTROL_KEY='healthia.royale.controls.v1';
export const CONTROL_NAMES={nextTarget:'Next interaction',left:'Move left',right:'Move right',run:'Run',jump:'Jump',punch:'Punch',kick:'Kick',portal:'Enter portal / Exit',interact:'Pick up item',heal:'Health Root',tree:'Tree of Eris',power0:'Power slot 1',power1:'Power slot 2',power2:'Power slot 3',power3:'Villain Merge power',up:'Fly up',down:'Fly down',pause:'Pause'};
export const DEFAULT_KEYS={nextTarget:['KeyG'],left:['ArrowLeft'],right:['ArrowRight'],run:['ShiftLeft','ShiftRight'],portal:['ArrowUp'],jump:['Space'],punch:['KeyJ','KeyZ'],kick:['KeyK','KeyX'],interact:['KeyE'],heal:['KeyH'],tree:['KeyT'],power0:['Digit1'],power1:['Digit2'],power2:['Digit3'],power3:['Digit4'],up:['KeyW'],down:['ArrowDown','KeyS'],pause:['KeyP']};
export const DEFAULT_PAD={nextTarget:16,jump:0,kick:1,punch:2,interact:3,power0:4,power1:5,run:6,power2:7,power3:8,pause:9,tree:10,heal:11,portal:12,up:-1,down:13,left:14,right:15};
export function normalizeControls(raw={}) {
  const keys=Object.fromEntries(Object.entries(DEFAULT_KEYS).map(([id,codes])=>[id,Array.isArray(raw.keys?.[id])&&raw.keys[id].length&&raw.keys[id].every(c=>/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right))$/.test(c))?raw.keys[id].slice(0,3):[...codes]]));
  const pad=Object.fromEntries(Object.entries(DEFAULT_PAD).map(([id,n])=>[id,Number.isInteger(raw.pad?.[id])&&raw.pad[id]>=-1&&raw.pad[id]<=16?raw.pad[id]:n]));
  // A new action must not steal a key/button that an existing hero rebound in Phase 3.
  if(!raw.keys?.heal){
    const used=new Set(Object.entries(keys).filter(([id])=>id!=='heal').flatMap(([,codes])=>codes));
    const candidates=['KeyH','KeyR','KeyV','KeyC',...Array.from({length:26},(_,i)=>`Key${String.fromCharCode(65+i)}`),...Array.from({length:10},(_,i)=>`Digit${i}`),'ControlRight','ControlLeft','AltRight','AltLeft','ShiftRight','ShiftLeft','ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Space'];
    keys.heal=[candidates.find(code=>!used.has(code))||'KeyH'];
  }
  if(raw.pad?.heal===undefined){const used=new Set(Object.entries(pad).filter(([id])=>id!=='heal').map(([,n])=>n));pad.heal=[11,8,16,...Array.from({length:17},(_,i)=>i)].find(n=>!used.has(n))??11;}
  if(!raw.keys?.power3){const used=new Set(Object.entries(keys).filter(([id])=>id!=='power3').flatMap(([,codes])=>codes));keys.power3=[['Digit4','KeyF','KeyB',...Array.from({length:26},(_,i)=>`Key${String.fromCharCode(65+i)}`)].find(c=>!used.has(c))||'Digit4'];}
  if(raw.pad?.power3===undefined){const used=new Set(Object.entries(pad).filter(([id])=>id!=='power3').map(([,n])=>n));pad.power3=[8,16,...Array.from({length:17},(_,i)=>i)].find(n=>!used.has(n))??8;}
  if(!raw.keys?.nextTarget){const used=new Set(Object.entries(keys).filter(([id])=>id!=='nextTarget').flatMap(([,codes])=>codes));keys.nextTarget=[['KeyG','KeyV','KeyB',...Array.from({length:26},(_,i)=>`Key${String.fromCharCode(65+i)}`)].find(k=>!used.has(k))||'KeyG'];}
  if(raw.pad?.nextTarget===undefined){const used=new Set(Object.entries(pad).filter(([id])=>id!=='nextTarget').map(([,n])=>n));pad.nextTarget=[16,...Array.from({length:17},(_,i)=>i)].find(n=>!used.has(n))??16;}
  // Migrate the former shared actions without resetting unrelated custom bindings.
  if(!raw.version){
    if(JSON.stringify(raw.keys?.jump)===JSON.stringify(['Space','KeyW','ArrowUp']))keys.jump=['Space'];
    if(JSON.stringify(raw.keys?.up)===JSON.stringify(['ArrowUp','KeyW','Space']))keys.up=['KeyW'];
    if(raw.pad?.up===12)pad.up=-1;
  }
  const protectedActions=['portal','jump','interact'];
  const usedKeys=new Set(),usedPad=new Set();
  for(const id of [...protectedActions,...Object.keys(keys).filter(k=>!protectedActions.includes(k))]){
    keys[id]=keys[id].filter(k=>!usedKeys.has(k));
    if(!keys[id].length)keys[id]=[['KeyV','KeyB','KeyN',...Array.from({length:26},(_,i)=>`Key${String.fromCharCode(65+i)}`)].find(k=>!usedKeys.has(k))].filter(Boolean);
    keys[id].forEach(k=>usedKeys.add(k));
    if(pad[id]>=0&&usedPad.has(pad[id]))pad[id]=-1;
    if(pad[id]>=0)usedPad.add(pad[id]);
  }
  const number=(x,min,max,fallback)=>Number.isFinite(Number(x))?Math.max(min,Math.min(max,Number(x))):fallback;
  return {version:2,keys,pad,touch:{stickSize:number(raw.touch?.stickSize,76,106,92),size:number(raw.touch?.size,44,64,52),left:number(raw.touch?.left,0,24,0),right:number(raw.touch?.right,0,24,0),rise:number(raw.touch?.rise,0,20,0)}};
}
export function loadControls(storage){try{return normalizeControls(JSON.parse(storage.getItem(CONTROL_KEY)||'{}'));}catch{return normalizeControls();}}
