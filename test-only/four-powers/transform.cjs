const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
function replace(s,a,b){if(!s.includes(a))throw Error('Four-power source boundary changed: '+a.slice(0,90));return s.replace(a,b);}
module.exports=function transform(file,s){
 s=s.replaceAll('.filter(e=>!isBoss(e)&&!e.summoned)', '.filter(e=>!isBoss(e)&&!e.summoned&&!e.fourPowerDummy)').replaceAll('.filter(e=>!e.boss&&!e.summoned)', '.filter(e=>!e.boss&&!e.summoned&&!e.fourPowerDummy)');
 if(file==='royale/core.mjs'){
  s=replace(s,'const reach = ATTACKS[a.kind].reach;','const reach = a.stats?.reach || ATTACKS[a.kind].reach;');
  s=s.replace("this.hero.attack?.power==='strength'||kind.startsWith('merge:')","this.hero.attack?.power==='strength'||kind==='seismicSmash'||kind==='animalAllies'||kind.startsWith('merge:')");
  s=replace(s,'  stepEnemy(e, dt) {', '  stepEnemy(e, dt) {if(e.fourPowerDummy){e.flash=Math.max(0,(e.flash||0)-dt);return;}');
  s=replace(s,'dt = Math.min(dt, STEP);',"if(this.hero.powerPose)input={...input,move:0,jump:false,punch:false,kick:false,punchHeld:false,kickHeld:false};\n    dt = Math.min(dt, STEP);");
 }
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
 if(file==='royale/power-menu.mjs'){
  s="import {appendPowerPreview} from '../test-only/four-powers/review.mjs';\n"+s;
  s=s.replace("const labels={", "const labels={animal:'Animal ally',radius:'Shockwave radius',range:'Summon range',multiplier:'Damage multiplier',");
  s=replace(s,'function format(key,value){',"function format(key,value){if(typeof value==='string')return value.replaceAll('-',' ');if(key==='radius')return (value/40).toFixed(1)+' m';if(key==='multiplier')return value.toFixed(2)+'×';");
  s=s.replace("    if(def.after)panel.append", "    appendPowerPreview(panel,id,g);\n    if(def.after)panel.append");
  s=s.replaceAll('(index+8)%9','(index+POWER_IDS.length-1)%POWER_IDS.length').replaceAll('(index+1)%9','(index+1)%POWER_IDS.length').replace("e.key==='End'?8:","e.key==='End'?POWER_IDS.length-1:");
 }
 if(file==='royale-v3-staging/kingjames/animation.mjs'){
  s=replace(s," if(h.attack&&ATTACKS[h.attack.kind])", " if(h.powerPose&&m.animations.seismicSmash)return 'seismicSmash';\n if(h.attack&&ATTACKS[h.attack.kind])");
  s=replace(s,"  }else if(next==='fireball'||next==='fireballAir'){", "  }else if(next==='seismicSmash'){index=h.powerPose.age<.10?0:h.powerPose.age<.20?1:h.powerPose.age<.42?2:3;\n  }else if(next==='fireball'||next==='fireballAir'){");
 }
 if(file==='royale-v3-staging/kingjames/renderer.mjs'){
  s="import {drawSlamHero,legacyEffectView} from '../../test-only/four-powers/art.mjs';\n"+s;
  s=s.replace('const attackPresentation=', 'const attackPresentationDisabled=');
  s=replace(s,'    if(attackPresentation){', '    const attackPresentation=false;\n    if(attackPresentation){');
  s=replace(s,'const costumeBody=costume&&', 'const slamBody=drawSlamHero(c,game,pos,spriteHero,costume);\n    const costumeBody=slamBody||costume&&');
  s=s.replaceAll('drawHeroPowerOverlays(c,game,','drawHeroPowerOverlays(c,legacyEffectView(game),');
  s=s.replaceAll('kingJamesFX.draw(c,game,','kingJamesFX.draw(c,legacyEffectView(game),');
  s=s.replace("&&h.attack&&h.attack.power!=='superKick'", "&&h.attack&&!['superKick','strength'].includes(h.attack.power)");
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
