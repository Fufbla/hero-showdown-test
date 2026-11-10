import {ClothingAssets} from './assets.mjs';
import {catalogIndex} from './state.mjs';

// One decoded cache for all heroes and previews. No network work is performed
// for an empty/hidden wardrobe, or on each animation frame after a failure.
export class ClothingRuntime {
 constructor({assets=new ClothingAssets(),readJSON,notify=()=>{},limit=4}={}){
  this.assets=assets;this.readJSON=readJSON|| (async path=>{const r=await fetch(new URL(path,import.meta.url),{cache:'no-cache'});if(!r.ok)throw Error('Clothing artwork unavailable.');return r.json();});
  this.notify=notify;this.limit=limit;this.selections=new Map();this.manifests=new Map();
 }
 async catalog(){
  if(!this.catalogPromise)this.catalogPromise=this.readJSON('./catalog.json').then(data=>({data,index:catalogIndex(data)})).catch(e=>{this.catalogPromise=null;throw e;});
  return this.catalogPromise;
 }
 async manifest(path){
  if(!/^\.\/assets\/[a-zA-Z0-9/_-]+\.json$/.test(path))throw Error('Invalid clothing manifest.');
  if(!this.manifests.has(path))this.manifests.set(path,this.readJSON(path).catch(e=>{this.manifests.delete(path);throw e;}));
  return this.manifests.get(path);
 }
 key(ids,review){return (review?'review:':'play:')+[...new Set(ids)].sort().join('|');}
 async loadIds(ids,{review=false,retry=false}={}){
  const key=this.key(ids,review),old=this.selections.get(key);
  if(old&&!retry){if(old.error)throw old.error;return old.promise;}
  const entry={layers:[],promise:null,error:null};this.selections.set(key,entry);
  entry.promise=(async()=>{
   const {index}=await this.catalog();
   const parts=[...new Set(ids)].map(id=>index.get(id));
   if(parts.some(p=>!p?.assetManifest||!(p.availability==='released'||review&&p.availability==='fitting')))throw Error('This clothing is still being prepared.');
   const layers=await Promise.all(parts.map(async p=>{const manifest=await this.manifest(p.assetManifest);return {id:p.id,category:p.category,manifest,image:await this.assets.load(manifest)};}));
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
  if(!state?.visible)return [];
  const ids=Object.values(state.equipped||{});if(!ids.length)return [];
  const key=this.key(ids,false),entry=this.selections.get(key);
  if(entry){this.selections.delete(key);this.selections.set(key,entry);return entry.layers;}
  void this.loadIds(ids).catch(()=>{});return [];
 }
}
export const clothingRuntime=new ClothingRuntime({notify:()=>{if(typeof window!=='undefined')window.dispatchEvent(new Event('clothing-ready'));}});
