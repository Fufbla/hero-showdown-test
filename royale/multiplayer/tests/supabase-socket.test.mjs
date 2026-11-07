import test from 'node:test';
import assert from 'node:assert/strict';
import {WebSocketServer,WebSocket} from 'ws';
import {serveSocket} from '../supabase-test/socket-server.mjs';
import {EdgeSocketTransport} from '../supabase-test/socket-client.mjs';
import {SupabaseTestClient} from '../supabase-test/client.mjs';
const token='a'.repeat(64),wait=ms=>new Promise(r=>setTimeout(r,ms));
async function server(handler,options={}){
 const wss=new WebSocketServer({port:0});await new Promise(r=>wss.once('listening',r));
 const urls=[],jobs=[];wss.on('connection',(socket,req)=>{urls.push(req.url);jobs.push(serveSocket(socket,handler,'http://fixture',options));});
 return {url:'http://127.0.0.1:'+wss.address().port+'/?forceFunctionRegion=us-west-2',urls,wss,close:async()=>{for(const s of wss.clients)s.close();await Promise.all(jobs);await new Promise(r=>wss.close(r));}};
}
test('persistent requests bind authenticated actor and never put credentials in the URL',async()=>{
 const seen=[],s=await server(async req=>{const b=await req.json();seen.push({auth:req.headers.get('authorization'),b});return Response.json({ok:true});});
 const c=new EdgeSocketTransport(s.url,token,{Socket:WebSocket});
 try{await c.start();assert.equal((await c.request({action:'sync',inputSeq:1,token:'forged',input:{punch:true}})).status,200);assert.ok(s.urls.every(u=>!u.includes(token)));assert.ok(seen.every(r=>r.auth==='Bearer '+token));assert.equal(seen[1].b.inputSeq,1);}finally{c.close();await s.close();}
});
test('warm replacement lets the old response complete before retiring its connection',async()=>{
 let release;const held=new Promise(r=>release=r);const s=await server(async req=>{const b=await req.json();if(b.action==='sync')await held;return Response.json({action:b.action});});const c=new EdgeSocketTransport(s.url,token,{Socket:WebSocket});
 try{await c.start();const first=c.primary;const response=c.request({action:'sync',inputSeq:1});await wait(30);await c.rotate();assert.notEqual(c.primary,first);assert.equal(first.socket.readyState,1);release();assert.equal((await response).data.action,'sync');await wait(20);assert.equal(first.socket.readyState,3);assert.equal(c.metrics.renewals,1);}finally{release();c.close();await s.close();}
});
test('lost responses retry the identical sequence on a new authenticated socket',async()=>{
 const seen=[];let drop=true;let s;s=await server(async req=>{const b=await req.json();if(b.action==='sync'){seen.push(b);if(drop){drop=false;for(const socket of s.wss.clients)socket.close(1012,'Worker refresh');}}return Response.json({ok:true});});const c=new EdgeSocketTransport(s.url,token,{Socket:WebSocket});
 try{await c.start();await c.request({action:'sync',inputSeq:42,input:{jump:true}});assert.equal(seen.length,2);assert.deepEqual(seen[0],seen[1]);assert.equal(c.metrics.connections,2);}finally{c.close();await s.close();}
});
test('unauthenticated and unsupported requests cannot reach the authority',async()=>{
 let calls=0;const s=await server(async()=>{calls++;return Response.json({});});
 try{for(const message of [{type:'request',id:1,body:{action:'sync'}},{type:'auth',token:'invalid'}]){const w=new WebSocket(s.url);await new Promise(r=>w.once('open',r));w.send(JSON.stringify(message));await new Promise(r=>w.once('close',r));}assert.equal(calls,0);
 const c=new EdgeSocketTransport(s.url,token,{Socket:WebSocket});await c.start();await assert.rejects(()=>c.request({action:'new'}));c.close();assert.equal(calls,2);}finally{await s.close();}
});
test('a duplicate during authentication closes the socket but keeps pending work alive',async()=>{
 let release,completed=false;const hold=new Promise(r=>release=r);const s=await server(async()=>{await hold;completed=true;return Response.json({});});
 const w=new WebSocket(s.url);await new Promise(r=>w.once('open',r));w.send(JSON.stringify({type:'auth',token}));await wait(20);w.send(JSON.stringify({type:'auth',token}));await new Promise(r=>w.once('close',r));let closed=false;const finishing=s.close().then(()=>closed=true);await wait(20);assert.equal(closed,false);release();await finishing;assert.equal(completed,true);
});
test('worker request budget returns the committed response before retiring',async()=>{
 const seen=[],s=await server(async req=>{seen.push(await req.json());return Response.json({ok:true});},{maxRequests:1});const c=new EdgeSocketTransport(s.url,token,{Socket:WebSocket});
 try{await c.start();assert.equal((await c.request({action:'sync',inputSeq:1})).status,200);await wait(20);assert.equal((await c.request({action:'sync',inputSeq:2})).status,200);assert.deepEqual(seen.filter(b=>b.action==='sync').map(b=>b.inputSeq),[1,2]);}finally{c.close();await s.close();}
});
test('lightweight relay forwards only the bound session to the fixed authority',async()=>{
 const {relayHandler}=await import('../supabase-test/stream-edge.mjs');let sent;
 const relay=relayHandler('https://owned/functions/v1/royale-mp-test',async(url,options)=>{sent={url,options};return Response.json({state:{hp:12}});});
 const response=await relay(new Request('https://untrusted/override',{method:'POST',headers:{Authorization:'Bearer '+token,'X-Target':'https://untrusted'},body:JSON.stringify({action:'sync',inputSeq:7})}));
 assert.deepEqual(await response.json(),{state:{hp:12}});assert.equal(sent.url,'https://owned/functions/v1/royale-mp-test');assert.equal(sent.options.headers.Authorization,'Bearer '+token);assert.equal(sent.options.headers['X-Target'],undefined);
 const unavailable=relayHandler('https://owned',async()=>{throw Error('internal details');});const failed=await unavailable(new Request('https://owned',{method:'POST',body:'{}'}));assert.equal(failed.status,503);assert.ok(!(await failed.text()).includes('internal details'));
});
test('temporary relay failure falls back to HTTP but rejected credentials do not',async()=>{
 const start=EdgeSocketTransport.prototype.start;let status=503,calls=0;
 EdgeSocketTransport.prototype.start=async()=>{throw Object.assign(Error('Relay unavailable'),{status});};
 try{const c=new SupabaseTestClient({endpoint:'https://fixture/royale-mp-test'},()=>token);c.api=async()=>{calls++;return {heroes:[]};};await c.connect();assert.equal(calls,1);assert.equal(c.socket,null);status=401;await assert.rejects(()=>c.connect());assert.equal(calls,1);c.close();}finally{EdgeSocketTransport.prototype.start=start;}
});
