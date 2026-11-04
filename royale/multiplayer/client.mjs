import {applyRuntimeDelta} from './delta.mjs';
import {decodeRuntime} from './runtime.mjs';
// getToken uses the existing account session. No token is put in a URL or saved
// by this transport. UI/menu bindings remain independent of the authority.
export class MultiplayerClient extends EventTarget {
  constructor(url,getToken){super();this.url=url;this.getToken=getToken;this.heroId=null;this.pending=null;this.closed=true;this.retry=0;}
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
  async connect() {
    this.closed=false;this.emit('status','Connecting');
    try {
      const token=await this.getToken();if(this.closed)return;
      const ws=new WebSocket(this.url);this.socket=ws;this.baseline=null;this.serial=0;this.inputSeq=0;this.ready=false;
      ws.onopen=()=>ws.send(JSON.stringify({type:'auth',token}));
      ws.onmessage=event=>{
        try{
          const message=JSON.parse(event.data);
          if(message.type==='heroes'){this.retry=0;this.emit('heroes',message.heroes);if(this.heroId)this.send({type:'select',id:this.heroId});}
          else if(message.type==='state'){
            if(message.base!==this.serial)throw Error('State baseline lost.');
            this.baseline=applyRuntimeDelta(this.baseline,message.delta);this.serial=message.serial;this.heroId=message.id;this.state=message;this.game=decodeRuntime(JSON.stringify(this.baseline));this.ready=true;
            if(this.pending){if(message.commandSeq>=this.pending.seq){this.pending.resolve({confirmed:true});this.pending=null;}else this.send(this.pending.packet);}
            this.emit('state',{...message,game:this.game});this.emit('status',message.code?'Connected · '+message.code:'Playing solo');
          } else if(message.type==='ack'&&this.pending?.seq===message.seq){this.pending.resolve(message.result);this.pending=null;}
          else if(message.type==='error'){if(this.pending){this.pending.reject(Error(message.message));this.pending=null;}this.emit('error',message.message);}
        }catch(error){this.emit('error',error.message);ws.close();}
      };
      ws.onclose=event=>{this.ready=false;this.emit('status','Disconnected · confirmed progress retained');if(event.code===4001){this.closed=true;this.emit('error','This hero is active in another connection.');}if(!this.closed)this.scheduleReconnect();};
      ws.onerror=()=>this.emit('status','Connection interrupted');
    }catch(error){this.emit('error',error.message);if(!this.closed)this.scheduleReconnect();}
  }
  scheduleReconnect(){clearTimeout(this.timer);this.timer=setTimeout(()=>this.connect(),Math.min(10000,500*2**this.retry++));}
  send(packet){if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(packet));}
  select(id){this.heroId=id;this.send({type:'select',id});}
  create(slot,look){this.send({type:'create',slot,look});}
  input(input){if(this.ready)this.send({type:'input',seq:++this.inputSeq,input});}
  command(method,args=[]) {
    if(this.pending)return Promise.reject(Error('Wait for the previous change to be confirmed.'));
    if(!this.ready)return Promise.reject(Error('Reconnect before changing your hero.'));
    const seq=this.state.commandSeq+1,packet={type:'command',seq,method,args};
    return new Promise((resolve,reject)=>{this.pending={seq,packet,resolve,reject};this.send(packet);});
  }
  close(){this.closed=true;clearTimeout(this.timer);this.socket?.close();this.ready=false;}
}
