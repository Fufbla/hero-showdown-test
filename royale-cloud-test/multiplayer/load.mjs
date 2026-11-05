import {once} from 'node:events';
import {performance} from 'node:perf_hooks';
import os from 'node:os';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {startServer} from './server.mjs';
import {connect,createAndSelect} from './tests/socket-helper.mjs';
const seconds=Number(process.env.LOAD_SECONDS||10),groups=(process.env.LOAD_GROUPS||'2,4,8,16,32,64').split(',').map(Number);
const read=path=>{try{return readFileSync(path,'utf8').trim();}catch{return null;}};
const report={timestamp:new Date().toISOString(),scope:'Local loopback: server and synthetic clients share one process. NOT Hostinger capacity or a production soak test.',runtime:process.version,hardware:{cpu:os.cpus()[0]?.model,logicalCPUs:os.cpus().length,availableParallelism:os.availableParallelism(),memoryBytes:os.totalmem(),cgroupCPU:read('/sys/fs/cgroup/cpu.max'),cgroupMemory:read('/sys/fs/cgroup/memory.max')},secondsPerGroup:seconds,results:[]};
const quantile=(a,q)=>a.length?[...a].sort((x,y)=>x-y)[Math.min(a.length-1,Math.floor(a.length*q))]:null;
for(const count of groups){
  const directory=mkdtempSync(join(os.tmpdir(),'royale-load-'));
  const app=startServer({allowNewHeroes:true,capacity:count,maxConnections:count,origins:['http://localhost'],path:join(directory,'load.sqlite'),authenticate:async token=>({id:token,expiresAt:Date.now()+3600000})});
  await once(app.server,'listening');const url=`ws://127.0.0.1:${app.server.address().port}/royale`,clients=[],latencies=[],errors=[];let timer;
  try{
    let code;
    for(let i=0;i<count;i++){
      const c=await connect(url,'load-'+i);clients.push(c);const initial=await createAndSelect(c);c.id=initial.id;c.seq=0;c.sent=new Map();
      const result=await c.request({type:'command',seq:1,method:'mode',args:i?['join',code]:['create']},m=>m.type==='ack'||m.type==='error');
      if(result.type==='error')throw Error(result.message);if(!i)code=result.result.code;
      c.ws.on('message',bytes=>{const m=JSON.parse(bytes);if(m.type==='state'&&c.sent.has(m.inputSeq)){latencies.push(performance.now()-c.sent.get(m.inputSeq));for(const seq of c.sent.keys())if(seq<=m.inputSeq)c.sent.delete(seq);}if(m.type==='error')errors.push(m.message);});
    }
    // Warm up the graph, then isolate measurement counters from connection setup.
    app.stats.tickSamples.length=0;const before={...app.metrics()},cpuStart=process.cpuUsage(),start=performance.now();let serial=0;
    timer=setInterval(()=>{serial++;for(const c of clients){const seq=++c.seq;c.sent.set(seq,performance.now());c.send({type:'input',seq,input:{move:Math.floor(serial/90)%2?-1:1,run:true,jump:serial%90===30||serial%90===40,punchHeld:true}});c.messages.length=0;}},1000/30);
    await new Promise(resolve=>setTimeout(resolve,seconds*1000));clearInterval(timer);
    const elapsed=(performance.now()-start)/1000,m=app.metrics(),cpu=process.cpuUsage(cpuStart),ticks=m.ticks-before.ticks;
    const result={players:count,connected:app.authority.connections.size,elapsedSeconds:elapsed,simulationHz:ticks/elapsed,tickP95Ms:m.tickP95Ms,eventLoopP99Ms:m.eventLoopP99Ms,inputConfirmationP95Ms:quantile(latencies,.95),rssMiB:m.rssBytes/1048576,combinedCpuPercent:(cpu.user+cpu.system)/1e6/elapsed*100,outgoingKiBPerSecond:(m.bytesOut-before.bytesOut)/1024/elapsed,incomingKiBPerSecond:(m.bytesIn-before.bytesIn)/1024/elapsed,errors:[...new Set(errors)]};
    result.passed=clients.length===count&&result.connected===count&&result.simulationHz>=57&&result.tickP95Ms<16.67&&result.inputConfirmationP95Ms!==null&&result.inputConfirmationP95Ms<150&&!errors.length;
    report.results.push(result);console.log(JSON.stringify(result));
  }catch(error){report.results.push({players:count,connected:clients.length,passed:false,error:error.message});console.log(JSON.stringify(report.results.at(-1)));}
  finally{clearInterval(timer);for(const c of clients)c.ws.terminate();await app.close();rmSync(directory,{recursive:true,force:true});}
  if(!report.results.at(-1).passed&&process.env.LOAD_CONTINUE_ON_FAILURE!=='1')break;
}
report.largestPassingLocalGroup=Math.max(0,...report.results.filter(r=>r.passed).map(r=>r.players));
report.productionCapacity=null;
const output=resolve(process.argv[2]||'load-results.json');writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log('Saved '+output);
