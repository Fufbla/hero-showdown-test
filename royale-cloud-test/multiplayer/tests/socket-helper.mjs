import {WebSocket} from 'ws';
export async function connect(url,token,origin='http://localhost') {
  const ws=new WebSocket(url,{origin});const messages=[],waiters=[];
  ws.on('message',data=>{const m=JSON.parse(data);messages.push(m);for(const w of [...waiters])if(w.predicate(m)){waiters.splice(waiters.indexOf(w),1);clearTimeout(w.timer);w.resolve(m);}});
  const wait=(predicate,timeout=5000)=>new Promise((resolve,reject)=>{const w={predicate,resolve,timer:setTimeout(()=>{waiters.splice(waiters.indexOf(w),1);reject(Error('Message timeout'));},timeout)};waiters.push(w);});
  await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
  const response=wait(m=>m.type==='heroes'||m.type==='error');ws.send(JSON.stringify({type:'auth',token,protocol:2}));await response;
  return {ws,messages,wait,send:m=>ws.send(JSON.stringify(m)),async request(m,predicate){const result=wait(predicate);ws.send(JSON.stringify(m));return result;},close:()=>ws.close()};
}
export async function createAndSelect(client,slot=0) {
  const created=await client.request({type:'create',slot,look:{name:'Network Hero'}},m=>m.type==='heroes'&&m.created);
  const selected=await client.request({type:'select',id:created.created},m=>m.type==='state'||m.type==='error');
  if(selected.type==='error')throw Error(selected.message);return selected;
}
