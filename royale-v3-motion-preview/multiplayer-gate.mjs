// The real multiplayer modules are retained in this copy but never instantiated.
export async function createMultiplayerMenu(hooks){
 const disabled=()=>{hooks.onError('This is a local-only movement preview. Use the live game for multiplayer.');return false;};
 return {session:null,dialog:{open:false},open:disabled,connect:disabled,run:disabled,isLinked:()=>false};
}
