// Run "node --expose-gc tests/style-c-final-capture.mjs" from royale. --audit or --gallery
// runs only one part. --out=PATH keeps trial captures outside the repository.
import {createRequire} from 'node:module';
import {copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawn, spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {drawHero} from '../hero-art.mjs';
import {configureStyleC} from '../style-c-hero.mjs';
import {prepareStyleCMaterials} from '../style-c-materials.mjs';
import {styleCDefault} from '../style-c-defaults.mjs';
import {STYLE_C_MOTIONS,motionFrameSample,styleCMotionStatus} from '../style-c-motion.mjs';
import {styleCHairStatus} from '../style-c-hair.mjs';
import {styleCFaceStatus} from '../style-c-face.mjs';
import {styleCEquipmentStatus} from '../style-c-equipment.mjs';
import {turnaroundStatus} from '../style-c-turnaround.mjs';
import {styleCBodyStatus} from '../style-c-body.mjs';
import {defaultSpriteStatus} from '../style-c-sprites.mjs';
import {previewHero, PREVIEW_POSES} from '../hero-rig.mjs';
import {LOOK_OPTIONS, LOOK_RANGES, COLOR_FIELDS, HAIR_STYLES, sanitizeLook} from '../appearance.mjs';
import {Game, STEP, decodeSave} from '../core.mjs';
import {Renderer} from '../renderer.mjs';
import {EQUIPMENT, equipmentOutfit} from '../equipment.mjs';
import {COSTUME_PARTS} from '../costume-catalog.mjs';
import {LEGENDARY_IDS} from '../legendary-data.mjs';
import {matchingMerge} from '../legendary-state.mjs';
import {MONSTER_ANIMATIONS} from '../monster-animation-catalog.mjs';
import {legendaryGame, ownMerge} from './legendary-fixture.mjs';
import {ART_VIEWS, PRESENTATIONS, KIT_LABELS, regionalKits, lookFor, outfitFor, inventoryFor, mergePieces, title} from './style-c-final-fixtures.mjs';

const {createCanvas, loadImage, clearAllCache} = createRequire(import.meta.url)('@napi-rs/canvas');
globalThis.document = {createElement:() => createCanvas(1,1)};
globalThis.window = {devicePixelRatio:1};
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
const options = {canvasFactory:createCanvas, imageLoader:u => loadImage(fileURLToPath(u))};
const root = fileURLToPath(new URL('../',import.meta.url));
function renderInputDigest() {
  const files = ['hero-rig.mjs','hero-art.mjs','renderer.mjs','appearance.mjs','core.mjs','equipment.mjs','journey.mjs','legendary-state.mjs',
    ...readdirSync(root).filter(name=>/^style-c-.*\.mjs$/.test(name))];
  function addFiles(directory) {
    for (const entry of readdirSync(join(root,directory),{withFileTypes:true})) {
      if (entry.name.startsWith('.')) continue;
      const name=directory+'/'+entry.name;
      if (entry.isDirectory()) addFiles(name);
      else files.push(name);
    }
  }
  addFiles('assets/hero/style-c-accurate');
  const digest=createHash('sha256');
  for (const path of files.sort()) digest.update(path).update('\0').update(readFileSync(join(root,path))).update('\0');
  return digest.digest('hex');
}
const inRepo = fileURLToPath(new URL('../qa/style-c/system/final/',import.meta.url));
const argument = process.argv.find(a => a.startsWith('--out='));
const out = argument ? resolve(argument.slice(6)) : inRepo;
mkdirSync(out,{recursive:true});
// File synchronization observes final names. Complete images and the encoded
// film privately before replacing their published pathname.
const staging = mkdtempSync(join(tmpdir(),'royale-style-c-evidence-'));
function publish(name) {
  const source = join(staging,name), dest = join(out,name);
  try { renameSync(source,dest); }
  catch (error) {
    if (error.code !== 'EXDEV') throw error;
    const adjacent = dest+'.writing-'+process.pid;
    copyFileSync(source,adjacent); renameSync(adjacent,dest);
  }
}
function saveAsset(name,bytes) {
  writeFileSync(join(staging,name),bytes);
  publish(name);
}

configureStyleC({makeCanvas:createCanvas});
if (!await prepareStyleCMaterials(options)) throw Error('Game hero materials did not load.');

const views = ART_VIEWS.map(([id]) => id);
const referenceBox = {male:[435,250,289,345,632], female:[778,250,246,345,940]};
const timing = {punch:.085, 'air-punch':.085, strength:.085, kick:.135, 'air-kick':.135, superKick:.135,
  jump:.17, 'double-jump':.19, hurt:.085, knockback:.12, turn:.09, defeat:.46, respawn:.29};
function draw(c, x, y, l, {state='idle', at=timing[state] ?? .175, view='game', scale=1, outfit=outfitFor('starter'), owner}={}) {
  const h = previewHero(state,at);
  return drawHero(c,x,y,l,h,at,scale,{view,outfit,artState:owner});
}

const press = createCanvas(280,244), plate = press.getContext('2d',{willReadFrequently:true});
const findings = new Map();
let assertions = 0, rasters = 0;
function check(ok,section,example) {
  assertions++;
  if (!ok) {
    const row = findings.get(section) || {count:0,examples:[]};
    row.count++;
    if (row.examples.length<12) row.examples.push(example);
    findings.set(section,row);
  }
}
function raster(look, {state='idle', at=timing[state] ?? .175, view='game', outfit=outfitFor('starter'), face=1, sample}={}) {
  if (rasters && rasters % 96===0) {
    press.width=press.width;
    clearAllCache();
    globalThis.gc?.();
  }
  plate.clearRect(0,0,press.width,press.height);
  const h = sample?.hero || previewHero(state,at); h.face = face;
  if (sample) at=sample.time;
  if (h.attack) h.attack.face = face;
  const before = JSON.stringify([look,h,outfit]);
  const pose = drawHero(plate,140,196,look,h,at,1.18,{view,outfit,...sample?.options});
  const context = [look.presentation,look.hair,look.build,state,view,Object.keys(outfit.pieces||{}).join(',')].join('/');
  check(JSON.stringify([look,h,outfit])===before,'renderer mutated a look, outfit or gameplay state',context);
  check(pose && [pose.head,...pose.arms.flat(),...pose.legs.flat()].every(p=>p?.length===2&&p.every(Number.isFinite)),'invalid attachment coordinates',context);
  const pixels = plate.getImageData(0,0,press.width,press.height).data;
  let ink=0, edge=0, green=0;
  for (let i=3;i<pixels.length;i+=4) {
    if (pixels[i]<12) continue;
    ink++;
    if (pixels[i-2] > 1.4*pixels[i-3] && pixels[i-2] > 1.18*pixels[i-1] && pixels[i-2] > 90) green++;
    const pixel=(i-3)/4, x=pixel%press.width, y=Math.floor(pixel/press.width);
    if (!x || !y || x===press.width-1 || y===press.height-1) edge++;
  }
  check(ink>200 && !edge,'invisible or clipped sprite',{context,ink,edge});
  rasters++;
  return {hash:createHash('sha256').update(pixels).digest('hex'),green,ink,clip:pose?.clip,frame:pose?.frame};
}
function referenceFrame(sex) {
  const [left,top,width,height,origin] = referenceBox[sex], canvas=createCanvas(width,height);
  draw(canvas.getContext('2d'),origin-left,590-top,styleCDefault(sex),{view:'front',at:0,scale:1/.35});
  return canvas;
}
async function referenceMetrics(sex) {
  const now = referenceFrame(sex), width=now.width, height=now.height;
  const then = createCanvas(width,height), before=then.getContext('2d');
  before.drawImage(await options.imageLoader(new URL('../qa/style-c/emergency/'+sex+'-default.png',import.meta.url)),0,0);
  const a=now.getContext('2d').getImageData(0,0,width,height).data, b=before.getImageData(0,0,width,height).data;
  const [left,top]=referenceBox[sex], source=await options.imageLoader(new URL('../assets/hero/style-c-accurate/reference.jpeg',import.meta.url));
  before.clearRect(0,0,width,height); before.drawImage(source,left,top,width,height,0,0,width,height);
  const original=before.getImageData(0,0,width,height).data;
  let overlap=0, union=0, interior=0, exact=0, near=0, rgbaExact=0, sourceExact=0, sourceNear=0;
  for(let i=0;i<a.length;i+=4) {
    const one=a[i+3]>32, two=b[i+3]>32;
    if(one && two) overlap++;
    if(one || two) union++;
    if(one && two && a[i]===b[i] && a[i+1]===b[i+1] && a[i+2]===b[i+2] && a[i+3]===b[i+3]) rgbaExact++;
    if(a[i+3]<250 || b[i+3]<250) continue;
    interior++;
    const distance=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]));
    if(!distance) exact++;
    if(distance<=2) near++;
    const originalDistance=Math.max(Math.abs(a[i]-original[i]),Math.abs(a[i+1]-original[i+1]),Math.abs(a[i+2]-original[i+2]));
    if(!originalDistance) sourceExact++;
    if(originalDistance<=2) sourceNear++;
  }
  const metrics={opaqueInterior:interior,identicalInteriorRgb:exact/interior,withinTwoRgb:near/interior,silhouetteIoU:overlap/union,identicalVisibleRgba:rgbaExact/union,originalReferenceRgbExact:sourceExact/interior,originalReferenceWithinTwoRgb:sourceNear/interior};
  check(metrics.withinTwoRgb>=.99 && metrics.originalReferenceWithinTwoRgb>=.99 && metrics.silhouetteIoU>=.985,'protected standing reference drift',{sex,...metrics});
  return metrics;
}
function checkLookChanges(sex) {
  const base = styleCDefault(sex);
  for (const [field,values] of Object.entries({...LOOK_OPTIONS, ...LOOK_RANGES, cape:[false,true]})) {
    if (field==='presentation' || field==='hair') continue;
    const unique = new Set(), options = [...new Set([base[field],...values])];
    for(const value of options) {
      const look=sanitizeLook({...base,[field]:value});
      const {hash}=raster(look);
      check(!unique.has(hash),'appearance choice produced duplicate artwork',{sex,field,value});
      unique.add(hash);
      const loaded=decodeSave(new Game({look}).save());
      check(loaded?.look[field]===value,'appearance option failed save roundtrip',{sex,field,value});
    }
  }
  for(const field of COLOR_FIELDS) {
    const a=raster(base), changed=sanitizeLook({...base,[field]:'#69bd96'}), b=raster(changed);
    check(a.hash!==b.hash,'selected color did not alter visible pixels',{sex,field});
    check(decodeSave(new Game({look:changed}).save())?.look[field]===changed[field],'color failed save roundtrip',{sex,field});
  }
  for(const view of ['front','side','back']) {
    const ids=new Set();
    for(const hair of HAIR_STYLES) {
      const look={...base,hair}, {hash}=raster(look,{view});
      check(!ids.has(hash),'distinct hairstyles rendered identically',{sex,view,hair});
      ids.add(hash);
      if(view==='front') check(decodeSave(new Game({look}).save())?.look.hair===hair,'hairstyle failed save roundtrip',{sex,hair});
    }
  }
  for(const hair of HAIR_STYLES) for(const build of LOOK_OPTIONS.build) for(const view of views) {
    raster({...base,hair,build},{view,state:'run'});
  }
  const standalone=['front','side','back'].map(view=>raster(base,{view,at:0}).hash);
  check(new Set(standalone).size===3,'front, side and back collapse to the same artwork',sex);
}
function checkGameplayParity() {
  const baseline = styleCDefault('male');
  const project = g => JSON.stringify({
    position:[g.hero.x,g.hero.y,g.hero.vx,g.hero.vy], hitbox:[g.hero.w,g.hero.h],
    health:[g.hero.hp,g.hero.maxHp], progress:[g.hero.level,g.hero.xp,g.hero.coins],
    attack:g.hero.attack, cooldowns:g.powers.cooldowns,
    enemies:g.enemies.map(e => [e.id,e.x,e.y,e.hp,e.state])
  });
  const start = look => new Game({look,random:()=>.375,now:()=>12000});
  for (const [sex] of PRESENTATIONS) for (const build of LOOK_OPTIONS.build) {
    const changed = {...lookFor(sex,'custom'),build};
    for (const [key,range] of Object.entries(LOOK_RANGES)) changed[key]=range[(build==='strong'||build==='full')?1:0];
    const a=start(baseline), b=start(changed);
    for(let tick=0;tick<180;tick++) {
      const input={move:tick<120?1:-1,run:true,jump:tick===13||tick===34,punchHeld:tick>=100&&tick<115,kickHeld:tick>=140&&tick<154};
      a.step(STEP,input); b.step(STEP,input);
      if(tick%30===29) check(project(a)===project(b),'cosmetic options changed simulation or collision',{sex,build,tick});
    }
  }
}
function checkSavedEquipment() {
  const g = legendaryGame(null);
  ownMerge(g,'lightning'); ownMerge(g,'sonic');
  if(!g.treeVisit) g.visitTree();
  g.paused=true;
  const get = id => g.inventory.items.find(item=>item.catalogId===id)?.uid;
  for(const id of mergePieces('lightning')) check(g.equipItem(get(id)),'full set could not be equipped',id);
  check(g.mergeAbility()?.id==='lightning','full worn set failed to unlock fourth slot','lightning');
  let loaded=decodeSave(g.save());
  check(loaded?.legendary.active==='lightning','full set failed save roundtrip','lightning');
  const swap='merge-sonic-chest';
  check(g.equipItem(get(swap)),'mixed piece could not equip',swap);
  loaded=decodeSave(g.save());
  check(loaded && !loaded.legendary.active && !g.mergeAbility(),'mixed set retained fourth slot',swap);
  if(loaded) {
    const resumed=new Game({save:loaded});
    check(resumed.visualOutfit().pieces.chest?.id===swap,'mixed set failed save roundtrip',swap);
  }
  const one = new Game({look:styleCDefault('male')});
  const legacyIds=['r1-ordinary-gloves','r1-ordinary-belt','r1-ordinary-cape','r1-ordinary-emblem','r1-ordinary-mask','r1-ordinary-suit','r1-ordinary-boots'];
  one.inventory=inventoryFor(legacyIds); one.inventory.equipped={}; one.paused=true;
  for(const part of one.inventory.items) {
    const def=EQUIPMENT[part.catalogId];
    one.visualOutfit();
    check(one.equipItem(part.uid),'legacy item could not be equipped',part.catalogId);
    check(one.visualOutfit().pieces[def.part]?.id===part.catalogId,'normal game cached stale just-equipped appearance',part.catalogId);
    check(one.equipItem(part.uid),'legacy item could not be removed',part.catalogId);
    check(!one.visualOutfit().pieces[def.part],'normal game cached stale just-removed appearance',part.catalogId);
  }
}
function checkGear() {
  const plain = Object.fromEntries(PRESENTATIONS.map(([sex]) => [sex,raster(styleCDefault(sex)).hash]));
  for(const item of Object.values(EQUIPMENT)) {
    const outfit=equipmentOutfit(inventoryFor([item.id]));
    for(const [sex] of PRESENTATIONS) {
      const base=styleCDefault(sex), dressed=raster(base,{outfit});
      check(plain[sex]!==dressed.hash,'individual equipped item is invisible',{sex,item:item.id});
      for(const [i,build] of LOOK_OPTIONS.build.entries()) {
        raster({...base,build},{outfit,view:views[(i+1)%views.length],state:i%2?'kick':'run'});
      }
    }
  }
  const choices=[null,...LEGENDARY_IDS], greenBands={};
  let combo=0;
  for(const helmet of choices) for(const chest of choices) for(const boots of choices) {
    const ids = [helmet,chest,boots].flatMap((set,i)=>set?['merge-'+set+'-'+COSTUME_PARTS[i]]:[]);
    const inventory = inventoryFor(ids), outfit=equipmentOutfit(inventory);
    const eligible = !!helmet && helmet===chest && chest===boots;
    check(matchingMerge(inventory,99)===(eligible?helmet:null),'incorrect merge entitlement',ids);
    check(matchingMerge(inventory,98)===null,'early merge entitlement',ids);
    for(const [i,[sex]] of PRESENTATIONS.entries()) {
      const look={...styleCDefault(sex),build:LOOK_OPTIONS.build[(combo+i)%4]};
      const result=raster(look,{outfit,view:'game',state:combo%2?'kick':'idle'});
      if(ids.length===1) {
        greenBands[sex+':'+ids[0]]=result.green;
        check(result.green>=5,'single Merge piece had no visible green pixels',{sex,id:ids[0],green:result.green});
      }
    }
    combo++;
  }
  return {assignments:combo, singlePieceGreenPixels:greenBands};
}
function checkEquipmentPairs(first,last) {
  // Each pair of columns in this affine plane contains every ordered pair
  // exactly once before the unused suffixes are collapsed to an empty slot.
  const names=['head','torso','gloves','boots','belt','cape','emblem'], prime=41;
  const groups=names.map(() => [null]);
  for(const item of Object.values(EQUIPMENT)) {
    const slot={helmet:'head',mask:'head',chest:'torso',suit:'torso'}[item.part] || item.part;
    groups[names.indexOf(slot)].push(item.id);
  }
  if(groups.some(group=>group.length>prime)) throw Error('Increase the covering-array prime for the expanded equipment catalog.');
  const observed=new Set();
  let possible=0;
  for(let i=0;i<groups.length;i++) for(let j=i+1;j<groups.length;j++) possible+=groups[i].length*groups[j].length;
  for(let a=first;a<last;a++) for(let b=0;b<prime;b++) {
    const ids=groups.map((group,i)=>group[(a+b*i)%prime] || null);
    const selected=ids.filter(Boolean), outfit=equipmentOutfit(inventoryFor(selected));
    for(const id of selected) {
      const item=EQUIPMENT[id];
      check(outfit.pieces[item.part]?.id===id,'explicit worn item hidden by a generated slot alias',{id,selected});
    }
    for(let i=0;i<groups.length;i++) for(let j=i+1;j<groups.length;j++) observed.add(i+'/'+(ids[i]||'-')+' '+j+'/'+(ids[j]||'-'));
    for(const [i,[sex]] of PRESENTATIONS.entries()) {
      const look={...styleCDefault(sex),build:LOOK_OPTIONS.build[(a+b+i)%4]};
      raster(look,{state:b%2?'idle':'run',view:views[(a+b)%views.length],outfit});
    }
  }
  return {rows:(last-first)*prime,observed:[...observed],possible,slots:names,choicesIncludingEmpty:groups.map(v=>v.length)};
}
function pairwiseBatches() {
  // Skia's native scratch caches are much larger than the JavaScript heap
  // when thousands of distinct outfits are rendered in quick succession.
  // Run small sequential slices and merge their independently checked pairs.
  const covered = new Set();
  let rows=0, result;
  for (let first=0;first<41;first++) {
    const end=first+1, run=spawnSync(process.execPath,[
      '--expose-gc',fileURLToPath(import.meta.url),'--out='+out,'--pair-range='+first+'-'+end
    ],{encoding:'utf8',maxBuffer:4*1024*1024});
    if(run.status!==0) throw Error('Equipment batch '+first+'–'+end+' failed. '+(run.stderr||run.error||run.signal));
    const batch=JSON.parse(run.stdout);
    result=batch.coverage; rows+=result.rows;
    for(const key of result.observed) covered.add(key);
    rasters+=batch.rasters; assertions+=batch.assertions;
    for(const [key,entry] of Object.entries(batch.findings)) {
      const combined=findings.get(key)||{count:0,examples:[]};
      combined.count+=entry.count;
      combined.examples.push(...entry.examples.slice(0,12-combined.examples.length));
      findings.set(key,combined);
    }
  }
  check(covered.size===result.possible,'incomplete catalog pairwise coverage',{possible:result.possible,seen:covered.size});
  return {rows,distinctPairs:covered.size,slots:result.slots,choicesIncludingEmpty:result.choicesIncludingEmpty};
}

