import {Creator} from '../creator.mjs';
import {MenuGamepad} from '../menu-gamepad.mjs';
import {entryEditor} from '../controller-entry.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {STARTER_OUTFIT} from '../appearance.mjs';
import {Game} from '../core.mjs';
import {selectableItems} from '../spatial-navigation.mjs';

const $=id=>document.getElementById(id);
// The existing full creator is reused in one modal. Only its owning controller
// may navigate it; the two pause panels remain independent during gameplay.
export class HeroManager {
 constructor({players,getPads,onChange,onStatus,isPlaying}){
  Object.assign(this,{players,getPads,onChange,onStatus,isPlaying});this.owner=null;this.busy=false;
  this.creator=new Creator();this.entry=entryEditor(document);
  this.nav=new MenuGamepad({getPads:()=>this.owner===null?[]:[getPads()[Number(players[this.owner].control.value.slice(4))]],active:()=>this.owner!==null&&!this.busy,back:()=>this.cancel()});
  $('cancel-look').onclick=()=>this.cancel();$('keep-hero').onclick=()=>this.cancel();
  for(const id of ['hero-editor','hero-delete'])$(id).addEventListener('cancel',e=>{e.preventDefault();this.cancel();});
  $('creator-form').onsubmit=e=>{e.preventDefault();void this.create();};
  $('confirm-hero-delete').onclick=()=>void this.remove();
 }
 get active(){return this.owner!==null;}
 poll(now){
  const wasActive=this.active;if(!wasActive)return false;
  // The creator has a scrolling field column beside a fixed preview. Geometry
  // alone can trap focus in that column. Up/Down traverses every visible control
  // in document order; Left/Right and entry keyboards keep the existing mapping.
  const pad=this.getPads()[Number(this.players[this.owner].control.value.slice(4))];
  const direction=$('hero-editor').open&&!this.entry.current?(pad?.buttons[12]?.pressed?-1:pad?.buttons[13]?.pressed?1:Math.abs(pad?.axes[1]||0)>.55?Math.sign(pad.axes[1]):0):0;
  const getter=this.nav.getPads;
  if(direction)this.nav.getPads=()=>[{...pad,axes:[...pad.axes.slice(0,1),0,...pad.axes.slice(2)],buttons:pad.buttons.map((b,i)=>[12,13].includes(i)?{pressed:false,value:0}:b)}];
  try{this.nav.poll(now);}finally{this.nav.getPads=getter;}
  if(direction&&!this.busy&&!this.nav.waitNeutral){
   if(direction!==this.focusDirection||now>=this.nextFocus){const items=selectableItems(this.nav.scope()),index=items.indexOf(document.activeElement);this.nav.finishAdjustment(true);this.nav.focus(items[(index+items.length+direction)%items.length]);this.nextFocus=now+(direction===this.focusDirection?160:380);}
   this.focusDirection=direction;
  }else this.focusDirection=0;
  if($('hero-editor').open)this.creator.draw(now);if(!this.entry.current&&!$('hero-editor').open&&!$('hero-delete').open)this.owner=null;return wasActive;
 }
 text(player,source){if(this.active)return;this.owner=player;this.nav.waitNeutral=true;this.entry.text(source);}
 open(player,slot,mode){
  if(this.active||this.isPlaying())return;
  const p=this.players[player],row=p.profile?.slots.find(r=>r.slot_number===slot);if(!row)return;
  this.owner=player;this.nav.waitNeutral=true;this.focusDirection=0;this.target={slot,revision:row.revision,name:row.snapshot?.look.name,profile:p.profile};p.ready=false;
  if(mode==='create'&&!row.snapshot){this.creator.fill(styleCDefault('male'),STARTER_OUTFIT,true);$('creator-slot').textContent=`PLAYER ${player+1} · HERO SLOT ${slot}`;$('save-note').textContent='Create and save to your account. Both players can then select Ready.';$('hero-editor').showModal();$('name').focus();}
  else if(mode==='delete'&&row.snapshot){$('delete-description').textContent=`Delete “${row.snapshot.look.name}”, Level ${row.snapshot.level}, from Player ${player+1}’s Slot ${slot}? This removes the hero from your account’s playable slots.`;$('delete-status').textContent='Your other heroes will stay as they are.';$('hero-delete').showModal();$('keep-hero').focus();}
  else this.owner=null;
  this.onChange(player);
 }
 cancel(){if(this.busy)return;if(this.entry.current){this.entry.close(false);return;}const owner=this.owner;$('hero-editor').close();$('hero-delete').close();this.owner=null;this.target=null;if(owner!==null)this.onChange(owner);}
 async mutate(action){
  if(this.busy||this.owner===null||this.isPlaying())return;const owner=this.owner,p=this.players[owner];
  if(p.profile!==this.target.profile)return this.cancel();
  this.busy=p.busy=true;for(const id of ['begin','cancel-look','keep-hero','confirm-hero-delete'])$(id).disabled=true;
  try{await action(p,this.target);this.busy=false;this.cancel();this.onStatus(owner,'Hero list updated and saved to your account.');}
  catch(e){const target=$('hero-editor').open?$('save-note'):$('delete-status');target.textContent=e.message;this.onStatus(owner,e.message);}
  finally{this.busy=p.busy=false;for(const id of ['begin','cancel-look','keep-hero','confirm-hero-delete'])$(id).disabled=false;this.onChange(owner);}
 }
 async create(){const valid=this.creator.validate();if(!valid.ok)return;const look=this.creator.read();look.name=valid.name;return this.mutate(async(p,t)=>{const snapshot=JSON.parse(new Game({look}).save());await p.profile.create(t.slot,snapshot,t.revision);p.slot=t.slot;});}
 async remove(){return this.mutate(async(p,t)=>{await p.profile.remove(t.slot,{confirmed:true,revision:t.revision,name:t.name});if(p.slot===t.slot)p.slot=p.profile.slots.find(r=>r.snapshot)?.slot_number||null;});}
}
