import {createClient} from './realtime-sdk.mjs';
import {decodeRuntime} from '../runtime.mjs';
import {CLOUD_CONFIG} from '../../cloud-config.mjs';

export class SupabaseTestClient extends EventTarget {
  constructor(config,getToken){super();this.config=config;this.getToken=getToken;this.ready=false;this.closed=true;this.inputSeq=Date.now();this.unacked=[];this.localPrediction=true;this.generation=0;this.metrics={requests:0,rtt:[],realtimeFrames:0,conflicts:0};}
  emit(type,detail){this.dispatchEvent(new CustomEvent(type,{detail}));}
  async api(body){
    const at=performance.now(),r=await fetch(this.config.endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.token},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)}),data=await r.json();
    this.metrics.requests++;this.metrics.rtt.push(performance.now()-at);if(this.metrics.rtt.length>300)this.metrics.rtt.shift();
    if(!r.ok){if(r.status===409)this.metrics.conflicts++;throw Error(data.error||'Test connection unavailable.');}return data;
  }
  async connect(){this.closed=false;this.generation++;this.emit('status','Connecting to multiplayer test…');const auth=await this.getToken();this.token=auth.token||auth;const data=await this.api({action:'hello'});this.emit('heroes',data.heroes);}
  select(id){this.heroId=id;void this.exchange({action:'select'}).then(()=>this.schedule()).catch(e=>this.emit('error',e.message));}
  async exchange(body){
    const data=await this.api(body);if(this.closed)return data;
    if(data.state){
      const state={...data.state,game:decodeRuntime(data.state.game)};
      this.state=state;this.game=state.game;this.ready=true;
      this.inputSeq=Math.max(this.inputSeq,state.inputSeq||0);this.unacked=this.unacked.filter(p=>p.seq>(state.inputSeq||0));
      this.emit('state',state);if(data.version!==undefined)this.version=Math.max(this.version||0,data.version);
      if(this.roomId!==state.roomId)this.subscribe(state.roomId);
    }
    if(data.checkpoint)this.emit('checkpoint',{snapshot:data.checkpoint.snapshot,revision:data.checkpoint.revision,savedAt:data.checkpoint.saved_at,slot:this.state.cloud.slot});
    return data;
  }
  input(input){
    this.inputSeq=Math.max(this.inputSeq+1,Date.now());
    const previous=this.pendingInput||{};this.pendingInput={...input};
    for(const k of ['jump','punch','kick','heal','interact','portal','tree','nextTarget'])this.pendingInput[k]||=!!previous[k];
    this.pendingInput.powers=Array.from({length:4},(_,i)=>!!input.powers?.[i]||!!previous.powers?.[i]);
    this.unacked.push({seq:this.inputSeq,input:structuredClone(input)});if(this.unacked.length>30)this.unacked.shift();
  }
  schedule(){clearTimeout(this.timer);if(!this.closed)this.timer=setTimeout(()=>this.sync(),200);}
  async sync(){
    if(this.closed)return;
    if(this.busy||!this.state?.roomId){this.schedule();return;}
    this.busy=true;const input=this.pendingInput||{},inputSeq=this.inputSeq;this.pendingInput=null;
    try{await this.exchange({action:'sync',input,inputSeq});}
    catch(e){this.ready=false;this.emit('status','Reconnecting · '+e.message);}
    finally{this.busy=false;this.schedule();}
  }
  async command(method,args=[]){
    // GameSession orders commands; wait for an in-flight sync so the sequence
    // and resulting view cannot race a menu action.
    while(this.busy&&!this.closed)await new Promise(r=>setTimeout(r,20));
    this.busy=true;
    try{const data=await this.exchange({action:'command',seq:this.state.commandSeq+1,method,args});return data.result;}finally{this.busy=false;this.schedule();}
  }
  async request(type){if(type!=='release')throw Error('Unsupported test request.');while(this.busy)await new Promise(r=>setTimeout(r,20));this.busy=true;try{return await this.api({action:'release'});}finally{this.busy=false;}}
  subscribe(id){
    if(this.channel){void this.supa.removeChannel(this.channel);this.channel=null;}
    this.roomId=id;this.version=-1;if(!id)return;
    this.supa??=createClient(CLOUD_CONFIG.url,CLOUD_CONFIG.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    this.channel=this.supa.channel('royale-mp-test:'+id,{config:{presence:{key:this.heroId}}})
      .on('postgres_changes',{event:'*',schema:'public',table:'royale_mp_test_frames',filter:'id=eq.'+id},({new:row})=>{
        if(row.version<=(this.version??-1))return;this.version=row.version;this.metrics.realtimeFrames++;this.emit('visual',row.frame);
      }).subscribe(status=>{if(status==='SUBSCRIBED'){void this.channel.track({hero:this.heroId,online:true});this.emit('status','Realtime connected · test saves only');}});
  }
  close(){
    this.closed=true;this.ready=false;clearTimeout(this.timer);if(this.channel)void this.supa.removeChannel(this.channel);this.channel=null;
    if(this.token&&this.roomId)void fetch(this.config.endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.token},body:JSON.stringify({action:'disconnect'}),keepalive:true}).catch(()=>{});
  }
}
