import {COLLECTION,costumeById} from './catalog.mjs';
import {costumeSprites} from './engine.mjs';
// Uses the sale catalog automatically. Trials never change a hero, wallet,
// ownership ledger or cloud snapshot; only the reserved test renderer reads this.
export const trialOutfits=()=>COLLECTION;
export class OutfitTrial {
 constructor(engine=costumeSprites){this.engine=engine;this.active=false;this.id=null;this.request=0;}
 async choose(id){
  if(!costumeById(id))return false;
  const request=++this.request;
  if(!await this.engine.preload(id)||request!==this.request)return false;
  this.id=id;this.active=true;return true;
 }
 original(){this.request++;this.id=null;this.active=true;}
 clear(){this.request++;this.id=null;this.active=false;}
 selected(savedState){return this.active?costumeById(this.id):savedState;}
}
export const outfitTrial=new OutfitTrial();
