// A shared UTC epoch is part of the game rules. Online time is synchronized to
// the server and advanced monotonically while open, never to simulation frames.
let sync=null;
export function setServerClock(serverTime,receivedAt=performance.now()){if(Number.isFinite(serverTime))sync={serverTime,receivedAt};}
export function sharedNow(){return sync?sync.serverTime+Math.max(0,performance.now()-sync.receivedAt):Date.now();}
export const clockSynchronized=()=>!!sync;
