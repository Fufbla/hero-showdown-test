import {drawHero as drawOriginal} from '../gameplay/hero-art.mjs?costume-base=1';
import {costumeSprites} from './engine.mjs';
export function drawHero(c,x,y,look,hero,time,scale=1,options={}){
 const id=options.clothing?.find(layer=>layer.costumeId)?.costumeId;
 if(id){const pose=costumeSprites.draw(c,x,y,look,hero,time,{id,scale,owner:options.owner||hero});if(pose)return pose;}
 return drawOriginal(c,x,y,look,hero,time,scale,options);
}
