// A visible, repeatable same-origin QA page. Exercises the real DOM event handlers.
const frame=document.getElementById('phone'),report=document.getElementById('report');
for(const [id,w,h] of [['portrait',390,844],['landscape',844,390],['small',320,568],['tablet',768,1024],['desktop',1280,800]])document.getElementById(id).onclick=()=>{frame.style.width=w+'px';frame.style.height=h+'px';};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
document.getElementById('test').onclick=async()=>{
  const button=document.getElementById('test');button.disabled=true;report.textContent='Running real input checks…\n';
  await new Promise(resolve=>{frame.onload=resolve;frame.src=`../?qa=1&touch=1&testSession=input-${Date.now()}`;});
  while(!frame.contentDocument.querySelector('.hero-slot'))await wait(30);
  const d=frame.contentDocument,w=frame.contentWindow;const el=id=>d.getElementById(id);
  const check=(name,ok,detail='')=>{report.textContent+=`${ok?'PASS':'FAIL'} · ${name}${detail?' · '+detail:''}\n`;if(!ok)throw Error(name);};
  const stats=()=>{const s=el('diagnostics').textContent;return {time:Number(s.match(/ · t ([\d.]+)/)?.[1]),vx:Number(s.match(/vx ([\d.-]+)/)?.[1]),x:Number(s.match(/x ([\d.-]+)/)?.[1]),y:Number(s.match(/y ([\d.-]+)/)?.[1]),jumps:Number(s.match(/jumps (\d)/)?.[1]),text:s};};
  const advance=async seconds=>{const start=stats().time,deadline=Date.now()+15000;while(stats().time-start<seconds){if(Date.now()>deadline)throw Error('Simulation did not advance while visible');await wait(30);}};
  const key=(code,down)=>d.body.dispatchEvent(new w.KeyboardEvent(down?'keydown':'keyup',{code,key:code,bubbles:true}));
  const pointer=(target,type,id,x,y)=>target.dispatchEvent(new w.PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true}));
  try{
    frame.focus();await wait(100);
    if(!el('roster').hidden){d.querySelector('[data-slot="0"] [data-action]').click();}
    if(!el('creator').hidden)el('begin').click();
    if(!el('pause-menu').hidden)el('resume').click();
    el('pause').click();el('return-camp').click();await advance(.3);
    const start=stats();check('game starts',el('creator').hidden&&el('pause-menu').hidden&&!el('pause').disabled);
    check('no page overflow',d.documentElement.scrollWidth===w.innerWidth,`${w.innerWidth} × ${w.innerHeight}`);
    for(const id of ['pause','stick']){const r=el(id).getBoundingClientRect();check(`${id} fits viewport`,r.left>=0&&r.right<=w.innerWidth&&r.top>=0&&r.bottom<=w.innerHeight);}
    const touch=d.querySelector('.touch-controls');check('touch controls visible',touch.getBoundingClientRect().height>0);
    key('KeyD',true);await advance(.7);key('KeyD',false);await advance(.2);const walk=stats();check('keyboard walking',walk.x>start.x+60,`${start.x} → ${walk.x}`);
    key('ShiftLeft',true);key('KeyD',true);await advance(.7);key('KeyD',false);key('ShiftLeft',false);await advance(.2);const run=stats();check('running is faster',run.x-walk.x>walk.x-start.x);
    const floor=stats().y;key('Space',true);key('Space',false);await advance(.12);const first=stats();check('first jump',first.y<floor-25);
    key('Space',true);key('Space',false);await advance(.14);const second=stats();check('double jump',second.y<first.y-25&&second.jumps===2);
    key('KeyA',true);await advance(.2);key('KeyA',false);check('air steering',stats().x<run.x);
    await advance(1.2);el('pause').click();await wait(150);const paused=stats();await wait(350);check('pause freezes position',stats().x===paused.x&&stats().y===paused.y);
    el('resume').click();await wait(150);
    // Synthetic pointers are not active browser pointers, so capture is expected to be unavailable.
    // Stub only capture in this iframe for the test, restoring immediately afterwards.
    const targets=[el('stick'),...d.querySelectorAll('[data-control]')];const capture=targets.map(t=>t.setPointerCapture);
    targets.forEach(t=>t.setPointerCapture=()=>{});
    try{
      const stick=el('stick'),r=stick.getBoundingClientRect(),x=r.left+r.width*.9,y=r.top+r.height/2;
      const before=stats();pointer(stick,'pointerdown',7,x,y);await advance(.35);
      const jump=d.querySelector('[data-control="jump"]');pointer(jump,'pointerdown',8,0,0);pointer(jump,'pointerup',8,0,0);await advance(.2);
      check('two-finger move plus jump',stats().x>before.x+65&&stats().y<before.y-30);
      pointer(stick,'pointercancel',7,x,y);await advance(.2);const stopped=stats();await advance(.2);check('cancel releases stick',Math.abs(stats().x-stopped.x)<1);
      const kick=d.querySelector('[data-control="kick"]');pointer(kick,'pointerdown',9,0,0);await advance(.1);check('touch attack starts',stats().text.includes('kick'));pointer(kick,'pointerup',9,0,0);
      pointer(stick,'pointerdown',10,x,y);w.dispatchEvent(new Event('blur'));await wait(200);check('focus loss pauses',!el('pause-menu').hidden);el('resume').click();await advance(.3);const focused=stats();await advance(.2);check('focus loss clears held movement',Math.abs(stats().x-focused.x)<1);
    } finally {targets.forEach((t,i)=>t.setPointerCapture=capture[i]);}
    el('pause').click();el('edit-look').click();await wait(100);check('appearance editor opens',!el('creator').hidden);el('cancel-look').click();await wait(100);check('cancel returns to patrol',el('creator').hidden);
    report.textContent+='COMPLETE · all input/layout checks passed.\n'+el('diagnostics').textContent;
    el('pause').click();
  }catch(error){report.textContent+='STOPPED · '+error.message+'\n'+el('diagnostics').textContent;}
  finally{for(const code of ['KeyA','KeyD','Space','ShiftLeft','KeyK','KeyJ'])key(code,false);button.disabled=false;}
};
