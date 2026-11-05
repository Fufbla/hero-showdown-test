// Separate-process, disposable stress server. Never a deployment entry point.
import {startServer} from '../server.mjs';
import {once} from 'node:events';
const count=Number(process.env.LOAD_COUNT),app=startServer({allowNewHeroes:true,capacity:count,maxConnections:count,path:process.env.LOAD_DB,origins:['http://localhost'],authenticate:async id=>({id,expiresAt:Date.now()+3600000})});
let cpu=process.cpuUsage(),at=performance.now();
await once(app.server,'listening');process.send({type:'ready',url:`ws://127.0.0.1:${app.server.address().port}/royale`});
process.on('message',async m=>{
 if(m.type==='fixture'){
  // Multiple simultaneous original Legendary encounters, four heroes per region.
  for(const h of app.authority.state.heroes.values()){
   const index=Number(h.owner.split('-')[1]),g=h.game;g.hero.level=99;g.hero.maxHp=1280;g.hero.hp=1280;g.powers.data.levels.fireball=20;g.powers.data.levels.steel=20;g.powers.data.levels.strength=20;g.powers.data.points=38;g.powers.data.equipped=['fireball','steel','strength'];g.regionId=1+Math.floor(index/4)%7;g.startLegendaryScene('lightning');g.hero.x=500+index%4*60;g.hero.prevX=g.hero.x;app.authority.bind(h);
  }app.authority.commit();app.publish(false);process.send({type:'fixture'});
 }else if(m.type==='measure'){app.stats.tickSamples.length=0;cpu=process.cpuUsage();at=performance.now();process.send({type:'measure',metrics:app.metrics()});}
 else if(m.type==='metrics'){const seconds=(performance.now()-at)/1000,c=process.cpuUsage(cpu);process.send({type:'metrics',metrics:{...app.metrics(),serverCpuPercent:(c.user+c.system)/1e6/seconds*100}});}
 else if(m.type==='close'){await app.close();process.exit(0);}
});
