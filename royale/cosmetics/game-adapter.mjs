import {cosmeticTransaction} from './state.mjs';
// Caller must use the existing durable transaction/save queue and await its
// acknowledgement before showing a purchase as confirmed. Not enabled in UI.
export function applyClothingAction(game,index,operation){
 const result=cosmeticTransaction({state:game.cosmetics,coins:game.hero.coins,index,operation,safe:game.paused&&game.canSave(),atWardrobe:!!game.treeVisit});
 if(!result.ok)return result;
 game.cosmetics=result.state;game.hero.coins=result.coins;
 game.recordEconomy(result.debit?'purchase':'equip',-result.debit);
 return result;
}
