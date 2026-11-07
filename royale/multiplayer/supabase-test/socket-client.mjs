const transportError=message=>Object.assign(Error(message),{transport:true});

export class EdgeSocketTransport {
  constructor(endpoint,token,{Socket=globalThis.WebSocket,renewMs=8000,timeoutMs=12000}={}){
    const url=new URL(endpoint);url.protocol=url.protocol==='https:'?'wss:':'ws:';
    this.url=url.href;this.token=token;this.Socket=Socket;this.renewMs=renewMs;this.timeoutMs=timeoutMs;
    this.closed=false;this.channels=new Set();this.serial=0;this.metrics={connections:0,requests:0,renewals:0,failures:0};
  }
  get ready(){return this.primary?.socket.readyState===1;}
  async start(){return (await this.rotate()).hello;}
  rotate(){
    if(this.closed)return Promise.reject(transportError('Test connection closed.'));
    if(this.opening)return this.opening;
    this.opening=this.openChannel().then(channel=>{
      if(this.closed){channel.socket.close();throw transportError('Test connection closed.');}
      const old=this.primary;this.primary=channel;
      if(old){this.metrics.renewals++;old.retired=true;if(!old.pending.size)old.socket.close(1000,'Renewed');}
      clearTimeout(this.renewTimer);
      // Open the replacement BEFORE retiring the working socket. In-flight
      // responses finish on the old connection; no pause or save reset occurs.
      this.renewTimer=setTimeout(()=>void this.rotate().catch(()=>this.retryRenewal()),this.renewMs);
      return channel;
    }).finally(()=>{this.opening=null;});
    return this.opening;
  }
  retryRenewal(){if(!this.closed){clearTimeout(this.renewTimer);this.renewTimer=setTimeout(()=>void this.rotate().catch(()=>this.retryRenewal()),1000);}}
  openChannel(){
    return new Promise((resolve,reject)=>{
      const socket=new this.Socket(this.url),channel={socket,pending:new Map(),retired:false,authenticated:false,requests:0};this.channels.add(channel);
      const deadline=setTimeout(()=>{reject(transportError('Persistent connection timed out.'));socket.close();},this.timeoutMs);
      socket.addEventListener('open',()=>socket.send(JSON.stringify({type:'auth',token:this.token})));
      socket.addEventListener('message',event=>{
        try{
          const m=JSON.parse(event.data);
          if(m.type==='ready'&&!channel.authenticated){clearTimeout(deadline);channel.authenticated=true;channel.hello=m.data;this.metrics.connections++;resolve(channel);return;}
          if(m.type==='rejected'){const error=Object.assign(Error(m.data?.error||'Test session expired.'),{status:m.status});reject(error);socket.close();return;}
          if(m.type!=='response')return;
          const pending=channel.pending.get(m.id);if(!pending)return;
          channel.pending.delete(m.id);clearTimeout(pending.timer);pending.resolve({status:m.status,data:m.data});
          if(channel.retired&&!channel.pending.size)socket.close(1000,'Renewed');
        }catch{socket.close(4002,'Invalid response');}
      });
      const fail=()=>{
        clearTimeout(deadline);this.channels.delete(channel);if(this.primary===channel)this.primary=null;
        const error=transportError('Persistent connection interrupted.');reject(error);
        for(const p of channel.pending.values()){clearTimeout(p.timer);p.reject(error);}channel.pending.clear();
      };
      socket.addEventListener('close',fail);socket.addEventListener('error',()=>{this.metrics.failures++;fail();try{socket.close();}catch{}});
    });
  }
  async request(body){
    // Retry transport loss with the exact same input/command sequence. The
    // authority's existing deduplication prevents a second reward or action.
    for(let attempt=0;attempt<2;attempt++){
      const channel=this.ready?this.primary:await this.rotate();
      try{
        return await new Promise((resolve,reject)=>{
          const id=++this.serial,timer=setTimeout(()=>{channel.pending.delete(id);channel.socket.close(4002,'Response timeout');reject(transportError('Persistent response timed out.'));},this.timeoutMs);
          channel.pending.set(id,{resolve,reject,timer});this.metrics.requests++;
          // Warm the next lightweight relay before the current connection ends.
          if(++channel.requests===12)void this.rotate().catch(()=>this.retryRenewal());
          try{channel.socket.send(JSON.stringify({type:'request',id,body}));}catch(error){clearTimeout(timer);channel.pending.delete(id);if(this.primary===channel)this.primary=null;channel.socket.close();reject(transportError(error.message));}
        });
      }catch(error){if(!error.transport||attempt||this.closed)throw error;}
    }
  }
  close(){this.closed=true;clearTimeout(this.renewTimer);for(const c of this.channels)c.socket.close(1000,'Closed');this.primary=null;}
}
