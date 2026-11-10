// Clothing Store UI. All mutations wait for a V3 cloud-save acknowledgment.
import {catalogIndex,cosmeticTransaction,saleReady,normalizeCosmetics} from './cosmetics/state.mjs';
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
let index=null,sets=[],rerender=()=>{},message=null,busy=false;
const status=()=>{let snapshot=null;window.dispatchEvent(new CustomEvent('royale-clothing-snapshot-request',{detail:{receive(v){snapshot=v;}}}));return snapshot;};
async function action(operation){
 if(busy)return;
 const state=status();if(!state?.ready){message.textContent=state?.reason||'Please load your hero through V3 Cloud Login to buy or equip clothing.';return;}
 busy=true;message.textContent='Waiting for permanent V3 cloud confirmation…';
 try{
  const result=await new Promise(resolve=>window.dispatchEvent(new CustomEvent('royale-clothing-operation',{detail:{operation,receive:resolve}})));
  if(!result?.ok){message.textContent=result?.error||'Clothing transaction was not saved. Coins and ownership are unchanged.';return;}
  message.textContent=result.cloudConfirmed?'Cloud saved successfully. Your clothing is now owned by this hero.':'Transaction not confirmed.';
  rerender();
 }catch(e){message.textContent=e.message||'Cannot save clothing.';}
 finally{busy=false;}
}
function btn(text,fn,disabled=false){
 const e=node('button',text);e.type='button';e.className='secondary';e.disabled=disabled||busy;e.onclick=fn;return e;
}
function purchase(id,name,price){
 if(!window.confirm('Buy '+name+' for '+price+' coins? This purchase is permanent for this hero.'))return;
 void action({type:'purchase',id,confirmed:true});
}
export function initializeStoreActions(catalog,render,holder){
 sets=catalog;index=catalogIndex({sets:catalog});rerender=render;
 if(!message){message=node('p');message.className='clothing-purchase-status';message.setAttribute('role','status');holder.prepend(message);}
 window.addEventListener('royale-clothing-updated',()=>rerender());
 // Re-evaluate button eligibility when the selected hero enters the Tree of Eris.
 window.addEventListener('royale-clothing-context-updated',()=>rerender());
}
export function storeControls(set){
 const wrap=node('div');wrap.className='clothing-store-controls';
 const state=status();
 const current=normalizeCosmetics(state?.cosmetics);
 const ready=!!state?.ready,coins=state?.coins??0;
 const owned=new Set(current?.owned||[]);
 const allOwned=set.pieces.every(p=>owned.has(p.id));
 const quote=current?cosmeticTransaction({state:current,coins,index,operation:{type:'purchase',id:set.id,confirmed:true,revision:current.revision},safe:true,atWardrobe:true}):null;
 if(allOwned){
  wrap.append(node('strong','Owned · complete set'));
  wrap.append(btn('Wear complete outfit',()=>void action({type:'equip',id:set.id}),!ready));
 }else{
  const cost=quote?.ok?quote.debit:set.coinPrice;
  wrap.append(btn('Buy outfit · '+cost+' coins',()=>purchase(set.id,set.name,cost),!ready||!saleReady(set)||!quote?.ok));
  if(ready&&!quote?.ok&&quote?.error)wrap.append(node('small',quote.error));
 }
 const details=node('details');details.append(node('summary','Buy or wear individual pieces'));
 for(const piece of set.pieces){
  const line=node('div');line.className='clothing-piece-action';
  const pieceName=piece.category.replace(/([A-Z])/g,' $1');
  line.append(node('span',pieceName));
  if(owned.has(piece.id)){
   line.append(btn('Wear',()=>void action({type:'equip',id:piece.id}),!ready));
   if(current?.equipped?.[piece.category]===piece.id)line.append(btn('Remove',()=>void action({type:'unequip',slot:piece.category}),!ready));
  }else{
   const q=current?cosmeticTransaction({state:current,coins,index,operation:{type:'purchase',id:piece.id,confirmed:true,revision:current.revision},safe:true,atWardrobe:true}):null;
   line.append(btn('Buy · '+piece.coinPrice,()=>purchase(piece.id,set.name+' '+pieceName,piece.coinPrice),!ready||!q?.ok||!saleReady(index.get(piece.id))));
  }
  details.append(line);
 }
 wrap.append(details);
 if(!ready)wrap.append(node('small',state?.reason||'Waiting for a verified V3 cloud session. Your fitting room remains free to use.'));
 else wrap.append(node('small','Coins: '+coins.toLocaleString()+' · Purchases save before being confirmed.'));
 return wrap;
}
export function myClothingPanel(holder){
 const state=status(),owned=new Set(state?.cosmetics?.owned||[]);
 let panel=holder.querySelector('.clothing-owned-summary');
 if(!panel){panel=node('section');panel.className='clothing-owned-summary';holder.prepend(panel);}
 panel.replaceChildren(node('h4','My Clothing · '+owned.size+' pieces'));
 if(!state?.ready){
  const hint=node('p',state?.reason||'Preview mode. To buy and save clothing across devices, launch your hero from V3 Cloud Login.');
  const link=node('a','Open V3 Cloud Login');link.href='../royale-v3-staging/';hint.append(' ',link);panel.append(hint);
 }else if(!owned.size)panel.append(node('p','No clothing purchased yet. Try on any outfit for free, then buy when ready.'));
 else panel.append(node('p','Owned pieces stay attached to this cloud hero. Use Wear or Remove on an outfit card to change your look.'));
}
