// A persistent transport around the SAME stateless, transactional authority.
// No room or progression is kept exclusively in this worker. Workers/sockets
// can rotate without transferring authority or abandoning confirmed progress.
export function serveSocket(socket,handler,url,{lifetimeMs=30000,authTimeoutMs=10000,maxRequests=60,now=Date.now}={}){
  let token='',authenticating=false,busy=false,closed=false,requests=0,windowAt=now(),windowCount=0,finish;
  const done=new Promise(resolve=>finish=resolve);
  const close=(code,reason)=>{if(!closed)socket.close(code,reason);};
  const sendRaw=value=>{if(socket.readyState===1){if(socket.bufferedAmount>1024*1024)close(1009,'Connection too slow');else socket.send(value);}};
  const send=value=>sendRaw(JSON.stringify(value));
  const authTimer=setTimeout(()=>close(1008,'Authentication timed out'),authTimeoutMs);
  const lifeTimer=setTimeout(()=>close(1012,'Refresh connection'),lifetimeMs);
  const onClose=()=>{closed=true;clearTimeout(authTimer);clearTimeout(lifeTimer);if(!busy&&!authenticating)finish();};
  socket.addEventListener('close',onClose);socket.addEventListener('error',()=>close(1011,'Connection interrupted'));
  socket.addEventListener('message',async event=>{
    let ownsAuth=false,ownsRequest=false;
    try{
      if(closed)return;
      if(typeof event.data!=='string'||event.data.length>20000){close(1009,'Invalid message size');return;}
      const m=JSON.parse(event.data);
      if(!m||typeof m!=='object'||Array.isArray(m)){close(1008,'Invalid message');return;}
      if(!token){
        if(authenticating||m.type!=='auth'||!/^[a-f0-9]{64}$/.test(m.token||'')){close(1008,'Authenticate first');return;}
        authenticating=true;ownsAuth=true;
        const response=await handler(new Request(url,{method:'POST',headers:{Authorization:'Bearer '+m.token},body:JSON.stringify({action:'hello'})}));
        const data=await response.json();
        if(!response.ok){send({type:'rejected',status:response.status,data});close(1008,'Test session unavailable');return;}
        token=m.token;clearTimeout(authTimer);send({type:'ready',data,renewAfterMs:8000});return;
      }
      if(now()-windowAt>=1000){windowAt=now();windowCount=0;}
      if(++windowCount>12||busy){close(1008,'Too many requests');return;}
      if(++requests>maxRequests){close(1012,'Refresh connection');return;}
      if(m.type!=='request'||!Number.isSafeInteger(m.id)||m.id<1||!m.body||!['hello','select','profile','sync','command','release','disconnect'].includes(m.body.action)){close(1008,'Unsupported request');return;}
      busy=true;ownsRequest=true;
      // Authentication stays bound to this socket. A message cannot change its
      // actor. The handler still checks the session and validates every input.
      const response=await handler(new Request(url,{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify(m.body)}));
      // The trusted HTTP authority already encoded this JSON. Do not decode
      // and re-encode every complete world in the persistent relay worker.
      const data=response.headers.get('content-type')?.includes('application/json')?await response.text():JSON.stringify({error:'Combat service unavailable. Retrying.'});
      sendRaw('{"type":"response","id":'+m.id+',"status":'+response.status+',"data":'+data+'}');
      if(requests>=maxRequests)close(1012,'Refresh connection');
    }catch{close(1011,'Test connection interrupted');}
    finally{if(ownsRequest)busy=false;if(ownsAuth)authenticating=false;if(closed&&!busy&&!authenticating)finish();}
  });
  return done;
}
