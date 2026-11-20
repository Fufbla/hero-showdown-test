import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {VICE_ACTIONS,baseHero,drawAction} from './actions.mjs';

globalThis.location={pathname:'/hero-showdown-test/four-powers-test/gameplay/',search:'?testAccount=0000000000'};
const [{CostumeEngine,VICE_STATES,VICE_CACHE_LIMIT,validateViceManifest},{VICE_ID},{styleCDefault},{ATTACKS,Game},
 {COLLECTION},{catalogIndex,cosmeticTransaction},{HAIR_STYLES}]=await Promise.all([
 import('../engine.mjs'),import('../definitions.mjs'),import('../../../../royale/style-c-defaults.mjs'),
 import('../../../../royale/core.mjs'),import('../catalog.mjs'),import('../../../../royale/cosmetics/state.mjs'),
 import('../../../../royale/appearance.mjs')
]);
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const options={canvasFactory:createCanvas,imageLoader:url=>loadImage(fileURLToPath(url)),jsonLoader:async url=>JSON.parse(await readFile(url))};
const engine=new CostumeEngine(options);assert(await engine.preload(VICE_ID),engine.error);
const loaded=engine.outfits.get(VICE_ID),manifest=loaded.manifest;
const pixels=canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
const digest=canvas=>createHash('sha256').update(pixels(canvas)).digest('hex');
const lookFor=presentation=>({...styleCDefault(presentation),skin:presentation==='male'?'#613a25':'#d5a47f',
 hair:presentation==='male'?'long-locs':'long-wavy',hairColor:'#543127',eyes:'#5a48b0'});
const isPink=(r,g,b,a)=>a>64&&r>120&&r>g*1.7&&b>g*1.5&&b>50;

test('All 48 composed Vice poses retain customized heads, visible pink printing and intact cell margins',()=>{
 assert.equal(validateViceManifest(manifest,loaded.atlas),manifest);
 assert.deepEqual(VICE_STATES,VICE_ACTIONS);assert.equal(manifest.frames.length,48);
 const hashes=[];let visiblePrint=0;
 for(let frame=0;frame<manifest.frames.length;frame++)for(const presentation of ['male','female'])for(const direction of [-1,1]){
  const look=lookFor(presentation),before=structuredClone(look),canvas=engine.compose(VICE_ID,frame,look,false,direction),data=pixels(canvas);
  assert.deepEqual(look,before);assert.equal(canvas.width,256);assert.equal(canvas.height,256);
  const headCanvas=createCanvas(256,256);engine.viceHead.draw(headCanvas.getContext('2d'),look,manifest.frames[frame].head,manifest.head.scale);
  const headPixels=pixels(headCanvas),print=pixels(engine.letteringLayer(frame,direction)),body=pixels(engine.viceBody(frame,look));
  let ink=0,cyan=0,edge=0;
  for(let p=0;p<256*256;p++){
   const i=p*4,[r,g,b,a]=data.subarray(i,i+4);if(a<32)continue;ink++;
   if(isPink(...print.subarray(i,i+4))&&print[i+3]>128&&headPixels[i+3]===0){
    const alpha=print[i+3]/255,under=body[i+3]/255,out=alpha+under*(1-alpha);
    for(let k=0;k<3;k++){
     const expected=(print[i+k]*alpha+body[i+k]*under*(1-alpha))/out;
     assert(Math.abs(data[i+k]-expected)<=2,`Uncovered print changed in frame ${frame}`);
    }
    visiblePrint++;
   }
   if(a>64&&g>r*1.6&&b>r*1.6&&g>60&&b>60&&Math.abs(g-b)<Math.max(g,b)*.3)cyan++;
   if(p%256===0||p%256===255||p<256||p>=255*256)edge++;
  }
  const label=`frame ${frame}, ${presentation}, direction ${direction}`;
  assert(ink>1000,label+' has no composed hero');
  assert.equal(cyan,0,label+' retains cyan skin placeholders');assert.equal(edge,0,label+' clips at the cell edge');
  if(presentation==='male'&&direction===1)hashes.push(digest(canvas));
 }
 assert(visiblePrint>1000,'The composed costumes must retain visible pink printing');
 assert.equal(new Set(manifest.animations.run.frames.map(i=>hashes[i])).size,8,'All running poses must be distinct');
 for(const action of ['punch','kick']){
  const frames=manifest.animations[action].frames;assert.notEqual(hashes[frames[0]],hashes[frames[2]],action+' must have distinct contact art');
 }
 assert(engine.composites.size<=VICE_CACHE_LIMIT);assert(engine.viceBodies.size<=VICE_CACHE_LIMIT);
});

