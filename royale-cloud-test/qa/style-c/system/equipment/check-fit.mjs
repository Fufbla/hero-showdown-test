// Run with node --expose-gc royale/qa/style-c/system/equipment/check-fit.mjs.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {LOOK_OPTIONS} from '../../../../appearance.mjs';
import {EQUIPMENT, equipmentOutfit} from '../../../../equipment.mjs';
import {previewHero} from '../../../../hero-rig.mjs';
import {LEGENDARY_IDS} from '../../../../legendary-data.mjs';
import {matchingMerge} from '../../../../legendary-state.mjs';
import {styleCDefault} from '../../../../style-c-defaults.mjs';
import {drawStyleCEquipment, drawStyleCEquipmentAura, prepareStyleCEquipment} from '../../../../style-c-equipment.mjs';
import {prepareStyleCHair} from '../../../../style-c-hair.mjs';
import {sourcePose} from '../../../../style-c-source.mjs';
import {drawTurnaroundHero, prepareTurnarounds} from '../../../../style-c-turnaround.mjs';
import {WEARABLE_REGIONS} from '../../../../assets/hero/style-c-accurate/equipment/regions.mjs';
import {inventoryFor} from '../../../../tests/style-c-final-fixtures.mjs';

const {createCanvas, loadImage}=createRequire(import.meta.url)('@napi-rs/canvas');
const opts={canvasFactory:createCanvas,imageLoader:url=>loadImage(fileURLToPath(url))};
const readiness=await Promise.all([prepareStyleCEquipment,prepareTurnarounds,prepareStyleCHair].map(loader=>loader(opts)));
assert.ok(readiness.every(Boolean),'Equipment, turnarounds and hairstyles load');

const atlas=await opts.imageLoader(new URL('../../../../assets/hero/style-c-accurate/equipment/worn.png',import.meta.url));
const material=createCanvas(atlas.width,atlas.height).getContext('2d');
material.drawImage(atlas,0,0);
for (const [name,[x,y,w,h]] of Object.entries(WEARABLE_REGIONS)) {
  const data=material.getImageData(x,y,w,h).data;
  let ink=0, clear=0;
  for (let i=3;i<data.length;i+=4) {
    if (data[i]>100) ink++;
    if (data[i]<20) clear++;
  }
  assert.ok(ink>w*h*.13 && clear>w*h*.04,'Empty, corrupt or untrimmed part '+name);
}

const frameSize=300, origin=[140,250], camera=.60;
const directionCanvas=createCanvas(4,4).getContext('2d');
const bodyWidths={slender:.87,balanced:1,strong:1.12,full:1.22};
const views=['front','side','back'], states=['idle','run','punch','kick','flight'];

function attachmentPose(look,state,view) {
  const t=state==='punch'?.09:state==='kick'?.15:.22;
  const hero=previewHero(state,t);
  if (view==='front') {
    const p=sourcePose(look,hero,t);
    const female=look.presentation==='female';
    p.faceCenter=[p.head[0]+(female?2:14),p.head[1]+(female?6:3)];
    p.faceWidth=(female?94:90)*look.jaw;
    return p;
  }
  // The turnaround returns hero-local anchors for gameplay effects. Convert
  // those same rendered points to atlas pixels for independent overlay inspection.
  const p=drawTurnaroundHero(directionCanvas,0,0,look,hero,t,1,{view,poseName:state});
  assert.ok(p,'Turnaround unavailable');
  const sx=.35*bodyWidths[look.build], sy=.35*look.height;
  const toSource=point=>[point[0]/sx,point[1]/sy];
  return {...p,m:{...p.m,origin:[0,0]},head:toSource(p.head),hip:toSource(p.hip),shoulder:toSource(p.shoulder),
    arms:p.arms.map(chain=>chain.map(toSource)),legs:p.legs.map(chain=>chain.map(toSource)),faceCenter:undefined};
}
const poses=[];
for (const sex of LOOK_OPTIONS.presentation) for (const build of LOOK_OPTIONS.build) {
  const look={...styleCDefault(sex),build};
  for (const state of states) for (const view of views) poses.push({look,view,state,pose:attachmentPose(look,state,view)});
}

