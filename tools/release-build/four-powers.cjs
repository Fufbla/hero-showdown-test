function replace(s,a,b){if(!s.includes(a))throw Error('Four-power source boundary changed: '+a.slice(0,90));return s.replace(a,b);}
module.exports=function(file,s){
 if(file==='royale/core.mjs'){
  s=replace(s,'const reach = ATTACKS[a.kind].reach;','const reach = a.stats?.reach || ATTACKS[a.kind].reach;');
  s=s.replace("this.hero.attack?.power==='strength'||kind.startsWith('merge:')","this.hero.attack?.power==='strength'||kind==='seismicSmash'||kind==='animalAllies'||kind.startsWith('merge:')");
  s=replace(s,'dt = Math.min(dt, STEP);',"if(this.hero.powerPose)input={...input,move:0,jump:false,punch:false,kick:false,punchHeld:false,kickHeld:false};\n    dt = Math.min(dt, STEP);");
 }
 if(file==='royale/power-menu.mjs'){
  s="import {appendPowerPreview} from './four-powers/preview.mjs';\n"+s;
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
  s="import {drawSlamHero,legacyEffectView} from '../../royale/four-powers/art.mjs';\n"+s;
  // Keep the approved fireball atlas while replacing only the two melee effects.
  s=s.replaceAll("!(attackPresentation&&h.attack?.power==='strength')",'true');
  s=replace(s,'kingJamesAttackFX.hero(c,game,pos,visualHero);','kingJamesAttackFX.hero(c,legacyEffectView(game),pos,{...visualHero,attack:legacyEffectView(game).hero.attack});');
  s=replace(s,'const costumeBody=costume&&', 'const slamBody=drawSlamHero(c,game,pos,spriteHero,costume);\n    const costumeBody=slamBody||costume&&');
  s=s.replaceAll('drawHeroPowerOverlays(c,game,','drawHeroPowerOverlays(c,legacyEffectView(game),');
  s=s.replaceAll('kingJamesFX.draw(c,game,','kingJamesFX.draw(c,legacyEffectView(game),');
  s=s.replace("&&h.attack&&h.attack.power!=='superKick'", "&&h.attack&&!['superKick','strength'].includes(h.attack.power)");
 }
 return s;
};
