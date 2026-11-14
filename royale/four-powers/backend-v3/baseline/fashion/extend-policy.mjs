// Pure policy extension, shared verbatim with the existing live save service.
import {FASHION_OUTFITS} from './definitions.mjs';
export function extendPolicy(base){
 const pieces=new Map();
 const additions=Object.fromEntries(FASHION_OUTFITS.map(({id,name})=>{
  if(base.OUTFIT_POLICIES[id])throw Error('Costume ID already registered: '+id);
  const piece=Object.freeze({id:id+'.fullbody',category:'fullbody',coinPrice:base.OUTFIT_PRICE,setId:id});
  pieces.set(piece.id,piece);
  const parts=Object.freeze([piece]);
  return [id,Object.freeze({id,name,category:'set',coinPrice:base.OUTFIT_PRICE,pieces:parts,historicalPieces:parts})];
 }));
 const OUTFIT_POLICIES=Object.freeze({...base.OUTFIT_POLICIES,...additions});
 const historicalPiece=id=>pieces.get(id)||base.historicalPiece(id);
 const outfitForPiece=id=>pieces.has(id)?OUTFIT_POLICIES[pieces.get(id).setId]:base.outfitForPiece(id);
 return {OUTFIT_POLICIES,historicalPiece,outfitForPiece};
}
