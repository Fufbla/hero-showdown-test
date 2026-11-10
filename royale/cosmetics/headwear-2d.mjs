// Phase E — fit hats to the ACTUAL 2D game sprite, not unused 3D views.
// Gameplay paints the front atlas then mirrors it for left/right movement.
// Each value below calibrates that same moving sprite, including its bottom
// edge relative to the hero's head anchor. No approved artwork is modified.
const hat=(ratio,bottom,{right=0,left=0,height=1}={})=>Object.freeze({ratio,bottom,right,left,height});
export const HEADWEAR_2D=Object.freeze({
 'royal-kimono.headwear':hat(.44,-17,{right:-1,left:1}),
 'ninja-warrior.headwear':hat(.81,-6,{right:0,left:0,height:.96}),
 'urban-hero.headwear':hat(.90,-8,{right:0,left:0,height:.97}),
 'explorer.headwear':hat(1.22,-9,{right:0,left:0}),
 'festival.headwear':hat(1.00,-4,{right:0,left:0}),
 'athletic.headwear':hat(.79,-6,{right:0,left:0,height:.95}),
 'royal-gown.headwear':hat(.90,-15,{right:0,left:0}),
 'combat-casual.headwear':hat(.90,-8,{right:0,left:0}),
 'mystic-robe.headwear':hat(1.06,9,{right:0,left:0}),
 'witch.headwear':hat(1.25,-10,{right:0,left:0}),
 'mummy.headwear':hat(1.02,12,{right:0,left:0}),
 'werewolf.headwear':hat(1.09,10,{right:0,left:0}),
 'pumpkin-knight.headwear':hat(1.13,13,{right:0,left:0}),
 'dark-reaper.headwear':hat(1.06,10,{right:0,left:0}),
 'cat-burglar.headwear':hat(.99,-11,{right:0,left:0}),
 'santa-hero.headwear':hat(.94,-7,{right:0,left:0}),
 'mrs.-claus.headwear':hat(.95,-9,{right:0,left:0}),
 'elf-hero.headwear':hat(.91,-7,{right:0,left:0}),
 'reindeer.headwear':hat(1.11,9,{right:0,left:0}),
 'gingerbread.headwear':hat(1.05,11,{right:0,left:0}),
 'toy-soldier.headwear':hat(.96,-8,{right:0,left:0}),
 'holiday-sweater.headwear':hat(.91,-8,{right:0,left:0}),
 'pilgrim-hero.headwear':hat(1.19,-10,{right:0,left:0}),
 'pilgrim-maid.headwear':hat(.94,-9,{right:0,left:0}),
 'fantasy-harvest.headwear':hat(1.02,-8,{right:0,left:0}),
 'harvest-scout.headwear':hat(.91,-8,{right:0,left:0}),
 'turkey-hero.headwear':hat(1.04,-7,{right:0,left:0}),
 'harvest-festival.headwear':hat(1.10,-12,{right:0,left:0}),
 'scarecrow.headwear':hat(1.23,-9,{right:0,left:0}),
 'autumn-explorer.headwear':hat(.92,-8,{right:0,left:0})
});
export const HEADWEAR_2D_VERSION='phase-e-gameplay-headwear-v1';

// Only called for the source sprite when the game is actually facing right or
// left. The existing atlas mirroring handles direction; fit offsets are in
// LOCAL hero coordinates and must not be mirrored a second time.
export function fitGameplayHeadwear(layer,fit,piece,pose,facing){
 if(layer?.part!=='headwear'||layer?.view!=='front')return fit;
 if(facing!==1&&facing!==-1)return fit;
 const profile=HEADWEAR_2D[piece?.id];
 if(!profile)return fit;
 const headWidth=(Number.isFinite(pose?.faceWidth)&&Number.isFinite(pose?.unitScale))
  ?pose.faceWidth*pose.unitScale:31.5;
 const [,,width,height]=layer.rect;
 const atlasScale=layer.scale;
 const desiredWidth=headWidth*profile.ratio;
 const paintedWidth=width*atlasScale*fit.width;
 // Never enlarge approved garments: this pass only corrects oversized hats.
 const ratio=paintedWidth>0?Math.min(1,desiredWidth/paintedWidth):1;
 const fittedWidth=fit.width*ratio;
 const fittedHeight=fit.height*profile.height;
 const bottomFromPivot=(height-layer.pivot[1])*atlasScale*fittedHeight;
 const oldOffsetY=layer.offset?.[1]||0;
 const xCorrection=facing===1?profile.right:profile.left;
 return {
  width:fittedWidth,
  height:fittedHeight,
  offset:[(fit.offset?.[0]||0)+xCorrection,
   profile.bottom-oldOffsetY-bottomFromPivot]
 };
}
