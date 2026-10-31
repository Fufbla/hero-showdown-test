let serial=0;
export async function advanceUI(frame,seconds){
 const end=Date.now()+30000;while(frame.contentDocument.documentElement.dataset.inputClock!=='ready'){if(Date.now()>end)throw Error('Input fixture clock not ready');await new Promise(r=>setTimeout(r,30));}
 const request=++serial;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{removeEventListener('message',receive);reject(Error('Input clock timeout'));},30000);function receive(e){if(e.source===frame.contentWindow&&e.origin===location.origin&&e.data?.type==='royale-input-clock-result'&&e.data.request===request){clearTimeout(timer);removeEventListener('message',receive);resolve(e.data.time);}}addEventListener('message',receive);frame.contentWindow.postMessage({type:'royale-input-clock',request,seconds},location.origin);});
}
