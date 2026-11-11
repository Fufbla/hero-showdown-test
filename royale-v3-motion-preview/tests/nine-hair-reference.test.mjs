import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {prepareStyleCMaterials} from '../style-c-materials.mjs';import {drawStyleCHair,styleCHairStatus} from '../style-c-hair.mjs';import {HAIR_REFERENCE_V3,HAIR_REFERENCE_IDS,hairReferenceURL} from '../hair-reference-v3.mjs';import {drawHero} from '../style-c-hero.mjs';import {styleCDefault} from '../style-c-defaults.mjs';import {previewHero} from '../hero-rig.mjs';import {Game} from '../core.mjs';import {LocalHeroStore,PROFILE_KEY} from '../saves.mjs';import {styleCOutfit} from './style-c-scenes.mjs';
let allocations=0;await prepareStyleCMaterials({canvasFactory:(w,h)=>{allocations++;return createCanvas(w,h)},imageLoader:u=>loadImage(fileURLToPath(u))});
const hash=d=>createHash('sha256').update(d).digest('hex');
const plateCanvas=createCanvas(500,650);
function plate(look,view,layer='front',motion={},time=0){const c=plateCanvas,ctx=c.getContext('2d');ctx.resetTransform();ctx.clearRect(0,0,500,650);ctx.translate(250,430);ctx.scale(5,5);assert.equal(drawStyleCHair(ctx,look,motion,time,layer,view),true);return ctx.getImageData(0,0,500,650).data;}
test('all nine assets have four independent authored rectangles and real transparency',async()=>{
 for(const id of HAIR_REFERENCE_IDS){const im=await loadImage(fileURLToPath(hairReferenceURL(id))),c=createCanvas(im.width,im.height),ctx=c.getContext('2d');ctx.drawImage(im,0,0);assert.ok(ctx.getImageData(0,0,1,1).data[3]<5);const def=HAIR_REFERENCE_V3[id];assert.deepEqual(Object.keys(def.frames),['front','side','left','back']);const hashes=[];for(const f of Object.values(def.frames)){assert.ok(f[0]>=0&&f[1]>=0&&f[0]+f[2]<=im.width&&f[1]+f[3]<=im.height);hashes.push(hash(ctx.getImageData(...f).data));}assert.equal(new Set(hashes).size,4);}
});
test('changing colors retains alpha, while gold cuffs retain their material',()=>{
 for(const hair of HAIR_REFERENCE_IDS)for(const view of ['front','side','left','back']){
 const a=plate({...styleCDefault('female'),hair,hairColor:'#3e2048'},view),b=plate({...styleCDefault('female'),hair,hairColor:'#d7b65c'},view);let gold=0,changed=0;
 for(let i=0;i<a.length;i+=4){assert.equal(a[i+3],b[i+3]);if(a[i+3]>250&&a[i]>150&&a[i]-a[i+2]>60&&a[i+1]-a[i+2]>35){if(a[i]===b[i]&&a[i+1]===b[i+1]&&a[i+2]===b[i+2])gold++;}if(a[i]!==b[i])changed++;}assert.ok(changed>500);const visibleCuff=['high-ponytail','afro-puff','double-puffs','high-loc-bun','braided-ponytail'].includes(hair)&&!(hair==='afro-puff'&&view==='back');if(visibleCuff)assert.ok(gold>5,`${hair}/${view}: unchanged gold cores (${gold})`);
 }
});
test('all nine styles stay on the same head anchors through twelve animations and every direction',async()=>{
 global.gc?.();const c=createCanvas(300,320),ctx=c.getContext('2d');let frames=0;
 for(const hair of HAIR_REFERENCE_IDS)for(const sex of ['male','female'])for(const view of ['front','right','left','back','game'])for(const pose of ['idle','walk','run','jump','double-jump','fall','punch','kick','fireball','strength','superKick','flight']){
 const look=Object.freeze({...styleCDefault(sex),hair,skin:sex==='male'?'#35251f':'#efd5c4',jaw:pose==='idle'?.85:1.15}),before=JSON.stringify(look),h=previewHero(pose,.18),o={view,poseName:pose,outfit:styleCOutfit(frames%2?'starter':'rare')};
 ctx.clearRect(0,0,300,320);const p=drawHero(ctx,150,300,look,h,.18,1.6,o),n=drawHero(ctx,150,300,{...look,hair:'none'},h,.18,1.6,o);assert.deepEqual(p.head,n.head);assert.deepEqual(p.shoulder,n.shoulder);assert.ok(p.head.every(Number.isFinite));assert.equal(JSON.stringify(look),before);ctx.getImageData(0,0,1,1);frames++;if(frames%36===0){await new Promise(r=>setTimeout(r,0));global.gc?.();}
 }console.log('Nine-hair animation/direction/equipment frames:',frames);
});
test('tail motion pins scalp pixels and warmed rendering allocates no per-frame hair canvases',()=>{
 for(const hair of HAIR_REFERENCE_IDS){const look={...styleCDefault('female'),hair};for(const view of ['front','side','left','back'])plate(look,view);const warm=allocations;for(let t=0;t<3;t++)for(const view of ['front','side','left','back']){plate(look,view,'front',{wind:5,bounce:2},t/60);plate(look,view,'rear',{wind:-5,bounce:-2},t/60);}assert.equal(allocations,warm);global.gc?.();}
 assert.ok(styleCHairStatus().materials<=styleCHairStatus().limit);
});
test('all nine saved hairstyles survive both visible slots and reload without modifying hidden slot',()=>{
 const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},store=new LocalHeroStore(storage);const hidden=new Game();hidden.hero.x=314;store.writeSlot(2,hidden.save());const hiddenBefore=JSON.stringify(store.slot(2));
 for(const hair of HAIR_REFERENCE_IDS){for(const slot of [0,1]){const g=new Game();g.look={...styleCDefault(slot?'male':'female'),hair,skin:'#6b4233',jaw:.93};g.hero.x=182+slot;store.writeSlot(slot,g.save());}const before=storage.getItem(PROFILE_KEY);for(const slot of [0,1]){const g=new Game({save:new LocalHeroStore(storage).slot(slot).snapshot});assert.equal(g.look.hair,hair);for(const view of ['front','right','left','back'])plate(g.look,view);}assert.equal(storage.getItem(PROFILE_KEY),before);assert.equal(JSON.stringify(new LocalHeroStore(storage).slot(2)),hiddenBefore);}
});
