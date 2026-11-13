// Clothing Store UI. All mutations wait for a V3 cloud-save acknowledgment.
import {saleReady,normalizeCosmetics,ownsOutfit,selectedOutfit,quoteOutfit} from '../../royale/cosmetics/state.mjs';
const node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
let sets=[],rerender=()=>{},message=null,busy=false;
const status=()=>{let snapshot=null;window.dispatchEvent(new CustomEvent('royale-clothing-snapshot-request',{detail:{receive(v){snapshot=v;}}}));return snapshot;};
async function action(operation){
 if(busy)return;
 const state=status();if(!state?.ready){message.textContent=state?.reason||'Please load your hero through V3 Cloud Login to buy or equip clothing.';return;}
 busy=true;message.textContent='Saving this outfit…';
 try{
  const result=await new Promise(resolve=>window.dispatchEvent(new CustomEvent('royale-clothing-operation',{detail:{operation,receive:resolve}})));
  if(!result?.ok){message.textContent=result?.error||'Clothing transaction was not saved. Coins and ownership are unchanged.';return;}
  message.textContent=result.cloudConfirmed?'Your outfit was saved to this hero.':result.localConfirmed?'Saved on this test browser.':'Transaction not confirmed.';
  busy=false;
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
 sets=catalog;rerender=render;
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
 const allOwned=ownsOutfit(current,set);
 const wearing=current?.visible&&selectedOutfit(current)?.id===set.id;
 const quote=current?quoteOutfit(current,set):null;
 if(allOwned){
  wrap.append(node('strong',wearing?'Wearing · complete outfit':'Owned · complete outfit'));
  wrap.append(wearing?btn('Remove outfit',()=>void action({type:'unequip'}),!ready):
   btn('Wear complete outfit',()=>void action({type:'equip',id:set.id}),!ready));
 }else{
  const cost=quote?.ok?quote.debit:set.coinPrice;
  wrap.append(btn('Buy outfit · '+cost+' coins',()=>purchase(set.id,set.name,cost),!ready||!saleReady(set)||!quote?.ok||coins<cost));
  if(quote?.ok&&cost<set.coinPrice)wrap.append(node('small','Previous purchases credited · '+(set.coinPrice-cost)+' coins'));
  if(ready&&quote?.ok&&coins<cost)wrap.append(node('small','Not enough coins.'));
  if(ready&&!quote?.ok&&quote?.error)wrap.append(node('small',quote.error));
 }
 if(!ready)wrap.append(node('small',state?.reason||'Waiting for a verified V3 cloud session. Your fitting room remains free to use.'));
 else wrap.append(node('small','Coins: '+coins.toLocaleString()+' · Purchases save before being confirmed.'));
 return wrap;
}
export function myClothingPanel(holder){
 const state=status(),owned=sets.filter(set=>ownsOutfit(state?.cosmetics,set));
 let panel=holder.querySelector('.clothing-owned-summary');
 if(!panel){panel=node('section');panel.className='clothing-owned-summary';holder.prepend(panel);}
 panel.replaceChildren(node('h4','My Outfits · '+owned.length+' complete outfits'));
 if(!state?.ready){
  const hint=node('p',state?.reason||'Preview mode. To buy and save clothing across devices, launch your hero from V3 Cloud Login.');
  const link=node('a','Open V3 Cloud Login');link.href='../royale-v3-staging/';hint.append(' ',link);panel.append(hint);
 }else if(!owned.length)panel.append(node('p','Try on a complete outfit for free. Earlier clothing purchases count toward its price.'));
 else panel.append(node('p','Your complete outfits belong to this cloud hero. Use Wear or Remove on an outfit card to change your look.'));
}
