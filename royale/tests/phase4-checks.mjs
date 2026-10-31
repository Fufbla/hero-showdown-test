import {CONTROL_KEY} from '../controls.mjs';
import {Game} from '../core.mjs';
import {bossVictory,CLOCK} from '../progression.mjs';
import {createEquipment,equipmentOutfit} from '../equipment.mjs';
import {PROFILE_KEY} from '../saves.mjs';
import {WORLD_REGIONS,TYPES} from '../world.mjs';
import {drawNewMonster} from '../world-art.mjs';
import {drawHero} from '../hero-art.mjs';
import {previewHero} from '../hero-rig.mjs';
const frame=document.getElementById('phone'),report=document.getElementById('report'),button=document.getElementById('test-world');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
button.onclick=async()=>{
  button.disabled=true;report.textContent='Running Phase 4 world / economy / save / rendering checks…\n';let passed=0;
  const check=(label,ok)=>{report.textContent+=`${ok?'PASS':'FAIL'} · ${label}\n`;if(!ok)throw Error(label);passed++;};
  const until=async fn=>{const end=Date.now()+120000;while(!fn()){if(Date.now()>end)throw Error('UI timed out');await wait(35);}};
  const session=`world-${Date.now()}`,prefix=`royale-test-${session}:`,g=new Game({look:{name:'Seven Region Tester',suit:'#345f71'}});
  for(let i=1;i<4;i++)bossVictory(g.world,i);g.travel(4);g.hero.level=65;g.hero.maxHp=1060;g.hero.hp=500;g.hero.coins=150;g.healthRoots=2;g.world.clockReference=Date.now()-CLOCK.day-60000;
  for(let i=0;i<7;i++)g.inventory.items.push(createEquipment(4,'rare',i,i+1));g.inventory.pending=[createEquipment(4,'ordinary',0,8)];g.inventory.nextId=9;
  const snapshot=JSON.parse(g.save());sessionStorage.setItem(prefix+PROFILE_KEY,JSON.stringify({version:2,revision:0,activeSlot:0,legacyImported:true,slots:[{id:'world-ui-fixture',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastRegion:'Toxic Underground',snapshot},null,null]}));
  sessionStorage.setItem(prefix+CONTROL_KEY,JSON.stringify({keys:{power0:['KeyH']},pad:{power0:11}}));
  let d,w,el;
  const attach=async()=>{d=frame.contentDocument;w=frame.contentWindow;el=id=>d.getElementById(id);await until(()=>d.querySelector('[data-action="continue"]'));frame.focus();};
  const data=()=>JSON.parse(sessionStorage.getItem(prefix+PROFILE_KEY)).slots[0].snapshot;
  const inside=n=>{const r=n.getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=-1&&r.right<=w.innerWidth+1&&r.top>=-1&&r.bottom<=w.innerHeight+1;};
  const time=()=>Number(el('diagnostics').textContent.match(/ · t ([\d.]+)/)?.[1]);
  const advance=async seconds=>{await until(()=>Number.isFinite(time()));const start=time();await until(()=>time()-start>=seconds);};
  const tap=code=>{for(const type of ['keydown','keyup'])d.body.dispatchEvent(new w.KeyboardEvent(type,{code,key:code,bubbles:true,cancelable:true}));};
  try{
    await new Promise(resolve=>{frame.onload=resolve;frame.src=`../?qa=1&touch=1&testSession=${session}`;});await attach();d.querySelector('[data-action="continue"]').click();
    await until(()=>!el('inventory-menu').hidden);check('pending equipment survives reload and opens reward selection',!el('pending-reward').hidden&&data().inventory.items.length===7);
    check('equipment screen keeps HP and XP visible',inside(el('hp-text'))&&inside(el('xp-text'))&&inside(el('inventory-close')));
    const old=data().inventory.items[0].uid;d.querySelector(`[data-item="${old}"] button`).click();check('replacement shows exact stat comparison',!el('equipment-confirm').hidden&&el('equipment-confirm').querySelectorAll('td').length===16&&data().inventory.pending.length===1);
    el('cancel-equipment').click();check('cancel replacement changes nothing',data().inventory.items[0].uid===old&&data().inventory.pending.length===1);
    d.querySelector(`[data-item="${old}"] button`).click();el('confirm-equipment').click();check('confirmed replacement keeps seven carried items',data().inventory.items.length===7&&data().inventory.pending.length===0&&!data().inventory.items.some(i=>i.uid===old));
    const rare=data().inventory.items[1].uid;d.querySelector(`[data-item="${rare}"] button`).click();check('rare equipment equips and persists',Object.values(data().inventory.equipped).includes(rare));
    d.querySelector(`[data-item="${rare}"] .text-button`).click();check('ordinary discard also requires confirmation',!el('equipment-confirm').hidden&&data().inventory.items.length===7);el('cancel-equipment').click();
    check('inventory has no horizontal overflow',d.documentElement.scrollWidth===w.innerWidth);
    el('inventory-close').click();el('resume').click();await advance(.2);check('Health Root button fits beside persistent vitals',inside(el('health-root'))&&inside(el('hp-text'))&&inside(el('xp-text'))&&el('health-root').getBoundingClientRect().left>=d.querySelector('.hero-hud').getBoundingClientRect().right);
    tap('Key'+el('health-root').querySelector('kbd').textContent);await advance(.2);check('Health Root restores 25% HP immediately',el('hp-text').textContent==='765 / 1060'&&el('root-count').textContent==='1');const rootButton=el('health-root'),capture=rootButton.setPointerCapture;rootButton.setPointerCapture=()=>{};for(const type of ['pointerdown','pointerup'])rootButton.dispatchEvent(new w.PointerEvent(type,{pointerId:77,pointerType:'touch',bubbles:true,cancelable:true}));rootButton.setPointerCapture=capture;await advance(.2);check('second Root works through touch without cooldown',el('hp-text').textContent==='1030 / 1060'&&el('root-count').textContent==='0');
    el('pause').click();el('open-controls').click();check('existing H and button 11 mappings survive Root control migration',d.querySelector('[data-map=power0]').textContent==='H'&&d.querySelector('[data-map=heal]').textContent!=='H'&&d.querySelector('select[aria-label="Health Root controller button"]').value!=='11');el('close-controls').click();el('tree-from-pause').click();check('remote Tree opens without changing region or location',!el('tree-menu').hidden&&data().world.region===4&&data().world.location.x===160);
    d.querySelector('.eris-nav [data-eris="roots"]').click();el('buy-root').scrollIntoView({block:'nearest'});check('Root purchase fits small screens',inside(el('buy-root'))&&inside(el('close-tree')));el('buy-root').click();el('confirm-roots').click();check('Root purchase costs 50 and persists',data().coins===100&&data().healthRoots===1);el('buy-root').click();el('confirm-roots').click();el('buy-root').click();el('confirm-roots').click();check('insufficient coins disable purchasing',data().coins===0&&data().healthRoots===3&&el('buy-root').disabled);
    const before=el('world-clock').textContent,pausedTime=time();await until(()=>el('world-clock').textContent!==before);check('clock advances while at Tree',time()===pausedTime);
    el('close-tree').click();el('pause').click();el('open-map').click();check('world map contains all seven regions',d.querySelectorAll('.region-card').length===7);check('all regular regions are open',[1,2,3,4,5,6,7].every(id=>!d.querySelector(`[data-travel="${id}"]`).disabled));
    for(const region of WORLD_REGIONS){const b=d.querySelector(`[data-travel="${region.id}"]`);b.scrollIntoView({block:'nearest'});check(`${region.name} card is reachable`,inside(b));}
    d.querySelector('[data-travel="3"]').click();await advance(.2);check('fast travel lands at safe destination camp',data().world.region===3&&data().world.location.x===160&&data().world.checkpoint.region===3);
    check('shared-clock countdown visible in Region 3',!el('world-clock').hidden);
    tap('KeyJ');await advance(.2);el('pause').click();check('combat disables safe saving, Tree and checkpoint return',el('tree-from-pause').disabled&&el('return-camp').disabled&&el('safe-save-note').textContent.includes('locked'));
    el('open-map').click();check('combat disables all map travel',[...d.querySelectorAll('[data-travel]')].every(b=>b.disabled));el('map-close').click();el('resume').click();await advance(5.3);el('pause').click();el('open-map').click();
    d.querySelector('[data-travel="1"]').click();await advance(.2);check('unlocked backward travel works and Coast remains daytime',data().world.region===1&&el('world-clock').hidden);
    el('pause').click();const clockReference=data().world.clockReference,look=data().look;await new Promise(resolve=>{frame.onload=resolve;w.location.reload();});await attach();d.querySelector('[data-action="continue"]').click();await advance(.2);
    check('reload preserves appearance, roots, gear, clock and world history',JSON.stringify(data().look)===JSON.stringify(look)&&data().healthRoots===3&&data().inventory.items.length===7&&data().world.clockReference===clockReference&&data().world.unlocked.join(',')==='1,2,3,4,5,6,7');el('pause').click();
    // Canvas fingerprints cover each new silhouette and its instantaneous yellow-eye change.
    const canvas=document.createElement('canvas');canvas.width=220;canvas.height=220;const c=canvas.getContext('2d',{willReadFrequently:true});
    const fingerprint=(type,night=false)=>{c.clearRect(0,0,220,220);c.save();c.translate(110,190);drawNewMonster(c,{type,id:0,state:'patrol',flash:0},TYPES[type],.3,night);c.restore();const pixels=c.getImageData(0,0,220,220).data;let hash=2166136261,yellow=0;for(let i=0;i<pixels.length;i+=4){hash=Math.imul(hash^pixels[i],16777619);if(pixels[i]>235&&pixels[i+1]>210&&pixels[i+2]<100&&pixels[i+3]>100)yellow++;}return {hash,yellow};};
    const signatures=[];for(const [type,info] of Object.entries(TYPES).filter(([,info])=>info.region>1)){const day=fingerprint(type),night=fingerprint(type,true);check(`${info.name} has distinct art and yellow night eyes`,day.hash!==night.hash&&night.yellow>day.yellow);signatures.push(day.hash);}check('all 18 new species have different silhouettes',new Set(signatures).size===18);
    const full=equipmentOutfit({items:[createEquipment(4,'rare',1,1)],equipped:{suit:'drop-1'}});const whitePixels=(time,pose)=>{c.clearRect(0,0,220,220);drawHero(c,110,190,g.look,{...previewHero(pose,time),invulnerable:1},time,1,{outfit:full});const px=c.getImageData(0,0,220,220).data;let whites=0;for(let i=0;i<px.length;i+=4)if(px[i]===255&&px[i+1]===255&&px[i+2]===255&&px[i+3]>120)whites++;return whites;};
    check('rare white outline stays bright through idle, run and combat hit-flashes',['idle','run','punch','kick'].every(p=>whitePixels(.01,p)>0&&whitePixels(.12,p)>0));
    report.textContent+=`COMPLETE · ${passed} Phase 4 checks passed at ${w.innerWidth} × ${w.innerHeight}.\nSynthetic browser checks, not physical-device certification.\n`;
  }catch(error){report.textContent+=`STOPPED · ${error.message}\n${el?.('diagnostics')?.textContent||''}`;}
  finally{button.disabled=false;}
};

const matrix=document.getElementById('test-world-all');
matrix.onclick=async()=>{
  matrix.disabled=true;const archive=document.getElementById('world-suite-log');archive.textContent='';let ok=true;
  for(const viewport of ['portrait','landscape','small','tablet','desktop']){
    document.getElementById(viewport).click();matrix.textContent=`Phase 4 · ${viewport}`;await button.onclick();
    const result=report.textContent;archive.textContent+=`\n${viewport}\n${result}\n`;
    if(!result.includes('COMPLETE')||result.includes('FAIL')||result.includes('STOPPED')){ok=false;break;}
  }
  matrix.disabled=false;matrix.textContent='Run Phase 4 at all sizes';if(ok)report.textContent='COMPLETE · Phase 4 passed at all five viewport sizes.\n'+archive.textContent;
};
