// Every power-armor helmet is registered around the face opening, including
// open crowns. An open crown retains hair but is not a small floating badge.
// Audited against all 81 source sheets (front/profile/rear).
const collections=new Set(['fireball','steel','roots','strength','whirlwind','superKick','speed','agility','flight']);
const openCrowns=new Set(['roots-lattice','roots-mangrove','steel-polaris','strength-atlas','strength-piston','agility-flick','agility-orbit','flight-firmament','fireball-phoenix','fireball-corona','fireball-supernova','steel-aegis','roots-worldroot','strength-fault','speed-mach','flight-kestrel']);
const openFront=new Set(['fireball-ember','fireball-kiln','fireball-forge','fireball-furnace','steel-breakwater','steel-rail','steel-boreal','steel-lock','strength-ram','flight-glider','flight-vortex']);
export function headwearFit(item,view='front'){
 const armor=collections.has(item?.setId?.split('-')[0]);
 const halfFront=item?.setId==='agility-prism'&&['front','game'].includes(view);
 const shell=!halfFront&&armor&&!openCrowns.has(item.setId)&&!(['front','game'].includes(view)&&openFront.has(item.setId));
 return {mirrorProfile:['speed-relay','speed-switchback'].includes(item?.setId),hair:shell?'tucked':'open',width:halfFront?.68:armor?1.38:1.14,profileWidth:armor?1.32:.95,bottom:armor?.35:-.15,center:halfFront?-.30:armor?-.10:0};
}
