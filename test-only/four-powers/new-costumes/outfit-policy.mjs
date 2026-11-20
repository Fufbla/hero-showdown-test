import * as base from '../../../royale/fashion/outfit-policy.mjs?four-base=1';
import {NEW_OUTFITS} from './definitions.mjs';
import {NEW_COSTUMES_TEST_ENABLED,isNewCostumesTestContext} from './scope.mjs';
export const {OUTFIT_PRICE,CLOTHING_SLOTS,LEGACY_CLOTHING_SLOTS,RETIRED_COSMETIC_IDS,isRetiredCosmeticId}=base;
export const OUTFIT_POLICY_VERSION=NEW_COSTUMES_TEST_ENABLED?'reserved-four-costumes-v1':base.OUTFIT_POLICY_VERSION;
const pieces=new Map();
const additions=Object.fromEntries(NEW_OUTFITS.map(({id,name,coinPrice})=>{
 if(base.OUTFIT_POLICIES[id])throw Error('Duplicate reserved costume ID: '+id);
 const piece=Object.freeze({id:id+'.fullbody',category:'fullbody',coinPrice,setId:id});
 pieces.set(piece.id,piece);
 const parts=Object.freeze([piece]);
 return [id,Object.freeze({id,name,category:'set',coinPrice,pieces:parts,historicalPieces:parts})];
}));
const testPolicies=Object.freeze({...base.OUTFIT_POLICIES,...additions});
const testPolicy=Object.freeze({OUTFIT_POLICIES:testPolicies,
 historicalPiece:id=>pieces.get(id)||base.historicalPiece(id),
 outfitForPiece:id=>pieces.has(id)?testPolicies[pieces.get(id).setId]:base.outfitForPiece(id)});
const basePolicy=Object.freeze({OUTFIT_POLICIES:base.OUTFIT_POLICIES,historicalPiece:base.historicalPiece,outfitForPiece:base.outfitForPiece});
export const policyForContext=context=>isNewCostumesTestContext(context)?testPolicy:basePolicy;
export const {OUTFIT_POLICIES,historicalPiece,outfitForPiece}=NEW_COSTUMES_TEST_ENABLED?testPolicy:basePolicy;
