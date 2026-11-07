import {GameSession} from './game-session.mjs';
import {MAX_ROOM_PLAYERS, AUTOSAVE_MS} from './room-rules.mjs';
import {roomCode} from './protocol.mjs';
import {encodeRuntime} from './runtime.mjs';
export const ROOM_RECEIPTS='healthia.royale.private-rooms.receipts.v1';

export function requestV3Session({slot,snapshot,resume=false},win=window){
  return new Promise((resolve,reject)=>{
    const requestId=crypto.randomUUID(),timer=setTimeout(()=>{win.removeEventListener('message',receive);reject(Error('Could not confirm your saved hero. Try again.'));},20000);
    function receive(event){
      if(event.origin!==win.location.origin||event.source!==win.parent||event.data?.type!=='royale-room-session-result'||event.data.requestId!==requestId)return;
      clearTimeout(timer);win.removeEventListener('message',receive);
      event.data.error?reject(Error(event.data.error)):resolve({token:event.data.access,slot,kind:'v3'});
    }
    win.addEventListener('message',receive);
    win.parent.postMessage({type:'royale-room-session',account:new URLSearchParams(win.location.search||'').get('cloudAccount'),requestId,slot,snapshot,resume},win.location.origin);
  });
}

export class V3MultiplayerMenu {
  constructor(hooks){
    Object.assign(this,hooks);this.privateRooms=true;this.status='Choose Create Multiplayer or enter a friend’s room code.';
    this.dialog=document.createElement('dialog');this.dialog.id='multiplayer-menu';this.dialog.setAttribute('aria-labelledby','multiplayer-title');
    this.dialog.innerHTML=`<header><h2 id="multiplayer-title">Play together</h2><button id="mp-close" aria-label="Close multiplayer menu">×</button></header>
<p id="mp-selected"></p><p>2–${MAX_ROOM_PLAYERS} players · Your hero saves every ${AUTOSAVE_MS/1000} seconds.</p>
<p id="mp-status" role="status" aria-live="polite"></p>
<section id="mp-room"><p id="mp-code" hidden></p><button id="mp-copy" hidden>Copy room code</button><p id="mp-players"></p>
<div class="mp-actions"><button id="mp-create">Create Multiplayer Room</button><form id="mp-join-form"><label for="mp-join-code">Six-digit room code</label><input id="mp-join-code" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]{6}" placeholder="123456" required><button id="mp-join" type="submit">Join Multiplayer Room</button></form>
<button id="mp-start" hidden>Start Playing</button>
<button id="mp-leave" hidden>Leave Multiplayer</button><button id="mp-roster" hidden>Save &amp; Return to Heroes</button></div></section>`;
    document.body.append(this.dialog);this.$=id=>this.dialog.querySelector('#'+id);
    this.$('mp-close').onclick=()=>this.close();this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
    this.$('mp-create').onclick=()=>this.run(()=>this.mode('create'));
    this.$('mp-start').onclick=()=>this.run(async()=>{await this.session.command('startRoom');this.close(true);});
    this.$('mp-join-form').onsubmit=e=>{e.preventDefault();void this.run(()=>this.mode('join',this.$('mp-join-code').value.trim()));};
    this.$('mp-leave').onclick=()=>this.run(()=>this.mode('solo'));
    this.$('mp-roster').onclick=()=>this.run(()=>this.release());
    this.$('mp-copy').onclick=()=>this.run(async()=>{await navigator.clipboard.writeText(this.session.state.code);this.note('Room code copied. Share it with your friends.');});
    this.badge=document.createElement('button');this.badge.id='multiplayer-status';this.badge.hidden=true;this.badge.onclick=()=>this.open();document.getElementById('hud').append(this.badge);
    const button=document.createElement('button');button.textContent='Multiplayer';button.className='secondary';button.dataset.multiplayer='open';button.onclick=()=>this.open();document.getElementById('pause-primary').append(button);
  }
  receipts(){return JSON.parse(this.getContext().storage.getItem(ROOM_RECEIPTS)||'{}');}
  isLinked(id){try{return !!this.receipts()[id];}catch{return true;}}
  mark(id,linked){const receipts=this.receipts();if(linked)receipts[id]=true;else delete receipts[id];this.getContext().storage.setItem(ROOM_RECEIPTS,JSON.stringify(receipts));}
  note(text){this.status=text;this.$('mp-status').textContent=text;}
  async run(action){if(this.busy)return;this.busy=true;this.dialog.setAttribute('aria-busy','true');try{return await action();}catch(error){this.note(error.message);this.onError(error.message);}finally{this.busy=false;this.dialog.removeAttribute('aria-busy');}}
  async configure(){
    if(this.config)return this.config;
    const response=await fetch(new URL('./config.json',import.meta.url),{cache:'no-store'});
    if(!response.ok)throw Error('Multiplayer is being prepared. Your saved hero is available in solo play.');
    const config=await response.json(),url=new URL(config.endpoint,location.href);
    if(url.protocol!=='wss:'&&!(url.protocol==='ws:'&&location.protocol==='http:'&&url.host===location.host))throw Error('A secure multiplayer connection is required.');
    if(url.username||url.password||url.search||url.hash)throw Error('Invalid multiplayer connection.');
    this.config={endpoint:url.href};return this.config;
  }
  async connect(){
    if(this.session?.active&&this.session.client.ready)return;
    const context=this.getContext();if(!context.local)throw Error('Choose your saved hero first.');
    await this.configure();this.localId=context.local.id;this.slot=context.slot;
    if(this.session?.active){this.session.client.closed=false;await this.session.connect();return this.waitForState();}
    const resume=this.isLinked(this.localId);
    if(!resume&&!context.snapshot)throw Error('Leave combat for five seconds before starting multiplayer.');
    this.session?.client.close();
    const session=new GameSession({url:this.config.endpoint,getToken:()=>requestV3Session({slot:this.slot,snapshot:this.getContext().snapshot,resume:this.isLinked(this.localId)}),storage:context.storage,onState:this.onState,onError:this.onError});
    this.session=session;session.privateRooms=true;
    session.addEventListener('heroes',event=>{const hero=event.detail.find(h=>h.slot===this.slot);if(!hero){this.note('Your selected hero could not be restored.');return;}this.mark(this.localId,true);session.select(hero.id);});
    session.addEventListener('checkpoint',event=>{this.confirmCheckpoint(event.detail);this.note('Saved · '+new Date(event.detail.savedAt).toLocaleTimeString());});
    session.addEventListener('state',event=>{
      this.renderState(event.detail);
      // Recovery only: never upload a browser runtime over a newer cloud save.
      if(!this.lastRecovery||performance.now()-this.lastRecovery>=1000){
        try{context.storage.setItem('healthia.royale.room-recovery.'+event.detail.id,JSON.stringify({slot:this.slot,revision:event.detail.revision,cloudRevision:event.detail.cloud?.revision,runtime:encodeRuntime(event.detail.game)}));this.lastRecovery=performance.now();}catch{this.note('Browser backup unavailable; the server still saves your hero.');}
      }
    });
    session.addEventListener('status',event=>{this.note(event.detail);if(session.active&&!session.client.ready)this.badge.textContent='Reconnecting…';});
    session.addEventListener('error',event=>this.note(event.detail));
    const ready=this.waitForState();await session.connect();await ready;
  }
  waitForState(){
    if(this.session.client.ready)return Promise.resolve();
    return new Promise((resolve,reject)=>{const s=this.session,timer=setTimeout(()=>{clean();reject(Error('Connection timed out. Your saved hero is retained.'));},20000);const done=()=>{clean();resolve();},error=e=>{clean();reject(Error(e.detail));};function clean(){clearTimeout(timer);s.removeEventListener('state',done);s.removeEventListener('error',error);}s.addEventListener('state',done);s.addEventListener('error',error);});
  }
  confirmCheckpoint(checkpoint,{wait=false}={}){
    if(checkpoint.slot!==this.slot)return;
    const account=new URLSearchParams(location.search||'').get('cloudAccount');
    if(!wait){window.parent.postMessage({...checkpoint,type:'royale-multiplayer-checkpoint',account},location.origin);return;}
    return new Promise((resolve,reject)=>{
      const requestId=crypto.randomUUID(),timer=setTimeout(()=>{window.removeEventListener('message',receive);reject(Error('Your cloud save is safe. Retry returning to heroes to confirm the local copy.'));},10000);
      function receive(event){
        if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='royale-checkpoint-confirmed'||event.data.requestId!==requestId)return;
        clearTimeout(timer);window.removeEventListener('message',receive);event.data.error?reject(Error(event.data.error)):resolve();
      }
      window.addEventListener('message',receive);
      window.parent.postMessage({...checkpoint,type:'royale-multiplayer-checkpoint',account,requestId},location.origin);
    });
  }
  async mode(mode,code){if(mode==='join')roomCode(code);await this.connect();await this.session.command('mode',[mode,code]);this.renderState(this.session.state);if(mode==='solo'||this.session.state.started)this.close(true);}
  async checkpoint(){if(this.session?.active&&this.session.client.ready)return this.session.command('save');}
  async release(){
    if(!this.releasedCheckpoint&&!this.session?.client.ready)throw Error('Reconnect before returning to your solo hero.');
    const checkpoint=this.releasedCheckpoint??=await this.session.client.request('release');
    await this.confirmCheckpoint(checkpoint,{wait:true});this.mark(this.localId,false);
    this.session.client.close();this.session.active=false;this.badge.hidden=true;
    window.parent.postMessage({type:'royale-room-released',account:new URLSearchParams(location.search||'').get('cloudAccount'),slot:this.slot},location.origin);
    await this.onExit?.(checkpoint.snapshot);this.dialog.close();this.session=null;this.releasedCheckpoint=null;
  }
  renderState(state){
    const waiting=!!state.code&&!state.started;
    this.$('mp-start').hidden=!waiting;this.$('mp-start').disabled=state.players.length<2||state.leader!==state.id;
    if(waiting){this.note(state.players.length<2?'Waiting for a friend to join.':state.leader===state.id?'Your room is ready. Start when everyone has joined.':'Waiting for the room leader to start.');if(!this.dialog.open)this.open();}
    if(this.wasWaiting&&!waiting&&state.code&&this.dialog.open)this.close(true);this.wasWaiting=waiting;
    this.$('mp-code').hidden=!state.code;this.$('mp-code').textContent=state.code?'Room code: '+state.code:'';
    this.$('mp-copy').hidden=!state.code;this.$('mp-leave').hidden=!state.code;this.$('mp-roster').hidden=false;
    this.$('mp-roster').disabled=state.game?.canSave?!state.game.canSave():false;
    this.$('mp-players').textContent=state.code?`${state.players.length}/${MAX_ROOM_PLAYERS} players · ${state.players.map(p=>p.name).join(' · ')}`:'Solo play';
    this.badge.hidden=false;this.badge.textContent=state.code?`${state.players.length}/${MAX_ROOM_PLAYERS} · ${state.code}`:'Solo · autosave on';
    if(state.cloud?.error)this.note(state.cloud.error);
  }
  open(){this.onOpen();const ctx=this.getContext();this.$('mp-selected').textContent=ctx.local?`${ctx.local.snapshot.look.name} · Level ${ctx.local.snapshot.level}`:'Select a hero first.';this.note(this.status);if(!this.dialog.open)this.dialog.showModal();}
  close(force=false){if(this.busy&&!force)return;this.dialog.close();this.onClose();}
}
