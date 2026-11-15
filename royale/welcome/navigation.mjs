// Return within the persistent launch page so music and the intro stay intact.
export function returnToWelcome(){
 try{
  if(parent!==window&&parent.location.origin===location.origin&&parent.document.getElementById('game-frame')?.contentWindow===window){
   parent.postMessage({type:'royale-return-welcome'},location.origin);return;
  }
 }catch{}
 location.assign(new URL('../',import.meta.url).href);
}
