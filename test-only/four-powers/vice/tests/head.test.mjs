import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {ViceHead,VICE_HEAD_SIZE,VICE_HEAD_PADDING,VICE_HEAD_CACHE_LIMIT} from '../head.mjs';
import {HAIR_STYLES} from '../../../../royale/appearance.mjs';
import {styleCDefault} from '../../../../royale/style-c-defaults.mjs';

const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const options={canvasFactory:createCanvas,imageLoader:url=>loadImage(fileURLToPath(url))};
const pixels=canvas=>canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
const head=new ViceHead(options);
const manifest=JSON.parse(await readFile(new URL('../assets/manifest.json',import.meta.url)));
assert(await head.preload(manifest.headgear),head.error);

test('The cap removes only crown hair and retains the lower portions of all 49 saved hair choices',()=>{
 assert.equal(new Set(HAIR_STYLES).size,49);
 let checked=0,retained=0;
 for(const presentation of ['male','female'])for(const hair of HAIR_STYLES){
  const look={...styleCDefault(presentation),hair,hairColor:'#743ca5'},before=structuredClone(look);
  const layers=head.layers(look),cuts=layers.geometry.crownCutY;
  assert.equal(cuts.length,VICE_HEAD_SIZE);assert(cuts.every(cut=>cut>0&&cut<VICE_HEAD_SIZE));
  assert(new Set(cuts).size>8,'The hair boundary must follow the cap instead of using a flat cutoff');assert.deepEqual(look,before);
  for(const [raw,clipped]of [[layers.rawRear,layers.rear],[layers.rawFront,layers.front]]){
   const a=pixels(raw),b=pixels(clipped);let lower=0;
   for(let y=0;y<VICE_HEAD_SIZE;y++)for(let x=0;x<VICE_HEAD_SIZE;x++){
    const i=(y*VICE_HEAD_SIZE+x)*4;
    if(y<cuts[x])assert.equal(b[i+3],0,presentation+' '+hair+' crown');
    else {assert.equal(b[i+3],a[i+3],presentation+' '+hair+' lower alpha');if(a[i+3]>64){lower++;for(let k=0;k<3;k++)assert(Math.abs(a[i+k]-b[i+k])<=1,presentation+' '+hair+' lower color');}}
   }
   retained+=lower;
  }
  const clean=head.geometry({...look,hair:'none'});assert.deepEqual(layers.geometry,clean,'Hair must not move the cap or glasses');
  checked++;
 }
 assert.equal(checked,98);assert(retained>1000,'Lower hair must remain visible beneath the cap');
});

test('Vice preserves the original customized face plate and chin attachment, including skin and facial hair',()=>{
 for(const presentation of ['male','female'])for(const closed of [false,true])for(const facialHair of ['none','beard']){
  const look={...styleCDefault(presentation),skin:'#398f67',eyes:'#5423e8',hair:'long-wavy',hairColor:'#943d20',
   face:'angular',jaw:1.12,eyeShape:'wide',nose:'broad',mouth:'full',facialHair};
  const before=structuredClone(look),layers=head.layers(look,{closed}),original=head.base.facePlate(look,closed);
  const actual=layers.face.getContext('2d').getImageData(VICE_HEAD_PADDING,VICE_HEAD_PADDING,256,256).data;
  assert.deepEqual(actual,pixels(original.image));
  assert.deepEqual(layers.origin,original.origin.map(value=>value+VICE_HEAD_PADDING));assert.deepEqual(look,before);
  const natural=head.geometry({...look,facialHair:'none'});assert.deepEqual(layers.geometry,natural,'A beard must not move the headwear');
 }
});

test('Sunglasses cover both rendered iris anchors for male and female face and eye variations',()=>{
 for(const presentation of ['male','female'])for(const [age,face,eyeShape,jaw]of [
  ['teen','oval','almond',.85],['young','round','round',1],['older','angular','wide',1.15]]){
  const look={...styleCDefault(presentation),age,face,eyeShape,jaw,skin:'#c88e63',eyes:'#1873c4',hair:'none'};
  const layers=head.layers(look),g=layers.geometry,glass=pixels(layers.glasses);
  assert(g.capSeatY<g.eyeLine,'Cap must sit above the eyes');
  const eyeMid=g.eyes[0].map((v,i)=>(v+g.eyes[1][i])/2),lensMid=g.lensEyes[0].map((v,i)=>(v+g.lensEyes[1][i])/2);
  assert(Math.hypot(eyeMid[0]-lensMid[0],eyeMid[1]-lensMid[1])<1e-6,'The frame must stay centered on the customized eyes');
  for(let n=0;n<2;n++){
   const [x,y]=g.eyes[n].map(Math.floor);assert(glass[(y*VICE_HEAD_SIZE+x)*4+3]>128,presentation+' '+eyeShape+' uncovered iris '+n);
  }
  assert(g.glassesRect[1]+g.glassesRect[3]<g.skullBounds[1]+g.skullBounds[3]*.95,'Glasses must leave the chin visible');
 }
});

test('Skin and hair colors leave cap and glasses artwork unchanged while lower hair retains its own color',()=>{
 const a={...styleCDefault('female'),hair:'long-straight',skin:'#5a3621',hairColor:'#6228bd'};
 const b={...a,skin:'#eed2aa',hairColor:'#d25724'};
 const first=head.layers(a),second=head.layers(b);
 assert.deepEqual(pixels(first.cap),pixels(second.cap));assert.deepEqual(pixels(first.glasses),pixels(second.glasses));
 assert.notDeepEqual(pixels(first.face),pixels(second.face));assert.notDeepEqual(pixels(first.rear),pixels(second.rear));
 for(const hair of HAIR_STYLES)head.plate({...a,hair});assert(head.cache.size<=VICE_HEAD_CACHE_LIMIT);
});

test('Missing or malformed headwear fails cleanly and a later valid preload can retry',async()=>{
 let offline=true;
 const retry=new ViceHead({...options,imageLoader:async url=>{if(offline&&url.pathname.endsWith('/glasses.png'))throw Error('offline');return options.imageLoader(url);}});
 assert.equal(await retry.preload(),false);assert.equal(retry.ready,false);assert.equal(retry.pending,null);
 const canvas=createCanvas(256,256);assert.equal(retry.draw(canvas.getContext('2d'),styleCDefault('male'),[128,200,0],.4),false);
 assert.equal(pixels(canvas).some(value=>value!==0),false);
 offline=false;assert(await retry.preload(),retry.error);
 for(const headgear of [
  {cap:'cap.png',glasses:'glasses.png',capFit:{crown:[-1,0,30,30]}},
  {cap:'cap.png',glasses:'glasses.png',capFit:{width:0}},
  {cap:'cap.png',glasses:'glasses.png',capFit:{seatAboveEyes:NaN}},
  {cap:'cap.png',glasses:'glasses.png',glassesFit:{eyes:[[-100,10],[100000,10]]}}
 ]){
  const invalid=new ViceHead(options);assert.equal(await invalid.preload(headgear),false,'Invalid registration must fail before drawing');
  assert.equal(invalid.ready,false);assert.equal(invalid.pending,null);assert(await invalid.preload(),invalid.error);
 }
});
