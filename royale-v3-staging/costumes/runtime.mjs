import {COLLECTION,costumeById,costumeForState} from './catalog.mjs';
import {costumeSprites} from './engine.mjs';
import {ClothingAssets,bodyClothingLayers} from '../../royale/cosmetics/assets.mjs';
import {catalogIndex,outfitSelection,selectedOutfit,isRetiredCosmeticId} from '../../royale/cosmetics/state.mjs';
import {outfitForPiece} from '../../royale/cosmetics/outfit-policy.mjs';

function completeIds(ids){
 const active=[...new Set(ids)].filter(id=>!isRetiredCosmeticId(id));
 if(!active.length)return [];
 const set=outfitForPiece(active[0]),expected=Object.values(outfitSelection(set));
 if(!set||active.length!==expected.length||active.some(id=>!expected.includes(id)))
  throw Error('Choose a complete matching outfit.');
 return expected;
}

// One decoded cache for all heroes and previews. No network work is performed
// for an empty/hidden wardrobe, or on each animation frame after a failure.
export class ClothingRuntime {
 constructor({assets=new ClothingAssets(),readJSON,notify=()=>{},limit=8}={}){
  this.assets=assets;this.readJSON=readJSON|| (async path=>{const r=await fetch(new URL(path,new URL('../../royale/cosmetics/',import.meta.url)),{cache:'no-cache'});if(!r.ok)throw Error('Clothing artwork unavailable.');return r.json();});
  this.notify=notify;this.limit=limit;this.selections=new Map();this.manifests=new Map();
 }
 async catalog(){
  if(!this.catalogPromise)this.catalogPromise=Promise.resolve().then(()=>{const data={version:1,sets:COLLECTION};return {data,index:catalogIndex(data)};}).catch(e=>{this.catalogPromise=null;throw e;});
  return this.catalogPromise;
 }
 async manifest(path){
  if(!/^\.\/assets\/[a-zA-Z0-9/_-]+\.json$/.test(path))throw Error('Invalid clothing manifest.');
  if(!this.manifests.has(path))this.manifests.set(path,this.readJSON(path).catch(e=>{this.manifests.delete(path);throw e;}));
  return this.manifests.get(path);
 }
 key(ids,review){return (review?'review:':'play:')+[...new Set(ids)].sort().join('|');}
 async loadOutfit(set,options={}){
  const ids=Object.values(outfitSelection(set));
  if(!ids.length)throw Error('Choose a complete matching outfit.');
  return this.loadIds(ids,options);
 }
 async loadIds(ids,{review=false,retry=false}={}){
  const costume=ids.length===1&&COLLECTION.find(o=>o.pieces[0].id===ids[0]);
  if(costume){if(!await costumeSprites.preload(costume.id))throw Error(costumeSprites.error);this.notify();return [{id:costume.pieces[0].id,category:'fullbody',costumeId:costume.id}];}
  // Reject mixed/partial requests before even opening the catalog. Retired
  // hats and face accessories cannot make an otherwise complete outfit fail.
  ids=completeIds(ids);
  if(!ids.length)return [];
  const key=this.key(ids,review),old=this.selections.get(key);
  if(old&&!retry){if(old.error)throw old.error;return old.promise;}
  const entry={layers:[],promise:null,error:null};this.selections.set(key,entry);
  entry.promise=(async()=>{
   const {index}=await this.catalog();
   const parts=[...new Set(ids)].map(id=>index.get(id));
   if(parts.some(p=>!p?.assetManifest||!(p.availability==='released'||review&&p.availability==='fitting')))throw Error('This clothing is still being prepared.');
   const layers=await Promise.all(parts.map(async p=>{
    const source=await this.manifest(p.assetManifest);
    const body=bodyClothingLayers({id:p.id,category:p.category,manifest:source});
    if(!body.length)throw Error('Outfit body artwork is unavailable.');
    const manifest={...source,layers:body,hair:'preserved',covers:source.covers?.filter(region=>region!=='helmet'&&region!=='mask')};
    return {id:p.id,category:p.category,manifest,image:await this.assets.load(manifest)};
   }));
   entry.layers=layers;
   this.notify();return layers;
  })().catch(error=>{entry.error=error;throw error;}).finally(()=>{
   // Failed previews also count toward the bound; browsing unavailable pieces
   // must not accumulate an unbounded collection of rejected promises.
   while(this.selections.size>this.limit)this.selections.delete(this.selections.keys().next().value);
  });
  return entry.promise;
 }
 layers(state){
  const costume=costumeForState(state);
  if(costume){if(!costumeSprites.outfits.has(costume.id))void costumeSprites.preload(costume.id).then(ok=>{if(ok)this.notify();});return [{id:costume.pieces[0].id,category:'fullbody',costumeId:costume.id}];}
  if(!state?.visible)return [];
  // Compact network appearances carry no ownership ledger. They may render
  // only the complete selection actually present in that appearance packet.
  const selection=Array.isArray(state.owned)?state:{...state,owned:Object.values(state.equipped||{})};
  const set=selectedOutfit(selection);if(!set)return [];
  const ids=Object.values(outfitSelection(set));
  const key=this.key(ids,false),entry=this.selections.get(key);
  if(entry){this.selections.delete(key);this.selections.set(key,entry);return entry.layers;}
  void this.loadIds(ids).catch(()=>{});return [];
 }
}
export const clothingRuntime=new ClothingRuntime({notify:()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event('clothing-ready'));}});
