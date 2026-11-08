import test from 'node:test';
import assert from 'node:assert/strict';
import {MultiplayerClient} from '../client.mjs';
import {GameSession} from '../game-session.mjs';
import {Game} from '../../core.mjs';
import {runtimeDelta} from '../delta.mjs';
import {encodeRuntime} from '../runtime.mjs';
import {PeerMotion,motionPacket} from '../supabase-test/motion.mjs';
import {PROTOCOL} from '../protocol.mjs';
const storage={getItem:()=>null,setItem(){}};
function state(game=new Game()){game.paused=false;return {game,id:'hero',code:'123456',phase:'playing',nearby:[],players:[],serial:1};}
test('continuous client predicts movement and attacks before a reply without granting health or XP',()=>{
 const c=new MultiplayerClient('ws://fixture',async()=>''),sent=[];c.send=p=>sent.push(p);c.ready=true;c.lastServerAt=performance.now();
 const s=new GameSession({client:c,storage,onState(){},onError(){}});c.emit('state',state());
 const x=s.game.hero.x,hp=s.game.hero.hp,xp=s.game.hero.xp,enemy=s.game.enemies[0],enemyHP=enemy.hp;
 s.input({move:1,run:true});assert.ok(s.game.hero.x>x);s.input({punch:true});assert.ok(s.game.hero.attack);
 assert.equal(s.game.hero.hp,hp);assert.equal(s.game.hero.xp,xp);assert.equal(enemy.hp,enemyHP);assert.equal(sent.length,2);assert.equal(c.unacked.length,2);
 c.ready=false;const stopped=s.game.hero.x;s.input({move:1});assert.equal(s.game.hero.x,stopped);
});
test('continuous reconciliation replays by acknowledgement, including packets behind the server clock',()=>{
 const c=new MultiplayerClient('ws://fixture',async()=>''),s=new GameSession({client:c,storage,onState(){},onError(){}}),replayed=[];
 s.predict=(_g,input)=>replayed.push(input);
 c.unacked=[{seq:7,input:{jump:true},predictedTime:0}];const frame=state();frame.game.time=10;c.emit('state',frame);
 assert.deepEqual(replayed,[{jump:true}]);
});
test('wire acknowledgements remove predicted inputs and reconnect starts a clean input generation',async()=>{
 const Native=globalThis.WebSocket;
 class Socket {static OPEN=1;constructor(){this.readyState=1;}send(){}close(){}}
 globalThis.WebSocket=Socket;
 const c=new MultiplayerClient('ws://fixture',async()=>'fixture');
 try{
  await c.connect();c.ready=true;c.input({jump:true});c.input({move:1});
  const {delta}=runtimeDelta(null,encodeRuntime(new Game()));
  c.socket.onmessage({data:JSON.stringify({type:'state',protocol:PROTOCOL,base:0,serial:1,id:'hero',inputSeq:1,commandSeq:0,delta})});
  assert.deepEqual(c.unacked.map(p=>p.seq),[2]);assert.equal(c.metrics.syncRtt.length,1);
  await c.connect();assert.equal(c.unacked.length,0);assert.equal(c.inputSeq,0);
 }finally{c.close();globalThis.WebSocket=Native;}
});

test('unacknowledged input is bounded and stops prediction when the server falls behind',()=>{
 const c=new MultiplayerClient('ws://fixture',async()=>''),action={move:1};let closed=0;
 c.ready=true;c.send=()=>{};c.socket={close(){closed++;}};
 c.input(action);action.move=-1;assert.equal(c.unacked[0].input.move,1);
 for(let i=1;i<90;i++)assert.equal(c.input({move:1}),true);
 assert.equal(c.input({move:1}),false);assert.equal(c.unacked.length,90);assert.equal(c.ready,false);assert.equal(closed,1);
});

test('continuous peer smoothing follows 30 Hz arrivals while Supabase keeps its original minimum buffer',()=>{
 const g=new Game(),peer={id:'peer',hero:g.hero},continuous=new PeerMotion({minBuffer:33}),supabase=new PeerMotion();
 for(const m of [continuous,supabase])for(let i=1;i<=3;i++)m.push(motionPacket('peer',i,'world',g.hero),[peer],'world',i*33);
 assert.equal(continuous.peers.get('peer').buffer,33);assert.equal(supabase.peers.get('peer').buffer,50);
});
