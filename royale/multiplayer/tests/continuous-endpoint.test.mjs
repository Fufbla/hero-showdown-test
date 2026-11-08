import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startContinuousServer} from '../continuous-server.mjs';
import {connect} from './socket-helper.mjs';
test('continuous entry point blocks original account auth and exposes only origin-checked test-copy requests',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'continuous-endpoint-')),calls=[];
 const bridge={copyTestHero:async(...args)=>{calls.push(args);return {id:args[1].id,slot:0};}};
 const app=startContinuousServer({bridge,path:join(dir,'test.sqlite'),origins:['http://localhost'],autoTick:false});await once(app.server,'listening');
 const url='http://127.0.0.1:'+app.server.address().port;let client;
 try{
  assert.equal((await fetch(url+'/health')).status,200);
  assert.equal(app.metrics().snapshotHz,30);
  assert.equal((await fetch(url+'/test/copy',{method:'POST',body:'{}'})).status,403);assert.equal(calls.length,0);
  const r=await fetch(url+'/test/copy',{method:'POST',headers:{Origin:'http://localhost',Authorization:'Bearer fixture-source'},body:JSON.stringify({id:'fixture-id',token:'fixture-token'})});
  assert.equal(r.status,200);assert.deepEqual(calls,[['fixture-source',{id:'fixture-id',token:'fixture-token'}]]);
  client=await connect(url.replace('http:','ws:')+'/royale','original-account-token');assert.match(client.messages.at(-1).message,/isolated continuous-test/);
 }finally{client?.ws.terminate();await app.close();await rm(dir,{recursive:true,force:true});}
});
