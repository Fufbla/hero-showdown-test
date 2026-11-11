// Only the 0000000000 V2 sandbox may use the eight-frame custom run.
// Everything else (idle, jumps, powers, outfits, saves, physics) is unchanged.
export const V2_RUN_CYCLE_VERSION='v2-run-eight-keyframes-v1';
export function useV2RunCycle(hero,game,spritesEnabled=false) {
 if(!spritesEnabled||game?.testPowers!==true||!hero)return false;
 if(hero.dead||hero.stun>0||hero.grounded!==true||hero.flying||hero.steel||hero.agile||hero.attack)return false;
 if((hero.castAge??1)<.24||(hero.dodgeAge??1)<.22||(hero.respawnAge??1)<.6)return false;
 // A learned Speed power needs an animated run even in the 180–220px/s
 // range. Otherwise the static Speed storyboard overrides the run cycle.
 // Heroes without Speed retain the original >220px/s run threshold.
 const speedLearned=Number(game?.powers?.data?.levels?.speed)>0;
 if(Math.abs(Number(hero.vx)||0)<=(speedLearned?160:220))return false;
 const active=game?.powers?.active||{};
 if(['flight','roots','whirlwind','steel','agility','superKick'].some(id=>active[id]))return false;
 return true;
}
