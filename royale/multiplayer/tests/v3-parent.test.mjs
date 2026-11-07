import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {LocalHeroStore} from '../../saves.mjs';
import {Game} from '../../core.mjs';

const source=(await readFile(new URL('../../../royale-v3-staging/app.mjs',import.meta.url),'utf8')).replace("import {LocalHeroStore} from '../royale/saves.mjs';",'');
function backend(){
  const accounts=new Map(),requests=[];
  const rows=code=>{if(!accounts.has(code))accounts.set(code,[{slot_number:1,snapshot:JSON.parse(new Game({look:{name:'Hero '+code[0]}}).save()),revision:3},{slot_number:2,snapshot:null,revision:0},{slot_number:3,snapshot:null,revision:0}]);return accounts.get(code);};
  const fetch=async(_url,options)=>{
    const body=JSON.parse(options.body),code=options.headers.Authorization?.replace('Bearer token-','');requests.push({code,...body});
    const reply=(data,ok=true)=>({ok,status:ok?200:409,headers:{get:()=>null},json:async()=>data});
    if(body.action==='verify'||body.action==='renew'){const c=body.code||body.refresh;return reply({access:'token-'+c,refresh:c});}
    if(body.action==='slots')return reply({slots:structuredClone(rows(code))});
    if(body.action==='save'){const row=rows(code)[body.slot-1];if(body.revision!==row.revision)return reply({error:'Revision conflict'},false);row.snapshot=structuredClone(body.snapshot);row.revision++;return reply({revision:row.revision});}
    throw Error('Unexpected request');
  };return {rows,requests,fetch};
}
function page(data,api){
  const nodes=new Map(),handlers=[],sent=[];
  const node=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:false,textContent:'',value:'',contentWindow:null});return nodes.get(id);};
  const frame={postMessage:message=>sent.push(message)};node('game-frame').contentWindow=frame;
  const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
  const context=vm.createContext({LocalHeroStore,TextEncoder,document:{getElementById:node},localStorage:storage,structuredClone,crypto,location:{origin:'https://game.example'},console:{info(){},error(){}},setInterval(){},navigator:{clipboard:{}},window:{addEventListener:(name,handler)=>handlers.push(handler)},fetch:api.fetch});vm.runInContext(source,context);
  const account=()=>new URL(node('game-frame').src,'https://game.example').searchParams.get('cloudAccount');
  const key=()=>`royale-v3-play:account-store:${account()}:healthia.royale.profiles.v2`;
  return {node,sent,account,key,cache:()=>JSON.parse(data.get(key())),
    async login(code){const prior=node('game-frame').src;node('input').value=code;node('load').onclick();for(let i=0;i<250&&node('game-frame').src===prior;i++)await new Promise(r=>setTimeout(r,2));assert.notEqual(node('game-frame').src,prior,node('status').textContent);},
    async send(message){await handlers[0]({origin:'https://game.example',source:frame,data:{account:account(),...message}});},
  };
}
const settle=()=>new Promise(r=>setImmediate(r));

test('the real V3 parent flushes the selected hero, confirms a checkpoint and resumes solo at the correct revision',async()=>{
  const data=new Map(),api=backend(),p=page(data,api);await p.login('1111111111');const row=api.rows('1111111111')[0];
  const snapshot=structuredClone(row.snapshot);snapshot.coins=17;
  await p.send({type:'royale-room-session',slot:0,requestId:'fixture-request',snapshot,resume:false});assert.equal(row.snapshot.coins,17);assert.equal(p.sent.at(-1).access,'token-1111111111');
  const online=structuredClone(snapshot);online.coins=44;online.world.location.x=812.125;row.snapshot=online;row.revision++;
  await p.send({type:'royale-multiplayer-checkpoint',slot:0,snapshot:online,revision:row.revision,savedAt:new Date().toISOString(),requestId:'final-checkpoint'});
  assert.equal(p.sent.at(-1).type,'royale-checkpoint-confirmed');assert.equal(p.sent.at(-1).error,undefined);
  const before=api.requests.length;await p.send({type:'royale-code-progress',slot:0,snapshot});assert.equal(api.requests.length,before);
  assert.equal(p.cache().slots[0].snapshot.coins,44);assert.equal(p.cache().slots[0].snapshot.world.location.x,812.125);assert.equal(p.cache().slots[1],null);
  await p.send({type:'royale-room-released',slot:0});const solo=structuredClone(online);solo.coins=45;await p.send({type:'royale-code-progress',slot:0,snapshot:solo});await settle();assert.equal(row.snapshot.coins,45);
});

test('two codes in the same browser use independent caches, messages and hidden third slots',async()=>{
  const data=new Map(),api=backend(),a=page(data,api),b=page(data,api);
  const hidden=JSON.parse(new Game({look:{name:'Retained hidden hero'}}).save());hidden.coins=77;api.rows('1111111111')[2]={slot_number:3,snapshot:hidden,revision:2};
  await a.login('1111111111');await b.login('2222222222');assert.notEqual(a.account(),b.account());assert.notEqual(a.key(),b.key());
  const firstKey=a.key(),originalAccount=a.account(),otherBefore=data.get(b.key());
  const row=api.rows('1111111111')[0];row.snapshot.coins=99;row.revision++;
  await a.send({type:'royale-multiplayer-checkpoint',slot:0,snapshot:row.snapshot,revision:row.revision,savedAt:new Date().toISOString()});
  assert.equal(a.cache().slots[0].snapshot.coins,99);assert.equal(data.get(b.key()),otherBefore);assert.equal(a.cache().slots[2].snapshot.coins,77);
  const before=api.requests.length;await b.send({type:'royale-code-progress',account:originalAccount,slot:0,snapshot:row.snapshot});assert.equal(api.requests.length,before);
  await a.login('2222222222');assert.equal(a.account(),b.account());assert.equal(JSON.parse(data.get(firstKey)).slots[0].snapshot.coins,99);
  await a.send({type:'royale-multiplayer-checkpoint',account:originalAccount,slot:0,snapshot:row.snapshot,revision:999,savedAt:new Date().toISOString()});
  assert.equal(data.get(b.key()),data.get(a.key()));assert.equal(a.cache().slots[0].snapshot.coins,0);assert.equal(api.rows('2222222222')[0].snapshot.coins,0);
  assert.match(a.account(),/^[a-f0-9]{32}$/);assert.ok(!a.node('game-frame').src.includes('2222222222'));
});

test('an older tab cannot overwrite a newer confirmed local checkpoint for the same hero',async()=>{
  const data=new Map(),api=backend(),a=page(data,api),b=page(data,api);await a.login('1111111111');await b.login('1111111111');
  const row=api.rows('1111111111')[0],old=structuredClone(row.snapshot);row.snapshot.coins=123;row.revision=5;
  await a.send({type:'royale-multiplayer-checkpoint',slot:0,snapshot:row.snapshot,revision:5,savedAt:new Date().toISOString()});
  await b.send({type:'royale-multiplayer-checkpoint',slot:0,snapshot:old,revision:4,savedAt:new Date().toISOString(),requestId:'old-tab'});
  assert.match(b.sent.at(-1).error,/newer save/i);assert.equal(a.cache().slots[0].snapshot.coins,123);assert.equal(row.snapshot.coins,123);
});
