import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {RoomRuntime,freshSnapshot} from './room-runtime.mjs';
import {captureProgress} from '../v3-checkpoints.mjs';
import {decodeSave} from '../../core.mjs';
import {inputPacket,sequence} from '../protocol.mjs';

const digest=s=>createHash('sha256').update(s).digest('hex');
const prefix='royale_mp_test_',json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, content-type, apikey','Access-Control-Allow-Methods':'POST, OPTIONS'}});
export function makeHandler({url,key,fetcher=fetch,now=Date.now}){
  async function rest(path,options={},trace){
    const started=performance.now();
    const response=await fetcher(url+'/rest/v1/'+path,{...options,headers:{apikey:key,...(key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{}),'Content-Type':'application/json',Prefer:'return=representation',...options.headers},signal:AbortSignal.timeout(10000)});
    const text=await response.text(),data=text?JSON.parse(text):null;if(trace)trace.push({step:path.split('/').at(-1).replace(prefix,''),ms:Math.round(performance.now()-started)});if(!response.ok)throw Error('Test database request failed: '+(data?.message||response.status));return data;
  }
  const rpc=(name,data,trace)=>rest('rpc/'+prefix+name,{method:'POST',body:JSON.stringify(data)},trace);
  async function authenticate(token){
    if(!/^[a-f0-9]{64}$/.test(token))throw Error('Open or restore a test hero first.');
    const rows=await rest(prefix+'heroes?token_hash=eq.'+digest(token)+'&select=*');if(!rows[0])throw Error('Test session expired. Choose a test hero again.');return rows[0];
  }
  async function existing(token){
    if(!/^[a-f0-9]{64}$/.test(token))throw Error('Enter your existing save code first.');
    const rows=await rest('royale_v3_sessions?token_hash=eq.'+digest(token)+'&expires_at=gt.'+encodeURIComponent(new Date(now()).toISOString())+'&select=profile_id');
    if(!rows[0])throw Error('Your existing save session expired.');return rows[0].profile_id;
  }
  const handle=async req=>{
    if(req.method==='OPTIONS')return json({ok:true});
    if(req.method!=='POST')return json({ok:true,prototype:'isolated-supabase-coop',version:2,transport:'websocket-relay-v1'});
    const started=performance.now(),trace=[],reply=(value,status=200)=>json({...value,timing:{totalMs:Math.round(performance.now()-started),database:trace}},status);
    try{
      const raw=await req.text();if(raw.length>20000)throw Error('Request too large.');const body=JSON.parse(raw),token=(req.headers.get('authorization')||'').replace(/^Bearer /,'');
      if(body.action==='source-login'){
        if(!/^\d{10}$/.test(body.code))throw Error('Enter your existing ten-digit save code.');
        const response=await fetcher(url+'/functions/v1/royale-v3-staging',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://fufbla.github.io'},body:JSON.stringify({action:'verify',code:body.code}),signal:AbortSignal.timeout(12000)}),data=await response.json();
        if(!response.ok)throw Error(data.error||'Could not open those saved heroes.');return json({access:data.access});
      }
      if(body.action==='source-slots'){
        const profile=await existing(token),rows=await rest('royale_v3_hero_slots?profile_id=eq.'+profile+'&slot_number=lt.3&select=slot_number,snapshot');
        return json({slots:rows.filter(r=>r.snapshot).map(r=>({slot:r.slot_number-1,name:r.snapshot.look.name,level:r.snapshot.level}))});
      }
      if(['new','copy'].includes(body.action)){
        let snapshot,slot=body.slot??0;
        if(![0,1].includes(slot))throw Error('Choose Slot 1 or Slot 2. Slot 3 stays hidden.');
        if(body.action==='copy'){
          const profile=await existing(token),rows=await rest('royale_v3_hero_slots?profile_id=eq.'+profile+'&slot_number=eq.'+(slot+1)+'&select=snapshot');
          snapshot=rows[0]?.snapshot;if(!snapshot)throw Error('That slot has no saved hero.');
        }else snapshot=freshSnapshot(typeof body.name==='string'?body.name.slice(0,20):'Test Hero');
        if(!decodeSave(JSON.stringify(snapshot)))throw Error('Saved hero needs recovery. No original data was changed.');
        const access=randomBytes(32).toString('hex'),id=randomUUID(),ip=digest(req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown');
        await rpc('new_hero',{p_id:id,p_token:digest(access),p_slot:slot,p_snapshot:snapshot,p_ip:ip});
        return json({id,access,slot,snapshot,revision:0,savedAt:new Date(now()).toISOString()});
      }
      const syncing=body.action==='sync';let loaded=null;
      if(syncing){
        if(!/^[a-f0-9]{64}$/.test(token))throw Error('Open or restore a test hero first.');
        if(body.input)sequence(body.inputSeq);
        loaded=await rpc('sync_load',{p_token:digest(token),p_seq:body.input?body.inputSeq:0,p_input:body.input?inputPacket(body.input):null},trace);
      }
      let hero=loaded?.hero||await authenticate(token);
      if(body.action==='fresh-session'){
        // A fresh test session gets a separate identity. Old tabs cannot drive
        // the new room, and the prior hero/session remains recoverable.
        if(!/^[a-f0-9]{64}$/.test(body.nextAccess||'')||body.nextAccess===token||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.freshId||''))throw Error('Invalid fresh-session request.');
        const lookup=()=>rest(prefix+'heroes?token_hash=eq.'+digest(body.nextAccess)+'&select=*');
        let fresh=(await lookup())[0];
        if(!fresh){
          if(hero.room_id){
            const response=await handle(new Request(req.url,{method:'POST',headers:{Authorization:'Bearer '+token},body:JSON.stringify({action:'disconnect'})}));
            if(!response.ok)throw Error((await response.json()).error);hero=await authenticate(token);
          }
          try{await rpc('new_hero',{p_id:body.freshId,p_token:digest(body.nextAccess),p_slot:hero.slot,p_snapshot:hero.snapshot,p_ip:hero.creation_ip});}
          catch(error){if(!(await lookup())[0])throw error;}
          fresh=(await lookup())[0];
        }
        if(fresh.id!==body.freshId||fresh.slot!==hero.slot)throw Error('Fresh-session identity conflict. Your previous session is retained.');
        // Leave the fresh identity unbound until the player chooses Create or
        // Join. Both devices can use this path without first leaving a lobby.
        const room=fresh.room_id?(await rest(prefix+'rooms?id=eq.'+fresh.room_id+'&select=code'))[0]:null;
        return json({id:fresh.id,access:body.nextAccess,slot:fresh.slot,snapshot:fresh.snapshot,revision:fresh.revision,savedAt:fresh.saved_at,roomId:fresh.room_id,code:room?.code||null,previous:{snapshot:hero.snapshot,revision:hero.revision,savedAt:hero.saved_at}});
      }
      if(body.action==='profile')return json({id:hero.id,slot:hero.slot,snapshot:hero.snapshot,revision:hero.revision,savedAt:hero.saved_at,roomId:hero.room_id});
      if(body.action==='hello')return json({heroes:[{id:hero.id,slot:hero.slot,name:hero.snapshot.look.name,level:hero.snapshot.level,commandSeq:hero.command_seq,room:hero.room_id}]});
      if(body.action==='release'&&!hero.room_id)return json({slot:hero.slot,snapshot:hero.snapshot,revision:hero.revision,savedAt:hero.saved_at});
      if(!['sync','command','release','select','disconnect'].includes(body.action))throw Error('Unknown test request.');
      for(let attempt=0;attempt<10;attempt++){
        if(attempt){
          if(syncing){loaded=await rpc('sync_load',{p_token:digest(token),p_seq:0,p_input:null},trace);hero=loaded.hero;}
          else hero=await authenticate(token);
        }
        const mode=body.action==='command'&&body.method==='mode'?body.args?.[0]:null;
        let roomRow=null;
        if(syncing)roomRow=loaded.room;
        else if(hero.room_id)roomRow=(await rest(prefix+'rooms?id=eq.'+hero.room_id+'&select=*'))[0];
        else if(mode==='join'){
          if(!/^\d{6}$/.test(body.args?.[1]))throw Error('Enter the six-digit room code.');
          roomRow=(await rest(prefix+'rooms?code=eq.'+body.args[1]+'&select=*'))[0];if(!roomRow)throw Error('Room code is not active.');
        }
        const runtime=new RoomRuntime(roomRow,now()),a=runtime.a;
        const previousRoom=roomRow?a.state.rooms.get(roomRow.id):null;
        let h=a.state.heroes.get(hero.id);if(!h)h=runtime.adopt(hero);
        // A competing sync already committed a newer frame. Our intentions are
        // durable in the mailbox and will be picked up on the next simulation.
        // Return only that committed state, with its actual acknowledgement.
        if(syncing&&attempt>=2&&roomRow)return reply({state:runtime.view(h),version:roomRow.version,queued:true});
        runtime.touch(h);
        if(syncing)runtime.pending(loaded.inputs);
        else if(body.input&&Number.isSafeInteger(body.inputSeq))a.input(h.owner,h.id,body.inputSeq,body.input);
        runtime.advance();
        let result=null,leaving=body.action==='release'||mode==='solo';
        // Before a room exists, menu pause/save requests must not consume a
        // command sequence that has no durable room document to retain it.
        if(!roomRow&&!mode&&body.action==='command'){
          if(!['pause','save'].includes(body.method))throw Error('Create or join a multiplayer room first.');
          return json({state:runtime.view(h),result:true});
        }
        if(body.action==='disconnect'){a.detach(h.id,a.connections.get(h.id));h.netSeen=0;}
        if(body.action==='command'){
          if(mode==='create'&&hero.room_id&&body.seq!==h.commandSeq)throw Error('Leave this room before creating another.');
          result=runtime.command(h,body.seq,body.method,body.args||[]);
          if(mode==='join'&&!hero.room_id){
            const r=a.state.rooms.get(h.room),host=a.state.heroes.get(r.hostId);
            if(host&&host!==h){h.game.loadRegion(host.game.regionId,{x:host.game.hero.x+42,y:host.game.hero.y});a.bind(h);}
          }
        }
        if(body.action==='release'){
          if(!h.game.canSave())throw Error('Leave combat for five seconds before returning to heroes.');
          if(a.state.rooms.get(h.room).code)a.mode(h.owner,h.id,'solo');
        }
        const durable=!!roomRow||!!a.state.rooms.get(h.room).code;
        const checkpoints=durable?runtime.checkpoints(body.action!=='sync'):[],checkpoint=checkpoints.find(p=>p.id===h.id);
        const view=runtime.view(h),r=roomRow?(a.state.rooms.get(roomRow.id)||previousRoom):a.state.rooms.get(h.room);
        if(!roomRow&&!r.code)return json({state:view,result,checkpoint});
        // A test hero can belong to one durable room. Creation/join and all reward
        // snapshots are committed atomically with a version compare-and-swap.
        if(leaving){
          a.state.rooms.delete(h.room);a.state.heroes.delete(h.id);a.inputs.delete(h.id);
          if(!r.members.size)a.state.rooms.set(r.id,r);
        }
        const payload={p_room:roomRow?.id||r.id,p_code:roomRow?.code||r.code,p_expected:roomRow?.version??-1,p_runtime:runtime.encode(),p_frame:runtime.frame(r),p_actor:h.id,p_join:!hero.room_id,p_leave:leaving,p_saves:checkpoints};
        const saved=await rpc('commit',payload,trace);
        if(saved===false||saved?.ok===false)continue;
        if(body.action==='release')return json({slot:h.slot,snapshot:checkpoint?.snapshot||captureProgress(h.game),revision:h.savedRevision,savedAt:h.savedAt});
        return reply({state:view,result,checkpoint,version:roomRow?roomRow.version+1:0});
      }
      return json({error:'Room is busy. Your confirmed progress is safe; retrying.'},409);
    }catch(error){return json({error:error.message},400);}
  };
  return handle;
}
if(typeof Deno!=='undefined'){
  const secrets=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');
  const handler=makeHandler({url:Deno.env.get('SUPABASE_URL'),key:secrets.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')});
  Deno.serve(handler);
}