test('All 49 hairstyles fit every pose without clipping after their actual head rotation and scale',()=>{
 let checked=0;
 for(const presentation of ['male','female'])for(const hair of HAIR_STYLES){
  const plate=engine.viceHead.plate({...lookFor(presentation),hair}),data=pixels(plate.image),points=[];
  // Row extrema describe the actual opaque head, including long hair, the cap
  // and glasses. Unlike a rectangle, these remain precise for rotated poses.
  for(let y=0;y<plate.image.height;y++){
   let first=plate.image.width,last=-1;
   for(let x=0;x<plate.image.width;x++)if(data[(y*plate.image.width+x)*4+3]>32){first=Math.min(first,x);last=Math.max(last,x);}
   if(last>=0)points.push([first-plate.origin[0],y-plate.origin[1]],[last-plate.origin[0],y-plate.origin[1]]);
  }
  assert(points.length>0);
  for(const [frame,pose]of manifest.frames.entries()){
   const [x,y,angle]=pose.head,s=manifest.head.scale,cos=Math.cos(angle),sin=Math.sin(angle);
   let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
   for(const [px,py]of points){
    const xx=x+s*(px*cos-py*sin),yy=y+s*(px*sin+py*cos);
    x0=Math.min(x0,xx);x1=Math.max(x1,xx);y0=Math.min(y0,yy);y1=Math.max(y1,yy);
   }
   assert(x0>=1&&y0>=1&&x1<=254&&y1<=254,`${presentation} ${hair} clips in pose ${frame}: ${[x0,y0,x1,y1]}`);checked++;
  }
 }
 assert.equal(checked,4704);
});

test('Saved skin recolors the body skin without changing white clothing, black fabric or the neon-pink decal',()=>{
 let changed=0,clothing=0,pink=0;
 for(let frame=0;frame<48;frame++){
  const dark={...lookFor('male'),skin:'#482a1d'},light={...dark,skin:'#edcba1'};
  const a=pixels(engine.viceBody(frame,dark)),b=pixels(engine.viceBody(frame,light)),raw=engine.viceTemplate(frame).pixels.data;
  const first=pixels(engine.compose(VICE_ID,frame,dark)),second=pixels(engine.compose(VICE_ID,frame,light));
  for(let i=0;i<a.length;i+=4){
   assert.equal(a[i+3],b[i+3],'Skin changes must not alter body silhouette');
   if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])changed++;
   if(raw[i+3]>128&&Math.max(raw[i],raw[i+1],raw[i+2])-Math.min(raw[i],raw[i+1],raw[i+2])<10){
    for(let k=0;k<4;k++)assert.equal(a[i+k],b[i+k],'Neutral cloth must keep its authored color');clothing++;
   }
   if(isPink(...first.subarray(i,i+4))&&isPink(...second.subarray(i,i+4))){
    for(let k=0;k<4;k++)assert(Math.abs(first[i+k]-second[i+k])<=1,'Pink printing must not follow skin color');pink++;
   }
  }
 }
 assert(changed>1000);assert(clothing>10000);assert(pink>1000);
});

// Rotate the observed print back to an upright chest after applying the same
// whole-hero left/right transform that a player sees. This catches mirrored text.
function uprightPrint(frame,direction){
 const canvas=createCanvas(80,48),c=canvas.getContext('2d'),[x,y,,,angle]=manifest.frames[frame].chest;
 c.translate(40,24);c.rotate(-direction*angle);c.scale(direction,1);c.translate(-x,-y);
 c.drawImage(engine.letteringLayer(frame,direction),0,0);return pixels(canvas);
}
test('Vice lettering remains readable in both directions and stays on the original white shirt',()=>{
 let compared=0;
 for(let frame=0;frame<48;frame++){
  const right=uprightPrint(frame,1),left=uprightPrint(frame,-1);let direct=0,reversed=0,mass=0;
  for(let y=0;y<48;y++)for(let x=0;x<80;x++){
   const i=(y*80+x)*4+3,j=(y*80+79-x)*4+3;
   direct+=Math.abs(right[i]-left[i]);reversed+=Math.abs(right[i]-left[j]);mass+=right[i]+left[i];
  }
  assert(mass>1000,'Print is missing in pose '+frame);
  // Idle poses expose the complete tank. Attack poses may legitimately hide
  // different letters behind an arm, so their masks are checked separately.
  if(manifest.animations.idle.frames.includes(frame))assert(direct<reversed*.4,'Vice is reversed in idle pose '+frame);
  compared++;
  const mask=pixels(engine.viceTemplate(frame).shirtMask);
  for(const direction of [-1,1]){
   const print=pixels(engine.letteringLayer(frame,direction));
   for(let i=3;i<print.length;i+=4)if(print[i])assert(mask[i]>0,'Print escapes white cloth in pose '+frame);
  }
 }
 assert.equal(compared,48);
});

