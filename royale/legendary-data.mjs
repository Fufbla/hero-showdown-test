import { BOSSES } from './boss-data.mjs';
import { STAT_KEYS } from './costume-catalog.mjs';
export const LEGENDARY_HP = () => BOSSES[7].hp * 3;
export const LEGENDARY_IDS=['lightning','air','styrodog','sonic','styro','wastelander','venomis','atomdust'];
const row=(id,name,arena,region,damage,speed,helper,style,patterns,colors,stats)=>({id,name,arena,region,damage,speed,helper,style,patterns,colors,stats,level:99,art:'approved'});
export const LEGENDARY=Object.freeze(Object.fromEntries([
 row('lightning','Lightning Spree','Storm Fortress',6,220,85,'wisp','crystal',[['lightningStrike','crystalBeam'],['chainLightning','conductive','lightningStrike'],['lightningStorm','chainLightning','conductive']],['#6258ad','#f0d677'],[38,18,.10,.12,.10,30,4,6]),
 row('air','Air Pollution Monster','Toxic Sky',3,205,95,'wisp','hover',[['smog','pollutionClaw'],['gust','cloud','smog'],['smogTornado','gust','cloud']],['#45515a','#e7954a'],[25,16,.13,.09,.06,24,10,20]),
 row('styrodog','Styrodog','Styrofoam Wasteland',3,235,120,'scrap','beast',[['beastClaw','lunge'],['leap','beastCombo','lunge'],['beastCharge','leap','beastCombo']],['#c7c6bd','#4d5155'],[64,32,.12,.10,.12,8,0,3]),
 row('sonic','Sonic Tusk','Echoing Caverns',4,225,95,'crawler','tusk',[['sonicShot','tuskStrike'],['sonicRing','tuskCharge','sonicShot'],['sonicOverlap','tuskCombo','sonicRing']],['#806184','#dcca9a'],[48,26,.15,.04,.09,18,4,12]),
 row('styro','Dr. Styro','Abandoned Laboratory',3,210,63,'drone','scientist',[['styroBounce','styroShot'],['styroWall','machineTrap','styroBounce'],['machinery','styroVolley','machineTrap']],['#deded0','#6b9790'],[24,14,.22,.03,.05,36,8,8]),
 row('wastelander','Wastelander','Toxic Ruins',3,240,72,'scrap','heavy',[['legendPunch','toxicShot'],['toxicRing','legendSlam','legendPunch'],['toxicGround','toxicCombo','legendSlam']],['#426f63','#c4ad79'],[58,30,.18,.02,.06,10,10,5]),
 row('venomis','Venomis','Poison Garden',5,210,90,'stalker','scientist',[['thornShot','legendVine'],['poisonPatch','thornSweep','vinePair'],['vineField','poisonFan','vinePair']],['#e0dfcc','#5eb779'],[29,16,.10,.07,.13,28,15,4]),
 row('atomdust','AtomDust','Atomic Core',6,245,78,'phantom','reactor',[['atomicShot','atomicPulse'],['atomicRing','radioactiveFall','atomicShot'],['atomicStorm','atomicVolley','atomicRing']],['#c1a455','#e5e2d2'],[42,23,.16,.03,.07,60,6,14]),
].map(d=>[d.id,d])));
const attack=(label,shape,warning,duration,recovery,damage=1,extra={})=>({label,shape,warning,duration,recovery,damage,...extra});
export const LEGENDARY_ATTACKS=Object.freeze({
 lightningStrike:attack('Lightning · leave the yellow marker','lightning',1.5,.22,1.45,1,{width:150}),
 crystalBeam:attack('Crystal beam · jump or move','projectile',1.35,.25,1.35,.85,{speed:330,count:1,color:'#f1d779'}),
 chainLightning:attack('Chain lightning · clear the marked ground','lightning',1.5,.6,1.45,1.1,{width:185,chain:true}),
 conductive:attack('Conductive ground · leave the yellow area','lightning',1.65,1.2,1.5,1.05,{width:220,hazard:true}),
 lightningStorm:attack('Storm strike · move out of the yellow area','lightning',1.8,.55,1.55,1.35,{width:245,chain:true}),
 smog:attack('Slow smog · watch its path','projectile',1.2,.3,1.35,.85,{speed:175,count:2,color:'#809689'}),
 pollutionClaw:attack('Pollution claws · step back','melee',1.1,.3,1.4,1,{reach:200}),
 gust:attack('Wind gust · jump','wave',1.3,.4,1.45,1,{speed:330}),
 cloud:attack('Toxic cloud · leave its path','cloud',1.4,.4,1.5,1,{width:155,life:3}),
 smogTornado:attack('Pollution tornado · move away','tornado',1.65,.6,1.6,1.25,{width:150,life:3}),
 beastClaw:attack('Three-headed claw swipe','melee',1.05,.35,1.4,1,{reach:185}),
 lunge:attack('Forward lunge · jump or retreat','charge',1.2,.58,1.5,1,{speed:380,reach:240}),
 leap:attack('Leaping impact · leave the landing zone','leap',1.5,.85,1.65,1.25,{width:200}),
 beastCombo:attack('Claw combination · stay clear','melee',1.15,.65,1.5,1.15,{reach:230}),
 beastCharge:attack('Beast charge · jump','charge',1.45,.8,1.7,1.3,{speed:460,reach:360}),
 sonicShot:attack('Sonic blast · jump','projectile',1.3,.3,1.4,1,{speed:315,count:1,color:'#c6aad6'}),
 tuskStrike:attack('Tusk strike · step back','melee',1.2,.35,1.45,1.1,{reach:210}),
 sonicRing:attack('Expanding sound · jump','wave',1.4,.45,1.5,1.1,{speed:285}),
 tuskCharge:attack('Tusk charge · jump','charge',1.45,.7,1.7,1.2,{speed:370,reach:300}),
 sonicOverlap:attack('Layered sound waves · time your jump','wave',1.65,.6,1.8,1.25,{speed:340,double:true}),
 tuskCombo:attack('Tusk combination · retreat','melee',1.25,.65,1.55,1.2,{reach:265}),
 styroBounce:attack('Bouncing foam · watch the arc','bounce',1.3,.3,1.5,.85,{speed:240,count:2,color:'#e9e5d0'}),
 styroShot:attack('Styrofoam shot','projectile',1.15,.25,1.35,.85,{speed:260,count:1,color:'#e9e5d0'}),
 styroWall:attack('Foam barrier · attacks reduced briefly','barrier',1.35,2.4,1.6,0,{width:155}),
 machineTrap:attack('Mechanical trap · leave the marker','trap',1.5,.4,1.55,1.1,{width:145,spots:2,life:2}),
 machinery:attack('Laboratory crushers · leave the markers','fall',1.8,.5,1.75,1.3,{width:110,spots:3}),
 styroVolley:attack('Bouncing foam volley','bounce',1.4,.5,1.5,1,{speed:300,count:3,color:'#e9e5d0'}),
 legendPunch:attack('Heavy punch · step back','melee',1.15,.3,1.5,1.1,{reach:190}),
 toxicShot:attack('Toxic projectile','projectile',1.25,.3,1.4,.9,{speed:270,count:1,color:'#bdd26b'}),
 toxicRing:attack('Expanding toxic shockwave · jump','wave',1.45,.4,1.5,1.1,{speed:290}),
 legendSlam:attack('Heavy ground slam · jump','ground',1.5,.4,1.6,1.25,{width:260}),
 toxicGround:attack('Toxic ground · leave the markers','trap',1.7,.4,1.7,1.2,{width:145,spots:3,life:2.5}),
 toxicCombo:attack('Toxic combination · jump','wave',1.5,.55,1.6,1.2,{speed:330,double:true}),
 thornShot:attack('Thorn volley','projectile',1.2,.3,1.35,.9,{speed:285,count:3,color:'#91b873'}),
 legendVine:attack('Vine strike · step back','melee',1.15,.35,1.4,1,{reach:245}),
 poisonPatch:attack('Poison patch · leave the marker','trap',1.5,.4,1.5,1.05,{width:170,life:3}),
 thornSweep:attack('Sweeping thorns · jump','sweep',1.4,.45,1.55,1.15,{reach:320}),
 vinePair:attack('Sweeping vine combination · jump','sweep',1.3,.6,1.55,1.15,{reach:345}),
 vineField:attack('Rising vines · leave the markers','ground',1.7,.6,1.7,1.3,{width:130,spots:3}),
 poisonFan:attack('Poison fan · find a gap','projectile',1.45,.4,1.55,1,{speed:310,count:5,color:'#a16da8'}),
 atomicShot:attack('Concentrated atomic blast','projectile',1.3,.3,1.45,1,{speed:335,count:1,color:'#ebd078'}),
 atomicPulse:attack('Atomic pulse · jump','wave',1.45,.4,1.55,1.05,{speed:260}),
 atomicRing:attack('Expanding energy rings · jump','wave',1.5,.5,1.55,1.15,{speed:315,double:true}),
 radioactiveFall:attack('Radioactive debris · leave the markers','fall',1.65,.5,1.6,1.1,{width:110,spots:3}),
 atomicStorm:attack('Atomic shockwave · time your jump','wave',1.8,.65,1.8,1.35,{speed:360,double:true}),
 atomicVolley:attack('Atomic fan · find a gap','projectile',1.5,.45,1.6,1.1,{speed:350,count:3,color:'#f0c36b'}),
});
export const MERGE_POWERS=Object.freeze({
 lightning:{name:'Lightning Strike',icon:'ϟ',cooldown:14,damage:950,delay:.45,radius:90,offensive:true,summary:'One marked strike 220 units forward; hits enemies within 90 units.'},
 air:{name:'Toxic Tornado',icon:'≋',cooldown:24,damage:220,duration:3,radius:100,after:true,offensive:true,summary:'A moving three-second vortex. Ticks each second; lifts regular enemies, never bosses.'},
 styrodog:{name:'Beast Charge',icon:'➤',cooldown:16,damage:1050,duration:.6,speed:480,after:true,offensive:true,summary:'Grounded forward charge. Collides normally; hits each enemy once. No invulnerability.'},
 sonic:{name:'Sonic Blast',icon:'◉',cooldown:12,damage:800,speed:640,offensive:true,summary:'A straight piercing sonic projectile; up to eight enemies with physical pushback.'},
 styro:{name:'Styro Barrier',icon:'⬡',cooldown:24,absorb:650,duration:6,after:true,offensive:false,summary:'Absorb up to 650 incoming damage for six seconds after normal defense reductions.'},
 wastelander:{name:'Toxic Shockwave',icon:'⌁',cooldown:18,damage:900,speed:420,offensive:true,summary:'Two ground waves travel in opposite directions. Airborne enemies can evade them.'},
 venomis:{name:'Poison Vines',icon:'♧',cooldown:20,damage:210,duration:4,targets:5,after:true,offensive:true,summary:'Four squeezing ticks on up to five grounded foes. Bosses attack normally at half movement speed.'},
 atomdust:{name:'Atomic Burst',icon:'✧',cooldown:20,damage:1250,delay:.65,radius:240,offensive:true,summary:'A delayed radial burst around your position; hits every enemy inside 240 units once.'},
});
export const MERGE_CATALOG=Object.freeze(Object.fromEntries(LEGENDARY_IDS.flatMap(id=>['helmet','chest','boots'].map((part,i)=>{
 const d=LEGENDARY[id],catalogId=`merge-${id}-${part}`,stats=Object.fromEntries(STAT_KEYS.map((k,n)=>{const third=+(d.stats[n]*.33).toFixed(4);return [k,i===2?+(d.stats[n]-third*2).toFixed(4):third];}));
 return [catalogId,{id:catalogId,setId:`legendary-${id}`,mergeId:id,setName:`${d.name} Merge`,name:`${d.name} ${part==='chest'?'Chest Piece':part==='helmet'?'Helmet':'Boots'}`,part,region:d.region,rarity:'legendary',level:99,color:d.colors[0],accent:d.colors[1],emblem:id==='venomis'?'leaf':id==='lightning'?'bolt':'star',catalogValue:0,shop:false,sellable:false,stats}];
}))));