let combinations=0, rendered=0, smallest=Infinity, pupils=0;
const inputsBefore=JSON.stringify([poses,EQUIPMENT]);
for (const [index,item] of Object.values(EQUIPMENT).entries()) {
  if (index%10===0) { console.log('Wearables checked:',index);global.gc?.(); }
  // Give the native renderer a finite display-list lifetime even on long runs.
  const sampleCanvas=createCanvas(frameSize,frameSize), c=sampleCanvas.getContext('2d');
  for (const {look,pose,view,state} of poses) {
  const sx=camera*bodyWidths[look.build], sy=camera;
  const tx=origin[0]-pose.m.origin[0]*sx, ty=origin[1]-pose.m.origin[1]*sy;
  c.resetTransform(); c.clearRect(0,0,frameSize,frameSize);
  c.setTransform(sx,0,0,sy,tx,ty);
  const limbs=item.part==='boots'||item.part==='gloves'?[0,1]:[0];
  const label=[item.id,look.presentation,look.build,state,view].join('/');
  for (const side of limbs) {
    assert.ok(drawStyleCEquipment(c,item.part,item,pose,look,{view,side}),label);
    rendered++;
  }
  const data=sampleCanvas.data();
  let ink=0;
  for (let i=3;i<data.length;i+=4) {
    if (data[i]<16) continue;
    ink++;
    const pixel=(i-3)/4, x=pixel%frameSize, y=Math.floor(pixel/frameSize);
    if (!x || !y || x===frameSize-1 || y===frameSize-1) throw Error('Clipped wearable: '+label);
  }
  // Rear capes are the rendered cloth itself. A front chest badge cannot be seen from the rear.
  const hiddenOnBack=view==='back'&&(item.part==='cape'||item.part==='emblem');
  assert.ok(ink||hiddenOnBack,'Invisible wearable: '+label);
  if (ink) smallest=Math.min(smallest,ink);
  if (view==='front'&&['helmet','mask'].includes(item.part)) {
    const eyeOffset=look.presentation==='male'?19:21;
    for (const dx of [-eyeOffset,eyeOffset]) {
      const x=Math.round(tx+(pose.faceCenter[0]+dx)*sx), y=Math.round(ty+pose.faceCenter[1]*sy);
      assert.ok(data[4*(frameSize*y+x)+3]<=205,'Pupil covered: '+label);
      pupils++;
    }
  }
  combinations++;
  }
}
assert.equal(JSON.stringify([poses,EQUIPMENT]),inputsBefore,'Rendered inputs or the catalog were mutated');

const c=createCanvas(240,240).getContext('2d');
let mergeCombinations=0, glowing=0, matched=0;
const setChoices=[null,...LEGENDARY_IDS], neutral=poses[0];
for (const head of setChoices) for (const chest of setChoices) for (const boots of setChoices) {
  const ids=[head&&'merge-'+head+'-helmet',chest&&'merge-'+chest+'-chest',boots&&'merge-'+boots+'-boots'].filter(Boolean);
  const inv=inventoryFor(ids), kit=equipmentOutfit(inv);
  c.setTransform(.43,0,0,.43,110-neutral.pose.m.origin[0]*.43,190-neutral.pose.m.origin[1]*.43);
  const aura=drawStyleCEquipmentAura(c,kit.pieces,neutral.pose,neutral.look);
  const complete=matchingMerge(inv,99);
  assert.equal(aura,!!ids.length);
  assert.equal(complete,head&&head===chest&&chest===boots?head:null);
  if (aura) glowing++;
  if (complete) matched++;
  mergeCombinations++;
}
const report={
  passed:true,scope:'All wearable catalog items on anchors from the forward and turnaround renderers, using a 300 by 300 transparent evaluation tile. Full worn looks are captured separately.',
  partsInAtlas:Object.keys(WEARABLE_REGIONS).length,catalogItems:Object.keys(EQUIPMENT).length,
  selectors:{presentations:LOOK_OPTIONS.presentation.length,bodyBuilds:LOOK_OPTIONS.build.length,states,views},
  combinations,renderedIndividualLimbAndGearSamples:rendered,protectedPupilSamples:pupils,opaquePupilOcclusions:0,
  paintedAlphaMinimum:smallest,maximumEdgePixels:0,mergeHeadChestBootCombinations:mergeCombinations,withGreenAura:glowing,withMatchingFourthAbility:matched
};
writeFileSync(new URL('./fit-checks.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