test('All 21 normal actions select authored Vice art in both directions for both presentations without mutating gameplay',()=>{
 const canvas=createCanvas(320,320),c=canvas.getContext('2d');let checked=0;
 for(const presentation of ['male','female'])for(const direction of [-1,1])for(const state of VICE_ACTIONS){
  c.clearRect(0,0,320,320);const look=lookFor(presentation),before=structuredClone(look);
  const result=drawAction(engine,c,{id:VICE_ID,look,state,direction,attacks:ATTACKS});
  assert(result.pose,state);assert.equal(result.pose.artSource,'full-body-costume');assert.equal(result.frame.outfit,VICE_ID);
  assert.equal(result.frame.state,state);assert.equal(result.frame.direction,direction);assert(manifest.animations[state].frames.includes(result.frame.frame));
  assert.deepEqual(result.hero,result.before);assert.deepEqual(look,before);assert.equal(result.frame.hairCrownCovered,true);
  assert.equal(result.frame.hairVisible,true);assert(pixels(canvas).some(value=>value!==0));checked++;
 }
 assert.equal(checked,84);
});

test('Independent solo and co-op animation owners render the same appearance without sharing movement state',()=>{
 const solo={},first={},second={},look=lookFor('female'),make=()=>createCanvas(320,320);
 for(const state of VICE_ACTIONS){
  const a=make(),b=make(),c=make();
  const one=drawAction(engine,a.getContext('2d'),{id:VICE_ID,look,state,direction:-1,attacks:ATTACKS,owner:solo});
  const two=drawAction(engine,b.getContext('2d'),{id:VICE_ID,look,state,direction:-1,attacks:ATTACKS,owner:first});
  drawAction(engine,c.getContext('2d'),{id:VICE_ID,look:lookFor('male'),state:'hurt',direction:1,attacks:ATTACKS,owner:second});
  assert.deepEqual(two.frame,one.frame,state);assert.equal(digest(b),digest(a),state+' differs in co-op');
  assert.notStrictEqual(engine.states.get(first),engine.states.get(second));
 }
});

test('Steel Body renders the unchanged transformation and restores Vice without changing appearance, ownership or coins',()=>{
 const game=new Game({look:lookFor('female')});game.hero.coins=2000;const index=catalogIndex({sets:COLLECTION});
 for(const type of ['purchase','equip']){
  const result=cosmeticTransaction({state:game.cosmetics,look:game.look,coins:game.hero.coins,index,
   operation:{type,id:VICE_ID,confirmed:true,revision:game.cosmetics.revision},safe:true,atWardrobe:true});
  assert(result.ok,result.error);game.cosmetics=result.state;game.hero.coins=result.coins;
 }
 const saved=game.save(),canvas=createCanvas(320,320),c=canvas.getContext('2d'),hero={...baseHero(),steel:true,v2Active:{steel:{age:1}}};
 assert(engine.draw(c,160,285,game.look,hero,1,{id:VICE_ID}));assert.equal(engine.lastFrame.outfit,'steel-universal');assert.equal(engine.lastFrame.hairVisible,false);
 hero.steel=false;c.clearRect(0,0,320,320);assert(engine.draw(c,160,285,game.look,hero,1.1,{id:VICE_ID}));
 assert.equal(engine.lastFrame.outfit,VICE_ID);assert.equal(engine.lastFrame.hairCrownCovered,true);assert.equal(game.save(),saved);
});

test('Malformed registration and missing body or decal assets fail safely and permit a clean retry',async()=>{
 const mutations=[
  m=>{m.id='unrelated-outfit';},m=>{m.frames.pop();},m=>{m.foot[1]=0;},m=>{m.head.scale=0;},
  m=>{m.strideDistance=0;},m=>{m.flightPose='upright';},m=>{delete m.animations.fireballAir;},
  m=>{m.animations.run.frames[0]=.5;},m=>{m.frames[0].rect[0]=-1;},m=>{m.frames[0].rect[0]=loaded.atlas.width;},
  m=>{m.frames[0].hand[0]=NaN;},m=>{m.frames[0].chest[2]=0;},m=>{m.lettering.text='Other';},m=>{delete m.headgear.cap;}
 ];
 for(const change of mutations){const malformed=structuredClone(manifest);change(malformed);assert.throws(()=>validateViceManifest(malformed,loaded.atlas));}
 for(const missing of ['manifest.json','body.webp','lettering.png']){
  let offline=true;
  const fail=url=>offline&&url.pathname.includes('/vice/assets/')&&url.pathname.endsWith('/'+missing);
  const retry=new CostumeEngine({...options,
   imageLoader:url=>{if(fail(url))throw Error('Fixture missing asset');return options.imageLoader(url);},
   jsonLoader:url=>{if(fail(url))throw Error('Fixture missing asset');return options.jsonLoader(url);}
  });
  assert.equal(await retry.preload(VICE_ID),false,missing);assert.equal(retry.outfits.has(VICE_ID),false);assert.equal(retry.pending.has(VICE_ID),false);
  const canvas=createCanvas(320,320),hero=baseHero(),before=structuredClone(hero);
  assert.equal(retry.draw(canvas.getContext('2d'),160,285,lookFor('male'),hero,1,{id:VICE_ID}),false);
  assert.equal(pixels(canvas).some(value=>value!==0),false);assert.deepEqual(hero,before);
  offline=false;assert(await retry.preload(VICE_ID),retry.error);assert(retry.outfits.has(VICE_ID));assert.equal(retry.pending.has(VICE_ID),false);
 }
});
