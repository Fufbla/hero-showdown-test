import { decodeSave, SAVE_KEY } from './core.mjs';
import { CAMPS, regionAt } from './world.mjs';
export const PROFILE_KEY='healthia.royale.profiles.v2';
export const SLOT_COUNT=3;
const blank=()=>({version:2,revision:0,activeSlot:0,legacyImported:false,slots:[null,null,null]});
const copy=value=>JSON.parse(JSON.stringify(value));
export function parseProfiles(text){
  try{
    const data=JSON.parse(text);
    if(data?.version!==2||!Array.isArray(data.slots)||data.slots.length!==SLOT_COUNT)return null;
    const result=blank();result.revision=Number.isSafeInteger(data.revision)&&data.revision>=0?data.revision:0;
    result.activeSlot=[0,1,2].includes(data.activeSlot)?data.activeSlot:0;result.legacyImported=data.legacyImported===true;
    for(let i=0;i<3;i++){
      const slot=data.slots[i];if(slot===null)continue;
      const snapshot=decodeSave(JSON.stringify(slot?.snapshot));
      if(!snapshot||typeof slot.id!=='string'||!slot.id) return null; // Preserve damaged envelopes for recovery; never silently drop a hero.
      result.slots[i]={id:slot.id,createdAt:typeof slot.createdAt==='string'?slot.createdAt:null,updatedAt:typeof slot.updatedAt==='string'?slot.updatedAt:null,
        lastRegion:typeof slot.lastRegion==='string'?slot.lastRegion.slice(0,100):'Coastal Beginnings',snapshot};
    }
    return result;
  }catch{return null;}
}
export class LocalHeroStore{
  constructor(storage,{now=()=>new Date().toISOString(),id=()=>globalThis.crypto?.randomUUID?.()||`local-${Date.now()}-${Math.random().toString(36).slice(2)}`}={}){
    this.storage=storage;this.now=now;this.id=id;this.data=blank();this.writable=true;this.durable=true;this.message='';this.lastRaw=null;this.load();
  }
  load(){
    this.writable=true;this.durable=true;this.message='';
    try{
      const raw=this.storage.getItem(PROFILE_KEY);this.lastRaw=raw;
      if(raw!==null){const parsed=parseProfiles(raw);if(!parsed){this.writable=false;this.durable=false;this.message='Stored hero data needs recovery. It has been left untouched. This session will not overwrite it.';return;}this.data=parsed;return;}
      const legacy=this.storage.getItem(SAVE_KEY),snapshot=decodeSave(legacy);
      if(legacy!==null&&!snapshot){this.writable=false;this.durable=false;this.message='An older save could not be read. It has been left untouched.';return;}
      if(snapshot){this.data.slots[0]={id:this.id(),createdAt:null,updatedAt:null,lastRegion:`Coastal Beginnings · ${regionAt(CAMPS[snapshot.checkpoint].x).name}`,snapshot};this.data.legacyImported=true;this.message='Your Phase 1 hero is in slot 1. The original save is retained.';this.flush(this.data);}
    }catch{this.durable=false;this.message='Browser storage is unavailable. Heroes will last for this session only.';}
  }
  slot(index){return this.data.slots[index]?copy(this.data.slots[index]):null;}
  flush(next){
    if(!this.writable)return {ok:false,error:this.message};
    const candidate=copy(next);candidate.revision=this.data.revision+1;
    try{
      const current=this.storage.getItem(PROFILE_KEY);
      if(current!==this.lastRaw){this.writable=false;this.durable=false;this.message='Heroes changed in another tab. Reload before saving here to avoid overwriting them.';return {ok:false,error:this.message};}
      const raw=JSON.stringify(candidate);this.storage.setItem(PROFILE_KEY,raw);this.lastRaw=raw;this.data=candidate;this.durable=true;return {ok:true};
    }catch{this.data=candidate;this.durable=false;this.message='Saving is unavailable. Keep this tab open; this patrol is only in memory.';return {ok:false,retained:true,error:this.message};}
  }
  writeSlot(index,snapshot,{region='Coastal Beginnings',expectedId}={}){
    if(![0,1,2].includes(index))throw Error('Invalid hero slot');
    const state=decodeSave(typeof snapshot==='string'?snapshot:JSON.stringify(snapshot));if(!state)throw Error('Invalid hero snapshot');
    const current=this.data.slots[index];
    if(expectedId!==undefined&&(current?.id??null)!==expectedId)return {ok:false,error:'This hero slot changed. Select it again before saving.'};
    const next=copy(this.data),now=this.now();
    next.slots[index]={id:current?.id||this.id(),createdAt:current?.createdAt||now,updatedAt:now,lastRegion:String(region).slice(0,100),snapshot:state};next.activeSlot=index;next.legacyImported=true;
    return this.flush(next);
  }
  deleteSlot(index,expectedId){
    if(![0,1,2].includes(index))throw Error('Invalid hero slot');
    if(!expectedId||this.data.slots[index]?.id!==expectedId)return {ok:false,error:'This hero slot changed. Select it again.'};
    const next=copy(this.data);next.slots[index]=null;next.legacyImported=true;
    return this.flush(next);
  }
}
