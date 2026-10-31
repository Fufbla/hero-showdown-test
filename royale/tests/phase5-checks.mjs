import { BOSSES } from '../boss-data.mjs';
import { BossArt } from '../boss-art.mjs';
import { makeBoss, arenaSurfaces } from '../bosses.mjs';
import { PROFILE_KEY } from '../saves.mjs';
import { saveBossFixture, fixtureCommand } from './boss-fixture.mjs';
const $=id=>document.getElementById(id),frame=$('boss-frame'),report=$('report'),archive=$('suite-log'),run=$('run-boss-checks');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const until=async fn=>{const end=Date.now()+120000;while(!fn()){if(Date.now()>end)throw Error('Browser UI timed out');await wait(40);}};
run.onclick=async()=>{
  run.disabled=true;archive.textContent='';let passed=0;
  const check=(name,ok)=>{const line=`${ok?'PASS':'FAIL'} · ${name}\n`;archive.textContent+=line;report.textContent=archive.textContent.slice(-3600);if(!ok)throw Error(name);passed++;};
  try{
    const art=new BossArt(),canvas=document.createElement('canvas');canvas.width=620;canvas.height=440;const c=canvas.getContext('2d',{willReadFrequently:true}),hashes=[];
    for(let region=1;region<=7;region++){
      art.prepare(region);await art.whenLoaded;const b=makeBoss(region,arenaSurfaces()[0]);b.x=310;b.y=420;art.step(b,0,1/60,b.x-100);c.clearRect(0,0,620,440);art.draw(c,b,{time:0,alpha:1});
      const pixels=c.getImageData(0,0,620,440).data;let ink=0,hash=2166136261;for(let i=0;i<pixels.length;i+=4){if(pixels[i+3])ink++;hash=Math.imul(hash^pixels[i],16777619);}
      hashes.push(hash);check(`${BOSSES[region].name}: artwork loads, renders and labels temporary art correctly`,art.ready&&art.errors.length===0&&ink>100&&art.inspect(b).temporary===(BOSSES[region].art==='temporary'));
    }
    check('all seven bosses render distinct silhouettes',new Set(hashes).size===7);
    for(const [width,height] of [[390,844],[844,390],[320,568],[768,1024],[1280,800]])for(let region=1;region<=7;region++){
      const label=`${width}×${height} · ${BOSSES[region].name}`,session=`boss-checks-${Date.now()}-${region}`,key=`royale-test-${session}:${PROFILE_KEY}`;
      report.textContent=`Running ${label}…`;frame.style.width=width+'px';frame.style.height=height+'px';saveBossFixture(session,region,['brawler','ranged','control'][(region-1)%3],region>2);
      let d,w,el;
      const data=()=>JSON.parse(sessionStorage.getItem(key)).slots[0].snapshot;
      const attach=async()=>{d=frame.contentDocument;w=frame.contentWindow;el=id=>d.getElementById(id);await until(()=>d.querySelector('[data-action="continue"]'));d.querySelector('[data-action="continue"]').click();frame.focus();await until(()=>!el('boss-hud').hidden&&!el('boss-cue').textContent.includes('Loading'));};
      const inside=n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=-1&&r.right<=w.innerWidth+1&&r.top>=-1&&r.bottom<=w.innerHeight+1;};
      const tap=code=>{for(const type of ['keydown','keyup'])d.body.dispatchEvent(new w.KeyboardEvent(type,{code,key:code,bubbles:true,cancelable:true}));};
      const command=(action,value)=>fixtureCommand(frame,action,value);
      await new Promise(r=>{frame.onload=r;frame.src=`../?qa=1&touch=1&testSession=${session}`;});await attach();
      check(`${label}: immediate full-HP boss and recommended-level hero`,Number(el('boss-health').getAttribute('aria-valuenow'))===BOSSES[region].hp&&el('level').textContent===String(BOSSES[region].level));
      check(`${label}: boss bar, HP and XP fit without overlap`,inside(el('boss-hud'))&&inside(el('hp-text'))&&inside(el('xp-text'))&&el('boss-hud').getBoundingClientRect().top>=el('xp-text').getBoundingClientRect().bottom);
      check(`${label}: three power buttons and touch controls fit`,d.querySelectorAll('.power-button').length===3&&[...d.querySelectorAll('.power-button')].every(inside)&&inside(el('stick'))&&inside(d.querySelector('[data-control="jump"]')));
      el('pause').click();check(`${label}: saving, Tree and checkpoint escape blocked`,el('manual-save').disabled&&el('tree-from-pause').disabled&&el('return-camp').disabled);
      el('open-map').click();check(`${label}: all pause map travel blocked`,[...d.querySelectorAll('[data-travel]')].every(n=>n.disabled));el('map-close').click();el('resume').click();
      await command('hurt-hero');const hp=(await command('status')).hp,root=el('health-root'),capture=root.setPointerCapture;root.setPointerCapture=()=>{};for(const type of ['pointerdown','pointerup'])root.dispatchEvent(new w.PointerEvent(type,{pointerId:99,pointerType:'touch',bubbles:true,cancelable:true}));root.setPointerCapture=capture;await until(()=>el('root-count').textContent==='3');
      let state=await command('status');check(`${label}: touch Health Root heals during battle`,state.hp>hp&&state.roots===3);
      el('pause').click();await command('phase',2);check(`${label}: Phase 2 HUD updates immediately`,el('boss-hud').dataset.phase==='2'&&Number(el('boss-health').getAttribute('aria-valuenow'))===BOSSES[region].hp*.5);
      await command('wave');state=await command('status');check(`${label}: Phase 3 wave has exactly three helpers`,state.waves===1&&state.helpers===3&&el('boss-hud').dataset.phase==='3');
      await command('boss-down');state=await command('status');check(`${label}: boss down with helpers does not unlock or reward`,state.active&&state.helpers===3&&state.coins===200&&state.wins===0&&el('boss-phase').textContent==='3 HELPERS REMAIN');
      await command('helpers-down');state=await command('status');check(`${label}: clearing arena awards first victory and unlock`,state.cleared&&!state.active&&state.wins===1&&state.coins===300&&state.chest==='available'&&(region===7||state.unlocked.includes(region+1)));
      check(`${label}: victory is persisted with full arena cleared`,data().arena.mode==='cleared'&&data().bossProgress.records[region].wins===1);
      await command('full-inventory');await command('at-chest');el('resume').click();tap('KeyE');await command('step',1);await until(()=>!el('chest-menu').hidden);
      check(`${label}: chest previews rewards beside seven owned items`,el('chest-contents').querySelectorAll('article').length>=1&&el('chest-owned').querySelectorAll('p').length===7);
      check(`${label}: chest controls, HP and XP remain usable`,inside(el('chest-close'))&&inside(el('collect-chest'))&&inside(el('hp-text'))&&inside(el('xp-text'))&&d.documentElement.scrollWidth===width);
      if(region<4)check(`${label}: no rare equipment in early-region chest`,el('chest-contents').querySelectorAll('.rare').length===0);
      el('collect-chest').click();check(`${label}: equipment waits for choice and never exceeds seven`,!el('inventory-menu').hidden&&data().inventory.items.length===7&&data().inventory.pending.length>=1);
      const old=data().inventory.items[0].uid;d.querySelector(`[data-item="${old}"] button`).click();check(`${label}: replacement shows stat comparison and asks confirmation`,!el('equipment-confirm').hidden&&el('equipment-confirm').querySelectorAll('td').length===16&&data().inventory.items[0].uid===old);
      el('cancel-equipment').click();check(`${label}: cancel preserves owned and pending equipment`,data().inventory.items[0].uid===old&&data().inventory.pending.length>=1);
      d.querySelector(`[data-item="${old}"] button`).click();el('confirm-equipment').click();check(`${label}: confirmed replacement enforces seven slots`,data().inventory.items.length===7&&!data().inventory.items.some(i=>i.uid===old));
      while(data().inventory.pending.length){el('discard-reward').click();el('confirm-equipment').click();}
      el('inventory-close').click();const coins=data().coins,look=JSON.stringify(data().look);el('manual-save').click();await new Promise(r=>{frame.onload=r;w.location.reload();});await attach();state=await command('status');
      check(`${label}: reload keeps wins, claimed chest, coins and appearance`,state.wins===1&&state.chest==='claimed'&&state.coins===coins&&state.items===7&&JSON.stringify(data().look)===look&&!el('boss-hud').hidden);
      await command('retreat');check(`${label}: walking exit returns to exploration`,!(await command('status')).boss);
      archive.textContent+=`DONE · ${label}\n`;
    }
    report.textContent=`COMPLETE · ${passed} Phase 5 browser assertions passed. Seven bosses × five viewports. Synthetic browser checks, not physical devices. Full log below.`;
  }catch(error){report.textContent+=`\nSTOPPED · ${error.message}\n${frame.contentDocument?.getElementById('diagnostics')?.textContent||''}`;archive.textContent+=report.textContent;}
  finally{run.disabled=false;}
};
