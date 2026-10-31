export const CONTROL_KEY='healthia.royale.controls.v1';
export const CONTROL_NAMES={left:'Move left',right:'Move right',run:'Run',jump:'Jump',punch:'Punch',kick:'Kick',interact:'Rest',heal:'Health Root',tree:'Tree of Eris',power0:'Power slot 1',power1:'Power slot 2',power2:'Power slot 3',power3:'Villain Merge power',up:'Fly up',down:'Fly down',pause:'Pause'};
export const DEFAULT_KEYS={left:['KeyA','ArrowLeft'],right:['KeyD','ArrowRight'],run:['ShiftLeft','ShiftRight'],jump:['Space','KeyW','ArrowUp'],punch:['KeyJ','KeyZ'],kick:['KeyK','KeyX'],interact:['KeyE'],heal:['KeyH'],tree:['KeyT'],power0:['Digit1'],power1:['Digit2'],power2:['Digit3'],power3:['Digit4'],up:['ArrowUp','KeyW','Space'],down:['ArrowDown','KeyS'],pause:['KeyP']};
export const DEFAULT_PAD={jump:0,kick:1,punch:2,interact:3,power0:4,power1:5,run:6,power2:7,power3:8,pause:9,tree:10,heal:11,up:12,down:13,left:14,right:15};
export function normalizeControls(raw={}) {
  const keys=Object.fromEntries(Object.entries(DEFAULT_KEYS).map(([id,codes])=>[id,Array.isArray(raw.keys?.[id])&&raw.keys[id].length&&raw.keys[id].every(c=>/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right))$/.test(c))?raw.keys[id].slice(0,3):[...codes]]));
  const pad=Object.fromEntries(Object.entries(DEFAULT_PAD).map(([id,n])=>[id,Number.isInteger(raw.pad?.[id])&&raw.pad[id]>=0&&raw.pad[id]<=16?raw.pad[id]:n]));
  // A new action must not steal a key/button that an existing hero rebound in Phase 3.
  if(!raw.keys?.heal){
    const used=new Set(Object.entries(keys).filter(([id])=>id!=='heal').flatMap(([,codes])=>codes));
    const candidates=['KeyH','KeyR','KeyV','KeyC',...Array.from({length:26},(_,i)=>`Key${String.fromCharCode(65+i)}`),...Array.from({length:10},(_,i)=>`Digit${i}`),'ControlRight','ControlLeft','AltRight','AltLeft','ShiftRight','ShiftLeft','ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Space'];
    keys.heal=[candidates.find(code=>!used.has(code))||'KeyH'];
  }
  if(raw.pad?.heal===undefined){const used=new Set(Object.entries(pad).filter(([id])=>id!=='heal').map(([,n])=>n));pad.heal=[11,8,16,...Array.from({length:17},(_,i)=>i)].find(n=>!used.has(n))??11;}
  if(!raw.keys?.power3){const used=new Set(Object.entries(keys).filter(([id])=>id!=='power3').flatMap(([,codes])=>codes));keys.power3=[['Digit4','KeyF','KeyB',...Array.from({length:26},(_,i)=>`Key${String.fromCharCode(65+i)}`)].find(c=>!used.has(c))||'Digit4'];}
  if(raw.pad?.power3===undefined){const used=new Set(Object.entries(pad).filter(([id])=>id!=='power3').map(([,n])=>n));pad.power3=[8,16,...Array.from({length:17},(_,i)=>i)].find(n=>!used.has(n))??8;}
  const number=(x,min,max,fallback)=>Number.isFinite(Number(x))?Math.max(min,Math.min(max,Number(x))):fallback;
  return {keys,pad,touch:{size:number(raw.touch?.size,44,64,52),left:number(raw.touch?.left,0,24,0),right:number(raw.touch?.right,0,24,0),rise:number(raw.touch?.rise,0,20,0)}};
}
export function loadControls(storage){try{return normalizeControls(JSON.parse(storage.getItem(CONTROL_KEY)||'{}'));}catch{return normalizeControls();}}
