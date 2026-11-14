// The public test code has never been a cloud credential. This sandbox adapter
// deliberately has no fetcher, token, network endpoint or production storage key.
import {decodeSave} from '../../royale/core.mjs';
import {createTestSnapshot,TEST_CODE,TEST_PREFIX} from './review.mjs';
import {preparePowerReset} from '../../royale-v3-staging/power-reset.mjs';
let counter=0;
export class SaveConflict extends Error{}
export class CloudProfile {
 constructor({storage=globalThis.localStorage,onStatus=()=>{}}={}){this.storage=storage;this.onStatus=onStatus;this.identity=TEST_PREFIX+'p'+(counter++%2);this.activeSlots=new Set();this.blocked=new Set();this.slots=[];this.endpoint=null;this.heroEndpoint=null;}
 async login(code){if(code!==TEST_CODE)throw Error('This isolated build only accepts 0000000000.');await this.load();return this;}
 key(){return this.identity+':slots';}
 async resetPowers(slot,snapshot){const result=preparePowerReset(snapshot);const row=await this.save(slot,result.snapshot);return {ok:true,...row};}
 async load(){const raw=this.storage.getItem(this.key());
  if(raw){const slots=JSON.parse(raw);if(!Array.isArray(slots)||slots.some(s=>s.snapshot&&!decodeSave(JSON.stringify(s.snapshot))))throw Error('Test checkpoint could not be read; it has been preserved.');this.slots=slots;}
  else{this.slots=[1,2,3].map(slot=>({slot_number:slot,revision:0,snapshot:slot===1?createTestSnapshot(this.identity.endsWith('p1')?1:0):null}));this.flush();}
  return this.slots;
 }
 flush(){this.storage.setItem(this.key(),JSON.stringify(this.slots));}
 async prepare(slot){if(!this.slots.some(s=>s.slot_number===slot&&s.snapshot))throw Error('Choose a test hero.');}
 async save(slot,snapshot){const row=this.slots.find(s=>s.slot_number===slot);const value=decodeSave(JSON.stringify(snapshot));if(!row||!value)throw Error('Invalid test checkpoint.');const persisted=JSON.parse(this.storage.getItem(this.key()));if(persisted.find(s=>s.slot_number===slot).revision!==row.revision)throw new SaveConflict('This test hero changed in another tab. Reload.');Object.assign(row,{snapshot:value,revision:row.revision+1,updated_at:new Date().toISOString()});this.flush();return row;}
 async create(slot,snapshot,revision){const r=this.slots.find(s=>s.slot_number===slot);if(r.snapshot||r.revision!==revision)throw new SaveConflict('The test slot changed.');return this.save(slot,snapshot);}
 async remove(slot,{confirmed,revision,name}){const r=this.slots.find(s=>s.slot_number===slot);if(!confirmed||r.revision!==revision||r.snapshot?.look.name!==name)throw new SaveConflict('Review this test hero before deleting.');r.snapshot=null;r.revision++;this.flush();return r;}
 remember(key,value){if(!key.startsWith(TEST_PREFIX))throw Error('Invalid test storage key');this.storage.setItem(key,JSON.stringify(value));}
}
