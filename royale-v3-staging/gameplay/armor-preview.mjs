import {drawHero} from './hero-art.mjs';
import {clothingRuntime} from '../../royale/cosmetics/runtime.mjs';

let cosmeticPreview;
// The isolated full-body outfit session supplies its current approved artwork.
// Other sessions use their saved cosmetic selection through the shared renderer.
export function setCosmeticPreviewRenderer(draw){cosmeticPreview=draw;}
export function drawCosmeticPreview(c,x,y,g,hero,time,scale,view){
  return cosmeticPreview?.(c,x,y,g.look,hero,time,scale,view)||
    drawHero(c,x,y,g.look,hero,time,scale,{
      view,outfit:g.visualOutfit(),clothing:clothingRuntime.layers(g.cosmetics)
    });
}
