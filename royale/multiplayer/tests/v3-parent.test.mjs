import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {LocalHeroStore} from '../../saves.mjs';
import {Game} from '../../core.mjs';

test('the real V3 parent flushes the selected hero before joining, accepts its checkpoint, and resumes solo saves at the correct revision',async()=>{
  const nodes=new Map(),data=new Map(),handlers=[],sent=[],requests=[];
  const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:false,textContent:'',value:'',contentWindow:null});return nodes.get(id);};
  const frame={postMessage:message=>sent.push(message)};node('game-frame').contentWindow=frame;
  const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const row={slot_number:1,snapshot:JSON.parse(new Game({look:{name:'Selected Hero'}}).save()),revision:3};
  const source=(await readFile(new URL('../../../royale-v3-staging/app.mjs',import.meta.url),'utf8')).replace("import {LocalHeroStore} from '../royale/saves.mjs';",'');
  const context=vm.createContext({LocalHeroStore,document:{getElementById:node},localStorage:storage,structuredClone,crypto,location:{origin:'https://game.example'},console:{info(){},error(){}},setInterval(){},navigator:{clipboard:{}},window:{addEventListener:(name,handler)=>handlers.push(handler)},fetch:async(_url,options)=>{
    const body=JSON.parse(options.body);requests.push(body);
    if(body.action==='verify'||body.action==='renew')return {ok:true,json:async()=>({access:'fixture-access',refresh:'fixture-refresh'})};
    if(body.action==='slots')return {ok:true,json:async()=>({slots:[structuredClone(row),{slot_number:2,snapshot:null,revision:0},{slot_number:3,snapshot:null,revision:0}]})};
    if(body.action==='save'){assert.equal(body.slot,1);assert.equal(body.revision,row.revision);row.snapshot=structuredClone(body.snapshot);row.revision++;return {ok:true,json:async()=>({revision:row.revision})};}
    throw Error('Unexpected request');
  }});
  vm.runInContext(source,context);node('input').value='1111111111';node('load').onclick();
  for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
  const send=async message=>handlers[0]({origin:'https://game.example',source:frame,data:message});
  const snapshot=structuredClone(row.snapshot);snapshot.coins=17;
  await send({type:'royale-room-session',slot:0,requestId:'fixture-request',snapshot,resume:false});assert.equal(row.snapshot.coins,17);assert.equal(sent.at(-1).access,'fixture-access');
  const online=structuredClone(snapshot);online.coins=44;online.world.location.x=812.125;
  // The server has already written this cloud revision before its receipt.
  row.snapshot=online;row.revision++;
  await send({type:'royale-multiplayer-checkpoint',slot:0,snapshot:online,revision:row.revision,savedAt:new Date().toISOString()});
  const before=requests.length;await send({type:'royale-code-progress',slot:0,snapshot});assert.equal(requests.length,before);
  const saved=JSON.parse(data.get('royale-v3-play:healthia.royale.profiles.v2'));assert.equal(saved.slots[0].snapshot.coins,44);assert.equal(saved.slots[0].snapshot.world.location.x,812.125);assert.equal(saved.slots[1],null);
  await send({type:'royale-room-released',slot:0});const solo=structuredClone(online);solo.coins=45;
  await send({type:'royale-code-progress',slot:0,snapshot:solo});for(let i=0;i<3;i++)await new Promise(resolve=>setImmediate(resolve));assert.equal(row.snapshot.coins,45);
});
