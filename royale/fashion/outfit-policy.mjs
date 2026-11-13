import * as base from '../../royale-v3-staging/costumes/outfit-policy.mjs?fashion-base=1';
import {extendPolicy} from './extend-policy.mjs';
export const {OUTFIT_PRICE,CLOTHING_SLOTS,LEGACY_CLOTHING_SLOTS,RETIRED_COSMETIC_IDS,isRetiredCosmeticId}=base;
export const OUTFIT_POLICY_VERSION='approved-collection-v4-fashion';
export const {OUTFIT_POLICIES,historicalPiece,outfitForPiece}=extendPolicy(base);
