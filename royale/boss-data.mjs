// Regional encounters only. Legendary durability, drops and fourth-slot powers are not enabled.
export const ARENA=Object.freeze({left:180,right:1800,heroX:420,bossX:1180,floor:600,chestX:1060,waveDelay:12,waveWarning:2,waveLimit:3,helpersPerWave:3});
export const BOSS_MOVEMENT=Object.freeze({
  1:{approach:145,retreat:0,style:'trudge'},
  2:{approach:205,retreat:0,style:'weave'},
  3:{approach:135,retreat:0,style:'heavy'},
  4:{approach:180,retreat:110,style:'scuttle'},
  5:{approach:300,retreat:190,style:'keep-distance'},
  6:{approach:285,retreat:165,style:'drift'},
  7:{approach:125,retreat:0,style:'pursue'},
});
const boss=(region,name,level,hp,damage,speed,helper,patterns,art)=>({region,name,level,hp,damage,speed,helper,patterns,art,xp:[0,250,800,2200,4500,8500,15000,28000][region]});
export const BOSSES=Object.freeze({
  1:boss(1,'Trash Monster',10,950,18,42,'slime',[['swipe','throw'],['throw','slam','swipe'],['slam','throw','swipe','slam']],'temporary'),
  2:boss(2,'Bushman',20,2600,32,55,'sprout',[['vine','swipe'],['thorns','branch','vine'],['roots','thorns','branch']],'approved'),
  3:boss(3,'Wastelander',35,6000,52,44,'scrap',[['punch','toxic'],['shockwave','slam','toxic'],['hazard','shockwave','punch']],'approved'),
  4:boss(4,'Giant Scorpion',50,11000,82,48,'scorpion',[['claw','sting'],['clawCombo','stingPattern','claw'],['stingPattern','clawCombo','sting']],'approved'),
  5:boss(5,'Venomis',65,18000,120,66,'stalker',[['thorns','vine'],['poison','vineCombo','thorns'],['roots','poison','vineCombo']],'approved'),
  6:boss(6,'AtomDust',80,28000,175,60,'phantom',[['blast'],['expansion','debris','blast'],['atomic','debris','expansion']],'approved'),
  7:boss(7,'Ultimate Pollution Boss',99,42000,235,74,'apocalypse',[['pollution','punch'],['environment','slam','pollution'],['cataclysm','environment','pollution']],'temporary'),
});
// warning/duration/recovery are seconds. Damage multiplies each boss's base damage.
const a=(label,shape,warning,duration,recovery,damage=1,extra={})=>({label,shape,warning,duration,recovery,damage,...extra});
export const BOSS_ATTACKS=Object.freeze({
  swipe:a('Heavy swipe','melee',.95,.25,1.25,1,{reach:165}),
  throw:a('Trash throw','projectile',1,.25,1.35,1,{speed:170,count:1,color:'#c9aa6e'}),
  slam:a('Ground slam · jump','ground',1.2,.3,1.45,1.25,{width:240}),
  vine:a('Vine strike','melee',.95,.3,1.1,1,{reach:220}),
  thorns:a('Thorn volley','projectile',1.1,.35,1.2,.8,{speed:220,count:3,color:'#729044'}),
  branch:a('Sweeping branches · jump','sweep',1.15,.4,1.3,1.15,{reach:290}),
  roots:a('Rising roots · move away','ground',1.3,.45,1.4,1.3,{width:160,spots:2}),
  punch:a('Heavy punch','melee',.95,.25,1.2,1.15,{reach:170}),
  toxic:a('Toxic shot','projectile',1.1,.3,1.25,1,{speed:210,count:1,color:'#bed465'}),
  shockwave:a('Toxic shockwave · jump','wave',1.2,.4,1.4,1.15,{speed:270}),
  hazard:a('Toxic ground · move away','ground',1.3,.5,1.5,1.35,{width:160,spots:3}),
  claw:a('Claw strike','melee',1,.35,1.3,1,{reach:230}),
  sting:a('Stinger · leave the marker','ground',1.3,.35,1.45,1.3,{width:140}),
  clawCombo:a('Twin claw sweep · jump','sweep',.95,.5,1.2,1.15,{reach:310}),
  stingPattern:a('Heavy stinger · move','ground',1.15,.55,1.3,1.4,{width:150,spots:1}),
  poison:a('Poison fan','projectile',1,.35,1.1,1,{speed:250,count:3,color:'#bd77cf'}),
  vineCombo:a('Sweeping vine combination · jump','sweep',1,.55,1.1,1.25,{reach:330}),
  blast:a('Concentrated energy','projectile',1.1,.25,1.3,1,{speed:295,count:1,color:'#e8ce78'}),
  expansion:a('Expanding energy · jump','wave',1.2,.5,1.3,1.15,{speed:300}),
  debris:a('Falling debris · leave the markers','fall',1.25,.45,1.35,1.2,{spots:3,width:100}),
  atomic:a('Atomic shockwaves · jump','wave',1.25,.6,1.4,1.35,{speed:340,double:true}),
  pollution:a('Pollution barrage','projectile',1.05,.35,1.1,1,{speed:265,count:3,color:'#97b76b'}),
  environment:a('Pollution fallout · move','fall',1.2,.6,1.25,1.3,{spots:3,width:120}),
  cataclysm:a('Pollution shockwaves · jump','wave',1.2,.65,1.25,1.45,{speed:360,double:true}),
});
export const bossPhase=ratio=>ratio>.5?1:ratio>.2?2:3;
export function attackFor(b,kind){const base=BOSS_ATTACKS[kind];return {...base,kind,warning:Math.max(.65,base.warning*[1,1,.92,.85][b.phase]),recovery:base.recovery*[1,1,.88,.8][b.phase]};}
