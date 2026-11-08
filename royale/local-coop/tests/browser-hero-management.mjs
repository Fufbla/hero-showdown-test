import {selectableItems,spatialTarget} from '../../spatial-navigation.mjs';
export function installHeroChecks(api,{pulse,frames}){
 const $=id=>document.getElementById(id),out=api.el('pre');out.id='qa-hero-result';
 const run=api.button('Test hero creation and deletion with simulated controllers',async()=>{
  if(api.getSession()){out.textContent='Reload the practice page before running setup checks.';return;}
  run.disabled=true;const checks=[],check=(name,value)=>{if(!value)throw Error(name);checks.push(name);};
  const chooseSetup=async(i,predicate)=>{
   const trace=[];for(let n=0;n<35;n++){const controls=[...api.players[i].card.querySelectorAll('button,select,input')].filter(n=>!n.disabled&&n.getClientRects().length);const active=controls.find(n=>n.classList.contains('controller-focus')); trace.push([api.players[i].focus,active?.textContent]);if(predicate(active)){await pulse(i,0);return;}await pulse(i,13);}throw Error('Setup control is unreachable: '+JSON.stringify(trace));
  };
  const chooseDialog=async(i,predicate)=>{
   // Find a path through the actual spatial navigator, then send Gamepad API
   // button edges for every step. No click(), focus(), or menu action shortcut.
   const scope=api.manager.nav.scope(),items=selectableItems(scope),start=document.activeElement,target=items.find(predicate);if(!target)throw Error('Missing dialog control');
   const queue=[[start,[]]],seen=new Set([start]);let path;
   while(queue.length){const [from,steps]=queue.shift();if(from===target){path=steps;break;}for(const [dir,key] of [['up',12],['down',13],['left',14],['right',15]]){const next=$('hero-editor').open&&!api.manager.entry.current&&['up','down'].includes(dir)?items[(items.indexOf(from)+items.length+(dir==='down'?1:-1))%items.length]:spatialTarget(from,items,dir);if(next&&!seen.has(next)){seen.add(next);queue.push([next,[...steps,key]]);}}}
   if(!path)throw Error('Dialog control unreachable: '+target.textContent);
   for(const key of path)await pulse(i,key);await pulse(i,0);
  };
  try{
   for(let i=0;i<2;i++){
    const p=api.players[i],before=JSON.stringify(p.profile.slots[0]);
    await chooseSetup(i,b=>b?.textContent==='Slot 2 · Create New Hero');check(`Player ${i+1} opens full existing creator`, $('hero-editor').open&&api.manager.owner===i);
    const tabBefore=$('tab-identity').getAttribute('aria-selected');await pulse(1-i,5);check(`Other controller cannot alter Player ${i+1} creator`,$('tab-identity').getAttribute('aria-selected')===tabBefore);
    await chooseDialog(i,b=>b.id==='tab-face');check(`Player ${i+1} can navigate character tabs`,$('tab-face').getAttribute('aria-selected')==='true');
    await chooseDialog(i,b=>b.id==='begin');await frames(5);check(`Player ${i+1} creates and saves hero in Slot 2`,!!p.profile.slots[1].snapshot&&!$('hero-editor').open);
    check(`Player ${i+1} original hero is unchanged`,JSON.stringify(p.profile.slots[0])===before);
    const created=JSON.stringify(p.profile.slots[1]);
    await chooseSetup(i,b=>b?.getAttribute('aria-label')?.includes(`Player ${i+1} Slot 2`)&&b.textContent==='Delete Hero');check(`Player ${i+1} sees named deletion confirmation`,$('hero-delete').open&&$('delete-description').textContent.includes(p.profile.slots[1].snapshot.look.name));
    await pulse(i,1);check(`Player ${i+1} Back cancels deletion`,!$('hero-delete').open&&JSON.stringify(p.profile.slots[1])===created);
    await chooseSetup(i,b=>b?.getAttribute('aria-label')?.includes(`Player ${i+1} Slot 2`)&&b.textContent==='Delete Hero');
    await chooseDialog(i,b=>b.id==='confirm-hero-delete');await frames(5);
    check(`Player ${i+1} explicit confirmation removes disposable hero`,p.profile.slots[1].snapshot===null&&!$('hero-delete').open);
    check(`Player ${i+1} other slots remain intact`,JSON.stringify(p.profile.slots[0])===before&&p.profile.slots[2].snapshot===null);
   }
   await chooseSetup(0,b=>b?.textContent==='Ready');await chooseSetup(1,b=>b?.textContent==='Ready');await pulse(0,13);await pulse(0,0);await frames(5);check('Both controllers can Ready and start without a mouse',!!api.getSession());
   out.textContent=JSON.stringify({passed:true,checks,physicalControllers:false,cloud:'Simulated profiles only; live account tests are separate.'},null,2);
  }catch(e){out.textContent=JSON.stringify({passed:false,error:e.message,checks},null,2);}finally{run.disabled=false;}
 });$('qa-tools').append(run,out);

}
