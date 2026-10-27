/* Competitive data only. Never mutate heroes, villainNames or Story configuration. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HealthiaCompetitiveData=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
  const roster=[
    {id:'summy',name:'Super Summy',hero:0,speed:300,height:278,width:43,color:'#b8f9cb',style:'Range · Control',specialName:'Earth Whirlwind',skillName:'Gust Push'},
    {id:'sadie',name:'Super Sadie',hero:1,speed:270,height:250,width:42,color:'#ffe474',style:'Power · Impact',specialName:'Rock Break',skillName:'Earth Smash'},
    {id:'vee',name:'Super Vee',hero:2,speed:355,height:250,width:40,color:'#b8f4ff',style:'Speed · Combos',specialName:'Speed Blitz',skillName:'Quick Escape'},
    {id:'air',name:'Air Pollution Monster',villain:0,speed:245,height:330,width:61,color:'#a7bbc5',style:'Smoke · Control',specialName:'Smog Storm',skillName:'Toxic Cloud'},
    {id:'styrodog',name:'Styrodog',villain:1,speed:270,height:285,width:105,color:'#f5e7ce',style:'Claws · Foam',specialName:'Multihead Rush',skillName:'Foam Slam'},
    {id:'sonic',name:'Sonic Tusk',villain:2,speed:250,height:300,width:51,color:'#d6a2ff',style:'Sonic · Space',specialName:'Horn Blast',skillName:'Bass Stomp'},
    {id:'venomis',name:'Venomis & Thornbear',villain:3,speed:250,height:285,width:110,color:'#b1ed7e',style:'Vines · Claws',specialName:'Feral Bloom',skillName:'Vine Snare'},
    {id:'styro',name:'Dr. Styro',villain:4,speed:240,height:300,width:56,color:'#f9efe3',style:'Foam · Spikes',specialName:'Double Trouble',skillName:'Spike Bed'},
    {id:'wastelander',name:'Wastelander',villain:5,speed:230,height:310,width:95,color:'#d8b277',style:'Trash · Mallet',specialName:'Mallet Crush',skillName:'Acid Spill'},
    {id:'atomdust',name:'AtomDust',villain:6,speed:325,height:285,width:45,color:'#e8c4a0',style:'Debris · Evasion',specialName:'Debris Barrage',skillName:'Cigarette Smoke'},
    {id:'spree',name:'Lightening Spree',villain:7,speed:290,height:315,width:45,color:'#d8f7ff',style:'Crystal · Light',specialName:'Prism Beam',skillName:'Vanish / Teleport'},
    {id:'bushman',name:'Bushman',villain:8,speed:295,height:240,width:43,color:'#ffb267',style:'Fire · Four-hit Blast',specialName:'Crossed-arm Fire Blast',skillName:'Burning Ground'}
  ];
  const move=(name,damage,startup,active,recovery,options={})=>({name,damage,startup,active,recovery,range:150,band:[45,200],kind:'melee',cooldown:0,cost:0,...options});
  const moves={};
  for(const c of roster){
    const heavy=['sadie','styro','wastelander'].includes(c.id),fast=['vee','atomdust'].includes(c.id),reach=c.width>50?170:140;
    moves[c.id]={
      punch:move(c.id==='air'?'Smoke Punch':c.id==='styrodog'||c.id==='venomis'?'Claw Strike':c.id==='spree'?'Crystal Strike':c.id==='bushman'?'Fire Punch':'Light Punch',heavy?7:6,fast?.085:.11,.085,fast?.19:.23,{range:reach}),
      heavyPunch:move('Heavy Punch',c.id==='bushman'?11:heavy?12:10,.22,.10,.34,{range:reach+12,push:220}),
      kick:move(c.id==='bushman'?'Fire Kick':c.id==='styrodog'?'Foam Strike':'Light Kick',heavy?9:8,.16,.10,.26,{range:reach+22,band:[25,160]}),
      heavyKick:move(c.id==='sonic'?'Horn Drive':'Heavy Kick',heavy?14:12,.28,.12,.42,{range:reach+35,band:[20,175],knockdown:true,push:290}),
      sweep:move('Low Sweep',10,.16,.12,.26,{range:reach+25,band:[12,110],push:95}),
      uppercut:move('Rising Uppercut',12,.18,.12,.42,{range:reach+20,band:[45,270],knockdown:true,push:230}),
      shoot:move('Projectile',8,.22,.06,.40,{kind:'projectile',range:850,speed:500,radius:21,cooldown:1.05,visual:c.id}),
      skill:move(c.skillName,12,.40,.12,.45,{kind:'zone',range:310,radius:82,delay:.5,life:2.4,ticks:3,cooldown:5,visual:c.id}),
      special:move(c.specialName,20,.48,.14,.65,{range:240,cost:100,cooldown:5,knockdown:true,visual:c.id,push:320})
    };
  }
  const set=(id,key,props)=>Object.assign(moves[id][key],props);
  set('summy','shoot',{name:'Wind Gust',damage:7,visual:'wind'});
  set('summy','skill',{kind:'melee',range:230,damage:12,push:360});
  set('summy','special',{kind:'projectile',damage:18,speed:420,range:870,radius:55,visual:'tornado'});
  set('sadie','shoot',{name:'Rock Shard',range:500,speed:430,visual:'rock'});
  set('sadie','skill',{kind:'wave',damage:14,speed:380,range:320,visual:'rock',knockdown:true});
  set('sadie','special',{damage:24,range:220,startup:.52,visual:'rock'});
  set('vee','shoot',{name:'Speed Spark',damage:6,speed:620,cooldown:1,visual:'speed'});
  set('vee','skill',{kind:'evade',damage:0,startup:.1,active:.12,recovery:.15,cooldown:3});
  set('vee','special',{damage:20,strikes:5,interval:.10,active:.55,range:190,lunge:210,visual:'speed'});
  set('air','shoot',{name:'Smoke Fist',visual:'smoke'});
  set('air','skill',{slow:.8,visual:'smoke'});
  set('air','special',{kind:'storm',range:430,radius:82,startup:.7,active:.38,recovery:.75,damage:18,visual:'smoke'});
  set('styrodog','shoot',{name:'Flying Foam',visual:'foam',speed:440});
  set('styrodog','skill',{kind:'wave',damage:14,speed:350,range:450,visual:'foam',knockdown:true});
  set('styrodog','special',{damage:18,strikes:3,interval:.12,active:.4,lunge:155,range:235,visual:'foam'});
  set('sonic','shoot',{name:'Sonic Pulse',visual:'sonic',radius:28});
  set('sonic','skill',{kind:'wave',damage:14,speed:390,range:570,visual:'sonic',knockdown:true});
  set('sonic','special',{kind:'beam',range:560,band:[80,240],damage:22,startup:.68,visual:'sonic'});
  set('venomis','shoot',{name:'Plant Projectile',damage:7,visual:'plant'});
  set('venomis','skill',{kind:'snare',range:380,radius:60,delay:.75,life:.5,ticks:1,root:.4,visual:'vine'});
  set('venomis','special',{range:240,lunge:90,visual:'plant'});
  set('styro','shoot',{name:'Foam Spike',visual:'spike'});
  set('styro','skill',{kind:'snare',damage:14,range:280,radius:85,delay:.65,life:.6,ticks:1,visual:'spike'});
  set('styro','special',{damage:20,strikes:2,interval:.16,active:.4,range:255,startup:.65,visual:'foam'});
  set('wastelander','shoot',{name:'Trash Cannon',speed:470,visual:'trash'});
  set('wastelander','skill',{visual:'acid',range:270});
  set('wastelander','special',{damage:24,startup:.68,range:265,recovery:.8,visual:'mallet'});
  set('atomdust','shoot',{name:'Bottle Cap',damage:7,speed:610,visual:'cap'});
  set('atomdust','skill',{visual:'cigarette',slow:1,range:300});
  set('atomdust','special',{kind:'projectile',damage:18,strikes:3,interval:.15,active:.45,speed:580,range:850,radius:22,visual:'debris'});
  set('spree','shoot',{name:'Light Bolt',speed:850,cooldown:1.3,visual:'light'});
  set('spree','skill',{kind:'teleport',damage:0,startup:.4,active:.12,recovery:.35,cooldown:8,range:240});
  set('spree','special',{kind:'beam',damage:20,range:650,band:[80,240],startup:.75,recovery:.75,visual:'light'});
  set('bushman','shoot',{name:'Fireball',visual:'fire',speed:480});
  set('bushman','skill',{damage:14,visual:'fire',ticks:4,life:2.8});
  set('bushman','special',{damage:22,cost:0,requiresHits:4,range:420,startup:.75,active:.16,recovery:.8,kind:'beam',band:[40,235],visual:'fire'});
  // Competitive archetypes: all keep 100 HP; power, reach and speed carry recovery costs.
  const profiles={
    summy:['Mid-range controller','Long normal reach and strong Gust Push knockback.','Average speed; whirlwind travels slowly and can be blocked.','Hold mid-range, push attackers away, then cover their approach.',110,.11,.23],
    sadie:['Close-range powerhouse','High normal damage and hard knockdowns.','Shorter reach and slow heavy recovery; missed swings are punishable.','Walk behind rock shots and punish a missed attack up close.',85,.14,.27],
    vee:['Fast rushdown','Fastest walk, quick normals and a three-second escape skill.','Lower normal damage and short reach; must get close to threaten.','Close distance, use short strings, then escape before retaliation.',80,.08,.17],
    air:['Area controller','Long smoke punches and delayed cloud/storm control.','Large target, slow movement and slower projectile startup.','Place clouds ahead of the opponent and guard the space around them.',115,.15,.28],
    styrodog:['Advancing bruiser','Broad claw reach, foam knockdown and a multihead advancing special.','Wide hurtbox, modest projectile range and committed heavy recovery.','Use foam to approach, then threaten claws and the multihead rush.',95,.12,.25],
    sonic:['Spacing specialist','Long normal reach and a far-travelling low bass wave.','Slow walking and clearly telegraphed horn blast.','Keep opponents at the end of your reach; punish their approach.',120,.14,.26],
    venomis:['Trap specialist','Long claws and a vine snare that briefly roots opponents.','Very wide target; snare is delayed and can be escaped by jumping.','Predict movement with vines, then close in after the snare connects.',120,.15,.28],
    styro:['Heavy trap fighter','Powerful normals and a damaging spike trap.','Slow approach, long heavy recovery and delayed double strike.','Use spikes to limit movement, then punish at close range.',100,.16,.29],
    wastelander:['Heavy punisher','Long mallet reach, strong normals and lingering acid.','Slowest walk, large target and long mallet recovery.','Use trash and acid to invite a mistake; commit to mallet only on an opening.',105,.17,.30],
    atomdust:['Evasive skirmisher','Fast walking, quick bottle caps and brief evasive dashes.','Lower normal damage, short reach and a longer dash cooldown.','Hit and reposition; save dash evasion for an incoming attack.',80,.085,.19],
    spree:['Mobile beam fighter','Fast light shots, teleport and temporary concealment.','Eight-second teleport cooldown; beams are slow to start and recover.','Create distance before firing; teleport early, not after being hit.',95,.12,.25],
    bushman:['Momentum fighter','Fire attacks build a four-hit blast; burning ground controls space.','Blast must be earned with unblocked hits; burns do not charge it.','Mix fireballs with close attacks, then use the blast when an opening appears.',90,.11,.23]
  };
  for(const c of roster){
    const [role,strength,weakness,plan,reach,startup,recovery]=profiles[c.id];
    Object.assign(c,{role,strength,weakness,plan});
    const r=c.width+reach;
    for(const [key,offset] of [['punch',0],['heavyPunch',12],['kick',22],['heavyKick',35],['sweep',25],['uppercut',20]])set(c.id,key,{range:r+offset});
    set(c.id,'punch',{startup,recovery});
    set(c.id,'kick',{startup:startup+.05,recovery:recovery+.03});
    const heavy=['sadie','styro','wastelander'].includes(c.id),fast=['vee','atomdust'].includes(c.id);
    set(c.id,'heavyPunch',{startup:heavy?.27:fast?.20:.23,recovery:heavy?.42:fast?.31:.36});
    set(c.id,'heavyKick',{startup:heavy?.32:fast?.25:.29,recovery:heavy?.48:fast?.38:.43});
    if(fast){set(c.id,'punch',{damage:5});set(c.id,'kick',{damage:7});}
  }
  set('air','shoot',{startup:.30,recovery:.46,cooldown:1.25,range:720});
  set('styrodog','shoot',{range:620,cooldown:1.2});
  set('sonic','shoot',{range:750,cooldown:1.2});
  set('venomis','shoot',{range:650,cooldown:1.15});
  set('styro','shoot',{range:650,cooldown:1.2});
  set('wastelander','shoot',{startup:.28,recovery:.46,cooldown:1.25});
  set('atomdust','shoot',{startup:.18,recovery:.34,cooldown:1.1,range:720});
  set('spree','shoot',{startup:.28,recovery:.48});
  return freeze({roster,moves,health:100,byId:Object.fromEntries(roster.map(c=>[c.id,c])),difficulty:{easy:{reaction:.48,aggression:.4,guard:.18},medium:{reaction:.26,aggression:.65,guard:.48},hard:{reaction:.14,aggression:.85,guard:.74}}});
});
