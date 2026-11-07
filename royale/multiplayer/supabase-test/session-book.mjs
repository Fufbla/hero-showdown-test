// Browser-only recovery receipts. A failed response must never lose either
// identity or mint another fresh room on retry. Never touches solo storage.
export async function startFreshSession(storage,key,slot,create){
  const sessions=JSON.parse(storage.getItem(key)||'[null,null]'),current=sessions[slot];
  if(!current)throw Error('Choose a test hero first.');
  const pendingKey=key+':fresh:'+slot;
  let pending=JSON.parse(storage.getItem(pendingKey)||'null');
  if(!pending||pending.sourceId!==current.id){
    pending={sourceId:current.id,freshId:crypto.randomUUID(),nextAccess:Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('')};
    storage.setItem(pendingKey,JSON.stringify(pending));
  }
  const fresh=await create(current.access,{freshId:pending.freshId,nextAccess:pending.nextAccess});
  const latest=JSON.parse(storage.getItem(key)),active=latest[slot];
  if(active?.id!==current.id&&active?.id!==fresh.id)throw Error('This test slot changed in another tab. Reopen Test heroes; both server saves are retained.');
  const history=JSON.parse(storage.getItem(key+':history')||'[]'),previous={...current,...fresh.previous};
  if(!history.some(s=>s.id===previous.id))history.push(previous);
  storage.setItem(key+':history',JSON.stringify(history));
  const {previous:_,...saved}=fresh;latest[slot]=saved;storage.setItem(key,JSON.stringify(latest));storage.removeItem(pendingKey);
  return saved;
}
export function restoreSession(storage,key,id){
  const history=JSON.parse(storage.getItem(key+':history')||'[]'),saved=history.find(s=>s.id===id);
  if(!saved)throw Error('Previous session not found.');
  const sessions=JSON.parse(storage.getItem(key)||'[null,null]'),current=sessions[saved.slot];
  if(current&&!history.some(s=>s.id===current.id))history.push(current);
  // Keep both identities in history as well as the active receipt. A partial
  // storage failure cannot erase access to either saved session.
  storage.setItem(key+':history',JSON.stringify(history));sessions[saved.slot]=saved;storage.setItem(key,JSON.stringify(sessions));return saved.slot;
}
