import {PROFILE_KEY} from '../saves.mjs';
const frame=document.querySelector('iframe'),report=document.querySelector('#report'),log=document.querySelector('#log');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){const end=Date.now()+45000;while(!fn()){if(Date.now()>end)throw Error(label);await wait(40);}}
async function load(w,h){
 frame.width=w;frame.height=h;const session='final-mobile-'+Date.now()+'-'+w,key='royale-test-'+session+':'+PROFILE_KEY;
 await new Promise(r=>{frame.onload=r;frame.src='../?touch=1&qa=1&testSession='+session;});
 const d=frame.contentDocument;await until(()=>d.querySelector('[data-action=create]')&&d.querySelector('#hero-art-status').hidden,'Hero artwork or roster did not load');
 return {d,w:frame.contentWindow,key};
}
const inside=(el,w)=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&r.x>=-1&&r.y>=-1&&r.right<=w.innerWidth+1&&r.bottom<=w.innerHeight+1;};
const separate=(a,b)=>{a=a.getBoundingClientRect();b=b.getBoundingClientRect();return a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top;};
document.querySelector('#create').onclick=async()=>{const [w,h]=document.querySelector('#size').value.split(',').map(Number);const f=await load(w,h);f.d.querySelector('[data-action=create]').click();report.textContent=JSON.stringify({viewport:[w,h],previewVisible:inside(f.d.querySelector('#hero-preview'),f.w),beginVisible:inside(f.d.querySelector('#begin'),f.w)},null,2);};
document.querySelector('#run').onclick=async()=>{
 const run=document.querySelector('#run');run.disabled=true;log.textContent='';let checks=0;
 const check=(name,ok)=>{log.textContent+=(ok?'PASS ':'FAIL ')+name+'\n';if(!ok)throw Error(name);checks++;};
 try{for(const [width,height] of [[568,320],[667,375],[844,390],[932,430],[1024,768]]){
  report.textContent=`Testing ${width} × ${height} · ${checks} passed`;
  let f=await load(width,height),{d,w,key}=f;const el=id=>d.getElementById(id);
  const select=(id,value)=>{el(id).value=value;el(id).dispatchEvent(new w.Event('change',{bubbles:true}));};
  check(`${width}: roster has no horizontal overflow`,d.documentElement.scrollWidth===width);
  d.querySelector('[data-action=create]').click();
  check(`${width}: creator preview remains visible`,inside(el('hero-preview'),w));
  check(`${width}: Begin and Back remain visible`,inside(el('begin'),w)&&inside(el('cancel-look'),w));
  for(const sex of ['male','female']){select('presentation',sex);check(`${width}: no animation selector`,!el('preview-pose'));for(const view of ['front','back','side','left']){el('view-'+view).click();check(`${width}: ${sex} ${view} idle preview`,el('hero-preview').getAttribute('aria-label').endsWith('Idle'));}}
  el('name').value='Landscape '+width;el('name').dispatchEvent(new w.Event('input',{bubbles:true}));
  el('tab-body').click();select('build','strong');el('tab-suit').click();select('emblem','shield');el('begin').click();
  await until(()=>d.body.classList.contains('playing'),'Patrol did not start');await wait(150);
  const controls=[el('stick'),...d.querySelectorAll('.action-buttons button'),...d.querySelectorAll('.compact-power-slot:not([hidden])')];
  check(`${width}: all main controls inside viewport`,controls.every(n=>inside(n,w)));
  check(`${width}: main controls never overlap`,controls.every((a,i)=>controls.slice(i+1).every(b=>separate(a,b))));
  check(`${width}: power selection targets are at least 44px`,[...d.querySelectorAll('.slot-select')].every(n=>n.getBoundingClientRect().height>=44));
  check(`${width}: HUD and canvas fit`,inside(el('game'),w)&&inside(el('hp-text'),w)&&inside(el('xp-text'),w)&&d.documentElement.scrollWidth===width);
  el('pause').click();check(`${width}: pause actions are reachable`,inside(el('resume'),w)&&inside(el('manual-save'),w));
  el('open-controls').click();
  for(const id of ['touch-size','touch-stickSize']){el(id).value=el(id).max;el(id).dispatchEvent(new w.Event('input',{bubbles:true}));}
  el('close-controls').click();el('resume').click();
  check(`${width}: largest control sizes remain on screen`,controls.every(n=>inside(n,w)));
  check(`${width}: largest control sizes do not overlap`,controls.every((a,i)=>controls.slice(i+1).every(b=>separate(a,b))));
  el('pause').click();
  el('tree-from-pause').click();await until(()=>el('close-tree').getBoundingClientRect().width>0,'Tree transition did not finish');check(`${width}: Tree exit remains visible`,inside(el('close-tree'),w));
  d.querySelector('[data-eris=wardrobe]').click();check(`${width}: wardrobe stays within viewport`,inside(el('gear-preview'),w)&&inside(el('close-tree'),w)&&d.documentElement.scrollWidth===width);
  el('close-tree').click();await until(()=>d.body.classList.contains('playing'),'Tree return did not finish');el('pause').click();el('manual-save').click();
  const saved=JSON.parse(sessionStorage.getItem(key)).slots[0].snapshot;
  check(`${width}: customization saved`,saved.look.name==='Landscape '+width&&saved.look.presentation==='female'&&saved.look.build==='strong'&&saved.look.emblem==='shield');
  const url=frame.src;await new Promise(r=>{frame.onload=r;frame.src=url;});d=frame.contentDocument;w=frame.contentWindow;
  await until(()=>d.querySelector('[data-action=continue]'),'Reload did not restore hero');d.querySelector('[data-action=continue]').click();
  check(`${width}: reload restores hero and stats`,d.querySelector('#hero-name').textContent==='Landscape '+width&&JSON.parse(sessionStorage.getItem(key)).slots[0].snapshot.look.emblem==='shield');
 }
 report.textContent=`COMPLETE · ${checks} checks passed across five landscape viewports.`;
 }catch(e){report.textContent=`FAIL · ${e.message}\n${checks} checks passed.`;}finally{run.disabled=false;}
};
