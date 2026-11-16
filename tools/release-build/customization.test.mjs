import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {checkAppearanceSave,REDESIGN_TO_ORIGINAL,RESTORED_FACE_FIELDS} from '../../royale/customization/migration.mjs';
import {UniversalHead} from '../../royale-v3-staging/kingjames/head.mjs';
import {DEFAULT_LOOK,LOOK_OPTIONS,HAIR_STYLES,sanitizeLook} from '../../royale/appearance.mjs';
import {styleCDefault} from '../../royale/style-c-defaults.mjs';
import {Game,decodeSave} from '../../royale/core.mjs';
import {LocalHeroStore,PROFILE_KEY} from '../../royale/saves.mjs';
import {appearanceQuote} from '../../royale/eris.mjs';
import {CostumeEngine} from '../../royale-v3-staging/costumes/engine.mjs';
const options={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u,'utf8'))};
const head=new UniversalHead(options);await head.preload();
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const hash=c=>createHash('sha256').update(pixels(c)).digest('hex');
const oldLook={...DEFAULT_LOOK,version:2,name:'Saved Coast Hero',hair:'long-locs',eyeShape:'almond',brows:'bold',nose:'broad',mouth:'smile',facialHair:'beard',skin:'#67412f',hairColor:'#241a18',eyes:'#30b4c7',suit:'#b92737',cape:false};
const redesigned=original=>({...original,version:3,hair:'m12-long-locs',eyeShape:'e02-round',brows:'b01-natural',nose:'n01-button',mouth:'l06-full-lips',facialHair:'h04-full-beard',legacyAppearance:structuredClone(original)});
const originalHashes={
 "royale/style-c-face.mjs": "46bbeac001a925704d96d378be2072ca20cef9356700057aca14b475e5a4048f",
 "royale/style-c-hair.mjs": "8dfcfd125fb561375191bf1de07bcb3109496f22071a9c0f8e06f60bff097dec",
 "royale/hair-catalog.mjs": "06539ca64601346323921728cdf6ed05d8d785764d537ed585ff68a2542a7d72",
 "royale/hair-reference-material.mjs": "805d53dc4af19e99c53249aeca61ca014a038b4408ad9e526606599e0f58fc1b",
 "royale/hair-fit-corrections.mjs": "a70d34766ac46777974992090776a20861c7cbbdc3a3aabe64d7dd82de09a693",
 "royale/assets/hero/style-c-accurate/hair/frames.mjs": "6484677836e59410a1fd27cf2533551e7b684a469177e13e0b61bcc204fbd5b8",
 "royale/assets/hero/style-c-accurate/hair/fit.mjs": "1e60c04316386e385b1855d61a38f708de582ff43416f168c26b3af3f68f18f8"
};
const preservedHashes={
 "royale/armor-prices.mjs": "46e1dc2a4696f955eebaed75ca56e76c86311a4bfdbd7f8e7742730be8b3d7ef",
 "royale/equipment.mjs": "f9ead5cc5a3b2e5bc61d5166d38db13ebea1334e89db1ec381926e2883186fb0",
 "royale/power-armor.mjs": "bb0aa5fedc0c14dfa6022e848187a46748a3377d8af00e574201cc9dc7cafa6a",
 "royale-v3-staging/gameplay/equipment.mjs": "fc4e247c9307ade81fc9d14cbfc60bea53d0a3f2925d6c07ad1a76f2de11d62e",
 // Forward-flight body positioning is intentional; the existing repair masks and assets are preserved.
 "royale-v3-staging/costumes/engine.mjs": "4fa843ed36df6ab8a58c0fc0dead326179729009a31b49bb24256c4d66e04492",
 "royale-v3-staging/costumes/assets/zombie-costume/manifest.json": "c26ea6878dc86146c9f0e6859f3884402497c4ec8d44107f7d578a1c2437c596",
 "royale-v3-staging/costumes/assets/black-business-suit/manifest.json": "1431a4da5a64879dee435d3fc8ffe30ae0341c532951ea8b0a66040a028a9d6e",
 "royale-v3-staging/costumes/assets/white-business-suit/manifest.json": "61d545c44844d622ce2c96471ef00c09a01f27cde0db1b8890727bbaa1a01407"
};
test('original face designs, hair artwork and customization code are byte-identical to the rollback source',async()=>{
 for(const [file,expected]of Object.entries(originalHashes))assert.equal(createHash('sha256').update(await readFile(new URL('../../'+file,import.meta.url))).digest('hex'),expected,file);
});
test('armor prices, repaired costume rendering and anchors match their verified source versions',async()=>{
 for(const [file,expected]of Object.entries(preservedHashes))assert.equal(createHash('sha256').update(await readFile(new URL('../../'+file,import.meta.url))).digest('hex'),expected,file);
});
test('the unwanted artwork and renderer are absent',async()=>{
 for(const file of ['head.mjs','catalog.mjs','asset-map.mjs','assets/head.png','assets/female-hair.png','assets/male-hair.png'])await assert.rejects(access(new URL('../../royale/customization/'+file,import.meta.url)));
});
test('the original feature choices and male/female presets are restored',()=>{
 for(const [key,values]of Object.entries({eyeShape:['almond','round','wide'],brows:['soft','straight','bold'],nose:['small','straight','broad'],mouth:['neutral','smile','full'],facialHair:['none','stubble','beard']}))assert.deepEqual(LOOK_OPTIONS[key],values);
 assert.equal(HAIR_STYLES.length,49);assert.equal(styleCDefault('male').hair,'short-locs');assert.equal(styleCDefault('female').hair,'curly-ponytail');
 assert.equal(styleCDefault('male').legacyAppearance,undefined);assert.equal(styleCDefault('female').legacyAppearance,undefined);
 assert.notEqual(hash(head.facePlate({...DEFAULT_LOOK,presentation:'male'}).image),hash(head.facePlate({...DEFAULT_LOOK,presentation:'female'}).image));
});
test('every original hairstyle and facial option renders with the original plate dimensions',()=>{
 for(const presentation of ['male','female']){
  for(const hair of HAIR_STYLES){const look=sanitizeLook({...DEFAULT_LOOK,presentation,hair});assert.equal(look.hair,hair);const p=head.plate(look);assert.equal(p.image.width,presentation==='female'?384:256);assert.equal(p.image.height,presentation==='female'?384:256);assert(pixels(p.image).some(Boolean));}
  for(const key of ['eyeShape','brows','nose','mouth','facialHair'])for(const choice of LOOK_OPTIONS[key]){const look=sanitizeLook({...DEFAULT_LOOK,presentation,[key]:choice});assert.equal(look[key],choice);assert(pixels(head.facePlate(look).image).some(Boolean));}
  assert.notEqual(hash(head.facePlate({...DEFAULT_LOOK,presentation,eyes:'#3344aa'}).image),hash(head.facePlate({...DEFAULT_LOOK,presentation,eyes:'#ddbb22'}).image));
 }
});
test('every original hairstyle is recovered exactly from the immutable backup without changing current suit colors or name',()=>{
 for(const presentation of ['male','female'])for(const hair of HAIR_STYLES){
  const original={...oldLook,presentation,hair},raw={...redesigned(original),name:'Current Hero Name',suit:'#112233'},before=JSON.stringify(raw),next=sanitizeLook(raw);
  assert.equal(next.version,4);for(const key of RESTORED_FACE_FIELDS)assert.deepEqual(next[key],original[key],key);
  assert.equal(next.name,raw.name);assert.equal(next.suit,raw.suit);assert.deepEqual(next.legacyAppearance,original);assert.equal(JSON.stringify(raw),before);assert.deepEqual(sanitizeLook(next),next);
 }
});
test('unmigrated original heroes keep all selections and colors',()=>{
 const next=sanitizeLook(oldLook);for(const key of Object.keys(oldLook).filter(k=>k!=='version'))assert.deepEqual(next[key],oldLook[key],key);
 assert.deepEqual(next.legacyAppearance,oldLook);assert.deepEqual(sanitizeLook(next),next);
});
test('new Change-3-only choices have stable original equivalents without replacing colors or names',()=>{
 for(const [key,choices]of Object.entries(REDESIGN_TO_ORIGINAL))for(const [choice,expected]of Object.entries(choices)){
  const raw={...DEFAULT_LOOK,version:3,name:'Newly Created Hero',[key]:choice},before=JSON.stringify(raw),restored=sanitizeLook(raw);
  assert.equal(restored[key],expected);assert(LOOK_OPTIONS[key].includes(expected));assert.equal(restored.name,raw.name);assert.equal(restored.eyes,raw.eyes);assert.equal(restored.hairColor,raw.hairColor);assert.equal(JSON.stringify(raw),before);assert.deepEqual(sanitizeLook(restored),restored);
 }
});
test('restored heroes can change original features and reload without reapplying the recovery copy',()=>{
 const restored=sanitizeLook(redesigned(oldLook)),edited=appearanceQuote(restored,{...restored,hair:'bob',eyes:'#aabbcc',legacyAppearance:undefined}).next;
 assert.equal(edited.hair,'bob');assert.equal(edited.eyes,'#aabbcc');assert.deepEqual(edited.legacyAppearance,oldLook);assert.deepEqual(sanitizeLook(edited),edited);assert.equal(appearanceQuote(edited,edited).changed,false);
});
test('save guard allows selective restoration and blocks old tabs or lost recovery records',()=>{
 const before={look:redesigned(oldLook)},after={look:sanitizeLook(before.look)};
 assert(checkAppearanceSave(before,after).ok);assert(checkAppearanceSave(after,structuredClone(after)).ok);
 for(const look of [before.look,oldLook,{...after.look,legacyAppearance:undefined},{...after.look,legacyAppearance:{...oldLook,hair:'none'}}])assert.equal(checkAppearanceSave(after,{look}).ok,false);
 assert(checkAppearanceSave({look:oldLook},{look:sanitizeLook(oldLook)}).ok);assert(checkAppearanceSave(null,{look:DEFAULT_LOOK}).ok);
});
test('restoration changes no non-appearance save fields and local slots retain independent progress and purchases',()=>{
 const g=new Game();g.hero.level=25;g.hero.xp=81;g.hero.coins=5678;g.powers.data.points=24;const base=decodeSave(g.save());
 const raw={...base,look:redesigned(oldLook)},before=JSON.stringify(raw),decoded=decodeSave(before);assert(decoded);
 for(const key of Object.keys(base).filter(k=>k!=='look'))assert.deepEqual(decoded[key],base[key],key);assert.equal(JSON.stringify(raw),before);
 const m=new Map(),storage={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v))};const store=new LocalHeroStore(storage);
 assert(store.writeSlot(0,raw).ok);assert(store.writeSlot(1,{...base,look:redesigned({...oldLook,name:'Second Hero',hair:'curly-ponytail',presentation:'female'})}).ok);
 const reloaded=new LocalHeroStore(storage),first=reloaded.slot(0).snapshot,second=reloaded.slot(1).snapshot;
 assert.equal(first.look.hair,'long-locs');assert.equal(second.look.hair,'curly-ponytail');assert.equal(first.coins,5678);assert.deepEqual(first.cosmetics,base.cosmetics);assert.deepEqual(first.inventory,base.inventory);
 const unchanged=storage.getItem(PROFILE_KEY);assert.equal(reloaded.writeSlot(0,{...first,look:{...first.look,legacyAppearance:undefined}}).ok,false);assert.equal(storage.getItem(PROFILE_KEY),unchanged);
});
test('all repaired costume poses remove magenta markers and keep complete body pixels outside the head',async()=>{
 const engine=new CostumeEngine(options);let checked=0;
 for(const id of ['zombie-costume','black-business-suit','white-business-suit']){
  assert(await engine.preload(id),engine.error);const m=engine.outfits.get(id).manifest;assert.equal(m.frames.length,48);
  for(let i=0;i<48;i++){
   const d=pixels(engine.masks(id,i).body);let body=0,magenta=0;
   for(let p=0;p<d.length;p+=4)if(d[p+3]>96){body++;if(d[p]>70&&d[p+2]>70&&d[p]>d[p+1]*1.5&&d[p+2]>d[p+1]*1.5)magenta++;}
   assert(body>3000,id+' body '+i);assert.equal(magenta,0,id+' marker '+i);assert(m.frames[i].faceAnchor.every(Number.isFinite));checked++;
  }
 }
 assert.equal(checked,144);
});
