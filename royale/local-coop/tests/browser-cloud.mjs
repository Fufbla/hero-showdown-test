// Explicit QA action only: create two new accounts. Never accepts user codes.
// Exercise the production CloudProfile with native browser fetch and its worker.
import {CloudProfile} from '../cloud.mjs?v=20261108-fetch';
import {Game,decodeSave} from '../../core.mjs';
const memory=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
export async function verifyBrowserCloudAccounts(endpoint){
 const accounts=[],profiles=[],checks=[];
 const check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name);};
 const profile=()=>{const p=new CloudProfile({endpoint,storage:memory()});profiles.push(p);return p;};
 try{
  for(let i=0;i<2;i++){
   const p=profile(),credentials=await p.request('create',{},false);
   await p.login(credentials.code);
   check(`Player ${i+1} authenticates and loads three new empty slots`,p.slots.length===3&&p.slots.every(r=>r.revision===0&&!r.snapshot));
   const snapshot=JSON.parse(new Game({look:{name:`Co-op login test ${i+1}`}}).save());
   await p.call('save',{slot:1,revision:0,snapshot});await p.load();
   accounts.push({profile:p,code:credentials.code});
  }
  check('Both native login sessions stay independent',accounts[0].profile.identity!==accounts[1].profile.identity&&accounts[0].profile.access!==accounts[1].profile.access);
  await Promise.all(accounts.map(async({profile:p},i)=>{const snapshot=structuredClone(p.slots[0].snapshot);snapshot.coins=11*(i+1);snapshot.xp=3*(i+1);await p.save(1,snapshot);}));
  for(let i=0;i<2;i++){
   const reopened=await profile().login(accounts[i].code),snapshot=reopened.slots[0].snapshot;
   check(`Player ${i+1} hero restores with its own saved coins and XP`,!!decodeSave(JSON.stringify(snapshot))&&snapshot.coins===11*(i+1)&&snapshot.xp===3*(i+1));
   check(`Player ${i+1} unused slots stay untouched`,reopened.slots.slice(1).every(r=>r.revision===0&&!r.snapshot));
  }
  const otherAccess=accounts[1].profile.access;accounts[0].profile.access='expired-qa-session';
  await accounts[0].profile.load();
  check('Expired session renews without replacing the other player',accounts[0].profile.access!=='expired-qa-session'&&accounts[1].profile.access===otherAccess);
  return {at:new Date().toISOString(),passed:true,checks,testAccountsCreated:2,transport:'Production CloudProfile; native browser fetch; no injected fetcher',scope:'Only two newly created test accounts were written. Existing user accounts were not accessed. No codes or tokens are recorded.'};
 }finally{profiles.forEach(p=>p.forget());accounts.forEach(a=>a.code='');}
}
