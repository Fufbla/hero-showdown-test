import * as base from './outfit-policy-base.mjs';
import {extendPolicy} from '../../fashion/extend-policy.mjs';
export const {OUTFIT_PRICE,CLOTHING_SLOTS,LEGACY_CLOTHING_SLOTS,RETIRED_COSMETIC_IDS,isRetiredCosmeticId}=base;
export const OUTFIT_POLICY_VERSION='approved-collection-v4-fashion';
export const {OUTFIT_POLICIES,historicalPiece,outfitForPiece}=extendPolicy(base);
