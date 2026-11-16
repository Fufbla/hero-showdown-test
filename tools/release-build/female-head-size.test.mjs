import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {UniversalHead} from '../../royale-v3-staging/kingjames/head.mjs';
import {rearHead} from '../../royale-v3-staging/starter-suit/rear-head.mjs';
import {HAIR_STYLES,LOOK_OPTIONS} from '../../royale/appearance.mjs';
import {styleCDefault} from '../../royale/style-c-defaults.mjs';
import {CostumeEngine} from '../../royale/fashion/engine.mjs';
import {COLLECTION} from '../../royale/fashion/catalog.mjs';
import {Game,decodeSave} from '../../royale/core.mjs';

const options={canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u)),jsonLoader:async u=>JSON.parse(await readFile(u,'utf8'))};
const head=new UniversalHead(options);await head.preload();
const pixels=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const base=styleCDefault('male'),female=styleCDefault('female');
const shapes=['oval','round','angular'].flatMap(face=>['teen','young','older'].flatMap(age=>[.85,1,1.15].map(jaw=>({face,age,jaw}))));

test('male pixels, dimensions and attachments exactly match production 2d8c9c7 in 460 renders',()=>{
 // Captured with @napi-rs/canvas 0.1.100 from the untouched live source commit,
 // including open/closed faces, all 49 hairstyles and creator back views.
 const looks=[...HAIR_STYLES.map(hair=>({...base,hair})),...['eyeShape','brows','nose','mouth','facialHair'].flatMap(key=>LOOK_OPTIONS[key].map(value=>({...base,[key]:value}))),...shapes.map(shape=>({...base,...shape})),{...base,skin:'#382317',eyes:'#00ccaa',hairColor:'#f1a345',hair:'long-locs'}];
 assert.equal(looks.length,92);const digest=createHash('sha256');
 for(const look of looks){
  for(const closed of [false,true])for(const p of [head.facePlate(look,closed),head.plate(look,closed)]){
   digest.update(JSON.stringify({bounds:p.bounds,origin:p.origin}));digest.update(pixels(p.image));
  }
  const p=rearHead(head,look,createCanvas);digest.update(JSON.stringify(p.origin));digest.update(pixels(p.image));
 }
 assert.equal(digest.digest('hex'),'21ffafdf03f13d569a275487925afad3d5580a3932e74da86121bb94f292d976');
});

test('female visible width and height match the fixed male reference for every head-shape setting',()=>{
 assert.deepEqual(head.facePlate(base).bounds,[55,69,115,123]);
 assert.deepEqual(head.facePlate(female).bounds,[55,69,115,123]);
 for(const shape of shapes)for(const closed of [false,true]){
  const look={...female,...shape},p=head.facePlate(look,closed),reference=head.facePlate({...look,presentation:'male'},closed);
  assert.deepEqual(p.bounds.slice(2),reference.bounds.slice(2),JSON.stringify({shape,closed}));
 }
});

test('every original female feature choice retains the head size and does not move the chin when blinking',()=>{
 for(const key of ['eyeShape','brows','nose','mouth','facialHair'])for(const value of LOOK_OPTIONS[key]){
  const look={...female,[key]:value},before=JSON.stringify(look),open=head.facePlate(look),closed=head.facePlate(look,true);
  assert.deepEqual(open.origin,closed.origin);
  assert.deepEqual(open.fit,head.facePlate({...look,facialHair:'none'}).fit);
  if(key!=='facialHair')assert.deepEqual(open.bounds.slice(2),head.facePlate({...look,presentation:'male'}).bounds.slice(2));
  assert.equal(JSON.stringify(look),before);
 }
});

test('all 49 female hairstyles fit without being cut off by the portrait plate',()=>{
 for(const hair of HAIR_STYLES)for(const face of ['oval','round','angular']){
  const look={...female,hair,face},p=head.plate(look),back=rearHead(head,look,createCanvas);
  assert.deepEqual(p.origin,head.facePlate(look).origin.map(n=>n+64));
  for(const plate of [p,back]){
   const d=pixels(plate.image),w=plate.image.width,h=plate.image.height;
   for(let x=0;x<w;x++)assert(d[x*4+3]<=32&&d[((h-1)*w+x)*4+3]<=32,hair+' vertical clipping');
   for(let y=0;y<h;y++)assert(d[(y*w)*4+3]<=32&&d[(y*w+w-1)*4+3]<=32,hair+' horizontal clipping');
  }
 }
});

test('all 29 costumes retain neck contact or their exact hood opening in every authored frame',async()=>{
 const engine=new CostumeEngine(options),hc=createCanvas(256,256).getContext('2d');
 let frames=0,covered=0,attached=0;const misses=[];
 for(const costume of COLLECTION){
  const id=costume.id;assert(await engine.preload(id),id+': '+engine.error);
  const loaded=engine.outfits.get(id),m=loaded.manifest;
  for(const [index,f]of m.frames.entries()){
   frames++;
   if(loaded.robot){
    assert.equal(m.head.mode,'enclosed');assert.equal(costume.unisex,true);covered++;continue;
   }
   if(costume.hideHair){
    const a=pixels(engine.compose(id,index,female)),b=pixels(engine.compose(id,index,{...female,presentation:'male'})),mask=pixels(engine.masks(id,index).mask);
    for(let i=0;i<a.length;i+=4)if(mask[i+3]===0)for(let k=0;k<4;k++)assert.equal(a[i+k],b[i+k],id+' changed outside opening '+index);
    covered++;continue;
   }
   let body;
   if(loaded.fashion)body=engine.frame(id,index,female);
   else if(loaded.approved){body=createCanvas(...m.cell);body.getContext('2d').drawImage(loaded.atlases[f.atlas||'default'],...f.rect,0,0,...m.cell);}
   else body=engine.masks(id,index).body;
   const b=pixels(body),anchor=f.faceAnchor||f.head,scale=loaded.fashion||loaded.approved?m.head.scale:.35;
   hc.clearRect(0,0,256,256);head.draw(hc,{...female,hair:'none'},anchor,scale);
   const h=hc.getImageData(0,0,256,256).data;let touching=0;
   for(let y=Math.max(0,Math.floor(anchor[1]-12));y<=Math.min(255,Math.ceil(anchor[1]+12));y++)for(let x=Math.max(0,Math.floor(anchor[0]-12));x<=Math.min(255,Math.ceil(anchor[0]+12));x++){
    const i=(y*256+x)*4;if(b[i+3]>=128&&h[i+3]>=128)touching++;
   }
   if(touching<2)misses.push(id+' frame '+index+' ('+touching+' pixels)');
   attached++;
  }
  engine.outfits.delete(id);engine.approved.outfits.delete(id);engine.composites.clear();engine.fashionFrames.clear();
 }
 assert.equal(COLLECTION.length,29);assert.deepEqual(misses,[]);
 console.log(JSON.stringify({costumes:29,frames,covered,attached}));
});

test('rendering existing female saves retains every appearance and progression field',()=>{
 for(const hair of HAIR_STYLES){
  const g=new Game();g.look={...female,hair};g.hero.level=25;g.hero.xp=81;g.hero.coins=5678;g.powers.data.points=24;
  const saved=g.save(),snapshot=decodeSave(saved),before=JSON.stringify(snapshot);
  head.plate(snapshot.look);head.facePlate(snapshot.look,true);rearHead(head,snapshot.look,createCanvas);
  assert.equal(JSON.stringify(snapshot),before);assert.equal(g.save(),saved);
  const restored=new Game({save:snapshot});assert.deepEqual(restored.look,snapshot.look);assert.equal(restored.hero.coins,5678);
 }
});
