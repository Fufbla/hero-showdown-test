// Opt-in live integration test. Creates disposable heroes only in royale_mp_test_*.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {decodeRuntime} from '../runtime.mjs';
const endpoint='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-mp-test?forceFunctionRegion=us-west-2';
const fixturePath=process.env.MP_TEST_FIXTURES||'/tmp/royale-supabase-fixtures.json';
export const wait=ms=>new Promise(r=>setTimeout(r,ms));
export class LiveClient {
 constructor(hero){this.hero=hero;this.times=[];this.saves=[];this.seq=Date.now();}
 async call(body){const at=performance.now(),r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(this.hero?.access?{Authorization:'Bearer '+this.hero.access}:{})},body:JSON.stringify(body)}),d=await r.json();this.times.push(performance.now()-at);if(!r.ok)throw Error(d.error);if(d.state){this.state=d.state;this.game=decodeRuntime(d.state.game);}if(d.checkpoint)this.saves.push(d.checkpoint.saved_at);return d;}
 command(method,args=[]){return this.call({action:'command',seq:this.state.commandSeq+1,method,args});}
 sync(input={}){return this.call({action:'sync',input,inputSeq:++this.seq});}
}
export async function fixtures(count=2){
 let list;try{list=JSON.parse(await readFile(fixturePath));}catch{list=[];}
 while(list.length<count){list.push(await new LiveClient().call({action:'new',slot:list.length%2,name:'Network QA '+(list.length+1)}));await writeFile(fixturePath,JSON.stringify(list),{mode:0o600});}
 return list.slice(0,count).map(h=>new LiveClient(h));
}
if(process.argv[1]===new URL(import.meta.url).pathname){
 const clients=await fixtures(),[a,b]=clients;
 for(const c of clients)await c.call({action:'select'});
 if(!a.state.roomId)await a.command('mode',['create']);
 if(b.state.code!==a.state.code)await b.command('mode',['join',a.state.code]);
 await a.sync();assert.equal(a.state.players.length,2);assert.match(a.state.code,/^\d{6}$/);
 if(a.state.phase==='lobby')await a.command('startRoom');
 await Promise.all(clients.map(c=>c.command('pause',[false])));
 console.log(JSON.stringify({phase:a.state.phase,players:a.state.players.map(p=>p.name),enemies:a.game.enemies.slice(0,3).map(e=>({id:e.id,x:e.x,hp:e.hp,maxHp:e.maxHp,type:e.type})),hero:a.game.hero}));
 for(let i=0;i<8;i++){await Promise.all([a.sync({move:1,run:true}),b.sync({move:1,run:false})]);await wait(200);}
 console.log(JSON.stringify({movement:clients.map(c=>({x:c.game.hero.x,hp:c.game.hero.hp,peers:c.state.nearby.length})),rtt:clients.map(c=>c.times)}));
}
