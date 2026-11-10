import {garmentLining} from './fabric-tone.mjs';
// Phase B — visual-only outfit/armor separation shared by all 36 collections.
// Never remove items, alter equipment stats, or write any save data here.
const visualCover={
 torso:['torso'],upperArmNear:['arms'],upperArmFar:['arms'],
 forearmNear:['arms'],forearmFar:['arms'],handNear:['gloves'],handFar:['gloves'],
 thighNear:['legs'],thighFar:['legs'],shinNear:['legs'],shinFar:['legs'],
 footNear:['feet','boots'],footFar:['feet','boots'],hips:['belt'],
 headwear:['helmet'],cape:['cape']
};
export function clothingCoverage(layers=[]){
 const covered=new Set();
 for(const piece of layers||[]){
  const {manifest,image}=piece||{};
  if(!image||!Array.isArray(manifest?.layers)||!manifest.layers.length)continue;
  for(const region of manifest.covers||[])covered.add(region);
  for(const layer of manifest.layers){
   for(const region of visualCover[layer.part]||[])covered.add(region);
   // A face covering or headwear should replace conflicting armored face gear.
   if(layer.attach==='head'&&(layer.part==='headwear'||layer.part==='accessory'&&layer.pass==='accessory'))
    covered.add('mask');
  }
 }
 return covered;
}
const clothLining=Object.freeze({suit:'#292c32',trim:'#41454e',emblemColor:'#292c32'});
const customLinings=Object.freeze({
 'ninja-warrior':{suit:'#271532',trim:'#633080',emblemColor:'#271532'}
});
export function clothingAppearance(outfit,look,layers=[]){
 const coverage=clothingCoverage(layers);
 const pieces=outfit?.pieces||{};
 if(!coverage.size)return {coverage,outfit,look,regionBase:{}};
 const concealed={
  suit:coverage.has('torso'),chest:coverage.has('torso'),
  belt:coverage.has('belt')||coverage.has('torso'),
  emblem:coverage.has('emblem')||coverage.has('torso'),
  gloves:coverage.has('gloves')||coverage.has('arms'),
  boots:coverage.has('boots')||coverage.has('feet')||coverage.has('legs'),
  helmet:coverage.has('helmet'),mask:coverage.has('mask'),
  cape:coverage.has('cape')
 };
 const visible=Object.fromEntries(Object.entries(pieces).filter(([part])=>!concealed[part]));
 const regionBase={};
 // A neutral, opaque fabric foundation hides stray starter-armor colors
 // at garment seams without changing the actual equipped gear. The original
 // full-color clothing atlas paints over this backing in its normal passes.
 for(const piece of layers||[]){
  if(!piece?.image||!piece.manifest?.layers?.length)continue;
  const scheme=customLinings[String(piece.id||'').split('.')[0]]||clothLining;
  const regions=new Set([...(piece.manifest.covers||[])]);
  for(const layer of piece.manifest.layers)for(const r of visualCover[layer.part]||[])regions.add(r);
  if(regions.has('torso'))regionBase.torso=garmentLining(piece,'torso',scheme);
  if(regions.has('arms'))regionBase.arms=garmentLining(piece,'arms',scheme);
  if(regions.has('legs'))regionBase.legs=garmentLining(piece,'legs',scheme);
 }
 return {
  coverage,
  outfit:{...outfit,pieces:visible},
  look:coverage.has('cape')?{...look,cape:false}:look,
  regionBase
 };
}
