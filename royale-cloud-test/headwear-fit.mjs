// Closed shells tuck the crown underneath; open crests and circlets retain hair.
// Item identities, artwork, equipment stats and saved appearances are unchanged.
const closed=new Set(['fireball-ember','fireball-kiln','fireball-forge','fireball-furnace','steel-rivet','steel-breakwater','steel-rail','steel-boreal','steel-tortoise','steel-lock','roots-seed','strength-striker','strength-ram','whirlwind-slipstream','whirlwind-crosswind','whirlwind-venturi','superKick-spar','superKick-pivot','superKick-wheel','speed-starter','speed-relay','speed-velodrome','speed-apex','speed-pulse','flight-swift','flight-glider','flight-vortex']);
const openFront=new Set(['fireball-ember','fireball-kiln','fireball-forge','flight-glider','flight-vortex','fireball-furnace','steel-breakwater','steel-rail','steel-boreal','steel-lock','strength-ram']);
export function headwearFit(item,view='front'){
 const shell=closed.has(item?.setId)&&(!['front','game'].includes(view)||!openFront.has(item?.setId));
 return {mirrorProfile:item?.setId==='speed-relay',hair:shell?'tucked':'open',width:shell?1.38:1.14,profileWidth:shell?1.32:.95,bottom:shell?.35:-.15,center:shell?-.10:0};
}
