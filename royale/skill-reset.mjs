import {normalizePowers} from './powers.mjs';
import {preparePowerReset,SKILL_RESET_COST} from '../royale-v3-staging/power-reset.mjs';
export {SKILL_RESET_COST};
export function skillResetPreview(game){
 if(!game||game.hero.dead||!game.paused||!game.canSave())return {ok:false,error:'Leave combat and open the skill area to reset skills.'};
 if(!game.nearTree())return {ok:false,error:'Visit the Tree of Eris to reset skills.'};
 try{return {ok:true,...preparePowerReset(JSON.parse(game.save()))};}catch(error){return {ok:false,error:error.message};}
}
export function applySkillReset(game,snapshot){
 const data=normalizePowers(snapshot.powers,game.hero.level,{strict:true});
 if(!data)throw Error('The saved skill reset could not be restored. Reload this hero.');
 game.powers.cancelEffects();game.hero.attack=null;game.powers.data=data;game.powers.cooldowns={...data.recovery};
 game.hero.coins=snapshot.coins;game.economy=structuredClone(snapshot.economy);game.refreshEquipment();
 game.emit('upgrade',{reset:true});
}