function motionChecks() {
  const counts={};
  for(const [sex] of PRESENTATIONS) {
    const clips={};
    for(const state of PREVIEW_POSES) {
      const frames=new Set(), look=styleCDefault(sex);
      for(const at of [0,.035,.07,.105,.15,.185,.23,.295,.38,.505,.68]) {
        frames.add(raster(look,{state,at}).hash);
      }
      const keys=STYLE_C_MOTIONS[state], authoredHashes=new Set();
      if (keys) for (const [i] of keys.frames.entries()) {
        const picture = raster(look,{state,sample:motionFrameSample(state,i)});
        check(picture.clip===state && picture.frame===i,'authored animation key did not reach renderer',{sex,state,key:i,actual:[picture.clip,picture.frame]});
        authoredHashes.add(picture.hash);
      }
      clips[state]={sampledFrames:frames.size,authoredKeys:keys?.frames.length || 0,distinctAuthoredPictures:authoredHashes.size};
      check(authoredHashes.size>=2,'authored track produced only one picture',{sex,state,distinct:authoredHashes.size});
      check(frames.size>=2,'motion clip has only one sampled raster frame',{sex,state});
      for(const [i,view] of views.entries()) raster(lookFor(sex,'custom'),{state,view,face:i%2?-1:1,outfit:outfitFor(i%2?'partial':'rare')});
    }
    counts[sex]=clips;
  }
  return counts;
}
async function audit() {
  const inputSha256=renderInputDigest();
  const materials={body:styleCBodyStatus(),hair:styleCHairStatus(),face:styleCFaceStatus(),motion:styleCMotionStatus(),equipment:styleCEquipmentStatus(),turnarounds:turnaroundStatus()};
  for(const [category,status] of Object.entries(materials)) check(status.ready,'required modular atlas did not preload',{category,status});
  const sheets=defaultSpriteStatus();
  check(sheets.expectedPages>0 && sheets.pages===sheets.expectedPages,'full-body runtime atlas pages did not preload',sheets);
  const pairs=pairwiseBatches();
  console.log('Checked all '+pairs.distinctPairs+' legal equipment-slot pairs on both heroes.');
  const references={};
  for(const [sex] of PRESENTATIONS) references[sex]=await referenceMetrics(sex);
  for(const [sex] of PRESENTATIONS) checkLookChanges(sex);
  console.log('Checked both presentations, appearance settings and directions.');
  const gear=checkGear();
  console.log('Checked catalog and all 729 Merge slot configurations.');
  checkSavedEquipment();
  checkGameplayParity();
  const sampledFrames=motionChecks();
  check(PREVIEW_POSES.length===25 && PREVIEW_POSES.includes('turn') && PREVIEW_POSES.includes('knockback'),'incomplete 25-state roster',PREVIEW_POSES);
  check(inputSha256===renderInputDigest(),'renderer input files changed during this run','Repeat the audit against the settled assets.');
  const report={
    passed:!findings.size, inputSha256,
    coverage:{presentations:PRESENTATIONS.length,builds:LOOK_OPTIONS.build.length,hairstyles:HAIR_STYLES.length,
      poses:PREVIEW_POSES.length,authoredKeysPerPresentation:Object.values(STYLE_C_MOTIONS).reduce((sum,clip)=>sum+clip.frames.length,0),views:views.length,catalogItems:Object.keys(EQUIPMENT).length,regionalWardrobes:regionalKits.length,
      mergeAssignments:gear.assignments,wornOutfitRows:pairs.rows,equipmentPairs:pairs.distinctPairs,rasters,assertions,enumFields:Object.keys(LOOK_OPTIONS),shapeSliders:Object.keys(LOOK_RANGES),colorFields:COLOR_FIELDS},
    materials,sheets,references,sampledFrames,apparelCoverage:pairs,singlePieceGreenPixels:gear.singlePieceGreenPixels,findings:Object.fromEntries(findings),
    scope:'Native canvas via the public hero renderer. Discrete values, extremal sliders, representative valid colors, five views, each individual catalog item, all pairs of legal equipment-slot choices, both heroes on all 729 empty/eight-set Merge assignments, save reloads and gameplay guards. The test checks renderer output, not physical-device frame rate or artistic approval.'
  };
  saveAsset('verification.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,rasters,assertions,issues:[...findings].map(([key,v])=>[key,v.count])}));
  if(!report.passed) process.exitCode=1;
}

const ink='#1a373b', secondary='#466365', line='#b4c2b5', paper='#e8ebdf';
function label(c,text,x,y,size=14,color=ink,bold=false,align='left') {
  c.fillStyle=color; c.font=(bold?'bold ':'')+size+'px sans-serif'; c.textAlign=align; c.fillText(text,x,y);
}
function rule(c,x1,y,x2) { c.strokeStyle=line; c.lineWidth=1; c.beginPath(); c.moveTo(x1,y+.5); c.lineTo(x2,y+.5); c.stroke(); }
function board(width,height,heading,sub) {
  const canvas=createCanvas(width,height), c=canvas.getContext('2d');
  c.fillStyle=paper; c.fillRect(0,0,width,height);
  label(c,heading,24,35,25,ink,true); label(c,sub,25,59,14,secondary); rule(c,24,72,width-24);
  return {canvas,c};
}
function imageFile(name,canvas) { saveAsset(name+'.webp',canvas.toBuffer('image/webp',88)); }
async function standingSheet() {
  const {canvas,c}=board(1200,385,'Standing reference','Original source and live renderer with matching scale and registration.');
  const ref=await options.imageLoader(new URL('../assets/hero/style-c-accurate/reference.jpeg',import.meta.url));
  for(const [i,[sex,name]] of PRESENTATIONS.entries()) {
    const [left,top,w,h]=referenceBox[sex], actual=referenceFrame(sex), scale=.74;
    for(let col=0;col<2;col++) {
      const center=(i*2+col+.5)*300, x=center-w*scale/2;
      if(col===0) c.drawImage(ref,left,top,w,h,x,85,w*scale,h*scale);
      else c.drawImage(actual,x,85,w*scale,h*scale);
      label(c,name+' · '+(col?'In game':'Reference'),center,366,16,ink,true,'center');
    }
  }
  imageFile('standing-reference',canvas);
}
function headCrop(look,view='front') {
  const size=430, tmp=createCanvas(size,size), c=tmp.getContext('2d');
  const x=217,y=366,scale=2.4;
  const pose=draw(c,x,y,look,{view,at:0,scale});
  const centerX=x+pose.head[0]*scale,centerY=y+pose.head[1]*scale;
  // About one full head including voluminous styles and the top of the shoulder.
  return {image:tmp,rect:[centerX-104,centerY-123,208,189]};
}
function hairSheets() {
  for(const [key,view] of [['front','front'],['side','side'],['back','back']]) {
    const sheet=board(1470,84+Math.ceil(HAIR_STYLES.length/7)*151,'Hairstyles · '+title(key),
      'Each pair uses the same saved hairstyle on Guardian (left) and Sentinel (right).');
    HAIR_STYLES.forEach((hair,i)=>{
      const x=(i%7)*210,y=85+Math.floor(i/7)*151;
      for(const [j,[sex]] of PRESENTATIONS.entries()) {
        const l={...styleCDefault(sex),hair}, portrait=headCrop(l,view);
        sheet.c.drawImage(portrait.image,...portrait.rect,x+2+j*103,y+5,103,105);
      }
      label(sheet.c,title(hair),x+105,y+127,13,ink,true,'center');
      rule(sheet.c,x+10,y+139,x+200);
    });
    imageFile('hair-'+key,sheet.canvas);
  }
}
async function featuresSheet() {
  const {canvas,c}=board(1200,590,'Face detail','Left to right: source, default sprite, a custom face, and a second custom look.');
  const ref=await options.imageLoader(new URL('../assets/hero/style-c-accurate/reference.jpeg',import.meta.url));
  const regions={male:[568,326,131,104],female:[879,327,128,117]};
  for(const [i,[sex,name]] of PRESENTATIONS.entries()) {
    const face=regions[sex],[left,top]=referenceBox[sex], live=referenceFrame(sex), startY=94+i*246;
    for(let j=0;j<4;j++) {
      const x=150+j*300;
      if(j<2) {
        const r=j===0?face:[face[0]-left,face[1]-top,face[2],face[3]], factor=Math.min(245/face[2],172/face[3]);
        c.drawImage(j?live:ref,...r,x-r[2]*factor/2,startY+(177-r[3]*factor)/2,r[2]*factor,r[3]*factor);
      } else {
        const custom=lookFor(sex,'custom'), alternate=j===2?custom:sanitizeLook({...custom,age:'older',hair:'tapered-natural',face:'angular',jaw:.9,
          facialHair:sex==='male'?'beard':'none',brows:'straight',nose:'broad',eyeShape:'round',eyes:'#6052a3',mouth:'full',skin:'#895d44'});
        const sample=headCrop(alternate);
        c.drawImage(sample.image,...sample.rect,x-108,startY-9,216,196);
      }
      label(c,name+' · '+['Reference','Default','Custom','Older'][j],x,startY+204,15,ink,true,'center');
    }
  }
  imageFile('face-detail',canvas);
}
function buildsSheet() {
  const {canvas,c}=board(1160,585,'Build and age','Different heights, builds, hairstyles and cape choices are resolved through the same saved appearance format.');
  const hair=['short-locs','bantu-knots','braided-ponytail','textured-crop'];
  for(const [row,[sex,name]] of PRESENTATIONS.entries()) for(const [col,build] of LOOK_OPTIONS.build.entries()) {
    const age=['teen','young','older','young'][(col+row)%4], h=hair[(col+row)%hair.length];
    const look=sanitizeLook({...styleCDefault(sex),build,age,hair:h,cape:col!==2,height:[.9,1,1.08,1][col]});
    const x=(col+.5)*290, floor=270+row*240;
    draw(c,x,floor,look,{at:0,view:'front',scale:1.52});
    rule(c,x-87,floor+2,x+87);
    label(c,name+' · '+title(build),x,floor+24,15,ink,true,'center');
    label(c,title(age)+' · '+title(h)+(col===2?' · No cape':''),x,floor+43,12,secondary,false,'center');
  }
  imageFile('builds',canvas);
}
function turnaroundSheet() {
  const {canvas,c}=board(1200,520,'Turnarounds','Each column uses the corresponding creator or patrol view. All figures share a ground line.');
  for (const [row,[sex,name]] of PRESENTATIONS.entries()) {
    const floor=256+row*205;
    for(const [col,[view,caption]] of ART_VIEWS.entries()) {
      const x=120+col*240;
      draw(c,x,floor,styleCDefault(sex),{state:'idle',view,at:0,scale:1.34});
      rule(c,x-88,floor+2,x+88);
      label(c,name+' · '+caption,x,floor+27,15,ink,row===0,'center');
    }
  }
  imageFile('turnarounds',canvas);
}
function poseSheets() {
  for(const [sex,name] of PRESENTATIONS) {
    const field=board(1180,84+Math.ceil(PREVIEW_POSES.length/5)*203,name+' · motion states','A single sample from each named action. The film shows the surrounding animation.');
    PREVIEW_POSES.forEach((state,i)=>{
      const x=(i%5+.5)*236, floor=237+Math.floor(i/5)*203;
      draw(field.c,x,floor,styleCDefault(sex),{state,scale:1.22});
      rule(field.c,x-86,floor+3,x+86);
      label(field.c,String(i+1).padStart(2,'0')+'   '+title(state),x,floor+28,15,ink,true,'center');
    });
    imageFile('motion-'+sex,field.canvas);
  }
}
function armorSheets() {
  const sets=board(1200,85+Math.ceil(regionalKits.length/5)*198,'Regional armor','Every catalog set is shown at its required level and available rarity.');
  regionalKits.forEach((row,i)=>{
    const x=(i%5+.5)*240,floor=228+Math.floor(i/5)*198;
    const sex=PRESENTATIONS[i%2][0], outfit=equipmentOutfit(inventoryFor(row.parts));
    draw(sets.c,x,floor,lookFor(sex,'custom'),{outfit,scale:1.16,state:i%3?'idle':'walk'});
    label(sets.c,row.name,x,floor+23,15,ink,true,'center');
    label(sets.c,'Level '+row.level+' · '+title(row.rarity),x,floor+42,12,secondary,false,'center');
  });
  imageFile('regional-armor',sets.canvas);
  const items=['starter','partial','mixed',...LEGENDARY_IDS.map(id=>'merge-'+id)];
  const merge=board(1200,85+Math.ceil(items.length/4)*215,'Villain Merge','Hair and face belong to the hero. Any worn Merge piece carries the green aura.');
  items.forEach((key,i)=>{
    const x=(i%4+.5)*300,floor=242+Math.floor(i/4)*215,sex=PRESENTATIONS[i%2][0];
    draw(merge.c,x,floor,lookFor(sex,'custom'),{outfit:outfitFor(key),scale:1.31,state:i%3===0?'walk':'idle'});
    label(merge.c,KIT_LABELS[key],x,floor+23,15,ink,true,'center');
    label(merge.c,key.startsWith('merge-')?'Complete matching set':key==='mixed'?'Three different sets':key==='partial'?'Lightning Spree helmet':'Custom colors',x,floor+42,12,secondary,false,'center');
  });
  imageFile('merge-armor',merge.canvas);
}
async function cameraScenes() {
  const sources=new Map();
  for(const [id,entry] of Object.entries(MONSTER_ANIMATIONS)) if(entry.region===1) {
    sources.set(id,await options.imageLoader(new URL('../assets/monsters/'+entry.file,import.meta.url)));
  }
  for(const [sex,width,height,file] of [['male',1280,720,'coast-desktop'],['female',390,640,'coast-portrait']]) {
    const canvas=createCanvas(width,height);
    canvas.getBoundingClientRect=()=>({width,height});
    const g=new Game({look:styleCDefault(sex),random:()=>.45,now:()=>19200}), r=new Renderer(canvas);
    try {
      const bottle=g.enemies.find(e=>e.type==='bottle'&&e.y===600);
      g.hero.x=g.hero.prevX=bottle.x-112;g.hero.y=g.hero.prevY=600;
      g.hero.invulnerable=0;g.hero.respawnAge=100;g.hero.grounded=true;g.started=true;
      for(const [type,image] of sources) r.monsterAtlas.sources.set(type,{image,promise:Promise.resolve(true)});
      if(!r.monsterAtlas.hasAnimation('bottle')) throw Error('Camera missing Bottle Critter animation.');
      for(let i=0;i<12;i++) g.step(STEP,{move:.5});
      r.draw(g,1,STEP);
      imageFile(file,canvas);
    } finally { r.destroy(); }
  }
}
async function film() {
  const cols=2, width=960,height=566,canvas=createCanvas(width,height),c=canvas.getContext('2d');
  const roster=[
    ['male','starter','Guardian · starter'],['female','starter','Sentinel · starter'],
    ['male','custom','Guardian · custom starter'],['female','rare','Sentinel · rare armor']
  ].map(([sex,kit,label])=>({look:lookFor(sex,kit==='rare'?'custom':kit),outfit:outfitFor(kit),label,owner:{}}));
  const frameRate=20, perState=1.10, rotations=2.5, frames=Math.ceil((rotations+PREVIEW_POSES.length*perState)*frameRate);
  const ff=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','rawvideo','-pixel_format','rgba',
    '-video_size',width+'x'+height,'-framerate',String(frameRate),'-i','pipe:0','-an','-c:v','libx264',
    '-threads','2','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',join(staging,'hero-motion.mp4')],{stdio:['pipe','ignore','inherit']});
  const done=once(ff,'exit');
  for(let i=0;i<frames;i++) {
    const now=i/frameRate, turn=now<rotations;
    const view=turn?['front','side','back','left','game'][Math.min(4,Math.floor(now/(rotations/5)))]:'game';
    const state=turn?'idle':PREVIEW_POSES[Math.min(PREVIEW_POSES.length-1,Math.floor((now-rotations)/perState))];
    const at=turn?0:(now-rotations)%perState;
    c.fillStyle=paper; c.fillRect(0,0,width,height);
    label(c,turn?'Turnaround':title(state),28,42,28,ink,true);
    label(c,turn?ART_VIEWS.find(([id])=>id===view)[1]:'Gameplay view',width-28,42,15,secondary,false,'right');
    rule(c,24,57,width-24);
    for(const [j,actor] of roster.entries()) {
      const x=(j%cols+.5)*width/cols,y=255+Math.floor(j/cols)*238;
      draw(c,x,y,actor.look,{state,at,view,scale:1.5,outfit:actor.outfit,owner:actor.owner});
      rule(c,x-132,y+2,x+132);
      label(c,actor.label,x,y+25,14,ink,true,'center');
    }
    if(i===0) imageFile('film-poster',canvas);
    if(!ff.stdin.write(Buffer.from(c.getImageData(0,0,width,height).data.buffer))) await once(ff.stdin,'drain');
  }
  ff.stdin.end();
  const [code]=await done;
  if(code!==0) throw Error('FFmpeg failed with status '+code);
  publish('hero-motion.mp4');
}
async function galleries() {
  await standingSheet(); await featuresSheet(); turnaroundSheet(); poseSheets(); hairSheets(); buildsSheet(); armorSheets(); await cameraScenes(); await film();
}
try {
  const slice=process.argv.find(arg=>arg.startsWith('--pair-range='));
  if (slice) {
    const [first,end]=slice.slice('--pair-range='.length).split('-').map(Number);
    const coverage=checkEquipmentPairs(first,end);
    console.log(JSON.stringify({coverage,rasters,assertions,peakKiB:process.resourceUsage().maxRSS,findings:Object.fromEntries(findings)}));
  } else {
    if (!process.argv.includes('--gallery')) await audit();
    if (!process.argv.includes('--audit')) await galleries();
  }
} finally { rmSync(staging,{recursive:true,force:true}); }
