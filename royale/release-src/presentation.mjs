// The approved complete-frame character presentation, shared by ordinary heroes.
// Rendering does not write appearance, equipment, currency, or power snapshots.
import {kingJamesSprites,STEEL_ID} from '../../royale-v3-staging/kingjames/outfit-engine.mjs';
import {kingJamesFX} from '../../royale-v3-staging/kingjames/motion-fx.mjs';
import {kingJamesAttackFX} from '../../royale-v3-staging/kingjames/attack-fx.mjs';
import {costumeSprites} from '../../royale-v3-staging/costumes/engine.mjs';
import {setCosmeticPreviewRenderer} from '../../royale-v3-staging/gameplay/armor-preview.mjs';

kingJamesSprites.selected=()=>kingJamesSprites.enabled?'kingjames-original':null;
export async function prepareReleaseArt(){
  const ready=await Promise.all([kingJamesSprites.preload(),kingJamesSprites.preload(STEEL_ID),kingJamesFX.preload(),kingJamesAttackFX.preload()]);
  if(!ready.every(Boolean))throw Error('Hero artwork could not load. Please reload the game.');
  kingJamesSprites.enabled=true;
  setCosmeticPreviewRenderer((c,x,y,look,hero,time,scale,view)=>drawHero(c,x,y,look,hero,time,scale,{view}));
}
export function drawHero(c,x,y,look,hero,time,scale=1,options={}){
  const face=options.view==='left'||options.view==='back'?-1:options.view?1:hero.face;
  const h={...hero,face},owner=options.owner||hero;
  const id=options.clothing?.find(layer=>layer.costumeId)?.costumeId;
  if(id){const pose=costumeSprites.draw(c,x,y,look,h,time,{id,owner,scale});if(pose)return pose;}
  return kingJamesSprites.draw(c,x,y,look,h,time,{owner,scale});
}
