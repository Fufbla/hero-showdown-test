import * as base from '../../../royale/fashion/outfit-policy.mjs?four-base=1';
import {VICE_OUTFIT} from './definitions.mjs';
import {isViceTestContext,VICE_TEST_ENABLED} from './scope.mjs';

export const {OUTFIT_PRICE,CLOTHING_SLOTS,LEGACY_CLOTHING_SLOTS,RETIRED_COSMETIC_IDS,isRetiredCosmeticId}=base;
export const OUTFIT_POLICY_VERSION=VICE_TEST_ENABLED?'approved-collection-v4-fashion-vice-test':base.OUTFIT_POLICY_VERSION;
const piece=Object.freeze({id:VICE_OUTFIT.id+'.fullbody',category:'fullbody',coinPrice:VICE_OUTFIT.coinPrice,setId:VICE_OUTFIT.id});
const pieces=Object.freeze([piece]);
const policy=Object.freeze({...VICE_OUTFIT,category:'set',pieces,historicalPieces:pieces});
const testPolicies=Object.freeze({...base.OUTFIT_POLICIES,[VICE_OUTFIT.id]:policy});
const testHistory=id=>id===piece.id?piece:base.historicalPiece(id);
const testOutfit=id=>id===piece.id?policy:base.outfitForPiece(id);
const testScope=Object.freeze({OUTFIT_POLICIES:testPolicies,historicalPiece:testHistory,outfitForPiece:testOutfit});
const ordinaryScope=Object.freeze({OUTFIT_POLICIES:base.OUTFIT_POLICIES,historicalPiece:base.historicalPiece,outfitForPiece:base.outfitForPiece});
export const policyForContext=context=>isViceTestContext(context)?testScope:ordinaryScope;
export const {OUTFIT_POLICIES,historicalPiece,outfitForPiece}=VICE_TEST_ENABLED?testScope:ordinaryScope;
