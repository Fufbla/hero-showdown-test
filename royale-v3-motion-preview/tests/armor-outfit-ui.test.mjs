import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../core.mjs';
import {ErisMenu} from '../eris-ui.mjs';
import {JourneyMenu} from '../journey-menu.mjs';
import {LegendaryMenu,mergePreviewInventory} from '../legendary-ui.mjs';
import {itemDefinition,armorOutfitPrice} from '../equipment.mjs';

// Exercise the actual menu callbacks and Game mutations without a browser or
// artwork dependency. Rendering itself has separate canvas regression tests.
const context=new Proxy({createLinearGradient:()=>({addColorStop(){}})}, {
 get(target,key){return key in target?target[key]:()=>{};}
});
class Element{
 constructor(tag='div'){
  this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attributes={};
  this.className='';this.disabled=false;this.style={setProperty(){}};this.classList={toggle(){}};
 }
 set textContent(value){this.children=[String(value)];}
 get textContent(){return this.children.map(child=>typeof child==='string'?child:child.textContent).join('');}
 append(...children){this.children.push(...children);}
 prepend(...children){this.children.unshift(...children);}
 replaceChildren(...children){this.children=[...children];}
 setAttribute(name,value){this.attributes[name]=String(value);}
 getContext(){return context;}
 closest(){return this;}
 scrollIntoView(){}
 focus(){}
 all(predicate){return this.children.flatMap(child=>typeof child==='string'?[]:[...(predicate(child)?[child]:[]),...child.all(predicate)]);}
 buttons(){return this.all(child=>child.tagName==='BUTTON');}
}
async function withDocument(run){
 const previous=globalThis.document,nodes=new Map();
 const get=id=>{if(!nodes.has(id)){const node=new Element();node.id=id;nodes.set(id,node);}return nodes.get(id);};
 globalThis.document={createElement:tag=>new Element(tag),getElementById:get,querySelectorAll:()=>[]};
 try{await run(get);}finally{await new Promise(setImmediate);if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}
const transaction=async action=>{const result=await action();return typeof result==='boolean'?{ok:result}:result;};
function menuFor(game){
 const menu=Object.create(ErisMenu.prototype);
 Object.assign(menu,{getGame:()=>game,transaction,say(){},mode:'owned',category:'sets',selected:null,view:'front',draw(){}});
 return menu;
}
function add(game,catalogId){const item={uid:'drop-'+game.inventory.nextId++,catalogId};game.inventory.items.push(item);return item;}

test('armor shop purchases one pair and owned controls wear or remove the complete outfit',()=>withDocument(async get=>{
 const game=new Game();game.hero.coins=1000;assert.equal(game.visitTree(),true);
 const menu=menuFor(game),selection={setId:'shore-ordinary'},price=armorOutfitPrice(selection);
 menu.reviewBuy(selection);
 const confirm=get('shop-confirm').buttons().find(button=>button.id==='confirm-purchase');
 assert.equal(confirm.disabled,false);await confirm.onclick();
 assert.deepEqual(game.inventory.items.map(item=>itemDefinition(item).part),['chest','boots']);
 assert.equal(game.hero.coins,1000-price);
 assert.equal(get('shop-items').children.length,1,'Owned menu groups the pair into one outfit card');
 let wear=get('shop-detail').buttons().find(button=>button.id==='equip-piece');
 assert.equal(wear.textContent,'Wear matching outfit');assert.equal(wear.disabled,false);await wear.onclick();
 assert.deepEqual(Object.keys(game.inventory.equipped),['chest','boots']);
 wear=get('shop-detail').buttons().find(button=>button.id==='equip-piece');
 assert.equal(wear.textContent,'Remove outfit');await wear.onclick();
 assert.deepEqual(game.inventory.equipped,{});
}));

test('owned armor and inventory menus disable incomplete outfits and never list retired headwear',()=>withDocument(async get=>{
 const game=new Game();game.visitTree();
 const chest=add(game,'eris-shore-ordinary-chest');
 add(game,'eris-shore-ordinary-helmet'); // Defensive UI behavior for a stale in-memory packet.
 const menu=menuFor(game);menu.wardrobe();
 assert.equal(get('shop-items').children.length,1);
 assert.equal(get('shop-items').buttons()[0].disabled,true);
 assert.equal(get('shop-detail').buttons().find(button=>button.id==='equip-piece').disabled,true);
 const journey=new JourneyMenu(()=>game,()=>{},()=>{},()=>{},transaction);journey.inventory();
 assert.equal(get('equipment-list').children.length,1);
 assert.equal(get('equipment-list').buttons().find(button=>button.className==='wardrobe-quick-equip').disabled,true);
 add(game,'eris-shore-ordinary-boots');journey.inventory();
 const card=get('equipment-list').children.find(node=>node.dataset.item===chest.uid);
 const wear=card.buttons().find(button=>button.className==='wardrobe-quick-equip');
 assert.equal(wear.disabled,false);await wear.onclick();
 assert.deepEqual(Object.keys(game.inventory.equipped),['chest','boots']);
}));

test('Villain Merge menu offers matching suits without individual piece selectors',()=>withDocument(async get=>{
 const game=new Game();game.gainXP(1e9);game.visitTree();
 add(game,'merge-lightning-chest');add(game,'merge-lightning-boots');
 const menu=new LegendaryMenu(()=>game,{transaction,say(){},enter(){},onClaim(){}});
 menu.previewPanel=()=>new Element('aside');menu.tree();
 const panel=get('merge-sanctuary');
 assert.equal(panel.all(node=>node.tagName==='SELECT').length,0);
 assert.doesNotMatch(panel.textContent,/helmet|mix your owned|3\/3/i);
 const activate=panel.buttons().find(button=>button.id==='activate-merge');
 assert.equal(activate.disabled,false);await activate.onclick();
 assert.deepEqual(Object.keys(game.inventory.equipped),['chest','boots']);
 assert.equal(game.legendary.active,'lightning');
 const before=structuredClone(game.inventory),preview=mergePreviewInventory(game,'air');
 assert.deepEqual(Object.keys(preview.equipped),['chest','boots']);
 assert.deepEqual(game.inventory,before,'Trying another complete suit does not mutate worn equipment');
}));
