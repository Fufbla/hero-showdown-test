import {ClothingMenu} from '../cosmetics/menu.mjs';
import {ClothingRuntime} from '../cosmetics/runtime.mjs';
import {Game,decodeSave} from '../core.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {MenuGamepad} from '../menu-gamepad.mjs';
const $=id=>document.getElementById(id),checks=$('checks');let saved;
let game=new Game();game.hero.coins=1500;game.hero.hp=37;game.paused=true;game.visitTree();saved=game.save();
const originalInventory=JSON.stringify(game.inventory),originalStats=JSON.stringify(game.equipment);
// Test-only catalog fixture. Production availability/review/price flags are
// never modified. The actual wardrobe component and reducer run unchanged.
const runtime=new ClothingRuntime({readJSON:async path=>{const r=await fetch(new URL('../cosmetics/'+path,import.meta.url)),data=await r.json();if(path==='./catalog.json'){const set=data.sets.find(s=>s.id==='royal-kimono');set.availability='released';set.coinPrice=1000;for(const k of Object.keys(set.review))set.review[k]=true;for(const p of set.pieces)p.coinPrice=p.category==='fullbody'?500:250;}return data;}});
function report(note='Ready'){
 const unchanged=JSON.stringify(game.inventory)===originalInventory&&JSON.stringify(game.equipment)===originalStats&&game.hero.hp===37;
 checks.textContent=`${note} · ${game.hero.coins} coins · ${game.cosmetics.owned.length} clothing pieces · armor/HP ${unchanged?'unchanged':'CHANGED'} · revision ${game.cosmetics.revision}`;
}
const menu=new ClothingMenu($('clothing'),{getGame:()=>game,runtime,transaction:async action=>{
 const before=game.save(),r=action();if(!r.ok)return r;
 if($('fail').checked){game=new Game({save:decodeSave(before)});game.paused=true;report('Failed save rolled back');return {ok:false,error:'Simulated save failed. Coins and clothing restored.'};}
 saved=game.save();report('Saved in practice memory');return r;
},onChange:()=>report('Saved in practice memory')});
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>menu.open(b.dataset.mode);
$('restore').onclick=()=>{game=new Game({save:decodeSave(saved)});game.paused=true;report('Restored saved hero');menu.open('owned');};
$('controller-check').onclick=()=>{
 const pad={connected:true,mapping:'standard',axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
 const nav=new MenuGamepad({active:()=>true,getPads:()=>[pad]});nav.poll(0);const visited=new Set();
 for(let n=0;n<24;n++){pad.buttons[13].pressed=true;nav.poll(n*500+100);visited.add(document.activeElement.textContent.trim());pad.buttons[13].pressed=false;nav.poll(n*500+200);}
 report(`Simulated D-pad reached ${visited.size} controls`);
};
await prepareStyleCMaterials();report();await menu.open();
