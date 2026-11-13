// Approved November 13 economy. Brackets use the defeated/destination monster,
// never the hero's level. Night changes combat difficulty, not this exact chart.
export const COIN_BRACKETS=Object.freeze([[1,1],[20,2],[30,3],[40,5],[50,8],[60,12],[70,18],[80,25],[90,35]].map(Object.freeze));
export const BOSS_COIN_BRACKETS=Object.freeze([[1,100],[20,200],[40,400],[60,750],[80,1200]].map(Object.freeze));
function bracket(level,rows){
 if(!Number.isInteger(level)||level<1||level>99)return null;
 return rows.findLast(([minimum])=>level>=minimum)[1];
}
export const monsterCoins=level=>bracket(level,COIN_BRACKETS)??0;
export const bossChestCoins=level=>bracket(level,BOSS_COIN_BRACKETS)??0;
export const travelCoins=level=>{const coins=bracket(level,COIN_BRACKETS);return coins===null?null:coins*100;};
