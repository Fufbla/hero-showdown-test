// Only the 0000000000 V2 sandbox may use the eight-frame custom run.
// Everything else (idle, jumps, powers, outfits, saves, physics) is unchanged.
export const V2_RUN_CYCLE_VERSION='v2-run-eight-keyframes-v1';
export function useV2RunCycle(hero,game,spritesEnabled=false) {
 if(!spritesEnabled||game?.testPowers!==true||!hero)return false;
 if(hero.dead||hero.stun>0||hero.grounded!==true||hero.flying||hero.steel||hero.agile||hero.attack)return false;
 if((hero.castAge??1)<.24||(hero.dodgeAge??1)<.22||(hero.respawnAge??1)<.6)return false;
 // Ordinary walking, stationary poses and every jump keep their prior art.
 if(Math.abs(Number(hero.vx)||0)<=220)return false;
 const active=game?.powers?.active||{};
 if(['flight','roots','whirlwind','steel','agility','superKick'].some(id=>active[id]))return false;
 return true;
}
