import {drawLegendaryWorld as originalWorld} from '../../royale/legendary-art.mjs?bossFallback=1';
import {drawDangerZone,bossTheme} from './effects.mjs';
export {drawLegendarySky,drawMergeWorld,drawRemains} from '../../royale/legendary-art.mjs?bossFallback=1';
export function drawLegendaryWorld(c,g){
 if(g.arenaScene?.cleared)return originalWorld(c,g);
 // Main attack cues are drawn once by drawArena. Hazards outlive boss recovery.
 for(const z of g.legendaryHazards||[])drawDangerZone(c,z,{theme:bossTheme(z.source||g.arenaScene.boss),shape:z.kind,time:g.time,active:true});
}
