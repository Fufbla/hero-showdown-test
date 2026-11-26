import {canWearOutfit} from '../cosmetics/eligibility.mjs';
// The approved complete-frame character presentation, shared by ordinary heroes.
// Rendering does not write appearance, equipment, currency, or power snapshots.
import {kingJamesSprites,STEEL_ID} from '../../royale-v3-staging/kingjames/outfit-engine.mjs';
import {kingJamesFX} from '../../royale-v3-staging/kingjames/motion-fx.mjs';
import {kingJamesAttackFX} from '../../royale-v3-staging/kingjames/attack-fx.mjs';
import {costumeSprites} from '../../royale-v3-staging/costumes/engine.mjs';
import {setCosmeticPreviewRenderer} from '../../royale-v3-staging/gameplay/armor-preview.mjs';
import {starterSuit} from '../../royale-v3-staging/starter-suit/engine.mjs';
import {prepareHeroPowerOverlays} from '../v2-sprites/hero-power-overlays.mjs';

kingJamesSprites.selected=()=>kingJamesSprites.enabled?'kingjames-original':null;
export async function prepareReleaseArt(){
  const groups=[
    ['starter suit',()=>starterSuit.preload(),starterSuit],
    ['original outfit',()=>kingJamesSprites.preload(),kingJamesSprites],
    ['steel outfit',()=>kingJamesSprites.preload(STEEL_ID),kingJamesSprites],
    ['motion effects',()=>kingJamesFX.preload(),kingJamesFX],
    ['attack effects',()=>kingJamesAttackFX.preload(),kingJamesAttackFX],
    ['power overlays',()=>prepareHeroPowerOverlays(),null]
  ];
  const failures=await Promise.all(groups.map(async ([name,load,engine])=>{
    let reason='';
    for(let attempt=0;attempt<3;attempt++){
      try{if(await load())return null;reason=engine?.error||'asset unavailable';}
      catch(error){reason=error?.message||String(error);}
      if(attempt<2)await new Promise(resolve=>setTimeout(resolve,400*(attempt+1)));
    }
    return name+': '+reason;
  }));
  if(failures.some(Boolean))throw Error('Hero artwork could not load: '+failures.filter(Boolean).join('; ')+'. Please reload the game.');
  kingJamesSprites.enabled=true;
  kingJamesSprites.starter=starterSuit;
  setCosmeticPreviewRenderer((c,x,y,look,hero,time,scale,view)=>drawHero(c,x,y,look,hero,time,scale,{view}));
}
export function drawHero(c,x,y,look,hero,time,scale=1,options={}){
  const face=options.view==='left'||options.view==='back'?-1:options.view?1:hero.face;
  const h={...hero,face},owner=options.owner||hero;
  const id=options.clothing?.find(layer=>layer.costumeId)?.costumeId;
  if(id&&canWearOutfit(id,look)){const pose=costumeSprites.draw(c,x,y,look,h,time,{id,owner,scale});if(pose)return pose;}
  return kingJamesSprites.draw(c,x,y,look,h,time,{owner,scale,view:options.view||'game'});
}
