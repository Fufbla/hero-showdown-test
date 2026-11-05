// Pure decision layer for recovering a cloud save without mutating either copy.
// Never automatically replay or discard uncertain progress.
export function classifyRecoveryDraft(draft,server,owner,index){
 if(!draft||draft.status==='confirmed'||draft.status==='archived')return {action:'ignore'};
 if(draft.version!==2||draft.status!=='pending'||!draft.pending?.payload)return {action:'hold',reason:'unknown-draft'};
 let body;try{body=JSON.parse(draft.pending.payload);}catch{return {action:'hold',reason:'invalid-json'};}
 if(body.action!=='commit'||body.accountId!==owner||body.slot!==index||!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0)return {action:'hold',reason:'ownership-or-format'};
 if(!['create','import','manual','irreversible','delete'].includes(body.kind))return {action:'hold',reason:'unknown-operation'};
 if(!/^[-a-f0-9]{36}$/i.test(draft.pending.requestId||''))return {action:'hold',reason:'invalid-request-id'};
 if(body.kind!=='manual')return {action:'hold',reason:'nonordinary-save'};
 if(!server||server.deleted||server.hero_id!==body.heroId)return {action:'hold',reason:'hero-mismatch'};
 if(server.revision<body.expectedRevision)return {action:'hold',reason:'server-behind'};
 // Revision equality is ambiguous: request may never have reached server.
 // Revision greater is superseded. Both must be archived before loading server.
 return {action:'archive-and-load',reason:server.revision>body.expectedRevision?'superseded':'unconfirmed',body};
}
