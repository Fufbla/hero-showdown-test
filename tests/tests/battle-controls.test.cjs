const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),input=fs.readFileSync(path.join(root,'assets/js/battle-input.js'),'utf8');
function fn(source,name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0,name);const open=source.indexOf('{',source.indexOf(')',start));let depth=0;for(let i=open;i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&!--depth)return source.slice(start,i+1);}throw Error(name);}
function fixture(kind='local',role=''){
 const listeners={},actions=[],sent=[],status={textContent:''};
 const c={mode:'fight',paused:false,story:{playing:false},locked:false,coop:{kind,role,players:[{hp:100},{hp:100}],keyboard:[{},{}],inputs:[{},{}],previous:[{},{}],padSlots:null,lastSeen:0},pads:[],touchHeld:{},activePadIndex:null,gamepadPrev:{},padHeld:{},padAxisDirection:0,directionTaps:{},menuRepeatDirection:'',menuFocus:0,menuFocusElement:null,menuRepeatAt:0,padAudioNotice:false,muted:true,ac:{state:'running'},battlePadAxes:new Map(),performance:{now:()=>100},navigator:{getGamepads:()=>c.pads},document:{getElementById:id=>id==='padstatus'?status:null},window:{addEventListener:(name,handler)=>listeners[name]=handler},keyMap:{j:'punch',k:'kick',a:'left',d:'right',' ':'special'},
  coActive:()=>c.coop.kind!=='solo'&&c.coop.players.length===2,coGuest:()=>c.coop.kind==='online'&&c.coop.role==='guest',specialSceneLocked:()=>c.locked,
  coWith:(i,run)=>{c.player=i;try{return run();}finally{c.player=0;}},action:k=>actions.push([c.player,k]),directionPress:d=>actions.push([c.player,d]),
  coSendInput:()=>sent.push({...c.coop.localInput}),clearInput:()=>{c.coop.keyboard=[{},{}];c.coop.inputs=[{},{}];c.coop.previous=[{},{}];},pauseGame:()=>{c.paused=!c.paused;c.clearInput();},
  syncMenuFocus(){},padMenuButtons:()=>[],menuNavigate(){},padAudioUnlock(){},showSelect(){c.mode='select';},showOpponent(){c.mode='opponent';},showDifficulty(){c.mode='difficulty';},showModeSelect(){c.mode='modes';}
 };
 vm.createContext(c);
 for(const name of ['battleGamepads','readBattleGamepad','flushBattleCoopKeyboard'])vm.runInContext(fn(input,name),c);
 for(const name of ['coApply','coMerged','coPad','pollPad'])vm.runInContext(fn(html,name),c);
 vm.runInContext(html.slice(html.indexOf('const coPoll=pollPad;'),html.indexOf('\nconst coClear=clearInput;')),c);
 const pad=index=>({connected:true,index,axes:[0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))});
 const button=(p,i,down)=>{c.pads[p].buttons[i]={pressed:down,value:down?1:0};c.pollPad();};
 const key=(down,code,value='',repeat=false)=>listeners[down?'keydown':'keyup']({target:{closest:()=>false},key:value,code,repeat,preventDefault(){},stopImmediatePropagation(){}});
 return {c,actions,sent,pad,button,key};
}
test('both co-op players keep a complete keyboard tap between frames, without duplicate polling',()=>{
 const f=fixture();for(const code of ['KeyF','KeyJ']){f.key(true,code);f.key(false,code);}f.c.pollPad();assert.deepEqual(f.actions,[[0,'punch'],[1,'punch']]);
});
test('keyboard repeat does not create more co-op attack edges',()=>{
 const f=fixture();f.key(true,'KeyG');for(let i=0;i<5;i++){f.key(true,'KeyG','',true);f.c.pollPad();}f.key(false,'KeyG');f.key(true,'KeyG');assert.deepEqual(f.actions,[[0,'kick'],[0,'kick']]);
});
test('keyboard release preserves the same action held on a controller or touch',()=>{
 const f=fixture();f.c.pads=[f.pad(2)];f.button(0,2,true);f.key(true,'KeyF');f.key(false,'KeyF');assert.equal(f.c.coop.inputs[0].punch,true);assert.equal(f.actions.length,1);f.c.touchHeld.block=true;f.key(true,'KeyH');f.key(false,'KeyH');assert.equal(f.c.coop.inputs[0].block,true);
});
test('online guest transmits both short tap edges without applying local attacks',()=>{
 const f=fixture('online','guest');f.key(true,'KeyJ','j');f.key(false,'KeyJ','j');assert.deepEqual(f.sent.map(s=>s.punch),[true,false]);assert.deepEqual(f.actions,[]);
});
test('online host applies its keyboard input immediately to the local player',()=>{
 const f=fixture('online','host');f.key(true,'KeyJ','j');f.key(false,'KeyJ','j');assert.deepEqual(f.actions,[[0,'punch']]);
});
for(const lock of ['paused','locked','story'])test(lock+' prevents a keyboard tap from firing',()=>{
 const f=fixture();if(lock==='story')f.c.story.playing=true;else f.c[lock]=true;f.key(true,'KeyF');f.key(false,'KeyF');assert.deepEqual(f.actions,[]);
});
for(const owner of [0,1])test('controller '+(owner+1)+' held Start pauses only once and resumes once after release',()=>{
 const f=fixture();f.c.pads=[f.pad(0),f.pad(3)];f.c.pollPad();f.button(owner,9,true);for(let i=0;i<8;i++)f.c.pollPad();assert.equal(f.c.paused,true);f.button(owner,9,false);f.button(owner,9,true);for(let i=0;i<8;i++)f.c.pollPad();assert.equal(f.c.paused,false);
});
test('the other controller can resume a co-op pause without pausing again',()=>{
 const f=fixture();f.c.pads=[f.pad(0),f.pad(1)];f.c.pollPad();f.button(0,9,true);f.button(0,9,false);f.button(1,9,true);for(let i=0;i<8;i++)f.c.pollPad();assert.equal(f.c.paused,false);
});
test('unplugging a co-op controller clears that player movement',()=>{
 const f=fixture();f.c.pads=[f.pad(4),f.pad(7)];f.c.pads[1].axes[0]=1;f.c.pollPad();assert.equal(f.c.coop.inputs[1].right,true);f.c.pads.pop();f.c.pollPad();assert.equal(f.c.coop.inputs[1].right,false);
});
test('a paused keyboard tap is discarded before resume',()=>{
 const f=fixture();f.c.pauseGame();f.key(true,'KeyF');f.key(false,'KeyF');f.c.pauseGame();f.c.pollPad();assert.deepEqual(f.actions,[]);
});
