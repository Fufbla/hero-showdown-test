import {fork} from 'node:child_process';
import {once} from 'node:events';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';
import {join} from 'node:path';
import {connect,createAndSelect} from './tests/socket-helper.mjs';
const groups=(process.env.LOAD_GROUPS||'2,4,8,16').split(',').map(Number),seconds=Number(process.env.LOAD_SECONDS||30),warmup=Number(process.env.LOAD_WARMUP||5);
const report={timestamp:new Date().toISOString(),scope:'Separate server and client processes; loopback only. Four heroes per original Lightning Spree encounter in different regions. Not a WAN, mobile rendering or Hostinger capacity measurement.',hardware:{cpu:os.cpus()[0].model,cpus:os.availableParallelism(),memory:os.totalmem()},warmupSeconds:warmup,measurementSeconds:seconds,productionCapacity:null,results:[]};
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),q=(a,n)=>a.length?[...a].sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*n))]:null;
for(const count of groups){
 const dir=mkdtempSync(join(os.tmpdir(),'royale-controlled-')),child=fork(new URL('./tests/load-server.mjs',import.meta.url),{env:{...process.env,LOAD_COUNT:String(count),LOAD_DB:join(dir,'authority.sqlite')},stdio:['ignore','ignore','pipe','ipc']}),clients=[],errors=[],latencies=[],combatLatencies=[];let timer;
 const message=type=>new Promise((resolve,reject)=>{const t=setTimeout(()=>{child.off('message',fn);reject(Error('Server response timeout: '+type));},15000),fn=m=>{if(m.type===type){clearTimeout(t);child.off('message',fn);resolve(m);}};child.on('message',fn);});
 const request=async type=>{const p=message(type);child.send({type});return p;};
 try{
  const {url}=await message('ready');let code;
  for(let i=0;i<count;i++){
   const c=await connect(url,'load-'+i);clients.push(c);const initial=await createAndSelect(c);c.seq=0;c.sent=new Map();
   const response=await c.request({type:'command',seq:1,method:'mode',args:i?['join',code]:['create']},m=>m.type==='ack'||m.type==='error');if(response.type==='error')throw Error(response.message);if(!i)code=response.result.code;
   c.ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='error')errors.push(m.message);if(m.type==='state'&&c.sent.has(m.inputSeq)){const sample=c.sent.get(m.inputSeq),delay=performance.now()-sample.at;latencies.push(delay);if(sample.attack)combatLatencies.push(delay);for(const k of c.sent.keys())if(k<=m.inputSeq)c.sent.delete(k);}});
  }
  await request('fixture');let serial=0;
  timer=setInterval(()=>{serial++;for(const c of clients){const attack=serial%40===0,seq=++c.seq;c.sent.set(seq,{at:performance.now(),attack});c.send({type:'input',seq,input:{move:Math.floor(serial/90)%2?-.4:.4,jump:serial%60===0||serial%60===10,punchHeld:true,powers:[attack,serial%360===0,serial%90===0]}});c.messages.length=0;}},1000/30);
  await sleep(warmup*1000);latencies.length=0;combatLatencies.length=0;const before=(await request('measure')).metrics,start=performance.now();await sleep(seconds*1000);const elapsed=(performance.now()-start)/1000,m=(await request('metrics')).metrics;
  const result={players:count,seconds:elapsed,simulationHz:(m.ticks-before.ticks)/elapsed,tickP95Ms:m.tickP95Ms,eventLoopP99Ms:m.eventLoopP99Ms,inputConfirmationP95Ms:q(latencies,.95),attackInputConfirmationP95Ms:q(combatLatencies,.95),serverCpuPercent:m.serverCpuPercent,rssMiB:m.rssBytes/1048576,outgoingKiBPerSecond:(m.bytesOut-before.bytesOut)/1024/elapsed,incomingKiBPerSecond:(m.bytesIn-before.bytesIn)/1024/elapsed,disconnects:clients.filter(c=>c.ws.readyState!==1).length,errors:[...new Set(errors)]};
  result.passed=result.simulationHz>=57&&result.tickP95Ms<16.67&&result.inputConfirmationP95Ms!==null&&result.inputConfirmationP95Ms<150&&!result.disconnects&&!errors.length;report.results.push(result);console.log(JSON.stringify(result));
 }catch(e){report.results.push({players:count,passed:false,error:e.message});console.log(JSON.stringify(report.results.at(-1)));}
 finally{clearInterval(timer);for(const c of clients)c.ws.terminate();if(child.connected){child.send({type:'close'});await once(child,'exit');}rmSync(dir,{recursive:true,force:true});}
}
report.largestPassingTestGroup=Math.max(0,...report.results.filter(r=>r.passed).map(r=>r.players));writeFileSync(process.argv[2]||'load-results-controlled.json',JSON.stringify(report,null,2)+'\n');
