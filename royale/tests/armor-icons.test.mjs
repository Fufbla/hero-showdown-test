import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareArmorCollection,drawArmorIcon} from '../power-armor-art.mjs';
import {prepareItemArt,drawItem} from '../item-art.mjs';
import {FIREBALL_REGIONS} from '../assets/power-armor/fireball/regions.mjs';

test('power outfit and retired head-item icons select chest art while boots retain their artwork',async()=>{
 assert.equal(await prepareArmorCollection('fireball',{imageLoader:async url=>({url:url.href})}),true);
 const item={fireballLevels:1,art:'ember'},calls=[];
 const c={drawImage(...args){calls.push(args);}};
 for(const part of [undefined,'set','helmet','mask','headwear']){
  assert.equal(drawArmorIcon(c,{...item,part},144),true);
  assert.deepEqual(calls.at(-1).slice(1,5),FIREBALL_REGIONS.ember[3]);
 }
 drawArmorIcon(c,{...item,part:'boots'},144);
 assert.deepEqual(calls.at(-1).slice(1,5),FIREBALL_REGIONS.ember[6]);
});

test('ordinary legacy head-item icons crop the existing chest tile without altering item records',async()=>{
 const old=globalThis.document,crops=[];
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>({
  drawImage(...args){crops.push(args.slice(1,5));},getImageData:()=>({data:new Uint8ClampedArray(4)}),putImageData(){}
 })})};
 try{
  await prepareItemArt({imageLoader:async()=>({width:512,height:512})});
  const c={save(){},restore(){},drawImage(){}},item={part:'helmet',color:'#327f86',accent:'#f0bd70'};
  const before=structuredClone(item);
  drawItem(c,item,144);drawItem(c,{...item,part:'mask'},144);
  assert.deepEqual(crops,[[256,0,256,256]]);
  assert.deepEqual(item,before);
 }finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
});
