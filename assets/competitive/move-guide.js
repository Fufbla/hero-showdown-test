/* Read-only move guide generated from the same definitions used by combat. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./roster.js'):root.HealthiaCompetitiveData);if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaCompetitiveGuide=api;})(typeof window!=='undefined'?window:globalThis,function(Data){
  'use strict';
  const pages=['Movement & defense','Normal attacks & combos','Projectiles, skills & specials'];
  function rows(id,kind='cpu',slot=0){
    const local=kind==='local',p2=local&&slot===1;
    const k=local?(p2?{move:'Left / Right',jump:'Up',p:'J',k:'K',block:'L',shoot:'U',skill:'I',sp:'Enter',heavy:'Right Shift'}:{move:'A / D',jump:'W',p:'F',k:'G',block:'H',shoot:'T',skill:'Y',sp:'R',heavy:'Left Shift'}):{move:'A / D or Left / Right',jump:'W or Up',p:'J',k:'K',block:'L',shoot:'U',skill:'I',sp:'Space',heavy:'Shift'};
    const input=(keyboard,controller,touch)=>({keyboard,controller,touch});
    const normals={punch:input(k.p,'X / Square','PUNCH'),heavyPunch:input(k.heavy+' + '+k.p,'Hold RT / R2 + X / Square','Toggle HEAVY on, then PUNCH'),kick:input(k.k,'Y / Triangle','KICK'),heavyKick:input(k.heavy+' + '+k.k,'Hold RT / R2 + Y / Triangle','Toggle HEAVY on, then KICK'),sweep:input(k.k+', '+k.k,'Y, Y / Triangle, Triangle','KICK, KICK; HEAVY off'),uppercut:input([k.k,k.k,k.p,k.p].join(', '),'Y, Y, X, X / Triangle, Triangle, Square, Square','KICK, KICK, PUNCH, PUNCH; HEAVY off'),shoot:input(k.shoot,'B / Circle','SHOOT'),skill:input(k.skill,'LT / L2','SKILL'),special:input(k.sp,'RB / R1','SPECIAL')};
    const notes={projectile:'Block or jump over the projectile.',wave:'Low ground wave: jump over it or block.',zone:'Delayed ground hazard: leave the marked area or jump; blocking does not stop it.',snare:'Delayed ground trap: leave the marker or jump before it activates.',storm:'Delayed storm markers: move clear or block.',beam:'Telegraphed beam: block, move out of range, or interrupt its startup.',melee:'Must connect in front of the fighter; block or bait a miss and punish recovery.',evade:'Quick retreat with 0.16 seconds of protection; cannot escape existing hitstun.',teleport:'Moves forward up to 240 units. Concealment lasts 2 seconds, ends on attack, and is not invulnerability. Only the transition has 0.12 seconds of protection.'};
    const list=[
      {key:'move',page:0,name:'Walk / idle',...input(k.move,'Stick / D-pad','Analog stick'),note:'Release direction to idle. Walking speed differs by fighter.'},
      {key:'jump',page:0,name:'Jump / double jump',...input(k.jump+'; press again in air','A / Cross; press again in air','JUMP; tap again in air'),note:'Up to two jumps before landing. Cannot jump during attack recovery or hitstun.'},
      {key:'dash',page:0,name:'Directional dash',...input('Double-tap a direction','Double-tap stick / D-pad direction','Double-tap a horizontal direction'),note:id==='atomdust'?'0.16-second dash; 1.4-second cooldown; first 0.12 seconds evade attacks.':'0.16-second grounded dash; 0.9-second cooldown. No invulnerability.'},
      {key:'block',page:0,name:'Block',...input('Hold '+k.block,'Hold LB / L1','Hold BLOCK'),note:'Grounded, facing the attack. Stops normal attack damage; ground traps must be jumped or avoided. Hit and knockdown recovery happen automatically.'}
    ];
    for(const [key,m] of Object.entries(Data.moves[id])){
      let note=notes[m.kind]||notes.melee;
      if(key==='sweep'||key==='uppercut')note='Grounded sequence, HEAVY off. Tap each next input within 0.9 seconds; block, jump or taking a hit cancels the chain. '+note;
      if(key==='special')note=(id==='bushman'?'Requires four distinct unblocked punches, kicks or fireballs. Blocks, misses and ground burns do not count.':'Requires a full 100-point special meter.')+' '+note;
      if(m.strikes>1)note+=' '+m.strikes+' hits share the listed total damage.';
      if(m.root)note+=' Roots for '+m.root+' seconds on hit.';
      if(m.slow)note+=' Slows on hit for '+m.slow+' seconds.';
      list.push({key,page:['shoot','skill','special'].includes(key)?2:1,name:m.name,...normals[key],damage:m.damage,cooldown:m.cooldown,startup:m.startup,recovery:m.recovery,note});
    }
    return list;
  }
  return {pages,rows};
});
