// Purchase prices only: historical item values, resale and armor stats stay intact.
export const ARMOR_PRICES=Object.freeze({
  10:100,20:300,30:700,40:1300,50:2200,60:3500,70:5200,80:7300,90:10000,
});
export function armorPurchasePrice(definitions){
  const shop=definitions.filter(d=>d.shop);
  const level=shop[0]?.level;
  if(shop.length&&shop.every(d=>d.level===level)&&Object.hasOwn(ARMOR_PRICES,level))return ARMOR_PRICES[level];
  return definitions.reduce((sum,d)=>sum+(d.catalogValue||0),0);
}
