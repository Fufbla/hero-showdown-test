import test from 'node:test';
import assert from 'node:assert/strict';
import {Soundtrack,preferences,MUSIC_KEY,AUDIO_KEY} from '../../royale/media/controller.mjs';
import {readFileSync,statSync} from 'node:fs';
function harness(){
 const values=new Map(),gains=[],sources=[];let requests=0,resume=0;
 class Context{constructor(){this.state='running';this.currentTime=2;this.destination={};}resume(){resume++;this.state='running';return Promise.resolve();}createGain(){const gain={value:0,cancelScheduledValues(){},setTargetAtTime(value){this.value=value;}};gains.push(gain);return {gain,connect(){}};}decodeAudioData(){return Promise.resolve({duration:180});}createBufferSource(){const s={connect(){},start(){this.starts=(this.starts||0)+1;}};sources.push(s);return s;}}
 const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const win={localStorage:storage,AudioContext:Context,fetch:async()=>{requests++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}};
 return {track:new Soundtrack(win),win,storage,values,gains,sources,get requests(){return requests;}};
}
test('music defaults, legacy preference migration and denied storage are independent of hero saves',()=>{
 const h=harness();assert.deepEqual(preferences(h.storage),{volume:.2,muted:false});
 h.storage.setItem(AUDIO_KEY,JSON.stringify({music:.57,effects:.8}));assert.equal(preferences(h.storage).volume,.57);
 h.storage.setItem(MUSIC_KEY,JSON.stringify({volume:.42,muted:true}));assert.deepEqual(preferences(h.storage),{volume:.42,muted:true});
 assert.deepEqual(preferences({getItem(){throw Error('storage denied');}}),{volume:.2,muted:false});
});
test('intro gate, concurrent interactions and mute never start duplicate music or rewind it',async()=>{
 const h=harness(),t=h.track;t.unlock();await Promise.resolve();assert.equal(h.requests,0);assert.equal(t.source,null);
 t.finishIntro();t.unlock();t.unlock();await new Promise(r=>setTimeout(r,0));assert.equal(h.requests,1);assert.equal(h.sources.length,1);assert.equal(t.source.loop,true);assert.equal(t.source.starts,1);
 const source=t.source,start=t.startedAt;t.toggle();assert.equal(h.gains[0].value,0);t.toggle();t.setVolume(.8);
 assert.equal(t.source,source);assert.equal(t.startedAt,start);assert.equal(h.gains[0].value,.8*.18);
 assert.deepEqual(JSON.parse(h.values.get(MUSIC_KEY)),{volume:.8,muted:false});assert.deepEqual([...h.values.keys()],[MUSIC_KEY]);
});
test('ducking changes only music and smoothly returns to its configured level',async()=>{
 const h=harness(),t=h.track;t.unlock();t.finishIntro();await new Promise(r=>setTimeout(r,0));const normal=h.gains[0].value;
 t.duck('boss-attack');assert.equal(h.gains[0].value,normal*.45);t.context.currentTime+=.5;t.apply();assert.equal(h.gains[0].value,normal);clearTimeout(t.duckTimer);
});
test('failed soundtrack download never rejects into gameplay or retries on every input',async()=>{
 const h=harness();h.win.fetch=async()=>{throw Error('offline');};h.track.unlock();h.track.finishIntro();await new Promise(r=>setTimeout(r,0));assert.equal(h.track.failed,true);assert.equal(h.track.source,null);h.track.unlock();
});
test('production ships complete optimized media, only one launcher per entry and persistent scene navigation',()=>{
 const root=new URL('../../_site/',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
 for(const path of ['royale/index.html','royale/gameplay/index.html','royale/local-coop/index.html'])assert.equal((read(path).match(/src="[^\"]*release\/media\.mjs/g)||[]).length,1,path);
 for(const path of ['intro.mp4','intro.webm','soundtrack.mp3'])assert(statSync(new URL('royale/media/'+path,root)).size>100000);
 const bundle=read('royale/release/media.mjs');assert.match(bundle,/object|video/);assert.match(bundle,/intro-skip/);assert.match(bundle,/local-coop/);assert.match(bundle,/browser-heroes/);
});
