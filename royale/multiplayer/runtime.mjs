import {Game} from '../core.mjs';
import {PowerSystem} from '../powers.mjs';
import {ProjectilePool} from '../projectiles.mjs';

// A server-owned graph, NOT a client save format. References and Sets must survive
// restart (attack hit sets, shared enemies, cooldowns, hazards, personal loot).
const classes={Game,PowerSystem,ProjectilePool};
export function encodeRuntime(root) {
  const seen=new Map(),nodes=[];
  function ref(value) {
    if(value===undefined)return {u:1};
    if(value===null||typeof value!=='object') {
      if(typeof value==='function'||typeof value==='symbol')throw Error('Runtime contains executable state.');
      if(typeof value==='number'&&!Number.isFinite(value))throw Error('Non-finite runtime value.');return value;
    }
    if(seen.has(value))return {r:seen.get(value)};
    const id=nodes.length;seen.set(value,id);nodes.push(null);
    let type=Array.isArray(value)?'Array':value instanceof Set?'Set':value instanceof Map?'Map':Object.keys(classes).find(k=>value instanceof classes[k])||'Object';
    let data;
    if(type==='Array'||type==='Set')data=[...value].map(ref);
    else if(type==='Map')data=[...value].map(([k,v])=>[ref(k),ref(v)]);
    else {
      data=Object.entries(value).filter(([k,v])=>typeof v!=='function'&&!(v instanceof WeakSet)&&!k.startsWith('_outfit')&&k!=='_visualOutfit').map(([k,v])=>[k,ref(v)]);
      if(type==='PowerSystem')data.push(['game',ref(value.game)]);
    }
    nodes[id]={type,data};return {r:id};
  }
  const head=ref(root);return JSON.stringify({version:1,head,nodes});
}
export function decodeRuntime(text,{now=Date.now,random=Math.random}={}) {
  const raw=JSON.parse(text);if(raw.version!==1||!Array.isArray(raw.nodes))throw Error('Unsupported authoritative state.');
  const objects=raw.nodes.map(({type})=>type==='Array'?[]:type==='Set'?new Set():type==='Map'?new Map():classes[type]?Object.create(classes[type].prototype):type==='Object'?{}:null);
  if(objects.includes(null))throw Error('Unknown runtime type.');
  const value=v=>v&&typeof v==='object'?(v.u?undefined:objects[v.r]):v;
  raw.nodes.forEach(({type,data},i)=>{
    const object=objects[i];
    if(type==='Array')object.push(...data.map(value));
    else if(type==='Set')data.forEach(v=>object.add(value(v)));
    else if(type==='Map')data.forEach(([k,v])=>object.set(value(k),value(v)));
    else for(const [k,v] of data){if(['__proto__','prototype','constructor'].includes(k))throw Error('Invalid runtime field.');Object.defineProperty(object,k,{value:value(v),writable:true,enumerable:k!=='game',configurable:true});}
  });
  for(const o of objects)if(o instanceof ProjectilePool)o.members=new WeakSet(o.free);
  for(const g of objects.filter(o=>o instanceof Game)) {
    g.now=now;g.random=random;
    for(const p of g.enemyShots)g.enemyShotPool.members.add(p);
    for(const p of g.powers.projectiles)g.powers.projectilePool.members.add(p);
  }
  return value(raw.head);
}
