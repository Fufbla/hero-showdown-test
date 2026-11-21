// Review imports retain the same permanent ownership rules as production.
export * from '../../../royale/fashion/outfit-policy.mjs?four-base=1';
import {OUTFIT_POLICIES,historicalPiece,outfitForPiece} from '../../../royale/fashion/outfit-policy.mjs?four-base=1';
const releasedPolicy=Object.freeze({OUTFIT_POLICIES,historicalPiece,outfitForPiece});
export const policyForContext=()=>releasedPolicy;
