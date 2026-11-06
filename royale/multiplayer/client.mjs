import {applyRuntimeDelta} from './delta.mjs';
import {decodeRuntime} from './runtime.mjs';
import {PROTOCOL} from './protocol.mjs';
// Intent-only transport. A command resolves after its durable state, not an early
// acknowledgement, so menus never render an unconfirmed inventory or upgrade.
export class MultiplayerClient extends EventTarget {
  constructor(url,getToken){super();Object.assign(this,{url,getToken,heroId:null,pending:null,closed:true,retry:0,requests:new Map(),generation:0});}
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
  async connect(){
    clearTimeout(this.timer);this.closed=false;const generation=++this.generation;this.emit('status','Connecting');
    try{
      const token=await this.getToken();if(this.closed||generation!==this.generation)return;
      const ws=new WebSocket(this.url);this.socket=ws;this.baseline=null;this.serial=0;this.inputSeq=0;this.ready=false;
      ws.onopen=()=>ws.send(JSON.stringify({type:'auth',token:typeof token==='string'?token:token.token,kind:token?.kind,slot:token?.slot,protocol:PROTOCOL}));
      ws.onmessage=event=>{
        if(generation!==this.generation)return;
        try{
          const m=JSON.parse(event.data);
          if(m.requestId&&this.requests.has(m.requestId)){
            const r=this.requests.get(m.requestId);this.requests.delete(m.requestId);clearTimeout(r.timer);m.type==='error'?r.reject(Error(m.message)):r.resolve(m);return;
          }
          if(m.type==='heroes'){this.retry=0;const selected=this.heroId;this.emit('heroes',m.heroes);if(selected&&this.heroId===selected)this.send({type:'select',id:selected});}
          else if(m.type==='state'){
            if(m.protocol!==PROTOCOL)throw Error('Game version changed. Reload to reconnect.');
            if(m.base!==this.serial)throw Error('State baseline lost.');
            const wasReady=this.ready,oldCode=this.state?.code;this.baseline=applyRuntimeDelta(this.baseline,m.delta);this.serial=m.serial;this.heroId=m.id;this.state=m;this.game=decodeRuntime(JSON.stringify(this.baseline));this.ready=true;
            this.emit('state',{...m,game:this.game});if(!wasReady||oldCode!==m.code)this.emit('status',m.code?'Connected · '+m.code:'Playing solo · account saved');
            if(this.pending){if(m.commandSeq===this.pending.seq&&m.cloudPending!==this.pending.seq){this.pending.resolve(m.commandResult??this.pending.result??true);this.pending=null;}else if(m.commandSeq>this.pending.seq){this.pending.reject(Error('A newer session changed this hero.'));this.pending=null;}else if(this.pending.sentGeneration!==generation){this.send(this.pending.packet);this.pending.sentGeneration=generation;}}
          }else if(m.type==='checkpoint')this.emit('checkpoint',m);
          else if(m.type==='checkpoint-error')this.emit('error',m.message);
          else if(m.type==='ack'&&this.pending?.seq===m.seq)this.pending.result=m.result;
          else if(m.type==='error'){if(this.pending){this.pending.reject(Error(m.message));this.pending=null;}this.emit('error',m.message);if(m.fatal){this.closed=true;ws.close();}}
        }catch(error){this.emit('error',error.message);ws.close();}
      };
      ws.onclose=event=>{
        if(generation!==this.generation)return;this.ready=false;
        for(const r of this.requests.values()){clearTimeout(r.timer);r.reject(Error('Connection interrupted. Your saved hero is retained; reconnect to resume.'));}this.requests.clear();
        this.emit('status','Disconnected · confirmed progress retained');
        if(event.code===4001||event.code===4009){this.closed=true;const reason=event.code===4001?'This hero is active in another connection.':'Cloud save conflict. Your server recovery is retained.';this.pending?.reject(Error(reason));this.pending=null;this.emit('error',reason);}
        if(!this.closed)this.scheduleReconnect();
      };
      ws.onerror=()=>this.emit('status','Connection interrupted');
    }catch(error){this.emit('error',error.message);if(!this.closed)this.scheduleReconnect();}
  }
  scheduleReconnect(){clearTimeout(this.timer);this.timer=setTimeout(()=>this.connect(),Math.min(10000,500*2**this.retry++));}
  send(packet){if(this.socket?.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(packet));}
  request(type,data={}){
    if(this.socket?.readyState!==WebSocket.OPEN)return Promise.reject(Error('Connect to your account first.'));
    const requestId=[...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,'0')).join('');return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.requests.delete(requestId);reject(Error('Request timed out. Retry to recover the existing transfer.'));},15000);this.requests.set(requestId,{resolve,reject,timer});this.send({type,...data,requestId});});
  }
  select(id){this.heroId=id;this.send({type:'select',id});}
  create(slot,look){this.send({type:'create',slot,look});}
  input(input){if(this.ready)this.send({type:'input',seq:++this.inputSeq,input});}
  command(method,args=[]){
    if(this.pending)return Promise.reject(Error('Wait for the previous change to be confirmed.'));
    if(!this.ready)return Promise.reject(Error('Reconnect before changing your hero.'));
    const seq=this.state.commandSeq+1,packet={type:'command',seq,method,args};
    return new Promise((resolve,reject)=>{this.pending={seq,packet,resolve,reject,sentGeneration:this.generation};this.send(packet);});
  }
  close(){this.closed=true;clearTimeout(this.timer);this.socket?.close();this.ready=false;this.pending?.reject(Error('Connection closed. Confirmed progress is retained.'));this.pending=null;}
}
