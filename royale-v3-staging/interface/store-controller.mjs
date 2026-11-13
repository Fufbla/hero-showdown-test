// UI state only. The existing cosmetic transaction bridge owns wallets and saves.
export class StoreController {
  constructor({status,operate,quote,owns,changed=()=>{}}){Object.assign(this,{status,operate,quote,owns,changed});this.selected=null;this.confirming=null;this.busy=false;this.message='';}
  select(set){this.selected=set;this.changed();}
  request(set){
    if(this.busy)return false;
    const state=this.status(),quote=this.quote(state?.cosmetics,set);
    if(!quote?.ok){this.message=quote?.error||'This outfit is unavailable.';this.changed();return false;}
    this.selected=set;this.confirming={set,price:quote.debit};this.message='';this.changed();return true;
  }
  cancel(){if(this.busy)return false;this.confirming=null;this.changed();return true;}
  async buy(){
    if(this.busy||!this.confirming)return {ok:false,ignored:true};
    const {set,price}=this.confirming,state=this.status(),quote=this.quote(state?.cosmetics,set);
    if(this.owns(state?.cosmetics,set))return this.fail('You already own this outfit.');
    if(!quote?.ok||quote.debit!==price)return this.fail('The price changed. Cancel and select the outfit again.');
    if((state?.coins??0)<price)return this.fail('Not enough coins. You need '+(price-(state?.coins??0)).toLocaleString()+' more.');
    return this.run({type:'purchase',id:set.id,confirmed:true});
  }
  async equip(set){if(this.busy)return {ok:false,ignored:true};return this.run(set?{type:'equip',id:set.id}:{type:'unequip'});}
  fail(error){this.message=error;this.changed();return {ok:false,error};}
  async run(operation){
    if(!this.status()?.ready)return this.fail(this.status()?.reason||'Wait until your hero is safely outside combat.');
    this.busy=true;this.message='Saving outfit…';this.changed();
    try{
      const result=await this.operate(operation);
      if(!result?.ok)return this.fail(result?.error||'The save was not confirmed. Your local coins and outfit are unchanged.');
      this.confirming=null;this.message=operation.type==='purchase'?'Outfit purchased and saved. Choose Equip to wear it.':'Appearance saved.';
      return result;
    }catch(error){return this.fail(error.message||'Could not save this outfit.');}
    finally{this.busy=false;this.changed();}
  }
}
