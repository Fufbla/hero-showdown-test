import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const {createCanvas,loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {drawHero} from '../style-c-hero.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {HAIR_STYLES} from '../appearance.mjs';
import {STYLE_C_MOTIONS,motionFrameSample} from '../style-c-motion.mjs';
import {validateAsset} from '../cosmetics/assets.mjs';
const root=new URL('../cosmetics/',import.meta.url),catalog=JSON.parse(await fs.readFile(new URL('catalog.json',root)));
assert.equal(catalog.sets.length,36);
assert(await prepareStyleCMaterials({canvasFactory:createCanvas,imageLoader:u=>loadImage(fileURLToPath(u))}));
const canvas=createCanvas(480,500),c=canvas.getContext('2d'),views=['front','right','back','left'];
const evidence={outfits:0,animationFrames:0,individualPieceViews:0,hairstyleViews:0,views,errors:[]};
const sample=motionFrameSample('idle',0);
test.afterEach(()=>{if(global.gc)global.gc();});
for(const set of catalog.sets)test(set.name+' renders every animation key, individual piece, and hairstyle',async()=>{
 evidence.outfits++;assert(set.pieces.every(p=>p.assetManifest),set.id+' has unfinished artwork');
 const image=await loadImage(fileURLToPath(new URL(set.pieces[0].assetManifest.replace(/[^/]+$/, 'atlas.png'),root)));
 const layers=await Promise.all(set.pieces.map(async p=>{
  const manifest=JSON.parse(await fs.readFile(new URL(p.assetManifest,root)));
  assert.deepEqual(validateAsset(manifest),[],p.id);assert.equal(manifest.atlas.width,image.width);assert.equal(manifest.atlas.height,image.height);
  return {manifest,image};
 }));
 const draw=(look,hero,time,options,clothing)=>{
  c.clearRect(0,0,480,500);const before=JSON.stringify({look,hero});
  const result=drawHero(c,240,430,look,hero,time,2,{...options,clothing});
  // Flush the native canvas command buffer each frame, as a browser's paint
  // cycle does. Otherwise thousands of deferred draws retain every texture.
  c.getImageData(0,0,1,1);
  assert(result,'Actual hero renderer must return its pose');
  assert([...result.head,...result.hip,...result.arms.flat(2),...result.legs.flat(2)].every(Number.isFinite));
  assert.equal(JSON.stringify({look,hero}),before,'Rendering must not modify the saved hero');
 };
 for(const [motion,clip]of Object.entries(STYLE_C_MOTIONS))for(let key=0;key<clip.frames.length;key++)for(const view of views)for(const sex of ['male','female']){
  const {hero,time,options}=motionFrameSample(motion,key);
  draw({...styleCDefault(sex),cape:true},hero,time,{...options,view},layers);evidence.animationFrames++;
 }
 for(const part of layers)for(const view of views){draw(styleCDefault('female'),sample.hero,sample.time,{...sample.options,view},[part]);evidence.individualPieceViews++;}
 for(const hair of HAIR_STYLES)for(const view of views){draw({...styleCDefault('female'),hair},sample.hero,sample.time,{...sample.options,view},layers);evidence.hairstyleViews++;}
});
test.after(async()=>{
 await fs.writeFile(new URL('../../docs/cosmetics/evidence/'+(evidence.outfits===36?'collection-render-checks.json':'collection-render-filtered-checks.json'),import.meta.url),JSON.stringify({...evidence,note:'Render coverage is not a substitute for visual reference review or physical-device testing.'},null,2)+'\n');
 console.log(JSON.stringify(evidence));
});
