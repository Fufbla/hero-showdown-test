// Compatibility for the original review tools; live and reserved test heroes
// now share one released catalog, so Vice must never be appended twice.
export * from '../../../royale/fashion/catalog.mjs?four-base=1';
import {COLLECTION} from '../../../royale/fashion/catalog.mjs?four-base=1';
export const catalogForContext=()=>COLLECTION;
