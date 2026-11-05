import {CloudAPI} from '../cloud-client.mjs';
import {GameSession,MIGRATION_KEY} from './game-session.mjs';
const node=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n;};
export class MultiplayerMenu {
  constructor({getContext,onState,onError,onOpen,onClose}){
    Object.assign(this,{getContext,onState,onError,onOpen,onClose});this.status='Choose a hero, then connect to adventure together.';
    const dialog=node('dialog');dialog.id='multiplayer-menu';dialog.setAttribute('aria-labelledby','multiplayer-title');
    dialog.innerHTML=`<header><h2 id="multiplayer-title">Adventure together</h2><button id="mp-close" aria-label="Close multiplayer menu">×</button></header>
<p id="mp-status" role="status" aria-live="polite"></p>
<section id="mp-login"><p>Your account keeps one hero across solo and rooms. Local heroes remain playable without an account.</p>
<form id="mp-auth"><label>Email<input id="mp-email" type="email" autocomplete="username" required></label><label>Password<input id="mp-password" type="password" autocomplete="current-password" minlength="8" required></label><button type="submit">Sign in</button><button id="mp-signup" type="button">Create account</button></form>
<div id="mp-review-login" hidden><label>Isolated test account<select id="mp-review-player"><option value="1">Client A</option><option value="2">Client B</option><option value="3">Client C</option><option value="4">Client D</option></select></label></div>
<button id="mp-connect">Connect account</button></section>
<section id="mp-account" hidden><h3>Account heroes</h3><div id="mp-heroes"></div><div id="mp-transfer"><p>Bring your selected local hero into account saving. A backup stays on this browser. Account heroes require a connection, including solo play.</p><label>Account slot<select id="mp-slot"><option value="0">1</option><option value="1">2</option><option value="2">3</option></select></label><button id="mp-review-local">Review local hero transfer</button><button id="mp-review-cloud">Review existing cloud hero</button></div></section>
<section id="mp-review" hidden><p id="mp-summary"></p><button id="mp-confirm">Confirm transfer and restore hero</button></section>
<section id="mp-room" hidden><p id="mp-code"></p><button id="mp-copy">Copy room code</button><p id="mp-players"></p><div class="mp-actions"><button id="mp-solo">Play Solo</button><button id="mp-create">Create Multiplayer Room</button><label>Room code<input id="mp-join-code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="10" pattern="[A-Za-z2-9]{10}"></label><button id="mp-join">Join Multiplayer Room</button><button id="mp-leave">Leave Multiplayer</button></div></section>`;
    document.body.append(dialog);this.dialog=dialog;this.$=id=>dialog.querySelector('#'+id);
    this.$('mp-close').onclick=()=>this.close();dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
    this.$('mp-review-player').onchange=()=>this.getContext().storage.setItem('healthia.royale.review.player',this.$('mp-review-player').value);
    this.$('mp-connect').onclick=()=>this.run(()=>this.connect());
    this.$('mp-auth').onsubmit=e=>{e.preventDefault();void this.signIn(false);};this.$('mp-signup').onclick=()=>this.signIn(true);
    for(const kind of ['local','cloud'])this.$('mp-review-'+kind).onclick=()=>this.run(()=>this.review(kind));
    this.$('mp-confirm').onclick=()=>this.run(async()=>{await this.session.confirmMigration(this.ticket);this.$('mp-review').hidden=true;});
    for(const [id,mode] of [['mp-solo','solo'],['mp-create','create'],['mp-join','join'],['mp-leave','solo']])this.$(id).onclick=()=>this.run(async()=>{await this.session.command('mode',[mode,this.$('mp-join-code').value.trim().toUpperCase()]);this.close(true);});
    this.$('mp-copy').onclick=()=>this.run(async()=>{if(!navigator.clipboard){this.note('Select the room code above to copy it. Secure HTTPS enables the Copy button.');return;}await navigator.clipboard.writeText(this.session.state.code);this.note('Room code copied. Share it with your friends.');});
    this.badge=node('button','Multiplayer');this.badge.id='multiplayer-status';this.badge.onclick=()=>this.open();this.badge.hidden=true;document.querySelector('#hud').append(this.badge);
    for(const parent of ['pause-primary','roster']){const b=node('button','Solo & Multiplayer');b.className='secondary';b.dataset.multiplayer='open';b.onclick=()=>this.open();document.getElementById(parent).append(b);}
  }
  note(value){this.status=typeof value==='string'?value:value.message;this.$('mp-status').textContent=this.status;}
  async run(action){if(this.busy)return;this.busy=true;this.dialog.setAttribute('aria-busy','true');try{await action();}catch(e){this.note(e.message);this.onError(e.message);}finally{this.busy=false;this.dialog.removeAttribute('aria-busy');}}
  async configure(){
    if(this.config)return this.config;
    const r=await fetch(new URL('./config.json',import.meta.url),{cache:'no-store'});if(!r.ok)throw Error('Multiplayer server is not configured on this build. Your local adventure is available.');
    const config=await r.json(),url=new URL(config.endpoint,location.href);
    if(url.protocol!=='wss:'&&!(url.protocol==='ws:'&&location.protocol==='http:'&&url.host===location.host))throw Error('Multiplayer requires a secure WSS endpoint.');
    if(url.username||url.password||url.search||url.hash)throw Error('Invalid multiplayer endpoint.');
    this.config={...config,endpoint:url.href};
    this.$('mp-review-login').hidden=!config.review;this.$('mp-auth').hidden=!!config.review;
    if(config.review)this.$('mp-review-player').value=this.getContext().storage.getItem('healthia.royale.review.player')||'1';else this.api=new CloudAPI();return this.config;
  }
  async token(){
    if(this.config.review){const response=await fetch('/fixture-session?player='+this.$('mp-review-player').value,{cache:'no-store'});if(!response.ok)throw Error('Test authentication unavailable.');return (await response.json()).token;}
    const {data,error}=await this.api.auth.getSession();if(error||!data.session)throw Error('Sign in to connect your account.');return data.session.access_token;
  }
  async signIn(signup){await this.run(async()=>{await this.configure();if(!this.$('mp-auth').reportValidity())return;const values={email:this.$('mp-email').value.trim(),password:this.$('mp-password').value};const {data,error}=await this.api.auth[signup?'signUp':'signInWithPassword'](values);this.$('mp-password').value='';if(error)throw error;if(!data.session){this.note('Check your email to confirm the account, then sign in.');return;}await this.connect();});}
  async connect(){
    await this.configure();if(this.session?.active)return;
    this.session?.client.close();
    this.session=new GameSession({url:this.config.endpoint,getToken:()=>this.token(),storage:this.getContext().storage,onState:this.onState,onError:this.onError});
    this.session.addEventListener('heroes',e=>{this.$('mp-account').hidden=false;this.$('mp-login').hidden=true;this.renderHeroes(e.detail);this.note('Account connected. Select your account hero or review a local transfer.');const ctx=this.getContext(),link=ctx.local&&this.session.link(ctx.local.id);if(link?.heroId&&this.session.client.heroId!==link.heroId)this.session.select(link.heroId,ctx.local.id);});
    this.session.addEventListener('state',e=>{this.$('mp-room').hidden=false;this.$('mp-account').hidden=true;this.$('mp-code').textContent=e.detail.code?'Room code: '+e.detail.code:'Solo adventure · account saved';this.$('mp-copy').hidden=!e.detail.code;this.$('mp-leave').hidden=!e.detail.code;this.$('mp-players').textContent=e.detail.players.map(p=>p.name).join(' · ');this.badge.hidden=false;this.badge.textContent=e.detail.code?`${e.detail.players.length} heroes · ${e.detail.code}`:'Solo · account';});
    this.session.addEventListener('status',e=>{this.note(e.detail);if(!this.session.client.ready&&this.session.active)this.badge.textContent='Reconnecting…';});this.session.addEventListener('error',e=>this.note(e.detail));
    await this.session.connect();
  }
  renderHeroes(heroes){const list=this.$('mp-heroes');list.replaceChildren();for(const h of heroes){const b=node('button',`${h.name} · Level ${h.level} · Slot ${h.slot+1}`);b.onclick=()=>this.session.select(h.id);list.append(b);}if(!heroes.length)list.append(node('p','No transferred heroes yet.'));this.$('mp-review-local').disabled=!this.getContext().local;}
  async review(choice){const ctx=this.getContext();if(choice==='local'&&!ctx.local)throw Error('Select a local hero first.');if(choice==='local'&&!ctx.snapshot)throw Error('Leave combat before transferring a local hero.');const slot=Number(this.$('mp-slot').value),preview=choice==='cloud'&&!ctx.local?await this.session.reviewCloud(slot):await this.session.migrate({...ctx.local,snapshot:ctx.snapshot},slot,choice);this.ticket=preview.ticket;const s=preview.summary;this.$('mp-summary').textContent=`${s.name} · Level ${s.level} · ${s.coins} coins · ${s.items} items · save v${s.version} · account revision ${s.cloudRevision}. ${preview.message}`;this.$('mp-review').hidden=false;}
  open(){this.onOpen();if(!this.dialog.open)this.dialog.showModal();this.$('mp-slot').value=String(this.getContext().slot||0);this.note(this.status);void this.configure().catch(e=>this.note(e.message));}
  close(force=false){if(this.busy&&!force)return;this.dialog.close();this.onClose();}
  isLinked(id){try{const link=JSON.parse(this.getContext().storage.getItem(MIGRATION_KEY)||'{}')[id];return link&&link.status!=='review';}catch{return true;}}
}
