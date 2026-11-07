import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {V3MultiplayerMenu,requestV3Session} from '../v3-menu.mjs';

test('selected-hero menu exposes create/join, a numeric six-digit code, capacity and autosave without another account form',async()=>{
  const prior=globalThis.document,{document}=parseHTML('<html><body><div id="hud"></div><div id="pause-primary"></div></body></html>');globalThis.document=document;
  const map=new Map(),errors=[],calls=[],ctx={slot:1,local:{id:'v3-slot-1',snapshot:{look:{name:'REXI'},level:14}},storage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)}};
  try{
    const menu=new V3MultiplayerMenu({getContext:()=>ctx,onState(){},onError:e=>errors.push(e),onOpen(){},onClose(){}});
    menu.dialog.showModal=()=>menu.dialog.open=true;menu.dialog.close=()=>menu.dialog.open=false;menu.open();
    assert.match(menu.$('mp-selected').textContent,/REXI · Level 14/);assert.match(menu.dialog.textContent,/2–5 players/);assert.match(menu.dialog.textContent,/every 8 seconds/);
    assert.equal(document.querySelector('input[type="email"]'),null);assert.equal(document.querySelector('input[type="password"]'),null);
    assert.equal(menu.$('mp-join-code').getAttribute('inputmode'),'numeric');assert.equal(menu.$('mp-join-code').getAttribute('maxlength'),'6');
    menu.session={state:{code:'003456',phase:'playing',players:[{name:'REXI'},{name:'Vee'}]},client:{ready:true},active:true,command:async(...args)=>calls.push(args)};
    menu.connect=async()=>{};await menu.mode('create');assert.equal(menu.dialog.open,true);assert.equal(menu.$('mp-code').textContent,'Room code: 003456');assert.match(menu.$('mp-players').textContent,/2\/5/);
    await assert.rejects(()=>menu.mode('join','123'),/six-digit/);assert.equal(calls.length,1);
    await menu.mode('join','003456');assert.deepEqual(calls[1],['mode',['join','003456']]);assert.equal(menu.dialog.open,false);
    menu.mark(ctx.local.id,true);assert.equal(menu.isLinked(ctx.local.id),true);menu.mark(ctx.local.id,false);assert.equal(menu.isLinked(ctx.local.id),false);
    await menu.checkpoint();assert.deepEqual(calls.at(-1),['save']);assert.deepEqual(errors,[]);
  }finally{globalThis.document=prior;}
});

test('the parent session request only accepts the matching same-origin parent reply',async()=>{
  const win=new EventTarget(),sent=[];win.location={origin:'https://game.example'};win.parent={postMessage:(value,origin)=>sent.push({value,origin})};
  const promise=requestV3Session({slot:1,snapshot:{look:{name:'REXI'}},resume:false},win),request=sent[0];assert.equal(request.origin,win.location.origin);assert.equal(request.value.slot,1);
  const reply=(source,origin,requestId,access)=>{const e=new Event('message');Object.assign(e,{source,origin,data:{type:'royale-room-session-result',requestId,access}});win.dispatchEvent(e);};
  reply(win.parent,'https://other.example',request.value.requestId,'wrong');reply({},win.location.origin,request.value.requestId,'wrong');reply(win.parent,win.location.origin,'other','wrong');
  reply(win.parent,win.location.origin,request.value.requestId,'fixture-token');assert.deepEqual(await promise,{token:'fixture-token',slot:1,kind:'v3'});
});

test('checkpoint forwarding retains its parent message type and its own hero slot',()=>{
  const prior=globalThis.window,priorLocation=globalThis.location,sent=[];globalThis.window={parent:{postMessage:(data,origin)=>sent.push({data,origin})}};globalThis.location={origin:'https://game.example'};
  try{
    const target={slot:1};V3MultiplayerMenu.prototype.confirmCheckpoint.call(target,{type:'checkpoint',slot:1,revision:12,snapshot:{coins:77}});
    V3MultiplayerMenu.prototype.confirmCheckpoint.call(target,{type:'checkpoint',slot:0,revision:99,snapshot:{coins:999}});
    assert.equal(sent.length,1);assert.equal(sent[0].data.type,'royale-multiplayer-checkpoint');assert.equal(sent[0].data.slot,1);assert.equal(sent[0].data.revision,12);
  }finally{globalThis.window=prior;globalThis.location=priorLocation;}
});

test('lobby menu keeps guests waiting, enables only a ready host, and resumes after the server starts',async()=>{
  const prior=globalThis.document,{document}=parseHTML('<html><body><div id="hud"></div><div id="pause-primary"></div></body></html>');globalThis.document=document;
  let resumed=0;
  try{
    const menu=new V3MultiplayerMenu({getContext:()=>({local:{snapshot:{look:{name:'Host'},level:1}}}),onOpen(){},onClose(){resumed++;}});
    menu.dialog.showModal=()=>menu.dialog.open=true;menu.dialog.close=()=>menu.dialog.open=false;
    const state={id:'host',hostId:'host',phase:'lobby',canStart:false,code:'123456',players:[{id:'host',name:'Host'}]};
    menu.renderState(state);assert.equal(menu.dialog.open,true);assert.equal(menu.$('mp-start').disabled,true);assert.equal(menu.$('mp-start').hidden,false);
    menu.close();assert.equal(menu.dialog.open,true);assert.equal(resumed,0);
    state.players.push({id:'guest',name:'Guest'});state.canStart=true;menu.renderState(state);assert.equal(menu.$('mp-start').disabled,false);
    menu.renderState({...state,id:'guest',canStart:false});assert.equal(menu.$('mp-start').hidden,true);assert.match(menu.$('mp-waiting').textContent,/host to start/);
    menu.renderState({...state,phase:'playing',canStart:false});assert.equal(menu.dialog.open,false);assert.equal(resumed,1);assert.equal(menu.$('mp-close').disabled,false);
    menu.open();menu.renderState({...state,phase:'playing'});assert.equal(menu.dialog.open,true);assert.equal(resumed,1);
  }finally{globalThis.document=prior;}
});

test('returning to heroes from a lobby restores create/join controls for the next room',async()=>{
  const prior={document:globalThis.document,window:globalThis.window,location:globalThis.location},{document}=parseHTML('<html><body><div id="hud"></div><div id="pause-primary"></div></body></html>');
  globalThis.document=document;globalThis.location={origin:'https://game.example'};globalThis.window={parent:{postMessage(){}}};
  try{
    const data=new Map(),menu=new V3MultiplayerMenu({getContext:()=>({local:{snapshot:{look:{name:'Host'},level:1}},storage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}}),onOpen(){},onClose(){},onExit(){}});
    menu.dialog.showModal=()=>menu.dialog.open=true;menu.dialog.close=()=>menu.dialog.open=false;menu.slot=0;menu.localId='hero';menu.mark('hero',true);
    menu.session={active:true,client:{ready:true,request:async()=>({slot:0,snapshot:{coins:3}}),close(){}}};
    menu.renderState({id:'host',hostId:'host',phase:'lobby',code:'123456',players:[{id:'host',name:'Host'}]});
    assert.equal(menu.$('mp-create').hidden,true);await menu.release();assert.equal(menu.isLinked('hero'),false);assert.equal(menu.session,null);
    menu.open();assert.equal(menu.$('mp-create').hidden,false);assert.equal(menu.$('mp-join-form').hidden,false);assert.equal(menu.$('mp-close').disabled,false);assert.equal(menu.$('mp-start').hidden,true);
    menu.close();assert.equal(menu.dialog.open,false);
  }finally{Object.assign(globalThis,prior);}
});
