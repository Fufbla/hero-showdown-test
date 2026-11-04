// The client sends intentions, never coordinates, damage, loot or progression.
export const PROTOCOL = 2;
export const ROOM_CODE = /^[A-HJ-NP-Z2-9]{10}$/;
export const INPUT_KEYS = ['move','vertical','run','jump','punch','kick','punchHeld','kickHeld','heal','interact','portal','tree','nextTarget','powers'];
export function inputPacket(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(k=>!INPUT_KEYS.includes(k))) throw Error('Invalid input.');
  const input={};
  for(const key of ['move','vertical']) {
    const n=raw[key]??0;if(!Number.isFinite(n)||Math.abs(n)>1)throw Error('Invalid movement.');input[key]=n;
  }
  for(const key of INPUT_KEYS.filter(k=>!['move','vertical','powers'].includes(k))) {
    if(raw[key]!==undefined&&typeof raw[key]!=='boolean')throw Error('Invalid button.');input[key]=raw[key]===true;
  }
  if(raw.powers!==undefined&&(!Array.isArray(raw.powers)||raw.powers.length>4||raw.powers.some(v=>typeof v!=='boolean')))throw Error('Invalid ability input.');
  input.powers=Array.from({length:4},(_,i)=>raw.powers?.[i]===true);return input;
}
export function consumeEdges(input) {
  return {move:input.move,vertical:input.vertical,run:input.run,punchHeld:input.punchHeld,kickHeld:input.kickHeld};
}
export function sequence(n) {if(!Number.isSafeInteger(n)||n<1)throw Error('Invalid sequence.');return n;}
export function roomCode(raw) {if(typeof raw!=='string'||!ROOM_CODE.test(raw))throw Error('Enter the ten-character room code.');return raw;}
