// Actual in-game canvas renderer, usable when browser/physical devices are absent.
// Install @napi-rs/canvas or use the Work runtime's provided dependency directory.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {MonsterAtlas,MONSTER_HEIGHT} from '../monster-art.mjs';
import {MONSTER_ANIMATIONS} from '../monster-animation-catalog.mjs';
import {Renderer} from '../renderer.mjs';
import {Game} from '../core.mjs';
const require=createRequire(import.meta.url);
let canvasModule;try{canvasModule=require('@napi-rs/canvas');}catch{canvasModule=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas');}
const {createCanvas,loadImage}=canvasModule;
globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return createCanvas(1,1);}};
const atlas=new MonsterAtlas({loadImages:false}),region=Number(process.argv[2]||1),types=Object.keys(MONSTER_ANIMATIONS).filter(k=>MONSTER_ANIMATIONS[k].region===region);
assert.equal(types.length,3,'complete region required');
const out=fileURLToPath(new URL(`./evidence/monster-sprites/region-${region}/`,import.meta.url));mkdirSync(out,{recursive:true});
let assertions=0;const check=(ok,msg)=>{assert.ok(ok,msg);assertions++;};
const bounds=(data,w,h)=>{let x0=w,y0=h,x1=-1,y1=-1,count=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++){if(data[(y*w+x)*4+3]>20){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);count++;}}return {x0,y0,x1,y1,count};};
for(const type of types){
 const meta=MONSTER_ANIMATIONS[type],image=await loadImage(fileURLToPath(new URL('../assets/monsters/'+meta.file,import.meta.url)));atlas.sources.set(type,{image,promise:Promise.resolve(true)});
 const manifest=JSON.parse(readFileSync(new URL(`../assets/monsters/animations/${type}/manifest.json`,import.meta.url)));
 for(const f of manifest.frames){
  const raw=await loadImage(fileURLToPath(new URL(`../assets/monsters/animations/${type}/${f.file}`,import.meta.url))),c=createCanvas(meta.cellWidth,meta.cellHeight),ctx=c.getContext('2d');ctx.drawImage(raw,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data,b=bounds(data,c.width,c.height);
  check(b.count>100,`${type}/${f.file}: complete silhouette`);check(b.x0>2&&b.x1<c.width-3&&b.y0>2&&b.y1<c.height-3,`${type}/${f.file}: transparent margins`);check(Math.abs(b.y1-meta.anchor[1])<3,`${type}/${f.file}: shared ground anchor`);
  check(data[3]===0&&data[(c.width*c.height-1)*4+3]===0,`${type}/${f.file}: transparent corners`);
 }
 const hashes=[];
 for(const night of [false,true]){
  const a=atlas.atlas(type,night),c=a.getContext('2d'),{w,h,columns,baseline}=atlas.cellFor(type);
  for(let f=0;f<meta.frameCount;f++){const data=c.getImageData(f%columns*w,Math.floor(f/columns)*h,w,h).data,b=bounds(data,w,h);check(b.count>100,`${type}: rendered frame ${f}`);check(b.x0>0&&b.x1<w-1&&b.y0>0&&b.y1<h-1,`${type}: rendered bounds ${f}`);check(Math.abs(b.y1-baseline)<3,`${type}: rendered feet ${f}`);hashes.push(createHash('sha256').update(data).digest('hex'));}
 }
 check(new Set(hashes.slice(0,meta.frameCount)).size===meta.frameCount,`${type}: distinct raster frames`);check(hashes[0]!==hashes[meta.frameCount],`${type}: night eyes preserved`);
}
const samples=[{state:'idle'},{state:'chase',walkCycle:.4},{state:'strike',age:.14},{state:'idle',flash:.07},{state:'dead',deadAge:.32}];
const gallery=createCanvas(1200,710),gc=gallery.getContext('2d');gc.fillStyle='#edf1e8';gc.fillRect(0,0,1200,710);gc.fillStyle='#17393b';gc.font='bold 24px sans-serif';gc.fillText(`Region ${region} — actual game sprites`,28,38);
['Idle','Movement','Attack','Hit','Defeat'].forEach((name,i)=>{gc.font='16px sans-serif';gc.fillText(name,i*240+85,76);});
for(const [i,type]of types.entries())for(const [j,sample]of samples.entries()){
 const x=j*240+120,y=244+i*210;gc.strokeStyle='#a1b3aa';gc.beginPath();gc.moveTo(x-95,y);gc.lineTo(x+95,y);gc.stroke();gc.save();gc.translate(x,y);gc.scale(1.9,1.9);const e=Object.freeze({type,id:0,...sample});const before=JSON.stringify(e);atlas.draw(gc,e,.3,false);check(JSON.stringify(e)===before,'renderer purity');gc.restore();gc.fillStyle='#17393b';gc.font='14px sans-serif';gc.textAlign='center';gc.fillText(MONSTER_ANIMATIONS[type].name,x,y+25);gc.textAlign='start';
}
writeFileSync(out+'gallery.png',gallery.toBuffer('image/png'));
// Use Renderer.enemy itself on all four elevated levels, in both viewports.
for(const [label,w,h] of [['desktop',1280,720],['mobile',390,844]]){
 const canvas=createCanvas(w,h),c=canvas.getContext('2d');c.fillStyle='#b7dedb';c.fillRect(0,0,w,h);const renderer={c,monsterAtlas:atlas,night:false};const g=new Game();g.travel(region);
 for(let tier=1;tier<=4;tier++){
  const surface=g.surfaces.find(s=>s.id===`climb-0-${tier}`);check(!!surface,'four elevated levels retained');const y=h-60-(tier-1)*(h-145)/4;c.fillStyle='#376a5a';c.fillRect(15,y,w-30,14);
  for(const [i,type] of types.entries()){
   const e=g.makeEnemy(type,surface.x+50+i*50,surface.id,20);const snapshot=JSON.stringify(e);const view={...e,x:w*(i+1)/4,prevX:w*(i+1)/4,y,prevY:y,state:'chase',walkCycle:.2*i};Renderer.prototype.enemy.call(renderer,view,.25,1);check(JSON.stringify(e)===snapshot,'platform render preserves real enemy');
  }
  c.fillStyle='#17393b';c.font='13px sans-serif';c.fillText(`Platform ${tier}`,20,y+31);
 }
 writeFileSync(out+label+'-platforms.png',canvas.toBuffer('image/png'));
}
check(atlas.entries.size<=6,'bounded atlas cache');
const result={region,monsters:types,frames:types.reduce((n,t)=>n+MONSTER_ANIMATIONS[t].frameCount,0),assertions,passed:true,textureBytes:atlas.textureBytes,viewports:[[1280,720],[390,844]],renderer:'@napi-rs/canvas using actual MonsterAtlas and Renderer.enemy',browser:'Not run by this raster test; see separate browser evidence.',physicalDevices:'Not tested'};
writeFileSync(out+'raster-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));atlas.destroy();
