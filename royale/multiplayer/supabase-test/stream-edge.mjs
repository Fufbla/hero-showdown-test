import {serveSocket} from './socket-server.mjs';

// Persistent sockets must not hold the simulation's CPU in one Edge invocation.
// This small relay forwards each authenticated message to the existing HTTP
// authority in the same region. Only that authority can read or write progress.
export function relayHandler(endpoint,fetcher=fetch){
  return async req=>{
    try{return await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:req.headers.get('authorization')||''},body:await req.text(),signal:AbortSignal.timeout(14000)});}
    catch{return Response.json({error:'Combat connection interrupted. Retrying.'},{status:503});}
  };
}
if(typeof Deno!=='undefined'){
  const endpoint=Deno.env.get('SUPABASE_URL')+'/functions/v1/royale-mp-test?forceFunctionRegion=us-west-2',handler=relayHandler(endpoint);
  Deno.serve(req=>{
    if(req.headers.get('upgrade')?.toLowerCase()!=='websocket')return Response.json({ok:true,prototype:'isolated-multiplayer-relay',version:1});
    const {socket,response}=Deno.upgradeWebSocket(req);EdgeRuntime.waitUntil(serveSocket(socket,handler,endpoint));return response;
  });
}
