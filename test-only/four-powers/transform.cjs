const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
function replace(s,a,b){if(!s.includes(a))throw Error('Four-power source boundary changed: '+a.slice(0,90));return s.replace(a,b);}
module.exports=function transform(file,s){
 if(file==='royale/core.mjs')s=replace(s,'  stepEnemy(e, dt) {','  stepEnemy(e, dt) {if(e.fourPowerDummy){e.flash=Math.max(0,(e.flash||0)-dt);return;}');
 s=s.replaceAll('.filter(e=>!isBoss(e)&&!e.summoned)', '.filter(e=>!isBoss(e)&&!e.summoned&&!e.fourPowerDummy)').replaceAll('.filter(e=>!e.boss&&!e.summoned)', '.filter(e=>!e.boss&&!e.summoned&&!e.fourPowerDummy)');

 if(file==='royale/app.mjs'){
  s="import {installSolo,createTestSnapshot,requireTestAccount} from '../test-only/four-powers/review.mjs';\nrequireTestAccount();\n"+s;
  s=replace(s,"const codePlay=['1','v3'].includes(params.get('codePlay'))&&window.parent!==window&&window.parent.location.origin===location.origin;",'const codePlay=false;');
  s=replace(s,"const storagePrefix=codePlay?(params.get('codePlay')==='v3'?'royale-v3-play:':'royale-code-play-v1:'):'';","const storagePrefix='royale-four-powers-0000000000-v1:';");
  // Only the new, separate test profile receives points; an existing hero is reused.
  s=replace(s,"renderRoster();setScreen('roster');\nvoid prepareStyleCMaterials()",`if(!store.slot(0)&&store.writable){const r=store.writeSlot(0,createTestSnapshot(0),{expectedId:null,requireDurable:true});if(!r.ok)throw Error(r.error);}
renderRoster();setScreen('roster');
installSolo({getGame:()=>game,getRenderer:()=>renderer,store,persist,renderRoster,selectSlot:continueHero,screen:()=>screen,setScreen,menu:powerMenu,updateHud,say});
void prepareStyleCMaterials()`);
 }
 if(file==='royale/saves.mjs'){
  // Level scrubbing is reversible only in the dedicated sandbox store. All other
  // stale progress, identity, wardrobe and revision guards remain in force.
  s=s.replace("||Object.keys(old.powers.levels).some(id=>state.powers.levels[id]<old.powers.levels[id])",'');
 }

 if(file==='royale-v3-staging/gameplay/local-coop-app.mjs'){
  s="import {requireTestAccount,installCoop} from '../../test-only/four-powers/review.mjs';\nrequireTestAccount();\n"+s;
  s=s.replace("const cloudConfig=await fetch(new URL('../../royale/local-coop/config.json',import.meta.url),{cache:'no-store'}).then(r=>r.json());","const cloudConfig={};");
  s=s.replace('new CloudProfile({','new CloudProfile({');
  s=s.replace("const fresh=new CloudProfile({endpoint:profile.endpoint,heroEndpoint:profile.heroEndpoint});", "const fresh=new CloudProfile({endpoint:profile.endpoint,heroEndpoint:profile.heroEndpoint});");
  s+=`\ninstallCoop({players,input,getSession:()=>session,getRenderer:()=>renderer,renderChoices,updateStart,renderPanel,openMenu,saveAll,refreshControllers:()=>{lastControllers=-Infinity;padSignature='';refreshControllers(performance.now());},setPads:p=>testPads=p,start});\n`;
 }
 return s;
};
