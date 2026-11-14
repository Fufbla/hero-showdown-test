// Synchronous wardrobe policy shared by gameplay and the cloud save guard.
// Historical piece prices are immutable purchase credit, not individual offers.
// Retired IDs remain readable ownership records; they can never be bought or worn.
export const OUTFIT_PRICE=700;
export const OUTFIT_POLICY_VERSION='approved-collection-v3';
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
 ["santa-street","Santa Street",[["fullbody",700]]],
 ["snowflake-knit","Snowflake Knit",[["fullbody",700]]],
 ["holiday-velvet","Holiday Velvet",[["fullbody",700]]],
 ["purple-puffer","Purple Puffer",[["fullbody",700]]],
 ["classic-varsity","Classic Varsity",[["fullbody",700]]],
 ["olive-bomber","Olive Bomber",[["fullbody",700]]],
 ["midnight-leather","Midnight Leather",[["fullbody",700]]],
 ["sherpa-denim","Sherpa Denim",[["fullbody",700]]],
 ["blossom-kimono","Blossom Kimono",[["fullbody",700]]],
 ["plum-gold-kimono","Plum & Gold Kimono",[["fullbody",700]]],
 ["emerald-gala","Emerald Gala",[["fullbody",700]]],
 ["sapphire-starlight","Sapphire Starlight",[["fullbody",700]]],
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
export const RETIRED_COSMETIC_IDS=Object.freeze(["royal-kimono.headwear","royal-kimono.fullbody","royal-kimono.footwear","ninja-warrior.headwear","ninja-warrior.top","ninja-warrior.bottom","ninja-warrior.footwear","ninja-warrior.accessory","urban-hero.headwear","urban-hero.top","urban-hero.bottom","urban-hero.footwear","street-style.top","street-style.bottom","street-style.footwear","street-style.accessory","explorer.headwear","explorer.top","explorer.bottom","explorer.footwear","explorer.accessory","festival.headwear","festival.fullbody","festival.footwear","festival.accessory","athletic.headwear","athletic.top","athletic.bottom","athletic.footwear","casual-hoodie.top","casual-hoodie.bottom","casual-hoodie.footwear","casual-hoodie.accessory","royal-gown.headwear","royal-gown.fullbody","royal-gown.footwear","royal-gown.accessory","tech-specialist.top","tech-specialist.bottom","tech-specialist.footwear","tech-specialist.accessory","combat-casual.headwear","combat-casual.top","combat-casual.bottom","combat-casual.footwear","mystic-robe.headwear","mystic-robe.fullbody","mystic-robe.footwear","mystic-robe.accessory","witch.headwear","witch.fullbody","witch.footwear","witch.accessory","vampire.top","vampire.bottom","vampire.footwear","vampire.cape","mummy.headwear","mummy.fullbody","mummy.footwear","werewolf.headwear","werewolf.top","werewolf.bottom","werewolf.footwear","werewolf.accessory","skeleton.fullbody","skeleton.footwear","pumpkin-knight.headwear","pumpkin-knight.top","pumpkin-knight.bottom","pumpkin-knight.footwear","pumpkin-knight.accessory","dark-reaper.headwear","dark-reaper.fullbody","dark-reaper.footwear","dark-reaper.accessory","cat-burglar.headwear","cat-burglar.top","cat-burglar.bottom","cat-burglar.footwear","cat-burglar.accessory","santa-hero.headwear","santa-hero.top","santa-hero.bottom","santa-hero.footwear","santa-hero.accessory","mrs.-claus.headwear","mrs.-claus.fullbody","mrs.-claus.footwear","mrs.-claus.accessory","elf-hero.headwear","elf-hero.top","elf-hero.bottom","elf-hero.footwear","elf-hero.accessory","reindeer.headwear","reindeer.top","reindeer.bottom","reindeer.footwear","reindeer.accessory","snow-hero.top","snow-hero.bottom","snow-hero.footwear","snow-hero.accessory","gingerbread.headwear","gingerbread.fullbody","gingerbread.footwear","toy-soldier.headwear","toy-soldier.top","toy-soldier.bottom","toy-soldier.footwear","toy-soldier.accessory","holiday-sweater.headwear","holiday-sweater.top","holiday-sweater.bottom","holiday-sweater.footwear","pilgrim-hero.headwear","pilgrim-hero.top","pilgrim-hero.bottom","pilgrim-hero.footwear","pilgrim-hero.cape","pilgrim-maid.headwear","pilgrim-maid.fullbody","pilgrim-maid.footwear","fantasy-harvest.headwear","fantasy-harvest.top","fantasy-harvest.bottom","fantasy-harvest.footwear","fantasy-harvest.accessory","harvest-scout.headwear","harvest-scout.top","harvest-scout.bottom","harvest-scout.footwear","harvest-scout.accessory","turkey-hero.headwear","turkey-hero.top","turkey-hero.bottom","turkey-hero.footwear","turkey-hero.accessory","harvest-festival.headwear","harvest-festival.fullbody","harvest-festival.footwear","harvest-festival.accessory","scarecrow.headwear","scarecrow.top","scarecrow.bottom","scarecrow.footwear","scarecrow.accessory","autumn-explorer.headwear","autumn-explorer.top","autumn-explorer.bottom","autumn-explorer.footwear","autumn-explorer.accessory"]);
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
 const piece=historicalPiece(id);return piece&&!retired.has(id)?OUTFIT_POLICIES[piece.setId]:null;
};
