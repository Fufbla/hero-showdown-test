import {advanceUI} from './ui-clock.mjs';
const f=document.querySelector('iframe'),out=document.querySelector('pre'),wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<400;i++){if(fn())return;await wait(50)}throw Error('Game did not become ready')}
async function run(w,h){out.textContent='';f.style.width=w+'px';f.style.height=h+'px';await new Promise(r=>{f.onload=r;f.src='../index.html?touch=1&qa=1&testSession=input-'+Date.now()});
 const d=f.contentDocument,v=f.contentWindow,$=s=>d.querySelector(s);
 await until(()=>$('[data-action=create]'));$('[data-action=create]').click();await until(()=>!$('#creator').hidden);$('#begin').click();await until(()=>d.body.classList.contains('playing'));f.focus();
 const hero=()=>$('#diagnostics').textContent;
 const check=(name,b)=>{out.textContent+=(b?'PASS ':'FAIL ')+name+'\n'};
 const stick=$('#stick'),buttons=['punch','kick','jump'].map(n=>$('[data-control='+n+']'));
 // Synthetic pointers exercise the same outside-release fallback as unavailable capture.
 const ptr=(t,type,id,x=0,y=0)=>t.dispatchEvent(new v.PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true}));
 let unrelatedClicks=0;
 const countClick=()=>unrelatedClicks++;
 const dims=()=>[$('#game').width,$('#game').height,v.visualViewport.scale,v.scrollX,v.scrollY].join('/');
 await until(()=>{const c=$('#game'),r=c.getBoundingClientRect();return r.height>0&&c.height===Math.round(r.height*Math.min(v.devicePixelRatio,2))&&stickVisible()});
 function stickVisible(){return $('#stick').getBoundingClientRect().width>0}
 const start=dims(),url=v.location.href,r=stick.getBoundingClientRect(),y=r.top+r.height/2;
 $('#pause').click();$('#open-map').click();
 const destination=$('[data-travel="2"]:enabled')||$('[data-travel]:enabled');
 if (!destination) throw Error('No available safe-camp portal');
 const region=destination.dataset.travel;destination.click();
 await until(()=>d.body.classList.contains('playing')&&hero().includes('region '+region)&&dims()===start);
 check('Safe-camp portal restores patrol scale',dims()===start);
 d.addEventListener('click',countClick);
 ptr(stick,'pointerdown',1,r.right,y);for(const [i,b] of buttons.entries()){for(let n=0;n<8;n++){ptr(b,'pointerdown',2+i);if(n===3)ptr(buttons[(i+1)%3],'pointerdown',8);await advanceUI(f,.045);await wait(70);ptr(b,'pointerup',2+i);if(n===3)ptr(buttons[(i+1)%3],'pointerup',8)}}
 check('Rapid Punch, Kick, Jump and third finger retain joystick movement',/vx [1-9]/.test(hero()));ptr(stick,'pointermove',1,r.left-80,y);await advanceUI(f,.25);check('Drag outside reverses movement',/vx -/.test(hero()));ptr(stick,'lostpointercapture',1);await advanceUI(f,.3);check('Lost capture releases joystick',/vx 0\.0/.test(hero()));
 check('Stable visual viewport, canvas buffer and scroll '+start,dims()===start);const label=buttons[0].lastElementChild;
 for(const type of ['selectstart','contextmenu','dragstart','dblclick','gesturestart'])check(type+' consumed inside controls',!label.dispatchEvent(new v.Event(type,{bubbles:true,cancelable:true})));
 buttons[0].dispatchEvent(new v.MouseEvent('click',{detail:1,bubbles:true,cancelable:true}));
 check('No compatibility click reached the page',unrelatedClicks===0);
 check('No selection or navigation',d.getSelection().toString()===''&&v.location.href===url);
 check('Selection explicitly blocked on nested Punch label',v.getComputedStyle(buttons[0].lastElementChild).userSelect==='none');
 ptr(stick,'pointerdown',1,r.right,y);v.dispatchEvent(new v.Event('blur'));check('Focus loss leaves patrol screen intact',d.body.classList.contains('playing'));v.dispatchEvent(new v.Event('focus'));await advanceUI(f,.2);check('No held action after return',!$('.pressed')&&/vx 0\.0/.test(hero()));$('#pause').click();check('Intentional pause menu opens',!$('#pause-menu').hidden);$('#resume').click();
 await until(()=>dims()===start);check('Resume restores original camera dimensions',dims()===start);
 d.removeEventListener('click',countClick);out.textContent+='DONE';
}
for(const [id,w,h] of [['run',390,844],['wide',844,390]])document.getElementById(id).onclick=async()=>{
 const actions=[...document.querySelectorAll('main > button')];actions.forEach(b=>b.disabled=true);
 try{await run(w,h)}catch(e){out.textContent+='FAIL '+e.message}finally{actions.forEach(b=>b.disabled=false)}
};
