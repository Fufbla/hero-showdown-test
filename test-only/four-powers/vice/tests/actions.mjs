// Runtime fixtures use the same simulation fields as normal gameplay. Kept
// independent from costume modules so a test can choose its route before import.
export const VICE_ACTIONS=Object.freeze(['idle','start','run','stop','jump','doubleJump','fall','land','punch','kick',
 'strength','superKick','fireball','fireballAir','flightStart','hover','fly','hurt','defeat','recovery','seismicSmash']);
export const baseHero=()=>({face:1,grounded:true,vx:0,vy:0,dead:false,respawnAge:100,stun:0,
 castAge:100,jumpAge:100,jumps:0,landing:0,invulnerable:0});
export function actionHero(state,direction,attacks){
 const cases={idle:{},start:{vx:240},stop:{},run:{vx:260},
  jump:{grounded:false,vy:-350,jumpAge:.12,jumps:1},doubleJump:{grounded:false,vy:-350,jumpAge:.12,jumps:2},
  fall:{grounded:false,vy:350},land:{landing:.08},
  punch:{attack:{kind:'punch',age:attacks.punch.startup+.01}},kick:{attack:{kind:'kick',age:attacks.kick.startup+.01}},
  strength:{attack:{kind:'punch',power:'strength',age:attacks.punch.startup+.01}},
  superKick:{attack:{kind:'kick',power:'superKick',age:attacks.kick.startup+.01}},
  fireball:{castAge:.2},fireballAir:{castAge:.2,grounded:false,vy:0},
  flightStart:{grounded:false,flying:true,vx:120,v2Active:{flight:{age:0}}},
  fly:{grounded:false,flying:true,vx:120,v2Active:{flight:{age:1}}},
  hover:{grounded:false,flying:true,vx:0,v2Active:{flight:{age:1}}},
  hurt:{stun:.1,hurtAge:.06},defeat:{dead:true,defeatAge:.3},recovery:{respawnAge:.3},
  seismicSmash:{powerPose:{id:'seismicSmash',age:.25,duration:.58,face:direction}}};
 if(!Object.hasOwn(cases,state))throw Error('Unknown action fixture: '+state);
 const hero={...baseHero(),...structuredClone(cases[state]),face:direction};
 if(hero.attack)hero.attack.face=direction;
 return hero;
}
export function drawAction(engine,context,{id,look,state,direction=1,attacks,x=160,y=285,scale=1,owner={}}){
 const hero=actionHero(state,direction,attacks),options={id,owner,scale};
 if(state==='start')engine.draw(context,x,y,look,{...baseHero(),face:direction},0,options);
 if(state==='stop')engine.draw(context,x,y,look,{...baseHero(),face:direction,vx:240},0,options);
 const time=(state==='start'||state==='stop') ? 0.01 : 0.48;
 const before=structuredClone(hero),pose=engine.draw(context,x,y,look,hero,time,options);
 return {hero,before,pose,frame:{...engine.lastFrame},owner};
}
