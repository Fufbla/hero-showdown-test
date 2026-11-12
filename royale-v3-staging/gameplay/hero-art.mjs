import {drawHero as drawCharacter} from '../../royale/style-c-hero.mjs';
import {armorFreeAppearance} from './armor-appearance.mjs';

// Shared by gameplay, roster, creator, previews, online peers and both co-op players.
export function drawHero(c,x,y,look,hero,time,scale=1,options={}){
  return drawCharacter(c,x,y,look,hero,time,scale,{
    ...options,outfit:armorFreeAppearance(options.outfit)
  });
}
