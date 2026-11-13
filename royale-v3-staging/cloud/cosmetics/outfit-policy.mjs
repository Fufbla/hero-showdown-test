// Synchronous wardrobe policy shared by gameplay and the cloud save guard.
// Historical piece prices are immutable purchase credit, not individual offers.
// Retired IDs remain readable ownership records; they can never be bought or worn.
export const OUTFIT_PRICE=700;
export const OUTFIT_POLICY_VERSION='matching-outfits-face-only-v2';
export const CLOTHING_SLOTS=Object.freeze(['top','bottom','fullbody','footwear','accessory','cape']);
export const LEGACY_CLOTHING_SLOTS=Object.freeze(['headwear',...CLOTHING_SLOTS]);
const historicalRows=[
 ["dolphin-costume","Dolphin Costume",[["fullbody",700]]],
 ["pink-shark-costume","Pink Shark Costume",[["fullbody",700]]],
 ["hamburger-costume","Hamburger Costume",[["fullbody",700]]],
 ["stuffed-animal-costume","Stuffed Animal Costume",[["fullbody",700]]],
 ["zombie-costume","Zombie Costume",[["fullbody",700]]],
 ["reaper-costume","Reaper Costume",[["fullbody",700]]],
 ["fishsticks-costume","I Love Fishsticks Costume",[["fullbody",700]]],
 ["pizza-slice-costume","Pizza Slice Costume",[["fullbody",700]]],
 ["black-business-suit","Black Business Suit",[["fullbody",700]]],
 ["white-business-suit","White Business Suit",[["fullbody",700]]],
 ["royal-kimono","Royal Kimono Set",[["headwear",100],["fullbody",500],["footwear",100]]],
 ["ninja-warrior","Ninja Warrior Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["accessory",100]]],
 ["urban-hero","Urban Hero Set",[["headwear",100],["top",400],["bottom",100],["footwear",100]]],
 ["street-style","Street Style Set",[["top",400],["bottom",100],["footwear",100],["accessory",100]]],
 ["explorer","Explorer Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["accessory",100]]],
 ["festival","Festival Set",[["headwear",100],["fullbody",400],["footwear",100],["accessory",100]]],
 ["athletic","Athletic Set",[["headwear",100],["top",400],["bottom",100],["footwear",100]]],
 ["casual-hoodie","Casual Hoodie Set",[["top",400],["bottom",100],["footwear",100],["accessory",100]]],
 ["royal-gown","Royal Gown Set",[["headwear",100],["fullbody",400],["footwear",100],["accessory",100]]],
 ["tech-specialist","Tech Specialist Set",[["top",400],["bottom",100],["footwear",100],["accessory",100]]],
 ["combat-casual","Combat Casual Set",[["headwear",100],["top",400],["bottom",100],["footwear",100]]],
 ["mystic-robe","Mystic Robe Set",[["headwear",100],["fullbody",400],["footwear",100],["accessory",100]]],
 ["witch","Witch Set",[["headwear",100],["fullbody",400],["footwear",100],["accessory",100]]],
 ["vampire","Vampire Set",[["top",400],["bottom",100],["footwear",100],["cape",100]]],
 ["mummy","Mummy Set",[["headwear",100],["fullbody",500],["footwear",100]]],
 ["werewolf","Werewolf Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["accessory",100]]],
 ["skeleton","Skeleton Set",[["fullbody",600],["footwear",100]]],
 ["pumpkin-knight","Pumpkin Knight Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["accessory",100]]],
 ["dark-reaper","Dark Reaper Set",[["headwear",100],["fullbody",400],["footwear",100],["accessory",100]]],
 ["cat-burglar","Cat Burglar Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["accessory",100]]],
 ["santa-hero","Santa Hero Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["accessory",100]]],
 ["mrs.-claus","Mrs. Claus Set",[["headwear",100],["fullbody",400],["footwear",100],["accessory",100]]],
 ["elf-hero","Elf Hero Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["accessory",100]]],
 ["reindeer","Reindeer Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["accessory",100]]],
 ["snow-hero","Snow Hero Set",[["top",400],["bottom",100],["footwear",100],["accessory",100]]],
 ["gingerbread","Gingerbread Set",[["headwear",100],["fullbody",500],["footwear",100]]],
 ["toy-soldier","Toy Soldier Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["accessory",100]]],
 ["holiday-sweater","Holiday Sweater Set",[["headwear",100],["top",400],["bottom",100],["footwear",100]]],
 ["pilgrim-hero","Pilgrim Hero Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["cape",100]]],
 ["pilgrim-maid","Pilgrim Maid Set",[["headwear",100],["fullbody",500],["footwear",100]]],
 ["fantasy-harvest","Fantasy Harvest Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["accessory",100]]],
 ["harvest-scout","Harvest Scout Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["accessory",100]]],
 ["turkey-hero","Turkey Hero Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["accessory",100]]],
 ["harvest-festival","Harvest Festival Set",[["headwear",100],["fullbody",400],["footwear",100],["accessory",100]]],
 ["scarecrow","Scarecrow Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["accessory",100]]],
 ["autumn-explorer","Autumn Explorer Set",[["headwear",100],["top",300],["bottom",100],["footwear",100],["accessory",100]]],
];
export const RETIRED_COSMETIC_IDS=Object.freeze(["royal-kimono.headwear","ninja-warrior.headwear","ninja-warrior.accessory","urban-hero.headwear","street-style.accessory","explorer.headwear","festival.headwear","athletic.headwear","casual-hoodie.accessory","royal-gown.headwear","tech-specialist.accessory","combat-casual.headwear","mystic-robe.headwear","witch.headwear","mummy.headwear","werewolf.headwear","pumpkin-knight.headwear","dark-reaper.headwear","cat-burglar.headwear","santa-hero.headwear","mrs.-claus.headwear","elf-hero.headwear","reindeer.headwear","snow-hero.accessory","gingerbread.headwear","toy-soldier.headwear","holiday-sweater.headwear","pilgrim-hero.headwear","pilgrim-maid.headwear","fantasy-harvest.headwear","harvest-scout.headwear","turkey-hero.headwear","harvest-festival.headwear","scarecrow.headwear","autumn-explorer.headwear"]);
const retired=new Set(RETIRED_COSMETIC_IDS),pieces=new Map();
export const OUTFIT_POLICIES=Object.freeze(Object.fromEntries(historicalRows.map(([id,name,parts])=>{
 const history=parts.map(([category,coinPrice])=>{
  const piece=Object.freeze({id:id+'.'+category,category,coinPrice,setId:id});
  pieces.set(piece.id,piece);return piece;
 });
 return [id,Object.freeze({id,name,category:'set',coinPrice:OUTFIT_PRICE,
  pieces:Object.freeze(history.filter(p=>!retired.has(p.id))),
  historicalPieces:Object.freeze(history)})];
})));
export const isRetiredCosmeticId=id=>retired.has(id);
export const historicalPiece=id=>pieces.get(id)||null;
export const outfitForPiece=id=>{
 const piece=historicalPiece(id);return piece?OUTFIT_POLICIES[piece.setId]:null;
};
