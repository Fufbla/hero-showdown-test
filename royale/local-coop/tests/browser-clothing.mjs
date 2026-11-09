import {ClothingRuntime} from '../../cosmetics/runtime.mjs';
import {Game,decodeSave} from '../../core.mjs';

// Only imported by ?qa=1. Uses in-memory profiles from browser-harness; the
// production catalog, live coins, accounts and endpoint are never changed.
export function installClothingChecks(api,{choosePad,frames}){
 const result=api.el('pre');result.id='qa-clothing-result';
 const run=api.button('Test separate clothing purchases and save retry',async()=>{
  const checks=[],originalSaves=[];run.disabled=true;result.textContent='Checking two practice wardrobes…';
  const check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name);};
  const settle=async menu=>{for(let n=0;n<180&&menu.busy;n++)await frames(1);if(menu.busy)throw Error('Wardrobe save did not settle');await frames(2);};
  try{
   if(!api.getSession()){api.players.forEach(p=>p.ready=true);api.updateStart();await api.start();}
   const session=api.getSession();check('Two practice heroes are active',session.active.size===2&&api.players.every(p=>p.profile.identity.startsWith('automated-')));
   api.openMenu();
   const runtime=new ClothingRuntime({readJSON:async path=>{
    const response=await fetch(new URL('../../cosmetics/'+path,import.meta.url)),data=await response.json();
    if(path==='./catalog.json'){const set=data.sets.find(s=>s.id==='royal-kimono');set.availability='released';set.coinPrice=1000;Object.keys(set.review).forEach(k=>set.review[k]=true);for(const p of set.pieces)p.coinPrice=p.category==='fullbody'?500:250;}
    return data;
   }});
   for(let i=0;i<2;i++){
    const g=session.games[i],p=api.players[i];g.combatTimer=0;g.hero.dead=false;g.hero.hp=g.hero.maxHp;g.hero.attack=null;g.powers.cancelEffects();g.hero.coins=1500;
    g.cosmetics={version:1,revision:0,owned:[],equipped:{},visible:true};
    await api.act(i,'visitTree');Object.assign(p,{tab:'tree',treeSection:'wardrobe',clothingSection:'store'});api.renderPanel(i);
    const menu=p.clothingMenu;menu.runtime=runtime;await menu.open('store');
   }
   await runtime.loadIds(['royal-kimono.headwear','royal-kimono.fullbody','royal-kimono.footwear'],{review:true});await frames(3);
   const before=session.games.map(g=>JSON.stringify({inventory:g.inventory,equipment:g.equipment,hp:g.hero.hp,powers:g.powers.data}));
   let fail=true;const p0=api.players[0],save=p0.profile.save;originalSaves.push([p0.profile,save]);p0.profile.save=async function(...args){if(fail)throw Error('Simulated wardrobe acknowledgement failure');return save.apply(this,args);};
   await choosePad(0,b=>b?.textContent.startsWith('Review purchase'));await choosePad(0,b=>b?.textContent==='Confirm purchase');await settle(p0.clothingMenu);
   check('Unacknowledged purchase stays pending with a single debit',p0.clothingPending&&p0.clothingMenu.pending&&session.games[0].hero.coins===500&&session.games[0].cosmetics.owned.length===3);
   check('Player 2 wallet and wardrobe are unchanged',session.games[1].hero.coins===1500&&session.games[1].cosmetics.owned.length===0);
   api.markReady(0);api.markReady(1);check('Neither player resumes while a wardrobe save is pending',session.paused&&session.ready.every(r=>!r));
   fail=false;await choosePad(0,b=>b?.textContent==='Retry save');await settle(p0.clothingMenu);
   check('Retry acknowledges the same purchase without a second debit',!p0.clothingPending&&!p0.clothingMenu.pending&&session.games[0].hero.coins===500&&session.games[0].cosmetics.revision===1);
   for(let i=0;i<2;i++){
    if(i){await choosePad(i,b=>b?.textContent.startsWith('Review purchase'));await choosePad(i,b=>b?.textContent==='Confirm purchase');await settle(api.players[i].clothingMenu);}
    await choosePad(i,b=>b?.textContent==='Wear set');await settle(api.players[i].clothingMenu);
    check(`Controller ${i+1} equips its own three pieces`,Object.keys(session.games[i].cosmetics.equipped).length===3&&session.games[i].hero.coins===500);
   }
   await api.saveAll();
   for(let i=0;i<2;i++){
    const g=session.games[i],p=api.players[i],snapshot=p.profile.slots.find(r=>r.slot_number===p.slot).snapshot,restored=new Game({save:decodeSave(JSON.stringify(snapshot))});
    check(`Player ${i+1} restores its own clothing and wallet`,JSON.stringify(restored.cosmetics)===JSON.stringify(g.cosmetics)&&restored.hero.coins===500);
    check(`Player ${i+1} armor, health and powers stay unchanged`,JSON.stringify({inventory:g.inventory,equipment:g.equipment,hp:g.hero.hp,powers:g.powers.data})===before[i]);
   }
   result.textContent=JSON.stringify({passed:true,checks,scope:'Practice profiles; simulated controller input; no cloud or physical-controller verification.'},null,2);
  }catch(error){result.textContent=JSON.stringify({passed:false,error:error.message,checks},null,2);}
  finally{for(const [profile,save] of originalSaves)profile.save=save;run.disabled=false;}
 });
 document.getElementById('qa-tools').append(run,result);
}
