// Fixed-step clock for the visible legacy UI regression suites. Never installed
// for ordinary heroes, and no production API is attached to window.
export function installInputQA(getGame,input,renderer,refresh){
 const p=new URLSearchParams(location.search);if(!p.has('qa')||!/^(input|powers|world)-\d+/.test(p.get('testSession')||''))return;
 addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='royale-input-clock')return;const g=getGame();for(let i=0;i<Math.min(1200,Math.ceil(Number(e.data.seconds)*60)||0);i++){input.pollGamepad();g.step(1/60,input.sample());}renderer.draw(g,1,1/60);refresh();e.source.postMessage({type:'royale-input-clock-result',request:e.data.request,time:g.time},e.origin);});
 document.documentElement.dataset.inputClock='ready';
}
