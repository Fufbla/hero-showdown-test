import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../royale-v3-staging/app.mjs',import.meta.url),'utf8');
function fixture(){
 const elements=new Map(),requests=[],messages=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,disabled:false,textContent:'',listeners:{},focus(){},addEventListener(event,handler){this.listeners[event]=handler;}});return elements.get(id);};
 const ctx=vm.createContext({$:element,window:{addEventListener(){}},status:s=>messages.push(s),api:()=>new Promise(resolve=>requests.push(resolve))});
 const run=source.slice(source.indexOf('async function run('),source.indexOf('async function launch('));
 const handlers=source.slice(source.indexOf("$('new').onclick="),source.indexOf("$('enter').onclick="));
 vm.runInContext("let access='existing',refresh='existing',code='',blocked=false,busy=false,navigationVersion=0,runSequence=0;"+run+handlers+";globalThis.state=()=>({access,code,busy});",ctx);
 return {elements,requests,messages,click:()=>element('new').onclick(),back:()=>element('code-back').listeners.click(),state:ctx.state};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('Back cancels an in-flight code screen and ignores its late response',async()=>{
 const f=fixture();f.click();assert.equal(f.elements.get('new-code').hidden,false);assert.equal(f.elements.get('continue').disabled,true);
 f.back();assert.equal(f.elements.get('welcome').hidden,false);assert.equal(f.state().busy,false);
 f.requests[0]({access:'unused',refresh:'unused',code:'1234567891'});await settle();
 assert.equal(f.elements.get('new-code').hidden,true);assert.equal(f.state().access,'existing');
});
test('a retry after Back cannot be overwritten or unlocked by the first request',async()=>{
 const f=fixture();f.click();f.back();f.click();assert.equal(f.requests.length,2);
 f.requests[0]({access:'old',refresh:'old',code:'1234567891'});await settle();assert.equal(f.state().busy,true);
 f.requests[1]({access:'new',refresh:'new',code:'1234567892'});await settle();assert.equal(f.state().code,'1234567892');assert.equal(f.state().access,'new');assert.equal(f.elements.get('continue').disabled,false);
 f.back();assert.equal(f.elements.get('new-code').hidden,true);assert.equal(f.elements.get('welcome').hidden,false);
});
