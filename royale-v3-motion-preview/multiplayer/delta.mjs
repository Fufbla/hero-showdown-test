// Graph nodes retain deterministic traversal order. Send changed nodes, with a
// baseline revision; a lost baseline triggers a full snapshot, never speculation.
const same=(a,b)=>a===b||a&&b&&typeof a==='object'&&typeof b==='object'&&a.r===b.r&&a.u===b.u;
const sameList=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
function sameNode(a,b){
  if(a===b)return true;if(!a||!b||a.type!==b.type||a.data.length!==b.data.length)return false;
  if(a.type==='Array'||a.type==='Set')return a.data.every((v,i)=>same(v,b.data[i]));
  return a.data.every(([k,v],i)=>same(k,b.data[i][0])&&same(v,b.data[i][1]));
}
export function runtimeDelta(previous,text) {
  const raw=JSON.parse(text);
  if(!previous)return {next:raw,delta:{full:raw}};
  // Match graph paths before diffing: creating an attack must not renumber every
  // enemy. Periodic full baselines reclaim unreachable nodes from old effects.
  const next={version:1,head:null,nodes:previous.nodes.slice()},mapped=new Map(),claimed=new Set();
  const isRef=v=>v&&typeof v==='object'&&Number.isInteger(v.r);
  function align(ref,prior) {
    if(!isRef(ref))return ref;
    if(mapped.has(ref.r))return {r:mapped.get(ref.r)};
    const node=raw.nodes[ref.r],candidate=isRef(prior)?prior.r:-1,old=previous.nodes[candidate];
    const id=old?.type===node.type&&!claimed.has(candidate)?candidate:next.nodes.length;
    mapped.set(ref.r,id);claimed.add(id);next.nodes[id]=null;
    const baseline=previous.nodes[id],record=!['Array','Set','Map'].includes(node.type);
    let data;
    if(record){const fields=new Map(baseline?.data||[]);data=node.data.map(([k,v])=>[k,align(v,fields.get(k))]);}
    else if(node.type==='Map')data=node.data.map(([k,v],i)=>[align(k,baseline?.data[i]?.[0]),align(v,baseline?.data[i]?.[1])]);
    else data=node.data.map((v,i)=>align(v,baseline?.data[i]));
    next.nodes[id]={type:node.type,data};return {r:id};
  }
  next.head=align(raw.head,previous.head);
  const nodes=[],fields=[];
  for(let i=0;i<next.nodes.length;i++) {
    const node=next.nodes[i],old=previous.nodes[i];if(sameNode(node,old))continue;
    if(old?.type===node.type&&!['Array','Set','Map'].includes(node.type)) {
      const before=new Map(old.data),put=node.data.filter(([k,v])=>!before.has(k)||!same(v,before.get(k)));
      const keys=node.data.map(([k])=>k),implied=[...old.data.map(([k])=>k),...put.filter(([k])=>!before.has(k)).map(([k])=>k)],order=sameList(keys,implied)?null:keys;
      fields.push([i,put,order]);
    } else nodes.push([i,node]);
  }
  return {next,delta:{version:1,head:next.head,length:next.nodes.length,nodes,fields}};
}
export function applyRuntimeDelta(previous,delta) {
  if(delta.full)return delta.full;
  if(!previous)throw Error('Missing state baseline. Reconnect.');
  const nodes=previous.nodes.slice(0,delta.length);for(const [i,node] of delta.nodes)nodes[i]=node;
  for(const [i,put,order] of delta.fields||[]){const map=new Map(nodes[i].data);for(const [k,v] of put)map.set(k,v);nodes[i]={type:nodes[i].type,data:(order||[...map.keys()]).map(k=>[k,map.get(k)])};}
  return {version:delta.version,head:delta.head,nodes};
}
