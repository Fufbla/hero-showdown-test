// Live and reserved heroes share the approved catalog; never append twice.
export * from '../../../royale/fashion/catalog.mjs?four-base=1';
import {COLLECTION} from '../../../royale/fashion/catalog.mjs?four-base=1';
export const catalogForContext=()=>COLLECTION;
