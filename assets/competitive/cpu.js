(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./roster.js'):root.HealthiaCompetitiveData,typeof module==='object'&&module.exports?require('./combat.js'):root.HealthiaCompetitiveCombat);if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaCompetitiveCPU=api;})(typeof window!=='undefined'?window:globalThis,function(Data,Combat){
  'use strict';
  function input(world,f,dt){
    if(f.control!=='cpu')return {};
    const ai=f.cpu,level=Data.difficulty[world.difficulty]||Data.difficulty.medium;ai.wait-=dt;
    // Release action buttons after one sample; the same edge rules apply to humans and CPU.
    const previous={...ai.held};for(const k of ['punch','kick','shoot','skill','special','jump','dash'])delete ai.held[k];
    if(ai.wait>0)return {...ai.held};
    ai.wait=level.reaction+world.random()*.12;
    const target=world.fighters[1-f.slot];if(target.invisible<=0||ai.seenX===undefined)ai.seenX=target.x;
    const dist=Math.abs(ai.seenX-f.x),dir=ai.seenX>f.x?1:-1;
    const incoming=target.invisible<=0&&target.action&&dist<target.action.spec.range+75||world.projectiles.some(p=>p.owner!==f.slot&&Math.abs(p.x-f.x)<240);
    const floorDanger=world.zones.some(z=>z.owner!==f.slot&&Math.abs(z.x-f.x)<110);
    const stage=world.hazardWarning;
    ai.held={};
    if((incoming||stage==='wind')&&world.random()<level.guard){ai.held.block=true;return ai.held;}
    if((floorDanger||stage==='slam')&&world.random()<level.guard){ai.held.jump=true;ai.held[dir>0?'left':'right']=true;return ai.held;}
    if(dist>180)ai.held[dir>0?'right':'left']=true;
    if(world.difficulty==='hard'&&dist<130&&target.block&&world.random()<.4)ai.held[dir>0?'left':'right']=true;
    if(f.stun>0||f.knockdown>0)ai.sequence=null;
    if(ai.sequence?.length&&dist<210&&!incoming){ai.held[ai.sequence.shift()]=true;return {...ai.held};}
    if(world.random()>level.aggression)return ai.held;
    if(Combat.ready(f,'special')&&dist<Data.moves[f.id].special.range+40&&world.random()<.65)ai.held.special=true;
    else if(Combat.ready(f,'skill')&&world.random()<.22)ai.held.skill=true;
    else if(dist>240&&Combat.ready(f,'shoot'))ai.held.shoot=true;
    else if(dist<200){
      if(world.difficulty==='hard'&&world.random()<.45&&!target.block){ai.held.kick=true;ai.sequence=['kick','punch','punch'];}
      else{ai.held[world.random()<.5?'punch':'kick']=true;ai.held.heavy=target.action?.age>target.action?.spec.startup+target.action?.spec.active||world.random()<(world.difficulty==='hard'?.38:.18);}
    }
    if(world.difficulty==='hard'&&dist>400&&world.random()<.15)ai.held.dash=true;
    // Avoid artificially repeating a held action without a release sample.
    for(const k of ['punch','kick','shoot','skill','special','jump','dash'])if(previous[k])delete ai.held[k];
    return {...ai.held};
  }
  return {input};
});
